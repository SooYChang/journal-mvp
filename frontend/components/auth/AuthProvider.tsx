"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  registerReader as registerRequest,
} from "@/lib/api/auth";
import { isApiError } from "@/lib/api/errors";
import { canAnnotate as userCanAnnotate, type User } from "@/lib/api/types";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canAnnotate: boolean;
  login: (email: string, password: string) => Promise<User>;
  registerReader: (payload: {
    email: string;
    displayName: string;
    affiliation: string;
    password: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCurrentUser();
      setUser(next);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginRequest(email, password);
    setUser(next);
    return next;
  }, []);

  const registerReader = useCallback(
    async (payload: { email: string; displayName: string; affiliation: string; password: string }) => {
      const next = await registerRequest(payload);
      setUser(next);
      return next;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // If the API rejects logout, still clear the local session so the UI recovers.
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "SOCIETY_ADMIN",
      canAnnotate: userCanAnnotate(user?.role),
      login,
      registerReader,
      logout,
      refresh,
    }),
    [user, isLoading, login, registerReader, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
