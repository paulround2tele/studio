/**
 * Authentication Development Prompts
 * 
 * Specialized prompts for DomainFlow authentication and authorization development.
 * Provides context-aware guidance for auth-related features.
 */
export async function authPrompts(feature: string) {
  const prompts = getAuthPrompts();
  const selectedPrompt = prompts[feature.toLowerCase()] || prompts.general;

  return {
    description: `Authentication development guidance for: ${feature}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: selectedPrompt,
        },
      },
    ],
  };
}

function getAuthPrompts(): Record<string, string> {
  return {
    login: `
# Authentication Login Development Guide

You are working on DomainFlow's login functionality. Here's the essential context:

## Authentication Architecture
- **Session-based**: HTTP-only cookies with secure fingerprinting
- **Dual Mode**: Bearer token with API key fallback
- **Security**: Advanced fingerprinting and validation
- **Duration**: Configurable session duration (default 24h)

## Key Components

### 1. Login Flow Implementation
\`\`\`typescript
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  user: {
    id: SafeBigInt;  // Always use SafeBigInt for user IDs
    email: string;
    role: UserRole;
    permissions: Permission[];
  };
  sessionToken?: string;  // Optional for API access
}
\`\`\`

### 2. Service Integration
- Use \`authService.login()\` method
- Handle session cookie automatically
- Store user data in AuthContext
- Trigger navigation after successful login

### 3. Security Considerations
- Validate email format with \`validateEmail()\`
- Hash passwords on client side (optional)
- Implement rate limiting protection
- Use CSRF protection for form submissions

## Implementation Patterns

### Login Component
\`\`\`typescript
const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState<LoginRequest>({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!validateEmail(credentials.email)) {
      setError('Invalid email format');
      return;
    }

    try {
      await login(credentials);
      navigate('/dashboard');
    } catch (error) {
      handleLoginError(error);
    }
  };
};
\`\`\`

### Error Handling
- **401**: Invalid credentials - show user-friendly message
- **429**: Rate limited - show retry after message
- **500**: Server error - show generic error with retry option
- **Network**: Connection issues - show offline message

## Security Features
- **Session Fingerprinting**: Browser and device identification
- **Secure Cookies**: HTTP-only, Secure, SameSite settings
- **CSRF Protection**: Token-based protection for forms
- **Brute Force Protection**: Rate limiting on login attempts

## API Endpoint
\`POST /api/v2/auth/login\`
- Request: Email and password
- Response: User data and session establishment
- Cookies: Automatic session cookie setting

## Testing Guidelines
- Test valid login credentials
- Test invalid credentials (wrong password, unknown email)
- Test rate limiting behavior
- Test session persistence across page reloads
- Test CSRF protection

Focus on security, user experience, and proper error handling.
`,

    logout: `
# Authentication Logout Development Guide

You are working on DomainFlow's logout functionality. Here's the context:

## Logout Architecture
- **Session Termination**: Server-side session invalidation
- **Cookie Cleanup**: Automatic cookie removal
- **State Cleanup**: Clear all authentication state
- **Redirect**: Navigate to login or public page

## Implementation Components

### 1. Logout Process
\`\`\`typescript
const logout = async () => {
  try {
    // 1. Call server logout endpoint
    await authService.logout();
    
    // 2. Clear local authentication state
    setUser(null);
    setIsAuthenticated(false);
    
    // 3. Clear any cached data
    queryClient.clear();
    
    // 4. Close WebSocket connections
    websocketService.disconnect();
    
    // 5. Navigate to login page
    navigate('/login', { replace: true });
  } catch (error) {
    // Handle logout errors gracefully
    console.error('Logout error:', error);
    // Still clear local state even if server call fails
    forceLogout();
  }
};
\`\`\`

### 2. Automatic Logout Scenarios
- **Session Expiration**: Detect expired sessions
- **Inactivity Timeout**: Log out inactive users
- **Security Events**: Force logout on security issues
- **Multiple Tab Sync**: Coordinate logout across browser tabs

### 3. Cleanup Tasks
- Clear authentication tokens
- Remove session cookies
- Clear cached API responses
- Close active WebSocket connections
- Clear sensitive data from localStorage

## Security Considerations
- **Server-side Validation**: Always invalidate session on server
- **Cookie Security**: Ensure secure cookie removal
- **Memory Cleanup**: Clear sensitive data from memory
- **Redirect Security**: Prevent open redirect vulnerabilities

## API Integration
\`POST /api/v2/auth/logout\`
- Request: Current session (via cookie)
- Response: Confirmation of logout
- Side Effects: Session invalidation, cookie removal

## Error Handling
- **Network Errors**: Still perform local cleanup
- **Server Errors**: Log error but continue logout
- **Timeout**: Don't block user logout on timeout

## User Experience
- **Immediate Feedback**: Show logout in progress
- **Graceful Degradation**: Handle offline scenarios
- **Clear Messaging**: Confirm successful logout
- **Quick Access**: Easy logout from any page

## Testing Strategy
- Test successful logout flow
- Test logout with network errors
- Test session expiration handling
- Test multi-tab logout synchronization
- Test cleanup of sensitive data

Focus on security, complete cleanup, and graceful error handling.
`,

    session: `
# Session Management Development Guide

You are working on DomainFlow's session management. Here's the context:

## Session Architecture
- **HTTP-only Cookies**: Secure session storage
- **Fingerprinting**: Advanced browser/device identification
- **Refresh Logic**: Automatic session renewal
- **Multi-tab Support**: Synchronized session state

## Session Implementation

### 1. Session Validation
\`\`\`typescript
interface SessionInfo {
  userId: SafeBigInt;
  role: UserRole;
  permissions: Permission[];
  expiresAt: ISODateString;
  fingerprint: string;
}

const validateSession = async (): Promise<SessionInfo | null> => {
  try {
    const response = await apiClient.get('/api/v2/auth/session');
    return response.data;
  } catch (error) {
    if (error.status === 401) {
      // Session expired or invalid
      return null;
    }
    throw error;
  }
};
\`\`\`

### 2. Session Renewal
- **Automatic Refresh**: Renew before expiration
- **Activity Detection**: Extend session on user activity
- **Background Refresh**: Silent renewal without user interaction
- **Retry Logic**: Handle temporary network issues

### 3. Session Context
\`\`\`typescript
const SessionProvider: React.FC = ({ children }) => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    validateAndRefreshSession();
    
    // Set up automatic refresh
    const interval = setInterval(
      checkSessionExpiration,
      5 * 60 * 1000 // Check every 5 minutes
    );
    
    return () => clearInterval(interval);
  }, []);
};
\`\`\`

## Security Features

### 1. Session Fingerprinting
- Browser user agent
- Screen resolution
- Timezone
- Language preferences
- Available fonts (partial)

### 2. Session Security
- **CSRF Protection**: Token validation
- **Session Fixation**: Regenerate session ID on login
- **Concurrent Sessions**: Limit or track multiple sessions
- **Geographic Validation**: Detect unusual login locations

### 3. Session Expiration
- **Idle Timeout**: Configurable inactivity period
- **Absolute Timeout**: Maximum session duration
- **Warning System**: Notify users before expiration
- **Grace Period**: Allow session extension

## Implementation Patterns

### Session Hook
\`\`\`typescript
const useSession = () => {
  const context = useContext(SessionContext);
  
  const refreshSession = useCallback(async () => {
    try {
      const sessionInfo = await validateSession();
      setSessionInfo(sessionInfo);
      return sessionInfo;
    } catch (error) {
      handleSessionError(error);
      return null;
    }
  }, []);

  const isSessionValid = useMemo(() => {
    if (!sessionInfo) return false;
    return new Date(sessionInfo.expiresAt) > new Date();
  }, [sessionInfo]);

  return {
    sessionInfo,
    isSessionValid,
    refreshSession,
  };
};
\`\`\`

### Activity Tracking
\`\`\`typescript
const useActivityTracker = () => {
  const { refreshSession } = useSession();

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    let lastActivity = Date.now();

    const handleActivity = throttle(() => {
      const now = Date.now();
      if (now - lastActivity > 5 * 60 * 1000) { // 5 minutes
        lastActivity = now;
        refreshSession();
      }
    }, 1000);

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [refreshSession]);
};
\`\`\`

## API Endpoints
- \`GET /api/v2/auth/session\` - Validate current session
- \`POST /api/v2/auth/refresh\` - Refresh session
- \`GET /api/v2/auth/sessions\` - List user sessions
- \`DELETE /api/v2/auth/sessions/{id}\` - Revoke session

## Testing Strategy
- Test session validation
- Test automatic refresh
- Test session expiration
- Test multi-tab synchronization
- Test security fingerprinting

Focus on security, automatic management, and seamless user experience.
`,

    permissions: `
# Permission System Development Guide

You are working on DomainFlow's permission system. Here's the context:

## Permission Architecture
- **Role-based Access Control (RBAC)**: Users have roles with permissions
- **Granular Permissions**: Fine-grained access control
- **Dynamic Evaluation**: Runtime permission checking
- **Hierarchical Roles**: Role inheritance and precedence

## Permission Structure

### 1. Role and Permission Types
\`\`\`typescript
type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

type Permission = 
  | 'campaigns:create' | 'campaigns:read' | 'campaigns:update' | 'campaigns:delete'
  | 'personas:create' | 'personas:read' | 'personas:update' | 'personas:delete'
  | 'users:create' | 'users:read' | 'users:update' | 'users:delete'
  | 'system:admin' | 'system:config' | 'system:monitor';

interface UserWithPermissions {
  id: SafeBigInt;
  role: UserRole;
  permissions: Permission[];
  customPermissions?: Permission[]; // Additional permissions
}
\`\`\`

### 2. Permission Context
\`\`\`typescript
const PermissionProvider: React.FC = ({ children }) => {
  const { user } = useAuth();
  
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    
    // Check direct permissions
    if (user.permissions.includes(permission)) return true;
    
    // Check custom permissions
    if (user.customPermissions?.includes(permission)) return true;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    return false;
  }, [user]);

  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  return (
    <PermissionContext.Provider value={{
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }}>
      {children}
    </PermissionContext.Provider>
  );
};
\`\`\`

## Permission Components

### 1. Protected Component
\`\`\`typescript
interface ProtectedProps {
  permission: Permission | Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const Protected: React.FC<ProtectedProps> = ({ 
  permission, 
  fallback, 
  children 
}) => {
  const { hasPermission, hasAnyPermission } = usePermissions();
  
  const hasAccess = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission);
    
  if (!hasAccess) {
    return fallback || null;
  }
  
  return <>{children}</>;
};

// Usage
<Protected permission="campaigns:create">
  <CreateCampaignButton />
</Protected>
\`\`\`

### 2. Permission Hook
\`\`\`typescript
const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};

// Usage in components
const CampaignList: React.FC = () => {
  const { hasPermission } = usePermissions();
  
  const canCreateCampaigns = hasPermission('campaigns:create');
  const canDeleteCampaigns = hasPermission('campaigns:delete');
  
  return (
    <div>
      {canCreateCampaigns && <CreateButton />}
      {campaigns.map(campaign => (
        <CampaignItem 
          key={campaign.id}
          campaign={campaign}
          canDelete={canDeleteCampaigns}
        />
      ))}
    </div>
  );
};
\`\`\`

## Route Protection

### 1. Protected Routes
\`\`\`typescript
const ProtectedRoute: React.FC<{
  permission: Permission;
  children: React.ReactNode;
}> = ({ permission, children }) => {
  const { hasPermission } = usePermissions();
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};

// Usage in routing
<Route path="/admin" element={
  <ProtectedRoute permission="system:admin">
    <AdminDashboard />
  </ProtectedRoute>
} />
\`\`\`

### 2. API Protection
\`\`\`typescript
const protectedApiCall = async (permission: Permission) => {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(permission)) {
    throw new Error('Insufficient permissions');
  }
  
  return apiClient.get('/protected-endpoint');
};
\`\`\`

## Permission Management

### 1. Role Hierarchy
- **admin**: All permissions
- **manager**: Campaign and persona management
- **user**: Campaign creation and viewing
- **viewer**: Read-only access

### 2. Custom Permissions
- Additional permissions beyond role defaults
- Temporary permission grants
- Project-specific permissions

## API Integration
- \`GET /api/v2/auth/permissions\` - Get user permissions
- \`POST /api/v2/admin/users/{id}/permissions\` - Update permissions
- \`GET /api/v2/admin/roles\` - List available roles

## Testing Strategy
- Test permission checking logic
- Test protected components
- Test route protection
- Test API permission validation
- Test role hierarchy

Focus on security, granular control, and clear access patterns.
`,

    general: `
# General Authentication Development Guide

You are working on DomainFlow's authentication system. Here's the essential context:

## Authentication Overview
- **Session-based**: HTTP-only cookies with secure fingerprinting
- **Role-based Access**: Admin, manager, user, viewer roles
- **Security Features**: CSRF protection, rate limiting, session validation
- **API Integration**: Bearer token with session fallback

## Key Components
- \`AuthContext.tsx\`: Main authentication context
- \`authService.ts\`: Authentication API calls
- \`useAuth()\`: Authentication hook
- \`usePermissions()\`: Permission checking

## Essential Patterns

### 1. Authentication Context
\`\`\`typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

const useAuth = () => {
  const { login, logout, validateSession } = useContext(AuthContext);
  return { login, logout, validateSession };
};
\`\`\`

### 2. Protected Components
\`\`\`typescript
<Protected permission="campaigns:create">
  <CreateCampaignButton />
</Protected>
\`\`\`

### 3. Type Safety
- Use \`SafeBigInt\` for user IDs
- Use \`UUID\` for session tokens
- Use proper enum types for roles and permissions

## Security Considerations
1. **Session Security**: HTTP-only cookies, fingerprinting
2. **CSRF Protection**: Token-based protection
3. **Rate Limiting**: Prevent brute force attacks
4. **Input Validation**: Sanitize all auth inputs
5. **Error Handling**: Don't leak sensitive information

## Common Patterns
- Login/logout flows
- Session validation and refresh
- Permission checking
- Route protection
- API authentication

## Testing Guidelines
- Test authentication flows
- Test permission checking
- Test session management
- Test security features
- Test error scenarios

Focus on security, user experience, and proper session management.
`,

    middleware: `
# Authentication Middleware Development Guide

You are working on DomainFlow's authentication middleware. Here's the context:

## Middleware Architecture
- **Request Validation**: Validate authentication on each request
- **Session Management**: Handle session validation and refresh
- **Permission Checking**: Verify user permissions for protected routes
- **Error Handling**: Consistent error responses

## Backend Middleware (Go)

### 1. Authentication Middleware
\`\`\`go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. Extract session cookie or bearer token
        sessionToken := getSessionToken(c)
        if sessionToken == "" {
            c.JSON(401, gin.H{"error": "Authentication required"})
            c.Abort()
            return
        }

        // 2. Validate session
        session, err := validateSession(sessionToken)
        if err != nil {
            c.JSON(401, gin.H{"error": "Invalid session"})
            c.Abort()
            return
        }

        // 3. Check session expiration
        if session.ExpiresAt.Before(time.Now()) {
            c.JSON(401, gin.H{"error": "Session expired"})
            c.Abort()
            return
        }

        // 4. Set user context
        c.Set("user", session.User)
        c.Set("session", session)
        c.Next()
    }
}
\`\`\`

### 2. Permission Middleware
\`\`\`go
func RequirePermission(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        user, exists := c.Get("user")
        if !exists {
            c.JSON(403, gin.H{"error": "User context not found"})
            c.Abort()
            return
        }

        if !userHasPermission(user.(*User), permission) {
            c.JSON(403, gin.H{"error": "Insufficient permissions"})
            c.Abort()
            return
        }

        c.Next()
    }
}
\`\`\`

## Frontend Middleware (React)

### 1. API Interceptors
\`\`\`typescript
// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = getSessionToken();
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle session expiration
      handleSessionExpired();
    }
    return Promise.reject(error);
  }
);
\`\`\`

### 2. Route Guards
\`\`\`typescript
const RouteGuard: React.FC<{
  children: React.ReactNode;
  requireAuth?: boolean;
  requirePermission?: Permission;
}> = ({ children, requireAuth = true, requirePermission }) => {
  const { isAuthenticated, user } = useAuth();
  const { hasPermission } = usePermissions();

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
\`\`\`

## Session Validation

### 1. Session Fingerprinting
\`\`\`go
type SessionFingerprint struct {
    UserAgent    string
    IPAddress    string
    AcceptLang   string
    ScreenRes    string
}

func validateFingerprint(session *Session, request *http.Request) bool {
    current := extractFingerprint(request)
    return session.Fingerprint.Matches(current)
}
\`\`\`

### 2. Session Refresh
\`\`\`typescript
const refreshSession = async (): Promise<boolean> => {
  try {
    const response = await apiClient.post('/api/v2/auth/refresh');
    // Session automatically refreshed via cookie
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      // Session cannot be refreshed, redirect to login
      redirectToLogin();
      return false;
    }
    throw error;
  }
};
\`\`\`

## Error Handling

### 1. Consistent Error Responses
\`\`\`go
type AuthError struct {
    Code    string \`json:"code"\`
    Message string \`json:"message"\`
}

const (
    ErrInvalidCredentials = "INVALID_CREDENTIALS"
    ErrSessionExpired     = "SESSION_EXPIRED"
    ErrInsufficientPerms  = "INSUFFICIENT_PERMISSIONS"
)
\`\`\`

### 2. Frontend Error Handling
\`\`\`typescript
const handleAuthError = (error: ApiError) => {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      showError('Invalid email or password');
      break;
    case 'SESSION_EXPIRED':
      showWarning('Your session has expired. Please log in again.');
      redirectToLogin();
      break;
    case 'INSUFFICIENT_PERMISSIONS':
      showError('You do not have permission to perform this action');
      break;
    default:
      showError('Authentication error occurred');
  }
};
\`\`\`

## Testing Strategy
- Test middleware with valid/invalid sessions
- Test permission checking
- Test session expiration handling
- Test error responses
- Test CSRF protection

Focus on security, consistency, and proper error handling.
`
  };
}