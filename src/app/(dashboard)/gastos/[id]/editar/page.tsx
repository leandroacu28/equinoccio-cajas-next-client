"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function EditarGastoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cajas, setCajas] = useState<any[]>([]);
  const [tiposGasto, setTiposGasto] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    fecha: "",
    factura: "SinFactura" as "SinFactura" | "ConFactura",
    monto: "",
    observaciones: "",
    cajaId: "",
    tipoGastoId: "",
    activo: true,
    fullFecha: "",
  });

  const [metaData, setMetaData] = useState({
    createdAt: "",
    creatorName: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${getToken()}` };
      
      const [cRes, tRes, gRes] = await Promise.all([
        fetch(`${API_URL}/cajas`, { headers }),
        fetch(`${API_URL}/tipos-gasto`, { headers }),
        fetch(`${API_URL}/gastos/${id}`, { headers }),
      ]);

      if (!gRes.ok) throw new Error("Gasto no encontrado");

      const gastoData = await gRes.json();
      const cajasData = await cRes.json();
      const tiposData = await tRes.json();

      setCajas(cajasData);
      setTiposGasto(tiposData);

      setFormData({
        fecha: new Date(gastoData.fecha).toISOString().split("T")[0],
        fullFecha: gastoData.fecha,
        factura: gastoData.factura as "SinFactura" | "ConFactura",
        monto: gastoData.monto.toString(),
        observaciones: gastoData.observaciones || "",
        cajaId: gastoData.cajaId.toString(),
        tipoGastoId: gastoData.tipoGastoId.toString(),
        activo: gastoData.activo,
      });

      setMetaData({
        createdAt: new Date(gastoData.createdAt).toLocaleString("es-AR"),
        creatorName: `${gastoData.creatorUser.nombre} ${gastoData.creatorUser.apellido}`,
      });
    } catch (err: any) {
      showError("Error", err.message);
      router.push("/gastos");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/gastos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...formData,
          fecha: (() => {
            const datePart = new Date(formData.fullFecha).toISOString().split("T")[0];
            if (formData.fecha === datePart) {
              return formData.fullFecha;
            } else {
              const now = new Date();
              const timeString = now.toTimeString().split(' ')[0];
              return new Date(`${formData.fecha}T${timeString}`).toISOString();
            }
          })(),
          monto: parseFloat(formData.monto),
          cajaId: parseInt(formData.cajaId),
          tipoGastoId: parseInt(formData.tipoGastoId),
        }),
      });

      if (res.ok) {
        showSuccess("Éxito", "Gasto actualizado correctamente");
        router.push("/gastos");
      } else {
        const error = await res.json();
        throw new Error(error.message || "Error al actualizar gasto");
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Editar Gasto #{id}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Actualizar información del registro</p>
        </div>
        <Link
          href="/gastos"
          className="text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          Volver
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta Data (Read Only) */}
            <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Fecha de Alta
              </label>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {metaData.createdAt}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Usuario Creador
              </label>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {metaData.creatorName}
              </p>
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Fecha del Gasto
              </label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>

            {/* Factura */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Factura
              </label>
              <select
                required
                value={formData.factura}
                onChange={(e) => setFormData({ ...formData, factura: e.target.value as "SinFactura" | "ConFactura" })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
              >
                <option value="SinFactura">Sin Factura</option>
                <option value="ConFactura">Con Factura</option>
              </select>
            </div>

            {/* Caja */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Caja <span className="text-xs font-normal text-gray-500">(No editable)</span>
              </label>
              <select
                disabled
                value={formData.cajaId}
                onChange={(e) => setFormData({ ...formData, cajaId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-not-allowed opacity-60"
              >
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>{c.descripcion}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Gasto */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Gasto
              </label>
              <select
                required
                value={formData.tipoGastoId}
                onChange={(e) => setFormData({ ...formData, tipoGastoId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
              >
                {tiposGasto.map((t) => (
                  <option key={t.id} value={t.id}>{t.descripcion}</option>
                ))}
              </select>
            </div>

            {/* Monto */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Monto <span className="text-xs font-normal text-gray-500">(No editable)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  disabled
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl py-3 pl-8 pr-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-not-allowed opacity-60"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Observaciones
              </label>
              <textarea
                rows={3}
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all resize-none"
              />
            </div>

            {/* Estado */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Registro Habilitado</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <Link
            href="/gastos"
            className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Actualizar Gasto"}
          </button>
        </div>
      </form>
    </div>
  );
}
