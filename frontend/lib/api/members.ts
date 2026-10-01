import { apiRequest } from "./client";
import type { Member, PageResponse, UserRole, AccountStatus } from "./types";

export async function listMembers(params: {
  query?: string;
  status?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<Member>> {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (params.status) search.set("status", params.status);
  search.set("page", String(params.page ?? 0));
  search.set("size", String(params.size ?? 20));
  return apiRequest<PageResponse<Member>>(`/api/admin/members?${search}`);
}

export async function createMember(payload: {
  email: string;
  displayName: string;
  temporaryPassword: string;
  role: UserRole;
}): Promise<Member> {
  return apiRequest<Member>("/api/admin/members", { method: "POST", json: payload });
}

export async function getMember(userId: number): Promise<Member> {
  return apiRequest<Member>(`/api/admin/members/${userId}`);
}

export async function updateMember(
  userId: number,
  payload: { displayName: string; role: UserRole; status: AccountStatus },
): Promise<Member> {
  return apiRequest<Member>(`/api/admin/members/${userId}`, { method: "PATCH", json: payload });
}

export async function deleteMember(userId: number): Promise<void> {
  await apiRequest<{ status: string }>(`/api/admin/members/${userId}`, { method: "DELETE" });
}
