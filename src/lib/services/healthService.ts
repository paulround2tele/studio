// Health service for direct API calls

export interface HealthResponse {
  status: string;
  timestamp: string;
  version?: string;
  message?: string;
  checks?: Record<string, unknown>;
}

export async function getHealth(): Promise<HealthResponse> {
  try {
    // Use the backend API URL instead of frontend API route
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/v2/health`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    // Fallback response
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Health check failed',
    };
  }
}

const healthService = { getHealth };
export default healthService;
