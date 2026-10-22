export interface RES_TipoCarbon {
  id_tipo_carbon: number;
  nombre: string;
  codigo: string | null;
  para_compra: boolean;
  cantidad_variantes?: number;
}

export interface RES_VarianteCarbon {
  id_tipo_variante: number;
  nombre: string;
  codigo: string | null;
  /** % de extracción de referencia: cuánto de este tipo sale del tipo padre al zarandear. */
  porcentaje_extraccion: number;
}

export interface RES_CalidadCarbon {
  id_calidad_carbon: number;
  nombre: string;
  porcentaje_inicio_ceniza: number;
  porcentaje_fin_ceniza: number;
}
