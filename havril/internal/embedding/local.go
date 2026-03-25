package embedding

import (
	"context"
	"fmt"
)

type LocalEmbedder struct{}

func NewLocalEmbedder() *LocalEmbedder { return &LocalEmbedder{} }

func (e *LocalEmbedder) Embed(_ context.Context, _ string) ([]float32, error) {
	return nil, fmt.Errorf(
		"embedding: local provider not yet implemented - set EMBEDDING_PROVIDER=openai",
	)
}
