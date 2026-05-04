package engine

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/freedisch/havril/internal/embedding"
	"github.com/freedisch/havril/internal/store"
	"github.com/freedisch/havril/pkg/models"
	"github.com/google/uuid"
)

// memoryWriter is the subset of memory.Repository that the engine needs.
// Defined here to avoid an import cycle with the memory package.
type memoryWriter interface {
	Create(ctx context.Context, m *models.Memory) error
	SetInative(ctx context.Context, id, userID uuid.UUID) error
}

type Config struct {
	OpenAIAPIKey    string
	DedupThreshold  float64
	ContradictLower float64
	ContradictUpper float64
}

type Engine struct {
	extractor    *Extractor
	deduplicator *Deduplicator
	classifier   *Classifier
	scorer       *Scorer
	repo         memoryWriter
	contradictLo float32
	contradictHi float32
}

func New(cfg Config, embedder embedding.Embedder, vectors store.Store, repo memoryWriter) *Engine {
	if cfg.ContradictLower == 0 {
		cfg.ContradictLower = 0.75
	}
	if cfg.ContradictUpper == 0 {
		cfg.ContradictUpper = 0.85
	}

	return &Engine{
		extractor:    newExtractor(cfg.OpenAIAPIKey),
		deduplicator: newDeduplicator(embedder, vectors, cfg.DedupThreshold),
		classifier:   newClassifier(),
		scorer:       newScorer(),
		repo:         repo,
		contradictLo: float32(cfg.ContradictLower),
		contradictHi: float32(cfg.ContradictUpper),
	}

}

// resolveContradictions searches for existing memories that are semantically
// related to the new content (within the contradiction band: 0.75–0.85 similarity).
// These are facts that the new memory likely supersedes — we mark them inactive.
// Returns the number of memories marked inactive.
func (e *Engine) resolveContradictions(ctx context.Context, userID uuid.UUID, content string, vec []float32) (int, error) {
	if vec == nil {
		return 0, nil
	}

	// Search for the top 5 candidates in the contradiction range
	hits, err := e.deduplicator.vectors.Search(ctx, userID, vec, 5)
	if err != nil {
		return 0, nil
	}
	updated := 0
	for _, hit := range hits {
		if hit.Score >= e.contradictLo && hit.Score <= e.contradictHi {
			if err := e.repo.SetInative(ctx, hit.ID, userID); err != nil {
				slog.Warn("engine: failed to mark memory inactive",
					"id", hit.ID,
					"error", err,
				)
				continue

			}
			updated++
			slog.Debug("engine: contradicted memory marked inactive", "id", hit.ID, "score", hit.Score)
		}
	}
	return updated, nil

}

// ProcessConversation runs the full memory engine pipeline for a submitted
// conversation. It is safe to call concurrently for different users.
//
// Pipeline:
//  1. Extract candidate memories from the conversation via LLM
//  2. For each candidate, check for duplicates via Qdrant similarity search
//  3. For each new candidate, check for contradictions against existing memories
//  4. Mark contradicted memories inactive
//  5. Classify the memory type
//  6. Score final importance
//  7. Save to Postgres + Qdrant via repository
func (e *Engine) ProcessConversation(ctx context.Context, userID uuid.UUID, conversation []models.Message, sourceModel string) (models.EngineResult, error) {

	var result models.EngineResult
	// Step 1 — Extract candidate memories from the conversation
	candidates, err := e.extractor.extract(ctx, conversation)
	if err != nil {
		return result, err
	}
	fmt.Printf("result memories %v", candidates)

	if len(candidates) == 0 {
		slog.Info("engine: no candidates extracted from conversation", "user_id", userID)
		return result, nil
	}

	slog.Info("engine: extracted candidates", "count", len(candidates), "user_id", userID)

	for _, candidate := range candidates {
		if candidate.Content == "" {
			continue
		}

		//Step 2 - verify if is duplicate
		isDup, vec, err := e.deduplicator.isDuplicate(ctx, userID, candidate.Content)
		if err != nil {
			slog.Warn("engine: dedup check failed, skipping candidate",
				"error", err,
				"content", candidate.Content,
			)
			continue
		}
		if isDup {
			slog.Debug("engine: duplicate skipped", "content", candidate.Content)
			continue
		}

		// Step 3 — Contradiction check: look for existing memories that are
		// semantically related but not identical (similarity 0.75–0.85).
		// These may be outdated facts that this candidate supersedes.
		updated, err := e.resolveContradictions(ctx, userID, candidate.Content, vec)
		if err != nil {
			slog.Warn("engine: contradiction check failed",
				"error", err,
				"content", candidate.Content,
			)
		}
		result.MemoriesUpdated += updated

		memType := e.classifier.classify(candidate.Type)

		importance := e.scorer.score(candidate.ImportanceHint, candidate.Content, memType)

		m := &models.Memory{
			UserID:      userID,
			Content:     candidate.Content,
			Type:        memType,
			Importance:  importance,
			SourceModel: sourceModel,
			Tags:        candidate.Tags,
			IsActive:    true,
		}
		if err := e.repo.Create(ctx, m); err != nil {
			slog.Error("engine: failed to save memory",
				"error", err,
				"content", candidate.Content,
			)
			continue
		}
		result.MemoriesCreated++
		slog.Debug("engine: memory saved", "id", m.ID, "type", memType, "importance", importance)
	}
	return result, nil

}
