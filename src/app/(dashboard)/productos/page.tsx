"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getToken, getUser } from "@/lib/auth";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface FamiliaProducto {
  id: number;
  descripcion: string;
}

interface UnidadMedida {
  id: number;
  descripcion: string;
}

interface Producto {
  id: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
  familiaId: number;
  unidadMedidaId: number;
  familia: FamiliaProducto;
  unidadMedida: UnidadMedida;
  createdAt: string;
}

const emptyForm = {
  codigo: "",
  descripcion: "",
  familiaId: 0,
  unidadMedidaId: 0,
  activo: true,
};

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [familias, setFamilias] = useState<FamiliaProducto[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Producto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [familiaFilter, setFamiliaFilter] = useState("Todas");

  // Sort state
  type SortKey = "codigo" | "descripcion" | "familia" | "unidadMedida" | "activo";
  const [sortKey, setSortKey] = useState<SortKey>("codigo");
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
      const [prodRes, famRes, uniRes] = await Promise.all([
        fetch(`${API_URL}/productos`, { headers: headers() }),
        fetch(`${API_URL}/familias-productos`, { headers: headers() }),
        fetch(`${API_URL}/unidades-medida`, { headers: headers() }),
      ]);

      if (!prodRes.ok || !famRes.ok || !uniRes.ok) throw new Error("Error al cargar datos");

      const [prodData, famData, uniData] = await Promise.all([
        prodRes.json(),
        famRes.json(),
        uniRes.json(),
      ]);

      setProductos(prodData);
      setFamilias(famData);
      setUnidades(uniData);
    } catch {
      setError("Error al cargar los datos de productos");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());
    fetchData();
  }, [fetchData]);

  const canEdit = user?.rol === 'Administrador' || user?.permissions?.find((p: any) => p.section === 'productos')?.access === 'FULL_ACCESS';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openCreate = () => {
    setForm({
      ...emptyForm,
      familiaId: familias[0]?.id || 0,
      unidadMedidaId: unidades[0]?.id || 0,
    });
    setError("");
    setModal("create");
  };

  const openEdit = (p: Producto) => {
    setSelected(p);
    setForm({
      codigo: p.codigo,
      descripcion: p.descripcion,
      familiaId: p.familiaId,
      unidadMedidaId: p.unidadMedidaId,
      activo: p.activo,
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
      const res = await fetch(`${API_URL}/productos`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al crear producto");
      }
      await fetchData();
      closeModal();
      showSuccess("Producto creado", "El producto ha sido creado correctamente");
    } catch (err: any) {
      showError("Error al crear producto", err.message);
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
      const res = await fetch(`${API_URL}/productos/${selected.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Error al editar producto");
      }
      await fetchData();
      closeModal();
      showSuccess("Producto actualizado", "El producto ha sido actualizado correctamente");
    } catch (err: any) {
      showError("Error al editar producto", err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (p: Producto) => {
    const confirmed = await showConfirm({
      title: `¿${p.activo ? 'Desactivar' : 'Activar'} producto?`,
      text: `¿Estás seguro de que deseas ${p.activo ? 'desactivar' : 'activar'} "${p.descripcion}"?`,
      confirmButtonText: p.activo ? "Sí, desactivar" : "Sí, activar",
      confirmButtonColor: p.activo ? "#ef4444" : "#10b981",
    });

    if (!confirmed) return;

    setOpenDropdownId(null);
    try {
      const res = await fetch(`${API_URL}/productos/${p.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ activo: !p.activo }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      await fetchData();
      showSuccess("Estado actualizado", `El producto ahora está ${!p.activo ? 'activo' : 'inactivo'}`);
    } catch (err: any) {
      showError("Error", err.message);
    }
  };

  const filtered = productos.filter((p) => {
    const matchesSearch = p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "Todos" || (statusFilter === "Activo" ? p.activo : !p.activo);
    const matchesFamilia = familiaFilter === "Todas" || p.familiaId === Number(familiaFilter);
    return matchesSearch && matchesStatus && matchesFamilia;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "activo") cmp = Number(a.activo) - Number(b.activo);
    else if (sortKey === "familia") cmp = a.familia.descripcion.localeCompare(b.familia.descripcion);
    else if (sortKey === "unidadMedida") cmp = a.unidadMedida.descripcion.localeCompare(b.unidadMedida.descripcion);
    else cmp = a[sortKey].localeCompare(b[sortKey]);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleExportExcel = () => {
    const data = sorted.map(p => ({
      Código: p.codigo,
      Descripción: p.descripcion,
      Familia: p.familia.descripcion,
      Unidad: p.unidadMedida.descripcion,
      Estado: p.activo ? "Activo" : "Inactivo",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "productos.xlsx");
  };

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Productos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total de productos registrados: {totalItems}</p>
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
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          <svg className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <select value={familiaFilter} onChange={(e) => setFamiliaFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
          <option value="Todas">Todas las familias</option>
          {familias.map(f => <option key={f.id} value={f.id}>{f.descripcion}</option>)}
        </select>
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
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["codigo", "descripcion", "familia", "unidadMedida", "activo"].map((key) => (
                    <th key={key} onClick={() => handleSort(key as SortKey)} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-white">
                      {key === "activo" ? "Estado" : key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">{p.codigo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{p.descripcion}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.familia.descripcion}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.unidadMedida.descripcion}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${p.activo ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap relative">
                      {canEdit && (
                        <button onClick={() => setOpenDropdownId(openDropdownId === p.id ? null : p.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2">
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                        </button>
                      )}
                      {openDropdownId === p.id && (
                        <div ref={dropdownRef} className="absolute right-6 mt-2 w-48 rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                          <button onClick={() => openEdit(p)} className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700">Editar</button>
                          <button onClick={() => handleToggleStatus(p)} className={`flex w-full items-center px-4 py-2 text-sm ${p.activo ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"}`}>
                            {p.activo ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginated.length === 0 && <div className="p-12 text-center text-gray-500">No se encontraron productos</div>}
        </div>
      )}

      {/* Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 dark:bg-gray-900 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 dark:text-white">{modal === "create" ? "Nuevo Producto" : "Editar Producto"}</h2>
            <form onSubmit={modal === "create" ? handleCreate : handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Código</label>
                <input required value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} className={inputClass} placeholder="P001" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Descripción</label>
                <input required value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className={inputClass} placeholder="Nombre del producto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Familia</label>
                  <select required value={form.familiaId} onChange={e => setForm({...form, familiaId: Number(e.target.value)})} className={inputClass}>
                    {familias.map(f => <option key={f.id} value={f.id}>{f.descripcion}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Unidad de Medida</label>
                  <select required value={form.unidadMedidaId} onChange={e => setForm({...form, unidadMedidaId: Number(e.target.value)})} className={inputClass}>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.descripcion}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="p-activo" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} className="h-4 w-4 rounded text-emerald-600" />
                <label htmlFor="p-activo" className="text-sm dark:text-gray-300">Activo</label>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
