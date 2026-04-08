package models

import (
	"time"

	"gorm.io/gorm"
)

type ConnectedModel struct {
	gorm.Model
	ID          string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID      string    `gorm:"type:uuid;not null;index"`
	Provider    string    `gorm:"not null"`
	Integration string    `gorm:"not null"`
	IsActive    bool      `gorm:"default:true"`
	ConnectedAt time.Time `gorm:"autoCreateTime"`
	LastUsedAt  *time.Time
}

func (ConnectedModel) TableName() string {
	return "connected_models"
}
