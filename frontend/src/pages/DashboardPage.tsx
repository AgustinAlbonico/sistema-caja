import { useRecibos } from '../hooks/useRecibos';
import { useClientes } from '../hooks/useClientes';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Users, FileText, DollarSign, Wallet, TrendingUp, ArrowRight, CreditCard } from 'lucide-react';
import { formatArgentinaDate } from '../lib/utils';

// Componente Dashboard
export function DashboardPage() {
  const { recibos, metodosPago, loading: recibosLoading } = useRecibos();
  const { clientes, loading: clientesLoading } = useClientes();

  // Calcular estadísticas
  const safeRecibos = recibos || [];
  const recibosHoy = safeRecibos.filter((r) => {
    const reciboDate = new Date(r.fechaEmision); // fecha -> fechaEmision
    const today = new Date();
    return (
      reciboDate.getDate() === today.getDate() &&
      reciboDate.getMonth() === today.getMonth() &&
      reciboDate.getFullYear() === today.getFullYear()
    );
  });

  const totalCaja = safeRecibos.reduce((sum, r) => sum + Number(r.total), 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const previousMonth = previousMonthDate.getMonth();
  const previousMonthYear = previousMonthDate.getFullYear();

  const ingresosMesActual = safeRecibos
    .filter((r) => {
      const date = new Date(r.fechaEmision);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, r) => sum + Number(r.total), 0);

  const ingresosMesAnterior = safeRecibos
    .filter((r) => {
      const date = new Date(r.fechaEmision);
      return date.getMonth() === previousMonth && date.getFullYear() === previousMonthYear;
    })
    .reduce((sum, r) => sum + Number(r.total), 0);

  const ingresosTrendValue =
    ingresosMesAnterior > 0
      ? ((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100
      : ingresosMesActual > 0
        ? 100
        : 0;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const recibosAyer = safeRecibos.filter((r) => {
    const reciboDate = new Date(r.fechaEmision);
    return (
      reciboDate.getDate() === yesterday.getDate() &&
      reciboDate.getMonth() === yesterday.getMonth() &&
      reciboDate.getFullYear() === yesterday.getFullYear()
    );
  });

  const recibosTrendDelta = recibosHoy.length - recibosAyer.length;
  const recibosTrendText = `${recibosTrendDelta >= 0 ? '+' : ''}${recibosTrendDelta}`;

  const uniqueClientesUltimos30Dias = new Set(
    safeRecibos
      .filter((r) => {
        const date = new Date(r.fechaEmision);
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      })
      .map((r) => r.idCliente),
  ).size;

  const uniqueClientes30DiasPrevios = new Set(
    safeRecibos
      .filter((r) => {
        const date = new Date(r.fechaEmision);
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > 30 && diffDays <= 60;
      })
      .map((r) => r.idCliente),
  ).size;

  const clientesTrendDelta = uniqueClientesUltimos30Dias - uniqueClientes30DiasPrevios;
  const clientesTrendText = `${clientesTrendDelta >= 0 ? '+' : ''}${clientesTrendDelta}`;

  const ingresosPorMetodo = safeRecibos.reduce<Record<number, number>>((acc, recibo) => {
    const pagos = recibo.pagos ?? [];
    pagos.forEach((pago) => {
      const monto = Number(pago.importe);
      acc[pago.idMetodoPago] = (acc[pago.idMetodoPago] ?? 0) + monto;
    });
    return acc;
  }, {});

  const totalIngresosMetodos = Object.values(ingresosPorMetodo).reduce((sum, value) => sum + value, 0);
  const metodosOrdenados = Object.entries(ingresosPorMetodo)
    .map(([idMetodoPago, total]) => {
      const metodo = metodosPago.find((m) => m.idMetodoPago === Number(idMetodoPago));
      const porcentaje = totalIngresosMetodos > 0 ? (total / totalIngresosMetodos) * 100 : 0;
      return {
        idMetodoPago: Number(idMetodoPago),
        nombre: metodo?.nombre ?? `Metodo #${idMetodoPago}`,
        total,
        porcentaje,
      };
    })
    .sort((a, b) => b.total - a.total);

  const metodoColors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-cyan-500'];

  const metodos = metodosOrdenados.map((metodo, index) => ({
    nombre: metodo.nombre,
    porcentaje: metodo.porcentaje,
    value: `$ ${metodo.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    color: metodoColors[index % metodoColors.length],
  }));

  const principalMetodo = metodos[0];

  const safeClientes = clientes || []; // Handle potential undefined clientes

  const stats = [
    {
      label: 'Ingresos Totales',
      value: `$ ${totalCaja.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      trend: `${ingresosTrendValue >= 0 ? '+' : ''}${ingresosTrendValue.toFixed(1)}%`,
      trendUp: ingresosTrendValue >= 0,
      description: 'vs. mes anterior',
    },
    {
      label: 'Recibos Emitidos',
      value: recibosHoy.length.toString(),
      icon: FileText,
      trend: recibosTrendText,
      trendUp: recibosTrendDelta >= 0,
      description: 'vs. ayer',
    },
    {
      label: 'Clientes Activos',
      value: safeClientes.length.toString(),
      icon: Users,
      trend: clientesTrendText,
      trendUp: clientesTrendDelta >= 0,
      description: 'ultimos 30 dias',
    },
    {
      label: 'Caja Total',
      value: `$ ${totalCaja.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      trend: 'Actual',
      trendUp: true,
      description: 'saldo consolidado',
    },
  ];

  if (recibosLoading || clientesLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm font-medium text-ink-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-0 overflow-visible hover:-translate-y-1 transition-transform duration-300">
            <div className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100 text-ink-600 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className={`flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stat.trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {stat.trend}
                  {stat.trendUp ? <TrendingUp className="ml-1 h-3 w-3" /> : null}
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-medium text-ink-500">{stat.label}</h3>
                <p className="mt-1 text-xl font-bold tracking-tight text-ink-900 md:text-2xl">{stat.value}</p>
                <p className="mt-1 text-xs text-ink-400">{stat.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recibos Recientes - Spans 2 cols */}
        <div className="lg:col-span-2">
          <Card
            title="Actividad Reciente"
            description="Últimos movimientos registrados en el sistema"
            action={
              <Button variant="ghost" size="sm" className="text-brand-600 hover:text-brand-700 hover:bg-brand-50">
                Ver todo <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            }
          >
            <div className="mt-3 space-y-3">
              {safeRecibos.length > 0 ? (
                safeRecibos.slice(0, 5).map((recibo) => (
                  <div
                    key={recibo.idRecibo}
                     className="group flex items-center justify-between rounded-xl border border-transparent p-2.5 hover:bg-surface-50 hover:border-surface-200 transition-all duration-200"
                  >
                     <div className="flex items-center gap-3">
                       <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-100 text-ink-500 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                         <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-900 group-hover:text-brand-700 transition-colors">
                          {recibo.cliente?.nombre || 'Cliente desconocido'}
                        </p>
                        <p className="text-xs text-ink-500 flex items-center gap-1">
                          <span>Comp. #{recibo.nroComprobante}</span>
                          <span className="h-1 w-1 rounded-full bg-ink-300" />
                          <span>{formatArgentinaDate(recibo.fechaEmision)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink-900">
                        $ {Number(recibo.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-xs font-medium text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Aprobado
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                 <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-surface-100 flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6 text-ink-400" />
                  </div>
                  <p className="text-sm font-medium text-ink-900">Sin movimientos</p>
                  <p className="text-xs text-ink-500 max-w-xs mt-1">
                    No hay recibos registrados aún. Comienza creando uno nuevo.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Métodos de Pago - Spans 1 col */}
        <div>
          <Card title="Distribución de Ingresos" description="Desglose por método de pago">
             <div className="mt-4 space-y-4">
              {metodos.map((metodo) => (
                <div key={metodo.nombre} className="group">
                  <div className="mb-2 flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${metodo.color}`} />
                      <span className="font-medium text-ink-700">{metodo.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-semibold text-ink-900">{Math.round(metodo.porcentaje)}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-100">
                    <div
                      className={`h-full ${metodo.color} transition-all duration-1000 ease-out`}
                      style={{ width: `${Math.min(metodo.porcentaje, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-ink-500 font-medium">{metodo.value}</p>
                </div>
              ))}

              {metodos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-300 bg-surface-50 p-3 text-center text-xs text-ink-500">
                  Sin datos de metodos de pago para el periodo actual.
                </div>
              ) : null}

               <div className="mt-6 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 p-3.5 border border-brand-100/50">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-white p-1.5 shadow-sm text-brand-600">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-brand-900">Insight Financiero</h4>
                    <p className="mt-1 text-xs leading-relaxed text-brand-700/80">
                      {principalMetodo
                        ? `${Math.round(principalMetodo.porcentaje)}% de tus ingresos provienen de ${principalMetodo.nombre.toLowerCase()}.`
                        : 'Aun no hay suficientes datos para generar un insight.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
