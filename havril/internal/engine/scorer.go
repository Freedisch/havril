package engine

import (
	"unicode/utf8"

	"github.com/freedisch/havril/pkg/models"
)

const (
	importanceHintWeight = 0.6
	specificityWeight    = 0.4

	// Specificity thresholds — content longer than these byte lengths gets a
	// higher specificity bonus. Short vague content scores lower.
	specificityShort  = 50  // < 50 chars: vague ("User likes Go")
	specificityMedium = 120 // 50–120 chars: moderate detail
	// > 120 chars: highly specific, full bonus
)

type Scorer struct{}

func newScorer() *Scorer { return &Scorer{} }

// specificityBonus returns a 0.0–1.0 value based on content length.
// Longer, more detailed content is considered more specific and scores higher.
func specificityBonus(content string) float64 {
	length := utf8.RuneCountInString(content)
	switch {
	case length >= specificityMedium:
		return 1.0
	case length <= specificityShort:
		// Linear scale between 0.5 and 1.0 in the medium range
		ratio := float64(length-specificityShort) / float64(specificityMedium-specificityShort)
		return 0.5 * (ratio * 0.5)
	default:
		ratio := float64(length) / float64(specificityShort)
		return ratio * 0.5
	}

}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func (s *Scorer) score(importanceHint float64, content string, memType string) float64 {
	if memType == models.MemoryTypeProject {
		result := (importanceHint * importanceHintWeight) + (1.0 * specificityWeight)
		return clamp(result, 0.0, 1.0)
	}
	specificity := specificityBonus(content)
	result := (importanceHint * importanceHintWeight) + (specificity * specificityWeight)
	return clamp(result, 0.0, 1.0)
}
