import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { useNotify } from "../../../hooks/useNotify";
import { useAuditoriaStore } from "../../../stores/auditoria.store";
import { aplicarModoAuditoria } from "../presentation/dashboard-calculos";
import { DashboardService } from "../service/dashboard.service";
import type { RES_Dashboard } from "../service/dashboard.responses";

/** Periodo de un indicador de flujo. */
export interface IPeriodoDashboard {
  mes: number;
  anio: number;
}

/**
 * Rango de un mes natural en formato YYYY-MM-DD.
 */
const rangoDelMes = (mes: number, anio: number) => {
  const base = dayjs(`${anio}-${String(mes).padStart(2, "0")}-01`);
  return {
    fecha_inicio: base.startOf("month").format("YYYY-MM-DD"),
    fecha_fin: base.endOf("month").format("YYYY-MM-DD"),
  };
};

/**
 * Estado y logica del Dashboard.
 *
 * El dashboard pide TODO en una sola llamada: los siete indicadores van en el
 * mismo payload para que todos los bloques hablen del mismo snapshot.
 *
 * Cada indicador de FLUJO (balance, cobros y costo de mantenimiento) tiene
 * SU PROPIO periodo, con su propio control en la cabecera del bloque. Los
 * indicadores de ESTADO (stock critico, mantenimiento proximo y pendientes
 * de atencion) son una foto del ahora: no llevan periodo, porque un producto
 * sin stock lo esta hoy igual que ayer.
 */
export const useDashboard = () => {
  const { notify } = useNotify();

  const hoy = dayjs();
  const mesActual = hoy.month() + 1;
  const anioActual = hoy.year();

  const [periodoBalance, setPeriodoBalance] = useState<IPeriodoDashboard>({
    mes: mesActual,
    anio: anioActual,
  });
  const [periodoCobros, setPeriodoCobros] = useState<IPeriodoDashboard>({
    mes: mesActual,
    anio: anioActual,
  });
  const [periodoCosto, setPeriodoCosto] = useState<IPeriodoDashboard>({
    mes: mesActual,
    anio: anioActual,
  });
  const [periodoCompras, setPeriodoCompras] = useState<IPeriodoDashboard>({
    mes: mesActual,
    anio: anioActual,
  });

  const [datos, setDatos] = useState<RES_Dashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const enModoAuditable = useAuditoriaStore((state) => state.en_modo_auditable);

  /* ── Carga ─────────────────────────────────────────────────────────── */

  const cargar = useCallback(async () => {
    setLoading(true);

    try {
      const result = await DashboardService.getIndicadores({
        balance: rangoDelMes(periodoBalance.mes, periodoBalance.anio),
        cobros: rangoDelMes(periodoCobros.mes, periodoCobros.anio),
        costo: rangoDelMes(periodoCosto.mes, periodoCosto.anio),
        compras: rangoDelMes(periodoCompras.mes, periodoCompras.anio),
      });

      if (result.success) {
        setDatos(result.data);
      } else {
        notify({ type: "error", content: result.message });
      }
    } catch (error) {
      console.error(error);
      notify({
        type: "error",
        content: "Error al cargar los indicadores del dashboard",
      });
    } finally {
      setLoading(false);
    }
  }, [periodoBalance, periodoCobros, periodoCosto, periodoCompras, notify]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ── Modo Auditoria (es del cliente) ───────────────────────────────── */

  const visibles = useMemo(
    () => (datos ? aplicarModoAuditoria(datos, enModoAuditable) : null),
    [datos, enModoAuditable],
  );

  /* ── Años disponibles ──────────────────────────────────────────────── */

  const anios = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => anioActual - i);
  }, [anioActual]);

  return {
    // Periodos por bloque
    periodoBalance,
    setPeriodoBalance,
    periodoCobros,
    setPeriodoCobros,
    periodoCosto,
    setPeriodoCosto,
    periodoCompras,
    setPeriodoCompras,
    anios,
    // Datos
    datos: visibles,
    loading,
    cargar,
    // Contexto
    enModoAuditable,
  };
};
