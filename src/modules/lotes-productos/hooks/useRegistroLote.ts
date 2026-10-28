import { useState, useEffect, useMemo, useCallback } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { LotesService } from "../service/lotes.service";
import { Schema_RegistrarLotesMasivo } from "../service/lotes.requests";
import type { RES_Lote } from "../service/lotes.responses";
import type { RES_UnidadMedida } from "../../../service/responses/unidad-medida";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { RES_Producto } from "../../../service/responses/producto";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";

/**
 * Estructura de un lote agregado a la tabla de espera para registro masivo.
 */
export interface LoteAgregado {
  id: string;
  id_producto: number;
  producto_nombre: string;
  id_unidad_medida: number;
  unidad_nombre: string;
  unidad_abreviatura: string;
  stock_inicial: number;
  contenido_por_presentacion: number;
  stock_total_base: number;
  unidad_base_abreviatura: string;
  fecha_hora_ingreso: Date;
  fecha_vencimiento: Date | null;
  es_perecible: boolean;
  costo_por_unidad: number | null;
  serie_factura_compra: string | null;
  numero_factura_compra: string | null;
  descripcion: string | null;
}

interface UseRegistroLoteProps {
  initialAlmacenId?: number | null;
  almacenes: RES_Almacen[];
  onSuccess: (lotes: RES_Lote[]) => void;
}

export const useRegistroLote = ({
  initialAlmacenId,
  almacenes,
  onSuccess,
}: UseRegistroLoteProps) => {
  const { notifySuccess, notifyError, notifyInfo } = useNotify();

  // Estados de carga
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catálogos
  const [productos, setProductos] = useState<RES_Producto[]>([]);
  const [unidades, setUnidades] = useState<RES_UnidadMedida[]>([]);

  // Cabecera única: almacén destino
  const [idAlmacen, setIdAlmacen] = useState<number>(initialAlmacenId || 0);

  // Sincronizar initialAlmacenId si cambia desde props
  useEffect(() => {
    if (initialAlmacenId) {
      setIdAlmacen(initialAlmacenId);
    }
  }, [initialAlmacenId]);

  // Formulario de entrada para el lote actual
  const [idProducto, setIdProducto] = useState<number | null>(null);
  const [productoBusqueda, setProductoBusqueda] = useState<string>("");
  const [idUnidadMedida, setIdUnidadMedida] = useState<number | null>(null);
  const [unidadBusqueda, setUnidadBusqueda] = useState<string>("");
  const [stockInicial, setStockInicial] = useState<number>(0);
  const [contenidoPorPresentacion, setContenidoPorPresentacion] =
    useState<number>(1);
  const [fechaHoraIngreso, setFechaHoraIngreso] = useState<Date | null>(
    new Date(),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState<Date | null>(null);
  const [costoPorUnidad, setCostoPorUnidad] = useState<number | null>(null);
  const [serieFactura, setSerieFactura] = useState<string>("");
  const [numeroFactura, setNumeroFactura] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");

  // Tabla: listado de lotes en cola
  const [lotes, setLotes] = useState<LoteAgregado[]>([]);

  // Deduplicar productos por id_producto para evitar claves duplicadas en Select
  const productosUnicos = useMemo(() => {
    const map = new Map<number, RES_Producto>();
    productos.forEach((p) => {
      if (p.id_producto && !map.has(p.id_producto)) {
        map.set(p.id_producto, p);
      }
    });
    return Array.from(map.values());
  }, [productos]);

  // Deduplicar unidades por id_unidad_medida
  const unidadesUnicas = useMemo(() => {
    const map = new Map<number, RES_UnidadMedida>();
    unidades.forEach((u) => {
      if (u.id_unidad_medida && !map.has(u.id_unidad_medida)) {
        map.set(u.id_unidad_medida, u);
      }
    });
    return Array.from(map.values());
  }, [unidades]);

  // Carga de catálogo de productos
  const loadProductos = useCallback(async () => {
    setLoadingProductos(true);
    try {
      const res = await AuxService.get_productos({
        tipo_bien_excluido: TipoBien.ActivoFijo,
      });
      if (res.success) setProductos(res.data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  // Carga inicial de catálogos
  useEffect(() => {
    const loadUnidades = async () => {
      setLoadingUnidades(true);
      try {
        const res = await AuxService.get_unidades_medida();
        if (res.success) setUnidades(res.data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoadingUnidades(false);
      }
    };

    void loadProductos();
    void loadUnidades();
  }, [loadProductos]);

  // Búsqueda tolerante para productos (Fuse.js + FlexSearch)
  const productosVisibles = useMemo(() => {
    const q = productoBusqueda.trim();
    if (!q) return productosUnicos;
    return getCoincidencias(productosUnicos, q, {
      keys: ["nombre", "categoria"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [productosUnicos, productoBusqueda]);

  // Búsqueda tolerante para unidades de medida
  const unidadesVisibles = useMemo(() => {
    const q = unidadBusqueda.trim();
    if (!q) return unidadesUnicas;
    return getCoincidencias(unidadesUnicas, q, {
      keys: ["nombre", "abreviatura"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [unidadesUnicas, unidadBusqueda]);

  // Elementos seleccionados actualmente en el formulario
  const productoSeleccionado = useMemo(() => {
    if (!idProducto) return null;
    return productosUnicos.find((p) => p.id_producto === idProducto) ?? null;
  }, [productosUnicos, idProducto]);

  const unidadSeleccionada = useMemo(() => {
    if (!idUnidadMedida) return null;
    return (
      unidadesUnicas.find((u) => u.id_unidad_medida === idUnidadMedida) ?? null
    );
  }, [unidadesUnicas, idUnidadMedida]);

  const unidadBase = useMemo(() => {
    if (!productoSeleccionado) return null;
    return (
      unidadesUnicas.find(
        (u) => u.id_unidad_medida === productoSeleccionado.id_unidad_medida_base,
      ) ?? null
    );
  }, [unidadesUnicas, productoSeleccionado]);

  const sonIdenticas = useMemo(() => {
    if (!productoSeleccionado || !unidadSeleccionada) return false;
    return (
      productoSeleccionado.id_unidad_medida_base ===
      unidadSeleccionada.id_unidad_medida
    );
  }, [productoSeleccionado, unidadSeleccionada]);

  // Conversión automática de unidades
  const conversionAutomatica = useMemo(() => {
    if (!productoSeleccionado || !idUnidadMedida) return null;
    if (sonIdenticas) return 1;

    const conv = unidadSeleccionada?.conversiones?.find(
      (c) => c.id_unidad_destino === productoSeleccionado.id_unidad_medida_base,
    );
    if (!conv) return null;

    const factorOrigenesPorDestino = Number(conv.factor_conversion);
    if (!factorOrigenesPorDestino || factorOrigenesPorDestino <= 0) return null;

    return 1 / factorOrigenesPorDestino;
  }, [productoSeleccionado, idUnidadMedida, sonIdenticas, unidadSeleccionada]);

  const contenidoBloqueado = useMemo(() => {
    return (
      sonIdenticas ||
      (Boolean(productoSeleccionado) && conversionAutomatica !== null)
    );
  }, [sonIdenticas, productoSeleccionado, conversionAutomatica]);

  // Al seleccionar producto, auto-asignar su unidad base y limpiar vencimiento si no perecible
  const handleSelectProducto = useCallback(
    (nuevoId: number | null) => {
      setIdProducto(nuevoId);
      if (!nuevoId) {
        setIdUnidadMedida(null);
        setCostoPorUnidad(null);
        setFechaVencimiento(null);
        setContenidoPorPresentacion(1);
        return;
      }

      const prod = productosUnicos.find((p) => p.id_producto === nuevoId);
      if (prod) {
        setIdUnidadMedida(prod.id_unidad_medida_base);
        setContenidoPorPresentacion(1);
        setCostoPorUnidad(prod.costo_promedio_base ?? null);
        if (!prod.es_perecible) {
          setFechaVencimiento(null);
        }
      }
    },
    [productosUnicos],
  );

  // Al cambiar unidad de medida, recalcular contenido y costo estimado
  const handleSelectUnidadMedida = useCallback(
    (nuevoId: number | null) => {
      setIdUnidadMedida(nuevoId);
      if (!nuevoId || !productoSeleccionado) return;

      const esMisma =
        productoSeleccionado.id_unidad_medida_base === nuevoId;
      if (esMisma) {
        setContenidoPorPresentacion(1);
        setCostoPorUnidad(productoSeleccionado.costo_promedio_base ?? null);
        return;
      }

      const uDetalle = unidadesUnicas.find(
        (u) => u.id_unidad_medida === nuevoId,
      );
      const conv = uDetalle?.conversiones?.find(
        (c) => c.id_unidad_destino === productoSeleccionado.id_unidad_medida_base,
      );
      if (conv) {
        const factor = Number(conv.factor_conversion);
        if (factor > 0) {
          const contenidoCalc = 1 / factor;
          setContenidoPorPresentacion(contenidoCalc);
          const baseCost = productoSeleccionado.costo_promedio_base ?? 0;
          setCostoPorUnidad(Number((baseCost * contenidoCalc).toFixed(2)));
        }
      }
    },
    [productoSeleccionado, unidadesUnicas],
  );

  // Stock total en unidad base
  const stockTotalBase = useMemo(() => {
    return Number(
      ((stockInicial || 0) * (contenidoPorPresentacion || 1)).toFixed(2),
    );
  }, [stockInicial, contenidoPorPresentacion]);

  // Acción: Añadir lote a la tabla
  const anadirLote = useCallback(() => {
    setError(null);

    if (!idProducto || !productoSeleccionado) {
      notifyError("Seleccione un producto a ingresar");
      return false;
    }

    if (!idUnidadMedida || !unidadSeleccionada) {
      notifyError("Seleccione una unidad de medida");
      return false;
    }

    if (!stockInicial || stockInicial <= 0) {
      notifyError("La cantidad de unidades debe ser mayor a 0");
      return false;
    }

    if (!contenidoPorPresentacion || contenidoPorPresentacion <= 0) {
      notifyError("El contenido por presentación debe ser mayor a 0");
      return false;
    }

    if (!fechaHoraIngreso) {
      notifyError("La fecha de ingreso es obligatoria");
      return false;
    }

    if (productoSeleccionado.es_perecible && !fechaVencimiento) {
      notifyError(
        "Este producto es perecible: debe especificar la fecha de vencimiento",
      );
      return false;
    }

    const nuevoLote: LoteAgregado = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `lote-${Date.now()}-${Math.random()}`,
      id_producto: productoSeleccionado.id_producto,
      producto_nombre: productoSeleccionado.nombre,
      id_unidad_medida: unidadSeleccionada.id_unidad_medida,
      unidad_nombre: unidadSeleccionada.nombre,
      unidad_abreviatura: unidadSeleccionada.abreviatura,
      stock_inicial: Number(stockInicial),
      contenido_por_presentacion: Number(contenidoPorPresentacion),
      stock_total_base: stockTotalBase,
      unidad_base_abreviatura:
        unidadBase?.abreviatura || unidadSeleccionada.abreviatura,
      fecha_hora_ingreso: fechaHoraIngreso,
      fecha_vencimiento: productoSeleccionado.es_perecible
        ? fechaVencimiento
        : null,
      es_perecible: Boolean(productoSeleccionado.es_perecible),
      costo_por_unidad:
        costoPorUnidad !== null && costoPorUnidad !== undefined
          ? Number(costoPorUnidad)
          : null,
      serie_factura_compra: serieFactura.trim() || null,
      numero_factura_compra: numeroFactura.trim() || null,
      descripcion: descripcion.trim() || null,
    };

    setLotes((prev) => [...prev, nuevoLote]);
    notifyInfo(`Lote añadido: ${productoSeleccionado.nombre}`);

    // Limpiar campos para el siguiente lote
    setIdProducto(null);
    setProductoBusqueda("");
    setIdUnidadMedida(null);
    setUnidadBusqueda("");
    setStockInicial(0);
    setContenidoPorPresentacion(1);
    setFechaVencimiento(null);
    setCostoPorUnidad(null);

    return true;
  }, [
    idProducto,
    productoSeleccionado,
    idUnidadMedida,
    unidadSeleccionada,
    stockInicial,
    contenidoPorPresentacion,
    fechaHoraIngreso,
    fechaVencimiento,
    stockTotalBase,
    unidadBase,
    costoPorUnidad,
    serieFactura,
    numeroFactura,
    descripcion,
    notifyError,
    notifyInfo,
  ]);

  // Acción: Eliminar lote de la tabla
  const eliminarLote = useCallback((id: string) => {
    setLotes((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Acción: Enviar registro masivo a la API
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setError(null);

    if (!idAlmacen || idAlmacen <= 0) {
      const msg = "Seleccione el almacén de destino antes de registrar";
      setError(msg);
      notifyError(msg);
      return;
    }

    if (lotes.length === 0) {
      const msg = "Debe añadir al menos un lote a la tabla antes de confirmar";
      setError(msg);
      notifyError(msg);
      return;
    }

    setSubmitting(true);

    const payload = {
      id_almacen: idAlmacen,
      lotes: lotes.map((l) => ({
        id_producto: l.id_producto,
        id_unidad_medida: l.id_unidad_medida,
        stock_inicial: l.stock_inicial,
        contenido_por_presentacion: l.contenido_por_presentacion,
        fecha_hora_ingreso: l.fecha_hora_ingreso,
        fecha_vencimiento: l.fecha_vencimiento,
        descripcion: l.descripcion,
        serie_factura_compra: l.serie_factura_compra,
        numero_factura_compra: l.numero_factura_compra,
        costo_por_unidad: l.costo_por_unidad,
      })),
    };

    const validation = Schema_RegistrarLotesMasivo.safeParse(payload);
    if (!validation.success) {
      const msg = validation.error.issues[0].message;
      setError(msg);
      notifyError(msg);
      setSubmitting(false);
      return;
    }

    try {
      const result = await LotesService.crearMasivo(validation.data);
      if (result.success) {
        notifySuccess(result.message);
        onSuccess(result.data);
      } else {
        setError(result.message);
        notifyError(result.message);
      }
    } catch (err) {
      const msg = String(err);
      setError(msg);
      notifyError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    // Cabecera
    idAlmacen,
    setIdAlmacen,

    // Formulario de lote actual
    idProducto,
    setIdProducto: handleSelectProducto,
    productoBusqueda,
    setProductoBusqueda,
    idUnidadMedida,
    setIdUnidadMedida: handleSelectUnidadMedida,
    unidadBusqueda,
    setUnidadBusqueda,
    stockInicial,
    setStockInicial,
    contenidoPorPresentacion,
    setContenidoPorPresentacion,
    fechaHoraIngreso,
    setFechaHoraIngreso,
    fechaVencimiento,
    setFechaVencimiento,
    costoPorUnidad,
    setCostoPorUnidad,
    serieFactura,
    setSerieFactura,
    numeroFactura,
    setNumeroFactura,
    descripcion,
    setDescripcion,

    // Derivados del lote actual
    productoSeleccionado,
    unidadSeleccionada,
    unidadBase,
    sonIdenticas,
    conversionAutomatica,
    contenidoBloqueado,
    stockTotalBase,

    // Catálogos y filtrado
    catalogs: {
      productos: productosUnicos,
      unidades: unidadesUnicas,
      almacenes,
    },
    productosVisibles,
    unidadesVisibles,
    loadingProductos,
    loadingUnidades,

    // Tabla de lotes en cola
    lotes,
    anadirLote,
    eliminarLote,

    // Envío y control
    submitting,
    error,
    handleSubmit,
    recargarProductos: loadProductos,
  };
};
