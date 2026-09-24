import { useState, useEffect, useCallback, useMemo } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { ControlConsumoService } from "../service/control-consumo.service";
import { AuxService } from "../../../service/auxiliar.service";
import type {
  RES_ResumenEntregasReq,
  RES_Consumo,
  RES_ConsumoDirecto,
  RES_GastoExtra,
} from "../service/control-consumo.responses";
import type { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";
import type { RES_ActivoFijoDisponible } from "../../../service/responses/activo-fijo";
import type { RES_Mina } from "../../../service/responses/mina";
import type { RES_Almacen } from "../../../service/responses/almacen";
import { useAuditoriaStore } from "../../../stores/auditoria.store";

export const useListarControlConsumo = () => {
  const { notifyError, notifySuccess } = useNotify();
  const { en_modo_auditable } = useAuditoriaStore();
  const [reporte, setReporte] = useState<RES_ResumenEntregasReq[]>([]);
  const [consumosDirectos, setConsumosDirectos] = useState<RES_ConsumoDirecto[]>([]);
  const [gastosExtra, setGastosExtra] = useState<RES_GastoExtra[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [idMina, setIdMina] = useState<string | null>(null);
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);

  // Available fixed assets for registration modal
  const [activos, setActivos] = useState<RES_ActivoFijoDisponible[]>([]);
  const [loadingActivos, setLoadingActivos] = useState(false);

  // Default values: current month and year
  const currentDate = new Date();
  const [mes, setMes] = useState<number>(currentDate.getMonth() + 1); // 1-indexed (Jan = 1, Dec = 12)
  const [anio, setAnio] = useState<number>(currentDate.getFullYear());

  // Fetch assets on mount
  useEffect(() => {
    const fetchCatalogos = async () => {
      setLoadingActivos(true);
      try {
        const activosResp = await AuxService.get_activos_disponibles();

        if (activosResp.success) {
          setActivos(activosResp.data);
        } else {
          notifyError(
            activosResp.message || "Error al cargar la lista de activos",
          );
        }
      } catch (err) {
        notifyError(
          "Error al conectar con el servidor para obtener los activos.",
        );
        console.error(err);
      } finally {
        setLoadingActivos(false);
      }
    };

    fetchCatalogos();
  }, [notifyError]);

  // Derive minas and almacenes from the loaded report data & consumos directos
  const minas = useMemo<RES_Mina[]>(() => {
    const unique = new Map<number, RES_Mina>();
    reporte.forEach((item) => {
      if (item.id_mina && !unique.has(item.id_mina)) {
        unique.set(item.id_mina, {
          id_mina: item.id_mina,
          nombre: item.mina,
          id_concesion: 0,
          concesion: "",
        });
      }
    });
    consumosDirectos.forEach((cd) => {
      if (cd.id_mina && !unique.has(cd.id_mina)) {
        unique.set(cd.id_mina, {
          id_mina: cd.id_mina,
          nombre: cd.mina || "S/M",
          id_concesion: 0,
          concesion: "",
        });
      }
    });
    return Array.from(unique.values());
  }, [reporte, consumosDirectos]);

  const almacenes = useMemo<RES_Almacen[]>(() => {
    const unique = new Map<number, RES_Almacen>();
    reporte.forEach((item) => {
      if (item.id_almacen_destino && !unique.has(item.id_almacen_destino)) {
        unique.set(item.id_almacen_destino, {
          id_almacen: item.id_almacen_destino,
          nombre: item.almacen_destino,
          es_principal: 0,
          para_carbon: 0,
          direccion: null,
          id_departamento: null,
          id_provincia: null,
          id_distrito: null,
          departamento_nombre: null,
          provincia_nombre: null,
          distrito_nombre: null,
        });
      }
    });
    consumosDirectos.forEach((cd) => {
      if (cd.id_almacen && !unique.has(cd.id_almacen)) {
        unique.set(cd.id_almacen, {
          id_almacen: cd.id_almacen,
          nombre: cd.almacen || "S/A",
          es_principal: 0,
          para_carbon: 0,
          direccion: null,
          id_departamento: null,
          id_provincia: null,
          id_distrito: null,
          departamento_nombre: null,
          provincia_nombre: null,
          distrito_nombre: null,
        });
      }
    });
    return Array.from(unique.values());
  }, [reporte, consumosDirectos]);

  // Fetch consumption logs when filters change
  const cargarReporte = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await ControlConsumoService.getReporte(mes, anio);

      if (resp.success && resp.data) {
        const data = resp.data;
        if (Array.isArray(data)) {
          setReporte(data);
          setConsumosDirectos([]);
          setGastosExtra([]);
        } else {
          setReporte(data.entregas || []);
          setConsumosDirectos(data.consumos_directos || []);
          setGastosExtra(data.gastos_extra || []);
        }
      } else {
        notifyError(resp.message || "Error al cargar los registros de consumo");
      }
    } catch (err) {
      notifyError("Ocurrió un error al cargar el listado de consumo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mes, anio, notifyError]);

  useEffect(() => {
    cargarReporte();
  }, [cargarReporte]);

  // Filter entregas in real-time
  const filtrados = useMemo(() => {
    let list = reporte.filter((item) => {
      if (en_modo_auditable && item.es_auditable) return false;
      return true;
    });

    if (idMina) {
      list = list.filter((item) => String(item.id_mina) === idMina);
    }

    if (idAlmacen) {
      list = list.filter(
        (item) => String(item.id_almacen_destino) === idAlmacen,
      );
    }

    const query = busqueda.toLowerCase().trim();
    if (!query) return list;

    return list.filter(
      (item) =>
        item.producto.toLowerCase().includes(query) ||
        String(item.correlativo_requerimiento).toLowerCase().includes(query) ||
        item.mina.toLowerCase().includes(query) ||
        item.almacen_destino.toLowerCase().includes(query) ||
        item.solicitante.toLowerCase().includes(query),
    );
  }, [reporte, idMina, idAlmacen, busqueda, en_modo_auditable]);

  // Filter consumos directos in real-time
  const consumosDirectosFiltrados = useMemo(() => {
    let list = consumosDirectos;

    if (idMina) {
      list = list.filter((item) => String(item.id_mina) === idMina);
    }

    if (idAlmacen) {
      list = list.filter((item) => String(item.id_almacen) === idAlmacen);
    }

    const query = busqueda.toLowerCase().trim();
    if (!query) return list;

    return list.filter(
      (item) =>
        item.producto.toLowerCase().includes(query) ||
        (item.producto_activo_fijo_consumidor || "").toLowerCase().includes(query) ||
        (item.correlativo_activo_fijo_consumidor || "").toLowerCase().includes(query) ||
        (item.almacen || "").toLowerCase().includes(query) ||
        (item.empleado_registro || "").toLowerCase().includes(query),
    );
  }, [consumosDirectos, idMina, idAlmacen, busqueda]);

  const agregarConsumoLocal = useCallback((nuevoConsumo: RES_Consumo) => {
    setReporte((prevReporte) =>
      prevReporte.map((item) => {
        if (
          item.id_entrega_requerimiento_detalle ===
          nuevoConsumo.id_requerimiento_almacen_entrega_detalle
        ) {
          const nuevaCantidadConsumida =
            Number(item.cantidad_consumida_base) +
            Number(nuevoConsumo.cantidad_base_consumida);

          let nuevoEstado: "Sin Consumir" | "Consumo Parcial" | "Total" =
            "Sin Consumir";
          if (nuevaCantidadConsumida >= Number(item.cantidad_entregada_base)) {
            nuevoEstado = "Total";
          } else if (nuevaCantidadConsumida > 0) {
            nuevoEstado = "Consumo Parcial";
          }

          return {
            ...item,
            cantidad_consumida_base: nuevaCantidadConsumida,
            estado_consumo: nuevoEstado,
            consumos: [...item.consumos, nuevoConsumo],
          };
        }
        return item;
      }),
    );
  }, []);

  const actualizarTurnoLocal = useCallback(
    async (idConsumo: number, nuevoTurno: TipoTurno | string) => {
      try {
        const resp = await ControlConsumoService.actualizarTurno(
          idConsumo,
          nuevoTurno,
        );
        if (resp.success) {
          notifySuccess("Turno actualizado correctamente.");
          // Update in reporte
          setReporte((prev) =>
            prev.map((item) => ({
              ...item,
              consumos: item.consumos.map((c) =>
                c.id_consumo === idConsumo ? { ...c, tipo_turno: nuevoTurno } : c,
              ),
            })),
          );
          // Update in consumos directos
          setConsumosDirectos((prev) =>
            prev.map((cd) =>
              cd.id_consumo === idConsumo ? { ...cd, tipo_turno: nuevoTurno } : cd,
            ),
          );
        } else {
          notifyError(resp.message || "No se pudo actualizar el turno.");
        }
      } catch (err) {
        console.error(err);
        notifyError("Error al actualizar el turno.");
      }
    },
    [notifySuccess, notifyError],
  );

  const agregarGastoExtraLocal = useCallback((nuevoGasto: RES_GastoExtra) => {
    setGastosExtra((prev) => [nuevoGasto, ...prev]);
  }, []);

  return {
    reporte: filtrados,
    consumosDirectos: consumosDirectosFiltrados,
    gastosExtra,
    loading,
    busqueda,
    setBusqueda,
    mes,
    setMes,
    anio,
    setAnio,
    minas,
    idMina,
    setIdMina,
    loadingMinas: false,
    almacenes,
    idAlmacen,
    setIdAlmacen,
    loadingAlmacenes: false,
    activos,
    loadingActivos,
    recargar: cargarReporte,
    agregarConsumoLocal,
    actualizarTurnoLocal,
    agregarGastoExtraLocal,
  };
};

export default useListarControlConsumo;
