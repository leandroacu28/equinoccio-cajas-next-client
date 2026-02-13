"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getToken, getUser } from "@/lib/auth";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface FamiliaProducto {
  id: number;
  descripcion: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  creatorUser?: {
    id: number;
    nombre: string;
    apellido: string;
    username: string;
  };
}

const emptyForm = {
  descripcion: "",
  activo: true,
};

export default function FamiliasProductosPage() {
  const [familias, setFamilias] = useState<FamiliaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<FamiliaProducto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  // Sort state
  type SortKey = "descripcion" | "activo" | "createdAt" | "updatedAt";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("descripcion");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), []);

  const fetchFamilias = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/familias-productos`, { headers: headers() });
      if (!res.ok) throw new Error("Error al cargar familias de productos");
      setFamilias(await res.json());
    } catch {
      setError("Error al cargar familias de productos");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());
    fetchFamilias();
  }, [fetchFamilias]);

  const canEdit = user?.rol === 'Administrador' || user?.permissions?.find((p: any) => p.section === 'configuraciones')?.access === 'FULL_ACCESS';

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

  const openCreate = () => {
    setForm(emptyForm);
    setError("");
    setModal("create");
  };

  const openEdit = (familia: FamiliaProducto) => {
    setSelected(familia);
    setForm({ descripcion: familia.descripcion, activo: familia.activo });
    setError("");
    setModal("edit");
    setOpenDropdownId(null);
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/familias-productos`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al crear familia de producto");
      }
      await fetchFamilias();
      closeModal();
      showSuccess("Familia creada", "La familia de producto ha sido creada correctamente");
    } catch (err: any) {
      showError("Error al crear familia", err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/familias-productos/${selected.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Error al editar familia de producto");
      }
      await fetchFamilias();
      closeModal();
      showSuccess("Familia actualizada", "La familia de producto ha sido actualizada correctamente");
    } catch (err: any) {
      showError("Error al editar familia", err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (familia: FamiliaProducto) => {
    const confirmed = await showConfirm({
      title: `¿${familia.activo ? 'Desactivar' : 'Activar'} familia?`,
      text: `¿Estás seguro de que deseas ${familia.activo ? 'desactivar' : 'activar'} "${familia.descripcion}"?`,
      confirmButtonText: familia.activo ? "Sí, desactivar" : "Sí, activar",
      confirmButtonColor: familia.activo ? "#ef4444" : "#10b981",
    });

    if (!confirmed) return;

    setOpenDropdownId(null);
    try {
      const res = await fetch(`${API_URL}/familias-productos/${familia.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ activo: !familia.activo }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Error al cambiar estado");
      }

      await fetchFamilias();
      showSuccess("Estado actualizado", `La familia ahora está ${!familia.activo ? 'activa' : 'inactiva'}`);
    } catch (err: any) {
      showError("Error", err.message);
    }
  };

  const filteredFamilias = familias.filter((familia) => {
    const matchesSearch = familia.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "Todos" ||
      (statusFilter === "Activo" ? familia.activo : !familia.activo);

    return matchesSearch && matchesStatus;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedFamilias = [...filteredFamilias].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "activo") {
      cmp = Number(a.activo) - Number(b.activo);
    } else if (sortKey === "createdAt" || sortKey === "updatedAt") {
      cmp = new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime();
    } else {
      cmp = a[sortKey].localeCompare(b[sortKey], "es", { sensitivity: "base" });
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Pagination calculations
  const totalItems = sortedFamilias.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedFamilias = sortedFamilias.slice(startIndex, startIndex + pageSize);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const toggleDropdown = (id: number) => {
    if (openDropdownId === id) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExportExcel = () => {
    if (sortedFamilias.length === 0) {
      showError("Sin datos", "No hay familias de productos para exportar");
      return;
    }

    const dataToExport = sortedFamilias.map((u) => ({
      ID: u.id,
      Descripción: u.descripcion,
      Estado: u.activo ? "Activo" : "Inactivo",
      "Fecha Creación": formatDate(u.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Familias de Productos");

    XLSX.writeFile(workbook, "familias_de_productos.xlsx");
    showSuccess("Archivo exportado", "El archivo Excel ha sido generado con éxito");
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 transition-all";

  return (
    <div className="space-y-6">

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Familias de productos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona las familias de productos del sistema</p>
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
          {canEdit && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Familia
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 transition-all"
          />
        </div>
        <div className="sm:w-64">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all cursor-pointer"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activos</option>
            <option value="Inactivo">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

          {/* Mobile Cards */}
          <div className="block md:hidden divide-y divide-gray-200 dark:divide-gray-800">
            {paginatedFamilias.map((familia) => (
              <div key={familia.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${familia.activo ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 line-through'}`}>
                      {familia.descripcion}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Creado: {formatDate(familia.createdAt)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Actualizado: {formatDate(familia.updatedAt)}
                    </div>
                  </div>
                  <div className="relative">
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDropdown(familia.id); }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    )}
                    {openDropdownId === familia.id && canEdit && (
                      <div ref={mobileDropdownRef} className="absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                        <div className="py-1">
                          <button onClick={() => openEdit(familia)} className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                            <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar
                          </button>
                          <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                          <button className={`group flex w-full items-center px-4 py-2 text-sm ${familia.activo ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"}`} onClick={() => handleToggleStatus(familia)}>
                            <svg className={`mr-3 h-5 w-5 ${familia.activo ? "text-red-400" : "text-green-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {familia.activo ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                            </svg>
                            {familia.activo ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${familia.activo
                    ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/30"
                    : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/30"
                    }`}>{familia.activo ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {([
                    { key: "descripcion" as SortKey, label: "Descripción" },
                    { key: "createdAt" as SortKey, label: "Fecha Creación" },
                    { key: "activo" as SortKey, label: "Estado" },
                  ]).map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <span className="inline-flex flex-col leading-none text-[10px]">
                          <svg className={`h-3 w-3 ${sortKey === col.key && sortDir === "asc" ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg className={`h-3 w-3 -mt-1 ${sortKey === col.key && sortDir === "desc" ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </div>
                    </th>
                  ))}
                  {canEdit && (
                    <th scope="col" className="relative px-6 py-4">
                      <span className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {paginatedFamilias.map((familia) => (
                  <tr key={familia.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className={`text-sm font-medium ${familia.activo ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 line-through'}`}>
                        {familia.descripcion}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(familia.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${familia.activo
                        ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/30"
                        : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/30"
                        }`}>
                        {familia.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    {canEdit && (
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="relative flex justify-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleDropdown(familia.id); }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <span className="sr-only">Open menu</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {openDropdownId === familia.id && (
                            <div ref={dropdownRef} className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                              <div className="py-1">
                                <button onClick={() => openEdit(familia)} className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                                  <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  Editar
                                </button>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                <button className={`group flex w-full items-center px-4 py-2 text-sm ${familia.activo ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"}`} onClick={() => handleToggleStatus(familia)}>
                                  <svg className={`mr-3 h-5 w-5 ${familia.activo ? "text-red-400 group-hover:text-red-500" : "text-green-400 group-hover:text-green-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {familia.activo ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                  </svg>
                                  {familia.activo ? "Desactivar" : "Activar"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {paginatedFamilias.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex flex-col items-center justify-center">
                <svg className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="font-medium text-gray-600 dark:text-gray-300">No se encontraron familias de productos</p>
                <p className="text-gray-400">Intenta con otros filtros o crea una nueva familia.</p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-800 px-6 py-4">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} de {totalItems}</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Primera página"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(safeCurrentPage - 1)}
                  disabled={safeCurrentPage === 1}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Anterior"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
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
                        className={`min-w-[36px] h-9 rounded-md text-sm font-medium transition-colors ${safeCurrentPage === p
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setCurrentPage(safeCurrentPage + 1)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Siguiente"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {modal === "create" ? "Nueva Familia de Producto" : "Editar Familia de Producto"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2">
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>}

            <form onSubmit={modal === "create" ? handleCreate : handleEdit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Descripción</label>
                <input
                  required
                  autoFocus
                  placeholder="Ej: Lácteos, Bebidas, Limpieza..."
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Activo
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 transition-all"
                >
                  {saving ? "Guardando..." : modal === "create" ? "Crear" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
