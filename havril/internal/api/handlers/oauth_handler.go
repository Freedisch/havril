package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/freedisch/havril/internal/user"
)

type OAuthHandler struct {
	baseURL  string
	userRepo *user.Repository
	codes    sync.Map // string -> *codeEntry
}

type codeEntry struct {
	rawToken      string
	codeChallenge string
	expiresAt     time.Time
}

func NewOAuthHandler(baseURL string, userRepo *user.Repository) *OAuthHandler {
	return &OAuthHandler{baseURL: baseURL, userRepo: userRepo}
}

// Metadata handles GET /.well-known/oauth-authorization-server
func (h *OAuthHandler) Metadata(w http.ResponseWriter, r *http.Request) {
	base := requestBaseURL(r)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{ //nolint:errcheck
		"issuer":                           base,
		"authorization_endpoint":           base + "/oauth/authorize",
		"token_endpoint":                   base + "/oauth/token",
		"registration_endpoint":            base + "/oauth/register",
		"response_types_supported":         []string{"code"},
		"grant_types_supported":            []string{"authorization_code"},
		"code_challenge_methods_supported": []string{"S256"},
	})
}

// ProtectedResource handles GET /.well-known/oauth-protected-resource{/*}.
// RFC 9728 — tells clients which authorization server protects this resource.
func (h *OAuthHandler) ProtectedResource(w http.ResponseWriter, r *http.Request) {
	base := requestBaseURL(r)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"resource":              base,
		"authorization_servers": []string{base},
	})
}

// requestBaseURL infers the public-facing base URL from the request so that
// OAuth metadata is correct behind proxies and tunnels (e.g. Cloudflare).
// Cloudflare sets X-Forwarded-Proto; the Host header carries the public hostname.
func requestBaseURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if p := r.Header.Get("X-Forwarded-Proto"); p != "" {
		scheme = p
	}
	host := r.Host
	if h := r.Header.Get("X-Forwarded-Host"); h != "" {
		host = h
	}
	return scheme + "://" + host
}

// Register handles POST /oauth/register (RFC 7591 dynamic client registration).
func (h *OAuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RedirectURIs []string `json:"redirect_uris"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{
		"client_id":                  "havril-mcp",
		"client_secret_expires_at":   0,
		"redirect_uris":              req.RedirectURIs,
		"grant_types":                []string{"authorization_code"},
		"response_types":             []string{"code"},
		"token_endpoint_auth_method": "none",
	})
}

// Authorize handles GET /oauth/authorize (show form) and POST /oauth/authorize (submit).
// If a valid havril_session cookie is present (set when the user logged in via the
// extension), the authorization is completed silently with no user interaction.
func (h *OAuthHandler) Authorize(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		h.authorizeSubmit(w, r)
		return
	}
	if cookie, err := r.Cookie("havril_session"); err == nil && cookie.Value != "" {
		h.autoAuthorize(w, r, cookie.Value)
		return
	}
	h.authorizeForm(w, r)
}

func (h *OAuthHandler) autoAuthorize(w http.ResponseWriter, r *http.Request, rawToken string) {
	q := r.URL.Query()
	redirectURI := q.Get("redirect_uri")
	if redirectURI == "" {
		h.authorizeForm(w, r)
		return
	}

	if !h.tokenValid(r, rawToken) {
		// Stale or invalid session — clear it and fall back to the form
		http.SetCookie(w, &http.Cookie{Name: "havril_session", Value: "", MaxAge: -1, Path: "/"})
		h.authorizeForm(w, r)
		return
	}

	if err := h.issueCode(w, r, rawToken, redirectURI, q.Get("state"), q.Get("code_challenge")); err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
	}
}

func (h *OAuthHandler) authorizeForm(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	redirectURI := q.Get("redirect_uri")
	if redirectURI == "" {
		http.Error(w, "missing redirect_uri", http.StatusBadRequest)
		return
	}

	esc := html.EscapeString
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<!DOCTYPE html>
<html>
<head>
  <title>Havril — Authorize MCP Access</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;max-width:460px;margin:80px auto;padding:0 20px;color:#111}
    h2{margin-bottom:4px}
    p{color:#555;margin-top:4px}
    input[type=text]{width:100%%;padding:10px;margin:14px 0 6px;font-family:monospace;font-size:14px;border:1px solid #ccc;border-radius:4px}
    button{padding:10px 28px;background:#111;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px}
    button:hover{background:#333}
    .hint{font-size:12px;color:#888;margin-bottom:16px}
  </style>
</head>
<body>
  <h2>Authorize Claude</h2>
  <p>Paste your Havril Bearer token to grant Claude access to your memories.</p>
  <form method="POST" action="/oauth/authorize">
    <input type="hidden" name="redirect_uri"           value="%s">
    <input type="hidden" name="state"                  value="%s">
    <input type="hidden" name="code_challenge"         value="%s">
    <input type="hidden" name="code_challenge_method"  value="%s">
    <input type="hidden" name="client_id"              value="%s">
    <input type="text" name="token" placeholder="havril_xxxxxxxxxxxxxxxxxxxx" autofocus>
    <p class="hint">Find your token in the Havril dashboard under API Keys.</p>
    <button type="submit">Authorize</button>
  </form>
</body>
</html>`,
		esc(redirectURI),
		esc(q.Get("state")),
		esc(q.Get("code_challenge")),
		esc(q.Get("code_challenge_method")),
		esc(q.Get("client_id")),
	)
}

func (h *OAuthHandler) authorizeSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	redirectURI := r.FormValue("redirect_uri")
	state := r.FormValue("state")
	codeChallenge := r.FormValue("code_challenge")
	rawToken := strings.TrimSpace(r.FormValue("token"))

	if redirectURI == "" || rawToken == "" {
		http.Error(w, "missing redirect_uri or token", http.StatusBadRequest)
		return
	}

	if !h.tokenValid(r, rawToken) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprintf(w, `<!DOCTYPE html><html><head><title>Havril</title></head><body>
<p style="color:red">Invalid token. Please check and try again.</p>
<a href="javascript:history.back()">Go back</a>
</body></html>`)
		return
	}

	if err := h.issueCode(w, r, rawToken, redirectURI, state, codeChallenge); err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
	}
}

// Token handles POST /oauth/token — exchanges an authorization code for a Bearer token.
func (h *OAuthHandler) Token(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		h.tokenError(w, "invalid_request", http.StatusBadRequest)
		return
	}

	if r.FormValue("grant_type") != "authorization_code" {
		h.tokenError(w, "unsupported_grant_type", http.StatusBadRequest)
		return
	}

	code := r.FormValue("code")
	entryI, ok := h.codes.LoadAndDelete(code)
	if !ok {
		h.tokenError(w, "invalid_grant", http.StatusBadRequest)
		return
	}

	entry := entryI.(*codeEntry)
	if time.Now().After(entry.expiresAt) {
		h.tokenError(w, "invalid_grant", http.StatusBadRequest)
		return
	}

	// Verify PKCE (S256) if a challenge was stored
	if entry.codeChallenge != "" {
		verifier := r.FormValue("code_verifier")
		if !verifyS256(verifier, entry.codeChallenge) {
			h.tokenError(w, "invalid_grant", http.StatusBadRequest)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(map[string]any{
		"access_token": entry.rawToken,
		"token_type":   "bearer",
		"expires_in":   315360000,
	})
}

func (h *OAuthHandler) tokenError(w http.ResponseWriter, code string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": code}) 
}

// tokenValid returns true if rawToken hashes to a known user in the database.
func (h *OAuthHandler) tokenValid(r *http.Request, rawToken string) bool {
	sum := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(sum[:])
	_, err := h.userRepo.GetByTokenHash(r.Context(), tokenHash)
	return err == nil
}

// issueCode generates a short-lived auth code, stores it, and redirects the
// client to redirectURI with the code (and optional state) appended.
func (h *OAuthHandler) issueCode(w http.ResponseWriter, r *http.Request, rawToken, redirectURI, state, codeChallenge string) error {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	code := base64.RawURLEncoding.EncodeToString(b)
	h.codes.Store(code, &codeEntry{
		rawToken:      rawToken,
		codeChallenge: codeChallenge,
		expiresAt:     time.Now().Add(10 * time.Minute),
	})
	target := redirectURI + "?code=" + url.QueryEscape(code)
	if state != "" {
		target += "&state=" + url.QueryEscape(state)
	}
	http.Redirect(w, r, target, http.StatusFound)
	return nil
}

// verifyS256 checks that sha256(verifier) base64url-encodes to challenge.
func verifyS256(verifier, challenge string) bool {
	if verifier == "" {
		return false
	}
	h := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(h[:]) == challenge
}
