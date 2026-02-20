"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { showError } from "@/lib/alerts";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Movement {
  id: number;
  fecha: string;
  tipo: string;
  detalle: string;
  observaciones: string | null;
  monto: number;
  esIngreso: boolean;
  esInterno: boolean;
  debe: number;
  haber: number;
  saldo: number;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

interface Caja {
  id: number;
  descripcion: string;
  saldo: number;
  activo: boolean;
}

export default function MovimientosCajaPage() {
  const params = useParams();
  const router = useRouter();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Range dropdown
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);
  const rangeDropdownRef = useRef<HTMLDivElement>(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'fecha', 
    direction: 'desc' 
  });

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

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedMovements = [...movements].sort((a, b) => {
    if (sortConfig.key === 'fecha') {
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      const diff = sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      
      if (diff === 0) {
        // Tie-breaker: creation date
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();
        return sortConfig.direction === 'asc' ? createdA - createdB : createdB - createdA;
      }
      return diff;
    }
    return 0;
  });

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), []);

  const fetchCaja = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/cajas/${params.id}`, { 
        headers: headers(),
        cache: 'no-store'
      });
      if (!res.ok) throw new Error("Error al cargar datos de la caja");
      const data = await res.json();
      setCaja(data);
    } catch (err: any) {
      showError("Error", err.message);
    }
  }, [params.id, headers]);

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (dateFrom) queryParams.append("from", dateFrom);
      if (dateTo) queryParams.append("to", dateTo);
      if (searchTerm) queryParams.append("search", searchTerm);
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", pageSize.toString());

      const res = await fetch(`${API_URL}/cajas/${params.id}/movimientos?${queryParams.toString()}`, { 
        headers: headers(),
        cache: 'no-store'
      });
      if (!res.ok) throw new Error("Error al cargar movimientos");
      const response = await res.json();
      
      // Handle response structure { data: [], total: 0 }
      if (response.data && typeof response.total === 'number') {
        setMovements(response.data);
        setTotal(response.total);
      } else {
        // Fallback for old API if needed
        setMovements(Array.isArray(response) ? response : []);
        setTotal(Array.isArray(response) ? response.length : 0);
      }
    } catch (err: any) {
      showError("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, [params.id, dateFrom, dateTo, searchTerm, currentPage, pageSize, headers]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, searchTerm]);

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

  useEffect(() => {
    if (params.id) {
      fetchCaja();
      fetchMovements();
    }
  }, [params.id, fetchCaja, fetchMovements]);

  const handleExportExcel = () => {
    if (!caja) return;
    const data = sortedMovements.map(m => ({
      Fecha: new Date(m.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" }),
      Tipo: m.tipo,
      Detalle: m.detalle,
      Observación: m.observaciones || "-",
      Debe: m.debe,
      Haber: m.haber,
      Saldo: m.saldo
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Movimientos ${caja.descripcion}`);
    XLSX.writeFile(wb, `movimientos_${caja.descripcion.replace(/\s+/g, '_')}.xlsx`);
  };

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 transition-all";

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:-translate-y-0.5 shadow-sm"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Movimientos de Caja</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {caja ? `${caja.descripcion}` : "Cargando..."} • {movements.length} movimientos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportExcel} 
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all hover:-translate-y-0.5"
          >
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      {/* Info Card - Mantener tarjeta simple pero con estética mejorada */}
      {caja && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm max-w-sm">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Saldo Actual</h3>
          <p className={`text-3xl font-bold tracking-tight ${Number(caja.saldo) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            ${Number(caja.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por detalle u observaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>

          {/* Range Dropdown */}
          <div className="relative shrink-0" ref={rangeDropdownRef}>
            <button
              onClick={() => setRangeDropdownOpen(prev => !prev)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                (dateFrom || dateTo)
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-600'
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
              <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                {/* Date pickers — primero */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-700 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rango personalizado</p>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={inputClass}
                    />
                    <span className="absolute -top-2 left-2 bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-500">Desde</span>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={inputClass}
                    />
                    <span className="absolute -top-2 left-2 bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-500">Hasta</span>
                  </div>
                </div>

                {/* Quick buttons — debajo */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceso rápido</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleToday}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all"
                    >
                      Hoy
                    </button>
                    <button
                      onClick={handleLast7Days}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all"
                    >
                      7 días
                    </button>
                    <button
                      onClick={handleLast30Days}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all"
                    >
                      30 días
                    </button>
                    <button
                      onClick={handleThisMonth}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all"
                    >
                      Este Mes
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-3 py-2.5">
                  <button
                    onClick={() => setRangeDropdownOpen(false)}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-bold text-white transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quitar filtros — fuera del dropdown, solo visible si hay fechas activas */}
          {(dateFrom || dateTo) && (
            <button
              onClick={clearDateRange}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-all"
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
      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div></div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {[
                    { key: "fecha", label: "Fecha", align: "left" },
                    { key: "", label: "Tipo", align: "left" },
                    { key: "", label: "Observación", align: "left" },
                    { key: "", label: "Debe", align: "right" },
                    { key: "", label: "Haber", align: "right" },
                    { key: "", label: "Saldo", align: "right" },
                  ].map((col, idx) => (
                    <th 
                      key={idx} 
                      onClick={() => col.key && handleSort(col.key)}
                      className={`px-6 py-4 text-${col.align} text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 select-none ${col.key ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" : ""}`}
                    >
                      <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                        {col.label}
                        {sortConfig.key === col.key && (
                          <span className="text-emerald-500 font-bold ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {sortedMovements.length > 0 ? (
                  sortedMovements.map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="font-medium">{new Date(m.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" })}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          m.tipo === 'Ingreso' || m.tipo === 'Venta'
                            ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/30"
                            : m.tipo === 'Gasto'
                            ? "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/30"
                            : "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-400/30"
                        }`}>
                          {m.tipo}
                        </span>
                        <div className="text-xs text-gray-500 mt-1 font-medium">{m.detalle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {m.observaciones || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {m.debe > 0 ? `$${m.debe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600 dark:text-red-400">
                        {m.haber > 0 ? `$${m.haber.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${m.saldo >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                        ${m.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <p className="font-medium text-gray-600 dark:text-gray-300">No hay movimientos registrados</p>
                        <p className="text-gray-400">Los movimientos de la caja aparecerán aquí.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-gray-50/30 dark:bg-gray-800/30">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>Mostrando {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)} de {total}</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Primera página"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Anterior"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === Math.ceil(total / pageSize) || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p as number)}
                        className={`min-w-[36px] h-9 rounded-md text-sm font-medium transition-colors ${currentPage === p
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  disabled={currentPage === Math.ceil(total / pageSize)}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Siguiente"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  disabled={currentPage === Math.ceil(total / pageSize)}
                  onClick={() => setCurrentPage(Math.ceil(total / pageSize))}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Última página"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
