"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-white dark:bg-gray-900 rounded-3xl p-8 relative overflow-hidden">

      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl animate-fade-in-up">

        {/* Large Icon */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-20 rounded-full"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 ring-4 ring-white dark:ring-gray-800">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>

        {/* Welcome Text */}
        <span className="text-gray-500 dark:text-gray-400 font-medium text-lg mb-2">Bienvenido al</span>

        {/* Main Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-gray-900 dark:text-white leading-tight">
          Sistema de <span className="text-emerald-600">Gestión Integral</span>
        </h1>

        {/* Subtitle / Brand */}
        <p className="text-xs font-bold tracking-[0.25em] text-blue-900 dark:text-blue-400 uppercase mb-6 opacity-80">
          Equinoccio Cajas
        </p>

        {/* Description */}
        <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed max-w-lg mb-10">
          Gestiona pedidos, inventario, clientes y reportes de manera eficiente desde este panel centralizado.
        </p>

      </div>
    </div>
  );
}
