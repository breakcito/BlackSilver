import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Almacen } from "../../../service/responses/almacen";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";
import { useAuditoriaStore } from "../../../stores/auditoria.store";
import { aplicarModoAuditoria } from "../presentation/dashboard-calculos";
import { DashboardService } from "../service/dashboard.service";
import type { RES_Dashboard } from "../service/dashboard.responses";

/**
 * Estado y logica del Dashboard.
 *
 * El dashboard pide TODO en una sola llamada: los siete indicadores van en el
 * mismo payload para que todos los bloques hablen del mismo snapshot.
 *
 * Dos filtros gobiernan la pantalla:
 * - `mes`/`anio` acotan el PERIODO: afecta a los indicadores de flujo
 *   (balance, cobros y costo de mantenimiento).
 * - `idAlmacen` acota el AMBITO: afecta a todos los indicadores.
 *
 * Los indicadores de estado (stock critico, mantenimiento proximo y
 * pendientes de atencion) son una foto del ahora: el backend no los filtra
 * por periodo porque un producto sin stock lo esta hoy igual que ayer.
 */
export const useDashboard = () => {
  const { notify } = useNotify();

  const hoy = dayjs();

  const [mes, setMes] = useState<number>(hoy.month() + 1);
  const [anio, setAnio] = useState<number>(hoy.year());
  const [idAlmacen, setIdAlmacen] = useState<number | null>(null);
  const [busquedaAlmacen, setBusquedaAlmacen] = useState("");

  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [datos, setDatos] = useState<RES_Dashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const enModoAuditable = useAuditoriaStore((state) => state.en_modo_auditable);

  /* ── Catalogo de almacenes (filtro global) ─────────────────────────── */

  useEffect(() => {
    let vigente = true;

    const cargarAlmacenes = async () => {
      try {
        // para_carbon: el dashboard mira TODOS los almacenes, tambien los de
        // carbon: el balance separa mineral de carbon y las alertas de stock
        // no tienen por que discriminar.
        const result = await AuxService.get_almacenes({ para_carbon: true });

        if (!vigente) return;

        if (result.success) {
          setAlmacenes(result.data);
        } else {
          notify({ type: "error", content: result.message });
        }
      } catch (error) {
        console.error(error);
        notify({ type: "error", content: "Error al cargar los almacenes" });
      }
    };

    void cargarAlmacenes();

    return () => {
      vigente = false;
    };
  }, [notify]);

  /* ── Periodo ───────────────────────────────────────────────────────── */

  const rango = useMemo(() => {
    const base = dayjs(`${anio}-${String(mes).padStart(2, "0")}-01`);
    return {
      fecha_inicio: base.startOf("month").format("YYYY-MM-DD"),
      fecha_fin: base.endOf("month").format("YYYY-MM-DD"),
    };
  }, [mes, anio]);

  /* ── Carga ─────────────────────────────────────────────────────────── */

  const cargar = useCallback(async () => {
    setLoading(true);

    try {
      const result = await DashboardService.getIndicadores({
        fecha_inicio: rango.fecha_inicio,
        fecha_fin: rango.fecha_fin,
        id_almacen: idAlmacen,
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
  }, [rango, idAlmacen, notify]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ── Modo Auditoria (es del cliente) ───────────────────────────────── */

  const visibles = useMemo(
    () => (datos ? aplicarModoAuditoria(datos, enModoAuditable) : null),
    [datos, enModoAuditable],
  );

  /* ── Filtro de almacenes con busqueda tolerante ────────────────────── */

  const almacenesVisibles = useMemo(() => {
    const q = busquedaAlmacen.trim();
    if (!q) return almacenes;

    return getCoincidencias(almacenes, q, {
      keys: ["nombre"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [almacenes, busquedaAlmacen]);

  /* ── Años disponibles ──────────────────────────────────────────────── */

  const anios = useMemo(() => {
    const actual = hoy.year();
    return Array.from({ length: 6 }, (_, i) => actual - i);
  }, [hoy]);

  const almacenSeleccionado = useMemo(
    () => almacenes.find((a) => a.id_almacen === idAlmacen) ?? null,
    [almacenes, idAlmacen],
  );

  return {
    // Filtros
    mes,
    setMes,
    anio,
    setAnio,
    anios,
    idAlmacen,
    setIdAlmacen,
    almacenSeleccionado,
    busquedaAlmacen,
    setBusquedaAlmacen,
    almacenesVisibles,
    // Datos
    datos: visibles,
    loading,
    cargar,
    // Contexto
    enModoAuditable,
    rango,
  };
};
