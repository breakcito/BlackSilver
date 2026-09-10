import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { Moneda } from "../../../shared/enums/_generic/moneda";
import type { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";

export interface RES_LogCostoPromedio {
  costo_promedio_anterior: number;
  costo_promedio_resultante: number;
  created_at: string;
}

export interface RES_ProductoResumen {
  id_producto: number;
  nombre: string;
  prefijo: string | null;
  //
  id_categoria: number;
  categoria: string;
  clasificacion_bien: TipoBien;
  //
  id_unidad_medida_base: number;
  unidad_medida_base: string;
  unidad_medida_base_abreviatura: string;
  //
  es_auditable: boolean;
  es_perecible: boolean;
  para_mantenimiento: boolean;
  //
  stock_minimo_base: number;
  moneda: Moneda;
  costo_promedio_base: number;
  costo_promedio_base_log: RES_LogCostoPromedio[] | null;
  //
  tiempo_espera_vencimiento: number | null;
  periodo_espera_vencimiento: string | null;
  dias_espera_vencimiento: number | null;
  //
  cambios_log: RES_CambiosLog[] | null;
  //
  estado: EstadoBase;
}
