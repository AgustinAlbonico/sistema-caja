import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subYears, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, TrendingUp, TrendingDown, DollarSign, ChevronDown } from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';
import { fetchWithAuth } from '@/lib/api';

interface DashboardData {
  summary: {
    ingresos: number;
    egresos: number;
    balance: number;
  };
  evolution: {
    date: string;
    ingresos: number;
    egresos: number;
  }[];
  topGastos: {
    concepto: string;
    total: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

type FiltroRapido = 'hoy' | 'semana' | 'mes' | 'mesPasado' | 'anio' | 'anioPasado';

export function ReportesPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState<FiltroRapido>('mes');

  const aplicarFiltroRapido = (filtro: FiltroRapido) => {
    const hoy = new Date();
    let inicio: Date;
    let fin: Date;

    switch (filtro) {
      case 'hoy':
        inicio = hoy;
        fin = hoy;
        break;
      case 'semana':
        inicio = startOfWeek(hoy, { weekStartsOn: 1 });
        fin = endOfWeek(hoy, { weekStartsOn: 1 });
        break;
      case 'mes':
        inicio = startOfMonth(hoy);
        fin = endOfMonth(hoy);
        break;
      case 'mesPasado': {
        const mesPasado = subMonths(hoy, 1);
        inicio = startOfMonth(mesPasado);
        fin = endOfMonth(mesPasado);
        break;
      }
      case 'anio':
        inicio = startOfYear(hoy);
        fin = endOfYear(hoy);
        break;
      case 'anioPasado':
        const anioPasado = subYears(hoy, 1);
        inicio = startOfYear(anioPasado);
        fin = endOfYear(anioPasado);
        break;
      default:
        return;
    }

    setStartDate(format(inicio, 'yyyy-MM-dd'));
    setEndDate(format(fin, 'yyyy-MM-dd'));
    setFiltroActivo(filtro);
    setFiltroAbierto(false);
  };

  const getLabelFiltro = (filtro: FiltroRapido): string => {
    const labels: Record<FiltroRapido, string> = {
      hoy: 'Hoy',
      semana: 'Esta semana',
      mes: 'Este mes',
      mesPasado: 'Mes pasado',
      anio: 'Este año',
      anioPasado: 'Año pasado',
    };
    return labels[filtro];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
      });
      const res = await fetchWithAuth(`/reports/dashboard?${queryParams}`);
      if (!res.ok) throw new Error('Error fetching detailed report');
      const jsonData = await res.json();
      setData(jsonData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Cerrar el menú de filtros al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filtro-rapido-container')) {
        setFiltroAbierto(false);
      }
    };

    if (filtroAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [filtroAbierto]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-500 font-medium">Cargando reportes financieros...</p>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-center text-gray-500">No hay datos disponibles.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100 md:p-4">
        <h1 className="text-xl font-bold text-gray-800 md:text-2xl">Reportes Financieros</h1>

        <div className="flex items-center gap-3 mt-3 sm:mt-0">
          {/* Botón de Filtros Rápidos */}
          <div className="relative filtro-rapido-container">
            <button
              onClick={() => setFiltroAbierto(!filtroAbierto)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {getLabelFiltro(filtroActivo)}
              <ChevronDown className={`w-4 h-4 transition-transform ${filtroAbierto ? 'rotate-180' : ''}`} />
            </button>

            {filtroAbierto && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => aplicarFiltroRapido('hoy')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hoy
                </button>
                <button
                  onClick={() => aplicarFiltroRapido('semana')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Esta semana
                </button>
                <button
                  onClick={() => aplicarFiltroRapido('mes')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Este mes
                </button>
                <button
                  onClick={() => aplicarFiltroRapido('mesPasado')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Mes pasado
                </button>
                <button
                  onClick={() => aplicarFiltroRapido('anio')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Este año
                </button>
                <button
                  onClick={() => aplicarFiltroRapido('anioPasado')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Año pasado
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none text-sm cursor-text"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none text-sm cursor-text"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1.5 md:text-2xl">
                $ {data.summary.ingresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Egresos Totales</p>
              <h3 className="text-xl font-bold text-rose-600 mt-1.5 md:text-2xl">
                $ {data.summary.egresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-rose-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-rose-600 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Balance Neto</p>
              <h3 className={`text-xl font-bold mt-1.5 md:text-2xl ${data.summary.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                $ {data.summary.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${data.summary.balance >= 0 ? 'bg-blue-100' : 'bg-rose-100'}`}>
              <DollarSign className={`w-5 h-5 md:w-6 md:h-6 ${data.summary.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Daily Evolution Chart */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:p-5">
          <h3 className="text-base font-bold text-gray-800 mb-4 md:text-lg md:mb-5">Evolución Diaria</h3>
          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.evolution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val: any) => format(new Date(val), 'd MMM', { locale: es })}
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => [`$ ${Number(value).toLocaleString()}`, '']}
                  labelFormatter={(label: any) => format(new Date(label), 'd MMMM yyyy', { locale: es })}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos" name="Egresos" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Expenses Pie Chart */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:p-5">
          <h3 className="text-base font-bold text-gray-800 mb-4 md:text-lg md:mb-5">Top 5 Gastos por Concepto</h3>
          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.topGastos}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                  nameKey="concepto"
                >
                  {data.topGastos.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$ ${Number(value).toLocaleString()}`} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
