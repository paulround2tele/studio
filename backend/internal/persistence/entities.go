package persistence

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"net"
	"time"

	"studio/backend/internal/domain"

	"github.com/google/uuid"
)

// ============================================================================
// DATABASE PERSISTENCE MODELS - Infrastructure layer with proper mapping
// ============================================================================

// UserEntity represents the database persistence model for users
type UserEntity struct {
	ID                         uuid.UUID      `db:"id"`
	Email                      string         `db:"email"`
	EmailVerified              bool           `db:"email_verified"`
	EmailVerificationToken     sql.NullString `db:"email_verification_token"`
	EmailVerificationExpires   sql.NullTime   `db:"email_verification_expires_at"`
	PasswordHash               string         `db:"password_hash"`
	PasswordPepperVersion      int            `db:"password_pepper_version"`
	FirstName                  string         `db:"first_name"`
	LastName                   string         `db:"last_name"`
	AvatarURL                  sql.NullString `db:"avatar_url"`
	IsActive                   bool           `db:"is_active"`
	IsLocked                   bool           `db:"is_locked"`
	FailedLoginAttempts        int            `db:"failed_login_attempts"`
	LockedUntil                sql.NullTime   `db:"locked_until"`
	LastLoginAt                sql.NullTime   `db:"last_login_at"`
	LastLoginIP                *net.IP        `db:"last_login_ip"`
	PasswordChangedAt          time.Time      `db:"password_changed_at"`
	MustChangePassword         bool           `db:"must_change_password"`
	MFAEnabled                 bool           `db:"mfa_enabled"`
	MFASecretEncrypted         []byte         `db:"mfa_secret_encrypted"`
	MFABackupCodesEncrypted    []byte         `db:"mfa_backup_codes_encrypted"`
	MFALastUsedAt              sql.NullTime   `db:"mfa_last_used_at"`
	EncryptedFields            sql.NullString `db:"encrypted_fields"`
	SecurityQuestionsEncrypted []byte         `db:"security_questions_encrypted"`
	CreatedAt                  time.Time      `db:"created_at"`
	UpdatedAt                  time.Time      `db:"updated_at"`
}

// ToDomain converts database entity to domain model (PUBLIC DATA ONLY)
func (u *UserEntity) ToDomain() *domain.User {
	var avatarURL string
	if u.AvatarURL.Valid {
		avatarURL = u.AvatarURL.String
	}

	var lastLoginAt *time.Time
	if u.LastLoginAt.Valid {
		lastLoginAt = &u.LastLoginAt.Time
	}

	return &domain.User{
		ID:                 u.ID,
		Email:              u.Email,
		EmailVerified:      u.EmailVerified,
		FirstName:          u.FirstName,
		LastName:           u.LastName,
		AvatarURL:          avatarURL,
		IsActive:           u.IsActive,
		IsLocked:           u.IsLocked,
		LastLoginAt:        lastLoginAt,
		MustChangePassword: u.MustChangePassword,
		MFAEnabled:         u.MFAEnabled,
		CreatedAt:          u.CreatedAt,
		UpdatedAt:          u.UpdatedAt,
	}
}

// ToSecrets extracts sensitive data into separate secrets model
func (u *UserEntity) ToSecrets() *domain.UserSecrets {
	secrets := &domain.UserSecrets{
		UserID:                     u.ID,
		PasswordHash:               u.PasswordHash,
		PasswordPepperVersion:      u.PasswordPepperVersion,
		FailedLoginAttempts:        u.FailedLoginAttempts,
		PasswordChangedAt:          u.PasswordChangedAt,
		MFASecretEncrypted:         u.MFASecretEncrypted,
		MFABackupCodesEncrypted:    u.MFABackupCodesEncrypted,
		SecurityQuestionsEncrypted: u.SecurityQuestionsEncrypted,
	}

	if u.EmailVerificationToken.Valid {
		secrets.EmailVerificationToken = u.EmailVerificationToken.String
	}
	if u.EmailVerificationExpires.Valid {
		secrets.EmailVerificationExpires = &u.EmailVerificationExpires.Time
	}
	if u.LockedUntil.Valid {
		secrets.LockedUntil = &u.LockedUntil.Time
	}
	if u.LastLoginIP != nil {
		secrets.LastLoginIP = u.LastLoginIP.String()
	}
	if u.MFALastUsedAt.Valid {
		secrets.MFALastUsedAt = &u.MFALastUsedAt.Time
	}
	if u.EncryptedFields.Valid {
		secrets.EncryptedFields = u.EncryptedFields.String
	}

	return secrets
}

// ProxyEntity represents the database persistence model for proxies
type ProxyEntity struct {
	ID          uuid.UUID            `db:"id"`
	Name        string               `db:"name"`
	Description sql.NullString       `db:"description"`
	Address     string               `db:"address"`
	Protocol    domain.ProxyProtocol `db:"protocol"`
	Username    sql.NullString       `db:"username"`
	Password    sql.NullString       `db:"password"`
	CountryCode sql.NullString       `db:"country_code"`
	IsEnabled   bool                 `db:"is_enabled"`
	Status      domain.ProxyStatus   `db:"status"`
	Notes       sql.NullString       `db:"notes"`
	CreatedAt   time.Time            `db:"created_at"`
	UpdatedAt   time.Time            `db:"updated_at"`
	LastChecked sql.NullTime         `db:"last_checked"`
}

// ToDomain converts database entity to domain model
func (p *ProxyEntity) ToDomain() *domain.Proxy {
	proxy := &domain.Proxy{
		ID:        p.ID,
		Name:      p.Name,
		Address:   p.Address,
		Protocol:  p.Protocol,
		IsEnabled: p.IsEnabled,
		Status:    p.Status,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
	}

	if p.Description.Valid {
		proxy.Description = p.Description.String
	}
	if p.Username.Valid {
		proxy.Username = p.Username.String
	}
	if p.Password.Valid {
		proxy.Password = p.Password.String
	}
	if p.CountryCode.Valid {
		proxy.CountryCode = p.CountryCode.String
	}
	if p.Notes.Valid {
		proxy.Notes = p.Notes.String
	}
	if p.LastChecked.Valid {
		proxy.LastChecked = &p.LastChecked.Time
	}

	return proxy
}

// KeywordSetEntity represents the database persistence model for keyword sets
type KeywordSetEntity struct {
	ID          uuid.UUID      `db:"id"`
	Name        string         `db:"name"`
	Description sql.NullString `db:"description"`
	IsEnabled   bool           `db:"is_enabled"`
	Rules       RulesJSON      `db:"rules"` // JSONB field
	CreatedAt   time.Time      `db:"created_at"`
	UpdatedAt   time.Time      `db:"updated_at"`
}

// RulesJSON handles JSONB serialization for keyword rules
type RulesJSON []domain.KeywordRule

// Scan implements sql.Scanner for reading from database
func (r *RulesJSON) Scan(value interface{}) error {
	if value == nil {
		*r = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, r)
	case string:
		return json.Unmarshal([]byte(v), r)
	default:
		return fmt.Errorf("cannot scan %T into RulesJSON", value)
	}
}

// Value implements driver.Valuer for writing to database
func (r RulesJSON) Value() (driver.Value, error) {
	if r == nil {
		return nil, nil
	}
	return json.Marshal(r)
}

// ToDomain converts database entity to domain model
func (ks *KeywordSetEntity) ToDomain() *domain.KeywordSet {
	keywordSet := &domain.KeywordSet{
		ID:        ks.ID,
		Name:      ks.Name,
		IsEnabled: ks.IsEnabled,
		Rules:     []domain.KeywordRule(ks.Rules),
		CreatedAt: ks.CreatedAt,
		UpdatedAt: ks.UpdatedAt,
	}

	if ks.Description.Valid {
		keywordSet.Description = ks.Description.String
	}

	return keywordSet
}

// CampaignEntity represents the database persistence model for campaigns
type CampaignEntity struct {
	ID            uuid.UUID            `db:"id"`
	Name          string               `db:"name"`
	UserID        uuid.UUID            `db:"user_id"`
	Type          domain.CampaignType  `db:"campaign_type"`
	State         domain.CampaignState `db:"state"`
	Configuration ConfigurationJSON    `db:"configuration"` // JSONB field
	CreatedAt     time.Time            `db:"created_at"`
	UpdatedAt     time.Time            `db:"updated_at"`
	StartedAt     sql.NullTime         `db:"started_at"`
	CompletedAt   sql.NullTime         `db:"completed_at"`
}

// ConfigurationJSON handles JSONB serialization for campaign configuration
type ConfigurationJSON domain.CampaignConfig

// Scan implements sql.Scanner
func (c *ConfigurationJSON) Scan(value interface{}) error {
	if value == nil {
		*c = ConfigurationJSON{}
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, c)
	case string:
		return json.Unmarshal([]byte(v), c)
	default:
		return fmt.Errorf("cannot scan %T into ConfigurationJSON", value)
	}
}

// Value implements driver.Valuer
func (c ConfigurationJSON) Value() (driver.Value, error) {
	return json.Marshal(c)
}

// ToDomain converts database entity to domain model
func (c *CampaignEntity) ToDomain() *domain.Campaign {
	campaign := &domain.Campaign{
		ID:            c.ID,
		Name:          c.Name,
		UserID:        c.UserID,
		Type:          c.Type,
		State:         c.State,
		Configuration: domain.CampaignConfig(c.Configuration),
		CreatedAt:     c.CreatedAt,
		UpdatedAt:     c.UpdatedAt,
	}

	if c.StartedAt.Valid {
		campaign.StartedAt = &c.StartedAt.Time
	}
	if c.CompletedAt.Valid {
		campaign.CompletedAt = &c.CompletedAt.Time
	}

	return campaign
}
