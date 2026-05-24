import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://receipts-platform-revanth-sai-reddy-venumbaka-s-projects.vercel.app";

async function getToken() {
  return SecureStore.getItemAsync("auth_token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData — let fetch set the boundary
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json();
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync("auth_token", token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync("auth_token");
}

// Convenience wrappers
export async function apiGet<T = any>(path: string): Promise<T> {
  return api<T>(path, { method: "GET" });
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  return api<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  return api<T>(path, { method: "DELETE" });
}

export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  return api<T>(path, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}
