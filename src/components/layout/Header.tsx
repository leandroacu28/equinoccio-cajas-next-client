"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserData } from "@/lib/auth";
import { useState, useRef, useEffect, useCallback } from "react";

interface HeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    user: UserData | null;
    onLogout: () => void;
}

const searchNavigation = [
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
        name: "Perfil",
        href: "/perfil",
        id: "perfil",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        )
    },
    {
        name: "Testing",
        href: "/testing",
        id: "testing",
        icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        )
    },
];

export function Header({ sidebarOpen, setSidebarOpen, user, onLogout }: HeaderProps) {
    const router = useRouter();
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);


    // Filter navigation items based on search query and permissions
    const getFilteredNavigation = () => {
        if (searchQuery === "") return [];

        let availableNav = searchNavigation;

        if (user && user.rol !== 'Administrador') {
            availableNav = searchNavigation.filter(item => {
                // Always allow Home and Profile
                if (item.id === 'home' || item.id === 'perfil') return true;

                // Check specific permissions
                const permission = user.permissions?.find(p => p.section === item.id);
                return permission && permission.access !== 'NONE';
            });
        }

        return availableNav.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const filteredNavigation = getFilteredNavigation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearch(false);
            }
        };

        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setProfileOpen(false);
                setShowSearch(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscKey);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscKey);
        };
    }, []);

    const handleNavigate = (href: string) => {
        router.push(href);
        setSearchQuery("");
        setShowSearch(false);
    };

    return (
        <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:gap-x-6 sm:px-6 lg:px-8 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">

            {/* Mobile menu button */}
            <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-200 lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                <span className="sr-only">Open sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 lg:hidden" aria-hidden="true" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center justify-end">

                {/* Breadcrumb / Title */}


                <div className="flex items-center gap-x-4 lg:gap-x-6">

                    {/* Search Navigation */}
                    <div className="relative hidden md:block" ref={searchRef}>
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            name="search"
                            id="search"
                            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6 dark:bg-gray-900 dark:text-white dark:ring-gray-700 dark:focus:ring-emerald-500 transition-all w-64"
                            placeholder="Buscar sección..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSearch(true);
                            }}
                            onFocus={() => setShowSearch(true)}
                        />

                        {/* Search Results Dropdown */}
                        {showSearch && searchQuery && (
                            <div className="absolute right-0 z-50 mt-2 w-full rounded-xl bg-white dark:bg-gray-900 py-2 shadow-xl border border-gray-100 dark:border-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none max-h-96 overflow-y-auto">
                                {filteredNavigation.length > 0 ? (
                                    <div className="px-2">
                                        {filteredNavigation.map((item) => (
                                            <button
                                                key={item.href}
                                                onClick={() => handleNavigate(item.href)}
                                                className="group flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200"
                                            >
                                                <span className="flex-shrink-0 flex items-center justify-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-white dark:group-hover:bg-gray-900 transition-colors shadow-sm">
                                                    {item.icon}
                                                </span>
                                                <span className="flex-1 text-left">{item.name}</span>
                                                <svg className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center flex flex-col items-center">
                                        <svg className="h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <p>No se encontraron resultados</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Notifications (Optional) */}
                    <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors relative">
                        <span className="sr-only">Items</span>
                        <div className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900"></div>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                    </button>

                    {/* Theme Toggle */}
                    <ThemeToggle className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-2 transition-colors" />

                    {/* Separator */}
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-gray-700" aria-hidden="true" />

                    {/* Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            className="-m-1.5 flex items-center p-1.5"
                            id="user-menu-button"
                            aria-expanded="false"
                            aria-haspopup="true"
                            onClick={() => setProfileOpen(!profileOpen)}
                        >
                            <span className="sr-only">Open user menu</span>
                            <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white ring-2 ring-white dark:ring-gray-800 shadow-md">
                                <span className="font-medium text-sm">
                                    {user?.nombre?.[0]?.toUpperCase()}{user?.apellido?.[0]?.toUpperCase()}
                                </span>
                            </div>
                            <span className="hidden lg:flex lg:items-center">
                                <span className="ml-4 text-sm font-semibold leading-6 text-gray-900 dark:text-gray-200" aria-hidden="true">
                                    {user ? `${user.nombre} ${user.apellido}` : 'Usuario'}
                                </span>
                                <svg className={`ml-2 h-5 w-5 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </button>

                        {/* Dropdown menu */}
                        {profileOpen && (
                            <div
                                className="absolute right-0 z-40 mt-2 w-60 rounded-xl bg-white dark:bg-gray-900 py-2 shadow-xl border border-gray-100 dark:border-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none"
                                role="menu"
                                aria-orientation="vertical"
                                aria-labelledby="user-menu-button"
                                tabIndex={-1}
                            >
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 mb-1">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.nombre} {user?.apellido}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email}</p>
                                    <div className="mt-2">
                                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400">
                                            {user?.rol}
                                        </span>
                                    </div>
                                </div>

                                <div className="px-1 py-1">
                                    <Link
                                        href="/perfil"
                                        onClick={() => setProfileOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg transition-colors group"
                                        role="menuitem"
                                        tabIndex={-1}
                                    >
                                        <div className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-900 transition-colors">
                                            <svg className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        Tu Perfil
                                    </Link>

                                    <button
                                        onClick={onLogout}
                                        className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 rounded-lg transition-colors group mt-1"
                                        role="menuitem"
                                        tabIndex={-1}
                                    >
                                        <div className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-900 transition-colors">
                                            <svg className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                        </div>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
