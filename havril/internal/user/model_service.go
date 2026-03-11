package user

import (
	"context"
	"fmt"

	"github.com/freedisch/havril/pkg/models"
)

type ModelService struct {
	repo *ModelRepository
}

func NewModelService(repo *ModelRepository) *ModelService {
	return &ModelService{repo: repo}
}

func (s *ModelService) Connect(ctx context.Context, userID, provider, integration string) (*models.ConnectedModel, error) {
	if !isValidProvider(provider) {
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
	if !isValidIntegration(integration) {
		return nil, fmt.Errorf("unsupported integration: %s", integration)
	}
	return s.repo.Create(ctx, userID, provider, integration)

}

func (s *ModelService) List(ctx context.Context, userID string) ([]models.ConnectedModel, error) {
	return s.repo.List(ctx, userID)
}

// func (s *ModelService) Disconnect(ctx context.Context, id, userID string) error {
// 	return s.repo.SetInative(ctx, id, userID)
// }

func (s *ModelService) TouchLastUsed(ctx context.Context, userId, provider string) error {
	return s.repo.TouchLastUsed(ctx, userId, provider)
}

func isValidProvider(p string) bool {
	switch p {
	case "anthropic", "openai", "google", "mistral", "other":
		return true
	}
	return false
}

func isValidIntegration(i string) bool {
	switch i {
	case "mcp", "custom_action", "browser_ext":
		return true
	}
	return false
}
