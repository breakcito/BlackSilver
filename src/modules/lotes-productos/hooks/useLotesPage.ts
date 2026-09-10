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

  // Derived Data (Filtros)
  const categoriasUnicas = useMemo(() => {
    const unique = new Set(lotes.map((l) => l.categoria).filter(Boolean));
    return Array.from(unique)
      .sort()
      .map((c) => ({ value: String(c), label: String(c) }));
  }, [lotes]);

  const productosUnicos = useMemo(() => {
    const source = filtroCategoria
      ? lotes.filter((l) => l.categoria === filtroCategoria)
      : lotes;
    const unique = new Set(source.map((l) => l.producto).filter(Boolean));
    return Array.from(unique)
      .sort()
      .map((p) => ({ value: String(p), label: String(p) }));
  }, [lotes, filtroCategoria]);

  const filteredRecords = useMemo(() => {
    return lotes.filter((l) => {
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
  }, [lotes, busqueda, filtroCategoria, filtroProducto, en_modo_auditable]);

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
    eliminarLote: useCallback(
      async (id_lote: number): Promise<boolean> => {
        const confirmar = window.confirm(
          "¿Está seguro de eliminar este lote? Esta acción lo desactivará del almacén (soft-delete).",
        );
        if (!confirmar) return false;

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
    ),
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
