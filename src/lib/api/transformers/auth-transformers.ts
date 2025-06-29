/**
 * Authentication API Response Transformers
 * Handles conversion of auth responses to use proper field names and branded types
 */

import type { ModelsUserAPI } from '@/lib/api-client/models/models-user-api';
import type { LoginResponseAPI as ModelsLoginResponseAPI } from '@/lib/api-client/models/login-response-api';
import type { UserAPI } from '@/lib/api-client/models/user-api';
import type { UUID, ISODateString } from '@/lib/types/branded';
import { createUUID, createISODateString } from '@/lib/types/branded';

/**
 * User API model with properly typed fields
 */
export interface UserAPIAligned {
    avatarUrl?: string;
    createdAt?: ISODateString;
    email?: string;
    emailVerified?: boolean;
    firstName?: string;
    id?: UUID;
    isActive?: boolean;
    isLocked?: boolean;
    lastLoginAt?: ISODateString;
    lastLoginIp?: string;
    lastName?: string;
    mfaEnabled?: boolean;
    mfaLastUsedAt?: ISODateString;
    mustChangePassword?: boolean;
    name?: string;
    updatedAt?: ISODateString;
}

/**
 * Login response with camelCase field naming
 */
export interface LoginResponseAPIAligned {
    error?: string;
    expiresAt?: ISODateString;
    requiresCaptcha?: boolean; // Fixed field name to match backend
    sessionId?: string;
    success?: boolean;
    user?: UserAPIAligned;
}

/**
 * Transform raw user API response to aligned model
 */
export function transformUserResponse(raw: UserAPI): UserAPIAligned {
    return {
        avatarUrl: raw.avatarUrl || undefined,
        createdAt: raw.createdAt ? createISODateString(raw.createdAt) : undefined,
        email: raw.email,
        emailVerified: raw.emailVerified,
        firstName: raw.firstName,
        id: raw.id ? createUUID(raw.id) : undefined,
        isActive: raw.isActive,
        isLocked: raw.isLocked,
        lastLoginAt: raw.lastLoginAt ? createISODateString(raw.lastLoginAt) : undefined,
        lastLoginIp: raw.lastLoginIp || undefined,
        lastName: raw.lastName,
        mfaEnabled: raw.mfaEnabled,
        mfaLastUsedAt: raw.mfaLastUsedAt ? createISODateString(raw.mfaLastUsedAt) : undefined,
        mustChangePassword: raw.mustChangePassword,
        name: raw.name,
        updatedAt: raw.updatedAt ? createISODateString(raw.updatedAt) : undefined,
    };
}

/**
 * Transform raw login response to aligned model
 */
export function transformLoginResponse(raw: ModelsLoginResponseAPI): LoginResponseAPIAligned {
    return {
        error: raw.error ?? undefined,
        expiresAt: raw.expiresAt ? createISODateString(raw.expiresAt) : undefined,
        requiresCaptcha: raw.requiresCaptcha ?? undefined,
        sessionId: raw.sessionId ?? undefined,
        success: raw.success,
        user: raw.user ? transformUserResponse(raw.user) : undefined,
    };
}

/**
 * Transform array of user responses
 */
export function transformUserArrayResponse(raw: ModelsUserAPI[]): UserAPIAligned[] {
    return raw.map(user => transformUserResponse(user as UserAPI));
}

/**
 * Transform user request data (reverse transformation for API calls)
 */
export function transformUserRequestData(data: Partial<UserAPIAligned>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    // Copy all fields, converting branded types back to primitives
    if (data.avatarUrl !== undefined) result.avatarUrl = data.avatarUrl;
    if (data.createdAt !== undefined) result.createdAt = data.createdAt;
    if (data.email !== undefined) result.email = data.email;
    if (data.emailVerified !== undefined) result.emailVerified = data.emailVerified;
    if (data.firstName !== undefined) result.firstName = data.firstName;
    if (data.id !== undefined) result.id = data.id;
    if (data.isActive !== undefined) result.isActive = data.isActive;
    if (data.isLocked !== undefined) result.isLocked = data.isLocked;
    if (data.lastLoginAt !== undefined) result.lastLoginAt = data.lastLoginAt;
    if (data.lastLoginIp !== undefined) result.lastLoginIp = data.lastLoginIp;
    if (data.lastName !== undefined) result.lastName = data.lastName;
    if (data.mfaEnabled !== undefined) result.mfaEnabled = data.mfaEnabled;
    if (data.mfaLastUsedAt !== undefined) result.mfaLastUsedAt = data.mfaLastUsedAt;
    if (data.mustChangePassword !== undefined) result.mustChangePassword = data.mustChangePassword;
    if (data.name !== undefined) result.name = data.name;
    if (data.updatedAt !== undefined) result.updatedAt = data.updatedAt;
    
    return result;
}