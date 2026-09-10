import { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import type { DetalleRequerimientoExtendido } from "../service/atencion.responses";
import { AtencionService } from "../service/atencion.service";
import type { DTO_RegistrarEntregaDetalle } from "../service/atencion.requests";
import { useAuthUser } from "../../../hooks/useAuthUser";
import type { RES_LoteDisponible } from "../../../service/responses/lote-producto";
import type { RES_Empleado } from "../../../service/responses/empleado";
import type {
  RES_DetalleRequerimiento,
  RES_RequerimientoAlmacen,
} from "../../../service/responses/requerimientos-almacen/requerimiento-almacen";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_ActivoFijoDisponible } from "../../../service/responses/activo-fijo";
import type { RES_LoteMineral } from "../../../service/responses/lote-mineral";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import { useNotify } from "../../../hooks/useNotify";
import { usePrint } from "../../../hooks/usePrint";
import {
  SalidaAlmacenPDF,
  type SalidaAlmacenItem,
} from "../presentation/salida-almacen-pdf";

interface UseRegistrarEntregaBatchProps {
  requerimiento: RES_RequerimientoAlmacen;
  idRequerimiento: number;
  idAlmacen: number;
  selectedItemsIds: number[];
  detallesRequerimiento: RES_DetalleRequerimiento[];
  idContratistaSolicitante: number | null;
  idEmpleadoSolicitante: number | null;
  onSuccess: (entregados: Record<number, number>) => void;
}

export interface DestinoItem {
  tipo: "mantenimiento" | "produccion" | "";
  id_activo_fijo_destino?: number | null;
  id_lote_mineral?: number | null;
}

export const useRegistrarEntregaBatch = ({
  requerimiento,
  idRequerimiento,
  idAlmacen,
  selectedItemsIds,
  detallesRequerimiento,
  idContratistaSolicitante,
  idEmpleadoSolicitante,
  onSuccess,
}: UseRegistrarEntregaBatchProps) => {
  const authUser = useAuthUser();
  const { notifySuccess, notifyError } = useNotify();
  const { prepare, print } = usePrint();
  const loggedEmployeeId = authUser.usuario?.id_empleado;

  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<RES_LoteDisponible[]>([]);
  const [activosFijos, setActivosFijos] = useState<RES_ActivoFijoDisponible[]>(
    [],
  );
  const [allActivos, setAllActivos] = useState<RES_ActivoFijoDisponible[]>([]);
  const [lotesMineral, setLotesMineral] = useState<RES_LoteMineral[]>([]);
  const [entregaCantidadesActivos, setEntregaCantidadesActivos] = useState<
    Record<number, Record<number, number>>
  >({});
  const [empleados, setEmpleados] = useState<
    { value: string; label: string }[]
  >([]);
  const [contratistas, setContratistas] = useState<
    { value: string; label: string }[]
  >([]);

  const [entregaCantidades, setEntregaCantidades] = useState<
    Record<number, Record<number, number>>
  >({});
  const [destinosMap, setDestinosMap] = useState<Record<string, DestinoItem>>(
    {},
  );
  const [idEmpleadoRecibe, setIdEmpleadoRecibe] = useState<string | null>(null);
  const [idContratistaRecibe, setIdContratistaRecibe] = useState<string | null>(null);
  const [esContratistaRecibe, setEsContratistaRecibe] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [evidencias, setEvidencias] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedDetalles = useMemo<DetalleRequerimientoExtendido[]>(() => {
    return detallesRequerimiento
      .filter((d) =>
        selectedItemsIds.includes(d.id_requerimiento_almacen_detalle),
      )
      .map((d) => {
        const cSolicitada = Number(d.cantidad_solicitada || 0);
        const cSolicitadaBase = Number(d.cantidad_solicitada_base || 0);
        const cEntregadaBase = Number(d.cantidad_entregada_base || 0);
        const pendienteBase = cSolicitadaBase - cEntregadaBase;

        return {
          ...d,
          cantidad_solicitada: cSolicitada,
          cantidad_solicitada_base: cSolicitadaBase,
          cantidad_entregada_base: cEntregadaBase,
          pendiente_base: Math.max(0, pendienteBase),
          equivReq: cSolicitada > 0 ? cSolicitadaBase / cSolicitada : 1,
        };
      });
  }, [detallesRequerimiento, selectedItemsIds]);

  /** Items normales (con lote) */
  const detallesConLote = useMemo(
    () => selectedDetalles.filter((d) => d.tipo_bien !== TipoBien.ActivoFijo),
    [selectedDetalles],
  );

  /** Activos fijos: ya tienen id_activo_fijo_destino asignado desde el requerimiento */
  const detallesActivoFijo = useMemo(
    () => selectedDetalles.filter((d) => d.tipo_bien === TipoBien.ActivoFijo),
    [selectedDetalles],
  );

  const idsProductos = useMemo(() => {
    const ids = detallesConLote.map((d) => d.id_producto);
    return Array.from(new Set(ids));
  }, [detallesConLote]);

  useEffect(() => {
    let cancelled = false;
    const loadInitialData = async () => {
      setLoading(true);
      setError("");
      try {
        const idsConLote = Array.from(
          new Set(detallesConLote.map((d) => d.id_producto)),
        );
        const idsActivoFijo = Array.from(
          new Set(detallesActivoFijo.map((d) => d.id_producto)),
        );
        if (idsConLote.length === 0 && idsActivoFijo.length === 0) {
          setLoading(false);
          return;
        }

        const [resEmps, resLotes, resActivos, resAllActivos, resLotesMineral, resContratistas] =
          await Promise.all([
            AuxService.get_empleados(),
            idsConLote.length > 0
              ? AuxService.get_lotes_disponibles(idAlmacen, idsConLote)
              : Promise.resolve({ success: true, data: [] }),
            idsActivoFijo.length > 0
              ? AuxService.get_activos_disponibles({
                  // id_almacen: idAlmacen,
                  ids_productos: idsActivoFijo,
                })
              : Promise.resolve({ success: true, data: [] }),
            AuxService.get_activos_disponibles(),
            AuxService.get_lotes_mineral(),
            AuxService.get_contratistas(),
          ]);

        if (cancelled) return;

        const mineralBatches =
          resLotesMineral.success && resLotesMineral.data
            ? resLotesMineral.data
            : [];
        const firstLoteMineralId =
          mineralBatches.length > 0 ? mineralBatches[0].id_lote_mineral : null;
        const initialDestinos: Record<string, DestinoItem> = {};

        if (resLotes.success) {
          const castedLotes = resLotes.data.map((l: RES_LoteDisponible) => ({
            ...l,
            stock_actual: Number(l.stock_actual),
            stock_actual_base: Number(l.stock_actual_base),
            contenido_por_presentacion: Number(l.contenido_por_presentacion),
          }));
          setLotes(castedLotes);

          // Initialize quantities per detail (solo items con lote)
          const initial: Record<number, Record<number, number>> = {};
          detallesConLote.forEach((d) => {
            initial[d.id_requerimiento_almacen_detalle] = {};

            const isMantenimiento =
              Boolean(d.para_mantenimiento) &&
              Boolean(d.producto_para_mantenimiento);
            const defaultActivoFijoId = d.id_activo_fijo_destino || null;

            castedLotes
              .filter((l) => l.id_producto === d.id_producto)
              .forEach((l) => {
                initial[d.id_requerimiento_almacen_detalle][l.id_lote] = 0;

                const key = `${d.id_requerimiento_almacen_detalle}_lote_${l.id_lote}`;
                if (isMantenimiento) {
                  initialDestinos[key] = {
                    tipo: "mantenimiento",
                    id_activo_fijo_destino: defaultActivoFijoId,
                    id_lote_mineral: null,
                  };
                } else {
                  initialDestinos[key] = {
                    tipo: "produccion",
                    id_activo_fijo_destino: null,
                    id_lote_mineral: firstLoteMineralId,
                  };
                }
              });
          });
          setEntregaCantidades(initial);
        }

        if (resActivos.success) {
          setActivosFijos(resActivos.data);

          // Initialize quantities per detail for activos fijos
          const initialActivos: Record<number, Record<number, number>> = {};
          detallesActivoFijo.forEach((d) => {
            initialActivos[d.id_requerimiento_almacen_detalle] = {};

            const isMantenimiento =
              Boolean(d.para_mantenimiento) &&
              Boolean(d.producto_para_mantenimiento);
            const defaultActivoFijoId = d.id_activo_fijo_destino || null;

            resActivos.data
              .filter(
                (a: RES_ActivoFijoDisponible) =>
                  a.id_producto === d.id_producto,
              )
              .forEach((a: RES_ActivoFijoDisponible) => {
                initialActivos[d.id_requerimiento_almacen_detalle][
                  a.id_activo
                ] = 0;

                const key = `${d.id_requerimiento_almacen_detalle}_activo_${a.id_activo}`;
                if (isMantenimiento) {
                  initialDestinos[key] = {
                    tipo: "mantenimiento",
                    id_activo_fijo_destino: defaultActivoFijoId,
                    id_lote_mineral: null,
                  };
                } else {
                  initialDestinos[key] = {
                    tipo: "produccion",
                    id_activo_fijo_destino: null,
                    id_lote_mineral: firstLoteMineralId,
                  };
                }
              });
          });
          setEntregaCantidadesActivos(initialActivos);
        }

        setDestinosMap(initialDestinos);

        if (resAllActivos.success && resAllActivos.data) {
          setAllActivos(resAllActivos.data);
        }

        if (resLotesMineral.success && resLotesMineral.data) {
          setLotesMineral(resLotesMineral.data);
        }

        if (resEmps.success) {
          const exceptLogged = resEmps.data.filter(
            (e: RES_Empleado) => e.id_empleado !== loggedEmployeeId,
          );
          setEmpleados(
            exceptLogged.map((e: RES_Empleado) => ({
              value: e.id_empleado?.toString() || "",
              label: e.nombre_completo,
            })),
          );
        }

        if (resContratistas.success && resContratistas.data) {
          setContratistas(
            resContratistas.data.map((c) => ({
              value: c.id_contratista.toString(),
              label: c.nombre_completo ?? "",
            })),
          );
        }
      } catch (err) {
        if (!cancelled) setError("Error al cargar datos necesarios");
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [
    idsProductos,
    idAlmacen,
    loggedEmployeeId,
    selectedDetalles,
    detallesConLote,
    detallesActivoFijo,
  ]);

  // Auto-seleccionar receptor basado en el solicitante
  useEffect(() => {
    if (hasAutoSelected) return;

    if (idContratistaSolicitante && contratistas.length > 0) {
      const exists = contratistas.some(
        (c) => c.value === idContratistaSolicitante.toString(),
      );
      if (exists) {
        setIdContratistaRecibe(idContratistaSolicitante.toString());
        setEsContratistaRecibe(true);
        setHasAutoSelected(true);
      }
    } else if (idEmpleadoSolicitante && empleados.length > 0) {
      const exists = empleados.some(
        (e) => e.value === idEmpleadoSolicitante.toString(),
      );
      if (exists) {
        setIdEmpleadoRecibe(idEmpleadoSolicitante.toString());
        setEsContratistaRecibe(false);
        setHasAutoSelected(true);
      }
    }
  }, [idContratistaSolicitante, idEmpleadoSolicitante, empleados, contratistas, hasAutoSelected]);

  const handleCantActivoChange = useCallback(
    (idDetalleReq: number, idActivo: number, val: number) => {
      setEntregaCantidadesActivos((prev) => {
        // limit val to 0 or 1
        const finalValue = Math.max(0, Math.min(val, 1));
        const prevCantidades = prev[idDetalleReq] || {};

        // Sum total selected for this detail
        const detail = selectedDetalles.find(
          (d) => d.id_requerimiento_almacen_detalle === idDetalleReq,
        );
        if (!detail) return prev;

        const totalOther = Object.entries(prevCantidades).reduce(
          (sum, [aId, v]) => {
            if (Number(aId) === idActivo) return sum;
            return sum + (v || 0);
          },
          0,
        );

        const pendienteMaxDetalle =
          detail.cantidad_solicitada_base - detail.cantidad_entregada_base;

        // Max allowed is 1, but bounded by remaining pending
        const maxAllowed = Math.max(
          0,
          Math.min(1, pendienteMaxDetalle - totalOther),
        );
        const safeValue = Math.max(0, Math.min(finalValue, maxAllowed));

        if (prevCantidades[idActivo] === safeValue) return prev;

        return {
          ...prev,
          [idDetalleReq]: {
            ...prevCantidades,
            [idActivo]: safeValue,
          },
        };
      });
    },
    [selectedDetalles],
  );

  const handleCantChange = useCallback(
    (idDetalleReq: number, idLote: number, val: number) => {
      setEntregaCantidades((prev) => {
        const lote = lotes.find((l) => l.id_lote === idLote);
        if (!lote) return prev;

        const detail = selectedDetalles.find(
          (d) => d.id_requerimiento_almacen_detalle === idDetalleReq,
        );
        if (!detail) return prev;

        // Suma de lo entregado en OTROS lotes para ESTE MISMO requerimiento detalle
        const prevCantidadesForThisItem = prev[idDetalleReq] || {};
        const totalOtherLotsForThisItem = Object.entries(
          prevCantidadesForThisItem,
        ).reduce((sum, [lId, v]) => {
          if (Number(lId) === idLote) return sum;
          return sum + (v || 0);
        }, 0);

        // Suma de lo entregado en CUALQUIER requerimiento detalle para ESTE LOTE
        const totalOtherItemsForThisLot = Object.entries(prev).reduce(
          (sum, [dId, lotesMap]) => {
            if (Number(dId) === idDetalleReq) return sum;
            return sum + (lotesMap[idLote] || 0);
          },
          0,
        );

        const pendienteMaxDetalle =
          detail.cantidad_solicitada_base - detail.cantidad_entregada_base;

        // Máximo que puede aportar este lote al ítem específico:
        // El menor entre (su stock disponible REAL) y (lo que falta por entregar para el ítem)
        const stockRealRestanteLote =
          (lote.stock_actual_base || 0) - totalOtherItemsForThisLot;

        const maxAllowedForThisLoteAndItem = Math.max(
          0,
          Math.min(
            stockRealRestanteLote,
            pendienteMaxDetalle - totalOtherLotsForThisItem,
          ),
        );

        const finalValue = Math.max(
          0,
          Math.min(val || 0, maxAllowedForThisLoteAndItem),
        );

        if (prevCantidadesForThisItem[idLote] === finalValue) return prev;

        return {
          ...prev,
          [idDetalleReq]: {
            ...prevCantidadesForThisItem,
            [idLote]: finalValue,
          },
        };
      });
    },
    [lotes, selectedDetalles],
  );

  const handleCantLoteChange = useCallback(
    (idDetalleReq: number, idLote: number, valLote: number) => {
      const lote = lotes.find((l) => l.id_lote === idLote);
      if (!lote) return;
      const equiv = Number(lote.contenido_por_presentacion) || 1;
      // Usamos toFixed para redondear a la precisión de base y evitar errores de punto flotante
      const valBase = Number((valLote * equiv).toFixed(4));
      handleCantChange(idDetalleReq, idLote, valBase);
    },
    [lotes, handleCantChange],
  );

  const firstLoteMineralId = useMemo(() => {
    return lotesMineral.length > 0 ? lotesMineral[0].id_lote_mineral : null;
  }, [lotesMineral]);

  const handleDestinoChange = useCallback(
    (key: string, field: string, value: string | number | null) => {
      setDestinosMap((prev) => {
        const current = prev[key] || { tipo: "" };
        return {
          ...prev,
          [key]: {
            ...current,
            [field]: value,
            // Reset other fields if type changes
            ...(field === "tipo" && {
              id_activo_fijo_destino: null,
              id_lote_mineral:
                value === "produccion" ? firstLoteMineralId : null,
            }),
          } as DestinoItem,
        };
      });
    },
    [firstLoteMineralId],
  );

  const lotesPorProducto = useMemo(() => {
    const agrupado: Record<number, RES_LoteDisponible[]> = {};
    lotes.forEach((l) => {
      if (!agrupado[l.id_producto]) agrupado[l.id_producto] = [];
      agrupado[l.id_producto].push(l);
    });
    return agrupado;
  }, [lotes]);

  const totalEntregaGeneralBase = useMemo(() => {
    let total = 0;
    // Suma cantidades de lotes seleccionados
    Object.values(entregaCantidades).forEach((lotesMap) => {
      Object.values(lotesMap).forEach((val) => {
        total += val || 0;
      });
    });
    // Suma activos fijos seleccionados
    Object.values(entregaCantidadesActivos).forEach((activosMap) => {
      Object.values(activosMap).forEach((val) => {
        total += val || 0;
      });
    });
    return total;
  }, [entregaCantidades, entregaCantidadesActivos]);

  const handleConfirmar = async () => {
    const receptorValido = esContratistaRecibe ? Boolean(idContratistaRecibe) : Boolean(idEmpleadoRecibe);
    if (!receptorValido) {
      setError("Debe seleccionar quién recibe los materiales");
      return;
    }
    setError("");

    // Validar destinos para items seleccionados
    let validationError = "";

    // Activos fijos
    for (const [idDet, activosMap] of Object.entries(
      entregaCantidadesActivos,
    )) {
      const idDetalleReq = Number(idDet);
      const detail = selectedDetalles.find(
        (d) => d.id_requerimiento_almacen_detalle === idDetalleReq,
      );
      if (!detail) continue;

      for (const [idAct, cant] of Object.entries(activosMap)) {
        if (cant > 0) {
          const numIdActivo = Number(idAct);
          const key = `${idDetalleReq}_activo_${numIdActivo}`;
          const dest = destinosMap[key] || { tipo: "" };

          if (dest.tipo === "mantenimiento" && !dest.id_activo_fijo_destino) {
            validationError = `Debe seleccionar el equipo destino para el activo fijo correlativo "${detail.producto}"`;
            break;
          }
          if (dest.tipo === "produccion" && !dest.id_lote_mineral) {
            validationError = `Debe seleccionar el lote de mineral destino para el activo fijo correlativo "${detail.producto}"`;
            break;
          }
        }
      }
      if (validationError) break;
    }

    if (!validationError) {
      // Productos con lote
      for (const [idDet, lotesMap] of Object.entries(entregaCantidades)) {
        const idDetalleReq = Number(idDet);
        const detail = selectedDetalles.find(
          (d) => d.id_requerimiento_almacen_detalle === idDetalleReq,
        );
        if (!detail) continue;

        for (const [idLot, cant] of Object.entries(lotesMap)) {
          if (cant > 0) {
            const numIdLote = Number(idLot);
            const key = `${idDetalleReq}_lote_${numIdLote}`;
            const dest = destinosMap[key] || { tipo: "" };

            if (dest.tipo === "mantenimiento" && !dest.id_activo_fijo_destino) {
              validationError = `Debe seleccionar el equipo destino para el producto "${detail.producto}"`;
              break;
            }
            if (dest.tipo === "produccion" && !dest.id_lote_mineral) {
              validationError = `Debe seleccionar el lote de mineral destino para el producto "${detail.producto}"`;
              break;
            }
          }
        }
        if (validationError) break;
      }
    }

    if (validationError) {
      setError(validationError);
      notifyError(validationError);
      return;
    }

    const detallesParaApi: DTO_RegistrarEntregaDetalle[] = [];

    // --- Activos fijos ---
    Object.entries(entregaCantidadesActivos).forEach(([idDet, activosMap]) => {
      const idDetalleReq = Number(idDet);
      const detail = selectedDetalles.find(
        (d) => d.id_requerimiento_almacen_detalle === idDetalleReq,
      );
      if (!detail) return;

      Object.entries(activosMap).forEach(([idAct, cant]) => {
        if (cant > 0) {
          const numIdActivo = Number(idAct);
          const key = `${idDetalleReq}_activo_${numIdActivo}`;
          const dest = destinosMap[key] || { tipo: "" };

          detallesParaApi.push({
            id_requerimiento_almacen_detalle: idDetalleReq,
            id_activo_fijo: numIdActivo,
            cantidad_base: cant,
            cantidad_lote: cant,
            cantidad_requerimiento: cant,
            para_mantenimiento: dest.tipo === "mantenimiento",
            para_produccion: dest.tipo === "produccion",
            id_activo_fijo_destino:
              dest.tipo === "mantenimiento"
                ? dest.id_activo_fijo_destino
                : null,
            id_lote_mineral:
              dest.tipo === "produccion" ? dest.id_lote_mineral : null,
          });
        }
      });
    });

    // --- Productos con lote ---
    Object.entries(entregaCantidades).forEach(([idDet, lotesMap]) => {
      const idDetalleReq = Number(idDet);
      const detail = selectedDetalles.find(
        (d) => d.id_requerimiento_almacen_detalle === idDetalleReq,
      );
      if (!detail) return;

      Object.entries(lotesMap).forEach(([idLot, cant]) => {
        if (cant > 0) {
          const numIdLote = Number(idLot);
          const lote = lotes.find((l) => l.id_lote === numIdLote);
          if (!lote) return;

          const equivLote = lote.contenido_por_presentacion || 1;
          const cBase = cant;
          const cLote = cBase / equivLote;
          const cReq = cBase / detail.equivReq;

          const key = `${idDetalleReq}_lote_${numIdLote}`;
          const dest = destinosMap[key] || { tipo: "" };

          detallesParaApi.push({
            id_requerimiento_almacen_detalle: idDetalleReq,
            id_lote_producto: numIdLote,
            cantidad_base: cBase,
            cantidad_lote: cLote,
            cantidad_requerimiento: cReq,
            para_mantenimiento: dest.tipo === "mantenimiento",
            para_produccion: dest.tipo === "produccion",
            id_activo_fijo_destino:
              dest.tipo === "mantenimiento"
                ? dest.id_activo_fijo_destino
                : null,
            id_lote_mineral:
              dest.tipo === "produccion" ? dest.id_lote_mineral : null,
          });
        }
      });
    });

    if (detallesParaApi.length === 0) {
      setError("Debe entregar al menos 1 producto o activo");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await AtencionService.registrarEntrega({
        id_requerimiento: idRequerimiento,
        id_empleado_recibe: !esContratistaRecibe && idEmpleadoRecibe ? Number(idEmpleadoRecibe) : null,
        id_contratista_recibe: esContratistaRecibe && idContratistaRecibe ? Number(idContratistaRecibe) : null,
        fecha_entrega: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        observacion,
        evidencias,
        detalles: detallesParaApi,
      });

      if (res.success) {
        notifySuccess(res.message || "Entrega registrada exitosamente");
        // Calcular totales entregados por id_requerimiento_almacen_detalle
        const entregados: Record<number, number> = {};
        detallesParaApi.forEach((ent) => {
          const id = ent.id_requerimiento_almacen_detalle;
          entregados[id] = (entregados[id] || 0) + ent.cantidad_base;
        });

        // Construir items para los PDFs de Salida de Almacén
        const itemsPdf = buildSalidaItems();
        const itemsAuditable = itemsPdf.filter((i) => i.es_auditable);
        const itemsNormal = itemsPdf.filter((i) => !i.es_auditable);

        const receptorNombre = esContratistaRecibe
          ? contratistas.find((c) => c.value === idContratistaRecibe)?.label ||
            ""
          : empleados.find((e) => e.value === idEmpleadoRecibe)?.label || "";
        const almaceneroNombre = authUser.usuario
          ? `${authUser.usuario.nombre} ${authUser.usuario.apellido}`.trim()
          : "";
        const evidenciasNombres = evidencias.map((f) => f.name);
        const fechaHora = dayjs().format("YYYY-MM-DD HH:mm:ss");
        const correlativoBase = requerimiento.correlativo;

        const baseProps = {
          correlativo_requerimiento: correlativoBase,
          almacen: requerimiento.almacen_destino,
          solicitante: requerimiento.solicitante,
          receptor: receptorNombre,
          almacenero: almaceneroNombre,
          observacion,
          evidencias_nombres: evidenciasNombres,
          fecha_hora: fechaHora,
        };

        // PDF normal (sin auditables) - sólo si hay items
        if (itemsNormal.length > 0) {
          const target = `SalidaAlmacen_${idRequerimiento}_${Date.now()}`;
          prepare(target);
          print(
            <SalidaAlmacenPDF
              {...baseProps}
              tipo="normal"
              items={itemsNormal}
            />,
            {
              documentTitle: `Salida_Almacen_${correlativoBase}`,
              target,
            },
          );
        }

        // PDF auditables - sólo si hay auditables
        if (itemsAuditable.length > 0) {
          const target = `SalidaAlmacenAuditable_${idRequerimiento}_${Date.now()}`;
          prepare(target);
          print(
            <SalidaAlmacenPDF
              {...baseProps}
              tipo="auditable"
              items={itemsAuditable}
            />,
            {
              documentTitle: `Salida_Almacen_Auditable_${correlativoBase}`,
              target,
            },
          );
        }

        onSuccess(entregados);
      } else {
        notifyError(res.message || "Error al registrar entrega batch");
        setError(res.message || "Error al registrar entrega batch");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
    } finally {
      setIsProcessing(false);
    }
  };

  const activosFijosPorProducto = useMemo(() => {
    const agrupado: Record<number, RES_ActivoFijoDisponible[]> = {};
    activosFijos.forEach((a) => {
      if (!agrupado[a.id_producto]) agrupado[a.id_producto] = [];
      agrupado[a.id_producto].push(a);
    });
    return agrupado;
  }, [activosFijos]);

  /**
   * Construye la lista de items para los PDFs de "Salida de Almacén"
   * a partir de la selección actual. Junta los items con lote, los
   * activos fijos y sus respectivos destinos.
   */
  const buildSalidaItems = useCallback((): SalidaAlmacenItem[] => {
    const items: SalidaAlmacenItem[] = [];

    const resolveDestinoDetalle = (
      dest: DestinoItem,
    ): string | null => {
      if (dest.tipo === "mantenimiento" && dest.id_activo_fijo_destino) {
        const d = allActivos.find(
          (a) => a.id_activo === dest.id_activo_fijo_destino,
        );
        return d
          ? `${d.correlativo} - ${d.producto}`
          : `Activo #${dest.id_activo_fijo_destino}`;
      }
      if (dest.tipo === "produccion" && dest.id_lote_mineral) {
        const d = lotesMineral.find(
          (l) => l.id_lote_mineral === dest.id_lote_mineral,
        );
        return d
          ? d.descripcion || d.codigo || `Lote #${dest.id_lote_mineral}`
          : `Lote #${dest.id_lote_mineral}`;
      }
      return null;
    };

    // Activos fijos
    Object.entries(entregaCantidadesActivos).forEach(([idDet, activosMap]) => {
      const idDetalleReq = Number(idDet);
      const detail = selectedDetalles.find(
        (d) => d.id_requerimiento_almacen_detalle === idDetalleReq,
      );
      if (!detail) return;

      Object.entries(activosMap).forEach(([idAct, cant]) => {
        if (cant <= 0) return;
        const numIdAct = Number(idAct);
        const activo = activosFijos.find((a) => a.id_activo === numIdAct);
        const key = `${idDetalleReq}_activo_${numIdAct}`;
        const dest = destinosMap[key] || { tipo: "" };

        items.push({
          id_detalle: idDetalleReq,
          producto: detail.producto,
          unidad_medida_abv: detail.unidad_medida_req_abv,
          unidad_medida_base_abv: detail.unidad_medida_base_abv,
          cantidad: cant,
          cantidad_base: cant,
          lote_correlativo: null,
          activo_correlativo: activo?.correlativo ?? null,
          destino_tipo: dest.tipo === "" ? null : dest.tipo,
          destino_detalle: resolveDestinoDetalle(dest),
          comentario: detail.comentario ?? null,
          es_auditable: Boolean(detail.es_auditable),
        });
      });
    });

    // Productos con lote
    Object.entries(entregaCantidades).forEach(([idDet, lotesMap]) => {
      const idDetalleReq = Number(idDet);
      const detail = selectedDetalles.find(
        (d) => d.id_requerimiento_almacen_detalle === idDetalleReq,
      );
      if (!detail) return;

      Object.entries(lotesMap).forEach(([idLot, cant]) => {
        if (cant <= 0) return;
        const numIdLot = Number(idLot);
        const lote = lotes.find((l) => l.id_lote === numIdLot);
        if (!lote) return;
        const key = `${idDetalleReq}_lote_${numIdLot}`;
        const dest = destinosMap[key] || { tipo: "" };

        const cReq =
          detail.equivReq && detail.equivReq > 0 ? cant / detail.equivReq : cant;

        items.push({
          id_detalle: idDetalleReq,
          producto: detail.producto,
          unidad_medida_abv: detail.unidad_medida_req_abv,
          unidad_medida_base_abv: detail.unidad_medida_base_abv,
          cantidad: cReq,
          cantidad_base: cant,
          lote_correlativo: lote.correlativo ?? null,
          activo_correlativo: null,
          destino_tipo: dest.tipo === "" ? null : dest.tipo,
          destino_detalle: resolveDestinoDetalle(dest),
          comentario: detail.comentario ?? null,
          es_auditable: Boolean(detail.es_auditable),
        });
      });
    });

    return items;
  }, [
    selectedDetalles,
    entregaCantidades,
    entregaCantidadesActivos,
    lotes,
    activosFijos,
    allActivos,
    lotesMineral,
    destinosMap,
  ]);

  return {
    loading,
    selectedDetalles,
    detallesActivoFijo,
    lotesPorProducto,
    activosFijosPorProducto,
    allActivos,
    lotesMineral,
    entregaCantidades,
    entregaCantidadesActivos,
    destinosMap,
    empleados,
    contratistas,
    idEmpleadoRecibe,
    setIdEmpleadoRecibe,
    idContratistaRecibe,
    setIdContratistaRecibe,
    esContratistaRecibe,
    setEsContratistaRecibe,
    observacion,
    setObservacion,
    evidencias,
    setEvidencias,
    error,
    isProcessing,
    totalEntregaGeneralBase,
    handleCantChange,
    handleCantLoteChange,
    handleCantActivoChange,
    handleDestinoChange,
    handleConfirmar,
  };
};
