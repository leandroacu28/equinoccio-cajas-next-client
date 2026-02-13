"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function EditarMovimientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cajas, setCajas] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    fecha: "",
    monto: "",
    observaciones: "",
    cajaOrigenId: "",
    cajaDestinoId: "",
    activo: true,
  });

  const [metaData, setMetaData] = useState({
    createdAt: "",
    creatorName: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${getToken()}` };
      
      const [cRes, mRes] = await Promise.all([
        fetch(`${API_URL}/cajas`, { headers }),
        fetch(`${API_URL}/movimientos-internos/${id}`, { headers }),
      ]);

      if (!mRes.ok) throw new Error("Movimiento no encontrado");

      const movimientoData = await mRes.json();
      const cajasData = await cRes.json();

      setCajas(cajasData);

      setFormData({
        fecha: new Date(movimientoData.fecha).toISOString().split("T")[0],
        monto: movimientoData.monto.toString(),
        observaciones: movimientoData.observaciones || "",
        cajaOrigenId: movimientoData.cajaOrigenId.toString(),
        cajaDestinoId: movimientoData.cajaDestinoId.toString(),
        activo: movimientoData.activo,
      });

      setMetaData({
        createdAt: new Date(movimientoData.createdAt).toLocaleString("es-AR"),
        creatorName: `${movimientoData.creatorUser.nombre} ${movimientoData.creatorUser.apellido}`,
      });
    } catch (err: any) {
      showError("Error", err.message);
      router.push("/movimientos-internos");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.cajaOrigenId === formData.cajaDestinoId) {
      showError("Error", "La caja de origen y destino no pueden ser la misma");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/movimientos-internos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...formData,
          monto: parseFloat(formData.monto),
          cajaOrigenId: parseInt(formData.cajaOrigenId),
          cajaDestinoId: parseInt(formData.cajaDestinoId),
        }),
      });

      if (res.ok) {
        showSuccess("Éxito", "Movimiento actualizado correctamente");
        router.push("/movimientos-internos");
      } else {
        const error = await res.json();
        throw new Error(error.message || "Error al actualizar movimiento");
      }
    } catch (err: any) {
      showError("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Editar Movimiento #{id}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Actualizar información de transferencia</p>
        </div>
        <Link
          href="/movimientos-internos"
          className="text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          Volver
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden text-left">
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Meta Data (Read Only) */}
            <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-left">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Fecha de Alta
              </label>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {metaData.createdAt}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-left">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Usuario Creador
              </label>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {metaData.creatorName}
              </p>
            </div>

            {/* Fecha */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Fecha del Movimiento
              </label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-left"
              />
            </div>

            {/* Caja Origen */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Caja Origen
              </label>
              <select
                required
                value={formData.cajaOrigenId}
                onChange={(e) => setFormData({ ...formData, cajaOrigenId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer font-left"
              >
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>{c.descripcion}</option>
                ))}
              </select>
            </div>

            {/* Caja Destino */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Caja Destino
              </label>
              <select
                required
                value={formData.cajaDestinoId}
                onChange={(e) => setFormData({ ...formData, cajaDestinoId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer font-left"
              >
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>{c.descripcion}</option>
                ))}
              </select>
            </div>

            {/* Monto */}
            <div className="md:col-span-2 text-left">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide opacity-80">
                Monto
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 pl-8 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2 text-left">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Observaciones
              </label>
              <textarea
                rows={3}
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all resize-none font-left"
              />
            </div>

            {/* Estado */}
            <div className="md:col-span-2 text-left">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Movimiento Habilitado</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 font-left">
          <Link
            href="/movimientos-internos"
            className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Actualizar Movimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}
