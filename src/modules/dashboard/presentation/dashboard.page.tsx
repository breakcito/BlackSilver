import { Text } from "@mantine/core";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { useDashboard } from "../hooks/useDashboard";
import { etiquetaPeriodo } from "./dashboard-calculos";
import { DashboardBloque } from "./components/dashboard-bloque";
import { DashboardFiltros } from "./components/dashboard-filtros";
import { DashboardKpis } from "./components/dashboard-kpis";
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
 * 1. FILTROS + CIFRAS: que periodo, que almacen y cuanto hay pendiente.
 * 2. CONTEXTO: el balance del periodo y el embudo de logistica.
 * 3. ALERTAS: stock, mantenimiento, compras y cobros, que son las que piden
 *    una accion.
 *
 * Cada bloque declara que filtros lo mueven, para que el usuario sepa de
 * antemano si lo que ve depende del mes o del almacen.
 */
export const DashboardPage = () => {
  useTitlePage("Dashboard");

  const {
    mes,
    setMes,
    anio,
    setAnio,
    anios,
    idAlmacen,
    setIdAlmacen,
    busquedaAlmacen,
    setBusquedaAlmacen,
    almacenesVisibles,
    datos,
    loading,
    cargar,
    rango,
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
      {/* 1. Filtros y cifras */}
      <DashboardFiltros
        mes={mes}
        setMes={setMes}
        anio={anio}
        setAnio={setAnio}
        anios={anios}
        idAlmacen={idAlmacen}
        setIdAlmacen={setIdAlmacen}
        busquedaAlmacen={busquedaAlmacen}
        setBusquedaAlmacen={setBusquedaAlmacen}
        almacenesVisibles={almacenesVisibles}
        loading={loading}
        onRecargar={cargar}
        etiquetaPeriodo={etiquetaPeriodo(rango.fecha_inicio, rango.fecha_fin)}
      />

      <DashboardKpis datos={datos} loading={loading} />

      {/* 2. Contexto */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <DashboardBloque
            titulo="Balance del periodo"
            descripcion="Ingresos, egresos y resultado contra el periodo anterior"
            alcances={["periodo"]}
            loading={loading}
          >
            <IndicadorBalance
              balance={datos.balance}
              periodo={datos.periodo}
              comparativo={datos.comparativo}
            />
          </DashboardBloque>
        </div>

        <div className="xl:col-span-4">
          <DashboardBloque
            titulo="Pendientes de atencion"
            descripcion="Items que esperan accion en logistica"
            alcances={["estado", "almacen"]}
            contador={datos.pendientes_atencion.resumen.total}
            loading={loading}
          >
            <IndicadorPendientes pendientes={datos.pendientes_atencion} />
          </DashboardBloque>
        </div>
      </div>

      {/* 3. Alertas */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <DashboardBloque
            titulo="Stock critico por almacen"
            descripcion="Productos por debajo de su stock minimo"
            alcances={["estado", "almacen"]}
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
            alcances={["estado", "almacen"]}
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
            descripcion="Ordenes formalizadas que aun no llegaron al almacen"
            alcances={["estado", "almacen"]}
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
