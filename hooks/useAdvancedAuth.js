// hooks/useAdvancedAuth.js - Modern React Hook with Advanced Patterns
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';

const useAdvancedAuth = (options = {}) => {
  const {
    redirectTo = '/login',
    redirectIfAuthenticated = false,
    requiredRole,
    requiredPermission,
    onAuthSuccess,
    onAuthError
  } = options;

  const router = useRouter();
  const [authState, setAuthState] = useState({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });

  const abortControllerRef = useRef();

  // Memoized authentication check
  const checkAuth = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check for token in localStorage/sessionStorage
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

      if (!token) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false
        }));

        if (redirectIfAuthenticated) {
          await router.push(redirectTo);
        }
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const userData = await response.json();

      // Check role-based access
      if (requiredRole && userData.role !== requiredRole) {
        throw new Error('Insufficient permissions');
      }

      // Check permission-based access
      if (requiredPermission && !userData.permissions?.includes(requiredPermission)) {
        throw new Error('Insufficient permissions');
      }

      setAuthState({
        user: userData,
        isLoading: false,
        isAuthenticated: true,
        error: null
      });

      onAuthSuccess?.(userData);

    } catch (error) {
      if (error.name !== 'AbortError') {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: error.message
        });

        onAuthError?.(error);

        // Clear invalid token
        localStorage.removeItem('accessToken');
        sessionStorage.removeItem('accessToken');

        if (!redirectIfAuthenticated) {
          await router.push(redirectTo);
        }
      }
    }
  }, [redirectTo, redirectIfAuthenticated, requiredRole, requiredPermission, router, onAuthSuccess, onAuthError]);

  // Auto-refresh token before expiry
  const refreshToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) throw new Error('Token refresh failed');

      const { accessToken, refreshToken: newRefreshToken } = await response.json();

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      return true;
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return false;
    }
  }, []);

  // Login function with advanced error handling
  const login = useCallback(async (credentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const { user, accessToken, refreshToken, expiresIn } = await response.json();

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Set auto-refresh timer
      setTimeout(() => refreshToken(), (expiresIn * 0.8) * 1000);

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null
      });

      onAuthSuccess?.(user);
      return user;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));

      onAuthError?.(error);
      throw error;
    }
  }, [refreshToken, onAuthSuccess, onAuthError]);

  // Logout function with cleanup
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        // Revoke refresh token on server
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      });

      if (!redirectIfAuthenticated) {
        await router.push(redirectTo);
      }
    }
  }, [redirectTo, redirectIfAuthenticated, router]);

  // Check authentication on mount and route changes
  useEffect(() => {
    checkAuth();

    // Listen for storage changes (for multi-tab logout)
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken' && !e.newValue) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Logged out in another tab'
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [checkAuth]);

  // Memoized user permissions
  const userPermissions = useMemo(() => {
    return authState.user?.permissions || [];
  }, [authState.user]);

  // Memoized role checks
  const hasRole = useCallback((role) => {
    return authState.user?.role === role;
  }, [authState.user]);

  const hasPermission = useCallback((permission) => {
    return userPermissions.includes(permission);
  }, [userPermissions]);

  const hasAnyRole = useCallback((...roles) => {
    return roles.includes(authState.user?.role);
  }, [authState.user]);

  const hasAnyPermission = useCallback((...permissions) => {
    return permissions.some(permission => userPermissions.includes(permission));
  }, [userPermissions]);

  return {
    ...authState,
    login,
    logout,
    refreshToken,
    checkAuth,
    permissions: userPermissions,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAnyPermission
  };
};

export default useAdvancedAuth;
