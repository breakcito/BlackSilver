import { useState } from "react";
import { Tabs } from "@mantine/core";
import { ListBulletIcon, Squares2X2Icon } from "@heroicons/react/24/outline";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { useBalances } from "../hooks/useBalances";
import { BalancesFiltros } from "./components/balances-filtros";
import { BalancesFiltrosDetalle } from "./components/balances-filtros-detalle";
import { BalancesKpis } from "./components/balances-kpis";
import { BalancesDesgloseCategorias } from "./components/balances-desglose-categorias";
import { BalancesListaMovimientos } from "./components/balances-lista-movimientos";
import { etiquetaMes, etiquetaMesCorta } from "./balances-calculos";

/**
 * Balances: cuanto entró, cuanto salió y cuanto quedó.
 *
 * El modulo es de SOLO LECTURA: la informacion viene de los modulos que la
 * generaron (consumo, mantenimiento, despacho, compras, ventas). Para
 * corregir un registro se edita en su propio modulo.
 */
export const BalancesPage = () => {
  useTitlePage("Balances");

  const balances = useBalances();
  const [tab, setTab] = useState<string | null>("categorias");

  const {
    mes,
    setMes,
    anio,
    setAnio,
    mesComparativo,
    anioComparativo,
    cambiarComparacion,
    filtroAmbito,
    setFiltroAmbito,
    filtroTipo,
    setFiltroTipo,
    filtroOrigen,
    setFiltroOrigen,
    busqueda,
    setBusqueda,
    hayFiltros,
    limpiarFiltros,
    movimientosDetalle,
    origenes,
    etiquetasOrigen,
    loading,
    cargar,
    resumenPorMoneda,
    resumenCategoriaPorMoneda,
  } = balances;

  return (
    <div className="animate-fade-in space-y-4">
      {/* ── Periodo y comparacion ──────────────────────────────────── */}
      <BalancesFiltros
        mes={mes}
        setMes={setMes}
        anio={anio}
        setAnio={setAnio}
        mesComparativo={mesComparativo}
        anioComparativo={anioComparativo}
        cambiarComparacion={cambiarComparacion}
        loading={loading}
        onRecargar={cargar}
      />

      {/* ── Resultado, una ficha por moneda ────────────────────────── */}
      <BalancesKpis
        resumenes={resumenPorMoneda}
        etiquetaPeriodo={etiquetaMes(mes, anio)}
        etiquetaComparativo={etiquetaMesCorta(mesComparativo, anioComparativo)}
        loading={loading}
      />

      {/* ── Detalle ────────────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onChange={setTab}
        variant="pills"
        color="indigo"
        classNames={{
          root: "space-y-4",
          list: "bg-zinc-950/80 p-0 rounded-lg border border-zinc-800 w-fit shrink-0 overflow-hidden gap-0",
          tab: "rounded-none px-4 py-2 transition-all duration-200 data-[active]:bg-indigo-600! data-[active]:text-white text-zinc-400 hover:text-zinc-200 font-semibold text-xs",
        }}
      >
        <Tabs.List>
          <Tabs.Tab
            value="categorias"
            leftSection={<Squares2X2Icon className="w-4 h-4" />}
          >
            Desglose por categoría
          </Tabs.Tab>
          <Tabs.Tab
            value="movimientos"
            leftSection={<ListBulletIcon className="w-4 h-4" />}
          >
            Movimientos
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="categorias">
          <BalancesDesgloseCategorias grupos={resumenCategoriaPorMoneda} />
        </Tabs.Panel>

        <Tabs.Panel value="movimientos">
          <div className="space-y-3">
            <BalancesFiltrosDetalle
              ambito={filtroAmbito}
              setAmbito={setFiltroAmbito}
              tipo={filtroTipo}
              setTipo={setFiltroTipo}
              origen={filtroOrigen}
              setOrigen={setFiltroOrigen}
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              origenes={origenes}
              hayFiltros={hayFiltros}
              limpiarFiltros={limpiarFiltros}
            />

            <BalancesListaMovimientos
              movimientos={movimientosDetalle}
              loading={loading}
              etiquetas={etiquetasOrigen}
            />
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default BalancesPage;
