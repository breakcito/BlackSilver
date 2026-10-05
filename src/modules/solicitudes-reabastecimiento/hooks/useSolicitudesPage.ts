import { useState, useEffect, useCallback, useMemo } from "react";
import { ReabastecimientoService } from "../service/reabastecimiento.service";
import type {
  RES_Solicitud,
  RES_SolicitudDetalle,
} from "../../../service/responses/solicitudes-reabastecimiento/solicitud";
import type { RES_Trazabilidad } from "../../../service/responses/_generic/trazabilidad";
import { useAuditoriaStore } from "../../../stores/auditoria.store";

export const useSolicitudesPage = () => {
  const { en_modo_auditable } = useAuditoriaStore();
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState<RES_Solicitud[]>([]);

  // Filtros
  const [mes, setMes] = useState<string>(String(new Date().getMonth() + 1));
  const [yearcito, setYearcito] = useState<string>(
    String(new Date().getFullYear()),
  );
  const [search, setSearch] = useState("");

  // Detalles y Trazabilidad (UI)
  const [selectedReq, setSelectedReq] = useState<RES_Solicitud | null>(null);
  const [detalles, setDetalles] = useState<RES_SolicitudDetalle[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [selectedDetalle, setSelectedDetalle] =
    useState<RES_SolicitudDetalle | null>(null);
  const [trazabilidad, setTrazabilidad] = useState<RES_Trazabilidad[]>([]);
  const [loadingTrazabilidad, setLoadingTrazabilidad] = useState(false);

  const listar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ReabastecimientoService.listar({
        mes,
        yearcito,
      });
      if (res.success) {
        setSolicitudes(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mes, yearcito]);

  useEffect(() => {
    listar();
  }, [listar]);

  const verDetalles = async (req: RES_Solicitud) => {
    setSelectedReq(req);
    setLoadingDetalle(true);
    try {
      const res = await ReabastecimientoService.obtenerDetalles(
        req.id_solicitud,
      );
      if (res.success) {
        setDetalles(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const verTrazabilidad = async (detalle: RES_SolicitudDetalle) => {
    setSelectedDetalle(detalle);
    setLoadingTrazabilidad(true);
    try {
      const res = await ReabastecimientoService.obtenerTrazabilidad(
        detalle.id_solicitud_detalle,
      );
      if (res.success) {
        setTrazabilidad(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTrazabilidad(false);
    }
  };

  const progresoGeneral = useMemo(() => {
    if (!detalles || detalles.length === 0) return 0;
    const totalSolicitado = detalles.reduce(
      (acc, d) => acc + Number(d.cantidad_solicitada_base || 1),
      0,
    );
    const totalEntregado = detalles.reduce(
      (acc, d) => acc + Number(d.cantidad_entregada_base || 0),
      0,
    );
    return Math.min(100, Math.round((totalEntregado / totalSolicitado) * 100));
  }, [detalles]);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    const result = solicitudes.filter(
      (item) => !(en_modo_auditable && item.es_auditable),
    );
    if (!q) return result;
    return result.filter(
      (item) =>
        (item.correlativo || "").toLowerCase().includes(q) ||
        (item.correlativo_requerimiento || "").toLowerCase().includes(q) ||
        (item.solicitado_por || "").toLowerCase().includes(q),
    );
  }, [solicitudes, search, en_modo_auditable]);

  const detallesFiltrados = useMemo(() => {
    return detalles.filter((d) => !(en_modo_auditable && d.es_auditable));
  }, [detalles, en_modo_auditable]);

  return {
    solicitudes,
    filteredRecords,
    loading,
    filters: {
      mes,
      setMes,
      yearcito,
      setYearcito,
      search,
      setSearch,
    },
    actions: {
      listar,
      addRecord: (record: RES_Solicitud) => {
        setSolicitudes((prev) => [record, ...prev]);
      },
      updateRecord: (id: number, data: Partial<RES_Solicitud>) => {
        setSolicitudes((prev) =>
          prev.map((s) => (s.id_solicitud === id ? { ...s, ...data } : s)),
        );
      },
      verDetalles,
      verTrazabilidad,
    },
    ui: {
      selectedReq,
      setSelectedReq,
      detalles: detallesFiltrados,
      setDetalles,
      loadingDetalle,
      selectedDetalle,
      setSelectedDetalle,
      trazabilidad,
      loadingTrazabilidad,
      progresoGeneral,
    },
  };
};
