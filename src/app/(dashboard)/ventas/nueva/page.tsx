"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Producto {
  id: number;
  codigo: string;
  descripcion: string;
  precioVenta?: number | string | null;
  unidadMedida?: { descripcion: string };
  activo: boolean;
}
interface Caja { id: number; descripcion: string; }
interface Cliente { id: number; descripcion: string; }

interface LineaProducto {
  productoId: number;
  productoDescripcion: string;
  productoCodigo: string;
  unidadMedida: string;
  cantidad: number;
}

export default function NuevaVentaPage() {
  const router = useRouter();

  // Form fields
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [clienteId, setClienteId] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [monto, setMonto] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Products section
  const [lineas, setLineas] = useState<LineaProducto[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const modalSearchRef = useRef<HTMLInputElement>(null);

  // Metadata
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), []);

  // Load metadata
  useEffect(() => {
    const h = { Authorization: `Bearer ${getToken()}` };
    Promise.all([
      fetch(`${API_URL}/cajas`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/clientes`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/productos`, { headers: h }).then(r => r.json()),
    ]).then(([cajasData, clientesData, productosData]) => {
      setCajas(Array.isArray(cajasData) ? cajasData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : clientesData?.data || []);
      const prods = Array.isArray(productosData) ? productosData : productosData?.data || [];
      setProductos(prods.filter((p: Producto) => p.activo));
    }).catch(console.error);
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (showModal) {
      setTimeout(() => modalSearchRef.current?.focus(), 50);
    } else {
      setModalSearch("");
    }
  }, [showModal]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showModal) setShowModal(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showModal]);

  // Filtered products for modal
  const filteredProductos = productos.filter(p => {
    const q = modalSearch.toLowerCase().trim();
    if (!q) return true;
    return p.descripcion.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
  });

  const addProducto = (p: Producto) => {
    if (lineas.find(l => l.productoId === p.id)) return;
    setLineas(prev => [...prev, {
      productoId: p.id,
      productoDescripcion: p.descripcion,
      productoCodigo: p.codigo,
      unidadMedida: p.unidadMedida?.descripcion || "",
      cantidad: 1,
    }]);
  };

  const toggleProducto = (p: Producto) => {
    const exists = lineas.find(l => l.productoId === p.id);
    if (exists) {
      setLineas(prev => prev.filter(l => l.productoId !== p.id));
    } else {
      addProducto(p);
    }
  };

  const updateCantidad = (idx: number, delta: number) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const nueva = Math.max(1, l.cantidad + delta);
      return { ...l, cantidad: nueva };
    }));
  };

  const setCantidadDirecta = (idx: number, value: string) => {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      setLineas(prev => prev.map((l, i) => i === idx ? { ...l, cantidad: parsed } : l));
    }
  };

  const removeLinea = (idx: number) => {
    setLineas(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!fecha || !clienteId || !cajaId) {
      showError("Campos obligatorios", "Fecha, cliente y caja son obligatorios.");
      return;
    }
    if (!monto || parseFloat(monto) <= 0) {
      showError("Monto inválido", "El monto de la venta debe ser mayor a cero.");
      return;
    }
    if (lineas.length === 0) {
      showError("Sin productos", "Debe agregar al menos un producto.");
      return;
    }
    for (const l of lineas) {
      if (!l.cantidad || l.cantidad <= 0) {
        showError("Cantidad inválida", `La cantidad de "${l.productoDescripcion}" debe ser mayor a 0.`);
        return;
      }
    }

    setSaving(true);
    try {
      const body = {
        fecha,
        monto: parseFloat(monto) || 0,
        observaciones: observaciones || undefined,
        cajaId: parseInt(cajaId),
        clienteId: parseInt(clienteId),
        productos: lineas.map(l => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
        })),
      };

      const res = await fetch(`${API_URL}/ventas`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Error al crear la venta");
      }

      showSuccess("Venta creada", "La venta ha sido registrada correctamente.");
      router.push("/ventas");
    } catch (err: any) {
      showError("Error al crear la venta", err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (n: number) =>
    `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/ventas")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Nueva Venta</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Completá los datos y agregá los productos</p>
        </div>
      </div>


      {/* ─── Datos de la venta ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Datos de la venta</h2>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Fecha de la venta <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 transition-all"
            />
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Cliente <span className="text-red-500">*</span>
            </label>
            <select
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 transition-all"
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
            </select>
          </div>

          {/* Caja */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Caja <span className="text-red-500">*</span>
            </label>
            <select
              value={cajaId}
              onChange={e => setCajaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 transition-all"
            >
              <option value="">Seleccionar caja...</option>
              {cajas.map(c => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
            </select>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Monto
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400 font-medium">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 transition-all"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Observaciones</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas adicionales sobre la venta..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* ─── Productos ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Productos</h2>
          <span className="ml-1 text-xs text-gray-400">{lineas.length} ítem{lineas.length !== 1 ? "s" : ""}</span>

          {/* Botón Agregar Producto */}
          <button
            onClick={() => setShowModal(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar producto
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Tabla de líneas */}
          {lineas.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {["Producto", "Unidad", "Cantidad", ""].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {lineas.map((l, idx) => (
                    <tr key={l.productoId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{l.productoDescripcion}</p>
                          <p className="text-xs text-gray-400">{l.productoCodigo}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {l.unidadMedida || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateCantidad(idx, -1)}
                            disabled={l.cantidad <= 1}
                            className="h-7 w-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={l.cantidad}
                            onChange={e => setCantidadDirecta(idx, e.target.value)}
                            className="w-14 rounded-lg border border-gray-300 px-1 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => updateCantidad(idx, 1)}
                            className="h-7 w-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => removeLinea(idx)}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          title="Quitar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-10 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all group"
              onClick={() => setShowModal(true)}
            >
              <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3 group-hover:text-emerald-400 dark:group-hover:text-emerald-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Hacé clic en <span className="font-semibold">Agregar producto</span> para comenzar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Total y acciones ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {lineas.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{lineas.reduce((s, l) => s + l.cantidad, 0)}</span> unidades · {lineas.length} producto{lineas.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/ventas")}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirmar venta
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Modal Selección de Productos ─── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "85vh" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Seleccionar productos</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lineas.length > 0
                      ? `${lineas.length} producto${lineas.length !== 1 ? "s" : ""} seleccionado${lineas.length !== 1 ? "s" : ""}`
                      : "Ningún producto seleccionado"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  ref={modalSearchRef}
                  type="text"
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 transition-all"
                />
                {modalSearch && (
                  <button
                    onClick={() => setModalSearch("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {modalSearch && (
                <p className="mt-2 text-xs text-gray-400">
                  {filteredProductos.length} resultado{filteredProductos.length !== 1 ? "s" : ""} para &quot;{modalSearch}&quot;
                </p>
              )}
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto">
              {filteredProductos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <svg className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No se encontraron productos</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Intentá con otro nombre o código</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredProductos.map(p => {
                    const isSelected = !!lineas.find(l => l.productoId === p.id);
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => toggleProducto(p)}
                          className={`w-full flex items-center gap-4 px-6 py-3.5 text-left transition-all ${
                            isSelected
                              ? "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          }`}
                        >
                          {/* Checkbox visual */}
                          <div className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-gray-300 dark:border-gray-600"
                          }`}>
                            {isSelected && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${
                              isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                            }`}>
                              {p.descripcion}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400 font-mono">{p.codigo}</span>
                              {p.unidadMedida && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">·</span>
                                  <span className="text-xs text-gray-400">{p.unidadMedida.descripcion}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="shrink-0 text-right">
                            {p.precioVenta ? (
                              <span className={`text-sm font-bold ${
                                isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                              }`}>
                                {formatMoney(Number(p.precioVenta))}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Sin precio</span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs text-gray-400">
                {filteredProductos.length} de {productos.length} producto{productos.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirmar selección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
