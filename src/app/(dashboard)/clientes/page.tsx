"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getToken, getUser } from "@/lib/auth";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type TipoIdentificacion = "DNI" | "CUIL" | "CUIT";

interface Cliente {
  id: number;
  descripcion: string;
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  telefono: string | null;
  email: string | null;
  domicilio: string | null;
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
  tipoIdentificacion: "DNI" as TipoIdentificacion,
  identificacion: "",
  telefono: "",
  email: "",
  domicilio: "",
  activo: true,
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  // Sort state
  type SortKey = "descripcion" | "tipoIdentificacion" | "identificacion" | "createdAt" | "activo";
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

  const fetchClientes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/clientes`, { headers: headers() });
      if (!res.ok) throw new Error("Error al cargar clientes");
      setClientes(await res.json());
    } catch {
      setError("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());
    fetchClientes();
  }, [fetchClientes]);

  // Permission check - using 'clientes' as section id for future use
  const canEdit = user?.rol === 'Administrador' || user?.permissions?.find((p: any) => p.section === 'clientes')?.access === 'FULL_ACCESS';

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

  const openEdit = (cliente: Cliente) => {
    setSelected(cliente);
    setForm({
      descripcion: cliente.descripcion,
      tipoIdentificacion: cliente.tipoIdentificacion,
      identificacion: cliente.identificacion,
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      domicilio: cliente.domicilio || "",
      activo: cliente.activo,
    });
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
      const res = await fetch(`${API_URL}/clientes`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al crear cliente");
      }
      await fetchClientes();
      closeModal();
      showSuccess("Cliente creado", "El cliente ha sido creado correctamente");
    } catch (err: any) {
      showError("Error al crear cliente", err.message);
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
      const res = await fetch(`${API_URL}/clientes/${selected.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Error al editar cliente");
      }
      await fetchClientes();
      closeModal();
      showSuccess("Cliente actualizado", "El cliente ha sido actualizado correctamente");
    } catch (err: any) {
      showError("Error al editar cliente", err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (cliente: Cliente) => {
    const confirmed = await showConfirm({
      title: `¿${cliente.activo ? 'Desactivar' : 'Activar'} cliente?`,
      text: `¿Estás seguro de que deseas ${cliente.activo ? 'desactivar' : 'activar'} "${cliente.descripcion}"?`,
      confirmButtonText: cliente.activo ? "Sí, desactivar" : "Sí, activar",
      confirmButtonColor: cliente.activo ? "#ef4444" : "#10b981",
    });

    if (!confirmed) return;

    setOpenDropdownId(null);
    try {
      const res = await fetch(`${API_URL}/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ activo: !cliente.activo }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Error al cambiar estado");
      }

      await fetchClientes();
      showSuccess("Estado actualizado", `El cliente ahora está ${!cliente.activo ? 'activo' : 'inactivo'}`);
    } catch (err: any) {
      showError("Error", err.message);
    }
  };

  const filteredClientes = clientes.filter((cliente) => {
    const matchesSearch = cliente.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.identificacion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "Todos" ||
      (statusFilter === "Activo" ? cliente.activo : !cliente.activo);

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

  const sortedClientes = [...filteredClientes].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "activo") {
      cmp = Number(a.activo) - Number(b.activo);
    } else if (sortKey === "createdAt") {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      cmp = (a[sortKey] || "").localeCompare(b[sortKey] || "", "es", { sensitivity: "base" });
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Pagination calculations
  const totalItems = sortedClientes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedClientes = sortedClientes.slice(startIndex, startIndex + pageSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const toggleDropdown = (id: number) => {
    setOpenDropdownId(openDropdownId === id ? null : id);
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
    if (sortedClientes.length === 0) {
      showError("Sin datos", "No hay clientes para exportar");
      return;
    }

    const dataToExport = sortedClientes.map((c) => ({
      ID: c.id,
      Descripción: c.descripcion,
      "Tipo Ident.": c.tipoIdentificacion,
      Identificación: c.identificacion,
      Teléfono: c.telefono || "-",
      Email: c.email || "-",
      Domicilio: c.domicilio || "-",
      Estado: c.activo ? "Activo" : "Inactivo",
      "Fecha Creación": formatDate(c.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    XLSX.writeFile(workbook, "clientes.xlsx");
    showSuccess("Archivo exportado", "El archivo Excel ha sido generado con éxito");
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 transition-all";

  return (
    <div className="space-y-6">

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total de clientes: {totalItems}</p>
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
              Nuevo Cliente
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
            placeholder="Buscar por descripción o identificación..."
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
            {paginatedClientes.map((cliente) => (
              <div key={cliente.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${cliente.activo ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 line-through'}`}>
                      {cliente.descripcion}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {cliente.tipoIdentificacion}: {cliente.identificacion}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Creado: {formatDate(cliente.createdAt)}
                    </div>
                  </div>
                  <div className="relative">
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDropdown(cliente.id); }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    )}
                    {openDropdownId === cliente.id && canEdit && (
                      <div ref={mobileDropdownRef} className="absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                        <div className="py-1">
                          <button onClick={() => openEdit(cliente)} className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                            <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar
                          </button>
                          <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                          <button className={`group flex w-full items-center px-4 py-2 text-sm ${cliente.activo ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"}`} onClick={() => handleToggleStatus(cliente)}>
                            <svg className={`mr-3 h-5 w-5 ${cliente.activo ? "text-red-400" : "text-green-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {cliente.activo ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                            </svg>
                            {cliente.activo ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {cliente.telefono && <p>Tel: {cliente.telefono}</p>}
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cliente.activo
                    ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/30"
                    : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/30"
                    }`}>{cliente.activo ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {[
                    { key: "descripcion" as SortKey, label: "Descripción" },
                    { key: "tipoIdentificacion" as SortKey, label: "Tipo Identificación" },
                    { key: "identificacion" as SortKey, label: "Identificación" },
                    { key: "createdAt" as SortKey, label: "Fecha Creación" },
                    { key: "activo" as SortKey, label: "Estado" },
                  ].map((col) => (
                    <th
                      key={col.key}
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
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {paginatedClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${cliente.activo ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 line-through"}`}>
                        {cliente.descripcion}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {cliente.tipoIdentificacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {cliente.identificacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(cliente.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cliente.activo
                        ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/30"
                        : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/30"
                        }`}>
                        {cliente.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleDropdown(cliente.id); }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {openDropdownId === cliente.id && (
                            <div ref={dropdownRef} className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                              <div className="py-1">
                                <button onClick={() => openEdit(cliente)} className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                                  <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  Editar
                                </button>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                <button className={`group flex w-full items-center px-4 py-2 text-sm ${cliente.activo ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"}`} onClick={() => handleToggleStatus(cliente)}>
                                  <svg className={`mr-3 h-5 w-5 ${cliente.activo ? "text-red-400" : "text-green-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {cliente.activo ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                  </svg>
                                  {cliente.activo ? "Desactivar" : "Activar"}
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
          {paginatedClientes.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl">
              <div className="flex flex-col items-center justify-center">
                <svg className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="font-medium text-gray-600 dark:text-gray-300">No se encontraron clientes</p>
                <p className="text-gray-400">Intenta con otros filtros o crea un nuevo cliente.</p>
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
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => setCurrentPage(safeCurrentPage - 1)}
                  disabled={safeCurrentPage === 1}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {safeCurrentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(safeCurrentPage + 1)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {modal === "create" ? "Nuevo Cliente" : "Editar Cliente"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-500 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>}

            <form onSubmit={modal === "create" ? handleCreate : handleEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Descripción / Nombre completo</label>
                <input
                  required
                  placeholder="Ej: Juan Pérez"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo Identificación</label>
                <select
                  value={form.tipoIdentificacion}
                  onChange={(e) => setForm({ ...form, tipoIdentificacion: e.target.value as TipoIdentificacion })}
                  className={inputClass}
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIL">CUIL</option>
                  <option value="CUIT">CUIT</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Identificación</label>
                <input
                  required
                  placeholder="Ej: 20-12345678-9"
                  value={form.identificacion}
                  onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Teléfono (Opcional)</label>
                <input
                  type="tel"
                  placeholder="Ej: +54 9..."
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Email (Opcional)</label>
                <input
                  type="email"
                  placeholder="Ej: correo@ejemplo.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Domicilio (Opcional)</label>
                <input
                  placeholder="Ej: Av. Principal 123"
                  value={form.domicilio}
                  onChange={(e) => setForm({ ...form, domicilio: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700 dark:text-gray-300">Activo</label>
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  {saving ? "Guardando..." : modal === "create" ? "Crear Cliente" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
