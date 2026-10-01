import { apiRequest, ensureCsrfCookie } from "./client";
import type { User } from "./types";

export async function login(email: string, password: string): Promise<User> {
  await ensureCsrfCookie();
  const response = await apiRequest<{ user: User }>("/api/auth/login", {
    method: "POST",
    json: { email, password },
  });
  return response.user;
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await apiRequest<{ user: User }>("/api/auth/me");
  return response.user;
}

export async function logout(): Promise<void> {
  await ensureCsrfCookie();
  await apiRequest<{ status: string }>("/api/auth/logout", { method: "POST" });
}
