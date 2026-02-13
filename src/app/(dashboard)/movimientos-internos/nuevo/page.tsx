"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cajas, setCajas] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    monto: "",
    observaciones: "",
    cajaOrigenId: "",
    cajaDestinoId: "",
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const res = await fetch(`${API_URL}/cajas`, { headers });
        if (res.ok) {
          const allCajas = await res.json();
          setCajas(allCajas.filter((c: any) => c.activo));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cajaOrigenId || !formData.cajaDestinoId || !formData.monto || !formData.fecha) {
      showError("Error", "Por favor complete todos los campos obligatorios");
      return;
    }

    if (formData.cajaOrigenId === formData.cajaDestinoId) {
      showError("Error", "La caja de origen y destino no pueden ser la misma");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/movimientos-internos`, {
        method: "POST",
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
        showSuccess("Éxito", "Movimiento registrado correctamente");
        router.push("/movimientos-internos");
      } else {
        const error = await res.json();
        throw new Error(error.message || "Error al registrar movimiento");
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight text-left">Nuevo Movimiento Interno</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-left">Transferir fondos entre cajas</p>
        </div>
        <Link
          href="/movimientos-internos"
          className="text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          Cancelar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden text-left">
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fecha */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Fecha del Movimiento <span className="text-blue-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Caja Origen */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Caja Origen <span className="text-blue-500">*</span>
              </label>
              <select
                required
                value={formData.cajaOrigenId}
                onChange={(e) => setFormData({ ...formData, cajaOrigenId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="">Seleccionar origen...</option>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>{c.descripcion}</option>
                ))}
              </select>
            </div>

            {/* Caja Destino */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Caja Destino <span className="text-blue-500">*</span>
              </label>
              <select
                required
                value={formData.cajaDestinoId}
                onChange={(e) => setFormData({ ...formData, cajaDestinoId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="">Seleccionar destino...</option>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>{c.descripcion}</option>
                ))}
              </select>
            </div>

            {/* Monto */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Monto a Transferir <span className="text-blue-500">*</span>
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
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 pl-8 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold"
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
                placeholder="Detalle del movimiento (ej: reposición de caja chica)..."
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <Link
            href="/movimientos-internos"
            className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {loading ? "Registrando..." : "Guardar Movimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}
