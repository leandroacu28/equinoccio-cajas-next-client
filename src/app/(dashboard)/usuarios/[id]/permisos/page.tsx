"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";

// Define sections and access levels
const SECTIONS = [
    { id: "usuarios", name: "Gestión de Usuarios" },
    { id: "testing", name: "Testing" },
    // Add more sections here
];

const ACCESS_LEVELS = [
    { value: "NONE", label: "Sin permisos" },
    { value: "READ_ONLY", label: "Solo lectura" },
    { value: "FULL_ACCESS", label: "Permiso total" },
];

export default function PermissionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const userId = parseInt(id);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);

    const fetchPermissions = useCallback(async () => {
        try {
            const token = getToken();

            // Fetch user details first
            const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (userRes.ok) {
                const users = await userRes.json();
                const foundUser = users.find((u: any) => u.id === userId);
                if (foundUser) setUser(foundUser);
            }

            // Fetch permissions
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/permissions`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                // Merge with existing sections to ensure all are shown
                const mergedPermissions = SECTIONS.map(section => {
                    const existing = data.find((p: any) => p.section === section.id);
                    return {
                        section: section.id,
                        name: section.name,
                        access: existing ? existing.access : "NONE"
                    };
                });
                setPermissions(mergedPermissions);
            } else {
                // If no permissions found or error, just reset to default
                setPermissions(SECTIONS.map(s => ({ section: s.id, name: s.name, access: "NONE" })));
            }
        } catch (err) {
            console.error(err);
            showError("Error", "No se pudieron cargar los permisos");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    const handleAccessChange = (sectionId: string, newAccess: string) => {
        setPermissions(prev => prev.map(p =>
            p.section === sectionId ? { ...p, access: newAccess } : p
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = getToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/permissions`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ permissions }),
            });

            if (!res.ok) throw new Error("Error al guardar");

            showSuccess("Éxito", "Permisos actualizados correctamente");
            router.push("/usuarios");
        } catch (err) {
            showError("Error", "No se pudieron guardar los cambios");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Permisos</h1>
                    {user && (
                        <p className="text-gray-500 mt-1">
                            Usuario: <span className="font-semibold text-gray-900 dark:text-gray-300">{user.apellido}, {user.nombre}</span>
                        </p>
                    )}
                </div>
                <button
                    onClick={() => router.push("/usuarios")}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transaction-colors"
                >
                    Volver
                </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Control de Acceso por Sección</h2>
                    <p className="text-sm text-gray-500 mt-1">Configura el nivel de acceso para cada módulo del sistema.</p>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {permissions.map((perm) => (
                        <div key={perm.section} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">{perm.name}</h3>

                            </div>

                            <div className="flex flex-wrap gap-2">
                                {ACCESS_LEVELS.map((level) => (
                                    <button
                                        key={level.value}
                                        onClick={() => handleAccessChange(perm.section, level.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${perm.access === level.value
                                            ? level.value === "FULL_ACCESS"
                                                ? "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400"
                                                : level.value === "READ_ONLY"
                                                    ? "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400"
                                                    : "bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                            : "bg-transparent border-transparent text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            }`}
                                    >
                                        {level.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <button
                        onClick={() => router.push("/usuarios")}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}
