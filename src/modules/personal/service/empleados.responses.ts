import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { Genero } from "../../../shared/enums/_generic/genero";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";

export interface RES_EmpleadoResumen {
  id_empleado: number;
  id_cargo: number | null;
  cargo: string | null;
  id_area: number | null;
  area: string | null;
  id_contrato_vigente: number | null;
  id_empresa: number | null;
  empresa: string | null;
  empresa_url_logo: string | null;
  color_predominante_empresa: string | null;
  qr_token: string;
  nombre: string;
  apellido: string;
  genero: Genero | string | null;
  dni: string | null;
  ruc: string | null;
  carnet_extranjeria: string | null;
  pasaporte: string | null;
  fecha_nacimiento: string | null;
  con_contrato: boolean;
  contrato_fecha_fin?: string | null;
  contrato_por_tiempo_indefinido?: boolean | null;
  tipo_contrato_vigente?: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  url_foto: string | null;
  cambios_log: RES_CambiosLog[] | null;
  estado: EstadoBase;
  cantidad_cuentas_bancarias?: number;
}

export interface RES_CuentaBancariaEmpleado {
  id_cuenta_bancaria: number;
  id_banco?: number;
  banco: string;
  banco_abv: string;
  tipo_cuenta_bancaria?: string | null;
  moneda: string;
  numero_cuenta: string;
  cci: string | null;
  estado: EstadoBase | string;
}

export interface RES_ContratistaResumen {
  id_contratista: number;
  id_mina: number;
  mina: string;
  qr_token: string;
  nombre: string;
  apellido: string;
  genero: Genero | string | null;
  dni: string | null;
  ruc: string | null;
  carnet_extranjeria: string | null;
  pasaporte: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  url_foto: string | null;
  cambios_log: RES_CambiosLog[] | null;
  con_contrato?: boolean | number | string | null;
  id_contrato_vigente?: number | null;
  contrato_fecha_fin?: string | null;
  contrato_por_tiempo_indefinido?: boolean | null;
  tipo_contrato_vigente?: string | null;
  estado: EstadoBase;
  labores_asignadas: RES_LaborContratista[];
  ids_labor_asignadas?: string | null;
}

export interface RES_LaborContratista {
  id_labor_contratista: number;
  id_labor: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: EstadoBase;
}
