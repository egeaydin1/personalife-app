// Token is stored in either localStorage (persistent) or sessionStorage (browser-session-only)
// API client reads from localStorage first, falling back to sessionStorage.

export function setToken(token: string, persistent: boolean = true) {
  if (persistent) {
    localStorage.setItem("token", token);
    sessionStorage.removeItem("token");
  } else {
    sessionStorage.setItem("token", token);
    localStorage.removeItem("token");
  }
}

export function getToken(): string | null {
  return localStorage.getItem("token") ?? sessionStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
