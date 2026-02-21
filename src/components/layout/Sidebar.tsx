"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { UserData } from "@/lib/auth";

type NavigationItem = {
    name: string;
    href?: string;
    icon: React.ReactNode;
    id?: string; // Added ID for permission mapping
    children?: {
        name: string;
        href: string;
        icon?: React.ReactNode;
        id?: string; // Added ID for permission mapping
    }[];
};

const navigation: NavigationItem[] = [
    {
        name: "Inicio",
        href: "/home",
        id: "home",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )
    },

    {
        name: "Ventas",
        id: "ventas",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
        children: [
            {
                name: "Listado de Ventas",
                href: "/ventas",
                id: "ventas-listado",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                )
            },
            {
                name: "Clientes",
                href: "/clientes",
                id: "clientes",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                )
            },
            {
                name: "Productos",
                href: "/productos",
                id: "productos",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                )
            },
        ]
    },

    {
        name: "Tesorería",
        id: "tesoreria",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
        ),
        children: [
            {
                name: "Cajas",
                href: "/cajas",
                id: "cajas",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                )
            },
            {
                name: "Ingresos",
                href: "/ingresos",
                id: "ingresos",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            },
            {
                name: "Gastos",
                href: "/gastos",
                id: "gastos",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            },
            {
                name: "Movimientos Internos",
                href: "/movimientos-internos",
                id: "movimientos-internos",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                )
            },
        ]
    },
    {
        name: "Estadísticas",
        href: "/estadisticas",
        id: "estadisticas",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        name: "Configuraciones",
        id: "configuraciones",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        children: [
            {
                name: "Usuarios",
                href: "/usuarios",
                id: "usuarios",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                )
            },
            {
                name: "Unidades de medida",
                href: "/unidades-medidas",
                id: "unidades-medidas",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                )
            },
            {
                name: "Tipos de gastos",
                href: "/tipos-gasto",
                id: "tipos-gasto",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            },
            {
                name: "Tipos de ingresos",
                href: "/tipos-ingreso",
                id: "tipos-ingreso",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            },
            {
                name: "Familias de productos",
                href: "/familias-productos",
                id: "familias-productos",
                icon: (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                )
            },
        ]
    },
];

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    user: UserData | null;
}

export function Sidebar({ sidebarOpen, setSidebarOpen, user }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);

    const filteredNavigation = useMemo(() => {
        if (!user) return [];
        if (user.rol === 'Administrador') return navigation;

        const checkAccess = (id?: string) => {
            if (!id || id === 'home') return true; // Always allow home or items without specific ID (if any)
            const perm = user.permissions?.find(p => p.section === id);
            return perm && perm.access !== 'NONE';
        };

        return navigation.reduce<NavigationItem[]>((acc, item) => {
            // Filter children first
            let children = item.children;
            if (children) {
                children = children.filter(child => checkAccess(child.id));
            }

            // Decide if we populate this item
            // 1. If it has children, and any child remains, we keep it (unless the parent itself is restricted?)
            //    Let's assume parent 'Configuraciones' should be shown if 'Usuarios' is accessible.
            // 2. If it has no children (or all filtered out), checking its own ID.

            let shouldShow = false;

            if (children && children.length > 0) {
                shouldShow = true;
            } else if (checkAccess(item.id)) {
                // If it's a standalone link with access
                // If it was a group that lost all children (and no href), we might want to hide it
                if (item.children && (!children || children.length === 0) && !item.href) {
                    shouldShow = false;
                } else {
                    shouldShow = true;
                }
            }

            if (shouldShow) {
                acc.push({ ...item, children });
            }
            return acc;
        }, []);

    }, [user]);

    // Expand submenu if current path is inside it
    useEffect(() => {
        filteredNavigation.forEach(item => {
            if (item.children) {
                const hasActiveChild = item.children.some(child => pathname === child.href);
                if (hasActiveChild && !openSubmenus.includes(item.name)) {
                    setOpenSubmenus(prev => [...prev, item.name]);
                }
            }
        });
    }, [pathname, filteredNavigation]);

    const toggleSubmenu = (name: string) => {
        if (collapsed) {
            setCollapsed(false);
            setOpenSubmenus([name]);
        } else {
            setOpenSubmenus(prev =>
                prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
            );
        }
    };

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar component */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 transform transition-all duration-300 ease-in-out lg:static lg:translate-x-0 
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                    ${collapsed ? "w-20" : "w-64"}
                    flex flex-col
                    bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-lg lg:shadow-none
                `}
            >
                {/* Logo area */}
                <div className={`flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-800 transition-all duration-300 ${collapsed ? "px-2" : "px-6"}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0 flex items-center justify-center">
                            <Image src="/equinoccio.webp" alt="Equinoccio Logo" width={32} height={32} />
                        </div>
                        <span className={`text-lg font-bold text-gray-900 dark:text-white tracking-tight whitespace-nowrap transition-opacity duration-300 ${collapsed ? "opacity-0 w-0" : "opacity-100"}`}>
                            Equinoccio-Cajas
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto">
                    {filteredNavigation.map((item) => {
                        const isChildActive = item.children?.some(child => pathname === child.href);
                        const isActive = pathname === item.href || isChildActive;
                        const isOpen = openSubmenus.includes(item.name);

                        if (item.children) {
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button
                                        onClick={() => toggleSubmenu(item.name)}
                                        className={`group flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                                            ${isActive
                                                ? "bg-gray-50 dark:bg-gray-800/50 text-emerald-600 dark:text-emerald-400"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                                            }
                                        `}
                                        title={collapsed ? item.name : undefined}
                                    >
                                        <div className={`flex items-center ${collapsed ? "justify-center w-full" : ""}`}>
                                            <span className={`flex-shrink-0 transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"}`}>
                                                {item.icon}
                                            </span>
                                            <span className={`ml-3 transition-opacity duration-300 ${collapsed ? "opacity-0 w-0 hidden" : "opacity-100"}`}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <svg
                                            className={`h-4 w-4 transform transition-transform duration-200 ${isOpen ? "rotate-90" : ""} ${collapsed ? "hidden" : "block"} ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>

                                    {/* Submenu */}
                                    {isOpen && !collapsed && (
                                        <div className="space-y-1 pl-4 animate-fade-in-down">
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={() => setSidebarOpen(false)}
                                                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                                                        ${pathname === child.href
                                                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                                                        }
                                                    `}
                                                >
                                                    {child.icon && (
                                                        <span className={`mr-3 flex-shrink-0 h-4 w-4 ${pathname === child.href ? "text-emerald-600" : "text-gray-400"}`}>
                                                            {child.icon}
                                                        </span>
                                                    )}
                                                    {child.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Regular item
                        return (
                            <Link
                                key={item.href || item.name}
                                href={item.href || "#"}
                                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                                    ${isActive
                                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                                    }
                                    ${collapsed ? "justify-center" : ""}
                                `}
                                onClick={() => setSidebarOpen(false)}
                                title={collapsed ? item.name : undefined}
                            >
                                <span className={`flex-shrink-0 transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"}`}>
                                    {item.icon}
                                </span>
                                <span className={`ml-3 transition-all duration-300 ${collapsed ? "opacity-0 w-0 hidden" : "opacity-100"}`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Floating Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 z-50 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                    {collapsed ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    )}
                </button>

                {/* Footer / Info */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">

                    <div className={`mt-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 transition-opacity duration-300 ${collapsed ? "hidden" : "block"}`}>
                        <p className="text-xs text-gray-500 text-center">v1.2.0 &copy; 2026</p>
                    </div>
                </div>
            </aside>
        </>
    );
}
