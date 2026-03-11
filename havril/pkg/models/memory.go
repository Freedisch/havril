package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type Memory struct {
	gorm.Model
	ID                     string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID                 string  `gorm:"type:uuid;not null;index"`
	Content                string  `gorm:"not null"`
	Type                   string  `gorm:"not null;check:type IN ('semantic','episodic','procedural','summary')"`
	Importance             float64 `gorm:"default:0.5"`
	SourceModel            string
	SourcePlatform         string
	Tags                   pq.StringArray `gorm:"type:text[]"`
	IsActive               bool           `gorm:"default:true;index"`
	EmbeddingStatus        string         `gorm:"default:'pending';check:embedding_status IN ('pending','complete','failed')"`
	EmbeddingRetryCount    int            `gorm:"default:0"`
	EmbeddingLastAttempted *time.Time
	AccessCount            int `gorm:"default:0"`
	LastAccessed           *time.Time
	ExpiresAt              *time.Time
}
