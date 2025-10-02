package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// AllocateBulkResources implements POST /campaigns/bulk/resources/allocate
func (h *strictHandlers) AllocateBulkResources(ctx context.Context, r gen.AllocateBulkResourcesRequestObject) (gen.AllocateBulkResourcesResponseObject, error) {
	allocationID := openapi_types.UUID(uuid.New())
	now := time.Now()
	exp := now.Add(24 * time.Hour)
	cpu := 4
	mem := 8192
	net := 500
	stor := 2048
	est := float32(12.34)
	resp := gen.BulkResourceAllocationResponse{
		Allocation: struct {
			AllocatedAt   *time.Time `json:"allocatedAt,omitempty"`
			EstimatedCost *float32   `json:"estimatedCost"`
			ExpiresAt     *time.Time `json:"expiresAt,omitempty"`
		}{AllocatedAt: &now, EstimatedCost: &est, ExpiresAt: &exp},
		AllocationId: allocationID,
		Endpoints: &struct {
			Control    *string `json:"control,omitempty"`
			Metrics    *string `json:"metrics,omitempty"`
			Monitoring *string `json:"monitoring,omitempty"`
		}{Control: strPtr("/control"), Metrics: strPtr("/metrics"), Monitoring: strPtr("/monitoring")},
		Resources: struct {
			Cpu              *int `json:"cpu,omitempty"`
			Memory           *int `json:"memory,omitempty"`
			NetworkBandwidth *int `json:"networkBandwidth,omitempty"`
			Storage          *int `json:"storage,omitempty"`
		}{Cpu: &cpu, Memory: &mem, NetworkBandwidth: &net, Storage: &stor},
		Status: gen.BulkResourceAllocationResponseStatusAllocating,
	}
	return gen.AllocateBulkResources200JSONResponse(resp), nil
}

// GetBulkResourceStatus implements GET /campaigns/bulk/resources/status/{allocationId}
func (h *strictHandlers) GetBulkResourceStatus(ctx context.Context, r gen.GetBulkResourceStatusRequestObject) (gen.GetBulkResourceStatusResponseObject, error) {
	status := "running"
	return gen.GetBulkResourceStatus200JSONResponse{AllocationId: &r.AllocationId, Status: &status}, nil
}
