"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { getToken, getUser } from "@/lib/auth";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Gasto {
  id: number;
  fecha: string;
  factura: "SinFactura" | "ConFactura";
  monto: number;
  observaciones: string;
  activo: boolean;
  caja: {
    id: number;
    descripcion: string;
  };
  tipoGasto: {
    id: number;
    descripcion: string;
  };
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [cajaFilter, setCajaFilter] = useState("");
  const [tipoGastoFilter, setTipoGastoFilter] = useState("");
  
  const [cajas, setCajas] = useState<any[]>([]);
  const [tiposGasto, setTiposGasto] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState<any>(null);

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  const fetchMetadata = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const [cRes, tRes] = await Promise.all([
        fetch(`${API_URL}/cajas`, { headers }),
        fetch(`${API_URL}/tipos-gasto`, { headers }),
      ]);
      if (cRes.ok) setCajas(await cRes.json());
      if (tRes.ok) setTiposGasto(await tRes.json());
    } catch (err) {
      console.error("Error fetching metadata", err);
    }
  }, []);

  const fetchGastos = useCallback(async () => {
    try {
      setLoading(true);
      
      let url = `${API_URL}/gastos?page=${currentPage}&limit=${pageSize}&search=${searchTerm}`;
      if (statusFilter !== "Todos") {
        url += `&activo=${statusFilter === "Activo"}`;
      }
      if (cajaFilter) url += `&cajaId=${cajaFilter}`;
      if (tipoGastoFilter) url += `&tipoGastoId=${tipoGastoFilter}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (!res.ok) throw new Error("Error al cargar gastos");
      const data = await res.json();
      setGastos(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      showError("Error", "No se pudieron cargar los gastos");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, cajaFilter, tipoGastoFilter]);

  useEffect(() => {
    setUser(getUser());
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    fetchGastos();
  }, [fetchGastos]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, cajaFilter, tipoGastoFilter]);

  // Close dropdown when clicking outside or pressing Esc
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isOutsideDesktop = !dropdownRef.current || !dropdownRef.current.contains(event.target as Node);
      const isOutsideMobile = !mobileDropdownRef.current || !mobileDropdownRef.current.contains(event.target as Node);

      if (openDropdownId !== null && isOutsideDesktop && isOutsideMobile) {
        setOpenDropdownId(null);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdownId(null);
      }
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
      text: "Esta acción dará de baja el gasto.",
      confirmButtonText: "Sí, dar de baja",
      confirmButtonColor: "#ef4444",
    });

    if (confirmed) {
      try {
        const res = await fetch(`${API_URL}/gastos/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
        if (res.ok) {
          showSuccess("Éxito", "Gasto dado de baja");
          fetchGastos();
        } else {
          throw new Error();
        }
      } catch {
        showError("Error", "No se pudo dar de baja el gasto");
      }
    }
  };

  const handleActivate = async (id: number) => {
    const confirmed = await showConfirm({
      title: "¿Dar de alta?",
      text: "Esta acción habilitará nuevamente el gasto.",
      confirmButtonText: "Sí, dar de alta",
      confirmButtonColor: "#059669",
    });

    if (confirmed) {
      try {
        const res = await fetch(`${API_URL}/gastos/${id}/activar`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
        if (res.ok) {
          showSuccess("Éxito", "Gasto dado de alta nuevamente");
          fetchGastos();
        } else {
          throw new Error();
        }
      } catch {
        showError("Error", "No se pudo dar de alta el gasto");
      }
    }
  };

  const exportToExcel = () => {
    const dataToExport = gastos.map((g) => ({
      ID: g.id,
      Fecha: new Date(g.fecha).toLocaleDateString("es-AR"),
      Factura: g.factura === "SinFactura" ? "Sin Factura" : "Con Factura",
      "Tipo de Gasto": g.tipoGasto.descripcion,
      Caja: g.caja.descripcion,
      Monto: Number(g.monto),
      Estado: g.activo ? "Habilitado" : "Deshabilitado",
      Observaciones: g.observaciones || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    XLSX.writeFile(wb, "gastos.xlsx");
  };

  const lastPage = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Gastos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total de gastos: {total}</p>
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
            href="/gastos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Gasto
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
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <select
            value={cajaFilter}
            onChange={(e) => setCajaFilter(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
          >
            <option value="">Todas las cajas</option>
            {cajas.map(c => (
              <option key={c.id} value={c.id}>{c.descripcion}</option>
            ))}
          </select>

          <select
            value={tipoGastoFilter}
            onChange={(e) => setTipoGastoFilter(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
          >
            <option value="">Todos los tipos</option>
            {tiposGasto.map(t => (
              <option key={t.id} value={t.id}>{t.descripcion}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Habilitados</option>
            <option value="Inactivo">Deshabilitados</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        
        {/* Mobile Cards */}
        <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden rounded-2xl">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-3">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4"></div>
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4"></div>
              </div>
            ))
          ) : gastos.length === 0 ? (
            <div className="p-8 text-center text-gray-500 italic text-sm">No se encontraron gastos</div>
          ) : (
            gastos.map((g) => (
              <div key={g.id} className="p-4 space-y-3 relative group">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">#{g.id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                        g.activo 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                      }`}>
                        {g.activo ? "Habilitado" : "Baja"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {g.tipoGasto.descripcion}
                    </h3>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === g.id ? null : g.id); }}
                      className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    {openDropdownId === g.id && (
                      <div ref={mobileDropdownRef} className="absolute right-0 top-full z-[100] mt-1 w-48 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                        <div className="py-1">
                          <Link href={`/gastos/${g.id}/editar`} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200">
                            Editar
                          </Link>
                          {g.activo ? (
                            <button onClick={() => { setOpenDropdownId(null); handleDeactivate(g.id); }} className="flex w-full items-center px-4 py-2.5 text-sm text-red-600">
                              Dar de baja
                            </button>
                          ) : (
                            <button onClick={() => { setOpenDropdownId(null); handleActivate(g.id); }} className="flex w-full items-center px-4 py-2.5 text-sm text-emerald-600">
                              Dar de alta
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Caja</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{g.caja.descripcion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Monto</p>
                    <p className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                      ${Number(g.monto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-50 dark:border-gray-800/50 flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-tighter">
                  <span>{new Date(g.fecha).toLocaleDateString("es-AR")}</span>
                  <span className="truncate max-w-[150px] italic">{g.observaciones || "Sin observaciones"}</span>
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nº Gasto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo de Gasto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observaciones</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Caja</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monto</th>
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
              ) : gastos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 italic">No se encontraron gastos</td>
                </tr>
              ) : (
                gastos.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-rose-600 dark:text-rose-400">#{g.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(g.fecha).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                        {g.tipoGasto.descripcion}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {g.observaciones || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                      {g.caja.descripcion}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      ${Number(g.monto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        g.activo 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 text-opacity-70"
                      }`}>
                        {g.activo ? "Habilitado" : "Deshabilitado"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="relative flex justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === g.id ? null : g.id); }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        {openDropdownId === g.id && (
                          <div 
                            ref={dropdownRef} 
                            className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 focus:outline-none overflow-hidden text-left"
                          >
                            <div className="py-1">
                              <Link
                                href={`/gastos/${g.id}/editar`}
                                className="group flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                              >
                                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </Link>
                              <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                              {g.activo ? (
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleDeactivate(g.id);
                                  }}
                                  className="group flex w-full items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <svg className="mr-3 h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Dar de baja
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleActivate(g.id);
                                  }}
                                  className="group flex w-full items-center px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                >
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

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-gray-50/30 dark:bg-gray-800/30">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>Mostrando {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)} de {total}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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

              {Array.from({ length: lastPage }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === lastPage || Math.abs(p - currentPage) <= 1)
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
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                disabled={currentPage === lastPage}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Siguiente"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                disabled={currentPage === lastPage}
                onClick={() => setCurrentPage(lastPage)}
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
    </div>
  );
}
