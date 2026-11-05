import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { LotesService } from "../service/lotes.service";
import type { RES_Lote } from "../service/lotes.responses";
import { useNotify } from "../../../hooks/useNotify";
import { useUIStore } from "../../../stores/ui.store";
import type { RES_TicketLote } from "../../../service/responses/lote-producto";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Almacen } from "../../../service/responses/almacen";
import { useAuthStore } from "../../../stores/auth.store";
import { useAuditoriaStore } from "../../../stores/auditoria.store";
import { EstadoBase } from "../../../shared/enums/_generic/estado-base";

export const useLotesPage = () => {
  const { en_modo_auditable } = useAuditoriaStore();
  const setTitle = useUIStore((state) => state.setTitle);
  const { notifySuccess, notifyError } = useNotify();

  const [searchParams] = useSearchParams();
  const initialAlmacenId = searchParams.get("idAlmacen");

  // States
  const [lotes, setLotes] = useState<RES_Lote[]>([]);
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  /** Lote pendiente de confirmar para eliminar. */
  const [lotePorEliminar, setLotePorEliminar] = useState<RES_Lote | null>(null);

  // Filters
  const [idAlmacen, setIdAlmacen] = useState<string | null>(initialAlmacenId);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [filtroProducto, setFiltroProducto] = useState<string | null>(null);
  const [selectedLotes, setSelectedLotes] = useState<RES_Lote[]>([]);

  // Initial load
  useEffect(() => {
    setTitle("Lotes");
    const loadAlmacenes = async () => {
      setLoadingAlmacenes(true);
      try {
        const result = await AuxService.get_almacenes({
          id_empleado_responsable: useAuthStore.getState().usuario?.id_empleado,
        });
        if (result.success) {
          setAlmacenes(result.data);
          if (!initialAlmacenId && result.data.length > 0) {
            setIdAlmacen(String(result.data[0].id_almacen));
          }
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoadingAlmacenes(false);
      }
    };
    loadAlmacenes();
  }, [setTitle, initialAlmacenId]);

  const recargarLotes = useCallback(async () => {
    if (!idAlmacen) {
      setLotes([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await LotesService.listarResumenLotes(Number(idAlmacen));
      if (result.success) {
        setLotes(result.data);
        setBusqueda("");
        setFiltroCategoria(null);
        setFiltroProducto(null);
        setSelectedLotes([]);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [idAlmacen]);

  // Load lotes when warehouse changes
  useEffect(() => {
    recargarLotes();
  }, [recargarLotes]);

  // Lotes vigentes. Los inactivos (baja logica) no se muestran: al inactivar
  // un lote desaparece de la tabla al instante, sin recargar la pagina.
  const lotesVigentes = useMemo(
    () => lotes.filter((l) => l.estado === EstadoBase.Activo),
    [lotes],
  );

  // Derived Data (Filtros)
  const categoriasUnicas = useMemo(() => {
    const unique = new Set(
      lotesVigentes.map((l) => l.categoria).filter(Boolean),
    );
    return Array.from(unique)
      .sort()
      .map((c) => ({ value: String(c), label: String(c) }));
  }, [lotesVigentes]);

  const productosUnicos = useMemo(() => {
    const source = filtroCategoria
      ? lotesVigentes.filter((l) => l.categoria === filtroCategoria)
      : lotesVigentes;
    const unique = new Set(source.map((l) => l.producto).filter(Boolean));
    return Array.from(unique)
      .sort()
      .map((p) => ({ value: String(p), label: String(p) }));
  }, [lotesVigentes, filtroCategoria]);

  const filteredRecords = useMemo(() => {
    return lotesVigentes.filter((l) => {
      // Filtro modo auditoría
      if (en_modo_auditable && l.es_auditable) return false;

      const matchCategoria =
        !filtroCategoria || l.categoria === filtroCategoria;
      const matchProducto = !filtroProducto || l.producto === filtroProducto;
      const q = busqueda.toLowerCase();
      const matchBusqueda =
        !busqueda ||
        l.producto.toLowerCase().includes(q) ||
        l.correlativo.toLowerCase().includes(q) ||
        (l.correlativo_auditoria ?? "").toLowerCase().includes(q) ||
        (l.categoria || "").toLowerCase().includes(q);
      return matchCategoria && matchProducto && matchBusqueda;
    });
  }, [
    lotesVigentes,
    busqueda,
    filtroCategoria,
    filtroProducto,
    en_modo_auditable,
  ]);

  // LÓGICA DE SELECCIÓN CRÍTICA (Memorizada como en ProductGroupSelection)
  const visibleIds = useMemo(
    () => filteredRecords.map((r) => r.id_lote),
    [filteredRecords],
  );

  const selectedVisibleCount = useMemo(() => {
    return selectedLotes.filter((s) => visibleIds.includes(s.id_lote)).length;
  }, [selectedLotes, visibleIds]);

  const isAllSelected = useMemo(
    () => visibleIds.length > 0 && selectedVisibleCount === visibleIds.length,
    [visibleIds, selectedVisibleCount],
  );

  const isIndeterminate = useMemo(
    () => selectedVisibleCount > 0 && !isAllSelected,
    [selectedVisibleCount, isAllSelected],
  );

  /**
   * Desactiva un lote (baja logica). La confirmacion la pide la UI con el
   * modal de confirmacion: aqui solo se ejecuta la accion.
   */
  const eliminarLote = useCallback(
    async (id_lote: number): Promise<boolean> => {
      setDeletingId(id_lote);
      try {
        const resp = await LotesService.eliminar(id_lote);
        if (resp.success) {
          notifySuccess(resp.message);
          // Reemplazamos la fila por la versión devuelta (estado=Inactivo)
          setLotes((prev) =>
            prev.map((l) =>
              l.id_lote === id_lote ? resp.data : l,
            ),
          );
          return true;
        }
        notifyError(resp.message);
        return false;
      } catch (err) {
        console.error(err);
        notifyError("Error inesperado al eliminar el lote.");
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [notifySuccess, notifyError],
  );

  /** Abre la confirmacion de eliminacion de un lote. */
  const pedirEliminarLote = useCallback((lote: RES_Lote) => {
    setLotePorEliminar(lote);
  }, []);

  /** Cierra la confirmacion sin eliminar. */
  const cancelarEliminarLote = useCallback(() => {
    setLotePorEliminar(null);
  }, []);

  /** Confirma la eliminacion: el lote queda inactivo y deja de listarse. */
  const confirmarEliminarLote = useCallback(async (): Promise<boolean> => {
    if (!lotePorEliminar) return false;
    const ok = await eliminarLote(lotePorEliminar.id_lote);
    if (ok) setLotePorEliminar(null);
    return ok;
  }, [eliminarLote, lotePorEliminar]);

  return {
    almacenes,
    records: filteredRecords,
    loading,
    recargar: recargarLotes,
    loadingAlmacenes,
    error,
    idAlmacen,
    setIdAlmacen,
    busqueda,
    setBusqueda,
    filtroCategoria,
    setFiltroCategoria,
    filtroProducto,
    setFiltroProducto,
    categoriasUnicas,
    productosUnicos,
    refresh: async () => {
      if (!idAlmacen) return;
      setLoading(true);
      try {
        const result = await LotesService.listarResumenLotes(Number(idAlmacen));
        if (result.success) setLotes(result.data);
      } finally {
        setLoading(false);
      }
    },
    addLote: (lote: RES_Lote) => {
      if (idAlmacen && String(lote.id_almacen) === String(idAlmacen)) {
        setLotes((prev) => [lote, ...prev]);
      }
    },
    updateLote: (lote: RES_Lote) => {
      setLotes((prev) =>
        prev.map((l) => (l.id_lote === lote.id_lote ? lote : l)),
      );
    },
    eliminarLote,
    /** Lote pendiente de confirmar para eliminar. */
    lotePorEliminar,
    pedirEliminarLote,
    cancelarEliminarLote,
    confirmarEliminarLote,
    deletingId,
    selectedLotes,
    setSelectedLotes,
    toggleSelectAll: () => {
      if (isAllSelected) {
        setSelectedLotes((prev) =>
          prev.filter((p) => !visibleIds.includes(p.id_lote)),
        );
      } else {
        setSelectedLotes((prev) => {
          const onlyNew = filteredRecords.filter(
            (r) => !prev.some((s) => s.id_lote === r.id_lote),
          );
          return [...prev, ...onlyNew];
        });
      }
    },
    isAllSelected,
    isIndeterminate,
    armarTicket: (lote: RES_Lote): RES_TicketLote => ({
      id: lote.id_lote,
      producto: lote.producto,
      lote: lote.correlativo,
      almacen:
        almacenes.find((a) => String(a.id_almacen) === String(lote.id_almacen))
          ?.nombre || "Sin Almacén",
      fecha_ingreso: lote.fecha_hora_ingreso,
    }),
  };
};
