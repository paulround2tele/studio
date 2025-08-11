/*
 * Professional API Client Wrapper
 * 
 * This file provides a PROPER API client that uses our unified response types
 * instead of the garbage auto-generated ones. This is what competent architecture
 * looks like.
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { 
  APIResponse, 
  SessionData, 
  SuccessMessage, 
  SessionRefreshData,
  isSuccessResponse,
  isErrorResponse 
} from './unified-types';

/**
 * Login request data
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Change password request data
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * Professional API Client that uses unified response envelopes
 * This is how you write API clients when you actually understand architecture.
 */
export class UnifiedAPIClient {
  private axios: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.axios = axios.create({
      baseURL,
      timeout: 30000,
      withCredentials: true, // Important for session cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor to handle unified response format
    this.axios.interceptors.response.use(
      this.handleSuccessResponse.bind(this),
      this.handleErrorResponse.bind(this)
    );
  }

  /**
   * Handle successful HTTP responses
   */
  private handleSuccessResponse(response: AxiosResponse): AxiosResponse {
    // Our backend returns unified APIResponse format
    return response;
  }

  /**
   * Handle HTTP error responses
   */
  private handleErrorResponse(error: AxiosError): Promise<never> {
    if (error.response?.data) {
      // Backend returned structured error in APIResponse format
      return Promise.reject(error);
    }
    
    // Network or other error - create unified format
    const unifiedError: APIResponse<never> = {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network request failed',
        timestamp: new Date().toISOString(),
      },
      requestId: 'client-generated',
    };
    
    return Promise.reject({ response: { data: unifiedError } });
  }

  /* ============================================
   * AUTHENTICATION ENDPOINTS
   * ============================================ */

  /**
   * Authenticate user and create session
   */
  async login(credentials: LoginRequest): Promise<APIResponse<SessionData>> {
    const response = await this.axios.post<APIResponse<SessionData>>('/auth/login', credentials);
    return response.data;
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<APIResponse<SessionData>> {
    const response = await this.axios.get<APIResponse<SessionData>>('/auth/me');
    return response.data;
  }

  /**
   * Logout and invalidate session
   */
  async logout(): Promise<APIResponse<SuccessMessage>> {
    const response = await this.axios.post<APIResponse<SuccessMessage>>('/auth/logout');
    return response.data;
  }

  /**
   * Change user password
   */
  async changePassword(request: ChangePasswordRequest): Promise<APIResponse<SuccessMessage>> {
    const response = await this.axios.post<APIResponse<SuccessMessage>>('/auth/change-password', request);
    return response.data;
  }

  /**
   * Refresh session expiry
   */
  async refreshSession(): Promise<APIResponse<SessionRefreshData>> {
    const response = await this.axios.post<APIResponse<SessionRefreshData>>('/auth/refresh');
    return response.data;
  }

  /* ============================================
   * HEALTH & MONITORING ENDPOINTS
   * ============================================ */

  /**
   * Check API health status
   */
  async ping(): Promise<APIResponse<{ message: string }>> {
    const response = await this.axios.get<APIResponse<{ message: string }>>('/ping');
    return response.data;
  }

  /**
   * Get comprehensive health check
   */
  async healthCheck(): Promise<APIResponse<any>> {
    const response = await this.axios.get<APIResponse<any>>('/health');
    return response.data;
  }

  /* ============================================
   * UTILITY METHODS
   * ============================================ */

  /**
   * Set authorization token for requests (if using token-based auth)
   */
  setAuthToken(token: string) {
    this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authorization token
   */
  clearAuthToken() {
    delete this.axios.defaults.headers.common['Authorization'];
  }

  /**
   * Get the underlying axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axios;
  }
}

/**
 * Global API client instance
 * Use this instead of the garbage auto-generated clients
 */
export const apiClient = new UnifiedAPIClient();

/**
 * Export helper functions from unified-types for convenience
 */
export { isSuccessResponse, isErrorResponse } from './unified-types';
export type { APIResponse, SessionData } from './unified-types';
