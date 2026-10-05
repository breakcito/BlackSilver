import { useState, useEffect, useCallback } from "react";
import type { LoteMineralResumen } from "../service/lote-mineral.responses";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import { useNotify } from "../../../hooks/useNotify";
import { loteMineralService } from "../service/lote-mineral.service";
import { ProduccionService } from "../../produccion-mineral/service/produccion.service";
import { EstadoLoteMineral } from "../../../shared/enums/lote-mineral";
import type { RegistrarLoteMineralRequest } from "../service/lote-mineral.requests";

export const useLotesMineral = (mes?: number, anio?: number) => {
  const { notifySuccess, notifyError } = useNotify();
  const [data, setData] = useState<IRespuesta<LoteMineralResumen[]> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchLotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await loteMineralService.getLotes({ mes, anio });
      if (response.success) {
        setData(response);
      } else {
        setData({ success: false, data: [], message: "Error" });
      }
    } catch (error) {
      console.error(error);
      setData({ success: false, data: [], message: "Error" });
    } finally {
      setIsLoading(false);
    }
  }, [mes, anio]);

  const addLote = useCallback((newLote: LoteMineralResumen) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: [newLote, ...prev.data],
      };
    });
  }, []);

  /**
   * Parchea un lote en la lista local sin recargar el endpoint.
   * Usado para reflejar cambios de estado (ej. al finalizar).
   */
  const updateLoteLocal = useCallback(
    (id_lote_mineral: number, patch: Partial<LoteMineralResumen>) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((l) =>
            l.id_lote_mineral === id_lote_mineral ? { ...l, ...patch } : l,
          ),
        };
      });
    },
    [],
  );

  /**
   * Finaliza un lote de mineral reutilizando el endpoint de produccion-mineral
   * (`ProduccionService.finalizarProduccion` -> POST /produccion-mineral/finalizar).
   * Misma logica que el modulo de Produccion de Mineral; no se duplica
   * el endpoint. Refleja el cambio de estado localmente para no recargar
   * la lista.
   */
  const finalizarLote = useCallback(
    async (id_lote_mineral: number) => {
      setSubmitting(true);
      try {
        const resp =
          await ProduccionService.finalizarProduccion(id_lote_mineral);
        if (resp.success) {
          notifySuccess("Lote de mineral finalizado correctamente.");
          updateLoteLocal(id_lote_mineral, {
            estado: EstadoLoteMineral.Finalizado,
          });
          return true;
        }
        notifyError(resp.message || "Error al finalizar el lote");
        return false;
      } catch (err) {
        console.error(err);
        notifyError("Error de conexión");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [notifySuccess, notifyError, updateLoteLocal],
  );

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  return {
    data,
    isLoading,
    refetch: fetchLotes,
    addLote,
    updateLoteLocal,
    finalizarLote,
    submitting,
  };
};

export const useRegistrarLoteMineralResumen = () => {
  const { notifySuccess, notifyError } = useNotify();
  const [isPending, setIsPending] = useState(false);

  const mutate = async (
    request: RegistrarLoteMineralRequest,
    options?: { onSuccess?: (data: LoteMineralResumen) => void },
  ) => {
    setIsPending(true);
    try {
      const response = await loteMineralService.registrarLote(request);
      if (response.success && response.data) {
        notifySuccess(response.message || "Lote registrado correctamente");
        if (options?.onSuccess) {
          options.onSuccess(response.data);
        }
      } else {
        notifyError(
          response.message || "Ocurrió un error al registrar el lote",
        );
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      notifyError(err?.response?.data?.message || "Error de conexión");
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
};
