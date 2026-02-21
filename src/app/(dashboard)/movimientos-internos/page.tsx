"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { getToken, getUser } from "@/lib/auth";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Movimiento {
  id: number;
  fecha: string;
  monto: number;
  observaciones: string;
  activo: boolean;
  cajaOrigen: {
    id: number;
    descripcion: string;
  };
  cajaDestino: {
    id: number;
    descripcion: string;
  };
}

export default function MovimientosInternosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [origenFilter, setOrigenFilter] = useState("");
  const [destinoFilter, setDestinoFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const [cajas, setCajas] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState<any>(null);

  // Dropdown state (row actions)
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  // Range dropdown
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);
  const rangeDropdownRef = useRef<HTMLDivElement>(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  const sortedMovimientos = [...movimientos].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    // Handle specific types if needed
    let aValue: any = a[key as keyof Movimiento];
    let bValue: any = b[key as keyof Movimiento];
    
    if (key === 'fecha') {
        aValue = new Date(a.fecha).getTime();
        bValue = new Date(b.fecha).getTime();
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const fetchMetadata = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const res = await fetch(`${API_URL}/cajas`, { headers });
      if (res.ok) setCajas(await res.json());
    } catch (err) {
      console.error("Error fetching metadata", err);
    }
  }, []);

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
    setRangeDropdownOpen(false);
  };

  const handleLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    setDateTo(end.toISOString().split('T')[0]);
    setDateFrom(start.toISOString().split('T')[0]);
    setRangeDropdownOpen(false);
  };

  const handleLast30Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    setDateTo(end.toISOString().split('T')[0]);
    setDateFrom(start.toISOString().split('T')[0]);
    setRangeDropdownOpen(false);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
    setRangeDropdownOpen(false);
  };

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    setRangeDropdownOpen(false);
  };

  const fetchMovimientos = useCallback(async () => {
    try {
      setLoading(true);
      
      let url = `${API_URL}/movimientos-internos?page=${currentPage}&limit=${pageSize}&search=${searchTerm}`;
      if (statusFilter !== "Todos") {
        url += `&activo=${statusFilter === "Activo"}`;
      }
      if (origenFilter) url += `&cajaOrigenId=${origenFilter}`;
      if (destinoFilter) url += `&cajaDestinoId=${destinoFilter}`;
      if (dateFrom) url += `&from=${dateFrom}`;
      if (dateTo) url += `&to=${dateTo}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (!res.ok) throw new Error("Error al cargar movimientos");
      const data = await res.json();
      setMovimientos(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      showError("Error", "No se pudieron cargar los movimientos");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, origenFilter, destinoFilter, dateFrom, dateTo]);

  useEffect(() => {
    setUser(getUser());
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, origenFilter, destinoFilter, dateFrom, dateTo]);

  // Close range dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(e.target as Node)) {
        setRangeDropdownOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setRangeDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Close row dropdown when clicking outside or pressing Esc
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isOutsideDesktop = !dropdownRef.current || !dropdownRef.current.contains(event.target as Node);
      const isOutsideMobile = !mobileDropdownRef.current || !mobileDropdownRef.current.contains(event.target as Node);

      if (openDropdownId !== null && isOutsideDesktop && isOutsideMobile) {
        setOpenDropdownId(null);
      }
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenDropdownId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [openDropdownId]);

  const handleDeactivate = async (id: number) => {
    const confirmed = await showConfirm({
      title: "¿Estás seguro?",
      text: "Esta acción dará de baja el movimiento.",
      confirmButtonText: "Sí, dar de baja",
      confirmButtonColor: "#ef4444",
    });

    if (confirmed) {
      try {
        const res = await fetch(`${API_URL}/movimientos-internos/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          showSuccess("Éxito", "Movimiento dado de baja");
          fetchMovimientos();
        } else {
          throw new Error();
        }
      } catch {
        showError("Error", "No se pudo dar de baja el movimiento");
      }
    }
  };

  const handleActivate = async (id: number) => {
    const confirmed = await showConfirm({
      title: "¿Dar de alta?",
      text: "Esta acción habilitará nuevamente el movimiento.",
      confirmButtonText: "Sí, dar de alta",
      confirmButtonColor: "#059669",
    });

    if (confirmed) {
      try {
        const res = await fetch(`${API_URL}/movimientos-internos/${id}/activar`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          showSuccess("Éxito", "Movimiento habilitado");
          fetchMovimientos();
        } else {
          throw new Error();
        }
      } catch {
        showError("Error", "No se pudo habilitar el movimiento");
      }
    }
  };

  const exportToExcel = () => {
    const dataToExport = movimientos.map((m) => ({
      ID: m.id,
      Fecha: new Date(m.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" }),
      "Caja Origen": m.cajaOrigen.descripcion,
      "Caja Destino": m.cajaDestino.descripcion,
      Monto: Number(m.monto),
      Estado: m.activo ? "Habilitado" : "Deshabilitado",
      Observaciones: m.observaciones || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, "movimientos_internos.xlsx");
  };

  const lastPage = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight text-left">Movimientos Internos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-left">Total de movimientos: {total}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
          >
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar
          </button>
          <Link
            href="/movimientos-internos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Movimiento
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 relative">
            <input
              type="text"
              placeholder="Buscar por observación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <select
            value={origenFilter}
            onChange={(e) => setOrigenFilter(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="">Caja Origen...</option>
            {cajas.map(c => (
              <option key={c.id} value={c.id}>{c.descripcion}</option>
            ))}
          </select>

          <select
            value={destinoFilter}
            onChange={(e) => setDestinoFilter(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="">Caja Destino...</option>
            {cajas.map(c => (
              <option key={c.id} value={c.id}>{c.descripcion}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Habilitados</option>
            <option value="Inactivo">Deshabilitados</option>
          </select>
        </div>

        {/* Date Range Dropdown Row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative" ref={rangeDropdownRef}>
            <button
              onClick={() => setRangeDropdownOpen(prev => !prev)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                (dateFrom || dateTo)
                  ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-600'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Seleccionar rango
              {(dateFrom || dateTo) && (
                <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-blue-500" />
              )}
              <svg className={`h-4 w-4 transition-transform ${rangeDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {rangeDropdownOpen && (
              <div className="absolute left-0 z-50 mt-2 w-80 origin-top-left rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                {/* Date pickers — primero */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-700 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rango personalizado</p>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 transition-all"
                    />
                    <span className="absolute -top-2 left-2 bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-500">Desde</span>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 transition-all"
                    />
                    <span className="absolute -top-2 left-2 bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-500">Hasta</span>
                  </div>
                </div>
                {/* Quick buttons — debajo */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceso rápido</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleToday} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all">Hoy</button>
                    <button onClick={handleLast7Days} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all">7 días</button>
                    <button onClick={handleLast30Days} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all">30 días</button>
                    <button onClick={handleThisMonth} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all">Este Mes</button>
                  </div>
                </div>
                <div className="flex items-center justify-end px-3 py-2.5">
                  <button onClick={() => setRangeDropdownOpen(false)} className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-bold text-white transition-colors">Aplicar</button>
                </div>
              </div>
            )}
          </div>

          {(dateFrom || dateTo) && (
            <button
              onClick={clearDateRange}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Quitar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        
        {/* Mobile Cards */}
        <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-3">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4"></div>
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4"></div>
              </div>
            ))
          ) : movimientos.length === 0 ? (
            <div className="p-8 text-center text-gray-500 italic text-sm">No se encontraron movimientos</div>
          ) : (
            movimientos.map((m) => (
              <div key={m.id} className="p-4 space-y-3 relative group text-left">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">#{m.id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                        m.activo 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                      }`}>
                        {m.activo ? "Habilitado" : "Baja"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-white">
                      <span>{m.cajaOrigen.descripcion}</span>
                      <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span>{m.cajaDestino.descripcion}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === m.id ? null : m.id)}
                      className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    {openDropdownId === m.id && (
                      <div ref={mobileDropdownRef} className="absolute right-0 top-full z-[100] mt-1 w-48 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                        <div className="py-1">
                          <Link href={`/movimientos-internos/${m.id}/editar`} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200">
                            Editar
                          </Link>
                          {m.activo ? (
                            <button onClick={() => { setOpenDropdownId(null); handleDeactivate(m.id); }} className="flex w-full items-center px-4 py-2.5 text-sm text-red-600">
                              Dar de baja
                            </button>
                          ) : (
                            <button onClick={() => { setOpenDropdownId(null); handleActivate(m.id); }} className="flex w-full items-center px-4 py-2.5 text-sm text-emerald-600">
                              Dar de alta
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="text-right col-span-2">
                    <p className="font-bold text-gray-900 dark:text-white text-base">
                      ${Number(m.monto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-50 dark:border-gray-800/50 flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-tighter">
                  <span>{new Date(m.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" })}</span>
                  <span className="truncate max-w-[150px] italic">{m.observaciones || "Sin observaciones"}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={() => {
                    const direction = sortConfig?.key === 'id' && sortConfig.direction === 'desc' ? 'asc' : 'desc';
                    setSortConfig({ key: 'id', direction });
                  }}
                >
                  <div className="flex items-center gap-1">
                    Nº Mov.
                    {sortConfig?.key === 'id' && (
                      <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={() => {
                    const direction = sortConfig?.key === 'fecha' && sortConfig.direction === 'desc' ? 'asc' : 'desc';
                    setSortConfig({ key: 'fecha', direction });
                  }}
                >
                  <div className="flex items-center gap-1">
                    Fecha
                    {sortConfig?.key === 'fecha' && (
                      <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Caja Origen</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Caja Destino</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observaciones</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-left">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-4"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full"></div></td>
                  </tr>
                ))
              ) : sortedMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 italic">No se encontraron movimientos</td>
                </tr>
              ) : (
                sortedMovimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400">#{m.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(m.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {m.cajaOrigen.descripcion}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {m.cajaDestino.descripcion}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right">
                      ${Number(m.monto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {m.observaciones || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        m.activo 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 text-opacity-70"
                      }`}>
                        {m.activo ? "Habilitado" : "Deshabilitado"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="relative flex justify-center">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === m.id ? null : m.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        {openDropdownId === m.id && (
                          <div ref={dropdownRef} className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden text-left focus:outline-none">
                            <div className="py-1">
                              <Link href={`/movimientos-internos/${m.id}/editar`} className="group flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </Link>
                              <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                              {m.activo ? (
                                <button onClick={() => { setOpenDropdownId(null); handleDeactivate(m.id); }} className="group flex w-full items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                  <svg className="mr-3 h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Dar de baja
                                </button>
                              ) : (
                                <button onClick={() => { setOpenDropdownId(null); handleActivate(m.id); }} className="group flex w-full items-center px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                  <svg className="mr-3 h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Dar de alta
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Logic same as Gastos */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-gray-50/30 dark:bg-gray-800/30">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>Mostrando {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)} de {total}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={5}>5 por página</option>
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              {/* Simplified Pagination buttons for brevity, but full logic can be added */}
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="p-2 disabled:opacity-30">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="px-3 text-sm font-bold text-blue-600">Página {currentPage} de {lastPage}</span>
              <button disabled={currentPage >= lastPage} onClick={() => setCurrentPage(currentPage + 1)} className="p-2 disabled:opacity-30">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
