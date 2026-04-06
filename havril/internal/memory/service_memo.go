package memory

import (
	"context"

	"github.com/freedisch/havril/pkg/models"
	"github.com/google/uuid"
)

type Service interface {
	GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Memory, error)
	List(ctx context.Context, userID uuid.UUID) ([]*models.Memory, error)
	//Delete(ctx context.Context, id, userID uuid.UUID) error
}

type service struct {
	repo *Repository
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

func NewService(repo *Repository) Service {
	return &service{repo: repo}
}
