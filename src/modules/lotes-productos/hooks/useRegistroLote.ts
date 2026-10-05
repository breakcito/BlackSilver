import { useState, useEffect, useMemo, useCallback } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { LotesService } from "../service/lotes.service";
import {
  Schema_CrearLote,
  Schema_RegistrarLotesMasivo,
} from "../service/lotes.requests";
import type { RES_Lote } from "../service/lotes.responses";
import type { RES_UnidadMedida } from "../../../service/responses/unidad-medida";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { RES_Producto } from "../../../service/responses/producto";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";

/**
 * Estado de una fila del registro masivo. Cada fila representa un lote
 * independiente que se enviara en la misma operacion.
 */
export interface LoteFila {
  id_producto: number;
  id_unidad_medida: number;
  stock_inicial: number;
  contenido_por_presentacion: number;
  fecha_hora_ingreso: Date | null;
  fecha_vencimiento: Date | null;
  descripcion: string;
  serie_factura_compra: string;
  numero_factura_compra: string;
  costo_por_unidad: number | null;
}

const filaVacia = (): LoteFila => ({
  id_producto: 0,
  id_unidad_medida: 0,
  stock_inicial: 0,
  contenido_por_presentacion: 1,
  fecha_hora_ingreso: new Date(),
  fecha_vencimiento: null,
  descripcion: "",
  serie_factura_compra: "",
  numero_factura_compra: "",
  costo_por_unidad: null,
});

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
  const { notifySuccess } = useNotify();
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catalogs
  const [productos, setProductos] = useState<RES_Producto[]>([]);
  const [unidades, setUnidades] = useState<RES_UnidadMedida[]>([]);

  // Cabecera unica: solo el almacen.
  const [idAlmacen, setIdAlmacen] = useState<number>(initialAlmacenId || 0);

  // Detalle: array de filas (lotes) que se enviaran juntos.
  const [filas, setFilas] = useState<LoteFila[]>(() => [filaVacia()]);

  const loadProductos = async () => {
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
  };

  // Load catalogs
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

    loadProductos();
    loadUnidades();
  }, []);

  /**
   * Resolver producto y unidad de una fila. Si el producto existe y la unidad
   * del detalle es la misma que la base, fuerza id_unidad_medida = base.
   */
  const resolverProductoUnidad = useCallback(
    (fila: LoteFila): LoteFila => {
      if (!fila.id_producto || loadingUnidades) return fila;
      const prod = productos.find((p) => p.id_producto === fila.id_producto);
      if (!prod) return fila;
      return { ...fila, id_unidad_medida: prod.id_unidad_medida_base };
    },
    [productos, loadingUnidades],
  );

  /**
   * Al cambiar el producto de una fila, sincronizar la unidad con la base del
   * producto. Es el mismo patron que el registro simple.
   */
  useEffect(() => {
    setFilas((prev) => prev.map(resolverProductoUnidad));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas.map((f) => f.id_producto).join("|")]);

  /**
   * Calcular conversion automatica (cuantas unidades base hay en 1 unidad del
   * detalle). Misma logica que el registro simple, parametrizada por fila.
   */
  const calcularConversionAutomatica = useCallback(
    (fila: LoteFila): number | null => {
      if (!fila.id_producto || !fila.id_unidad_medida) return null;
      const prod = productos.find((p) => p.id_producto === fila.id_producto);
      const sonIdenticas =
        prod && prod.id_unidad_medida_base === fila.id_unidad_medida;
      if (sonIdenticas) return 1;

      const unidadDetalle = unidades.find(
        (u) => u.id_unidad_medida === fila.id_unidad_medida,
      );
      if (!unidadDetalle?.conversiones) return null;
      if (!prod) return null;

      const conv = unidadDetalle.conversiones.find(
        (c) => c.id_unidad_destino === prod.id_unidad_medida_base,
      );
      if (!conv) return null;

      const factorOrigenesPorDestino = Number(conv.factor_conversion);
      if (!factorOrigenesPorDestino || factorOrigenesPorDestino <= 0) return null;

      return 1 / factorOrigenesPorDestino;
    },
    [productos, unidades],
  );

  /**
   * Auto-setear `contenido_por_presentacion` cuando hay conversion conocida.
   * Si no hay conversion, no se toca (el usuario tipea).
   */
  useEffect(() => {
    setFilas((prev) =>
      prev.map((fila) => {
        if (!fila.id_producto || !fila.id_unidad_medida) return fila;
        const conversion = calcularConversionAutomatica(fila);
        if (conversion === null) return fila;
        if (conversion === 1) {
          return { ...fila, contenido_por_presentacion: 1 };
        }
        return { ...fila, contenido_por_presentacion: conversion };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas.map((f) => `${f.id_producto}-${f.id_unidad_medida}`).join("|")]);

  /**
   * Auto-calcular costo x unidad a partir del costo promedio del producto.
   * Si las unidades son identicas, costo = base. Si no, costo = base * contenido.
   */
  useEffect(() => {
    setFilas((prev) =>
      prev.map((fila) => {
        if (!fila.id_producto) {
          return { ...fila, costo_por_unidad: null };
        }
        const prod = productos.find((p) => p.id_producto === fila.id_producto);
        if (!prod) return fila;
        const baseCost = prod.costo_promedio_base || 0;
        const sonIdenticas =
          prod.id_unidad_medida_base === fila.id_unidad_medida;
        if (sonIdenticas) {
          return { ...fila, costo_por_unidad: baseCost };
        }
        return {
          ...fila,
          costo_por_unidad: Number(
            (baseCost * (fila.contenido_por_presentacion || 1)).toFixed(2),
          ),
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filas.map((f) => `${f.id_producto}-${f.id_unidad_medida}`).join("|"),
  ]);

  /**
   * Pre-rellenar una nueva fila con los valores que se repiten del ultimo
   * lote (producto, unidad, contenido, costo, serie, numero, descripcion).
   * NO se pre-rellenan: stock, fecha de ingreso (puede ser retroactiva),
   * fecha de vencimiento.
   */
  const construirFilaClonada = useCallback((referencia: LoteFila): LoteFila => {
    return {
      id_producto: referencia.id_producto,
      id_unidad_medida: referencia.id_unidad_medida,
      stock_inicial: 0,
      contenido_por_presentacion: referencia.contenido_por_presentacion,
      fecha_hora_ingreso: new Date(),
      fecha_vencimiento: null,
      descripcion: referencia.descripcion,
      serie_factura_compra: referencia.serie_factura_compra,
      numero_factura_compra: referencia.numero_factura_compra,
      costo_por_unidad: referencia.costo_por_unidad,
    };
  }, []);

  const anadirFila = useCallback(() => {
    setFilas((prev) => {
      const ultima = prev[prev.length - 1] ?? filaVacia();
      return [...prev, construirFilaClonada(ultima)];
    });
  }, [construirFilaClonada]);

  const eliminarFila = useCallback((index: number) => {
    setFilas((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const actualizarFila = useCallback(
    (index: number, partial: Partial<LoteFila>) => {
      setFilas((prev) =>
        prev.map((f, i) => (i === index ? { ...f, ...partial } : f)),
      );
    },
    [],
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setSubmitting(true);
    setError(null);

    if (filas.length === 0) {
      setError("Debe agregar al menos un lote");
      setSubmitting(false);
      return;
    }

    // Validar cabecera + cada fila con el mismo Zod original
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      const candidate = {
        id_producto: f.id_producto,
        id_unidad_medida: f.id_unidad_medida,
        id_almacen: idAlmacen,
        descripcion: f.descripcion,
        stock_inicial: f.stock_inicial,
        contenido_por_presentacion: f.contenido_por_presentacion,
        fecha_hora_ingreso: f.fecha_hora_ingreso,
        fecha_vencimiento: f.fecha_vencimiento,
        serie_factura_compra: f.serie_factura_compra || null,
        numero_factura_compra: f.numero_factura_compra || null,
        costo_por_unidad: f.costo_por_unidad,
      };
      const validation = Schema_CrearLote.safeParse(candidate);
      if (!validation.success) {
        setError(`Lote #${i + 1}: ${validation.error.issues[0].message}`);
        setSubmitting(false);
        return;
      }
    }

    // Validacion final del payload masivo
    const payload = {
      id_almacen: idAlmacen,
      lotes: filas.map((f) => ({
        id_producto: f.id_producto,
        id_unidad_medida: f.id_unidad_medida,
        stock_inicial: f.stock_inicial,
        contenido_por_presentacion: f.contenido_por_presentacion,
        fecha_hora_ingreso: f.fecha_hora_ingreso || new Date(),
        fecha_vencimiento: f.fecha_vencimiento,
        descripcion: f.descripcion,
        serie_factura_compra: f.serie_factura_compra || null,
        numero_factura_compra: f.numero_factura_compra || null,
        costo_por_unidad: f.costo_por_unidad,
      })),
    };

    const finalValidation = Schema_RegistrarLotesMasivo.safeParse(payload);
    if (!finalValidation.success) {
      setError(finalValidation.error.issues[0].message);
      setSubmitting(false);
      return;
    }

    try {
      const result = await LotesService.crearMasivo(finalValidation.data);
      if (result.success) {
        notifySuccess(result.message);
        onSuccess(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Derivados por fila (memoizados) - expone al componente para renderizar
  // el resumen de conversion de cada fila sin recalcular en cada paint.
  const derivadosPorFila = useMemo(() => {
    return filas.map((fila) => {
      const producto = productos.find(
        (p) => p.id_producto === fila.id_producto,
      );
      const unidadSeleccionada = unidades.find(
        (u) => u.id_unidad_medida === fila.id_unidad_medida,
      );
      const unidadBase = unidades.find(
        (u) => u.id_unidad_medida === producto?.id_unidad_medida_base,
      );
      const sonIdenticas =
        producto && unidadSeleccionada
          ? producto.id_unidad_medida_base === unidadSeleccionada.id_unidad_medida
          : false;
      const conversion = calcularConversionAutomatica(fila);
      const contenidoBloqueado =
        sonIdenticas || (Boolean(producto) && conversion !== null);
      const stockTotalBase = Number(
        ((fila.stock_inicial || 0) * (fila.contenido_por_presentacion || 1)).toFixed(2),
      );
      return {
        productoSeleccionado: producto,
        unidadSeleccionada,
        unidadBase,
        sonIdenticas,
        conversionAutomatica: conversion,
        contenidoBloqueado,
        stockTotalBase,
      };
    });
  }, [filas, productos, unidades, calcularConversionAutomatica]);

  return {
    // Cabecera
    idAlmacen,
    setIdAlmacen,

    // Filas
    filas,
    anadirFila,
    eliminarFila,
    actualizarFila,

    // Status
    loadingProductos,
    loadingUnidades,
    submitting,
    error,

    // Catalogs
    catalogs: {
      productos,
      unidades,
      almacenes,
    },

    // Derivados por fila
    derivadosPorFila,

    handleSubmit,
    recargarProductos: loadProductos,
  };
};
