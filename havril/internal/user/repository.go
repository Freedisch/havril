package user

import (
	"context"
	"fmt"

	"github.com/freedisch/havril/pkg/models"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindOrCreate(ctx context.Context, provider, oauthID, email, displayName, avatarURL string) (*models.User, error) {
	user := &models.User{
		OAuthProvider: provider,
		OAuthID:       oauthID,
		Email:         email,
		DisplayName:   displayName,
		AvatarURL:     avatarURL,
	}

	result := r.db.WithContext(ctx).Where(models.User{OAuthProvider: provider, OAuthID: oauthID}).Assign(models.User{
		DisplayName: displayName,
		AvatarURL:   avatarURL,
		Email:       email,
	}).FirstOrCreate(user)

	if result.Error != nil {
		return nil, fmt.Errorf("find or create user: %w", result.Error)
	}
	return user, nil
}

func (r *Repository) SaveToken(ctx context.Context, userID, tokenHash, tokenPrefix string) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).Updates(map[string]any{
		"token_hash":   tokenHash,
		"token_prefix": tokenPrefix,
	})
	return result.Error
}

func (r *Repository) SaveMcpToken(ctx context.Context, userID, tokenMcpHash, tokenMcpPrefix string) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).Updates(map[string]any{
		"mcp_token_hash":   tokenMcpHash,
		"mcp_token_prefix": tokenMcpPrefix,
	})
	return result.Error
}

func (r *Repository) GetByTokenHash(ctx context.Context, tokenHash string) (*models.User, error) {
	var user models.User
	result := r.db.WithContext(ctx).Where("token_hash = ?", tokenHash).First(&user)
	if result.Error != nil {
		return nil, fmt.Errorf("get user by token: %w", result.Error)
	}

	return &user, nil
}

func (r *Repository) GetByMcpTokenHash(ctx context.Context, tokenMcpHash string) (*models.User, error) {
	var user models.User
	result := r.db.WithContext(ctx).Where("mcp_token_hash = ?", tokenMcpHash).First(&user)
	if result.Error != nil {
		return nil, fmt.Errorf("get user by token: %w", result.Error)
	}

	return &user, nil
}

func (r *Repository) TouchLastSeen(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).Update("last_seen_at", gorm.Expr("now()")).Error
}
