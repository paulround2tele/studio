/**
 * Admin Service - User Management and System Administration
 * 
 * Provides comprehensive admin functionality for user management,
 * role assignments, and system administration tasks.
 */

import apiClient from './apiClient.production';
import { transformUserResponse } from '@/lib/types/models-aligned';
import { transformErrorResponse, ApiError } from '@/lib/api/transformers/error-transformers';
import { validateUserResponse, validateOrThrow } from '@/lib/validation/runtime-validators';
import type { ModelsUserAPI, ModelsRoleAPI, ModelsPermissionAPI } from '@/lib/types/models-aligned';
import type { UUID, SafeBigInt } from '@/lib/types/branded';
import { createUUID, createISODateString } from '@/lib/types/branded';

/**
 * User list response with pagination
 */
export interface UserListResponse {
  users: ModelsUserAPI[];
  pagination: {
    page: number;
    limit: number;
    total: SafeBigInt;
    totalPages: number;
  };
}

/**
 * Create user request
 */
export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds?: UUID[];
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roleIds?: UUID[];
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest<T> {
  ids: UUID[];
  operation: 'activate' | 'deactivate' | 'delete' | 'assignRole' | 'removeRole';
  data?: T;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  successful: UUID[];
  failed: Array<{
    id: UUID;
    error: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export interface RoleListResponse {
  roles: ModelsRoleAPI[];
  pagination: {
    page: number;
    limit: number;
    total: SafeBigInt;
    totalPages: number;
  };
}

export interface PermissionListResponse {
  permissions: ModelsPermissionAPI[];
  pagination: {
    page: number;
    limit: number;
    total: SafeBigInt;
    totalPages: number;
  };
}

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description?: string;
  permissionIds?: UUID[];
}

export interface UpdateRoleRequest {
  name?: string;
  displayName?: string;
  description?: string;
  permissionIds?: UUID[];
}

export interface CreatePermissionRequest {
  name: string;
  displayName: string;
  resource: string;
  action: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  displayName?: string;
  resource?: string;
  action?: string;
  description?: string;
}

class AdminService {
  private static instance: AdminService;
  private readonly basePath = '/api/v2/admin';

  private constructor() {}

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  /**
   * List all users with pagination
   */
  async listUsers(params?: {
    page?: number;
    limit?: number;
  }): Promise<UserListResponse> {
    try {
      const response = await apiClient.get<{
        users: unknown[];
        pagination: {
          page: number;
          limit: number;
          total: SafeBigInt;
          totalPages: number;
        };
      }>(
        `${this.basePath}/users`,
        { params: params || { page: 1, limit: 10 } }
      );

      // Validate and transform users
      const users = response.data?.users.map((user: unknown) => {
        const transformed = transformUserResponse(user);
        const validation = validateUserResponse(transformed);
        if (!validation.isValid) {
          console.error('Invalid user data:', validation.errors);
        }
        return transformed;
      }) || [];

      return {
        users,
        pagination: response.data?.pagination || {
          page: 1,
          limit: 10,
          total: 0n as SafeBigInt,
          totalPages: 0
        }
      };
    } catch (error) {
      console.error('[AdminService] Failed to list users:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/users`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: UUID): Promise<ModelsUserAPI> {
    try {
      const response = await apiClient.get<unknown>(
        `${this.basePath}/users/${userId}`
      );

      const transformed = transformUserResponse(response.data);
      validateOrThrow(transformed, validateUserResponse, 'User response validation failed');
      
      return transformed;
    } catch (error) {
      console.error('[AdminService] Failed to get user:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/users/${userId}`);
    }
  }

  /**
   * Create a new user
   */
  async createUser(request: CreateUserRequest): Promise<ModelsUserAPI> {
    try {
      const response = await apiClient.post<unknown>(
        `${this.basePath}/users`,
        request as unknown as Record<string, unknown>
      );

      const transformed = transformUserResponse(response.data);
      validateOrThrow(transformed, validateUserResponse, 'User response validation failed');
      
      return transformed;
    } catch (error) {
      console.error('[AdminService] Failed to create user:', error);
      if (error instanceof ApiError && error.statusCode === 409) {
        throw new ApiError({
          code: 'USER_EXISTS',
          message: 'A user with this email already exists',
          details: [{ message: 'User already exists' }],
          statusCode: 409,
          timestamp: new Date().toISOString(),
          path: `${this.basePath}/users`
        });
      }
      throw transformErrorResponse(error, 500, `${this.basePath}/users`);
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: UUID, request: UpdateUserRequest): Promise<ModelsUserAPI> {
    try {
      const response = await apiClient.put<unknown>(
        `${this.basePath}/users/${userId}`,
        request as unknown as Record<string, unknown>
      );

      const transformed = transformUserResponse(response.data);
      validateOrThrow(transformed, validateUserResponse, 'User response validation failed');
      
      return transformed;
    } catch (error) {
      console.error('[AdminService] Failed to update user:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/users/${userId}`);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: UUID): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/users/${userId}`);
    } catch (error) {
      console.error('[AdminService] Failed to delete user:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/users/${userId}`);
    }
  }

  /**
   * Bulk activate users
   */
  async bulkActivateUsers(userIds: UUID[]): Promise<BulkOperationResult> {
    return this.performBulkOperation(userIds, async (userId) => {
      await this.updateUser(userId, { isActive: true });
    });
  }

  /**
   * Bulk deactivate users
   */
  async bulkDeactivateUsers(userIds: UUID[]): Promise<BulkOperationResult> {
    return this.performBulkOperation(userIds, async (userId) => {
      await this.updateUser(userId, { isActive: false });
    });
  }

  /**
   * Bulk delete users
   */
  async bulkDeleteUsers(userIds: UUID[]): Promise<BulkOperationResult> {
    return this.performBulkOperation(userIds, async (userId) => {
      await this.deleteUser(userId);
    });
  }

  /**
   * Bulk assign role to users
   */
  async bulkAssignRole(userIds: UUID[], roleId: UUID): Promise<BulkOperationResult> {
    return this.performBulkOperation(userIds, async (userId) => {
      const user = await this.getUserById(userId);
      const currentRoleIds = user.roles?.map(r => r.id) || [];
      if (!currentRoleIds.includes(roleId)) {
        await this.updateUser(userId, {
          roleIds: [...currentRoleIds, roleId]
        });
      }
    });
  }

  /**
   * Bulk remove role from users
   */
  async bulkRemoveRole(userIds: UUID[], roleId: UUID): Promise<BulkOperationResult> {
    return this.performBulkOperation(userIds, async (userId) => {
      const user = await this.getUserById(userId);
      const currentRoleIds = user.roles?.map(r => r.id) || [];
      const newRoleIds = currentRoleIds.filter(id => id !== roleId);
      if (newRoleIds.length !== currentRoleIds.length) {
        await this.updateUser(userId, { roleIds: newRoleIds });
      }
    });
  }

  /**
   * Generic bulk operation handler
   */
  private async performBulkOperation(
    ids: UUID[],
    operation: (id: UUID) => Promise<void>
  ): Promise<BulkOperationResult> {
    const successful: UUID[] = [];
    const failed: Array<{ id: UUID; error: string }> = [];

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(ids, concurrencyLimit);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (id) => {
          try {
            await operation(id);
            successful.push(id);
          } catch (error) {
            failed.push({
              id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        })
      );
    }

    return {
      successful,
      failed,
      totalProcessed: ids.length,
      successCount: successful.length,
      failureCount: failed.length
    };
  }

  /**
   * Utility to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Search users
   */
  async searchUsers(query: string, filters?: {
    role?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<ModelsUserAPI[]> {
    try {
      const response = await apiClient.get<unknown[]>(
        `${this.basePath}/users/search`,
        {
          params: {
            q: query,
            ...filters
          }
        }
      );

      return response.data?.map((user: unknown) => {
        const transformed = transformUserResponse(user);
        validateOrThrow(transformed, validateUserResponse, 'User response validation failed');
        return transformed;
      }) || [];
    } catch (error) {
      console.error('[AdminService] Failed to search users:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/users/search`);
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(userId: UUID, params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Array<Record<string, unknown>>> {
    try {
      const response = await apiClient.get<Array<Record<string, unknown>>>(
        `${this.basePath}/users/${userId}/activity`,
        { params }
      );

      return response.data || [];
    } catch (error) {
      console.error('[AdminService] Failed to get user activity:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/users/${userId}/activity`);
    }
  }

  /**
   * Reset user password (admin action)
   */
  async resetUserPassword(userId: UUID, temporaryPassword: string): Promise<void> {
    try {
      await apiClient.post(
        `${this.basePath}/users/${userId}/reset-password`,
        { temporaryPassword }
      );
    } catch (error) {
      console.error('[AdminService] Failed to reset user password:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/users/${userId}/reset-password`);
    }
  }

  /**
   * Unlock user account
   */
  async unlockUserAccount(userId: UUID): Promise<void> {
    try {
      await apiClient.post(`${this.basePath}/users/${userId}/unlock`);
    } catch (error) {
      console.error('[AdminService] Failed to unlock user account:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/users/${userId}/unlock`);
    }
  }

  /**
   * Lock user account
   */
  async lockUser(userId: UUID): Promise<ModelsUserAPI> {
    return this.updateUser(userId, { isLocked: true });
  }

  /**
   * Unlock user account (convenience)
   */
  async unlockUser(userId: UUID): Promise<ModelsUserAPI> {
    return this.updateUser(userId, { isLocked: false });
  }

  /**
   * Export users to CSV
   */
  async exportUsers(filters?: {
    role?: string;
    isActive?: boolean;
  }): Promise<Blob> {
    try {
      // Production API client doesn't support responseType, so we need to use fetch directly
      const params = new URLSearchParams();
      if (filters?.role) params.append('role', filters.role);
      if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
      
      const response = await fetch(`${this.basePath}/users/export?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('[AdminService] Failed to export users:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/users/export`);
    }
  }

  async listRoles(params?: { page?: number; limit?: number }): Promise<RoleListResponse> {
    try {
      const response = await apiClient.get<{ roles: any[]; pagination: { page: number; limit: number; total: SafeBigInt; totalPages: number } }>(
        `${this.basePath}/roles`,
        { params: params || { page: 1, limit: 10 } }
      );

      const roles = response.data?.roles.map(r => this.transformRole(r)) || [];

      return {
        roles,
        pagination: response.data?.pagination || { page: 1, limit: 10, total: 0n as SafeBigInt, totalPages: 0 }
      };
    } catch (error) {
      console.error('[AdminService] Failed to list roles:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/roles`);
    }
  }

  async getRoleById(roleId: UUID): Promise<ModelsRoleAPI> {
    try {
      const response = await apiClient.get<unknown>(`${this.basePath}/roles/${roleId}`);
      return this.transformRole(response.data);
    } catch (error) {
      console.error('[AdminService] Failed to get role:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/roles/${roleId}`);
    }
  }

  async createRole(request: CreateRoleRequest): Promise<ModelsRoleAPI> {
    try {
      const response = await apiClient.post<unknown>(`${this.basePath}/roles`, request as any);
      return this.transformRole(response.data);
    } catch (error) {
      console.error('[AdminService] Failed to create role:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/roles`);
    }
  }

  async updateRole(roleId: UUID, request: UpdateRoleRequest): Promise<ModelsRoleAPI> {
    try {
      const response = await apiClient.put<unknown>(`${this.basePath}/roles/${roleId}`, request as any);
      return this.transformRole(response.data);
    } catch (error) {
      console.error('[AdminService] Failed to update role:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/roles/${roleId}`);
    }
  }

  async deleteRole(roleId: UUID): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/roles/${roleId}`);
    } catch (error) {
      console.error('[AdminService] Failed to delete role:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/roles/${roleId}`);
    }
  }

  async listPermissions(params?: { page?: number; limit?: number }): Promise<PermissionListResponse> {
    try {
      const response = await apiClient.get<{ permissions: any[]; pagination: { page: number; limit: number; total: SafeBigInt; totalPages: number } }>(
        `${this.basePath}/permissions`,
        { params: params || { page: 1, limit: 10 } }
      );

      const permissions = response.data?.permissions.map(p => this.transformPermission(p)) || [];

      return {
        permissions,
        pagination: response.data?.pagination || { page: 1, limit: 10, total: 0n as SafeBigInt, totalPages: 0 }
      };
    } catch (error) {
      console.error('[AdminService] Failed to list permissions:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/permissions`);
    }
  }

  async getPermissionById(permissionId: UUID): Promise<ModelsPermissionAPI> {
    try {
      const response = await apiClient.get<unknown>(`${this.basePath}/permissions/${permissionId}`);
      return this.transformPermission(response.data);
    } catch (error) {
      console.error('[AdminService] Failed to get permission:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/permissions/${permissionId}`);
    }
  }

  async createPermission(request: CreatePermissionRequest): Promise<ModelsPermissionAPI> {
    try {
      const response = await apiClient.post<unknown>(`${this.basePath}/permissions`, request as any);
      return this.transformPermission(response.data);
    } catch (error) {
      console.error('[AdminService] Failed to create permission:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/permissions`);
    }
  }

  async updatePermission(permissionId: UUID, request: UpdatePermissionRequest): Promise<ModelsPermissionAPI> {
    try {
      const response = await apiClient.put<unknown>(`${this.basePath}/permissions/${permissionId}`, request as any);
      return this.transformPermission(response.data);
    } catch (error) {
      console.error('[AdminService] Failed to update permission:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/permissions/${permissionId}`);
    }
  }

  async deletePermission(permissionId: UUID): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/permissions/${permissionId}`);
    } catch (error) {
      console.error('[AdminService] Failed to delete permission:', error);
      throw transformErrorResponse(error, 500, `${this.basePath}/permissions/${permissionId}`);
    }
  }

  private transformRole(raw: any): ModelsRoleAPI {
    return {
      id: createUUID(raw.id),
      name: raw.name,
      displayName: raw.displayName,
      description: raw.description,
      isSystemRole: raw.isSystemRole,
      createdAt: createISODateString(raw.createdAt),
      updatedAt: createISODateString(raw.updatedAt),
      permissions: raw.permissions?.map((p: any) => this.transformPermission(p))
    } as ModelsRoleAPI;
  }

  private transformPermission(raw: any): ModelsPermissionAPI {
    return {
      id: createUUID(raw.id),
      name: raw.name,
      displayName: raw.displayName,
      description: raw.description,
      resource: raw.resource,
      action: raw.action,
      createdAt: createISODateString(raw.createdAt),
      updatedAt: createISODateString(raw.updatedAt)
    } as ModelsPermissionAPI;
  }
}

// Export singleton instance
export const adminService = AdminService.getInstance();

// Export convenience functions
export const listUsers = (params?: Parameters<typeof adminService.listUsers>[0]) =>
  adminService.listUsers(params);

export const getUserById = (userId: UUID) =>
  adminService.getUserById(userId);

export const createUser = (request: CreateUserRequest) =>
  adminService.createUser(request);

export const updateUser = (userId: UUID, request: UpdateUserRequest) =>
  adminService.updateUser(userId, request);

export const deleteUser = (userId: UUID) =>
  adminService.deleteUser(userId);

export const bulkActivateUsers = (userIds: UUID[]) =>
  adminService.bulkActivateUsers(userIds);

export const bulkDeactivateUsers = (userIds: UUID[]) =>
  adminService.bulkDeactivateUsers(userIds);

export const bulkDeleteUsers = (userIds: UUID[]) =>
  adminService.bulkDeleteUsers(userIds);

export const bulkAssignRole = (userIds: UUID[], roleId: UUID) =>
  adminService.bulkAssignRole(userIds, roleId);

export const bulkRemoveRole = (userIds: UUID[], roleId: UUID) =>
  adminService.bulkRemoveRole(userIds, roleId);

export const searchUsers = (query: string, filters?: Parameters<typeof adminService.searchUsers>[1]) =>
  adminService.searchUsers(query, filters);

export const getUserActivityLogs = (userId: UUID, params?: Parameters<typeof adminService.getUserActivityLogs>[1]) =>
  adminService.getUserActivityLogs(userId, params);

export const resetUserPassword = (userId: UUID, temporaryPassword: string) =>
  adminService.resetUserPassword(userId, temporaryPassword);

export const unlockUserAccount = (userId: UUID) =>
  adminService.unlockUserAccount(userId);

export const lockUser = (userId: UUID) =>
  adminService.lockUser(userId);

export const unlockUser = (userId: UUID) =>
  adminService.unlockUser(userId);

export const exportUsers = (filters?: Parameters<typeof adminService.exportUsers>[0]) =>
  adminService.exportUsers(filters);

export const listRoles = (params?: Parameters<typeof adminService.listRoles>[0]) =>
  adminService.listRoles(params);

export const getRoleById = (roleId: UUID) =>
  adminService.getRoleById(roleId);

export const createRole = (request: CreateRoleRequest) =>
  adminService.createRole(request);

export const updateRole = (roleId: UUID, request: UpdateRoleRequest) =>
  adminService.updateRole(roleId, request);

export const deleteRole = (roleId: UUID) =>
  adminService.deleteRole(roleId);

export const listPermissions = (params?: Parameters<typeof adminService.listPermissions>[0]) =>
  adminService.listPermissions(params);

export const getPermissionById = (id: UUID) =>
  adminService.getPermissionById(id);

export const createPermission = (request: CreatePermissionRequest) =>
  adminService.createPermission(request);

export const updatePermission = (id: UUID, request: UpdatePermissionRequest) =>
  adminService.updatePermission(id, request);

export const deletePermission = (id: UUID) =>
  adminService.deletePermission(id);
