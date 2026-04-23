package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
)

// OAuthHandler serves the three discovery/stub endpoints that MCP clients
// (e.g. Claude.ai) probe before connecting. We don't implement a real OAuth
// flow — returning access_denied from /oauth/authorize causes the client to
// fall back to prompting the user for a Bearer token directly.
type OAuthHandler struct {
	baseURL string
}

func NewOAuthHandler(baseURL string) *OAuthHandler {
	return &OAuthHandler{baseURL: baseURL}
}

// Metadata handles GET /.well-known/oauth-authorization-server
func (h *OAuthHandler) Metadata(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{ 
		"issuer":                           h.baseURL,
		"authorization_endpoint":           h.baseURL + "/oauth/authorize",
		"token_endpoint":                   h.baseURL + "/oauth/token",
		"registration_endpoint":            h.baseURL + "/oauth/register",
		"response_types_supported":         []string{"code"},
		"grant_types_supported":            []string{"authorization_code"},
		"code_challenge_methods_supported": []string{"S256"},
	})
}

// Register handles POST /oauth/register (RFC 7591 dynamic client registration).
// Returns a static client_id — no secrets stored.
func (h *OAuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RedirectURIs []string `json:"redirect_uris"`
	}
	json.NewDecoder(r.Body).Decode(&req) //nolint:errcheck

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{ //nolint:errcheck
		"client_id":                  "havril-mcp",
		"client_secret_expires_at":   0,
		"redirect_uris":              req.RedirectURIs,
		"grant_types":                []string{"authorization_code"},
		"response_types":             []string{"code"},
		"token_endpoint_auth_method": "none",
	})
}

// ProtectedResource handles GET /.well-known/oauth-protected-resource{/*}.
// RFC 9728 — tells clients which authorization server protects this resource.
func (h *OAuthHandler) ProtectedResource(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{ //nolint:errcheck
		"resource":              h.baseURL,
		"authorization_servers": []string{h.baseURL},
	})
}

// Authorize handles GET /oauth/authorize.
// Returning access_denied causes MCP clients to fall back to manual Bearer
// token entry — which is the auth model Havril uses.
func (h *OAuthHandler) Authorize(w http.ResponseWriter, r *http.Request) {
	redirectURI := r.URL.Query().Get("redirect_uri")
	state := r.URL.Query().Get("state")

	if redirectURI == "" {
		http.Error(w, `{"error":"invalid_request","error_description":"missing redirect_uri"}`, http.StatusBadRequest)
		return
	}

	target := redirectURI +
		"?error=access_denied" +
		"&error_description=" + url.QueryEscape("Havril uses Bearer token auth — paste your havril_ token when prompted")
	if state != "" {
		target += "&state=" + url.QueryEscape(state)
	}
	http.Redirect(w, r, target, http.StatusFound)
}
