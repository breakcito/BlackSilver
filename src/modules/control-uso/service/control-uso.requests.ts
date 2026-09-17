export interface REQ_RegistrarUso {
  id_activo_fijo: number;
  fecha_hora_inicio_control: string;
  fecha_hora_fin_control?: string | null;
  horometro_inicio?: number | null;
  horometro_fin?: number | null;
  odometro_inicio?: number | null;
  odometro_fin?: number | null;
  cantidad_vueltas?: number | null;
  cantidad_sacos?: number | null;
  id_tarifa?: number | null;
  precio_unitario?: number | null;
  es_para_mina?: boolean | null;
  id_mina?: number | null;
  id_labor?: number | null;
  id_lote_mineral?: number | null;
  id_cliente?: number | null;
  tipo_carga?: string | null;
  observacion?: string | null;
}

export interface REQ_Consumo {
  id_producto: number;
  id_almacen: number;
  id_lote_producto: number;
  id_unidad_medida: number;
  cantidad_consumo: number;
  contenido_por_presentacion: number;
  /**
   * Activo fijo que esta consumiendo lo entregado. En el flujo de
   * "Registrar Control por Horometro" siempre es la misma maquina
   * sobre la que se esta tomando el control (`asset.id_activo`), asi
   * que el backend puede hacer JOIN con la tabla de activos y devolver
   * el nombre + correlativo + marca + modelo en la respuesta.
   */
  id_activo_fijo_consumidor?: number | null;
  /**
   * Identificador de grupo de uso. Cada bloque de "Registrar Control por
   * Horometro" (un ItemForm) tiene su propio UUID y todos los consumos
   * que el usuario registra dentro de ese bloque comparten ese UUID,
   * para que el modulo de "Listar Consumo" pueda agruparlos por sesion.
   */
  uuid_control_uso_activo?: string | null;
  id_lote_mineral?: number | null;
  id_labor_destino?: number | null;
  para_produccion?: boolean;
  para_mantenimiento?: boolean;
  comentario?: string | null;
  estado?: string; // "Consumo Parcial" | "Consumo Total"
}

export interface REQ_ItemUsoBulk {
  hora_inicio?: string | null;
  hora_fin?: string | null;
  horometro_inicio?: number | null;
  horometro_fin?: number | null;
  tipo_turno?: string | null;
  observacion?: string | null;
  consumos?: REQ_Consumo[];
}

export interface REQ_RegistrarUsoBulk {
  id_activo_fijo: number;
  fecha_trabajo: string;
  id_tarifa?: number | null;
  precio_unitario: number;
  es_para_mina: boolean;
  id_mina?: number | null;
  id_labor?: number | null;
  id_cliente?: number | null;
  id_lote_mineral?: number | null;
  tipo_carga?: string | null;
  items: REQ_ItemUsoBulk[];
}

export interface REQ_ItemUsoBulkVueltas {
  id_tarifa?: number | null;
  precio_unitario: number;
  cantidad_vueltas: number;
  cantidad_sacos?: number | null;
  horometro_inicio?: number | null;
  horometro_fin?: number | null;
  tipo_turno?: string | null;
  observacion?: string | null;
}

export interface REQ_RegistrarUsoBulkVueltas {
  id_activo_fijo: number;
  fecha_trabajo: string;
  id_mina: number;
  id_labor: number;
  id_lote_mineral?: number | null;
  items: REQ_ItemUsoBulkVueltas[];
}

export interface REQ_CrearTarifa {
  id_activo_fijo: number;
  tipo_control: string;
  precio_unitario?: number;
  descripcion: string;
  id_tipo_material?: number | null;
  distancia_metros?: number | null;
}

export interface REQ_CrearMaterial {
  nombre: string;
}
