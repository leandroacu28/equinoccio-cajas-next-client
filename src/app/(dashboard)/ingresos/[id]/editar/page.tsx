"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { showSuccess, showError } from "@/lib/alerts";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Caja {
  id: number;
  descripcion: string;
  saldo: number;
}

interface TipoIngreso {
  id: number;
  descripcion: string;
}

export default function EditarIngresoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [tiposIngreso, setTiposIngreso] = useState<TipoIngreso[]>([]);

  const [form, setForm] = useState({
    fecha: "",
    cajaId: "",
    tipoIngresoId: "",
    monto: "",
    observaciones: "",
    activo: true,
  });

  const [metaData, setMetaData] = useState({
    createdAt: "",
    creatorName: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [cajasRes, tiposRes, ingresoRes] = await Promise.all([
          fetch(`${API_URL}/cajas`, { headers }),
          fetch(`${API_URL}/tipos-ingreso`, { headers }),
          fetch(`${API_URL}/ingresos/${id}`, { headers }),
        ]);

        if (cajasRes.ok) setCajas(await cajasRes.json());
        if (tiposRes.ok) setTiposIngreso(await tiposRes.json());
        
        if (ingresoRes.ok) {
          const data = await ingresoRes.json();
          setForm({
            fecha: new Date(data.fecha).toISOString().split("T")[0],
            cajaId: data.cajaId.toString(),
            tipoIngresoId: data.tipoIngresoId.toString(),
            monto: data.monto.toString(),
            observaciones: data.observaciones || "",
            activo: data.activo,
          });
          setMetaData({
            createdAt: new Date(data.createdAt).toLocaleString("es-AR"),
            creatorName: `${data.creatorUser.nombre} ${data.creatorUser.apellido}`,
          });
        } else {
          showError("Error", "No se pudo cargar el ingreso");
          router.push("/ingresos");
        }
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/ingresos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...form,
          cajaId: parseInt(form.cajaId),
          tipoIngresoId: parseInt(form.tipoIngresoId),
          monto: parseFloat(form.monto),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al actualizar ingreso");
      }

      showSuccess("Éxito", "Ingreso actualizado correctamente");
      router.push("/ingresos");
    } catch (err: any) {
      showError("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all outline-none";
  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1 text-left";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Editar Ingreso</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Actualiza los datos del ingreso #{id}</p>
        </div>
        <Link 
          href="/ingresos"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Regresar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm space-y-8">
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

          <div className="md:col-span-1">
            <label className={labelClass}>Fecha de Ingreso <span className="text-red-500">*</span></label>
            <input 
              required 
              type="date"
              value={form.fecha} 
              onChange={e => setForm({...form, fecha: e.target.value})} 
              className={inputClass}
            />
          </div>

          <div className="md:col-span-1">
            <label className={labelClass}>Monto <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input 
                required 
                type="number"
                step="0.01"
                min="0"
                value={form.monto} 
                onChange={e => setForm({...form, monto: e.target.value})} 
                className={`${inputClass} pl-8`}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="md:col-span-1 text-left">
            <label className={labelClass}>Caja <span className="text-red-500">*</span></label>
            <select 
              required 
              value={form.cajaId} 
              onChange={e => setForm({...form, cajaId: e.target.value})} 
              className={inputClass}
            >
              <option value="">Seleccione una caja...</option>
              {cajas.filter(c => (c as any).activo !== false || c.id.toString() === form.cajaId).map(c => (
                <option key={c.id} value={c.id}>{c.descripcion}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1 text-left">
            <label className={labelClass}>Tipo de Ingreso <span className="text-red-500">*</span></label>
            <select 
              required 
              value={form.tipoIngresoId} 
              onChange={e => setForm({...form, tipoIngresoId: e.target.value})} 
              className={inputClass}
            >
              <option value="">Seleccione tipo...</option>
              {tiposIngreso.filter(t => (t as any).activo !== false || t.id.toString() === form.tipoIngresoId).map(t => (
                <option key={t.id} value={t.id}>{t.descripcion}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Observaciones</label>
            <textarea 
              value={form.observaciones} 
              onChange={e => setForm({...form, observaciones: e.target.value})} 
              className={`${inputClass} min-h-[100px] resize-none`}
              placeholder="Detalles adicionales sobre el ingreso..."
            />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <Link
            href="/ingresos"
            className="px-6 py-3 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center"
          >
            Cancelar
          </Link>
          <button 
            type="submit" 
            disabled={saving}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 hover:-translate-y-0.5"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
