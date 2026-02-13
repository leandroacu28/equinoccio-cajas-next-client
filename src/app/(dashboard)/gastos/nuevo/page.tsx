"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NuevoGastoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cajas, setCajas] = useState<any[]>([]);
  const [tiposGasto, setTiposGasto] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    factura: "SinFactura",
    monto: "",
    observaciones: "",
    cajaId: "",
    tipoGastoId: "",
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const [cRes, tRes] = await Promise.all([
          fetch(`${API_URL}/cajas`, { headers }),
          fetch(`${API_URL}/tipos-gasto`, { headers }),
        ]);
        if (cRes.ok) setCajas((await cRes.json()).filter((c: any) => c.activo));
        if (tRes.ok) setTiposGasto((await tRes.json()).filter((t: any) => t.activo));
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cajaId || !formData.tipoGastoId || !formData.monto || !formData.fecha) {
      showError("Error", "Por favor complete todos los campos obligatorios");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/gastos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...formData,
          monto: parseFloat(formData.monto),
          cajaId: parseInt(formData.cajaId),
          tipoGastoId: parseInt(formData.tipoGastoId),
        }),
      });

      if (res.ok) {
        showSuccess("Éxito", "Gasto registrado correctamente");
        router.push("/gastos");
      } else {
        const error = await res.json();
        throw new Error(error.message || "Error al registrar gasto");
      }
    } catch (err: any) {
      showError("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Nuevo Gasto</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registrar un nuevo egreso de caja</p>
        </div>
        <Link
          href="/gastos"
          className="text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          Cancelar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden text-left">
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fecha */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Fecha del Gasto <span className="text-rose-500">*</span>
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
                Factura <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.factura}
                onChange={(e) => setFormData({ ...formData, factura: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
              >
                <option value="SinFactura">Sin Factura</option>
                <option value="ConFactura">Con Factura</option>
              </select>
            </div>

            {/* Caja */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Caja <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.cajaId}
                onChange={(e) => setFormData({ ...formData, cajaId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
              >
                <option value="">Seleccionar caja...</option>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>{c.descripcion}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Gasto */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Gasto <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.tipoGastoId}
                onChange={(e) => setFormData({ ...formData, tipoGastoId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
              >
                <option value="">Seleccionar tipo...</option>
                {tiposGasto.map((t) => (
                  <option key={t.id} value={t.id}>{t.descripcion}</option>
                ))}
              </select>
            </div>

            {/* Monto */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Monto <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 pl-8 pr-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all"
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
                placeholder="Detalle del gasto..."
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all resize-none"
              />
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
            disabled={loading}
            className="px-8 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            {loading ? "Registrando..." : "Guardar Gasto"}
          </button>
        </div>
      </form>
    </div>
  );
}
