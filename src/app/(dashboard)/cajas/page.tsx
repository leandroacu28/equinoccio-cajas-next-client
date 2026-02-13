"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "@/lib/auth";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Caja {
  id: number;
  descripcion: string;
  saldo: number;
  activo: boolean;
  createdAt: string;
  creatorUser: {
    id: number;
    nombre: string;
    apellido: string;
  };
  assignedUser?: {
    id: number;
    nombre: string;
    apellido: string;
  } | null;
}

const emptyForm = {
  descripcion: "",
  saldo: 0,
  activo: true,
};

export default function CajasPage() {
  const router = useRouter();
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Caja | null>(null);
  const [form, setForm] = useState<{
    descripcion: string;
    saldo: number | string;
    activo: boolean;
  }>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  // Sort state
  type SortKey = "descripcion" | "saldo" | "createdAt" | "activo";
  const [sortKey, setSortKey] = useState<SortKey>("descripcion");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/cajas`, { headers: headers() });
      if (!res.ok) throw new Error("Error al cargar cajas");
      const data = await res.json();
      setCajas(data);
    } catch (err: any) {
      showError("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, [headers]);



  const [user, setUser] = useState<any>(null);

  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/users`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [headers]);

  useEffect(() => {
    setUser(getUser());
    fetchData();
    fetchUsers();
  }, [fetchData, fetchUsers]);

  const canEdit = user?.rol === 'Administrador' || user?.permissions?.find((p: any) => p.section === 'cajas')?.access === 'FULL_ACCESS';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setModal("create");
  };

  const openEdit = (c: Caja) => {
    setSelected(c);
    setForm({
      descripcion: c.descripcion,
      saldo: Number(c.saldo),
      activo: c.activo,
    });
    setModal("edit");
    setOpenDropdownId(null);
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/cajas`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ ...form, saldo: Number(form.saldo) }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Error al crear caja");
      }
      await fetchData();
      closeModal();
      showSuccess("Caja creada", "La caja ha sido creada correctamente");
    } catch (err: any) {
      showError("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/cajas/${selected.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ ...form, saldo: Number(form.saldo) }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Error al actualizar caja");
      }
      await fetchData();
      closeModal();
      showSuccess("Caja actualizada", "La caja ha sido actualizada correctamente");
    } catch (err: any) {
      showError("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (c: Caja) => {
    const confirmed = await showConfirm({
      title: `¿${c.activo ? 'Desactivar' : 'Activar'} caja?`,
      text: `¿Estás seguro de que deseas ${c.activo ? 'desactivar' : 'activar'} "${c.descripcion}"?`,
      confirmButtonText: c.activo ? "Sí, desactivar" : "Sí, activar",
      confirmButtonColor: c.activo ? "#ef4444" : "#10b981",
    });

    if (!confirmed) return;

    setOpenDropdownId(null);
    try {
      const res = await fetch(`${API_URL}/cajas/${c.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ activo: !c.activo }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      await fetchData();
      showSuccess("Estado actualizado", `La caja ahora está ${!c.activo ? 'activa' : 'inactiva'}`);
    } catch (err: any) {
      showError("Error", err.message);
    }
  };

  const filtered = cajas.filter((c) => {
    const matchesSearch = c.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "Todos" || (statusFilter === "Activo" ? c.activo : !c.activo);
    return matchesSearch && matchesStatus;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "saldo") cmp = Number(a.saldo) - Number(b.saldo);
    else if (sortKey === "activo") cmp = Number(a.activo) - Number(b.activo);
    else if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    else cmp = a[sortKey].localeCompare(b[sortKey]);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalItems = sorted.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = sorted.slice(startIndex, startIndex + pageSize);

  const handleExportExcel = () => {
    const data = sorted.map(c => ({
      Descripción: c.descripcion,
      Saldo: c.saldo,
      "Fecha Creación": new Date(c.createdAt).toLocaleDateString(),
      Estado: c.activo ? "Activo" : "Inactivo",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cajas");
    XLSX.writeFile(wb, "cajas.xlsx");
  };

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Cajas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total de cajas registradas: {totalItems}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all hover:-translate-y-0.5">
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar
          </button>
          {canEdit && (
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nueva Caja
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          <svg className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
          <option value="Todos">Todos los estados</option>
          <option value="Activo">Activos</option>
          <option value="Inactivo">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div></div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-visible">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {[
                    { key: "descripcion", label: "Descripción" },
                    { key: null, label: "Asignado a" },
                    { key: "saldo", label: "Saldo" },
                    { key: "createdAt", label: "Fecha Creación" },
                    { key: "activo", label: "Estado" },
                  ].map((col) => (
                    <th key={col.label} onClick={() => col.key && handleSort(col.key as SortKey)} className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${col.key ? 'cursor-pointer hover:text-gray-700 dark:hover:text-white' : ''}`}>
                      {col.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{c.descripcion}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {c.assignedUser ? `${c.assignedUser.nombre} ${c.assignedUser.apellido}` : "-"}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${Number(c.saldo) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${Number(c.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset ${c.activo 
                        ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/30" 
                        : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/30"}`}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {canEdit && (
                        <div className="relative flex justify-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === c.id ? null : c.id); }} 
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <span className="sr-only">Open menu</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {openDropdownId === c.id && (
                            <div ref={dropdownRef} className="absolute right-0 z-[60] mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                              <div className="py-1 text-left">
                                <button onClick={() => openEdit(c)} className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                                  <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Editar
                                </button>
                                <button onClick={() => router.push(`/cajas/${c.id}/movimientos`)} className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                                  <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                  </svg>
                                  Movimientos
                                </button>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                <button onClick={() => handleToggleStatus(c)} className={`group flex w-full items-center px-4 py-2 text-sm ${c.activo ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"}`}>
                                  <svg className={`mr-3 h-5 w-5 ${c.activo ? "text-red-400 group-hover:text-red-500" : "text-green-400 group-hover:text-green-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {c.activo ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    )}
                                  </svg>
                                  {c.activo ? "Desactivar" : "Activar"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginated.length === 0 && (
            <div className="p-12 text-center text-gray-500 bg-gray-50/50 dark:bg-gray-800/50">
              <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              No se encontraron cajas
            </div>
          )}
          
          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} de {totalItems}</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Primera página"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Anterior"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i-1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) => (
                      p === "..." ? (
                        <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${currentPage === p ? "bg-emerald-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                        >
                          {p}
                        </button>
                      )
                    ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Siguiente"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
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

      {/* Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 md:p-8 dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {modal === "create" ? "Nueva Caja" : "Editar Caja"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={modal === "create" ? handleCreate : handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: Caja Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Saldo Inicial <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.saldo}
                    onChange={(e) => setForm({ ...form, saldo: e.target.value })}
                    className={`${inputClass} pl-7`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                  Caja Activa
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </span>
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
