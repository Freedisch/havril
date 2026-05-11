package main

import (
	"context"
	_ "embed"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/freedisch/havril/internal/api/handlers"
	"github.com/freedisch/havril/internal/api/middleware"
	"github.com/freedisch/havril/internal/embedding"
	"github.com/freedisch/havril/internal/engine"
	"github.com/freedisch/havril/internal/mcp"
	"github.com/freedisch/havril/internal/memory"
	"github.com/freedisch/havril/internal/store"
	"github.com/freedisch/havril/internal/user"
	"github.com/freedisch/havril/pkg/utils"
	"github.com/go-chi/chi/v5"
	chimid "github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/google"
)

var faviconSVG []byte

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, reading from environment")
	}

	port := utils.GetEnv("PORT", "8080")
	dsn := utils.MustEnv("DATABASE_URL")
	sessionSecret := utils.GetEnv("SESSION_SECRET", "change-me-in-production")
	baseURL := utils.GetEnv("APP_BASE_URL", "http://localhost:"+port)

	db, err := store.NewDB(dsn)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}

	// OAuth session store (required by goth/gothic)
	cookie := sessions.NewCookieStore([]byte(sessionSecret))
	cookie.MaxAge(86400)
	gothic.Store = cookie

	// Register OAuth providers based on available env vars
	var providers []goth.Provider
	if id := os.Getenv("GOOGLE_CLIENT_ID"); id != "" {
		providers = append(providers, google.New(
			id,
			utils.MustEnv("GOOGLE_CLIENT_SECRET"),
			baseURL+"/v1/auth/google/callback",
			"email", "profile",
		))
	}
	if id := os.Getenv("GITHUB_CLIENT_ID"); id != "" {
		providers = append(providers, github.New(
			id,
			utils.MustEnv("GITHUB_CLIENT_SECRET"),
			baseURL+"/v1/auth/github/callback",
			"user:email",
		))
	}
	if len(providers) == 0 {
		log.Fatal("no OAuth providers configured — set GOOGLE_CLIENT_ID or GITHUB_CLIENT_ID")
	}
	goth.UseProviders(providers...)

	// Dependency injection
	userRepo := user.NewRepository(db)
	userSvc := user.NewService(userRepo)
	authHandler := handlers.NewAuthHandler(userSvc)
	oauthHandler := handlers.NewOAuthHandler(baseURL, userRepo)
	authMid := middleware.NewAuthMiddleware(userSvc)
	modelRepo := user.NewModelRepository(db)
	modelSvc := user.NewModelService(modelRepo)
	modelsHandler := handlers.NewModelsHandler(modelSvc)
	qdrantHost := strings.TrimPrefix(strings.TrimPrefix(utils.GetEnv("QDRANT_HOST", "localhost:6334"), "https://"), "http://")
	qdrantAPIKey := os.Getenv("QDRANT_API_KEY")
	vectorStore, err := store.New(qdrantHost, qdrantAPIKey)
	if err != nil {
		log.Fatalf("connect qdrant: %v", err)
	}
	if err := store.EnsureCollection(context.Background(), qdrantHost, qdrantAPIKey); err != nil {
		log.Fatalf("failed to ensure qdrant collection: %v", err)
	}
	embedder, err := embedding.New(embedding.Config{
		Provider: utils.GetEnv("EMBEDDING_PROVIDER", "openai"),
		APIKey:   utils.MustEnv("OPENAI_API_KEY"),
		Model:    utils.GetEnv("EMBEDDING_MODEL", "text-embedding-3-small"),
	})
	if err != nil {
		log.Fatalf("init embedder: %v", err)
	}
	memoryRepo := memory.NewRepository(db, vectorStore, embedder)
	eng := engine.New(engine.Config{
		OpenAIAPIKey: utils.MustEnv("OPENAI_API_KEY"),
	}, embedder, vectorStore, memoryRepo)
	memorySvc := memory.NewService(memoryRepo, eng)
	memoryHandler := handlers.NewMemoryHandler(memorySvc)

	r := chi.NewRouter()
	r.Use(chimid.Logger)
	r.Use(chimid.Recoverer)

	// Public routes
	r.Get("/favicon.ico", faviconHandler)
	r.Get("/favicon.svg", faviconHandler)
	r.Get("/v1/health", healthHandler)
	r.Get("/v1/auth/{provider}", authHandler.Begin)
	r.Get("/v1/auth/{provider}/callback", authHandler.Callback)
	r.Get("/v1/auth/ext/done", authHandler.ExtDone)

	// OAuth discovery stubs — required by MCP clients before
	// they will attempt a connection; access_denied from /authorize causes
	// fallback to manual Bearer token entry.
	r.Get("/.well-known/oauth-authorization-server", oauthHandler.Metadata)
	r.Get("/.well-known/oauth-protected-resource", oauthHandler.ProtectedResource)
	r.Get("/.well-known/oauth-protected-resource/*", oauthHandler.ProtectedResource)
	r.Post("/oauth/register", oauthHandler.Register)
	r.Get("/oauth/authorize", oauthHandler.Authorize)
	r.Post("/oauth/authorize", oauthHandler.Authorize)
	r.Post("/oauth/token", oauthHandler.Token)
	r.Group(func(r chi.Router) {
		r.Use(authMid.Authenticate)
		r.Post("/v1/mcp/token", authHandler.NewMcpToken)
		r.Post("/v1/models/connect", modelsHandler.Connect)
		r.Get("/v1/models", modelsHandler.List)

		r.Get("/v1/memory", memoryHandler.List)
		r.Get("/v1/memory/{id}", memoryHandler.GetByID)
		r.Post("/v1/memory/submit", memoryHandler.Submit)
		r.Get("/v1/memory/fetch", memoryHandler.Fetch)

	})

	mcpSrv := mcp.New(memorySvc, userRepo)
	mcpHandler := mcpSrv.MustAuth(mcpSrv.Handler())
	r.Group(func(r chi.Router) {
		r.Use(authMid.AuthenticateMcp)
		r.Method(http.MethodPost, "/mcp", mcpHandler)
		r.Method(http.MethodGet, "/mcp", mcpHandler)
		r.Method(http.MethodDelete, "/mcp", mcpHandler)
	})

	log.Printf("havril listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func faviconHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "image/svg+xml")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(faviconSVG)
}
