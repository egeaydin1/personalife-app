import { getToken } from "./auth";

const BASE = "/api/v1";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────
export const auth = {
  register: (data: { email: string; password: string; name?: string; rememberMe?: boolean }) =>
    request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => request<any>("/auth/me"),
  updateMe: (data: any) =>
    request<any>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
  completeOnboarding: (data: any) =>
    request<any>("/auth/onboarding", { method: "POST", body: JSON.stringify(data) }),
};

// ── Integrations ──────────────────────────────────────────────
export const integrations = {
  list: () => request<{ integrations: any[]; icalToken: string }>("/integrations"),
  regenerateIcal: () => request<{ icalToken: string }>("/integrations/ical/regenerate", { method: "POST" }),
  startTelegram: () => request<any>("/integrations/telegram/start", { method: "POST" }),
  startGoogle: () => request<any>("/integrations/google/start", { method: "POST" }),
  remove: (id: string) => request<void>(`/integrations/${id}`, { method: "DELETE" }),
};

// ── Tasks ─────────────────────────────────────────────────────
export const tasks = {
  list: (params?: { status?: string; courseId?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return request<any[]>(`/tasks${qs}`);
  },
  create: (data: any) => request<any>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
  addProgress: (id: string, data: { progress: number; note?: string }) =>
    request<any>(`/tasks/${id}/progress`, { method: "POST", body: JSON.stringify(data) }),
};

// ── Check-ins ─────────────────────────────────────────────────
export const checkins = {
  today: () => request<any>("/checkins/today"),
  list: (params?: { limit?: number; offset?: number }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return request<any[]>(`/checkins${qs}`);
  },
  sendMessage: (message: string) =>
    request<{ response: string; checkinId: string }>("/checkins/message", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  update: (id: string, data: any) =>
    request<any>(`/checkins/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ── Courses / Calendar ────────────────────────────────────────
export const courses = {
  list: () => request<any[]>("/courses"),
  create: (data: any) => request<any>("/courses", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/courses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/courses/${id}`, { method: "DELETE" }),
};

export const calendar = {
  list: (params?: { from?: string; to?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return request<any[]>(`/calendar${qs}`);
  },
  create: (data: any) => request<any>("/calendar", { method: "POST", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/calendar/${id}`, { method: "DELETE" }),
};

// ── Friends ───────────────────────────────────────────────────
export const friends = {
  list: () => request<any[]>("/friends"),
  create: (data: any) => request<any>("/friends", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/friends/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/friends/${id}`, { method: "DELETE" }),
  memories: (id: string) => request<any[]>(`/friends/${id}/memories`),
  addMemory: (id: string, data: any) =>
    request<any>(`/friends/${id}/memories`, { method: "POST", body: JSON.stringify(data) }),
  removeMemory: (friendId: string, memId: string) =>
    request<void>(`/friends/${friendId}/memories/${memId}`, { method: "DELETE" }),
};

// ── Screen Time ───────────────────────────────────────────────
export const screenTime = {
  list: (params?: { from?: string; to?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return request<any[]>(`/screen-time${qs}`);
  },
  upload: (file: File, date: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("date", date);
    const token = getToken();
    return fetch(`${BASE}/screen-time/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then((r) => r.json());
  },
  get: (id: string) => request<any>(`/screen-time/${id}`),
  remove: (id: string) => request<void>(`/screen-time/${id}`, { method: "DELETE" }),
};

// ── Agent ─────────────────────────────────────────────────────
export const agent = {
  chat: (message: string, context?: string) =>
    request<{ response: string }>("/agent/chat", {
      method: "POST",
      body: JSON.stringify({ message, context }),
    }),
  memory: () => request<{ content: string }>("/agent/memory"),
  refreshMemory: () => request<{ content: string }>("/agent/memory/refresh", { method: "POST" }),
};

// ── Reports ───────────────────────────────────────────────────
export const reports = {
  daily: (date?: string) => {
    const qs = date ? `?date=${date}` : "";
    return request<any>(`/reports/daily${qs}`);
  },
  weekly: (date?: string) => {
    const qs = date ? `?date=${date}` : "";
    return request<any>(`/reports/weekly${qs}`);
  },
  monthly: (month?: string) => {
    const qs = month ? `?month=${month}` : "";
    return request<any>(`/reports/monthly${qs}`);
  },
};
