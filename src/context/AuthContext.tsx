import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/expo';

import { api, setAuthTokenProvider } from '@/lib/api';
import type { AppUser } from '@/lib/types';

type AuthContextValue = {
  token: string | null;
  user: AppUser | null;
  loading: boolean;
  isSignedIn: boolean;
  needsIdCardNumber: boolean;
  authError: string | null;
  refreshSession: () => Promise<void>;
  completeIdCardNumber: (idCardNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

type AuthSessionResponse = {
  needsIdCardNumber?: boolean;
  user?: AppUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsIdCardNumber, setNeedsIdCardNumber] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const normalizeUser = useCallback((data: AppUser): AppUser => ({
    ...data,
    id: data.id || data._id || '',
  }), []);

  const refreshSession = useCallback(async () => {
    if (!isSignedIn) {
      setToken(null);
      setUser(null);
      setNeedsIdCardNumber(false);
      setAuthError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setToken(null);
    setUser(null);
    setNeedsIdCardNumber(false);
    setAuthError(null);
    try {
      const accessToken = await getToken();
      if (!accessToken) {
        throw new Error('Clerk did not provide a session token.');
      }
      setToken(accessToken);
      const result = await api.post<AuthSessionResponse>(
        '/auth/session',
        {},
        accessToken,
      );
      if (result.needsIdCardNumber) {
        setUser(null);
        setNeedsIdCardNumber(true);
        return;
      }
      if (!result.user) {
        throw new Error('The server did not return an account profile.');
      }
      setUser(normalizeUser(result.user));
      setNeedsIdCardNumber(false);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to load your account.',
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn, normalizeUser]);

  useEffect(() => {
    setAuthTokenProvider(getToken);
    return () => setAuthTokenProvider(null);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    void refreshSession();
  }, [isLoaded, isSignedIn, refreshSession]);

  const completeIdCardNumber = useCallback(async (idCardNumber: string) => {
    const accessToken = await getToken();
    if (!accessToken) {
      throw new Error('Your Clerk session has expired. Sign in again.');
    }
    const result = await api.post<{ user: AppUser }>(
      '/auth/complete-profile',
      { idCardNumber },
      accessToken,
    );
    setToken(accessToken);
    setUser(normalizeUser(result.user));
    setNeedsIdCardNumber(false);
    setAuthError(null);
  }, [getToken, normalizeUser]);

  const refreshUser = useCallback(async () => {
    const accessToken = await getToken();
    if (!accessToken) return;
    const currentUser = await api.get<AppUser>('/auth/me', accessToken);
    setToken(accessToken);
    setUser(normalizeUser(currentUser));
  }, [getToken, normalizeUser]);

  const logout = useCallback(async () => {
    await signOut();
    setToken(null);
    setUser(null);
    setNeedsIdCardNumber(false);
    setAuthError(null);
  }, [signOut]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading: !isLoaded || loading,
      isSignedIn: Boolean(isSignedIn),
      needsIdCardNumber,
      authError,
      refreshSession,
      completeIdCardNumber,
      logout,
      refreshUser,
    }),
    [
      token,
      user,
      isLoaded,
      loading,
      isSignedIn,
      needsIdCardNumber,
      authError,
      refreshSession,
      completeIdCardNumber,
      logout,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
