import { Text } from "@mantine/core";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { useDashboard } from "../hooks/useDashboard";
import { DashboardBloque } from "./components/dashboard-bloque";
import { DashboardKpis } from "./components/dashboard-kpis";
import { DashboardPeriodo } from "./components/dashboard-periodo";
import { IndicadorBalance } from "./components/indicador-balance";
import { IndicadorCobros } from "./components/indicador-cobros";
import { IndicadorCompras } from "./components/indicador-compras";
import { IndicadorCostoMantenimiento } from "./components/indicador-costo-mantenimiento";
import { IndicadorMantenimiento } from "./components/indicador-mantenimiento";
import { IndicadorPendientes } from "./components/indicador-pendientes";
import { IndicadorStockCritico } from "./components/indicador-stock-critico";

/**
 * Dashboard: la lectura de la empresa de un vistazo.
 *
 * La pantalla se ordena en tres tempos:
 * 1. CIFRAS: cuanto hay pendiente, en general.
 * 2. CONTEXTO: el balance del periodo y el embudo de logistica.
 * 3. ALERTAS: stock, mantenimiento, compras y cobros, que son las que piden
 *    una accion.
 *
 * Cada indicador de FLUJO (balance, cobros y costo de mantenimiento) lleva
 * su propio control de periodo en la cabecera del bloque: se sabe de
 * entrada que filtro mueve a cada uno, y no hay una barra global que
 * aparente mandar sobre todo. Los indicadores de ESTADO son una foto del
 * ahora y por eso no llevan periodo.
 */
export const DashboardPage = () => {
  useTitlePage("Dashboard");

  const {
    periodoBalance,
    setPeriodoBalance,
    periodoCobros,
    setPeriodoCobros,
    periodoCosto,
    setPeriodoCosto,
    periodoCompras,
    setPeriodoCompras,
    anios,
    datos,
    loading,
  } = useDashboard();

  if (!datos) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Text size="sm" className="text-zinc-500">
          {loading ? "Cargando indicadores..." : "No se pudieron cargar los indicadores"}
        </Text>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <DashboardKpis datos={datos} loading={loading} />

      {/* Contexto */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <DashboardBloque
            titulo="Balance del periodo"
            descripcion="Ingresos, egresos y resultado contra el periodo anterior"
            alcances={["periodo"]}
            acciones={
              <DashboardPeriodo
                mes={periodoBalance.mes}
                anio={periodoBalance.anio}
                onCambio={(mes, anio) => setPeriodoBalance({ mes, anio })}
                anios={anios}
              />
            }
            loading={loading}
          >
            <IndicadorBalance
              balance={datos.balance}
              periodo={datos.periodos.balance}
              comparativo={datos.periodos.balance}
            />
          </DashboardBloque>
        </div>

        <div className="xl:col-span-4">
          <DashboardBloque
            titulo="Pendientes de atencion"
            descripcion="Items que esperan accion en logistica"
            alcances={["estado"]}
            contador={datos.pendientes_atencion.resumen.total}
            loading={loading}
          >
            <IndicadorPendientes pendientes={datos.pendientes_atencion} />
          </DashboardBloque>
        </div>
      </div>

      {/* Alertas */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <DashboardBloque
            titulo="Stock critico por almacen"
            descripcion="Productos por debajo de su stock minimo"
            alcances={["estado"]}
            contador={datos.stock_critico.resumen.total_items}
            loading={loading}
          >
            <IndicadorStockCritico stock={datos.stock_critico} />
          </DashboardBloque>
        </div>

        <div className="xl:col-span-6">
          <DashboardBloque
            titulo="Alertas de mantenimiento"
            descripcion="Maquinaria proxima o vencida de su proximo mantenimiento"
            alcances={["estado"]}
            contador={
              datos.mantenimiento_alertas.resumen.vencidos +
              datos.mantenimiento_alertas.resumen.criticos
            }
            loading={loading}
          >
            <IndicadorMantenimiento
              mantenimiento={datos.mantenimiento_alertas}
            />
          </DashboardBloque>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <DashboardBloque
            titulo="Compras pendientes de recepcion"
            descripcion="Ordenes formalizadas en el periodo que aun no llegaron al almacen"
            alcances={["periodo"]}
            acciones={
              <DashboardPeriodo
                mes={periodoCompras.mes}
                anio={periodoCompras.anio}
                onCambio={(mes, anio) => setPeriodoCompras({ mes, anio })}
                anios={anios}
              />
            }
            contador={datos.compras_pendientes.resumen.total_ocs}
            loading={loading}
          >
            <IndicadorCompras compras={datos.compras_pendientes} />
          </DashboardBloque>
        </div>

        <div className="xl:col-span-6">
          <DashboardBloque
            titulo="Cobros pendientes"
            descripcion="Comprobantes emitidos que todavia no se cobraron"
            alcances={["periodo"]}
            acciones={
              <DashboardPeriodo
                mes={periodoCobros.mes}
                anio={periodoCobros.anio}
                onCambio={(mes, anio) => setPeriodoCobros({ mes, anio })}
                anios={anios}
              />
            }
            contador={datos.cobros_pendientes.resumen.total_comprobantes}
            loading={loading}
          >
            <IndicadorCobros cobros={datos.cobros_pendientes} />
          </DashboardBloque>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <DashboardBloque
            titulo="Costo de mantenimiento del periodo"
            descripcion="Mano de obra, otros gastos e insumos consumidos"
            alcances={["periodo"]}
            acciones={
              <DashboardPeriodo
                mes={periodoCosto.mes}
                anio={periodoCosto.anio}
                onCambio={(mes, anio) => setPeriodoCosto({ mes, anio })}
                anios={anios}
              />
            }
            loading={loading}
          >
            <IndicadorCostoMantenimiento costo={datos.costo_mantenimiento} />
          </DashboardBloque>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
