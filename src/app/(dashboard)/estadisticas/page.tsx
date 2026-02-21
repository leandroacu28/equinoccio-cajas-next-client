"use client";

import { useState, useEffect } from "react";
import { getToken } from "@/lib/auth";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";

const COLORS = ['#10B981', '#F43F5E', '#3B82F6', '#F59E0B', '#8B5CF6', '#14B8A6', '#EC4899', '#6366F1'];

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface EstadisticasGastos {
  total: number;
  cantidad: number;
  promedio: number;
  chartData: {
    name: string;
    value: number;
  }[];
}

interface EstadisticasIngresos {
  total: number;
  cantidad: number;
  promedio: number;
  chartData: {
    name: string;
    value: number;
  }[];
}

interface EstadisticasVentas {
  total: number;
  cantidad: number;
  promedio: number;
  chartData: {
    name: string;
    value: number;
  }[];
}

interface EstadisticasProductos {
  total: number;
  cantidad: number;
  promedio: number;
  totalVentas: number;
  chartData: {
    name: string;
    value: number;
  }[];
}

interface EstadisticasBalance {
  totalIngresos: number;
  totalGastos: number;
  totalVentas: number;
  totalBalance: number;
  chartData: {
    name: string;
    balanceDiario: number;
    balanceAcumulado: number;
  }[];
}

type TabType = 'gastos' | 'ingresos' | 'ventas' | 'productos' | 'balance';

export default function EstadisticasPage() {
  const [activeTab, setActiveTab] = useState<TabType>('gastos');
  const [gastosData, setGastosData] = useState<EstadisticasGastos | null>(null);
  const [ingresosData, setIngresosData] = useState<EstadisticasIngresos | null>(null);
  const [ventasData, setVentasData] = useState<EstadisticasVentas | null>(null);
  const [productosData, setProductosData] = useState<EstadisticasProductos | null>(null);
  const [balanceData, setBalanceData] = useState<EstadisticasBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<string>('mes');
  const [customDesde, setCustomDesde] = useState<string>('');
  const [customHasta, setCustomHasta] = useState<string>('');

  // Tabs structure
  const tabs = [
    { id: 'gastos', label: 'Gastos' },
    { id: 'ingresos', label: 'Ingresos' },
    { id: 'ventas', label: 'Ventas' },
    { id: 'productos', label: 'Productos' },
    { id: 'balance', label: 'Balance' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  useEffect(() => {
    if (filterType === 'personalizado' && (!customDesde || !customHasta)) {
      return; 
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        let fromDate = '';
        let toDate = '';

        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        if (filterType === 'dia') {
          fromDate = formatDate(today);
          toDate = formatDate(today);
        } else if (filterType === 'semana') {
          const firstDay = new Date(today);
          const day = firstDay.getDay() || 7; // Get current day number, converting Sun. to 7
          if (day !== 1) firstDay.setHours(-24 * (day - 1)); 
          const lastDay = new Date(firstDay);
          lastDay.setDate(firstDay.getDate() + 6);
          fromDate = formatDate(firstDay);
          toDate = formatDate(lastDay);
        } else if (filterType === 'mes') {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          fromDate = formatDate(firstDay);
          toDate = formatDate(lastDay);
        } else if (filterType === 'trimestre') {
          const quarter = Math.floor(today.getMonth() / 3);
          const firstDay = new Date(today.getFullYear(), quarter * 3, 1);
          const lastDay = new Date(today.getFullYear(), firstDay.getMonth() + 3, 0);
          fromDate = formatDate(firstDay);
          toDate = formatDate(lastDay);
        } else if (filterType === 'ano') {
          const firstDay = new Date(today.getFullYear(), 0, 1);
          const lastDay = new Date(today.getFullYear(), 11, 31);
          fromDate = formatDate(firstDay);
          toDate = formatDate(lastDay);
        } else if (filterType === 'personalizado') {
          fromDate = customDesde;
          toDate = customHasta;
        }

        const queryParams = new URLSearchParams({
          ...(fromDate && { from: fromDate }),
          ...(toDate && { to: toDate })
        }).toString();

        if (activeTab === 'gastos') {
          const res = await fetch(`${API_URL}/cajas/estadisticas/gastos?${queryParams}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (res.ok) {
            const data = await res.json();
            setGastosData(data);
          }
        } else if (activeTab === 'ingresos') {
          const res = await fetch(`${API_URL}/cajas/estadisticas/ingresos?${queryParams}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (res.ok) {
            const data = await res.json();
            setIngresosData(data);
          }
        } else if (activeTab === 'ventas') {
          const res = await fetch(`${API_URL}/cajas/estadisticas/ventas?${queryParams}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (res.ok) {
            const data = await res.json();
            setVentasData(data);
          }
        } else if (activeTab === 'productos') {
          const res = await fetch(`${API_URL}/cajas/estadisticas/productos?${queryParams}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (res.ok) {
            const data = await res.json();
            setProductosData(data);
          }
        } else if (activeTab === 'balance') {
          const res = await fetch(`${API_URL}/cajas/estadisticas/balance?${queryParams}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (res.ok) {
            const data = await res.json();
            setBalanceData(data);
          }
        }
      } catch (err) {
        console.error("Error fetching estadisticas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, filterType, customDesde, customHasta]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Estadísticas de la Caja
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Analiza el rendimiento y desglose de las operaciones.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
          >
            <option value="dia">Por Día (Hoy)</option>
            <option value="semana">Por Semana</option>
            <option value="mes">Por Mes</option>
            <option value="trimestre">Por Trimestre</option>
            <option value="ano">Por Año</option>
            <option value="personalizado">Personalizado</option>
          </select>
          
          {filterType === 'personalizado' && (
            <div className="flex items-center gap-2">
               <input 
                 type="date"
                 value={customDesde}
                 onChange={(e) => setCustomDesde(e.target.value)}
                 className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
               />
               <span className="text-gray-500 font-medium">-</span>
               <input 
                 type="date"
                 value={customHasta}
                 onChange={(e) => setCustomHasta(e.target.value)}
                 className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
               />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse space-y-4 w-full px-8 flex justify-center flex-col items-center">
             <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
             <div className="flex w-full gap-6">
               <div className="h-[300px] w-2/3 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
               <div className="h-[300px] w-1/3 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
             </div>
          </div>
        </div>
      ) : activeTab === 'gastos' && gastosData ? (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Chart Area */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Distribución de Gastos por Tipo
            </h3>
            
            <div className="h-[350px] w-full">
               {gastosData.chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                       formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Monto Total']}
                       itemStyle={{ fontWeight: 'bold', color: '#374151' }}
                     />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" />
                     <Pie
                       data={gastosData.chartData}
                       cx="50%"
                       cy="50%"
                       innerRadius={80}
                       outerRadius={120}
                       paddingAngle={4}
                       dataKey="value"
                       stroke="none"
                     >
                       {gastosData.chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                   </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-gray-500">
                    No hay gastos registrados en este periodo.
                 </div>
               )}
            </div>
          </div>

          {/* KPI Card Side */}
          <div className="w-full lg:w-80 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Resumen de Gastos</h4>
              
              <div className="space-y-6">
                
                {/* Total de Gastos */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Gastado</span>
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900 dark:text-white ml-12">
                     {formatCurrency(gastosData.total)}
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-700 w-full" />

                {/* Cantidad y Promedio */}
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cantidad</p>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">
                       {gastosData.cantidad}
                     </p>
                   </div>
                   <div>
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Promedio</p>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">
                       {formatCurrency(gastosData.promedio)}
                     </p>
                   </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      ) : activeTab === 'ingresos' && ingresosData ? (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Chart Area Ingresos */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Distribución de Ingresos por Tipo
            </h3>
            
            <div className="h-[350px] w-full">
               {ingresosData.chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                       formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Monto Total']}
                       itemStyle={{ fontWeight: 'bold', color: '#374151' }}
                     />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" />
                     <Pie
                       data={ingresosData.chartData}
                       cx="50%"
                       cy="50%"
                       innerRadius={80}
                       outerRadius={120}
                       paddingAngle={4}
                       dataKey="value"
                       stroke="none"
                     >
                       {ingresosData.chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                   </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-gray-500">
                    No hay ingresos registrados en este periodo.
                 </div>
               )}
            </div>
          </div>

          {/* KPI Card Side Ingresos */}
          <div className="w-full lg:w-80 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Resumen de Ingresos</h4>
              
              <div className="space-y-6">
                
                {/* Total de Ingresos */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Ingresado</span>
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900 dark:text-white ml-12">
                     {formatCurrency(ingresosData.total)}
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-700 w-full" />

                {/* Cantidad y Promedio Ingresos */}
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cantidad</p>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">
                       {ingresosData.cantidad}
                     </p>
                   </div>
                   <div>
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Promedio</p>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">
                       {formatCurrency(ingresosData.promedio)}
                     </p>
                   </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      ) : activeTab === 'ventas' && ventasData ? (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Chart Area Ventas */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Distribución de Ventas por Cliente
            </h3>
            
            <div className="h-[350px] w-full">
               {ventasData.chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                       formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Monto Total']}
                       itemStyle={{ fontWeight: 'bold', color: '#374151' }}
                     />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" />
                     <Pie
                       data={ventasData.chartData}
                       cx="50%"
                       cy="50%"
                       innerRadius={80}
                       outerRadius={120}
                       paddingAngle={4}
                       dataKey="value"
                       stroke="none"
                     >
                       {ventasData.chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                       ))}
                     </Pie>
                   </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-gray-500">
                    No hay ventas registradas en este periodo.
                 </div>
               )}
            </div>
          </div>

          {/* KPI Card Side Ventas */}
          <div className="w-full lg:w-80 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Resumen de Ventas</h4>
              
              <div className="space-y-6">
                
                {/* Total de Ventas */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Vendido</span>
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900 dark:text-white ml-12">
                     {formatCurrency(ventasData.total)}
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-700 w-full" />

                {/* Cantidad y Promedio Ventas */}
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cantidad</p>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">
                       {ventasData.cantidad}
                     </p>
                   </div>
                   <div>
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Promedio</p>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">
                       {formatCurrency(ventasData.promedio)}
                     </p>
                   </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      ) : activeTab === 'productos' && productosData ? (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Chart Area Productos */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Top 10 Productos más Vendidos
            </h3>
            
            <div className="h-[350px] w-full">
               {productosData.chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   {/* AQUÍ ESTÁ EL AJUSTE DEL ANCHO DE BARRAS ("barCategoryGap"). 
                       Auméntalo (ej: "60%") para barras más finas, o redúcelo (ej: "10%") para barras más gruesas. */}
                   <BarChart data={productosData.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }} barCategoryGap="10%">
                     <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={1} />
                     <XAxis 
                       dataKey="name" 
                       axisLine={{ stroke: '#111827' }} 
                       tickLine={false} 
                       tick={{ fontSize: 11, fill: '#111827' }}
                       interval={0}
                       angle={-45}
                       textAnchor="end"
                       tickMargin={12}
                     />
                     <YAxis 
                       axisLine={{ stroke: '#111827' }} 
                       tickLine={false} 
                       tick={{ fontSize: 11, fill: '#6B7280' }}
                       tickMargin={12}
                     />
                     {/* AQUÍ SE MODIFICA EL CURSOR GRIS INTERACTIVO ("cursor"): 
                         - fill: color y transparencia (ej: 0.04 es muy transparente) 
                         - rx, ry: redondeo de los bordes del cursor */}
                     <Tooltip 
                       cursor={{ fill: 'rgba(0,0,0,0.04)', rx: 6, ry: 6 }}
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                       formatter={(value: number | undefined) => [value || 0, 'Unidades Vendidas']}
                       labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}
                     />
                     <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                       {productosData.chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-gray-500">
                    No hay productos vendidos en este periodo.
                 </div>
               )}
            </div>
            
            {/* Associated sales note */}
            <div className="border-t border-gray-100 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
              * Datos calculados en base a <span className="font-bold text-amber-600 dark:text-amber-400 ml-1">{productosData.totalVentas} ventas (tickets)</span> concretadas en esta caja.
            </div>
          </div>

          {/* KPI Card Side Productos */}
          <div className="w-full lg:w-80 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Resumen de Productos</h4>
              
              <div className="space-y-6">
                
                {/* Total de Productos */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Unidades Vendidas</span>
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900 dark:text-white ml-12">
                     {productosData.total}
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-700 w-full" />

                {/* Cantidad y Promedio Productos */}
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Prod. Distintos</p>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">
                       {productosData.cantidad}
                     </p>
                   </div>
                   <div>
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Prom. por Prod.</p>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">
                       {productosData.promedio}
                     </p>
                   </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      ) : activeTab === 'balance' && balanceData ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Tarjeta Total de Ingresos */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center items-center text-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-600 dark:text-emerald-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-600 dark:text-gray-400">Total Ingresos</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                 {formatCurrency(balanceData.totalIngresos)}
              </div>
            </div>
            
            {/* Tarjeta Total de Gastos */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center items-center text-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-full text-rose-600 dark:text-rose-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-600 dark:text-gray-400">Total Gastos</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                 {formatCurrency(balanceData.totalGastos)}
              </div>
            </div>

            {/* Tarjeta Total de Ventas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center items-center text-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full text-blue-600 dark:text-blue-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-600 dark:text-gray-400">Total Ventas</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                 {formatCurrency(balanceData.totalVentas)}
              </div>
            </div>

            {/* Tarjeta Balance */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-emerald-500 shadow-md flex flex-col justify-center items-center text-center transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-full text-amber-600 dark:text-amber-400">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-800 dark:text-gray-200">Balance Total</span>
              </div>
              <div className={`text-4xl font-extrabold ${balanceData.totalBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                 {formatCurrency(balanceData.totalBalance)}
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Evolución del Balance (Acumulado)
            </h3>
            <div className="h-[350px] w-full">
               {balanceData.chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={balanceData.chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                     <defs>
                       <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                     <XAxis 
                       dataKey="name" 
                       axisLine={false}
                       tickLine={false}
                       tick={{ fontSize: 12, fill: '#6B7280' }}
                       tickMargin={12}
                     />
                     <YAxis 
                       axisLine={false}
                       tickLine={false}
                       tick={{ fontSize: 12, fill: '#6B7280' }}
                       tickFormatter={(val) => new Intl.NumberFormat("es-AR", { notation: "compact", style: "currency", currency: "ARS" }).format(val)}
                     />
                     <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                       formatter={(value: any) => [formatCurrency(value), 'Balance Acumulado']}
                       labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}
                     />
                     <Area 
                       type="monotone" 
                       dataKey="balanceAcumulado" 
                       stroke="#10B981" 
                       strokeWidth={3}
                       fillOpacity={1} 
                       fill="url(#colorBalance)" 
                     />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-gray-500">
                    No hay datos suficientes para graficar la evolución.
                 </div>
               )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">En desarrollo</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-sm">
             La sección de <span className="font-semibold text-emerald-600">{activeTab}</span> se encuentra bajo construcción o sin datos.
          </p>
        </div>
      )}
    </div>
  );
}
