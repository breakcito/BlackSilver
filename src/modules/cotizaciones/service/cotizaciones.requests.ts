import { z } from "zod";
import {
  Estado_Cotizacion,
  Estado_Cotizacion_Detalle,
} from "../../../shared/enums/cotizacion/cotizacion";
import { MetodoPago } from "../../../shared/enums/_generic/metodo-pago";
import { TipoDespachoCompra } from "../../../shared/enums/_generic/tipo-despacho-compra";
import { Periodo } from "../../../shared/enums/_generic/periodo";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";

// Detalle de cada producto dentro de una cotización específica
export const Schema_CotizacionDetalle = z.object({
  id_producto: z.number().min(1, "Producto no válido"),
  id_unidad_medida: z.number().min(1, "Seleccione una unidad de medida"),
  // Almacén y despacho
  id_almacen_recepcionista: z
    .number()
    .min(1, "Seleccione un almacén de recepción")
    .optional()
    .nullable(),
  id_mina_destino: z.number().optional().nullable(),
  tipo_despacho: z.nativeEnum(TipoDespachoCompra),
  lugar_recojo: z.string().optional().nullable(),
  // Tiempo de entrega
  tiempo_entrega: z.number().min(1, "Indique el tiempo de entrega"),
  tiempo_entrega_periodo: z.nativeEnum(Periodo),
  tiempo_entrega_dias: z.number().min(0), // calculado
  // Cantidades
  cantidad: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  contenido_por_presentacion: z.number().min(0.01, "Mínimo 1"),
  cantidad_base: z.number(), // Calculado: cantidad * contenido
  // Precios
  precio_unitario: z.number().min(0, "Precio no válido").optional().nullable(),
  precio_unitario_base: z.number().optional().nullable(),
  // Precio confirmado para la OC (solo se envía al aprobar desde el wizard)
  precio_confirmado_oc: z.number().min(0).optional().nullable(),
  // Extra
  comentario: z.string().optional().nullable(),
  no_cotiza: z.boolean().optional().default(false),
  estado: z.nullable(z.nativeEnum(Estado_Cotizacion_Detalle)).optional(),
  // Vinculacion opcional con la solicitud de reabastecimiento que origino
  // este item de cotizacion (NULL cuando la cotizacion no vino de una).
  id_solicitud_reabastecimiento_detalle: z.number().nullable().optional(),
});

// Cabecera de una cotización (un proveedor)
export const Schema_CotizacionRequest = z.object({
  id_proveedor: z.number().min(1, "Seleccione un proveedor"),
  tipo_entidad_proveedor: z
    .nativeEnum(TipoEntidad)
    .default(TipoEntidad.Juridica),
  moneda: z.string().min(1, "Seleccione una moneda"),
  tipo_cambio_venta_referencial: z.number().optional().nullable(),
  metodo_pago: z.nativeEnum(MetodoPago),
  fecha_vencimiento_pago: z.string().optional().nullable(),
  // Costos adicionales (opcionales)
  costo_flete: z.number().min(0).default(0),
  otros_gastos: z.number().min(0).default(0),
  // Totales
  total_antes_igv: z.number(),
  incluye_igv: z.boolean().default(true),
  porcentaje_igv: z.number().default(18),
  monto_igv: z.number(),
  total_despues_igv: z.number(),
  observacion: z.string().optional().nullable(),
  empresas_ids: z.array(z.number()).min(1, "Seleccione al menos una empresa"),
  estado: z.nativeEnum(Estado_Cotizacion).default(Estado_Cotizacion.Generada),
  // Campo para aprobación inline (solo cuando estado es Aprobada)
  id_empresa_compradora: z.number().optional().nullable(),
  tipo_cambio_aplicado_oc: z.number().optional().nullable(),
  // Vinculacion opcional con la solicitud de reabastecimiento que origino
  // la cotizacion (NULL = cotizacion creada normalmente).
  id_solicitud_reabastecimiento: z.number().nullable().optional(),
  detalles: z
    .array(Schema_CotizacionDetalle)
    .min(1, "Agregue al menos un producto a la cotización"),
});

// Producto base que se va a comparar (pueden ser varios)
export const Schema_ProductoComparativo = z.object({
  id_producto: z.number().min(1),
  id_solicitud_detalle: z.number().optional().nullable(),
});

// Objeto raíz para el registro masivo
export const Schema_RegistrarComparativo = z.object({
  productos: z
    .array(Schema_ProductoComparativo)
    .min(1, "Debe agregar productos al comparativo"),
  cotizaciones: z
    .array(Schema_CotizacionRequest)
    .min(1, "Debe agregar al menos una cotización"),
});

export type DTO_CotizacionDetalle = z.infer<typeof Schema_CotizacionDetalle>;
export type DTO_CotizacionRequest = z.infer<typeof Schema_CotizacionRequest>;
export type DTO_ProductoComparativo = z.infer<
  typeof Schema_ProductoComparativo
>;
export type DTO_RegistrarComparativo = z.infer<
  typeof Schema_RegistrarComparativo
>;

// Objeto para actualización individual
export const Schema_ActualizarCotizacion = Schema_CotizacionRequest.extend({
  detalles: z.array(
    Schema_CotizacionDetalle.extend({
      id_cotizacion_detalle: z.number().optional().nullable(),
    }),
  ),
});

export type DTO_ActualizarCotizacion = z.infer<typeof Schema_ActualizarCotizacion>;
