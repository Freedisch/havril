package handlers

import (
	"encoding/json"
	"net/http"

	userSvc "github.com/freedisch/havril/internal/user"
	"github.com/markbates/goth/gothic"
)

type AuthHandler struct {
	users *userSvc.Service
}

func NewAuthHandler(users *userSvc.Service) *AuthHandler {
	return &AuthHandler{users: users}
}

func (h *AuthHandler) Begin(w http.ResponseWriter, r *http.Request) {
	gothic.BeginAuthHandler(w, r)
}

func (h *AuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	gothUser, err := gothic.CompleteUserAuth(w, r)

	if err != nil {
		http.Error(w, `{"error": "oauth failed", "code":"oauth_error"}`, http.StatusUnauthorized)
		return
	}
	user, rawToken, err := h.users.HandleOAuthCallback(
		r.Context(),
		gothUser.Provider,
		gothUser.UserID,
		gothUser.Email,
		gothUser.Name,
		gothUser.AvatarURL,
	)
	if err != nil {
		http.Error(w, `{"error": "auth failed", "code":"internal_error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"user_id":      user.ID,
		"email":        user.Email,
		"display_name": user.DisplayName,
		"avatar_url":   user.AvatarURL,
		"token":        rawToken,
		"token_prefix": user.TokenPrefix,
	})
}
