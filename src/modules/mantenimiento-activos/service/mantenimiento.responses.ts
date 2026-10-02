import type { IArchivo } from "../../../shared/interfaces/archivo";

export interface RES_MantenimientoConsumo {
  id_consumo: number;
  id_mantenimiento: number;
  cantidad: number;
  fecha_hora_consumo: string;
  comentario: string | null;
  producto: string;
  unidad: string;
}

export interface RES_Mantenimiento {
  id_mantenimiento: number;
  id_activo_fijo: number;
  correlativo_activo_fijo: string;
  codigo_activo_fijo: string | null;
  producto_activo_fijo: string;
  fecha_hora_mantenimiento: string;
  observacion: string | null;
  lugar_trabajo: string | null;
  serie_factura: string | null;
  numero_factura: string | null;
  costo_mano_obra: number | string | null;
  otros_gastos: Array<{ concepto: string; costo: number }> | string | null;
  total_horas: number | null;
  total_kilometros: number | null;
  total_vueltas: number | null;
  id_proveedor: number | null;
  proveedor_razon_social: string | null;
  id_personal_externo: number | null;
  personal_externo_nombre: string | null;
  id_empleado_ejecutor: number | null;
  ejecutor_nombre: string | null;
  id_empleado_supervisor: number | null;
  supervisor_nombre: string | null;
  evidencias: IArchivo[] | null;
  consumos: RES_MantenimientoConsumo[];
}

/**
 * Registro enriquecido para la grilla del listado. `costo_total` y
 * `costo_otros_gastos` son derivados en el cliente para poder ordenarlos
 * por accessor (mantine-datatable v8 no soporta accessor de calculo).
 */
export type RES_MantenimientoFila = RES_Mantenimiento & {
  costo_otros_gastos: number;
  costo_total: number;
};

export interface RES_ProductoDespachadoPendiente {
  id_entrega_detalle: number;
  id_requerimiento_almacen_detalle: number;
  id_producto: number;
  producto: string;
  cantidad_base: number;
  unidad_base_abv: string;
  consumido_base: number;
  restante_base: number;
}

export interface RES_ConsumoPendiente {
  id_consumo: number;
  id_entrega_detalle: number;
  cantidad_base_consumida: number;
  fecha_hora_consumo: string;
  comentario_consumo: string | null;
  id_producto: number;
  producto: string;
  unidad_base_abv: string;
}

export interface RES_MaterialesMantenimientoResponse {
  entregas_pendientes: RES_ProductoDespachadoPendiente[];
  consumos_pendientes: RES_ConsumoPendiente[];
}
