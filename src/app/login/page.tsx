"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, setToken, setUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(username, password);
      setToken(data.access_token);
      setUser(data.user);
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-gray-950 relative font-sans">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Left Decoration Section */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-700 to-emerald-950 overflow-hidden items-center px-16">
        <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-10"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-800/20 rounded-full blur-3xl" />

        <div className="relative z-20 text-white max-w-lg">
          <div className="mb-8">
            <h2 className="text-5xl font-bold tracking-tight mb-1">Equinoccio</h2>
            <h2 className="text-2xl font-light tracking-[0.3em] uppercase text-emerald-200">Cajas</h2>
          </div>

          <h1 className="text-4xl font-bold mb-6 leading-tight">
            Sistema de Control Integral de Cajas
          </h1>

          <p className="text-lg text-emerald-100 leading-relaxed font-light">
            Plataforma integral para el control, registro y seguimiento de ingresos, egresos, ventas y movimientos entre cajas.
          </p>
        </div>
      </div>

      {/* Right Login Form Section */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-[450px] flex flex-col items-center">

          {/* Main Card */}
          <div className="w-full bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl p-10 ">

            {/* Header Logo & Icon */}
            <div className="flex flex-col items-center mb-8">
              <div className="text-center mb-6">
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">Equinoccio</span>
                <br />
                <span className="text-sm tracking-[0.25em] font-medium text-gray-500 dark:text-gray-400 uppercase">Cajas</span>
              </div>

              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 ring-1 ring-emerald-100 dark:ring-emerald-800">
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Iniciar Sesión</h2>
              <p className="text-sm text-gray-400 mt-2 font-medium">Ingresa con tus credenciales asignadas</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1" htmlFor="username">
                    Usuario
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
                    placeholder="usuario"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1" htmlFor="password">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-4 border border-red-100 dark:border-red-800">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-600/30 text-sm font-bold text-white uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verificando...</span>
                  </div>
                ) : (
                  "Iniciar Sesión"
                )}
              </button>

              <div className="text-center pt-2">
                <a href="#" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                  ¿Problemas para ingresar? <span className="font-bold">Contactar Soporte</span>
                </a>
              </div>
            </form>
          </div>

          {/* Footer Copyright */}
          <div className="mt-12 text-center opacity-60">
            <div className="flex justify-center space-x-1 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-300"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
              Equinoccio Distribuidoras &copy; 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
