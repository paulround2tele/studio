import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { AuthApi } from '@/lib/api-client/apis/auth-api';
import { apiConfiguration } from '@/lib/api/config';
import type { LoginRequest, UserPublicResponse as User } from '@/lib/api-client/models';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

const authClient = new AuthApi(apiConfiguration);

// NOTE: Session state is primarily cached by useCachedAuth; this slice supplies mutation hooks
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['AuthUser'],
  endpoints: (builder) => ({
    login: builder.mutation<User, LoginRequest>({
      queryFn: async (credentials) => {
        try {
          const resp: any = await (authClient as any).authLogin(credentials);
          const data = extractResponseData<any>(resp);
          // Attempt to locate user object in envelope
          const sessionUser = data?.User || data?.user;
          if (sessionUser) {
            const user: User = {
              id: sessionUser.id ?? sessionUser.ID ?? 'unknown',
              email: sessionUser.email ?? sessionUser.Email ?? credentials.email,
              username: sessionUser.username ?? sessionUser.Username ?? credentials.email,
              isActive: sessionUser.isActive ?? sessionUser.IsActive ?? true,
            } as User;
            return { data: user };
          }
          // Fallback minimal user
          const fallback: User = {
            id: 'authenticated',
            email: credentials.email,
            username: credentials.email,
            isActive: true,
          } as User;
          return { data: fallback };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message || 'Login failed' };
        }
      },
      invalidatesTags: ['AuthUser'],
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      queryFn: async () => {
        try {
          await (authClient as any).authLogout();
          return { data: { success: true } };
        } catch (error: any) {
            return { error: error?.response?.data || error?.message || 'Logout failed' };
        }
      },
      invalidatesTags: ['AuthUser'],
    }),
    me: builder.query<User | null, void>({
      queryFn: async () => {
        try {
          const resp: any = await (authClient as any).authMe();
          const user = extractResponseData<User>(resp);
          return { data: user || null };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message || 'Failed to load user' };
        }
      },
      providesTags: ['AuthUser'],
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useMeQuery } = authApi;
export default authApi.reducer;
