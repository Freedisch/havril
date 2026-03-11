package user

import (
	"context"
	"fmt"

	"github.com/freedisch/havril/pkg/models"
	"gorm.io/gorm"
)

type ModelRepository struct {
	db *gorm.DB
}

func NewModelRepository(db *gorm.DB) *ModelRepository {
	return &ModelRepository{db: db}
}

func (r *ModelRepository) Create(ctx context.Context, userID, provider, integration string) (*models.ConnectedModel, error) {
	cm := &models.ConnectedModel{
		UserID:      userID,
		Provider:    provider,
		Integration: integration,
	}

	result := r.db.WithContext(ctx).Where(models.ConnectedModel{UserID: userID, Provider: provider}).Assign(models.ConnectedModel{
		Integration: integration, IsActive: true,
	}).FirstOrCreate(cm)

	if result.Error != nil {
		return nil, fmt.Errorf("find or create user: %w", result.Error)
	}

	return cm, nil
}

func (r *ModelRepository) List(ctx context.Context, userID string) ([]models.ConnectedModel, error) {
	var models []models.ConnectedModel
	result := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("connected_at desc").Find(&models)
	return models, result.Error

}

func (r *ModelRepository) GetByID(ctx context.Context, id, userID string) (*models.ConnectedModel, error) {
	var cm models.ConnectedModel
	result := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&cm)

	if result.Error != nil {
		return nil, fmt.Errorf("get connected model: %w", result.Error)
	}
	return &cm, nil
}

func (r *ModelRepository) TouchLastUsed(ctx context.Context, userID, provider string) error {
	return r.db.WithContext(ctx).Model(&models.ConnectedModel{}).Where("user_id = ? AND provider = ? AND is_active = true", userID, provider).Update("last_used_at", gorm.Expr("now()")).Error
}
