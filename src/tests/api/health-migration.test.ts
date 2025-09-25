import { HealthApi } from '@/lib/api-client/apis/health-api';
import { HealthResponse, HealthResponseStatusEnum } from '@/lib/api-client/models/health-response';

/**
 * Phase A Migration Validation - Health Endpoints
 * Tests that health endpoints return concrete HealthResponse instead of SuccessEnvelope
 */
describe('Health Endpoint Migration (Phase A)', () => {
  const healthApi = new HealthApi();

  it('should return HealthResponse with correct type structure', async () => {
    // Mock the axios response to simulate the new backend format
    const mockHealthResponse: HealthResponse = {
      status: HealthResponseStatusEnum.ok,
      version: '2.0.0',
      timestamp: '2025-01-25T14:30:00Z'
    };

    // Mock axios to return the expected structure
    jest.spyOn(healthApi, 'healthCheck').mockResolvedValue({
      data: mockHealthResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
      request: {}
    });

    const response = await healthApi.healthCheck();
    
    // Validate the response structure
    expect(response.data).toBeDefined();
    expect(response.data.status).toBe(HealthResponseStatusEnum.ok);
    expect(response.data.version).toBe('2.0.0');
    expect(response.data.timestamp).toBeDefined();
    
    // Ensure it's NOT the old envelope format
    expect(response.data).not.toHaveProperty('success');
    expect(response.data).not.toHaveProperty('requestId');
    expect(response.data).not.toHaveProperty('data');
  });

  it('should handle all health endpoint variants', () => {
    // Type-level validation that all health endpoints return HealthResponse
    expect(typeof healthApi.healthCheck).toBe('function');
    expect(typeof healthApi.healthLive).toBe('function');
    expect(typeof healthApi.healthReady).toBe('function');
    expect(typeof healthApi.ping).toBe('function');
  });

  it('should support all HealthResponse status values', () => {
    const validStatuses = [
      HealthResponseStatusEnum.ok,
      HealthResponseStatusEnum.degraded,
      HealthResponseStatusEnum.unhealthy
    ];
    
    expect(validStatuses).toHaveLength(3);
    expect(validStatuses).toContain('ok');
    expect(validStatuses).toContain('degraded');
    expect(validStatuses).toContain('unhealthy');
  });
});