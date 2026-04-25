package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"

	userSvc "github.com/freedisch/havril/internal/user"
	"github.com/freedisch/havril/pkg/utils"
	"github.com/joho/godotenv"
	"github.com/markbates/goth/gothic"
)

type AuthHandler struct {
	users *userSvc.Service
}

func NewAuthHandler(users *userSvc.Service) *AuthHandler {
	return &AuthHandler{users: users}
}

// Begin starts the OAuth flow.
// If the request has ?ext=1 (browser extension), a short-lived cookie is set
// so the callback knows to redirect rather than return JSON.
func (h *AuthHandler) Begin(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("ext") == "1" {
		http.SetCookie(w, &http.Cookie{
			Name:     "havril_ext",
			Value:    "1",
			Path:     "/",
			MaxAge:   300,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
	}
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

	if c, _ := r.Cookie("havril_ext"); c != nil && c.Value == "1" {
		http.SetCookie(w, &http.Cookie{Name: "havril_ext", Value: "", MaxAge: -1, Path: "/"})
		http.SetCookie(w, &http.Cookie{
			Name:     "havril_session",
			Value:    rawToken,
			Path:     "/",
			MaxAge:   365 * 24 * 60 * 60,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
		q := url.Values{}
		q.Set("token", rawToken)
		q.Set("name", user.DisplayName)
		q.Set("email", user.Email)
		q.Set("avatar", user.AvatarURL)
		http.Redirect(w, r, "/v1/auth/ext/done?"+q.Encode(), http.StatusFound)
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

func (h *AuthHandler) ExtDone(w http.ResponseWriter, r *http.Request) {
	_ = godotenv.Load()
	homePageURL := utils.GetEnv("HOMEPAGE_URL", "https://tryavril.vercel.app/")
	http.Redirect(w, r, homePageURL, http.StatusOK)
}
