package main

import (
	"context"
	"testing"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

func TestCampaignsProgress_DependencyGuard(t *testing.T) {
	h := &strictHandlers{deps: &AppDeps{}}
	ctx := context.Background()
	id := openapi_types.UUID(uuid.New())
	resp, err := h.CampaignsProgress(ctx, gen.CampaignsProgressRequestObject{CampaignId: id})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(gen.CampaignsProgress401JSONResponse); !ok {
		t.Fatalf("expected 401 response when deps missing, got %T", resp)
	}
}

func TestCampaignsPhaseStop_DependencyGuard(t *testing.T) {
	h := &strictHandlers{deps: &AppDeps{}}
	ctx := context.Background()
	id := openapi_types.UUID(uuid.New())
	resp, err := h.CampaignsPhaseStop(ctx, gen.CampaignsPhaseStopRequestObject{CampaignId: id, Phase: gen.CampaignPhaseEnumDiscovery})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(gen.CampaignsPhaseStop401JSONResponse); !ok {
		t.Fatalf("expected 401 response when deps missing, got %T", resp)
	}
}
