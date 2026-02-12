"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InitPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleInit = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/init`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al inicializar");
      }

      setStatus("success");
      setMessage(`Usuario "${data.user.username}" creado correctamente`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Error al inicializar");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center dark:bg-gray-900">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Inicialización
        </h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Crea el usuario inicial del sistema para poder acceder.
        </p>

        {status === "success" ? (
          <div>
            <p className="mb-4 text-sm text-green-600 dark:text-green-400">{message}</p>
            <button
              onClick={() => router.push("/login")}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Ir al Login
            </button>
          </div>
        ) : (
          <div>
            {status === "error" && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{message}</p>
            )}
            <button
              onClick={handleInit}
              disabled={status === "loading"}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {status === "loading" ? "Inicializando..." : "Inicializar Usuario"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
