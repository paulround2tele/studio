import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { AuthApi } from '@/lib/api-client/apis/auth-api';
import { apiConfiguration } from '@/lib/api/config';
import type { LoginRequest, SessionResponse, UserPublicResponse as User } from '@/lib/api-client/models';

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
          const resp = await authClient.authLogin(credentials); // AxiosResponse<SessionResponse>
          const session: SessionResponse | undefined = resp?.data;
          const sessionUser = session?.user;
          const user: User = sessionUser ? {
            id: sessionUser.id ?? 'unknown',
            email: sessionUser.email ?? credentials.email,
            username: sessionUser.username ?? (sessionUser.email ?? credentials.email),
            isActive: sessionUser.isActive ?? true,
          } : {
            id: 'authenticated',
            email: credentials.email,
            username: credentials.email,
            isActive: true,
          };
          return { data: user };
        } catch (error) {
          const e = error as { response?: { data?: unknown; status?: number }; message?: string };
          return { error: { status: e.response?.status || 500, data: e.response?.data || e.message || 'Login failed' } };
        }
      },
      invalidatesTags: ['AuthUser'],
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      queryFn: async () => {
        try {
          await authClient.authLogout();
          return { data: { success: true } };
        } catch (error) {
          const e = error as { response?: { data?: unknown; status?: number }; message?: string };
          return { error: { status: e.response?.status || 500, data: e.response?.data || e.message || 'Logout failed' } };
        }
      },
      invalidatesTags: ['AuthUser'],
    }),
    me: builder.query<User | null, void>({
      queryFn: async () => {
        try {
          const resp = await authClient.authMe(); // AxiosResponse<UserPublicResponse>
          const body = resp?.data as User | undefined;
            const user: User | null = body ? {
              id: body.id ?? 'unknown',
              email: body.email ?? 'unknown',
              username: body.username ?? body.email ?? 'unknown',
              isActive: body.isActive ?? true,
            } : null;
          return { data: user };
        } catch (error) {
          const e = error as { response?: { data?: unknown; status?: number }; message?: string };
          return { error: { status: e.response?.status || 500, data: e.response?.data || e.message || 'Failed to load user' } };
        }
      },
      providesTags: ['AuthUser'],
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useMeQuery } = authApi;
export default authApi.reducer;
