import dayjs from "dayjs";
import { useState, useEffect, useCallback, useMemo } from "react";
import { usePrint } from "../../../hooks/usePrint";
import { useNotify } from "../../../hooks/useNotify";
import { Schema_CrearRequerimiento } from "../service/atencion.requests";
import type {
  DTO_CrearRequerimiento,
  DTO_CrearRequerimientoDetalle,
} from "../service/atencion.requests";
import { Premura } from "../../../shared/enums/_generic/premura";
import { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";
import type { RES_UnidadMedida } from "../../../service/responses/unidad-medida";
import { AtencionService } from "../service/atencion.service";
import type {
  RES_DetalleRequerimiento,
  RES_RequerimientoAlmacen,
} from "../../../service/responses/requerimientos-almacen/requerimiento-almacen";
import { AuxService } from "../../../service/auxiliar.service";
import type { RES_Producto } from "../../../service/responses/producto";
import type { RES_ActivoFijoDisponible } from "../../../service/responses/activo-fijo";
import type { RES_Labor } from "../../../service/responses/labor";
import type { RES_Empleado } from "../../../service/responses/empleado";
import type { RES_Contratista } from "../../../service/responses/contratista";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";

/**
 * Detalle interno del hook. Para edición, cada item trae `id_detalle`
 * (id_requerimiento_almacen_detalle) y `bloqueado` (no editable cuando ya
 * tiene entregas iniciadas).
 */
export interface DetalleFormItem extends DTO_CrearRequerimientoDetalle {
  id_detalle?: number;
  bloqueado?: boolean;
}

export type ModoRequerimiento = "crear" | "editar";

interface Props {
  modo?: ModoRequerimiento;
  onSuccess: (
    item: RES_RequerimientoAlmacen,
    printerTarget: string,
    printerWin: Window | null,
  ) => void;
  idAlmacenFijo?: number;
  requerimientoInicial?: RES_RequerimientoAlmacen;
  detallesIniciales?: RES_DetalleRequerimiento[];
}

export const useRegistroRequerimiento = ({
  modo = "crear",
  onSuccess,
  idAlmacenFijo,
  requerimientoInicial,
  detallesIniciales,
}: Props) => {
  const { prepare } = usePrint();
  const { notifySuccess, notifyError } = useNotify();
  const [submitting, setSubmitting] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [loadingLabores, setLoadingLabores] = useState(false);
  const [loadingMinaData, setLoadingMinaData] = useState(false);
  const [loadingActivos, setLoadingActivos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingCatalogs = loadingProductos || loadingUnidades || loadingLabores;

  // Catálogos
  const [empleados, setEmpleados] = useState<RES_Empleado[]>([]);
  const [contratistas, setContratistas] = useState<RES_Contratista[]>([]);
  const [verContratistas, setVerContratistas] = useState(true);
  const [labores, setLabores] = useState<RES_Labor[]>([]);
  const [productos, setProductos] = useState<RES_Producto[]>([]);
  const [unidades, setUnidades] = useState<RES_UnidadMedida[]>([]);
  const [activos, setActivos] = useState<RES_ActivoFijoDisponible[]>([]);
  const [evidencias, setEvidencias] = useState<File[]>([]);

  // Estado Formulario Cabecera
  const [idAlmacenDestino, setIdAlmacenDestino] = useState<number>(
    idAlmacenFijo || 0,
  );
  const [idLabor, setIdLabor] = useState<number>(0);
  const [idEmpleadoSolicitante, setIdEmpleadoSolicitante] = useState<number>(0);
  const [premura, setPremura] = useState<Premura>(Premura.Normal);
  const [tipoTurno, setTipoTurno] = useState<TipoTurno | null>(null);
  const [fechaSolicitud, setFechaSolicitud] = useState<Date | null>(new Date());
  const [fechaEntregaRequerida, setFechaEntregaRequerida] =
    useState<Date | null>(null);
  /**
   * Bandera que indica si el usuario modificó manualmente la fecha de entrega
   * requerida. Si es false, al cambiar `fechaSolicitud` se autocompleta la
   * fecha de entrega con el mismo valor.
   */
  const [fechaEntregaManual, setFechaEntregaManual] = useState<boolean>(false);
  const [observacion, setObservacion] = useState("");

  // Autocompletar fecha de entrega con fecha de solicitud (solo si el usuario
  // no la modificó manualmente)
  useEffect(() => {
    if (fechaEntregaManual) return;
    setFechaEntregaRequerida(fechaSolicitud);
  }, [fechaSolicitud, fechaEntregaManual]);

  const actualizarFechaEntrega = useCallback(
    (val: Date | null) => {
      setFechaEntregaRequerida(val);
      if (val) setFechaEntregaManual(true);
    },
    [],
  );

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
  const [paraMantenimientoItem, setParaMantenimientoItem] = useState(false);
  const [idActivoFijoDestino, setIdActivoFijoDestino] = useState<number>(0);

  // Lista de detalles agregados
  const [detalles, setDetalles] = useState<DetalleFormItem[]>([]);

  /**
   * Precarga los valores del requerimiento cuando se abre el modal en modo
   * edicion. Se hace en un useEffect independiente para que dispare tambien
   * si las props de entrada cambian (re-mount con otro requerimiento).
   */
  useEffect(() => {
    if (modo !== "editar" || !requerimientoInicial) return;

    setIdAlmacenDestino(requerimientoInicial.id_almacen_destino);
    setIdLabor(requerimientoInicial.id_labor ?? 0);
    setIdEmpleadoSolicitante(
      requerimientoInicial.id_contratista_solicitante ??
        requerimientoInicial.id_empleado_solicitante ??
        0,
    );
    setVerContratistas(
      Boolean(requerimientoInicial.id_contratista_solicitante),
    );
    setPremura((requerimientoInicial.premura as Premura) ?? Premura.Normal);
    setTipoTurno(
      requerimientoInicial.tipo_turno
        ? (requerimientoInicial.tipo_turno as TipoTurno)
        : null,
    );
    setFechaSolicitud(
      requerimientoInicial.fecha_solicitud
        ? dayjs(requerimientoInicial.fecha_solicitud).toDate()
        : null,
    );
    setFechaEntregaRequerida(
      requerimientoInicial.fecha_entrega_requerida
        ? dayjs(requerimientoInicial.fecha_entrega_requerida).toDate()
        : null,
    );
    setFechaEntregaManual(true);
    setObservacion(requerimientoInicial.observacion ?? "");

    if (detallesIniciales && detallesIniciales.length > 0) {
      setDetalles(
        detallesIniciales.map<DetalleFormItem>((d) => ({
          id_producto: d.id_producto,
          id_unidad_medida: d.id_unidad_medida_req,
          cantidad_solicitada: Number(d.cantidad_solicitada ?? 0),
          contenido_por_presentacion: Number(d.contenido_por_presentacion ?? 1),
          comentario: d.comentario ?? null,
          para_mantenimiento: Boolean(d.para_mantenimiento),
          id_activo_fijo_destino: d.id_activo_fijo_destino ?? null,
          con_magnitud: Number(d.con_magnitud ?? 0) === 1,
          cantidad_items: d.cantidad_items ?? undefined,
          valor_magnitud: d.valor_magnitud ?? undefined,
          valor_magnitud_base: d.valor_magnitud_base ?? undefined,
          id_detalle: d.id_requerimiento_almacen_detalle,
          bloqueado: Number(d.cantidad_entregada_base ?? 0) > 0,
        })),
      );
    }
  }, [modo, requerimientoInicial, detallesIniciales]);

  // 1. Cargar Catálogos en paralelo al montar
  useEffect(() => {
    const loadCatalogs = async () => {
      setLoadingProductos(true);
      setLoadingUnidades(true);
      setLoadingLabores(true);
      setLoadingMinaData(true);
      setLoadingActivos(true);
      try {
        const [resProd, resUnid, resEmp, resAct, resCont, resLab] = await Promise.all([
          AuxService.get_productos(),
          AuxService.get_unidades_medida({ incluir_conversiones: true }),
          AuxService.get_empleados(),
          AuxService.get_activos_disponibles(),
          AuxService.get_contratistas(),
          AuxService.get_labores(),
        ]);

        if (resProd.success && resProd.data) setProductos(resProd.data);
        if (resUnid.success && resUnid.data) setUnidades(resUnid.data);
        if (resEmp.success && resEmp.data) setEmpleados(resEmp.data);
        if (resAct.success && resAct.data) setActivos(resAct.data);
        if (resCont.success && resCont.data) setContratistas(resCont.data);
        if (resLab.success && resLab.data) setLabores(resLab.data);
      } catch (err) {
        console.error("Error loading catalogs", err);
      } finally {
        setLoadingProductos(false);
        setLoadingUnidades(false);
        setLoadingLabores(false);
        setLoadingMinaData(false);
        setLoadingActivos(false);
      }
    };

    loadCatalogs();
  }, []);

  // Cargar activos fijos disponibles
  useEffect(() => {
    const loadActivos = async () => {
      setLoadingActivos(true);
      try {
        const res = await AuxService.get_activos_disponibles();
        if (res.success && res.data) {
          setActivos(res.data);
        }
      } finally {
        setLoadingActivos(false);
      }
    };
    loadActivos();
  }, []);

  // 4. Lógica de Unidades al elegir Producto/Unidad
  const productoSeleccionado = productos.find(
    (p) => p.id_producto === idProducto,
  );
  const unidadSeleccionada = unidades.find(
    (u) => u.id_unidad_medida === idUnidadMedida,
  );
  const sonUnidadesIdenticas =
    productoSeleccionado &&
    unidadSeleccionada &&
    productoSeleccionado.id_unidad_medida_base ===
      unidadSeleccionada.id_unidad_medida;

  /**
   * Factor de conversión auto-completado desde la tabla de conversiones.
   * - Si las unidades son idénticas: retorna 1 (implícito, no requiere lookup).
   * - Si las unidades son diferentes y existe la conversión: retorna el
   *   "cuántas unidades base hay en 1 unidad de detalle" (p. ej. 1 Metro
   *   = 100 Centímetros).
   * - Si no existe conversión: retorna `null` (el usuario debe tipear el factor).
   *
   * IMPORTANTE: la API modela la conversión como "1 destino (B) = factor
   * origens (A)" (ver `ConversionUnidadMedida::$fillable` y el SQL en
   * `UnidadesMedidaData::get_unidades`). En la respuesta, la unidad
   * consultada aparece como `id_unidad_origen` y la relacionada como
   * `id_unidad_destino`. Como el formulario necesita
   * "1 detalle = X base", hay que invertir el factor cuando la unidad
   * del detalle es el origen y la base es el destino.
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

    // "1 destino = factor origens"  =>  "1 origen = 1/factor destinos".
    return 1 / factorOrigenesPorDestino;
  }, [idUnidadMedida, productoSeleccionado, unidades, sonUnidadesIdenticas]);

  /**
   * El input de `contenido` debe estar bloqueado cuando:
   * - Smart calc está OFF y (unidades idénticas o hay conversión automática).
   * En esos casos, el sistema ya conoce el factor y no debe permitir al
   * usuario manipularlo manualmente.
   * Cuando smart calc está ON, el campo se desbloquea para que el usuario
   * tipee la magnitud por ítem (en unidad base o en unidad del detalle).
   */
  const contenidoBloqueado =
    !calculoInteligente &&
    (sonUnidadesIdenticas ||
      (Boolean(productoSeleccionado) && conversionAutomatica !== null));

  /**
   * El checkbox de cálculo inteligente solo se muestra cuando es viable:
   * - Unidades idénticas (factor = 1 implícito), o
   * - Unidades diferentes con conversión automática conocida.
   * Si no hay conversión, el usuario debe trabajar con el flujo estándar
   * (cantidad en unidad del detalle × factor de conversión).
   */
  const calculoInteligenteDisponible =
    sonUnidadesIdenticas ||
    (Boolean(productoSeleccionado) && conversionAutomatica !== null);

  useEffect(() => {
    /**
     * Auto-completar `contenido` cuando cambia la unidad del detalle o el
     * producto seleccionado. Reglas:
     * - Unidades idénticas + smart calc OFF: contenido = 1.
     * - Unidades idénticas + smart calc ON: no tocar (usuario tipea magnitud).
     * - Unidades diferentes + smart calc OFF + auto conversión: contenido = factor.
     * - Unidades diferentes + smart calc OFF + sin conversión: contenido = 0.
     * - Unidades diferentes + smart calc ON: contenido = 0 (el usuario
     *   tipea la magnitud por ítem en la unidad del detalle).
     * Si el smart calc quedó activo pero la nueva unidad no soporta este modo
     * (no hay conversión automática), se desactiva para mantener el estado
     * coherente con la UI.
     *
     * `calculoInteligente` se lee intencionalmente fuera de las deps: añadirla
     * provocaría que al togglear el smart calc se sobreescriba el valor que el
     * usuario acaba de tipear como magnitud por ítem.
     */
    if (!idProducto || !idUnidadMedida) return;

    if (sonUnidadesIdenticas) {
      if (!calculoInteligente) {
        setContenido(1);
      }
      return;
    }

    // Unidades diferentes: el smart calc requiere una conversión automática
    if (calculoInteligente && conversionAutomatica === null) {
      setCalculoInteligente(false);
      setContenido(0);
      return;
    }

    if (calculoInteligente) {
      // Magnitud por ítem en la unidad del detalle: usuario tipea
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

  // Auto-seleccionar contratista responsable al elegir una labor
  useEffect(() => {
    if (!idLabor || !verContratistas) return;
    const responsable = contratistas.find((c) => {
      if (!c.ids_labores_activas) return false;
      const ids = c.ids_labores_activas.split(",").map(Number);
      return ids.includes(idLabor);
    });
    if (responsable) {
      setIdEmpleadoSolicitante(responsable.id_contratista);
    }
  }, [idLabor, contratistas, verContratistas]);

  // Auto-selección de unidad al elegir producto
  useEffect(() => {
    if (idProducto && productos.length > 0) {
      const prod = productos.find((p) => p.id_producto === idProducto);
      if (prod) {
        setIdUnidadMedida(prod.id_unidad_medida_base);
      }
    }
    // Al cambiar de producto, reseteamos el comentario y mantenimiento
    setComentarioItem("");
    setParaMantenimientoItem(false);
    setIdActivoFijoDestino(0);
    setCalculoInteligente(false);
  }, [idProducto, productos]);

  /**
   * Búsqueda tolerante (fuzzy + por tokens) del catálogo de productos en el Select.
   * Se aplica ENCIMA de `productosFiltrados` (que ya excluye productos ya
   * agregados, salvo consumibles). Cuando `productoBusqueda` está vacío,
   * devuelve la lista completa sin coste adicional.
   *
   * Permite al usuario escribir "gua", "guias", "guia 70cm" o con errores
   * de tipeo y obtener coincidencias fiables.
   */
  const [productoBusqueda, setProductoBusqueda] = useState<string>("");

  /**
   * Búsqueda tolerante del catálogo de unidades de medida. Misma lógica:
   * busca sobre `nombre` y `abreviatura` (ej. tipear "mtr" encuentra "Metro").
   */
  const [unidadBusqueda, setUnidadBusqueda] = useState<string>("");

  // Filtrar productos que ya están presentes en la lista de detalles
  // Permitimos el mismo producto en múltiples filas siempre que la
  // unidad de medida del detalle sea distinta. La validación final de
  // duplicado (producto + unidad) se hace en `agregarItem`.
  const productosFiltrados = useMemo(() => {
    return productos;
  }, [productos]);

  /**
   * Lista de productos que se muestra en el Select tras aplicar la búsqueda
   * tolerante. Si no hay query, devuelve la lista completa (filtrada por
   * duplicados), sin invocar getCoincidencias.
   */
  const productosVisibles = useMemo(() => {
    const q = productoBusqueda.trim();
    if (!q) return productosFiltrados;
    return getCoincidencias(productosFiltrados, q, {
      keys: ["nombre", "categoria"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [productosFiltrados, productoBusqueda]);

  /**
   * Lista de unidades de medida que se muestra en el Select tras la búsqueda
   * tolerante. Busca tanto por nombre completo (ej. "Centímetro") como por
   * abreviatura (ej. "cm").
   */
  const unidadesVisibles = useMemo(() => {
    const q = unidadBusqueda.trim();
    if (!q) return unidades;
    return getCoincidencias(unidades, q, {
      keys: ["nombre", "abreviatura"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [unidades, unidadBusqueda]);

  // Agregar item a la lista. Funciona igual tanto en creacion como en
  // edicion: en edicion el frontend envia los items nuevos al backend
  // como `detalles_crear`, asi que aqui solo se anexan al state con un
  // `id_detalle` indefinido (sin PK). El submit los separa.
  const agregarItem = useCallback(() => {
    if (!idProducto || !idUnidadMedida || cantidad <= 0 || contenido <= 0) {
      notifyError("Complete los datos del producto");
      return;
    }

    // Validar duplicado: no se permite el mismo producto con la misma
    // unidad de medida. Sí se permite si la unidad difiere.
    const duplicado = detalles.find(
      (d) =>
        d.id_producto === idProducto &&
        d.id_unidad_medida === idUnidadMedida,
    );
    if (duplicado) {
      const prod = productos.find((p) => p.id_producto === idProducto);
      const unidad = unidades.find((u) => u.id_unidad_medida === idUnidadMedida);
      notifyError(
        `"${prod?.nombre ?? "El producto"}" ya fue agregado con la unidad "${unidad?.nombre ?? "seleccionada"}". Cambie la unidad para agregarlo de nuevo.`,
      );
      return;
    }

    if (paraMantenimientoItem && !idActivoFijoDestino) {
      notifyError("Debe seleccionar el equipo destino para mantenimiento");
      return;
    }

    let finalComentario = comentarioItem;
    if (paraMantenimientoItem && idActivoFijoDestino > 0) {
      const activo = activos.find((a) => a.id_activo === idActivoFijoDestino);
      finalComentario = activo
        ? `Para el mantenimiento de ${activo.producto} ${activo.correlativo}`
        : `Para el mantenimiento de Equipo #${idActivoFijoDestino}`;
    }

    // El cálculo inteligente se admite cuando el campo `contenido` puede
    // interpretarse como "magnitud por ítem" (no como factor de conversión).
    // Esto es viable si:
    // - Las unidades son idénticas (factor = 1 implícito), o
    // - Las unidades son diferentes pero existe una conversión automática
    //   conocida (`conversionAutomatica`); en ese caso `contenido` es la
    //   magnitud por ítem en la unidad del detalle y el sistema la convierte
    //   a la unidad base multiplicando por el factor.
    //
    // En cualquier caso `contenido_por_presentacion` enviado al backend
    // debe ser el FACTOR real (base por detalle). En smart calc con
    // unidades idénticas el factor es 1; con unidades distintas es el
    // valor auto-completado desde la tabla de conversiones.
    const usaMagnitud =
      calculoInteligente &&
      (sonUnidadesIdenticas === true || conversionAutomatica !== null);
    const cantidadSolicitadaFinal = usaMagnitud ? cantidad * contenido : cantidad;
    const contenidoPorPresentacionFinal = usaMagnitud
      ? conversionAutomatica ?? 1
      : contenido;

    const nuevoItem: DTO_CrearRequerimientoDetalle = {
      id_producto: idProducto,
      id_unidad_medida: idUnidadMedida,
      cantidad_solicitada: cantidadSolicitadaFinal,
      contenido_por_presentacion: contenidoPorPresentacionFinal,
      comentario: finalComentario,
      para_mantenimiento: paraMantenimientoItem,
      id_activo_fijo_destino:
        paraMantenimientoItem && idActivoFijoDestino > 0
          ? idActivoFijoDestino
          : null,
    };

    if (usaMagnitud) {
      nuevoItem.con_magnitud = 1;
      nuevoItem.cantidad_items = cantidad;
      nuevoItem.valor_magnitud = contenido;
      // Si las unidades son idénticas, `valor_magnitud` ya está en la unidad
      // base. Si son diferentes, hay que multiplicar por el factor de
      // conversión base/detalle para obtener la magnitud en unidad base.
      // `conversionAutomatica` es 1 cuando las unidades son idénticas y el
      // factor calculado cuando difieren, así que siempre aplica.
      nuevoItem.valor_magnitud_base = contenido * (conversionAutomatica ?? 1);
    }

    setDetalles((prev) => [...prev, nuevoItem]);

    // Limpiar item
    setIdProducto(0);
    setIdUnidadMedida(0);
    setCantidad(0);
    setContenido(1);
    setCalculoInteligente(false);
    setComentarioItem("");
    setParaMantenimientoItem(false);
    setIdActivoFijoDestino(0);
    setProductoBusqueda("");
    setUnidadBusqueda("");
  }, [
    idProducto,
    idUnidadMedida,
    cantidad,
    contenido,
    comentarioItem,
    paraMantenimientoItem,
    idActivoFijoDestino,
    activos,
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

  const actualizarCantidadItem = useCallback(
    (index: number, nvaCantidad: number) => {
      setDetalles((prev) => {
        const nvaLista = [...prev];
        if (nvaLista[index]) {
          nvaLista[index].cantidad_solicitada = nvaCantidad;
        }
        return nvaLista;
      });
    },
    [],
  );

  const actualizarContenidoItem = useCallback(
    (index: number, nvoContenido: number) => {
      setDetalles((prev) => {
        const nvaLista = [...prev];
        if (nvaLista[index]) {
          nvaLista[index].contenido_por_presentacion = nvoContenido;
        }
        return nvaLista;
      });
    },
    [],
  );

  /**
   * Actualiza la cantidad de ítems de un ítem del modelo "magnitud por
   * ítem". Mantiene la magnitud fija y propaga el cambio al resto:
   * - `cantidad_solicitada` = nuevos_items × valor_magnitud
   * - `valor_magnitud_base` se mantiene (la magnitud en base no cambia)
   * - `contenido_por_presentacion` se conserva con el factor real
   *   (derivado del par `valor_magnitud_base` / `valor_magnitud`).
   */
  const actualizarCantidadItems = useCallback(
    (index: number, nuevosItems: number) => {
      setDetalles((prev) => {
        const nvaLista = [...prev];
        const det = nvaLista[index];
        if (!det) return prev;
        const mag = det.valor_magnitud ?? 0;
        const magBase = det.valor_magnitud_base ?? 0;
        const factor = mag > 0 ? magBase / mag : 1;
        det.cantidad_items = nuevosItems;
        det.cantidad_solicitada = nuevosItems * mag;
        det.contenido_por_presentacion = factor;
        return nvaLista;
      });
    },
    [],
  );

  /**
   * Actualiza la magnitud por ítem (en la unidad del detalle). Mantiene los
   * ítems fijos y propaga el cambio al resto:
   * - `valor_magnitud_base` = nueva_magnitud × factor (factor constante)
   * - `cantidad_solicitada` = items × nueva_magnitud
   * - `contenido_por_presentacion` se conserva con el mismo factor.
   */
  const actualizarValorMagnitud = useCallback(
    (index: number, nuevaMagnitud: number) => {
      setDetalles((prev) => {
        const nvaLista = [...prev];
        const det = nvaLista[index];
        if (!det) return prev;
        const items = det.cantidad_items ?? 0;
        const magActual = det.valor_magnitud ?? 0;
        const magBaseActual = det.valor_magnitud_base ?? 0;
        // El factor de conversión base/detalle es invariante; lo derivamos
        // del par anterior para que el cambio de magnitud lo respete.
        const factor =
          magActual > 0 ? magBaseActual / magActual : 1;
        det.valor_magnitud = nuevaMagnitud;
        det.valor_magnitud_base = nuevaMagnitud * factor;
        det.cantidad_solicitada = items * nuevaMagnitud;
        det.contenido_por_presentacion = factor;
        return nvaLista;
      });
    },
    [],
  );

  /**
   * Actualiza la cantidad en la unidad del detalle (modelo clásico). El
   * factor de conversión se preserva, así que el total en base se actualiza
   * automáticamente.
   */
  const actualizarCantidadDetalleItem = useCallback(
    (index: number, nuevaCantidad: number) => {
      setDetalles((prev) => {
        const nvaLista = [...prev];
        const det = nvaLista[index];
        if (!det) return prev;
        det.cantidad_solicitada = nuevaCantidad;
        return nvaLista;
      });
    },
    [],
  );

  /**
   * Actualiza el factor de conversión (contenido_por_presentacion) en el
   * modelo clásico. La cantidad en la unidad del detalle se preserva, así
   * que el total en base se recalcula automáticamente.
   */
  const actualizarFactorItem = useCallback(
    (index: number, nuevoFactor: number) => {
      setDetalles((prev) => {
        const nvaLista = [...prev];
        const det = nvaLista[index];
        if (!det) return prev;
        det.contenido_por_presentacion = nuevoFactor;
        return nvaLista;
      });
    },
    [],
  );

  /**
   * Ajusta un ítem del detalle para que su TOTAL en la unidad base del
   * producto sea `nuevoTotalBase`. Maneja correctamente los dos modelos:
   *
   * 1) Modelo clásico (sin smart calc o smart calc con unidades idénticas):
   *    se modifica `cantidad_solicitada` para que
   *    `cantidad_solicitada × contenido_por_presentacion` dé el nuevo total.
   *
   * 2) Modelo "magnitud por ítem con unidades diferentes": se modifica
   *    `valor_magnitud_base` (manteniendo `cantidad_items` fija) y se
   *    recalcula `valor_magnitud` en la unidad del detalle usando el mismo
   *    factor de conversión que tenía el ítem. `cantidad_solicitada` se
   *    actualiza como `cantidad_items × valor_magnitud` y
   *    `contenido_por_presentacion` se mantiene con el factor real.
   */
  const actualizarTotalBaseItem = useCallback(
    (index: number, nuevoTotalBase: number) => {
      setDetalles((prev) => {
        const nvaLista = [...prev];
        const det = nvaLista[index];
        if (!det) return prev;

        const items = det.cantidad_items ?? 0;
        const magBase = det.valor_magnitud_base ?? 0;
        const magDet = det.valor_magnitud ?? 0;

        if (items > 0 && magBase > 0) {
          // Modelo magnitud por ítem
          const nuevaMagBase = nuevoTotalBase / items;
          // El factor base/detalle es constante: magBase / magDet.
          const factor = magDet > 0 ? magBase / magDet : 1;
          det.valor_magnitud_base = nuevaMagBase;
          det.valor_magnitud = factor > 0 ? nuevaMagBase / factor : nuevaMagBase;
          det.cantidad_solicitada = items * det.valor_magnitud;
          det.contenido_por_presentacion = factor;
        } else {
          // Modelo clásico
          const contenido = det.contenido_por_presentacion || 0;
          det.cantidad_solicitada =
            contenido > 0 ? nuevoTotalBase / contenido : 0;
        }
        return nvaLista;
      });
    },
    [],
  );

  // Submit Final
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    const esAuditable = detalles.some((d) => {
      const prod = productos.find((p) => p.id_producto === d.id_producto);
      return prod?.es_auditable;
    });

    // ============== MODO EDICIÓN ==============
    if (modo === "editar") {
      if (!requerimientoInicial) {
        setError("No hay requerimiento inicial para editar");
        setSubmitting(false);
        return;
      }

      // Validación: al menos un detalle sin entregar debe quedar en la lista.
      // Si el usuario eliminó todos los detalles bloqueados pero tambien
      // todos los no entregados, igualmente puede dejar la lista vacia
      // (caso valido: se reemplazan items). Pero si la lista quedo vacia y
      // el requerimiento original tampoco tenia items entregables, eso
      // no es un error: solo bloqueamos en backend.

      // Construir DTO_EditarRequerimiento.
      // Los items con `id_detalle` van a `detalles_editar` (siempre que no
      // esten bloqueados por tener entregas). Los que NO tienen `id_detalle`
      // son productos NUEVOS que el usuario agrego durante la edicion y van
      // a `detalles_crear`.
      const detalles_editar = detalles
        .filter((d) => !d.bloqueado && Boolean(d.id_detalle))
        .map((d) => ({
          id_requerimiento_almacen_detalle: d.id_detalle!,
          id_unidad_medida: d.id_unidad_medida,
          cantidad_solicitada: d.cantidad_solicitada,
          contenido_por_presentacion: d.contenido_por_presentacion,
          comentario: d.comentario,
          para_mantenimiento: d.para_mantenimiento,
          id_activo_fijo_destino:
            d.id_activo_fijo_destino && d.id_activo_fijo_destino > 0
              ? d.id_activo_fijo_destino
              : null,
          con_magnitud: d.con_magnitud,
          cantidad_items: d.cantidad_items,
          valor_magnitud: d.valor_magnitud,
          valor_magnitud_base: d.valor_magnitud_base,
        }));

      const detalles_crear = detalles
        .filter((d) => !d.id_detalle && !d.bloqueado)
        .map((d) => ({
          id_producto: d.id_producto,
          id_unidad_medida: d.id_unidad_medida,
          cantidad_solicitada: d.cantidad_solicitada,
          contenido_por_presentacion: d.contenido_por_presentacion,
          comentario: d.comentario,
          id_activo_fijo_destino:
            d.id_activo_fijo_destino && d.id_activo_fijo_destino > 0
              ? d.id_activo_fijo_destino
              : null,
          para_mantenimiento: d.para_mantenimiento,
          con_magnitud: d.con_magnitud ? 1 : 0,
          cantidad_items: d.cantidad_items,
          valor_magnitud: d.valor_magnitud,
          valor_magnitud_base: d.valor_magnitud_base,
        }));

      // Para detectar eliminaciones: comparar ids originales vs actuales.
      const idsOriginales = new Set(
        (detallesIniciales ?? []).map((d) =>
          Number(d.id_requerimiento_almacen_detalle),
        ),
      );
      const idsActualesNoBloqueados = new Set(
        detalles
          .filter((d) => !d.bloqueado && d.id_detalle)
          .map((d) => Number(d.id_detalle)),
      );
      const detalles_eliminar = Array.from(idsOriginales).filter(
        (id) => !idsActualesNoBloqueados.has(id),
      );

      try {
        const res = await AtencionService.editarRequerimiento(
          requerimientoInicial.id_requerimiento,
          {
            id_empleado_solicitante:
              !verContratistas && idEmpleadoSolicitante > 0
                ? idEmpleadoSolicitante
                : null,
            id_contratista_solicitante:
              verContratistas && idEmpleadoSolicitante > 0
                ? idEmpleadoSolicitante
                : null,
            id_labor: idLabor > 0 ? idLabor : null,
            premura,
            tipo_turno: tipoTurno,
            fecha_solicitud: fechaSolicitud
              ? dayjs(fechaSolicitud).format("YYYY-MM-DD")
              : undefined,
            fecha_entrega_requerida: fechaEntregaRequerida
              ? dayjs(fechaEntregaRequerida).format("YYYY-MM-DD")
              : undefined,
            observacion,
            es_auditable: esAuditable,
            evidencias_nuevas:
              evidencias.length > 0 ? evidencias : undefined,
            detalles_editar,
            detalles_crear,
            detalles_eliminar,
          },
        );
        if (res.success) {
          notifySuccess("Requerimiento actualizado correctamente");
          // En edicion no se imprime. Reusamos la firma de onSuccess
          // pasando strings vacios como printerTarget/printerWin.
          onSuccess(res.data, "", null);
        } else {
          setError(res.message);
        }
      } catch (err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(
          axiosErr.response?.data?.message ||
            "Error al actualizar el requerimiento",
        );
        console.error(err);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ============== MODO CREAR ==============
    const dto: DTO_CrearRequerimiento = {
      id_empleado_solicitante:
        !verContratistas && idEmpleadoSolicitante > 0 ? idEmpleadoSolicitante : null,
      id_contratista_solicitante:
        verContratistas && idEmpleadoSolicitante > 0 ? idEmpleadoSolicitante : null,
      id_labor: idLabor > 0 ? idLabor : null,
      id_almacen_destino: idAlmacenDestino,
      premura,
      tipo_turno: tipoTurno,
      es_auditable: esAuditable,
      fecha_solicitud: fechaSolicitud
        ? dayjs(fechaSolicitud).format("YYYY-MM-DD")
        : null,
      fecha_entrega_requerida: fechaEntregaRequerida
        ? dayjs(fechaEntregaRequerida).format("YYYY-MM-DD")
        : dayjs().add(2, "days").format("YYYY-MM-DD"),
      observacion,
      detalles,
      evidencias: evidencias.length > 0 ? evidencias : null,
    };

    const validation = Schema_CrearRequerimiento.safeParse(dto);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setSubmitting(false);
      return;
    }

    // Validación manual de ítems con cantidad 0
    const tieneItemsEnCero = detalles.some(
      (d) => d.cantidad_solicitada <= 0 || d.contenido_por_presentacion <= 0,
    );
    if (tieneItemsEnCero) {
      setError(
        "Hay productos con cantidad o contenido igual o menor a 0 en la lista",
      );
      setSubmitting(false);
      return;
    }

    const printerTarget = "NuevoRequerimientoPrinter";
    const printerWin = prepare(printerTarget);

    try {
      const res = await AtencionService.registrarRequerimiento(dto);
      if (res.success) {
        notifySuccess("Requerimiento registrado correctamente");
        onSuccess(res.data, printerTarget, printerWin);
      } else {
        printerWin?.close();
        setError(res.message);
      }
    } catch (err) {
      printerWin?.close();
      setError("Error al registrar requerimiento");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [
    modo,
    requerimientoInicial,
    detalles,
    detallesIniciales,
    verContratistas,
    idEmpleadoSolicitante,
    idLabor,
    premura,
    tipoTurno,
    fechaSolicitud,
    fechaEntregaRequerida,
    observacion,
    evidencias,
    onSuccess,
    notifySuccess,
    prepare,
    productos,
  ]);

  return {
    mode: { modo },
    state: {
      labores,
      productos,
      unidades,
      setUnidades,
      evidencias,
      setEvidencias,
      idAlmacenDestino,
      setIdAlmacenDestino,
      idLabor,
      setIdLabor,
      idEmpleadoSolicitante,
      setIdEmpleadoSolicitante,
      empleados,
      contratistas,
      verContratistas,
      setVerContratistas,
      premura,
      setPremura,
      tipoTurno,
      setTipoTurno,
      fechaSolicitud,
      setFechaSolicitud,
      fechaEntregaRequerida,
      setFechaEntregaRequerida: actualizarFechaEntrega,
      observacion,
      setObservacion,
      // Item
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
      paraMantenimientoItem,
      setParaMantenimientoItem,
      idActivoFijoDestino,
      setIdActivoFijoDestino,
      productoBusqueda,
      setProductoBusqueda,
      unidadBusqueda,
      setUnidadBusqueda,
      activos,
      detalles,
    },
    derived: {
      sonUnidadesIdenticas,
      productoSeleccionado,
      conversionAutomatica,
      contenidoBloqueado,
      calculoInteligenteDisponible,
      canAdd:
        idProducto &&
        idUnidadMedida &&
        cantidad > 0 &&
        contenido > 0,
      productosFiltrados,
      productosVisibles,
      unidadesVisibles,
    },
    status: {
      submitting,
      loadingCatalogs,
      loadingLabores,
      loadingMinaData,
      loadingActivos,
      error,
    },
    actions: {
      agregarItem,
      eliminarItem,
      actualizarCantidadItem,
      actualizarContenidoItem,
      actualizarCantidadItems,
      actualizarValorMagnitud,
      actualizarCantidadDetalleItem,
      actualizarFactorItem,
      actualizarTotalBaseItem,
      handleSubmit,
    },
  };
};
