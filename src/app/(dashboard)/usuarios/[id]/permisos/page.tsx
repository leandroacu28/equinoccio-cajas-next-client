"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";

const PERMISSION_GROUPS = [
    {
        name: "Ventas",
        items: [
            { id: "ventas-listado", name: "Listado de Ventas" },
            { id: "clientes", name: "Clientes" },
            { id: "productos", name: "Productos" },
        ]
    },
    {
        name: "Tesorería",
        items: [
            { id: "cajas", name: "Cajas" },
            { id: "ingresos", name: "Ingresos" },
            { id: "gastos", name: "Gastos" },
            { id: "movimientos-internos", name: "Movimientos Internos" },
        ]
    },
    {
        name: "Estadísticas",
        items: [
            { id: "estadisticas", name: "Estadísticas" },
        ]
    },
    {
        name: "Configuraciones",
        items: [
            { id: "usuarios", name: "Usuarios" },
            { id: "unidades-medidas", name: "Unidades de Medida" },
            { id: "tipos-gasto", name: "Tipos de Gastos" },
            { id: "tipos-ingreso", name: "Tipos de Ingresos" },
            { id: "familias-productos", name: "Familias de Productos" },
        ]
    }
];

const ALL_SECTIONS = PERMISSION_GROUPS.flatMap(g => g.items);

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
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupName) ? prev.filter(n => n !== groupName) : [...prev, groupName]
        );
    };

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
                const mergedPermissions = ALL_SECTIONS.map(section => {
                    const existing = data.find((p: any) => p.section === section.id);
                    return {
                        section: section.id,
                        name: section.name,
                        access: existing ? existing.access : "NONE"
                    };
                });
                setPermissions(mergedPermissions);
            } else {
                setPermissions(ALL_SECTIONS.map(s => ({ section: s.id, name: s.name, access: "NONE" })));
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
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Gestión de Permisos</h1>
                    {user && (
                        <p className="text-sm text-gray-500 mt-1">
                            Usuario: <span className="font-semibold text-gray-900 dark:text-gray-300">{user.apellido}, {user.nombre}</span>
                        </p>
                    )}
                </div>
                <button
                    onClick={() => router.push("/usuarios")}
                    className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                    {PERMISSION_GROUPS.map((group) => (
                        <div key={group.name} className="flex flex-col">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(group.name)}
                                className="w-full text-left flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30 px-6 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                            >
                                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    {group.name}
                                </h3>
                                <svg
                                    className={`h-4 w-4 text-gray-500 transition-transform ${expandedGroups.includes(group.name) ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {/* Group Items */}
                            {expandedGroups.includes(group.name) && (
                                <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                    {group.items.map((item) => {
                                        const perm = permissions.find(p => p.section === item.id) || { section: item.id, name: item.name, access: "NONE" };
                                        
                                        return (
                                            <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/30 dark:hover:bg-gray-800/20 transition-colors">
                                                <div className="pl-4 border-l-2 border-emerald-500/20 dark:border-emerald-500/10">
                                                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</h4>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={perm.access}
                                                        onChange={(e) => handleAccessChange(item.id, e.target.value)}
                                                        className={`w-full sm:w-auto px-4 py-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 shadow-sm appearance-none cursor-pointer outline-none transition-all
                                                            ${perm.access === "FULL_ACCESS" 
                                                                ? "bg-emerald-50/80 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700/50 dark:text-emerald-300" 
                                                                : perm.access === "READ_ONLY"
                                                                ? "bg-blue-50/80 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300"
                                                                : "bg-gray-50 border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                                            }`}
                                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                                                    >
                                                        {ACCESS_LEVELS.map((level) => (
                                                            <option key={level.value} value={level.value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                                                {level.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => router.push("/usuarios")}
                        className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
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
