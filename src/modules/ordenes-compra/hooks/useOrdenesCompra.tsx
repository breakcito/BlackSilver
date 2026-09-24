import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDisclosure } from "@mantine/hooks";
import { OrdenCompraService } from "../service/orden-compra.service.ts";
import { useNotify } from "../../../hooks/useNotify.ts";
import { usePrint } from "../../../hooks/usePrint.ts";
import { useExcel } from "../../../hooks/useExcel.ts";
import { buildOrdenesCompraExcel } from "../presentation/ordenes-compra-excel.tsx";
import { OrdenCompraPDF } from "../../../presentation/utils/orden-compra-pdf.tsx";
import { getOrdenCompraColumns } from "../presentation/orden-compra-page/orden-compra-columns.tsx";
import dayjs from "dayjs";
import { useAuditoriaStore } from "../../../stores/auditoria.store.ts";

import type {
  RES_OrdenCompra,
  RES_OrdenCompraDetalle,
} from "../../../service/responses/ordenes-compra/orden-compra.ts";
import type { DTO_RecepcionOCItem } from "../service/recepcion.requests";
import {
  Estado_OrdenCompra,
  Estado_OrdenCompraDetalle,
} from "../../../shared/enums/orden-compra/orden-compra";

export const useOrdenesCompraPage = () => {
  const { en_modo_auditable } = useAuditoriaStore();
  const { notify } = useNotify();
  const { print } = usePrint();
  const { generateExcel, isGeneratingExcel } = useExcel();
  const containerRef = useRef<HTMLDivElement>(null);

  const [ordenes, setOrdenes] = useState<RES_OrdenCompra[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [mes, setMes] = useState<string>(String(new Date().getMonth() + 1));
  const [yearcito, setYearcito] = useState<string>(
    String(new Date().getFullYear()),
  );
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string | null>(null);

  // Estado de Detalle y Impresión
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [selectedOrden, setSelectedOrden] = useState<RES_OrdenCompra | null>(
    null,
  );
  const [detalles, setDetalles] = useState<RES_OrdenCompraDetalle[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [openedDetalle, { open: openDet, close: closeDet }] =
    useDisclosure(false);

  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await OrdenCompraService.get_ordenes({
        mes,
        year: yearcito,
      });
      if (res.success) {
        setOrdenes(res.data ?? []);
      } else {
        notify({ type: "error", content: res.message });
      }
    } catch {
      notify({
        type: "error",
        content: "Error al cargar las Órdenes de Compra.",
      });
    } finally {
      setLoading(false);
    }
  }, [notify, mes, yearcito]);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  // Atajo de registro de comprobante desde el listado
  const [selectedOrdenForComprobante, setSelectedOrdenForComprobante] =
    useState<RES_OrdenCompra | null>(null);
  const [selectedRecepcionesIds, setSelectedRecepcionesIds] = useState<
    number[]
  >([]);
  const [
    openedHistorialComprobante,
    { open: openHistorialComprobante, close: closeHistorialComprobante },
  ] = useDisclosure(false);
  const [
    openedRegistroComprobante,
    { open: openRegistroComprobante, close: closeRegistroComprobante },
  ] = useDisclosure(false);

  const handleAbrirRegistroComprobante = useCallback(
    (orden: RES_OrdenCompra) => {
      setSelectedOrdenForComprobante(orden);
      setSelectedRecepcionesIds([]);
      openHistorialComprobante();
    },
    [openHistorialComprobante],
  );

  const handleCerrarHistorialComprobante = useCallback(() => {
    setSelectedOrdenForComprobante(null);
    setSelectedRecepcionesIds([]);
    closeHistorialComprobante();
  }, [closeHistorialComprobante]);

  const handleCerrarRegistroComprobante = useCallback(() => {
    closeRegistroComprobante();
  }, [closeRegistroComprobante]);

  const handleComprobanteRegistrado = useCallback(() => {
    closeRegistroComprobante();
    closeHistorialComprobante();
    setSelectedOrdenForComprobante(null);
    setSelectedRecepcionesIds([]);
    fetchOrdenes();
  }, [closeRegistroComprobante, closeHistorialComprobante, fetchOrdenes]);

  const handlePrintOC = useCallback(
    async (orden: RES_OrdenCompra) => {
      setPrintingId(orden.id_orden_compra);
      try {
        const res = await OrdenCompraService.get_detalles(
          orden.id_orden_compra,
        );
        if (res.success) {
          print(
            <OrdenCompraPDF
              orden={orden}
              detalles={res.data}
              colorPredominante={orden.color_predominante_empresa}
            />,
            {
              documentTitle: `OC - ${orden.correlativo}`,
            },
          );
        } else {
          notify({ type: "error", content: res.message });
        }
      } catch {
        notify({ type: "error", content: "No se pudo generar el PDF." });
      } finally {
        setPrintingId(null);
      }
    },
    [print, notify],
  );

  const handleVerDetalle = useCallback(
    async (orden: RES_OrdenCompra) => {
      setSelectedOrden(orden);
      openDet();
      setLoadingDetalle(true);
      try {
        const res = await OrdenCompraService.get_detalles(
          orden.id_orden_compra,
        );
        if (res.success) {
          setDetalles(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDetalle(false);
      }
    },
    [openDet],
  );

  const filteredRecords = useMemo(() => {
    let result = ordenes.filter(
      (item) => !(en_modo_auditable && item.es_auditable),
    );
    const q = search.toLowerCase().trim();

    if (q) {
      result = result.filter(
        (item) =>
          (item.correlativo || "").toLowerCase().includes(q) ||
          (item.empresa || "").toLowerCase().includes(q) ||
          (item.correlativo_cotizacion || "").toLowerCase().includes(q),
      );
    }

    if (estadoFilter) {
      result = result.filter((item) => item.estado === estadoFilter);
    }

    return result;
  }, [ordenes, search, estadoFilter, en_modo_auditable]);

  const detallesFiltrados = useMemo(() => {
    return detalles.filter((d) => !(en_modo_auditable && d.es_auditable));
  }, [detalles, en_modo_auditable]);

  const columns = useMemo(
    () =>
      getOrdenCompraColumns({
        handleVerDetalle,
        handlePrintOC,
        handleAbrirRegistroComprobante,
        printingId,
      }),
    [printingId, handleVerDetalle, handleAbrirRegistroComprobante],
  );

  const groupedOrders = useMemo(() => {
    const groups: Record<
      string,
      { empresa: string; ruc: string; orders: RES_OrdenCompra[] }
    > = {};

    filteredRecords.forEach((order) => {
      if (!groups[order.empresa_ruc]) {
        groups[order.empresa_ruc] = {
          empresa: order.empresa,
          ruc: order.empresa_ruc,
          orders: [],
        };
      }
      groups[order.empresa_ruc].orders.push(order);
    });

    // 1. Ordenar empresas ascendentemente por nombre
    const sortedGroups = Object.values(groups).sort((a, b) =>
      a.empresa.localeCompare(b.empresa),
    );

    // 2. Ordenar órdenes dentro de cada empresa por fecha descendente
    return sortedGroups.map((group) => ({
      ...group,
      orders: [...group.orders].sort((a, b) =>
        dayjs(b.fecha_hora_orden).diff(dayjs(a.fecha_hora_orden)),
      ),
    }));
  }, [filteredRecords]);

  const tableColumns = useMemo(
    () => columns.filter((col) => col.accessor !== "empresa"),
    [columns],
  );

  const updateLocalStateAfterReception = useCallback(
    (recepcionItems: DTO_RecepcionOCItem[]) => {
      // 1. Actualizar detalles locales
      const nuevosDetalles = detalles.map((d) => {
        const itemsRecibidos = recepcionItems.filter(
          (ri) => ri.id_orden_compra_detalle === d.id_orden_compra_detalle,
        );

        if (itemsRecibidos.length === 0) return d;

        const totalRecibidoAhora = itemsRecibidos.reduce(
          (acc, curr) => acc + (Number(curr.cantidad_base) || 0),
          0,
        );

        const nuevaCantRecepcionada =
          (Number(d.cantidad_recepcionada_base) || 0) + totalRecibidoAhora;
        const req = Number(d.cantidad_requerida_base) || 0;

        let nuevoEstado = d.estado;
        if (nuevaCantRecepcionada >= req - 0.001) {
          nuevoEstado = Estado_OrdenCompraDetalle.RecepcionCompleta;
        } else if (nuevaCantRecepcionada > 0) {
          nuevoEstado = Estado_OrdenCompraDetalle.EnRecepcion;
        }

        return {
          ...d,
          cantidad_recepcionada_base: nuevaCantRecepcionada,
          estado: nuevoEstado,
        };
      });

      setDetalles(nuevosDetalles);

      // 2. Determinar nuevo estado de la OC
      const totalItems = nuevosDetalles.length;
      const completados = nuevosDetalles.filter(
        (d) => d.estado === Estado_OrdenCompraDetalle.RecepcionCompleta,
      ).length;

      let nuevoEstadoOC = Estado_OrdenCompra.EnRecepcion;
      if (completados === totalItems && totalItems > 0) {
        nuevoEstadoOC = Estado_OrdenCompra.Completada;
      }

      // 3. Actualizar selectedOrden si existe
      if (selectedOrden) {
        setSelectedOrden({
          ...selectedOrden,
          estado: nuevoEstadoOC,
        });
      }

      // 4. Actualizar en la lista general de ordenes
      setOrdenes((prev) =>
        prev.map((o) =>
          o.id_orden_compra === selectedOrden?.id_orden_compra
            ? { ...o, estado: nuevoEstadoOC }
            : o,
        ),
      );
    },
    [detalles, selectedOrden],
  );

  const handleExportExcel = useCallback(async () => {
    if (filteredRecords.length === 0) {
      notify({
        type: "info",
        content: "No hay registros filtrados para exportar.",
      });
      return;
    }

    const ids = filteredRecords.map((o) => o.id_orden_compra);

    generateExcel({
      filename: `Ordenes_Compra_${dayjs().format("DD_MM_YYYY_HHmm")}`,
      builder: async (workbook) => {
        const res = await OrdenCompraService.get_detalles(ids);
        if (res.success) {
          await buildOrdenesCompraExcel(workbook, filteredRecords, res.data);
        } else {
          throw new Error(res.message);
        }
      },
    });
  }, [filteredRecords, generateExcel, notify]);

  return {
    ordenes,
    filteredRecords,
    loading,
    fetchOrdenes,
    filters: {
      mes,
      setMes,
      yearcito,
      setYearcito,
      search,
      setSearch,
      estadoFilter,
      setEstadoFilter,
      handleExportExcel,
      isGeneratingExcel,
    },
    containerRef,
    printingId,
    selectedOrden,
    detalles: detallesFiltrados,
    loadingDetalle,
    openedDetalle,
    closeDet,
    handlePrintOC,
    handleVerDetalle,
    handleAbrirRegistroComprobante,
    columns,
    groupedOrders,
    tableColumns,
    updateLocalStateAfterReception,
    selectedOrdenForComprobante,
    selectedRecepcionesIds,
    setSelectedRecepcionesIds,
    openedHistorialComprobante,
    handleCerrarHistorialComprobante,
    openedRegistroComprobante,
    handleCerrarRegistroComprobante,
    handleAbrirRegistroComprobanteModal: openRegistroComprobante,
    handleComprobanteRegistrado,
  };
};
