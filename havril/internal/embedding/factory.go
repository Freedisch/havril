package embedding

import "fmt"

const (
	ProviderOpenAI = "openai"
	ProviderLocal  = "local"
)

type Config struct {
	Provider string
	APIKey   string
	Model    string
}

func New(cfg Config) (Embedder, error) {
	switch cfg.Provider {
	case ProviderOpenAI, "":
		if cfg.APIKey == "" {
			return nil, fmt.Errorf("embedding: OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai")
		}
		return NewOpenAIEmbedder(cfg.APIKey, cfg.Model), nil
	case ProviderLocal:
		return NewLocalEmbedder(), nil

	default:
		return nil, fmt.Errorf("embedding: unknown provider %q — valid options: openai, local", cfg.Provider)

	}

}
