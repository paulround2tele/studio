/*
 * Example: How to Use the Unified API Client PROPERLY
 * 
 * This demonstrates the CORRECT way to consume APIs with unified response envelopes.
 * This is what competent frontend development looks like.
 */

import React, { useState, useEffect } from 'react';
import { apiClient, isSuccessResponse, isErrorResponse, type APIResponse, type SessionData } from '@/lib/api-client/unified-client';

/**
 * Professional login component that handles unified API responses correctly
 */
export function LoginComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SessionData | null>(null);

  /**
   * Handle login form submission
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use our unified API client
      const response: APIResponse<SessionData> = await apiClient.login({
        email,
        password,
      });

      // Type-safe response handling
      if (isSuccessResponse(response)) {
        setUser(response.data);
        console.log('Login successful:', response.data);
        
        // Access metadata if needed
        if (response.metadata?.processing) {
          console.log(`Login processed in ${response.metadata.processing.timeMs}ms`);
        }
      } else if (isErrorResponse(response)) {
        // Structured error handling
        setError(response.error.message);
        
        // Handle specific error codes if needed
        switch (response.error.code) {
          case 'VALIDATION_ERROR':
            console.log('Validation failed:', response.error.details);
            break;
          case 'AUTHENTICATION_ERROR':
            console.log('Invalid credentials');
            break;
          default:
            console.log('Login failed:', response.error.message);
        }
      }
    } catch (err: any) {
      // Network or other errors
      if (err?.response?.data && isErrorResponse(err.response.data)) {
        setError(err.response.data.error.message);
      } else {
        setError('Login failed due to network error');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      const response = await apiClient.logout();
      
      if (isSuccessResponse(response)) {
        setUser(null);
        console.log('Logout successful:', response.data.message);
      } else {
        console.error('Logout failed:', response.error?.message);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  /**
   * Check current session on component mount
   */
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await apiClient.getCurrentUser();
        
        if (isSuccessResponse(response)) {
          setUser(response.data);
        }
      } catch (err) {
        // Not logged in, that's fine
        console.log('No active session');
      }
    };

    checkSession();
  }, []);

  if (user) {
    // User is logged in
    return (
      <div className="login-success">
        <h2>Welcome, {user.user.username}!</h2>
        <p>Email: {user.user.email}</p>
        <p>Session expires: {new Date(user.expiresAt).toLocaleString()}</p>
        <button onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    );
  }

  // Login form
  return (
    <div className="login-form">
      <h2>Login</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

/**
 * Example: API Health Check Component
 */
export function HealthCheckComponent() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    
    try {
      const response = await apiClient.healthCheck();
      
      if (isSuccessResponse(response)) {
        setHealth(response.data);
      } else {
        console.error('Health check failed:', response.error?.message);
      }
    } catch (err) {
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="health-check">
      <h3>API Health Status</h3>
      <button onClick={checkHealth} disabled={loading}>
        {loading ? 'Checking...' : 'Refresh Health Check'}
      </button>
      
      {health && (
        <pre>{JSON.stringify(health, null, 2)}</pre>
      )}
    </div>
  );
}

/**
 * This is how you write frontend code when you actually understand:
 * 1. Type safety
 * 2. Error handling
 * 3. API response patterns
 * 4. Architectural consistency
 * 
 * Notice how clean and predictable this is compared to the garbage
 * you get from auto-generated clients that don't understand unified response patterns.
 */
