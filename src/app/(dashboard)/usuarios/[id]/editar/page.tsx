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
  activo: boolean;
  creatorUser?: {
    id: number;
    nombre: string;
    apellido: string;
    rol: string;
  };
}

export default function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [showCajasModal, setShowCajasModal] = useState(false);
  const [selectedCaja, setSelectedCaja] = useState<Caja | null>(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    apellido: "",
    nombre: "",
    dni: "",
    rol: "Empleado",
    activo: true,
  });

  useEffect(() => {
    if (id) {
      fetchData();
      fetchCajas();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
         if (res.status === 404) throw new Error("Usuario no encontrado");
         throw new Error("Error al cargar datos del usuario");
      }
      
      const data = await res.json();
      setForm({
        username: data.username || "",
        email: data.email || "",
        apellido: data.apellido || "",
        nombre: data.nombre || "",
        dni: data.dni || "",
        rol: data.rol || "Empleado",
        activo: data.activo ?? true,
      });

      // Si el usuario tiene cajas asociadas, mostramos la primera como "asignada"
      if (data.assignedCajas && data.assignedCajas.length > 0) {
        setSelectedCaja(data.assignedCajas[0]);
      }
    } catch (err: any) {
      console.error("Error fetching user:", err);
      showError("Error", err.message);
      router.push("/usuarios");
    } finally {
      setLoading(false);
    }
  };

  const fetchCajas = async () => {
    try {
      const res = await fetch(`${API_URL}/cajas`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCajas(data.filter((c: Caja) => c.activo));
      }
    } catch (err) {
      console.error("Error fetching cajas", err);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...form, cajaId: selectedCaja ? selectedCaja.id : null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al actualizar usuario");
      }

      showSuccess("Éxito", "Usuario actualizado correctamente");
      router.push("/usuarios");
    } catch (err: any) {
      showError("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all outline-none";
  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1";

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between text-left">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Editando usuario</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Actualiza la información del perfil del usuario</p>
        </div>
        <Link 
          href="/usuarios"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Regresar
        </Link>
      </div>

      <form onSubmit={handleEdit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Nombre de usuario</label>
                <input 
                  required 
                  value={form.username} 
                  onChange={e => setForm({...form, username: e.target.value})} 
                  className={inputClass} 
                  placeholder="ej: jdoe"
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input 
                  required 
                  type="email"
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                  className={inputClass} 
                  placeholder="ej: juan@ejemplo.com"
                />
              </div>
              <div>
                <label className={labelClass}>Apellido</label>
                <input 
                  required 
                  value={form.apellido} 
                  onChange={e => setForm({...form, apellido: e.target.value})} 
                  className={inputClass} 
                  placeholder="Apellido del usuario"
                />
              </div>
              <div>
                <label className={labelClass}>Nombre</label>
                <input 
                  required 
                  value={form.nombre} 
                  onChange={e => setForm({...form, nombre: e.target.value})} 
                  className={inputClass} 
                  placeholder="Nombre del usuario"
                />
              </div>
              <div>
                <label className={labelClass}>DNI</label>
                <input 
                  required 
                  value={form.dni} 
                  onChange={e => setForm({...form, dni: e.target.value})} 
                  className={inputClass} 
                  placeholder="Documento Nacional de Identidad"
                />
              </div>
              <div>
                <label className={labelClass}>Rol</label>
                <select 
                  required 
                  value={form.rol} 
                  onChange={e => setForm({...form, rol: e.target.value})} 
                  className={inputClass}
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Empleado">Usuario estándar</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button 
                type="submit" 
                disabled={saving}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 hover:-translate-y-0.5"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Cards */}
        <div className="space-y-6">
          {/* Card 1 - Preview */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm overflow-hidden relative text-left">
             <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
             <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xl">
                  {form.nombre && form.apellido ? (form.nombre[0] + form.apellido[0]).toUpperCase() : "U"}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {form.apellido || form.nombre ? `${form.apellido}, ${form.nombre}` : "Apellido, Nombre"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{form.username || "nombre_usuario"}</p>
                </div>
             </div>
             <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {form.email || "correo_electronico@ejemplo.com"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {form.rol === "Empleado" ? "Usuario estándar" : form.rol}
                </div>
             </div>
          </div>

          {/* Card 2 - User Box */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm overflow-hidden text-left">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Caja de Usuario
            </h3>
            
            {selectedCaja ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/50 space-y-2">
                <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{selectedCaja.descripcion}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Saldo actual: ${Number(selectedCaja.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                <button 
                  type="button" 
                  onClick={() => setSelectedCaja(null)}
                  className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline mt-2 flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Quitar asignación
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">No hay una caja asignada</div>
                <button 
                  type="button"
                  onClick={() => setShowCajasModal(true)}
                  className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar Cajas
                </button>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Cajas Selection Modal */}
      {showCajasModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 text-left">
              <h3 className="font-bold text-gray-900 dark:text-white">Seleccionar Caja</h3>
              <button onClick={() => setShowCajasModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-2 text-left">
              {cajas.length === 0 ? (
                <div className="p-8 text-center text-gray-500 italic">No hay cajas disponibles</div>
              ) : (
                cajas.map(c => {
                  const isAssignedToOther = c.creatorUser && c.creatorUser.rol === "Empleado" && c.creatorUser.id !== Number(id);
                  return (
                    <button 
                      key={c.id}
                      disabled={isAssignedToOther}
                      onClick={() => { 
                        if (isAssignedToOther) {
                          showError("Caja ocupada", `Esta caja ya está asignada al usuario ${c.creatorUser?.nombre} ${c.creatorUser?.apellido}`);
                          return;
                        }
                        setSelectedCaja(c); 
                        setShowCajasModal(false); 
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all group relative ${
                        isAssignedToOther 
                        ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed" 
                        : "border-gray-100 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`font-semibold ${isAssignedToOther ? "text-gray-500" : "text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400"}`}>
                            {c.descripcion}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Saldo: ${Number(c.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        {isAssignedToOther && (
                          <div className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-100">
                             Asignada a: {c.creatorUser?.nombre} {c.creatorUser?.apellido}
                          </div>
                        )}
                        {c.creatorUser?.id === Number(id) && (
                          <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-100">
                             Tu caja actual
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
               <button 
                 onClick={() => setShowCajasModal(false)}
                 className="w-full py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
               >
                 Regresar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
