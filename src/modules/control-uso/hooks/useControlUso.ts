import { useState, useEffect, useCallback, useMemo } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { ControlUsoService } from "../service/control-uso.service";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_ControlUsoLog } from "../service/control-uso.responses";
import type { RES_ActivoFijoDisponible } from "../../../service/responses/activo-fijo";
import { useAuditoriaStore } from "../../../stores/auditoria.store";
export const useControlUso = () => {
  const { notifySuccess, notifyError } = useNotify();
  const { en_modo_auditable } = useAuditoriaStore();
  const [logs, setLogs] = useState<RES_ControlUsoLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Assets states
  const [activos, setActivos] = useState<RES_ActivoFijoDisponible[]>([]);
  const [idActivoFijo, setIdActivoFijo] = useState<string | null>(null);
  const [loadingActivos, setLoadingActivos] = useState(false);

  // Default values: current month and year
  const currentDate = new Date();
  const [tipoControl, setTipoControl] = useState<
    "horometro" | "odometro" | "vueltas"
  >("horometro");
  const [mes, setMes] = useState<number>(currentDate.getMonth() + 1); // 1-indexed (Jan = 1, Dec = 12)
  const [anio, setAnio] = useState<number>(currentDate.getFullYear());

  // Fetch available assets for this control type on mount / control type change
  useEffect(() => {
    const fetchActivos = async () => {
      setLoadingActivos(true);
      try {
        const resp = await AuxService.get_activos_disponibles({
          control_por_horometro: tipoControl === "horometro" ? true : undefined,
          control_por_odometro: tipoControl === "odometro" ? true : undefined,
          control_por_vueltas: tipoControl === "vueltas" ? true : undefined,
        });
        if (resp.success) {
          setActivos(resp.data);
          if (resp.data.length > 0) {
            setIdActivoFijo(String(resp.data[0].id_activo));
          } else {
            setIdActivoFijo(null);
          }
        } else {
          notifyError(resp.message || "Error al cargar la lista de activos");
        }
      } catch (err) {
        notifyError("Error al conectar con el servidor para listar activos.");
        console.error(err);
      } finally {
        setLoadingActivos(false);
      }
    };

    fetchActivos();
  }, [tipoControl, notifyError]);

  const listarLogs = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await ControlUsoService.getLogs({
        tipo_control: tipoControl,
        mes,
        anio,
      });

      if (resp.success) {
        setLogs(resp.data);
      } else {
        notifyError(resp.message || "Error al cargar los registros de uso");
      }
    } catch (err) {
      notifyError("Ocurrió un error al cargar el listado de uso.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tipoControl, mes, anio, notifyError]);

  useEffect(() => {
    listarLogs();
  }, [listarLogs]);

  const filtrados = useMemo(() => {
    if (!idActivoFijo) return [];

    // Filter by currently selected active asset first
    const assetFiltered = logs.filter(
      (log) => log.id_activo_fijo === Number(idActivoFijo),
    );

    // Apply audit mode filter
    const baseList = assetFiltered.filter((log) => {
      if (en_modo_auditable && log.es_auditable) return false;
      return true;
    });

    const query = busqueda.toLowerCase().trim();
    if (!query) return baseList;

    return baseList.filter(
      (log) =>
        log.correlativo.toLowerCase().includes(query) ||
        (log.codigo && log.codigo.toLowerCase().includes(query)) ||
        log.producto.toLowerCase().includes(query) ||
        log.categoria.toLowerCase().includes(query),
    );
  }, [logs, idActivoFijo, busqueda, en_modo_auditable]);

  const pushNuevoLog = (
    nuevo: (RES_ControlUsoLog & { id?: number }) | (RES_ControlUsoLog & { id?: number })[],
  ) => {
    const incoming = Array.isArray(nuevo) ? nuevo : [nuevo];
    if (incoming.length === 0) return;

    // Buscar los metadatos del activo fijo seleccionado para poblar los campos JOINed en tiempo real
    const activeAsset = activos.find(
      (a) => String(a.id_activo) === String(idActivoFijo),
    );

    const enriched = incoming.map((n) => {
      const fullyPopulatedLog: RES_ControlUsoLog = {
        id_log: n.id || n.id_log,
        id_activo_fijo: n.id_activo_fijo,
        codigo: null,
        correlativo: activeAsset?.correlativo || "",
        producto: activeAsset?.producto || "",
        categoria: "",
        control_por_horometro: activeAsset?.control_por_horometro ? 1 : 0,
        control_por_odometro: activeAsset?.control_por_odometro ? 1 : 0,
        fecha_hora_inicio_control: n.fecha_hora_inicio_control,
        fecha_hora_fin_control: n.fecha_hora_fin_control || null,
        horometro_inicio: n.horometro_inicio || null,
        horometro_fin: n.horometro_fin || null,
        odometro_inicio: n.odometro_inicio || null,
        odometro_fin: n.odometro_fin || null,
        cantidad_vueltas: n.cantidad_vueltas || null,
        total_horas: n.total_horas || null,
        total_km:
          n.odometro_fin != null && n.odometro_inicio != null
            ? Math.max(
                0,
                Number(n.odometro_fin) - Number(n.odometro_inicio),
              )
            : null,
        precio_unitario: n.precio_unitario || null,
        costo_total: n.costo_total || null,
        es_para_mina: n.es_para_mina || null,
        id_mina: n.id_mina || null,
        mina: n.mina || null,
        id_labor: n.id_labor || null,
        labor: n.labor || null,
        id_cliente: n.id_cliente || null,
        cliente: n.cliente || null,
        ubicacion_activo: n.ubicacion_activo,
        tipo_material: n.tipo_material,
        tarifa_material: n.tarifa_material || n.tipo_material || null,
        tarifa_distancia_metros: n.tarifa_distancia_metros || null,
        cantidad_sacos: n.cantidad_sacos || null,
        tipo_carga: n.tipo_carga || null,
        id_tarifa: n.id_tarifa || null,
        tarifa_desc: n.tarifa_desc || null,
        observacion: n.observacion || null,
        created_at: n.created_at,
      };
      return fullyPopulatedLog;
    });

    setLogs((prev) => [...enriched, ...prev]);

    const cantidad = enriched.length;
    notifySuccess(
      cantidad === 1
        ? "Registro de uso guardado correctamente"
        : `${cantidad} registros de uso guardados correctamente`,
    );
  };

  return {
    logs: filtrados,
    loading,
    busqueda,
    setBusqueda,
    tipoControl,
    setTipoControl,
    mes,
    setMes,
    anio,
    setAnio,
    activos,
    idActivoFijo,
    setIdActivoFijo,
    loadingActivos,
    recargar: listarLogs,
    pushNuevoLog,
  };
};

export default useControlUso;
