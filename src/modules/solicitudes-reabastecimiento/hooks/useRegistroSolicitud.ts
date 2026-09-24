import dayjs from "dayjs";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { ReabastecimientoService } from "../service/reabastecimiento.service";
import type {
  DTO_CrearSolicitud,
  DTO_SolicitudDetalle,
} from "../service/reabastecimiento.requests";
import { Premura } from "../../../shared/enums/_generic/premura";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { RES_UnidadMedida } from "../../../service/responses/unidad-medida";
import type { RES_Solicitud } from "../../../service/responses/solicitudes-reabastecimiento/solicitud";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Producto } from "../../../service/responses/producto";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import { useAuthStore } from "../../../stores/auth.store";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";

interface Props {
  onSuccess: (item: RES_Solicitud) => void;
}

export const useRegistroSolicitud = ({ onSuccess }: Props) => {
  const { notifySuccess, notifyError } = useNotify();
  const [submitting, setSubmitting] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catálogos
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [productos, setProductos] = useState<RES_Producto[]>([]);
  const [unidades, setUnidades] = useState<RES_UnidadMedida[]>([]);

  // Estado Formulario Cabecera
  const [idAlmacenSolicitante, setIdAlmacenSolicitante] = useState<number>(0);
  const [premura, setPremura] = useState<Premura>(Premura.Normal);
  const [fechaSolicitud, setFechaSolicitud] = useState<Date | null>(new Date());
  const [fechaEntregaRequerida, setFechaEntregaRequerida] =
    useState<Date | null>(new Date());
  const [observacion, setObservacion] = useState("");

  // Estado Formulario Detalle (Item actual)
  const [idProducto, setIdProducto] = useState<number>(0);
  const [idUnidadMedida, setIdUnidadMedida] = useState<number>(0);
  const [cantidad, setCantidad] = useState<number>(0);
  const [contenido, setContenido] = useState<number>(1);
  /**
   * Cálculo inteligente: cuando está activo, el campo `contenido` se interpreta
   * como "magnitud por ítem" (ej. 70 cm por cada Guía) y se permite su edición
   * incluso cuando la unidad del detalle coincide con la base del producto.
   * Caso típico: 11 guías de 70 cm cada una = 770 cm sin que el usuario tenga
   * que multiplicar a mano.
   */
  const [calculoInteligente, setCalculoInteligente] = useState<boolean>(false);
  const [comentarioItem, setComentarioItem] = useState("");

  // Búsqueda tolerante (Fuse + FlexSearch) sobre los catálogos en los Select.
  // Cuando la query está vacía, getCoincidencias no se invoca.
  const [productoBusqueda, setProductoBusqueda] = useState<string>("");
  const [unidadBusqueda, setUnidadBusqueda] = useState<string>("");

  // Lista de detalles agregados
  const [detalles, setDetalles] = useState<DTO_SolicitudDetalle[]>([]);

  // 1. Acción para cargar Catálogos (se llamará On Demand)
  const cargarCatalogos = useCallback(async () => {
    if (almacenes.length > 0) return;
    setLoadingCatalogs(true);
    try {
        const res_almacenes = await AuxService.get_almacenes({
          es_principal: false,
          id_empleado_responsable: useAuthStore.getState().usuario?.id_empleado,
        });
        const res_productos = await AuxService.get_productos();
        const res_unidades = await AuxService.get_unidades_medida({
          incluir_conversiones: true,
        });
      if (
        res_almacenes.success &&
        res_productos.success &&
        res_unidades.success
      ) {
        setAlmacenes(res_almacenes.data);
        setProductos(res_productos.data);
        setUnidades(res_unidades.data);

        if (res_almacenes.data.length > 0) {
          setIdAlmacenSolicitante(res_almacenes.data[0].id_almacen);
        }
      }
    } catch (err) {
      console.error("Error al cargar catálogos", err);
    } finally {
      setLoadingCatalogs(false);
    }
  }, [almacenes.length]);

  // 2. Lógica de Unidades
  const productoSeleccionado = productos.find(
    (p) => p.id_producto === idProducto,
  );
  const unidadSeleccionada = unidades.find(
    (u) => u.id_unidad_medida === idUnidadMedida,
  );
  useEffect(() => {
    if (idProducto > 0 && productos.length > 0) {
      const prod = productos.find((p) => p.id_producto === idProducto);
      if (prod) {
        setIdUnidadMedida(prod.id_unidad_medida_base);
      }
    }
  }, [idProducto, productos]);

  const sonUnidadesIdenticas =
    productoSeleccionado &&
    unidadSeleccionada &&
    productoSeleccionado.id_unidad_medida_base ===
      unidadSeleccionada.id_unidad_medida;

  /**
   * Factor de conversión auto-completado desde la tabla de conversiones.
   * - Si las unidades son idénticas: retorna 1 (implícito).
   * - Si las unidades son diferentes y existe la conversión: retorna el
   *   "cuántas unidades base hay en 1 unidad de detalle".
   * - Si no existe conversión: retorna `null`.
   *
   * IMPORTANTE: la API modela la conversión como "1 destino (B) = factor
   * origens (A)". En la respuesta, la unidad consultada aparece como
   * `id_unidad_origen` y la relacionada como `id_unidad_destino`. Como el
   * formulario necesita "1 detalle = X base", invertimos el factor cuando
   * la unidad del detalle es el origen y la base es el destino.
   */
  const conversionAutomatica = useMemo<number | null>(() => {
    if (!productoSeleccionado || !idUnidadMedida) return null;
    if (sonUnidadesIdenticas) return 1;

    const unidadDetalle = unidades.find(
      (u) => u.id_unidad_medida === idUnidadMedida,
    );
    if (!unidadDetalle?.conversiones) return null;

    const conv = unidadDetalle.conversiones.find(
      (c) => c.id_unidad_destino === productoSeleccionado.id_unidad_medida_base,
    );
    if (!conv) return null;

    const factorOrigenesPorDestino = Number(conv.factor_conversion);
    if (!factorOrigenesPorDestino || factorOrigenesPorDestino <= 0) return null;

    return 1 / factorOrigenesPorDestino;
  }, [idUnidadMedida, productoSeleccionado, unidades, sonUnidadesIdenticas]);

  /**
   * El input de `contenido` está bloqueado cuando smart calc está OFF y
   * (unidades idénticas o hay conversión automática): el sistema ya conoce
   * el factor y no debe permitir que el usuario lo manipule manualmente.
   */
  const contenidoBloqueado =
    !calculoInteligente &&
    (sonUnidadesIdenticas ||
      (Boolean(productoSeleccionado) && conversionAutomatica !== null));

  /**
   * El checkbox de cálculo inteligente solo se muestra cuando es viable:
   * - Unidades idénticas (factor = 1 implícito), o
   * - Unidades diferentes con conversión automática conocida.
   */
  const calculoInteligenteDisponible =
    sonUnidadesIdenticas ||
    (Boolean(productoSeleccionado) && conversionAutomatica !== null);

  useEffect(() => {
    /**
     * Auto-completar `contenido` cuando cambia la unidad del detalle o el
     * producto seleccionado.
     * - Unidades idénticas + smart calc OFF: contenido = 1.
     * - Unidades idénticas + smart calc ON: no tocar.
     * - Unidades diferentes + smart calc OFF + auto conversión: contenido = factor.
     * - Unidades diferentes + smart calc OFF + sin conversión: contenido = 0.
     * - Unidades diferentes + smart calc ON: contenido = 0 (el usuario
     *   tipea la magnitud por ítem en la unidad del detalle).
     *
     * Si el smart calc quedó activo pero la nueva unidad no soporta este modo,
     * se desactiva para mantener coherencia.
     *
     * `calculoInteligente` se lee fuera de las deps a propósito: añadirla
     * provocaría que al togglear el smart calc se sobreescriba el valor
     * que el usuario acaba de tipear como magnitud por ítem.
     */
    if (!idProducto || !idUnidadMedida) return;

    if (sonUnidadesIdenticas) {
      if (!calculoInteligente) {
        setContenido(1);
      }
      return;
    }

    if (calculoInteligente && conversionAutomatica === null) {
      setCalculoInteligente(false);
      setContenido(0);
      return;
    }

    if (calculoInteligente) {
      setContenido(0);
    } else if (conversionAutomatica !== null) {
      setContenido(conversionAutomatica);
    } else {
      setContenido(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    idProducto,
    idUnidadMedida,
    sonUnidadesIdenticas,
    conversionAutomatica,
  ]);

  /**
   * Handler del checkbox de cálculo inteligente. Al activarlo, vacía el campo
   * para que el usuario tipee la magnitud por ítem. Al desactivarlo, restaura
   * el valor auto-completado (factor de conversión o 1 si las unidades son
   * idénticas).
   */
  const activarCalculoInteligente = useCallback(
    (checked: boolean) => {
      setCalculoInteligente(checked);
      if (checked) {
        setContenido(0);
      } else if (sonUnidadesIdenticas) {
        setContenido(1);
      } else if (conversionAutomatica !== null) {
        setContenido(conversionAutomatica);
      }
    },
    [sonUnidadesIdenticas, conversionAutomatica],
  );

  // Lista de productos que se muestra en el Select. NO se filtran los
  // ya agregados: permitimos el mismo producto en multiples filas siempre
  // que la unidad del detalle sea distinta. La validacion final del
  // duplicado (producto + unidad) se hace en `agregarItem`.
  const productosFiltrados = useMemo(() => {
    return productos;
  }, [productos]);

  // Lista que se muestra en el Select de Producto (busqueda tolerante).
  const productosVisibles = useMemo(() => {
    const q = productoBusqueda.trim();
    if (!q) return productosFiltrados;
    return getCoincidencias(productosFiltrados, q, {
      keys: ["nombre", "categoria"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [productosFiltrados, productoBusqueda]);

  // Lista que se muestra en el Select de Unidad (busqueda tolerante).
  const unidadesVisibles = useMemo(() => {
    const q = unidadBusqueda.trim();
    if (!q) return unidades;
    return getCoincidencias(unidades, q, {
      keys: ["nombre", "abreviatura"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [unidades, unidadBusqueda]);

  const agregarItem = useCallback(() => {
    if (!idProducto || !idUnidadMedida || cantidad <= 0 || contenido <= 0) {
      notifyError("Complete los datos del producto");
      return;
    }
    // Validar duplicado: no se permite el mismo producto con la misma
    // unidad. Se permite si la unidad difiere.
    const duplicado = detalles.find(
      (d) => d.id_producto === idProducto && d.id_unidad_medida === idUnidadMedida,
    );
    if (duplicado) {
      const prod = productos.find((p) => p.id_producto === idProducto);
      const unidad = unidades.find((u) => u.id_unidad_medida === idUnidadMedida);
      notifyError(
        `"${prod?.nombre ?? "El producto"}" ya fue agregado con la unidad "${unidad?.nombre ?? "seleccionada"}". Cambie la unidad para agregarlo de nuevo.`,
      );
      return;
    }

    // Smart calc: viable cuando hay factor conocido (unidades idénticas o
    // conversión automática). En ese caso `contenido` se interpreta como
    // "magnitud por item" y el sistema multiplicara por la cantidad de
    // items. `contenido_por_presentacion` enviado al backend siempre debe
    // ser el FACTOR real (1 si unidades idénticas, conversionAutomatica si
    // difieren); la "magnitud" ya viaja por separado en los 4 campos.
    const usaMagnitud =
      calculoInteligente &&
      (sonUnidadesIdenticas === true || conversionAutomatica !== null);
    const cantidadSolicitadaFinal = usaMagnitud ? cantidad * contenido : cantidad;
    const contenidoPorPresentacionFinal = usaMagnitud
      ? conversionAutomatica ?? 1
      : contenido;

    const nuevoItem: DTO_SolicitudDetalle = {
      id_producto: idProducto,
      id_unidad_medida: idUnidadMedida,
      cantidad_solicitada: cantidadSolicitadaFinal,
      contenido_por_presentacion: contenidoPorPresentacionFinal,
      comentario: comentarioItem || undefined,
    };

    if (usaMagnitud) {
      nuevoItem.con_magnitud = 1;
      nuevoItem.cantidad_items = cantidad;
      nuevoItem.valor_magnitud = contenido;
      // Si las unidades son idénticas, `valor_magnitud` ya está en la unidad
      // base. Si son diferentes, hay que multiplicar por el factor de
      // conversión base/detalle. `conversionAutomatica` es 1 cuando las
      // unidades son idénticas y el factor calculado cuando difieren,
      // así que siempre aplica.
      nuevoItem.valor_magnitud_base = contenido * (conversionAutomatica ?? 1);
    }

    setDetalles((prev) => [...prev, nuevoItem]);
    setIdProducto(0);
    setIdUnidadMedida(0);
    setCantidad(0);
    setContenido(1);
    setCalculoInteligente(false);
    setComentarioItem("");
    setProductoBusqueda("");
    setUnidadBusqueda("");
  }, [
    idProducto,
    idUnidadMedida,
    cantidad,
    contenido,
    comentarioItem,
    notifyError,
    detalles,
    productos,
    unidades,
    calculoInteligente,
    sonUnidadesIdenticas,
    conversionAutomatica,
  ]);

  const eliminarItem = useCallback((index: number) => {
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!idAlmacenSolicitante || detalles.length === 0) {
      setError("Faltan campos obligatorios");
      return;
    }

    setSubmitting(true);
    setError(null);

    const esAuditable = detalles.some((d) => {
      const prod = productos.find((p) => p.id_producto === d.id_producto);
      return prod?.es_auditable;
    });

    const dto: DTO_CrearSolicitud = {
      id_almacen_solicitante: idAlmacenSolicitante,
      premura,
      observacion: observacion || undefined,
      es_auditable: esAuditable,
      fecha_solicitud: fechaSolicitud
        ? dayjs(fechaSolicitud).format("YYYY-MM-DD")
        : null,
      fecha_entrega_requerida: fechaEntregaRequerida
        ? dayjs(fechaEntregaRequerida).format("YYYY-MM-DD")
        : null,
      detalles,
    };

    try {
      const res = await ReabastecimientoService.crear(dto);
      if (res.success) {
        notifySuccess("Solicitud registrada correctamente");
        onSuccess(res.data);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Error al registrar solicitud");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [
    idAlmacenSolicitante,
    premura,
    observacion,
    fechaSolicitud,
    fechaEntregaRequerida,
    detalles,
    onSuccess,
    notifySuccess,
    productos,
  ]);

  return {
    state: {
      almacenes,
      productos,
      productosFiltrados,
      unidades,
      idAlmacenSolicitante,
      setIdAlmacenSolicitante,
      premura,
      setPremura,
      fechaSolicitud,
      setFechaSolicitud,
      fechaEntregaRequerida,
      setFechaEntregaRequerida,
      observacion,
      setObservacion,
      idProducto,
      setIdProducto,
      idUnidadMedida,
      setIdUnidadMedida,
      cantidad,
      setCantidad,
      contenido,
      setContenido,
      calculoInteligente,
      setCalculoInteligente: activarCalculoInteligente,
      comentarioItem,
      setComentarioItem,
      productoBusqueda,
      setProductoBusqueda,
      unidadBusqueda,
      setUnidadBusqueda,
      detalles,
    },
    derived: {
      sonUnidadesIdenticas,
      productoSeleccionado,
      isActivoFijo: productoSeleccionado?.tipo_bien === TipoBien.ActivoFijo,
      conversionAutomatica,
      contenidoBloqueado,
      calculoInteligenteDisponible,
      canAdd: idProducto && idUnidadMedida && cantidad > 0 && contenido > 0,
      productosVisibles,
      unidadesVisibles,
    },
    status: {
      submitting,
      loadingCatalogs,
      error,
    },
    actions: {
      agregarItem,
      eliminarItem,
      handleSubmit,
      cargarCatalogos,
    },
  };
};
