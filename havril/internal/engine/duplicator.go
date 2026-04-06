package engine

import (
	"context"
	"fmt"

	"github.com/freedisch/havril/internal/embedding"
	"github.com/freedisch/havril/internal/store/vector"
	"github.com/google/uuid"
)

const defaultDedupThreshold = 0.92

type Deduplicator struct {
	embedder embedding.Embedder
	vectors vector.Store
	thresold float32
}

func newDeduplicator(embedder embedding.Embedder, vector vector.Store, thresold float64) *Deduplicator{
	if thresold == 0{
		thresold = defaultDedupThreshold
	}
	return &Deduplicator{
		embedder: embedder,
		vectors: vector,
		thresold: float32(thresold),
	}
}

func (d *Deduplicator) isDuplicate(ctx context.Context, userID uuid.UUID, content string)(bool, []float32, error){
	vec, err := d.embedder.Embed(ctx, content)
	if err != nil{
		return false, nil, fmt.Errorf("deduplicator: embed candidate %w", err)
	}

	hits, err := d.vectors.Search(ctx, userID, vec, 1)
	if err != nil{
		return false, nil, fmt.Errorf("deduplicator: vector search %w", err)
	}

	// hits, err := d.vectors.Search(ctx, userID, vec, 1)
	// if err != nil{
	// 	return false, vec, fmt.Errorf("deduplicator: vector search: %w", err)
	// }

	for _, hit := range hits {
		if hit.Score >= d.thresold {
			return true, vec, nil
		}
	}

	return false, vec, nil

}