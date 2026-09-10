import { useState, useEffect, useCallback, useMemo } from "react";
import { ActivosService } from "../service/activos.service";
import type { RES_ActivoFijoResumen } from "../service/activos.responses";
import { useNotify } from "../../../hooks/useNotify";
import { useAuditoriaStore } from "../../../stores/auditoria.store";

export const useActivosMain = () => {
  const { notifySuccess, notifyError } = useNotify();
  const { en_modo_auditable } = useAuditoriaStore();

  const [activos, setActivos] = useState<RES_ActivoFijoResumen[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idMina, setIdMina] = useState<string | null>(null);

  const fetchActivos = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await ActivosService.getActivos();
      if (res.success) setActivos(res.data);
    } catch (error) {
      console.error("Error al cargar activos", error);
      notifyError("Error al cargar activos");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    fetchActivos();
  }, [fetchActivos]);

  const activosFiltrados = useMemo(() => {
    return activos.filter((a) => {
      if (en_modo_auditable && a.es_auditable) return false;

      const matchAlmacen = !idAlmacen || String(a.id_almacen) === idAlmacen;
      const matchMina = !idMina || String(a.id_mina) === idMina;
      const matchBusqueda =
        !busqueda ||
        a.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.correlativo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (a.codigo || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (a.numero_serie || "").toLowerCase().includes(busqueda.toLowerCase());

      return matchAlmacen && matchMina && matchBusqueda;
    });
  }, [activos, idAlmacen, idMina, busqueda, en_modo_auditable]);

  // Generar opciones de filtro a partir de los datos cargados
  const almacenesFiltro = useMemo(() => {
    const map = new Map<number, string>();
    activos.forEach((a) => {
      if (a.id_almacen && a.almacen) map.set(a.id_almacen, a.almacen);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({
      id_almacen: id,
      nombre,
    }));
  }, [activos]);

  const minasFiltro = useMemo(() => {
    const map = new Map<number, string>();
    activos.forEach((a) => {
      if (a.id_mina && a.mina) map.set(a.id_mina, a.mina);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({
      id_mina: id,
      nombre,
    }));
  }, [activos]);

  const addActivo = (nuevo: RES_ActivoFijoResumen) => {
    setActivos((prev) => [nuevo, ...prev]);
  };

  /**
   * Reemplaza el activo en la lista local con la versión devuelta por la API.
   * Garantiza que la fila siempre refleje el shape exacto que entrega el backend
   * (especialmente tras cambios de ubicación que regeneran el log).
   */
  const updateActivo = (editado: RES_ActivoFijoResumen) => {
    setActivos((prev) =>
      prev.map((a) =>
        a.id_activo === editado.id_activo ? editado : a,
      ),
    );
  };

  /**
   * Soft-delete: cambia estado a "Dado de Baja" en el backend. La respuesta
   * trae el activo actualizado con el nuevo estado y el entry en cambios_log.
   */
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const eliminarActivo = useCallback(
    async (idActivo: number): Promise<boolean> => {
      if (
        !window.confirm(
          "¿Está seguro de eliminar este activo? Esta acción lo desactivará.",
        )
      ) {
        return false;
      }

      setDeletingId(idActivo);
      try {
        const resp = await ActivosService.eliminarActivo(idActivo);
        if (resp.success) {
          notifySuccess(resp.message);
          setActivos((prev) =>
            prev.map((a) => (a.id_activo === idActivo ? resp.data : a)),
          );
          return true;
        }
        notifyError(resp.message);
        return false;
      } catch (err) {
        console.error(err);
        notifyError("Error inesperado al dar de baja el activo.");
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [notifySuccess, notifyError],
  );

  return {
    activos: activosFiltrados,
    almacenesFiltro,
    minasFiltro,
    loading,
    busqueda,
    setBusqueda,
    idAlmacen,
    setIdAlmacen,
    idMina,
    setIdMina,
    refresh: (showLoading?: boolean) => fetchActivos(showLoading),
    recargar: () => fetchActivos(true),
    addActivo,
    updateActivo,
    eliminarActivo,
    deletingId,
  };
};
