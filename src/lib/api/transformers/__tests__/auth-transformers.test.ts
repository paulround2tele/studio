/**
 * Tests for authentication transformers
 * Only tests session-based authentication functionality
 */

import {
    transformUserResponse,
    transformLoginResponse,
    transformUserArrayResponse,
    transformUserRequestData,
    type UserAPIAligned,
    type LoginResponseAPIAligned
} from '../auth-transformers';
import type { UserAPI } from '@/lib/api-client/models/user-api';
import type { LoginResponseAPI } from '@/lib/api-client/models/login-response-api';

describe('Auth Transformers', () => {
    describe('transformUserResponse', () => {
        it('should transform user API response correctly', () => {
            const rawUser: UserAPI = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                name: 'John Doe',
                isActive: true,
                isLocked: false,
                emailVerified: true,
                mfaEnabled: false,
                mustChangePassword: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z'
            };

            const result = transformUserResponse(rawUser);

            expect(result).toEqual({
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                name: 'John Doe',
                isActive: true,
                isLocked: false,
                emailVerified: true,
                mfaEnabled: false,
                mustChangePassword: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
                avatarUrl: undefined,
                lastLoginAt: undefined,
                lastLoginIp: undefined,
                mfaLastUsedAt: undefined
            });
        });
    });

    describe('transformLoginResponse', () => {
        it('should transform login response correctly', () => {
            const rawResponse: LoginResponseAPI = {
                success: true,
                sessionId: 'session123',
                expiresAt: '2024-01-01T01:00:00Z',
                requiresCaptcha: false,
                user: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    email: 'test@example.com',
                    name: 'John Doe'
                }
            };

            const result = transformLoginResponse(rawResponse);

            expect(result.success).toBe(true);
            expect(result.sessionId).toBe('session123');
            expect(result.expiresAt).toBe('2024-01-01T01:00:00Z');
            expect(result.requiresCaptcha).toBe(false);
            expect(result.user?.id).toBe('123e4567-e89b-12d3-a456-426614174000');
            expect(result.user?.email).toBe('test@example.com');
            expect(result.user?.name).toBe('John Doe');
        });

        it('should handle failed login response', () => {
            const rawResponse: LoginResponseAPI = {
                success: false,
                error: 'Invalid credentials'
            };

            const result = transformLoginResponse(rawResponse);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');
            expect(result.user).toBeUndefined();
        });
    });

    describe('transformUserArrayResponse', () => {
        it('should transform array of users', () => {
            const rawUsers: UserAPI[] = [
                {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    email: 'test1@example.com',
                    name: 'User 1'
                },
                {
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    email: 'test2@example.com',
                    name: 'User 2'
                }
            ];

            const result = transformUserArrayResponse(rawUsers);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
            expect(result[0].email).toBe('test1@example.com');
            expect(result[1].id).toBe('123e4567-e89b-12d3-a456-426614174001');
            expect(result[1].email).toBe('test2@example.com');
        });
    });

    describe('transformUserRequestData', () => {
        it('should transform user data for API requests', () => {
            const userData: Partial<UserAPIAligned> = {
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isActive: true
            };

            const result = transformUserRequestData(userData);

            expect(result).toEqual({
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                isActive: true
            });
        });

        it('should handle undefined values correctly', () => {
            const userData: Partial<UserAPIAligned> = {
                email: 'test@example.com',
                firstName: undefined,
                isActive: true
            };

            const result = transformUserRequestData(userData);

            expect(result).toEqual({
                email: 'test@example.com',
                isActive: true
            });
            expect(result.firstName).toBeUndefined();
        });
    });
});