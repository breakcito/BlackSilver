import { useState, useCallback, useEffect } from "react";
import type {
  DTO_CotizacionRequest,
  DTO_CotizacionDetalle,
  DTO_ProductoComparativo,
} from "../../service/cotizaciones.requests";
import {
  Estado_Cotizacion,
  Estado_Cotizacion_Detalle,
} from "../../../../shared/enums/cotizacion/cotizacion";
import { TipoDespachoCompra } from "../../../../shared/enums/_generic/tipo-despacho-compra";
import { Periodo } from "../../../../shared/enums/_generic/periodo";
import { TipoBien } from "../../../../shared/enums/_generic/tipo-bien";
import { MetodoPago } from "../../../../shared/enums/_generic/metodo-pago";
import {
  recalcularTotales,
  DIAS_POR_PERIODO,
  calcularFactorConversion,
  type MaestrosState,
} from "./utils";
import { useNotify } from "../../../../hooks/useNotify";

export interface CopiedCotizacion {
  sourceIndex: number;
  type: "all" | "general" | "delivery";
  headerData: {
    empresas_ids: number[];
    moneda: string;
    tipo_cambio_venta_referencial?: number | null;
    metodo_pago: MetodoPago;
    fecha_vencimiento_pago?: string | null;
    costo_flete?: number;
    otros_gastos?: number;
    incluye_igv: boolean;
    porcentaje_igv: number;
    observacion?: string | null;
  };
  detailsData: {
    id_producto: number;
    id_unidad_medida: number;
    cantidad: number;
    contenido_por_presentacion: number;
    cantidad_base: number;
    precio_unitario?: number | null;
    precio_unitario_base?: number | null;
    comentario?: string | null;
    id_almacen_recepcionista?: number | null;
    id_mina_destino?: number | null;
    tipo_despacho: TipoDespachoCompra;
    lugar_recojo?: string | null;
    tiempo_entrega: number;
    tiempo_entrega_periodo: Periodo;
    tiempo_entrega_dias: number;
  }[];
}

export const useCotizacionHandlers = (
  setProductos: React.Dispatch<React.SetStateAction<DTO_ProductoComparativo[]>>,
  setCotizaciones: React.Dispatch<
    React.SetStateAction<DTO_CotizacionRequest[]>
  >,
  maestros: MaestrosState,
) => {
  const { notify } = useNotify();

  const [copySource, setCopySource] = useState<{
    cotIndex: number;
    rowIndex: number;
    id_producto: number;
    data: Partial<DTO_CotizacionDetalle>;
  } | null>(null);

  const [copiedCotizacion, setCopiedCotizacion] = useState<CopiedCotizacion | null>(null);

  const updateCotizacionHeader = useCallback(
    <K extends keyof DTO_CotizacionRequest>(
      index: number,
      field: K,
      value: DTO_CotizacionRequest[K],
    ) => {
      setCotizaciones((prev) => {
        const p = [...prev];
        const target = { ...p[index], [field]: value };

        const afectaTotales = (
          [
            "incluye_igv",
            "porcentaje_igv",
            "costo_flete",
            "otros_gastos",
          ] as string[]
        ).includes(field as string);

        if (afectaTotales) {
          Object.assign(target, recalcularTotales(target));
        }

        if ((field as string) === "estado") {
          const isAprobado = value === Estado_Cotizacion.Aprobada;
          const hasHabiles = target.detalles.some((d) => !d.no_cotiza);
          target.estado =
            isAprobado && !hasHabiles
              ? Estado_Cotizacion.Generada
              : (value as Estado_Cotizacion);
        }

        if ((field as string) === "id_proveedor") {
          const provId = Number(value);
          const prov = maestros.proveedores.find(
            (p) => p.id_proveedor === provId,
          );
          const nuevaDireccion = prov?.direccion || "";

          target.detalles = target.detalles.map((d) => {
            if (d.tipo_despacho === TipoDespachoCompra.Recojo) {
              return { ...d, lugar_recojo: nuevaDireccion || null };
            }
            return d;
          });
        }

        p[index] = target;
        return p;
      });
    },
    [setCotizaciones, maestros.proveedores],
  );

  const updateCotizacionDetail = useCallback(
    <K extends keyof DTO_CotizacionDetalle>(
      cotIndex: number,
      rowIndex: number,
      field: K,
      value: DTO_CotizacionDetalle[K],
    ) => {
      setCotizaciones((prev) => {
        const p = [...prev];
        const cot = { ...p[cotIndex] };
        const detalles = [...cot.detalles];
        const upd = { ...detalles[rowIndex], [field]: value };
        const prodId = upd.id_producto;

        if (field === "id_unidad_medida") {
          const maestro = maestros.catalogo.find(
            (m) => m.id_producto === prodId,
          );
          if (maestro) {
            const factor = calcularFactorConversion(
              maestro,
              Number(value),
              maestros.unidades,
            );
            if (factor !== null) {
              // Misma unidad o conversión registrada: auto-completar el
              // factor para evitar errores del usuario.
              upd.contenido_por_presentacion = factor;
            }

            // Sugerir precio solo si está vacío/0 Y la moneda del producto coincide
            // con la moneda de la cotización-columna.
            const monedasCoinciden = cot.moneda === maestro.moneda;
            const esSugerido =
              (!upd.precio_unitario || upd.precio_unitario === 0) &&
              monedasCoinciden;

            if (esSugerido) {
              upd.precio_unitario = Number(
                (
                  maestro.costo_promedio_base * upd.contenido_por_presentacion
                ).toFixed(2),
              );
            }
          }
        }

        if (field === "contenido_por_presentacion") {
          const maestro = maestros.catalogo.find(
            (m) => m.id_producto === prodId,
          );

          if (maestro) {
            // Recalcular precio sugerido solo si está vacío/0 Y las monedas coinciden.
            const monedasCoinciden = cot.moneda === maestro.moneda;
            const esSugerido =
              (!upd.precio_unitario || upd.precio_unitario === 0) &&
              monedasCoinciden;

            if (esSugerido) {
              upd.precio_unitario = Number(
                (maestro.costo_promedio_base * Number(value)).toFixed(2),
              );
            }
          }
        }

        if (field === "tiempo_entrega_periodo" || field === "tiempo_entrega") {
          upd.tiempo_entrega_dias =
            upd.tiempo_entrega *
            (DIAS_POR_PERIODO[upd.tiempo_entrega_periodo] ?? 1);
        }

        if (field === "tipo_despacho") {
          if (value !== TipoDespachoCompra.Recojo) {
            upd.lugar_recojo = null;
          } else {
            const prov = maestros.proveedores.find(
              (p) => p.id_proveedor === cot.id_proveedor,
            );
            upd.lugar_recojo = prov?.direccion || null;
          }
        }

        upd.cantidad_base = upd.cantidad * upd.contenido_por_presentacion;
        upd.precio_unitario_base =
          upd.contenido_por_presentacion > 0
            ? Number(
                (
                  (upd.precio_unitario || 0) / upd.contenido_por_presentacion
                ).toFixed(4), // Usamos 4 decimales para mayor precisión en la base
              )
            : 0;

        detalles[rowIndex] = upd;
        cot.detalles = detalles;

        if ((field as string) === "estado") {
          const anyAprobado = detalles.some(
            (d) => d.estado === Estado_Cotizacion_Detalle.Aprobado,
          );
          cot.estado = anyAprobado
            ? Estado_Cotizacion.Aprobada
            : Estado_Cotizacion.Generada;
          if (!anyAprobado) {
            cot.detalles = detalles.map((d) => ({
              ...d,
              estado: d.no_cotiza ? null : Estado_Cotizacion_Detalle.Pendiente,
            }));
          }
        }

        Object.assign(cot, recalcularTotales(cot));
        p[cotIndex] = cot;
        return p;
      });
    },
    [setCotizaciones, maestros.catalogo, maestros.proveedores],
  );

  const toggleCotizacionNoCotiza = useCallback(
    (cotIndex: number, rowIndex: number) => {
      setCotizaciones((prev) => {
        const p = [...prev];
        const cot = { ...p[cotIndex] };
        const detalles = [...cot.detalles];
        const d = detalles[rowIndex];
        const noC = !d.no_cotiza;

        detalles[rowIndex] = {
          ...d,
          no_cotiza: noC,
          estado: noC ? null : Estado_Cotizacion_Detalle.Pendiente,
        };

        cot.detalles = detalles;
        const anyAprobado = detalles.some(
          (d) => d.estado === Estado_Cotizacion_Detalle.Aprobado,
        );
        cot.estado = anyAprobado
          ? Estado_Cotizacion.Aprobada
          : Estado_Cotizacion.Generada;

        if (!anyAprobado) {
          cot.detalles = detalles.map((d) => ({
            ...d,
            estado: d.no_cotiza ? null : Estado_Cotizacion_Detalle.Pendiente,
          }));
        }

        Object.assign(cot, recalcularTotales(cot));
        p[cotIndex] = cot;
        return p;
      });
    },
    [setCotizaciones],
  );

  const updateGlobalLogistica = useCallback(
    (
      cotIndex: number,
      data: {
        id_almacen_recepcionista: number | null;
        id_mina_destino?: number | null;
        tipo_despacho: TipoDespachoCompra;
        lugar_recojo?: string;
        tiempo_entrega: number;
        tiempo_entrega_periodo: Periodo;
      },
    ) => {
      setCotizaciones((prev) => {
        const p = [...prev];
        const cot = { ...p[cotIndex] };
        const dias =
          data.tiempo_entrega *
          (DIAS_POR_PERIODO[data.tiempo_entrega_periodo] ?? 1);

        cot.detalles = cot.detalles.map((d) => {
          const maestro = maestros.catalogo.find(
            (m) => m.id_producto === d.id_producto,
          );
          const esActivo = maestro?.tipo_bien === TipoBien.ActivoFijo;

          // Si se manda una mina global, se aplica a activos y se limpia su almacen.
          // Si no, se aplica el almacen global y se limpia su mina.
          const finalMina = esActivo ? (data.id_mina_destino ?? null) : null;
          const finalAlmacen = finalMina ? null : data.id_almacen_recepcionista;

          return {
            ...d,
            id_almacen_recepcionista: finalAlmacen,
            id_mina_destino: finalMina,
            tipo_despacho: data.tipo_despacho,
            tiempo_entrega: data.tiempo_entrega,
            tiempo_entrega_periodo: data.tiempo_entrega_periodo,
            tiempo_entrega_dias: dias,
            lugar_recojo:
              data.tipo_despacho === TipoDespachoCompra.Recojo
                ? data.lugar_recojo !== undefined
                  ? data.lugar_recojo
                  : d.lugar_recojo
                : null,
          };
        });

        p[cotIndex] = cot;
        return p;
      });
    },
    [setCotizaciones, maestros.catalogo],
  );

  const duplicarFilaProducto = useCallback(
    (rowIndex: number) => {
      setProductos((prev) => {
        const p = [...prev];
        p.splice(rowIndex + 1, 0, { ...p[rowIndex] });
        return p;
      });
      setCotizaciones((prevCots) =>
        prevCots.map((cot) => {
          const c = { ...cot };
          const detalles = [...c.detalles];
          const clone = {
            ...detalles[rowIndex],
            estado: Estado_Cotizacion_Detalle.Pendiente,
          };
          detalles.splice(rowIndex + 1, 0, clone);
          c.detalles = detalles;
          return c;
        }),
      );
    },
    [setProductos, setCotizaciones],
  );

  const iniciarCopia = useCallback(
    (
      cotIndex: number,
      rowIndex: number,
      id_producto: number,
      cotizaciones: DTO_CotizacionRequest[],
    ) => {
      const source = cotizaciones[cotIndex]?.detalles[rowIndex];
      if (!source) return;

      setCopySource({
        cotIndex,
        rowIndex,
        id_producto,
        data: {
          id_unidad_medida: source.id_unidad_medida,
          cantidad: source.cantidad,
          contenido_por_presentacion: source.contenido_por_presentacion,
          cantidad_base: source.cantidad_base,
          precio_unitario: source.precio_unitario,
          precio_unitario_base: source.precio_unitario_base,
          id_almacen_recepcionista: source.id_almacen_recepcionista,
          id_mina_destino: source.id_mina_destino,
          tipo_despacho: source.tipo_despacho,
          tiempo_entrega: source.tiempo_entrega,
          tiempo_entrega_periodo: source.tiempo_entrega_periodo,
          tiempo_entrega_dias: source.tiempo_entrega_dias,
          lugar_recojo: source.lugar_recojo,
        },
      });
    },
    [],
  );

  const cancelarCopia = useCallback(() => setCopySource(null), []);

  const pegarCopia = useCallback(
    (targetCotIndex: number, targetRowIndex: number) => {
      if (!copySource) return;

      setCotizaciones((prev) => {
        const p = [...prev];
        const cot = { ...p[targetCotIndex] };
        const detalles = [...cot.detalles];

        detalles[targetRowIndex] = {
          ...detalles[targetRowIndex],
          ...copySource.data,
        };

        cot.detalles = detalles;
        Object.assign(cot, recalcularTotales(cot));
        p[targetCotIndex] = cot;
        return p;
      });

      setCopySource(null);
      notify({ type: "success", content: "Datos copiados con éxito." });
    },
    [copySource, notify, setCotizaciones],
  );

  const iniciarCopiaCotizacion = useCallback((
    sourceIndex: number,
    type: "all" | "general" | "delivery",
    cotizaciones: DTO_CotizacionRequest[]
  ) => {
    const src = cotizaciones[sourceIndex];
    if (!src) return;

    setCopiedCotizacion({
      sourceIndex,
      type,
      headerData: {
        empresas_ids: src.empresas_ids,
        moneda: src.moneda,
        tipo_cambio_venta_referencial: src.tipo_cambio_venta_referencial ?? null,
        metodo_pago: src.metodo_pago,
        fecha_vencimiento_pago: src.fecha_vencimiento_pago ?? null,
        costo_flete: src.costo_flete,
        otros_gastos: src.otros_gastos,
        incluye_igv: src.incluye_igv,
        porcentaje_igv: src.porcentaje_igv,
        observacion: src.observacion ?? null,
      },
      detailsData: src.detalles.map(d => ({
        id_producto: d.id_producto,
        id_unidad_medida: d.id_unidad_medida,
        cantidad: d.cantidad,
        contenido_por_presentacion: d.contenido_por_presentacion,
        cantidad_base: d.cantidad_base,
        precio_unitario: d.precio_unitario ?? null,
        precio_unitario_base: d.precio_unitario_base ?? null,
        comentario: d.comentario ?? null,
        id_almacen_recepcionista: d.id_almacen_recepcionista ?? null,
        id_mina_destino: d.id_mina_destino ?? null,
        tipo_despacho: d.tipo_despacho,
        lugar_recojo: d.lugar_recojo ?? null,
        tiempo_entrega: d.tiempo_entrega,
        tiempo_entrega_periodo: d.tiempo_entrega_periodo,
        tiempo_entrega_dias: d.tiempo_entrega_dias,
      }))
    });

    notify({
      type: "success",
      content: type === "all" 
        ? "Toda la cotización (sin Proveedor) copiada."
        : type === "general" 
        ? "Datos generales (Empresas y Pago) copiados."
        : "Destinos de entrega copiados."
    });
  }, [notify]);

  const pegarCotizacion = useCallback((
    targetIndex: number
  ) => {
    if (!copiedCotizacion) return;

    setCotizaciones((prev) => {
      const p = [...prev];
      const target = { ...p[targetIndex] };

      if (copiedCotizacion.type === "all") {
        target.empresas_ids = copiedCotizacion.headerData.empresas_ids;
        target.moneda = copiedCotizacion.headerData.moneda;
        target.tipo_cambio_venta_referencial = copiedCotizacion.headerData.tipo_cambio_venta_referencial;
        target.metodo_pago = copiedCotizacion.headerData.metodo_pago;
        target.fecha_vencimiento_pago = copiedCotizacion.headerData.fecha_vencimiento_pago;
        target.costo_flete = copiedCotizacion.headerData.costo_flete ?? 0;
        target.otros_gastos = copiedCotizacion.headerData.otros_gastos ?? 0;
        target.incluye_igv = copiedCotizacion.headerData.incluye_igv;
        target.porcentaje_igv = copiedCotizacion.headerData.porcentaje_igv;
        target.observacion = copiedCotizacion.headerData.observacion;
      } else if (copiedCotizacion.type === "general") {
        target.costo_flete = copiedCotizacion.headerData.costo_flete ?? 0;
        target.otros_gastos = copiedCotizacion.headerData.otros_gastos ?? 0;
        target.incluye_igv = copiedCotizacion.headerData.incluye_igv;
        target.porcentaje_igv = copiedCotizacion.headerData.porcentaje_igv;
      }

      if (copiedCotizacion.type === "all") {
        target.detalles = target.detalles.map((d, dIdx) => {
          const srcDetail = copiedCotizacion.detailsData[dIdx];
          if (!srcDetail) return d;
          return {
            ...d,
            id_unidad_medida: srcDetail.id_unidad_medida,
            cantidad: srcDetail.cantidad,
            contenido_por_presentacion: srcDetail.contenido_por_presentacion,
            cantidad_base: srcDetail.cantidad_base,
            precio_unitario: srcDetail.precio_unitario,
            precio_unitario_base: srcDetail.precio_unitario_base,
            comentario: srcDetail.comentario,
            id_almacen_recepcionista: srcDetail.id_almacen_recepcionista,
            id_mina_destino: srcDetail.id_mina_destino,
            tipo_despacho: srcDetail.tipo_despacho,
            lugar_recojo: srcDetail.lugar_recojo,
            tiempo_entrega: srcDetail.tiempo_entrega,
            tiempo_entrega_periodo: srcDetail.tiempo_entrega_periodo,
            tiempo_entrega_dias: srcDetail.tiempo_entrega_dias,
          };
        });
      } else if (copiedCotizacion.type === "delivery") {
        target.detalles = target.detalles.map((d, dIdx) => {
          const srcDetail = copiedCotizacion.detailsData[dIdx];
          if (!srcDetail) return d;
          return {
            ...d,
            id_almacen_recepcionista: srcDetail.id_almacen_recepcionista,
            id_mina_destino: srcDetail.id_mina_destino,
            tipo_despacho: srcDetail.tipo_despacho,
            lugar_recojo: srcDetail.lugar_recojo,
            tiempo_entrega: srcDetail.tiempo_entrega,
            tiempo_entrega_periodo: srcDetail.tiempo_entrega_periodo,
            tiempo_entrega_dias: srcDetail.tiempo_entrega_dias,
          };
        });
      }

      Object.assign(target, recalcularTotales(target));
      p[targetIndex] = target;
      return p;
    });

    setCopiedCotizacion(null);
    notify({ type: "success", content: "Datos pegados con éxito." });
  }, [copiedCotizacion, setCotizaciones, notify]);

  const cancelarCopiaCotizacion = useCallback(() => setCopiedCotizacion(null), []);

  /**
   * Re-aplica el factor de conversión a los detalles cuando el catálogo de
   * unidades (con sus conversiones) termina de cargar.
   *
   * Esto cierra un race condition: si el usuario seleccionó una unidad
   * diferente a la base ANTES de que las conversiones estuvieran
   * disponibles, `updateCotizacionDetail` retornaba `null` y el factor
   * quedaba en el default `1`. Cuando finalmente llegaban las unidades, el
   * input se bloqueaba (porque ya había conversión conocida) pero el valor
   * seguía en `1`. Con este effect, el factor se rellena automáticamente
   * en cuanto el catálogo está disponible.
   *
   * Protección contra sobreescritura manual: solo aplica si el contenido
   * sigue en el valor por defecto `1`, así respetamos cualquier factor que
   * el usuario haya tipeado para una unidad sin conversión registrada.
   */
  useEffect(() => {
    if (maestros.unidades.length === 0) return;

    setCotizaciones((prev) =>
      prev.map((cot) => ({
        ...cot,
        detalles: cot.detalles.map((det) => {
          const maestro = maestros.catalogo.find(
            (m) => m.id_producto === det.id_producto,
          );
          if (!maestro) return det;

          const factor = calcularFactorConversion(
            maestro,
            det.id_unidad_medida,
            maestros.unidades,
          );

          if (
            factor !== null &&
            det.contenido_por_presentacion === 1 &&
            factor !== 1
          ) {
            return {
              ...det,
              contenido_por_presentacion: factor,
            };
          }

          return det;
        }),
      })),
    );
  }, [maestros.unidades]);

  return {
    updateCotizacionHeader,
    updateCotizacionDetail,
    toggleCotizacionNoCotiza,
    updateGlobalLogistica,
    duplicarFilaProducto,
    copySource,
    iniciarCopia,
    cancelarCopia,
    pegarCopia,
    copiedCotizacion,
    iniciarCopiaCotizacion,
    pegarCotizacion,
    cancelarCopiaCotizacion,
  };
};
