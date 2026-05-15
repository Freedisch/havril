package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	userSvc "github.com/freedisch/havril/internal/user"
	"github.com/google/uuid"
)

type contextKey string

const ContextKeyUser contextKey = "user"

type AuthMiddleware struct {
	users *userSvc.Service
}

func NewAuthMiddleware(users *userSvc.Service) *AuthMiddleware {
	return &AuthMiddleware{users: users}
}

func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if raw == "" {
			http.Error(w, `{"error": "no token provided", "code":"missing_token"}`, http.StatusUnauthorized)
			return
		}

		sum := sha256.Sum256([]byte(raw))
		hashStr := hex.EncodeToString(sum[:])

		user, err := m.users.GetByTokenHash(r.Context(), hashStr)
		if err != nil {
			http.Error(w, `{"error": "invalid token", "code": "invalid_token"}`, http.StatusUnauthorized)
			return
		}

		go m.users.TouchLastSeen(context.Background(), user.ID)

		userID, err := uuid.Parse(user.ID)
		if err != nil {
			http.Error(w, `{"error":"invalid user id","code":"invalid_token"}`, http.StatusUnauthorized)
			return
		}

		ctx := userSvc.WithUserID(r.Context(), userID)
		ctx = context.WithValue(ctx, ContextKeyUser, user)
		next.ServeHTTP(w, r.WithContext(ctx))

	})
}

func (m *AuthMiddleware) AuthenticateMcp(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if raw == "" {
			http.Error(w, `{"error": "no token provided", "code":"missing_token"}`, http.StatusUnauthorized)
			return
		}

		sum := sha256.Sum256([]byte(raw))
		hashStr := hex.EncodeToString(sum[:])

		user, err := m.users.GetByMcpTokenHash(r.Context(), hashStr)
		if err != nil {
			http.Error(w, `{"error": "invalid token", "code": "invalid_token"}`, http.StatusUnauthorized)
			return
		}

		go m.users.TouchLastSeen(context.Background(), user.ID)

		userID, err := uuid.Parse(user.ID)
		if err != nil {
			http.Error(w, `{"error":"invalid user id","code":"invalid_token"}`, http.StatusUnauthorized)
			return
		}

		ctx := userSvc.WithUserID(r.Context(), userID)
		ctx = context.WithValue(ctx, ContextKeyUser, user)
		next.ServeHTTP(w, r.WithContext(ctx))

	})
}
