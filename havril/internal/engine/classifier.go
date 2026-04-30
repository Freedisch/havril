package engine

import "github.com/freedisch/havril/pkg/models"

var validTypes = map[string]bool{
	models.MemoryTypeSemantic:   true,
	models.MemoryTypeEpisodic:   true,
	models.MemoryTypeProcedural: true,
	models.MemoryTypeSummary:    true,
	models.MemoryTypeProject: true,
}

type Classifier struct{}

func newClassifier() *Classifier { return &Classifier{} }

func (c *Classifier) classify(memType string) string {
	if validTypes[memType] {
		return memType
	}
	return models.MemoryTypeSemantic
}
