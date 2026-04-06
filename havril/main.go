package main

import (
	"log"
	"net/http"
	"os"

	"github.com/freedisch/havril/internal/api/handlers"
	"github.com/freedisch/havril/internal/api/middleware"
	"github.com/freedisch/havril/internal/embedding"
	"github.com/freedisch/havril/internal/memory"
	"github.com/freedisch/havril/internal/store/postgres"
	"github.com/freedisch/havril/internal/store/vector"
	"github.com/freedisch/havril/internal/user"
	"github.com/go-chi/chi/v5"
	chimid "github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/google"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, reading from environment")
	}

	port := getEnv("PORT", "8080")
	dsn := mustEnv("DATABASE_URL")
	sessionSecret := getEnv("SESSION_SECRET", "change-me-in-production")
	baseURL := getEnv("APP_BASE_URL", "http://localhost:"+port)

	// Database
	db, err := postgres.NewDB(dsn)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}

	// OAuth session store (required by goth/gothic)
	store := sessions.NewCookieStore([]byte(sessionSecret))
	store.MaxAge(86400)
	gothic.Store = store

	// Register OAuth providers based on available env vars
	var providers []goth.Provider
	if id := os.Getenv("GOOGLE_CLIENT_ID"); id != "" {
		providers = append(providers, google.New(
			id,
			mustEnv("GOOGLE_CLIENT_SECRET"),
			baseURL+"/v1/auth/google/callback",
			"email", "profile",
		))
	}
	if id := os.Getenv("GITHUB_CLIENT_ID"); id != "" {
		providers = append(providers, github.New(
			id,
			mustEnv("GITHUB_CLIENT_SECRET"),
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
	authMid := middleware.NewAuthMiddleware(userSvc)
	modelRepo := user.NewModelRepository(db)
	modelSvc := user.NewModelService(modelRepo)
	modelsHandler := handlers.NewModelsHandler(modelSvc)
	qdrantHost := getEnv("QDRANT_HOST", "localhost:6334")
	vectorStore, err := vector.New(qdrantHost)
	if err != nil {
		log.Fatalf("connect qdrant: %v", err)
	}
	embedder, err := embedding.New(embedding.Config{
		Provider: getEnv("EMBEDDING_PROVIDER", "openai"),
		APIKey:   mustEnv("OPENAI_API_KEY"),
		Model:    getEnv("EMBEDDING_MODEL", "text-embedding-3-small"),
	})
	if err != nil {
		log.Fatalf("init embedder: %v", err)
	}
	memoryRepo := memory.NewRepository(db, vectorStore, embedder)
	memorySvc := memory.NewService(memoryRepo)
	memoryHandler := handlers.NewMemoryHandler(memorySvc)

	// Router
	r := chi.NewRouter()
	r.Use(chimid.Logger)
	r.Use(chimid.Recoverer)

	// Public routes
	r.Get("/v1/health", healthHandler)
	r.Get("/v1/auth/{provider}", authHandler.Begin)
	r.Get("/v1/auth/{provider}/callback", authHandler.Callback)

	// Protected routes — expanded in Step 3+
	r.Group(func(r chi.Router) {
		r.Use(authMid.Authenticate)
		r.Post("/v1/models/connect", modelsHandler.Connect)
		r.Get("/v1/models", modelsHandler.List)

		r.Get("/v1/memory", memoryHandler.List)
		r.Get("/v1/memory/{id}", memoryHandler.GetByID)

		// models, memory routes will be mounted here

	})

	log.Printf("havril listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`)) //nolint:errcheck
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}
