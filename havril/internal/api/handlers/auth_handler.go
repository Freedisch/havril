package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	userSvc "github.com/freedisch/havril/internal/user"
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

	// Extension flow: redirect to a page the extension can detect.
	if c, _ := r.Cookie("havril_ext"); c != nil && c.Value == "1" {
		http.SetCookie(w, &http.Cookie{Name: "havril_ext", Value: "", MaxAge: -1, Path: "/"})
		// Persist a session cookie so /oauth/authorize can auto-approve
		// the next time Claude.ai opens that page in this browser.
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

// ExtDone is the landing page after a successful extension OAuth flow.
// The token is in the URL; the extension reads it via chrome.tabs.onUpdated
// and then closes the tab automatically.
func (h *AuthHandler) ExtDone(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Havril — Connected</title>
<style>
  body { margin: 0; display: flex; align-items: center; justify-content: center;
         min-height: 100vh; background: #09090b; color: #f4f4f5;
         font-family: 'SF Mono', monospace; text-align: center; }
  .box { padding: 40px; border: 1px solid #27272a; border-radius: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%%; background: #4ade80;
         display: inline-block; margin-bottom: 16px; box-shadow: 0 0 8px #4ade80; }
  h2 { font-size: 18px; margin: 0 0 8px; }
  p  { font-size: 13px; color: #71717a; margin: 0; }
</style>
</head>
<body>
<div class="box">
  <div class="dot"></div>
  <h2>Connected to Havril</h2>
  <p>This tab will close automatically.</p>
</div>
<script>
  // Signal the extension, then close.
  if (window.opener) window.opener.postMessage({ type: 'HAVRIL_AUTH_DONE', token: %q }, '*');
  setTimeout(() => window.close(), 1000);
</script>
</body>
</html>`, token)
}
