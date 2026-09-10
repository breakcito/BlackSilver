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

export interface REQ_ItemUsoBulk {
  hora_inicio: string;
  hora_fin: string;
  horometro_inicio?: number | null;
  horometro_fin?: number | null;
  observacion?: string | null;
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
  cantidad_vueltas: number;
  cantidad_sacos?: number | null;
  horometro_inicio?: number | null;
  horometro_fin?: number | null;
  observacion?: string | null;
}

export interface REQ_RegistrarUsoBulkVueltas {
  id_activo_fijo: number;
  id_tarifa?: number | null;
  precio_unitario: number;
  id_mina: number;
  id_labor: number;
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
