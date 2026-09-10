import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { Moneda } from "../../../shared/enums/_generic/moneda";
import type { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";
import type { IArchivo } from "../../../shared/interfaces/archivo";

export interface ProveedorResponse {
  id_proveedor: number;
  tipo_entidad: TipoEntidad;
  para_mantenimiento: boolean;
  para_transporte: boolean;
  para_carbon: boolean;
  dni: string | null;
  ruc: string | null;
  razon_social: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  /**
   * Codigo REINFO. Solo aplica a proveedores de carbon; en logistica el
   * backend siempre lo devuelve null.
   */
  codigo_reinfo: string | null;
  /**
   * Archivos del contrato. Solo aplica a proveedores de carbon; el backend
   * lo expone como `[]` en logistica.
   */
  contratos: IArchivo[];
  estado: EstadoBase;
  cambios_log?: RES_CambiosLog[] | string | null;
  cantidad_cuentas_bancarias: number;
  cuentas_bancarias?: CuentaBancariaResponse[];
  cantidad_tipos_carbon: number;
  tipos_carbon?: TipoCarbonProveedorResponse[];
  cantidad_lugares_extraccion: number;
  lugares_extraccion?: LugarExtraccionResponse[];
}

export interface CuentaBancariaResponse {
  id_cuenta_bancaria: number;
  banco_abv: string;
  banco: string;
  id_banco: number;
  moneda: Moneda;
  numero_cuenta: string;
  cci: string | null;
  es_para_detraccion: boolean;
  estado: EstadoBase;
}

export interface TipoCarbonProveedorResponse {
  id_tipo_carbon: number;
  nombre: string;
  codigo: string | null;
  para_compra: boolean;
}

export interface LugarExtraccionResponse {
  id_lugar_extraccion: number;
  id_departamento: number | null;
  departamento_nombre: string | null;
  id_provincia: number | null;
  provincia_nombre: string | null;
  id_distrito: number | null;
  distrito_nombre: string | null;
  direccion: string;
}