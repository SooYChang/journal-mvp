import { apiRequest, ensureCsrfCookie, setStoredSessionId } from "./client";
import type { User } from "./types";

type AuthResponse = {
  user: User;
  sessionId?: string | null;
};

export async function registerReader(payload: {
  email: string;
  displayName: string;
  affiliation: string;
  password: string;
}): Promise<User> {
  await ensureCsrfCookie();
  const response = await apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    json: payload,
  });
  setStoredSessionId(response.sessionId);
  return response.user;
}

export async function login(email: string, password: string): Promise<User> {
  await ensureCsrfCookie();
  const response = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    json: { email, password },
  });
  setStoredSessionId(response.sessionId);
  return response.user;
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await apiRequest<AuthResponse>("/api/auth/me");
  if (response.sessionId) {
    setStoredSessionId(response.sessionId);
  }
  return response.user;
}

export async function logout(): Promise<void> {
  try {
    await ensureCsrfCookie();
    await apiRequest<{ status: string }>("/api/auth/logout", { method: "POST" });
  } finally {
    setStoredSessionId(null);
  }
}
