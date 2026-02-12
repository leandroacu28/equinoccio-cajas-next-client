const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Error al iniciar sesión");
  }

  return res.json();
}

export interface UserData {
  id: number;
  apellido: string;
  nombre: string;
  email: string;
  username: string;
  dni: string;
  rol: string;
  permissions?: { section: string; access: string }[];
}

export function setToken(token: string) {
  document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24}`;
}

export function setUser(user: UserData) {
  document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${60 * 60 * 24}`;
}

export function getUser(): UserData | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )user=([^;]*)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
  return match ? match[1] : null;
}

export function removeToken() {
  document.cookie = "token=; path=/; max-age=0";
  document.cookie = "user=; path=/; max-age=0";
}
