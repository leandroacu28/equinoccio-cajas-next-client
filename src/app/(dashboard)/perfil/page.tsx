"use client";

import { useState, useEffect, useCallback } from "react";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ProfileData {
  id: number;
  apellido: string;
  nombre: string;
  email: string;
  username: string;
  dni: string;
  rol: string;
  activo: boolean;
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (!res.ok) throw new Error("Error al cargar perfil");
      setProfile(await res.json());
    } catch {
      setError("Error al cargar los datos del perfil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Las contraseñas nuevas no coinciden");
      return;
    }
    if (pwForm.newPassword.length < 4) {
      setPwError("La nueva contraseña debe tener al menos 4 caracteres");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al cambiar contraseña");
      }

      showSuccess("Contraseña actualizada", "Contraseña actualizada correctamente");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      showError("Error al cambiar contraseña", err.message);
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex justify-center p-12">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error || "No se pudieron cargar los datos"}
        </div>
      </div>
    );
  }

  const fields = [
    {
      label: "Apellido",
      value: profile.apellido,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      ),
    },
    {
      label: "Nombre",
      value: profile.nombre,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      ),
    },
    {
      label: "Email",
      value: profile.email,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      ),
    },
    {
      label: "Usuario",
      value: `@${profile.username}`,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      ),
    },
    {
      label: "DNI",
      value: profile.dni,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
      ),
    },
    {
      label: "Rol",
      value: profile.rol,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      ),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Card principal */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Banner superior */}
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-emerald-700 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="h-24 w-24 rounded-full bg-emerald-600 flex items-center justify-center text-white ring-4 ring-white dark:ring-gray-900 shadow-lg">
              <span className="font-bold text-2xl">
                {profile.nombre[0]?.toUpperCase()}{profile.apellido[0]?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Info del usuario */}
        <div className="pt-16 px-6 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.apellido}, {profile.nombre}
            </h2>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${profile.rol === "Administrador"
                ? "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-400/30"
                : "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/30"
              }`}>
              {profile.rol}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{profile.username}</p>
        </div>
      </div>

      {/* Datos detallados */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Datos Personales</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {fields.map((field) => (
            <div key={field.label} className="flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-3 w-40 flex-shrink-0">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {field.icon}
                </svg>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{field.label}</span>
              </div>
              <span className="text-sm text-gray-900 dark:text-white">{field.value}</span>
            </div>
          ))}
          <div className="flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-3 w-40 flex-shrink-0">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</span>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${profile.activo
                ? "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-400/30"
                : "bg-gray-100 text-gray-600 ring-gray-600/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-400/30"
              }`}>
              {profile.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
      </div>

      {/* Cambiar Contraseña */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cambiar Contraseña</h3>
        </div>
        <div className="px-6 py-6">
          {pwError && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2">
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {pwError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Contraseña actual
              </label>
              <input
                type="password"
                required
                placeholder="Ingresá tu contraseña actual"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 transition-all"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                minLength={4}
                placeholder="Mínimo 4 caracteres"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 transition-all"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                required
                minLength={4}
                placeholder="Repetí la nueva contraseña"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 transition-all"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={pwSaving}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
              >
                {pwSaving ? "Guardando..." : "Cambiar Contraseña"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
