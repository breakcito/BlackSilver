import type { EstadoActivoFijo } from "../../../shared/enums/activo-fijo";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";

export interface RES_LaborAbastecida {
  id_labor: number;
  nombre: string;
}

export interface RES_ActivoFijoResumen {
  id_activo: number;
  //
  id_producto: number;
  producto: string;
  es_auditable: boolean;
  //
  id_categoria: number;
  categoria: string;
  para_transporte: boolean;
  control_por_odometro: boolean;
  control_por_horometro: boolean;
  control_por_vueltas: boolean;
  //
  id_marca: number | null;
  marca: string | null;
  //
  id_mina: number | null;
  mina: string | null;
  //
  id_labor: number | null;
  labor: string | null;
  //
  id_almacen: number | null;
  almacen: string | null;
  en_almacen_principal: boolean | null;
  //
  codigo: string | null;
  correlativo: string;
  numero_serie: string | null;
  modelo: string | null;
  yearcito_modelo: number | null;
  descripcion: string | null;
  serie_placa: string | null;
  numero_placa: string | null;
  especificaciones: string[] | null;
  evidencias: IArchivo[] | null;
  //
  total_horas: number;
  total_kilometros: number;
  total_vueltas: number;
  //
  proxima_advertencia_horas: number | null;
  proxima_advertencia_kilometros: number | null;
  proxima_advertencia_vueltas: number | null;
  //
  intervalo_mantenimiento_horas: number | null;
  intervalo_mantenimiento_kilometros: number | null;
  intervalo_mantenimiento_vueltas: number | null;
  //
  fecha_hora_ingreso: string;
  created_at: string;
  estado: EstadoActivoFijo;
  cambios_log: RES_CambiosLog[] | null;
  id_empleado_responsable: number | null;
  empleado_responsable: string | null;
  serie_factura_compra: string | null;
  numero_factura_compra: string | null;
  costo_compra: number | null;
  id_orden_compra_recepcion_detalle: number | null;
  id_orden_compra_detalle: number | null;
  costo_promedio_base: number | null;
  id_orden_compra: number | null;
  id_orden_compra_comprobante: number | null;
  //
  labores_abastecidas: RES_LaborAbastecida[] | null;
}
