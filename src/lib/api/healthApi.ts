// Health API - temporary stub for compatibility
// TODO: Replace with OpenAPI-generated client when health domain is implemented

export interface HealthResponse {
  status: string;
  timestamp: string;
  version?: string;
  message?: string;
  checks?: Record<string, unknown>;
}

// Stub implementations - these will be replaced when health domain is migrated
const healthApi = {
  async getHealth(): Promise<HealthResponse> {
    // TODO: Implement actual health check API call
    throw new Error('Health API not yet implemented in OpenAPI migration');
  }
};

export default healthApi;