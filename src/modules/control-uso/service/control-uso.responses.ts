export interface RES_ControlUsoLog {
  id_log: number;
  id_activo_fijo: number;
  codigo: string | null;
  correlativo: string;
  producto: string;
  es_auditable?: boolean | number;
  categoria: string;
  control_por_horometro: number;
  control_por_odometro: number;
  ubicacion_activo: string | null;
  fecha_hora_inicio_control: string;
  fecha_hora_fin_control: string | null;
  horometro_inicio: string | number | null;
  horometro_fin: string | number | null;
  odometro_inicio: string | number | null;
  odometro_fin: string | number | null;
  cantidad_vueltas: string | number | null;
  cantidad_sacos: string | number | null;
  total_horas: string | number | null;
  total_km: string | number | null;
  precio_unitario: string | number | null;
  costo_total: string | number | null;
  es_para_mina: boolean | number | null;
  id_mina: number | null;
  mina: string | null;
  id_labor: number | null;
  labor: string | null;
  id_lote_mineral?: number | null;
  lote_mineral?: string | null;
  id_cliente: number | null;
  cliente: string | null;
  tipo_carga: string | null;
  id_tarifa: number | null;
  tarifa_desc: string | null;
  tarifa_distancia_metros: string | number | null;
  tarifa_material: string | null;
  observacion: string | null;
  tipo_material: string | null;
  tipo_turno: string | null;
  uuid_grupo: string | null;
  created_at: string;
}

export interface RES_UltimoHorometro {
  ultimo_horometro: number;
}

export interface RES_UltimoOdometro {
  ultimo_odometro: number;
}

export interface RES_Tarifa {
  id: number;
  id_activo_fijo: number;
  tipo_control: string;
  precio_unitario: string | number;
  descripcion: string;
  id_tipo_material: number | null;
  tipo_material: string | null;
  distancia_metros: number | null;
  created_at: string;
}

export interface RES_TipoMaterial {
  id: number;
  nombre: string;
  created_at: string;
}

export interface RES_MantenimientoReporte {
  id: number;
  id_activo_fijo: number;
  fecha_hora_mantenimiento: string;
  observacion: string | null;
  total_horas: number | null;
  total_kilometros: number | null;
  total_vueltas: number | null;
}

export interface RES_ReporteMensual {
  logs: RES_ControlUsoLog[];
  mantenimientos: RES_MantenimientoReporte[];
  empresa_logo?: string | null;
}
