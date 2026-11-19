import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { useNotify } from "../../../hooks/useNotify";
import { BalancePeriodo } from "../../../shared/enums/balances/balances";
import { BalancesService } from "../service/balances.service";
import type {
  RES_CatalogosBalance,
  RES_MovimientoBalance,
  RES_OrigenBalance,
} from "../service/balances.responses";
import {
  filtrarMovimientos,
  rangoDelMes,
  resumirPorCategoria,
  resumirPorMoneda,
  type FiltrosBalance,
  type ResumenMoneda,
} from "../presentation/balances-calculos";

/**
 * Estado y logica del modulo Balances.
 *
 * El API devuelve los movimientos de los DOS periodos (actual y comparativo)
 * en una sola lista. Aqui se aplican los filtros sobre esa lista y se
 * calculan los resumenes: asi los indicadores, el desglose y la tabla salen
 * siempre de la misma fuente y no pueden contradecirse.
 *
 * Soles y dolares conviven en la misma vista: cada uno se resume por
 * separado (nunca se suman) y los movimientos muestran su propia moneda.
 */
export const useBalances = () => {
  const { notifyError } = useNotify();

  const hoy = dayjs();

  // ── Periodo actual ─────────────────────────────────────────────────
  const [mes, setMes] = useState<number>(hoy.month() + 1);
  const [anio, setAnio] = useState<number>(hoy.year());

  // ── Periodo de comparacion ─────────────────────────────────────────
  const [mesComparativo, setMesComparativo] = useState<number>(
    hoy.month() === 1 ? 12 : hoy.month(),
  );
  const [anioComparativo, setAnioComparativo] = useState<number>(
    hoy.month() === 1 ? hoy.year() - 1 : hoy.year(),
  );
  /**
   * Mientras el usuario no toque la comparacion, esta sigue sola al mes
   * anterior al periodo actual. En cuanto la cambia, manda su eleccion.
   */
  const [comparacionManual, setComparacionManual] = useState(false);

  // ── Filtros del detalle (se resuelven en el navegador) ─────────────
  const [filtroAmbito, setFiltroAmbito] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [filtroOrigen, setFiltroOrigen] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>("");

  // ── Datos ──────────────────────────────────────────────────────────
  const [movimientos, setMovimientos] = useState<RES_MovimientoBalance[]>([]);
  const [catalogos, setCatalogos] = useState<RES_CatalogosBalance | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // La comparacion sigue al mes anterior mientras el usuario no la toque.
  useEffect(() => {
    if (comparacionManual) return;
    if (mes === 1) {
      setMesComparativo(12);
      setAnioComparativo(anio - 1);
    } else {
      setMesComparativo(mes - 1);
      setAnioComparativo(anio);
    }
  }, [mes, anio, comparacionManual]);

  const rangoActual = useMemo(() => rangoDelMes(mes, anio), [mes, anio]);
  const rangoComparativo = useMemo(
    () => rangoDelMes(mesComparativo, anioComparativo),
    [mesComparativo, anioComparativo],
  );

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await BalancesService.getBalance({
        fecha_inicio: rangoActual.fecha_inicio,
        fecha_fin: rangoActual.fecha_fin,
        fecha_inicio_comparativo: rangoComparativo.fecha_inicio,
        fecha_fin_comparativo: rangoComparativo.fecha_fin,
      });

      if (resp.success && resp.data) {
        setMovimientos(resp.data.movimientos ?? []);
        setCatalogos(resp.data.catalogos);
      } else {
        setMovimientos([]);
        notifyError(resp.message || "No se pudo generar el balance");
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al generar el balance");
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }, [rangoActual, rangoComparativo, notifyError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ── Filtros del detalle ────────────────────────────────────────────
  const filtros: FiltrosBalance = useMemo(
    () => ({
      ambito: filtroAmbito,
      tipo: filtroTipo,
      origen: filtroOrigen,
      busqueda,
    }),
    [filtroAmbito, filtroTipo, filtroOrigen, busqueda],
  );

  const hayFiltros = Boolean(
    filtroAmbito || filtroTipo || filtroOrigen || busqueda.trim(),
  );

  const limpiarFiltros = useCallback(() => {
    setFiltroAmbito(null);
    setFiltroTipo(null);
    setFiltroOrigen(null);
    setBusqueda("");
  }, []);

  const cambiarComparacion = useCallback(
    (nuevoMes: number, nuevoAnio: number) => {
      setComparacionManual(true);
      setMesComparativo(nuevoMes);
      setAnioComparativo(nuevoAnio);
    },
    [],
  );

  /**
   * Movimientos del periodo actual con los filtros de detalle aplicados.
   * Es la fuente de la lista de movimientos.
   *
   * Se ordenan por fecha (del mas reciente al mas antiguo): el API los
   * entrega agrupados por origen y una lista de movimientos sin orden no
   * se puede recorrer.
   */
  const movimientosDetalle = useMemo(
    () =>
      filtrarMovimientos(movimientos, filtros)
        .filter((m) => m.periodo === BalancePeriodo.Actual)
        .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
    [movimientos, filtros],
  );

  // ── Resumenes ──────────────────────────────────────────────────────
  /** Totales por moneda: soles y dolares, por separado. */
  const resumenPorMoneda: ResumenMoneda[] = useMemo(
    () => resumirPorMoneda(movimientos),
    [movimientos],
  );

  /**
   * Desglose por categoria, separado por moneda: cada moneda tiene su
   * propia tabla porque sus montos no son comparables entre si.
   */
  const resumenCategoriaPorMoneda = useMemo(() => {
    const catalogo = catalogos?.origenes ?? [];
    return resumenPorMoneda.map((resumen) => ({
      moneda: resumen.moneda,
      categorias: resumirPorCategoria(
        movimientos.filter((m) => m.moneda === resumen.moneda),
        catalogo,
      ),
    }));
  }, [movimientos, resumenPorMoneda, catalogos]);

  const origenes: RES_OrigenBalance[] = useMemo(
    () => catalogos?.origenes ?? [],
    [catalogos],
  );

  const etiquetasOrigen = useMemo(
    () => new Map(origenes.map((o) => [o.value, o.label])),
    [origenes],
  );

  return {
    // Periodo
    mes,
    setMes,
    anio,
    setAnio,
    mesComparativo,
    anioComparativo,
    cambiarComparacion,
    rangoActual,
    rangoComparativo,

    // Filtros del detalle
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

    // Datos
    movimientos,
    movimientosDetalle,
    origenes,
    etiquetasOrigen,
    loading,
    cargar,

    // Resumenes
    resumenPorMoneda,
    resumenCategoriaPorMoneda,
  };
};

export default useBalances;
