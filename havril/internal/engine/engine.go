package engine

import "github.com/freedisch/havril/internal/memory"

type Message struct {
	Role    string `json:"Role"`
	Content string `json:"Content"`
}

type EngineResult struct {
	MemoriesCreated int
	MemoriesUpdated int
}

type Config struct {
	OpenAIAPIKey    string
	DedupThreshold  float64
	ContradictLower float64
	ContradictUpper float64
}

type Engine struct {
	exctractor   *Extractor
	deduplicator *Deduplicator
	classifier   *Classifier
	scorer       *Scorer
	repo         *memory.Repository
	contradictLo float32
	contradictHi float32
}
