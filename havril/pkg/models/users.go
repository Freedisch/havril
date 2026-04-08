package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID              string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email           string `gorm:"uniqueIndex;not null"`
	OAuthProvider   string `gorm:"not null"`
	OAuthID         string `gorm:"not null"`
	DisplayName     string
	AvatarURL       string
	TokenHash       string `gorm:"uniqueIndex"`
	TokenPrefix     string
	LastSeenAt      *time.Time
	ConnectedModels []ConnectedModel `gorm:"foreignKey:UserID"`
	Memories        []Memory         `gorm:"foreignKey:UserID"`
}

func (User) TableName() string {
	return "users"
}
