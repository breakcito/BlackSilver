import { useCallback, useEffect, useState } from "react";
import { useNotify } from "../../../hooks/useNotify";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import { VentaMineralService } from "../service/venta-mineral.service";
import type {
  DespachoMineralDetalle,
  DespachoMineralResumen,
  LoteMineralDespachable,
} from "../service/venta-mineral.responses";

/**
 * Listado de despachos de mineral y los lotes que aun se pueden despachar.
 *
 * El detalle (gastos, fletes, comprobantes, analisis y liquidaciones) se
 * carga recien cuando la fila se despliega: es informacion de una sola venta
 * y no tiene sentido traerla para todas.
 */
export const useVentaMineral = (
  mes?: number,
  anio?: number,
  estado?: string,
) => {
  const { notifySuccess, notifyError } = useNotify();

  const [data, setData] = useState<IRespuesta<DespachoMineralResumen[]> | null>(
    null,
  );
  const [lotesDespachables, setLotesDespachables] = useState<
    LoteMineralDespachable[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /** Despachos desplegados en la tabla. */
  const [desplegados, setDesplegados] = useState<number[]>([]);
  /** Detalle ya cargado de cada despacho desplegado. */
  const [detalles, setDetalles] = useState<
    Record<number, DespachoMineralDetalle>
  >({});
  /** Id del despacho que se esta recargando (spinner en su fila). */
  const [detalleCargando, setDetalleCargando] = useState<number | null>(null);

  const fetchDespachos = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await VentaMineralService.getDespachos({ mes, anio, estado });

      if (response.success) {
        setData(response);
      } else {
        setData({ success: false, data: [], message: response.message });
      }
    } catch (error) {
      console.error(error);
      setData({
        success: false,
        data: [],
        message: "No se pudieron cargar los despachos",
      });
    } finally {
      setIsLoading(false);
    }
  }, [mes, anio, estado]);

  const fetchLotesDespachables = useCallback(async () => {
    try {
      const response = await VentaMineralService.getLotesDespachables();
      setLotesDespachables(response.success ? (response.data ?? []) : []);
    } catch (error) {
      console.error(error);
      setLotesDespachables([]);
    }
  }, []);

  useEffect(() => {
    void fetchDespachos();
  }, [fetchDespachos]);

  useEffect(() => {
    void fetchLotesDespachables();
  }, [fetchLotesDespachables]);

  /**
   * Parchea un despacho en la lista local, para no recargar el listado
   * entero despues de cada cambio.
   */
  const updateDespachoLocal = useCallback(
    (idDespacho: number, patch: Partial<DespachoMineralResumen>) => {
      setData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          data: prev.data.map((d) =>
            d.id_despacho_mineral === idDespacho ? { ...d, ...patch } : d,
          ),
        };
      });
    },
    [],
  );

  /**
   * Inserta un despacho recien creado en el listado, sin volver a consultar
   * la lista completa: la API ya devolvio el objeto creado.
   */
  const insertDespacho = useCallback((nuevo: DespachoMineralResumen) => {
    setData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        data: [nuevo, ...prev.data],
      };
    });
  }, []);

  /**
   * Carga (o recarga) el arbol de un despacho: gastos, fletes,
   * comprobantes, analisis y liquidaciones.
   */
  const refrescarDetalle = useCallback(async (idDespacho: number) => {
    setDetalleCargando(idDespacho);
    try {
      const response = await VentaMineralService.getDespacho(idDespacho);

      if (response.success && response.data) {
        setDetalles((prev) => ({
          ...prev,
          [idDespacho]: response.data as DespachoMineralDetalle,
        }));
      } else {
        notifyError(response.message || "No se pudo cargar el despacho");
      }
    } catch (error) {
      console.error(error);
      notifyError("Error de conexión al cargar el despacho");
    } finally {
      setDetalleCargando(null);
    }
  }, [notifyError]);

  /**
   * Despliega una fila: si su detalle todavia no se cargo, se pide.
   */
  const cambiarDespliegue = useCallback(
    (ids: number[]) => {
      setDesplegados(ids);

      const nuevo = ids.find((id) => detalles[id] === undefined);
      if (nuevo !== undefined) {
        void refrescarDetalle(nuevo);
      }
    },
    [detalles, refrescarDetalle],
  );

  const eliminarDespacho = useCallback(
    async (idDespacho: number) => {
      setSubmitting(true);
      try {
        const res = await VentaMineralService.eliminarDespacho(idDespacho);

        if (res.success) {
          notifySuccess(res.message || "Despacho eliminado correctamente");
          setData((prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              data: prev.data.filter(
                (d) => d.id_despacho_mineral !== idDespacho,
              ),
            };
          });
          setDetalles((prev) => {
            const copia = { ...prev };
            delete copia[idDespacho];
            return copia;
          });
          setDesplegados((prev) => prev.filter((id) => id !== idDespacho));
          await fetchLotesDespachables();
          return true;
        }

        notifyError(res.message || "No se pudo eliminar el despacho");
        return false;
      } catch (error) {
        console.error(error);
        notifyError("Error de conexión al eliminar el despacho");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [fetchLotesDespachables, notifyError, notifySuccess],
  );

  return {
    data,
    lotesDespachables,
    isLoading,
    submitting,
    desplegados,
    detalles,
    detalleCargando,
    refetch: fetchDespachos,
    refetchLotes: fetchLotesDespachables,
    updateDespachoLocal,
    insertDespacho,
    refrescarDetalle,
    cambiarDespliegue,
    eliminarDespacho,
  };
};
