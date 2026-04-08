package user

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/freedisch/havril/pkg/models"
	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) HandleOAuthCallback(ctx context.Context, provider, oauthID, email, displayName, avatarURL string) (*models.User, string, error) {
	user, err := s.repo.FindOrCreate(ctx, provider, oauthID, email, displayName, avatarURL)
	if err != nil {
		return nil, "", err
	}

	rawToken, tokenHash, tokenPrefix, err := generateToken()
	if err != nil {
		return nil, "", fmt.Errorf("generate token: %w", err)
	}

	if err := s.repo.SaveToken(ctx, user.ID, tokenHash, tokenPrefix); err != nil {
		return nil, "", fmt.Errorf("save token: %w", err)
	}

	user.TokenHash = tokenHash
	user.TokenPrefix = tokenPrefix
	return user, rawToken, nil
}

func (s *Service) GetByTokenHash(ctx context.Context, hash string) (*models.User, error) {
	return s.repo.GetByTokenHash(ctx, hash)
}

func (s *Service) TouchLastSeen(ctx context.Context, userID string) error {
	return s.repo.TouchLastSeen(ctx, userID)
}

func generateToken() (rawToken, tokenHash, tokenPrefix string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}
	rawToken = "havril_" + hex.EncodeToString(b)
	sum := sha256.Sum256([]byte(rawToken))
	tokenHash = hex.EncodeToString(sum[:])
	tokenPrefix = rawToken[:13]
	return
}

type contextKey string

const userIDKey contextKey = "userID"

// Middleware calls this to store the user ID
func WithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, id)
}

func UserIDFromContext(ctx context.Context) uuid.UUID {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)
	if !ok {
		panic("userID not found in context — auth middleware missing")
	}
	return id
}
