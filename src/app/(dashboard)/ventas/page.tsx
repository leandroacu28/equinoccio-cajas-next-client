"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Venta {
  id: number;
  fecha: string;
  monto: number | string;
  observaciones?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  caja: { id: number; descripcion: string };
  cliente: { id: number; descripcion: string };
  creatorUser?: { id: number; nombre: string; apellido: string };
  productos?: { id: number; cantidad: number; precioUnitario: number; producto: { descripcion: string } }[];
}

interface Caja { id: number; descripcion: string; }
interface Cliente { id: number; descripcion: string; }

const formatDateUTC = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("es-AR", { timeZone: "UTC" });
};

const formatMoney = (amount: number | string) => {
  return Number(amount).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
};

export default function VentasPage() {
  const router = useRouter();

  // Data
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [activoFilter, setActivoFilter] = useState<"" | "true" | "false">("true");
  const [cajaFilter, setCajaFilter] = useState("");
  const [clienteFilter, setClienteFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);
  const rangeDropdownRef = useRef<HTMLDivElement>(null);

  // Actions dropdown
  const [openDropdown, setOpenDropdown] = useState<{ id: number; top: number; right: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Metadata
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  const sortedVentas = [...ventas].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aValue: any = (a as any)[key];
    let bValue: any = (b as any)[key];
    
    if (key === 'fecha') {
        aValue = new Date(a.fecha).getTime();
        bValue = new Date(b.fecha).getTime();
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), []);

  // Quick date handlers
  const handleToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(today); setDateTo(today); setRangeDropdownOpen(false);
  };
  const handleLast7Days = () => {
    const end = new Date(); const start = new Date();
    start.setDate(end.getDate() - 7);
    setDateFrom(start.toISOString().split("T")[0]);
    setDateTo(end.toISOString().split("T")[0]);
    setRangeDropdownOpen(false);
  };
  const handleLast30Days = () => {
    const end = new Date(); const start = new Date();
    start.setDate(end.getDate() - 30);
    setDateFrom(start.toISOString().split("T")[0]);
    setDateTo(end.toISOString().split("T")[0]);
    setRangeDropdownOpen(false);
  };
  const handleThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateFrom(firstDay.toISOString().split("T")[0]);
    setDateTo(now.toISOString().split("T")[0]);
    setRangeDropdownOpen(false);
  };
  const clearDateRange = () => { setDateFrom(""); setDateTo(""); setRangeDropdownOpen(false); };

  // Close range dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(e.target as Node))
        setRangeDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close actions dropdown on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [openDropdown]);

  // Fetch metadata
  useEffect(() => {
    const h = { Authorization: `Bearer ${getToken()}` };
    Promise.all([
      fetch(`${API_URL}/cajas`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/clientes`, { headers: h }).then(r => r.json()),
    ]).then(([cajasData, clientesData]) => {
      setCajas(Array.isArray(cajasData) ? cajasData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : clientesData?.data || []);
    }).catch(console.error);
  }, []);

  // Fetch ventas
  const fetchVentas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", pageSize.toString());
      if (search) params.set("search", search);
      if (activoFilter !== "") params.set("activo", activoFilter);
      if (cajaFilter) params.set("cajaId", cajaFilter);
      if (clienteFilter) params.set("clienteId", clienteFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`${API_URL}/ventas?${params}`, { headers: headers() });
      if (!res.ok) throw new Error("Error al cargar ventas");
      const data = await res.json();
      setVentas(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      showError("Error al cargar ventas", err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, activoFilter, cajaFilter, clienteFilter, dateFrom, dateTo, headers]);

  useEffect(() => { setCurrentPage(1); }, [search, activoFilter, cajaFilter, clienteFilter, dateFrom, dateTo, pageSize]);
  useEffect(() => { fetchVentas(); }, [fetchVentas]);

  const handleToggleActivo = async (v: Venta) => {
    try {
      const endpoint = v.activo ? "baja" : "activar";
      const res = await fetch(`${API_URL}/ventas/${v.id}/${endpoint}`, { method: "PATCH", headers: headers() });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Error"); }
      showSuccess(v.activo ? "Venta dada de baja" : "Venta reactivada");
      fetchVentas();
    } catch (err: any) {
      showError("Error", err.message);
    }
  };

  const handleExportExcel = () => {
    if (sortedVentas.length === 0) return;
    const dataToExport = sortedVentas.map(v => ({
      "N° Venta": v.id,
      Fecha: formatDateUTC(v.fecha),
      Cliente: v.cliente.descripcion,
      Caja: v.caja.descripcion,
      Observaciones: v.observaciones || "",
      Productos: v.productos?.length ?? 0,
      Monto: Number(v.monto),
      Estado: v.activo ? "Activo" : "Inactivo",
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    XLSX.writeFile(workbook, "ventas.xlsx");
    showSuccess("Archivo exportado", "El archivo Excel ha sido generado con éxito.");
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasDateFilter = dateFrom || dateTo;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formatMoney = (m: number | string) => `$${Number(m).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Listado de Ventas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{total} venta{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}</p>
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
          <button
            onClick={() => router.push("/ventas/nueva")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:-translate-y-0.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva Venta
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por cliente, caja u observaciones..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 transition-all"
            />
          </div>

          {/* Estado */}
          <select
            value={activoFilter}
            onChange={e => setActivoFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 transition-all"
          >
            <option value="">Todos</option>
            <option value="true">Habilitados</option>
            <option value="false">Deshabilitados</option>
          </select>

          {/* Caja */}
          <select
            value={cajaFilter}
            onChange={e => setCajaFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 transition-all"
          >
            <option value="">Todas las cajas</option>
            {cajas.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
          </select>

          {/* Cliente */}
          <select
            value={clienteFilter}
            onChange={e => setClienteFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 transition-all"
          >
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
          </select>

          {/* Date range dropdown */}
          <div className="relative shrink-0" ref={rangeDropdownRef}>
            <button
              onClick={() => setRangeDropdownOpen(p => !p)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${hasDateFilter
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-600"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Seleccionar rango
              {hasDateFilter && <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-blue-500" />}
              <svg className={`h-4 w-4 transition-transform ${rangeDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {rangeDropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                <div className="p-3 border-b border-gray-100 dark:border-gray-700 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rango personalizado</p>
                  <div className="relative">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 transition-all" />
                    <span className="absolute -top-2 left-2 bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-500">Desde</span>
                  </div>
                  <div className="relative">
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 transition-all" />
                    <span className="absolute -top-2 left-2 bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-500">Hasta</span>
                  </div>
                </div>
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

          {/* Clear date */}
          {hasDateFilter && (
            <button onClick={clearDateRange} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 transition-all">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Quitar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-left">
                  <th 
                    className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                    onClick={() => {
                        const direction = sortConfig?.key === 'id' && sortConfig.direction === 'desc' ? 'asc' : 'desc';
                        setSortConfig({ key: 'id', direction });
                    }}
                  >
                    <div className="flex items-center gap-1">
                        N° Venta
                        {sortConfig?.key === 'id' && (
                            <span className="text-emerald-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Caja</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observaciones</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monto</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    Cargando...
                  </div>
                </td></tr>
              ) : sortedVentas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron ventas.</p>
                  <button onClick={() => router.push("/ventas/nueva")} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Crear primera venta
                  </button>
                </td></tr>
              ) : sortedVentas.map(v => (
                <tr key={v.id} className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!v.activo ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">#{v.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatDateUTC(v.fecha)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{v.cliente.descripcion}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{v.caja.descripcion}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[220px]">
                    {v.observaciones ? (
                      <span className="block truncate" title={v.observaciones}>{v.observaciones}</span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">{formatMoney(v.monto)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${v.activo ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${v.activo ? "bg-emerald-500" : "bg-red-500"}`} />
                      {v.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openDropdown?.id === v.id) {
                            setOpenDropdown(null);
                          } else {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setOpenDropdown({ id: v.id, top: rect.bottom + window.scrollY, right: window.innerWidth - rect.right });
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <span className="sr-only">Abrir menú</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
                className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={5}>5 por página</option>
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              {/* Primera página */}
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
              {/* Anterior */}
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

              {/* Números de página con dots */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
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
                      className={`min-w-[36px] h-9 rounded-md text-sm font-medium transition-colors ${
                        currentPage === p
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              {/* Siguiente */}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Siguiente"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {/* Última página */}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
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
      {/* Actions dropdown — fixed positioned to escape overflow:hidden */}
      {openDropdown && (
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: openDropdown.top + 4, right: openDropdown.right }}
          className="z-[9999] w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-gray-700"
        >
          <div className="py-1">
            {/* Editar */}
            <button
              onClick={() => { setOpenDropdown(null); router.push(`/ventas/${openDropdown.id}/editar`); }}
              className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            {/* Activar / Dar de baja — buscamos la venta por id */}
            {ventas.filter(v => v.id === openDropdown.id).map(v => (
              <button
                key={v.id}
                onClick={() => { setOpenDropdown(null); handleToggleActivo(v); }}
                className={`group flex w-full items-center px-4 py-2 text-sm ${
                  v.activo
                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                }`}
              >
                <svg className={`mr-3 h-5 w-5 ${v.activo ? "text-red-400 group-hover:text-red-500" : "text-green-400 group-hover:text-green-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {v.activo
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  }
                </svg>
                {v.activo ? "Dar de baja" : "Activar"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
