package memory

import (
	"context"
	"math"
	"sort"
	"time"

	"github.com/freedisch/havril/pkg/models"
	"github.com/google/uuid"
)

// Processor is the interface the memory service uses to run the engine pipeline.
// Defined here to avoid an import cycle with the engine package.
type Processor interface {
	ProcessConversation(ctx context.Context, userID uuid.UUID, conversation []models.Message, sourceModel string) (models.EngineResult, error)
}

// RankedMemory wraps a Memory with its computed fetch ranking score.
// The score is not persisted — it is computed per-request based on
// semantic similarity, importance, and recency.
type RankedMemory struct {
	*models.Memory
	Score float64 `json:"score,omitempty"`
}

const (
	defaultFetchLimit = 5
	maxFetchLimit     = 20

	// Fetch ranking weights — must sum to 1.0
	weightSimilarity = 0.5
	weightImportance = 0.3
	weightRecency    = 0.2
)

type SubmitResult struct {
	MemoriesCreated int `json:"memories_created"`
	MemoriesUpdated int `json:"memories_updated"`
}

type Service interface {
	GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Memory, error)
	List(ctx context.Context, userID uuid.UUID) ([]*models.Memory, error)
	//Delete(ctx context.Context, id, userID uuid.UUID) error

	Submit(ctx context.Context, userID uuid.UUID, conversation []models.Message, sourceModel string) (SubmitResult, error)
	Fetch(ctx context.Context, userID uuid.UUID, query string, limit int) ([]*RankedMemory, error)
}

type service struct {
	repo      *Repository
	processor Processor
}

// // Delete implements [Service].
// func (s *service) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
// 	return s.repo.Delete(ctx, id, userID)
// }

// GetByID implements [Service].
func (s *service) GetByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*models.Memory, error) {
	return s.repo.GetByID(ctx, id, userID)
}

// List implements [Service].
func (s *service) List(ctx context.Context, userID uuid.UUID) ([]*models.Memory, error) {
	return s.repo.List(ctx, userID, true)
}

func (s *service) Submit(ctx context.Context, userID uuid.UUID, conversation []models.Message, sourceModel string) (SubmitResult, error) {
	result, err := s.processor.ProcessConversation(ctx, userID, conversation, sourceModel)
	if err != nil {
		return SubmitResult{}, err
	}
	return SubmitResult{
		MemoriesCreated: result.MemoriesCreated,
		MemoriesUpdated: result.MemoriesUpdated,
	}, nil
}

// Ranking formula (from design doc):
//
//	score = (similarity × 0.5) + (importance × 0.3) + (recency × 0.2)
//	recency = 1.0 / (1.0 + days_since_created)
func (s *service) Fetch(ctx context.Context, userID uuid.UUID, query string, limit int) ([]*RankedMemory, error) {
	if limit < 0 {
		limit = defaultFetchLimit
	}
	if limit > maxFetchLimit {
		limit = maxFetchLimit
	}
	candidates, err := s.repo.SearchSimilar(ctx, userID, query, limit)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return nil, nil
	}
	now := time.Now().UTC()
	ranked := make([]*RankedMemory, len(candidates))

	for i, m := range candidates {
		daysSince := now.Sub(m.CreatedAt).Hours() / 24
		recency := 1.0 / (1.0 + daysSince)

		similarityProxy := 1.0 - (float64(i) / float64(len(candidates)))
		score := (similarityProxy * weightSimilarity) + (m.Importance * weightImportance) + (recency * weightRecency)
		ranked[i] = &RankedMemory{
			Memory: m,
			Score:  math.Round(score*1000) / 1000,
		}

	}
	sort.Slice(ranked, func(i, j int) bool {
		return ranked[i].Score > ranked[j].Score
	})
	if len(ranked) > limit {
		ranked = ranked[:limit]
	}
	go func() {
		for _, m := range ranked {
			_ = s.repo.IncrementAccess(context.Background(), m.ID)
		}
	}()

	return ranked, nil

}

func NewService(repo *Repository, proc Processor) Service {
	return &service{repo: repo, processor: proc}
}
