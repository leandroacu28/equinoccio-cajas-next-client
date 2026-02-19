"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Caja { id: number; descripcion: string; }
interface Cliente { id: number; descripcion: string; }
interface VentaProducto {
  id: number;
  cantidad: number;
  precioUnitario: number;
  producto: {
    id: number;
    codigo: string;
    descripcion: string;
    unidadMedida?: { descripcion: string };
  };
}

export default function EditarVentaPage() {
  const router = useRouter();
  const params = useParams();
  const ventaId = Number(params.id);

  // Form fields (editables)
  const [fecha, setFecha] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Read-only info
  const [montoOriginal, setMontoOriginal] = useState<number | null>(null);
  const [productos, setProductos] = useState<VentaProducto[]>([]);

  // Metadata
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), []);

  // Load metadata + venta data
  useEffect(() => {
    const h = { Authorization: `Bearer ${getToken()}` };
    Promise.all([
      fetch(`${API_URL}/cajas`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/clientes`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/ventas/${ventaId}`, { headers: h }).then(r => r.json()),
    ]).then(([cajasData, clientesData, ventaData]) => {
      setCajas(Array.isArray(cajasData) ? cajasData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : clientesData?.data || []);

      if (ventaData && !ventaData.statusCode) {
        setFecha(ventaData.fecha ? ventaData.fecha.split("T")[0] : "");
        setClienteId(String(ventaData.cliente?.id ?? ""));
        setCajaId(String(ventaData.caja?.id ?? ""));
        setObservaciones(ventaData.observaciones ?? "");
        setMontoOriginal(Number(ventaData.monto ?? 0));
        setProductos(ventaData.productos ?? []);
      } else {
        showError("Error", `No se encontró la venta #${ventaId}`);
        router.push("/ventas");
      }
    }).catch(err => {
      showError("Error al cargar datos", err.message);
    }).finally(() => setLoading(false));
  }, [ventaId, router]);

  const handleSubmit = async () => {
    if (!fecha || !clienteId || !cajaId) {
      showError("Campos obligatorios", "Fecha, cliente y caja son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        fecha,
        observaciones: observaciones || undefined,
        cajaId: parseInt(cajaId),
        clienteId: parseInt(clienteId),
      };

      const res = await fetch(`${API_URL}/ventas/${ventaId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Error al actualizar la venta");
      }

      showSuccess("Venta actualizada", "Los cambios han sido guardados correctamente.");
      router.push("/ventas");
    } catch (err: any) {
      showError("Error al actualizar la venta", err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (n: number) =>
    `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalUnidades = productos.reduce((s, vp) => s + vp.cantidad, 0);

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-4 w-64 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm h-64 animate-pulse" />
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm h-48 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Detalle de Venta</h1>
            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
              #{ventaId}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Editá los datos de la venta</p>
        </div>
      </div>

      {/* ─── Resumen de solo lectura ─── */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Monto</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {montoOriginal !== null ? formatMoney(montoOriginal) : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Productos</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {productos.length} ítem{productos.length !== 1 ? "s" : ""} · {totalUnidades} unidad{totalUnidades !== 1 ? "es" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-xs text-gray-400">Monto y productos no editables</span>
        </div>
      </div>

      {/* ─── Datos editables ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Datos editables</h2>
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

          {/* Observaciones — ocupa toda la fila */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Observaciones</label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas adicionales sobre la venta..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* ─── Productos (solo lectura) ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Productos</h2>
          <span className="ml-1 text-xs text-gray-400">
            {productos.length} ítem{productos.length !== 1 ? "s" : ""}
          </span>
          {/* Indicador solo lectura */}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Solo lectura
          </span>
        </div>

        {productos.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <svg className="mx-auto h-10 w-10 text-gray-200 dark:text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm text-gray-400 dark:text-gray-500">Esta venta no tiene productos cargados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["Producto", "Código", "Unidad", "Cantidad"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {productos.map((vp, idx) => (
                  <tr
                    key={vp.id ?? idx}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {vp.producto?.descripcion ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {vp.producto?.codigo ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {vp.producto?.unidadMedida?.descripcion ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400 min-w-[2.5rem]">
                        {vp.cantidad}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer con totales */}
              <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                    Total unidades
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-sm font-bold text-blue-700 dark:text-blue-400 min-w-[2.5rem]">
                      {totalUnidades}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ─── Acciones ─── */}
      <div className="flex items-center justify-end gap-3 pb-4">
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
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
