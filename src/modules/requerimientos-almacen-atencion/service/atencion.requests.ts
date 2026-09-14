import { Estado_RequerimientoDetalle } from "../../../shared/enums/requerimiento-almacen/requerimiento";

import { z } from "zod";
import { Premura } from "../../../shared/enums/_generic/premura";
import { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";

export interface DTO_CrearRequerimiento {
  id_empleado_solicitante?: number | null;
  id_contratista_solicitante?: number | null;
  id_labor?: number | null;
  id_almacen_destino: number;
  premura: Premura;
  tipo_turno?: TipoTurno | null;
  fecha_entrega_requerida?: string | null;
  fecha_solicitud?: string | null;
  observacion?: string | null;
  es_auditable: boolean;
  detalles: DTO_CrearRequerimientoDetalle[];
  evidencias?: File[] | null;
}

export interface DTO_CrearRequerimientoDetalle {
  id_producto: number;
  id_unidad_medida: number;
  cantidad_solicitada: number;
  contenido_por_presentacion: number;
  comentario?: string | null;
  id_activo_fijo_destino?: number | null;
  para_mantenimiento?: boolean;
  // Campos para cálculo inteligente con magnitud (cuando ambas unidades son universales)
  con_magnitud?: boolean | number;
  cantidad_items?: number;
  valor_magnitud?: number;
  valor_magnitud_base?: number;
}

// Zod schemas for validation
export const Schema_CrearRequerimientoDetalle = z.object({
  id_producto: z.number().min(1, "Seleccione un producto"),
  id_unidad_medida: z.number().min(1, "Seleccione una unidad"),
  cantidad_solicitada: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  contenido_por_presentacion: z
    .number()
    .min(0.0001, "El contenido debe ser mayor a 0"),
  comentario: z.string().nullable().optional(),
  id_activo_fijo_destino: z.number().nullable().optional(),
  para_mantenimiento: z.boolean().optional(),
  con_magnitud: z.union([z.boolean(), z.number()]).optional(),
  cantidad_items: z.number().optional(),
  valor_magnitud: z.number().optional(),
  valor_magnitud_base: z.number().optional(),
});

export const Schema_CrearRequerimiento = z.object({
  id_empleado_solicitante: z.number().nullable().optional(),
  id_contratista_solicitante: z.number().nullable().optional(),
  id_labor: z.number().nullable().optional(),
  id_almacen_destino: z.number().min(1, "Seleccione un almacén de destino"),
  premura: z.nativeEnum(Premura),
  tipo_turno: z.nativeEnum(TipoTurno).nullable().optional(),
  es_auditable: z.boolean(),
  fecha_entrega_requerida: z.string().nullable().optional(),
  detalles: z
    .array(Schema_CrearRequerimientoDetalle)
    .min(1, "Debe agregar al menos un producto"),
});

export interface DTO_AtencionCambiarEstado {
  id_requerimiento_almacen_detalle?: number;
  ids_detalles?: number[];
  nuevo_estado: Estado_RequerimientoDetalle;
  comentario_decision?: string;
}

export interface DTO_DetalleEditado {
  id_requerimiento_almacen_detalle: number;
  id_unidad_medida?: number;
  cantidad_solicitada?: number;
  contenido_por_presentacion?: number;
  comentario?: string | null;
  para_mantenimiento?: boolean;
  id_activo_fijo_destino?: number | null;
  con_magnitud?: boolean | number;
  cantidad_items?: number;
  valor_magnitud?: number;
  valor_magnitud_base?: number;
}

export interface DTO_EditarRequerimiento {
  id_empleado_solicitante?: number | null;
  id_contratista_solicitante?: number | null;
  id_labor?: number | null;
  premura?: string;
  tipo_turno?: TipoTurno | null;
  fecha_entrega_requerida?: string;
  fecha_solicitud?: string;
  observacion?: string;
  es_auditable?: boolean;
  evidencias_nuevas?: File[];
  detalles_editar?: DTO_DetalleEditado[];
  detalles_eliminar?: number[];
  detalles_crear?: DTO_CrearRequerimientoDetalle[];
}

export interface DTO_RegistrarEntrega {
  id_requerimiento: number;
  id_empleado_recibe?: number | null;
  id_contratista_recibe?: number | null;
  fecha_entrega: string;
  observacion?: string;
  evidencias?: File[];
  detalles: DTO_RegistrarEntregaDetalle[];
}

export interface DTO_RegistrarEntregaDetalle {
  id_requerimiento_almacen_detalle: number;
  /** Nulo cuando es un activo fijo */
  id_lote_producto?: number | null;
  /** Poblado solo para activos fijos */
  id_activo_fijo?: number | null;
  cantidad_base: number;
  cantidad_lote: number;
  cantidad_requerimiento: number;
  para_mantenimiento?: boolean;
  para_produccion?: boolean;
  id_activo_fijo_destino?: number | null;
  id_lote_mineral?: number | null;
}

export interface DTO_CrearSolicitudLogistica {
  id_requerimiento: number;
  observacion?: string;
  premura: string;
  es_auditable: boolean;
  fecha_entrega_requerida: string;
  detalles: {
    id_requerimiento_almacen_detalle: number;
    id_producto: number;
    id_unidad_medida: number;
    cantidad_solicitada: number;
    contenido_por_presentacion: number;
    cantidad_solicitada_base: number;
    comentario?: string;
  }[];
}
