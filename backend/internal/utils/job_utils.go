package utils

import (
	"context"
	"database/sql"
	"log"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// JobCreator provides common job creation functionality for campaigns
type JobCreator struct {
	campaignJobStore store.CampaignJobStore
}

// NewJobCreator creates a new job creator
func NewJobCreator(campaignJobStore store.CampaignJobStore) *JobCreator {
	return &JobCreator{campaignJobStore: campaignJobStore}
}

// CreateInitialJob creates an initial job for a campaign
func (jc *JobCreator) CreateInitialJob(ctx context.Context, exec store.Querier, campaign *models.Campaign, jobType models.CampaignTypeEnum) error {
	if jc.campaignJobStore == nil {
		log.Printf("Warning: campaignJobStore is nil for campaign %s. Skipping job creation.", campaign.ID)
		return nil
	}

	jobCreationTime := time.Now().UTC()
	job := &models.CampaignJob{
		ID:              uuid.New(),
		CampaignID:      campaign.ID,
		JobType:         jobType,
		Status:          models.JobStatusQueued,
		ScheduledAt:     jobCreationTime,
		NextExecutionAt: sql.NullTime{Time: jobCreationTime, Valid: true},
		CreatedAt:       jobCreationTime,
		UpdatedAt:       jobCreationTime,
		MaxAttempts:     3,
	}

	if err := jc.campaignJobStore.CreateJob(ctx, exec, job); err != nil {
		log.Printf("Warning: failed to create initial job for campaign %s: %v", campaign.ID, err)
		// Don't fail the campaign creation if job creation fails
		return nil
	}

	log.Printf("Created initial job for campaign %s", campaign.ID)
	return nil
}
