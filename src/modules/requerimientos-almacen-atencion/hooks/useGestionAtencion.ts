import { useState, useCallback, useEffect, useMemo } from "react";
import { useDisclosure } from "@mantine/hooks";
import { AtencionService } from "../service/atencion.service";
import type { DetalleRequerimientoExtendido } from "../service/atencion.responses";
import type { AxiosError } from "axios";
import type { RES_Trazabilidad } from "../../../service/responses/_generic/trazabilidad";
import {
  Estado_RequerimientoDetalle,
  Estado_RequerimientoDetalleLog,
} from "../../../shared/enums/requerimiento-almacen/requerimiento";

interface UseGestionAtencionProps {
  idRequerimiento: number;
  onSuccess: (ids?: number[]) => void;
  /**
   * Si es true, el requerimiento esta anulado y la UI debe impedir
   * seleccionar items / abrir el modal de entrega. El backend igual
   * rechaza entregas sobre un requerimiento anulado, pero bloqueamos
   * aca para evitar malas experiencias y botones habilitados en vano.
   */
  requerimientoAnulado?: boolean;
}

export const useGestionAtencion = ({
  idRequerimiento,
  onSuccess,
  requerimientoAnulado = false,
}: UseGestionAtencionProps) => {
  const [loading, setLoading] = useState(true);
  const [detalles, setDetalles] = useState<DetalleRequerimientoExtendido[]>([]);
  const [error, setError] = useState("");
  const [eventos, setEventos] = useState<RES_Trazabilidad[]>([]);
  const [loadingTrazabilidad, setLoadingTrazabilidad] = useState(false);

  // Modal Control
  const [openedTrace, { open: openTrace, close: closeTrace }] =
    useDisclosure(false);
  const [openedRechazo, { open: openRechazo, close: closeRechazo }] =
    useDisclosure(false);
  const [openedAprobar, { open: openAprobar, close: closeAprobar }] =
    useDisclosure(false);
  const [
    openedEntregaBatch,
    { open: openEntregaBatch, close: closeEntregaBatch },
  ] = useDisclosure(false);
  const [
    openedHistorialGlobal,
    { open: openHistorialGlobal, close: closeHistorialGlobal },
  ] = useDisclosure(false);
  const [isLogisticaModalOpen, setIsLogisticaModalOpen] = useState(false);

  // Selected Data
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [comentarioAccion, setComentarioAccion] = useState("");
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  // Batch Selection (para entrega/despacho - NO TOCAR)
  const [selectedItemsIds, setSelectedItemsIds] = useState<number[]>([]);

  // Batch Pendientes (para aprobar/rechazar masivamente de forma independiente)
  const [idsParaAccionMasiva, setIdsParaAccionMasiva] = useState<number[]>([]);

  const toggleItemSelection = useCallback((id: number) => {
    if (requerimientoAnulado) return;
    setSelectedItemsIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, [requerimientoAnulado]);

  const toggleSeleccionMasiva = useCallback((id: number) => {
    if (requerimientoAnulado) return;
    setIdsParaAccionMasiva((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, [requerimientoAnulado]);

  const deseleccionarMasivos = useCallback(() => {
    setIdsParaAccionMasiva([]);
  }, []);

  const isAllPendingSelected = useMemo(() => {
    const pendientes = detalles.filter(
      (d) =>
        d.estado === Estado_RequerimientoDetalle.EsperandoAprobacion.toString(),
    );
    return (
      pendientes.length > 0 && idsParaAccionMasiva.length === pendientes.length
    );
  }, [detalles, idsParaAccionMasiva]);

  const seleccionarTodoLoPendiente = useCallback(() => {
    if (isAllPendingSelected) {
      setIdsParaAccionMasiva([]);
    } else {
      const pendientes = detalles.filter(
        (d) =>
          d.estado ===
          Estado_RequerimientoDetalle.EsperandoAprobacion.toString(),
      );
      setIdsParaAccionMasiva(
        pendientes.map((d) => d.id_requerimiento_almacen_detalle),
      );
    }
  }, [detalles, isAllPendingSelected]);

  const deselectAllItems = useCallback(() => {
    setSelectedItemsIds([]);
  }, []);

  const eligibleForDelivery = useMemo(() => {
    return detalles.filter(
      (d) =>
        d.estado === Estado_RequerimientoDetalle.Aprobado.toString() ||
        d.estado === Estado_RequerimientoDetalle.EnDespacho.toString(),
    );
  }, [detalles]);

  const isAllEligibleSelected = useMemo(() => {
    return (
      eligibleForDelivery.length > 0 &&
      eligibleForDelivery.every((d) =>
        selectedItemsIds.includes(d.id_requerimiento_almacen_detalle),
      )
    );
  }, [eligibleForDelivery, selectedItemsIds]);

  const hasPartialEligibleSelection = useMemo(() => {
    return (
      !isAllEligibleSelected &&
      eligibleForDelivery.some((d) =>
        selectedItemsIds.includes(d.id_requerimiento_almacen_detalle),
      )
    );
  }, [eligibleForDelivery, selectedItemsIds, isAllEligibleSelected]);

  const toggleSelectAllEligible = useCallback(() => {
    if (isAllEligibleSelected) {
      setSelectedItemsIds([]);
    } else {
      setSelectedItemsIds(
        eligibleForDelivery.map((d) => d.id_requerimiento_almacen_detalle),
      );
    }
  }, [eligibleForDelivery, isAllEligibleSelected]);

  const onConsultarLogisticaClick = () => {
    setIsLogisticaModalOpen(true);
  };

  const handleCloseLogisticaModal = () => {
    setIsLogisticaModalOpen(false);
    deselectAllItems();
  };

  const onSuccessLogistica = (ids?: number[]) => {
    if (!ids) return;
    handleCloseLogisticaModal();
    onSuccess(ids);
  };

  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const resp =
          await AtencionService.obtenerDetallesRequerimiento(idRequerimiento);
        if (resp.success) {
          setDetalles(
            resp.data.map((d) => ({
              ...d,
              pendiente_base:
                d.cantidad_solicitada_base - d.cantidad_entregada_base,
              equivReq:
                d.cantidad_solicitada > 0
                  ? d.cantidad_solicitada_base / d.cantidad_solicitada
                  : 1,
            })),
          );
        } else {
          setError(resp.message || "Error al obtener detalles");
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message: string }>;
        setError(axiosError.response?.data?.message || "Error de conexión");
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [idRequerimiento],
  );

  useEffect(() => {
    loadData();
  }, [idRequerimiento, loadData]);

  useEffect(() => {
    if (openedTrace && selectedItemId) {
      const loadTrace = async () => {
        setLoadingTrazabilidad(true);
        try {
          const res = await AtencionService.obtenerTrazabilidad(selectedItemId);
          if (res.success) {
            setEventos(res.data);
          } else {
            setEventos([]);
          }
        } catch {
          setEventos([]);
        }
        setLoadingTrazabilidad(false);
      };
      loadTrace();
    }
  }, [openedTrace, selectedItemId]);

  const handleAprobar = useCallback(async () => {
    if (!selectedItemId) return;
    setIsProcessing(selectedItemId);
    setError("");
    try {
      const res = await AtencionService.cambiarEstadoDetalle({
        id_requerimiento_almacen_detalle: selectedItemId,
        nuevo_estado: Estado_RequerimientoDetalle.Aprobado,
        comentario_decision: comentarioAccion,
      });
      if (res.success) {
        closeAprobar();
        const motivo = comentarioAccion;
        setComentarioAccion("");
        setDetalles((prev) =>
          prev.map((item) =>
            item.id_requerimiento_almacen_detalle === selectedItemId
              ? {
                  ...item,
                  estado: Estado_RequerimientoDetalle.Aprobado,
                  comentario_decision: motivo,
                }
              : item,
          ),
        );
        onSuccess([selectedItemId]);
      } else {
        setError(res.message || "Error al aprobar");
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string }>;
      setError(axiosError.response?.data?.message || "Error de conexión");
    } finally {
      setIsProcessing(null);
    }
  }, [selectedItemId, comentarioAccion, closeAprobar, onSuccess]);

  const handleRechazar = useCallback(async () => {
    if (!selectedItemId) return;
    setIsProcessing(selectedItemId);
    setError("");
    try {
      const res = await AtencionService.cambiarEstadoDetalle({
        id_requerimiento_almacen_detalle: selectedItemId,
        nuevo_estado: Estado_RequerimientoDetalle.Rechazado,
        comentario_decision: comentarioAccion,
      });
      if (res.success) {
        closeRechazo();
        const motivo = comentarioAccion;
        setComentarioAccion("");
        setDetalles((prev) =>
          prev.map((item) =>
            item.id_requerimiento_almacen_detalle === selectedItemId
              ? {
                  ...item,
                  estado: Estado_RequerimientoDetalle.Rechazado,
                  comentario_decision: motivo,
                }
              : item,
          ),
        );
        onSuccess([selectedItemId]);
      } else {
        setError(res.message || "Error al rechazar");
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string }>;
      setError(axiosError.response?.data?.message || "Error de conexión");
    } finally {
      setIsProcessing(null);
    }
  }, [selectedItemId, comentarioAccion, closeRechazo, onSuccess]);

  const handleDecisionMasiva = useCallback(
    async (estado: Estado_RequerimientoDetalle) => {
      if (idsParaAccionMasiva.length === 0) return;
      setIsProcessing(-1); // -1 para batch
      setError("");
      try {
        const res = await AtencionService.cambiarEstadoDetalle({
          ids_detalles: idsParaAccionMasiva,
          nuevo_estado: estado,
          comentario_decision: comentarioAccion,
        });
        if (res.success) {
          if (estado === Estado_RequerimientoDetalle.Aprobado) closeAprobar();
          else closeRechazo();

          const ids = [...idsParaAccionMasiva];
          const motivo = comentarioAccion;
          setComentarioAccion("");
          deseleccionarMasivos();
          setDetalles((prev) =>
            prev.map((item) =>
              ids.includes(item.id_requerimiento_almacen_detalle)
                ? { ...item, estado, comentario_decision: motivo }
                : item,
            ),
          );
          onSuccess(ids);
        } else {
          setError(res.message || "Error al procesar la acción masiva");
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message: string }>;
        setError(axiosError.response?.data?.message || "Error de conexión");
      } finally {
        setIsProcessing(null);
      }
    },
    [
      idsParaAccionMasiva,
      comentarioAccion,
      closeAprobar,
      closeRechazo,
      onSuccess,
      deseleccionarMasivos,
    ],
  );

  const patchDetallesLocales = useCallback(
    (entregados: Record<string | number, number>) => {
      setDetalles((prevDetails) => {
        const newDetails = prevDetails.map((item) => {
          const idKey = item.id_requerimiento_almacen_detalle;
          // Buscamos el monto entregado asegurando que el ID coincida (como número o string)
          const amountDelivered = Number(
            entregados[idKey] ?? entregados[idKey.toString()] ?? 0,
          );

          if (amountDelivered > 0) {
            const currentDeliveredBase = Number(
              item.cantidad_entregada_base || 0,
            );
            const reqRequestedBase = Number(item.cantidad_solicitada_base || 0);
            const equiv = Number(item.equivReq || 1);

            const nuevaCantidadBase = currentDeliveredBase + amountDelivered;
            const nuevaCantidad = nuevaCantidadBase / equiv;
            const nuevoProgreso = Math.min(
              100,
              Math.round((nuevaCantidadBase / reqRequestedBase) * 100),
            );

            let nuevoEstado = item.estado;
            if (nuevoProgreso >= 100) {
              nuevoEstado = Estado_RequerimientoDetalle.Completado;
            } else if (nuevaCantidadBase > 0) {
              nuevoEstado = Estado_RequerimientoDetalle.EnDespacho;
            }

            return {
              ...item,
              cantidad_entregada_base: nuevaCantidadBase,
              cantidad_entregada: nuevaCantidad,
              pendiente_base: Math.max(0, reqRequestedBase - nuevaCantidadBase),
              porcentaje_progreso: nuevoProgreso,
              estado: nuevoEstado,
            };
          }
          return item;
        });
        return newDetails;
      });

      // Notificar al padre después de planificar el despacho local
      onSuccess(Object.keys(entregados).map(Number));
    },
    [onSuccess],
  );

  const getStatusColor = (status: string) => {
    if (
      status === Estado_RequerimientoDetalleLog.EsperandoAprobacion.toString()
    )
      return "blue";
    if (status === Estado_RequerimientoDetalleLog.Aprobado.toString())
      return "violet";
    if (status === Estado_RequerimientoDetalleLog.EnDespacho.toString())
      return "orange";
    if (status === Estado_RequerimientoDetalleLog.NuevaEntrega.toString())
      return "green";
    if (status === Estado_RequerimientoDetalleLog.Completado.toString())
      return "teal";
    if (status === Estado_RequerimientoDetalleLog.Rechazado.toString())
      return "red";
    return "zinc";
  };

  const progresoGeneral = useMemo(() => {
    if (detalles.length === 0) return 0;

    const itemsAtendibles = detalles.filter(
      (item) =>
        item.estado !== Estado_RequerimientoDetalleLog.Rechazado.toString() &&
        item.estado !==
          Estado_RequerimientoDetalleLog.RechazadoLogistica.toString() &&
        item.estado !==
          Estado_RequerimientoDetalleLog.EsperandoAprobacion.toString() &&
        (item.estado as string) !== "Anulado",
    );

    if (itemsAtendibles.length === 0) return 0;

    const sumaProgreso = itemsAtendibles.reduce((acc, item) => {
      return acc + Number(item.porcentaje_progreso || 0);
    }, 0);

    return Math.round(sumaProgreso / itemsAtendibles.length);
  }, [detalles]);

    return {
      loading,
      detalles: detalles,
      error,
      eventos,
      loadingTrazabilidad,
      openedTrace,
      openTrace,
      closeTrace,
      openedRechazo,
      openRechazo,
      closeRechazo,
      openedAprobar,
      openAprobar,
      closeAprobar,
      openedEntregaBatch,
      openEntregaBatch,
      closeEntregaBatch,
      openedHistorialGlobal,
      openHistorialGlobal,
      closeHistorialGlobal,
      selectedItemId,
      setSelectedItemId,
      selectedItemName,
      setSelectedItemName,
      selectedItemsIds,
      toggleItemSelection,
      deselectAllItems,
      isAllEligibleSelected,
      hasPartialEligibleSelection,
      toggleSelectAllEligible,
      idsParaAccionMasiva,
      toggleSeleccionMasiva,
      isAllPendingSelected,
      seleccionarTodoLoPendiente,
      comentarioAccion,
      setComentarioAccion,
      isProcessing,
      progresoGeneral,
      handleAprobar,
      handleRechazar,
      handleDecisionMasiva,
      getStatusColor,
      loadData,
      logistica: {
        isOpen: isLogisticaModalOpen,
        open: onConsultarLogisticaClick,
        close: handleCloseLogisticaModal,
        onSuccess: onSuccessLogistica,
      },
      patchDetallesLocales,
      /** True cuando el requerimiento padre esta anulado. */
      requerimientoAnulado,
    };
  };
