import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { Moneda } from "../../../shared/enums/_generic/moneda";
import type { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { EstadoAnticipo } from "../../../shared/enums/anticipo-proveedor/estado-anticipo";
import type { MedioPago } from "../../../shared/enums/anticipo-proveedor/medio-pago";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";
import type { IArchivo } from "../../../shared/interfaces/archivo";

// re-export para que los callers de AnticipoProveedorResponse no tengan
// que importar IArchivo por separado si no lo necesitan.
export type { IArchivo } from "../../../shared/interfaces/archivo";

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
  cantidad_almacenes_carbon: number;
  almacenes_carbon?: AlmacenCarbonResponse[];
  /**
   * Anticipos de carbon (modulo carbon). El backend devuelve count + suma
   * en el listado (para el badge de la celda); el array completo solo
   * se hidrata cuando el modal lo pide via GET /anticipos.
   */
  cantidad_anticipos: number;
  suma_saldo_anticipos: number;
  anticipos?: AnticipoProveedorResponse[];
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

export interface AlmacenCarbonResponse {
  id_almacen: number;
  id_proveedor: number;
  id_departamento: number | null;
  departamento_nombre: string | null;
  id_provincia: number | null;
  provincia_nombre: string | null;
  id_distrito: number | null;
  distrito_nombre: string | null;
  direccion: string;
  estado: EstadoBase;
}

/**
 * Anticipo otorgado a un proveedor de carbon.
 * `saldo_inicial` y `saldo_actual` pueden divergir en el tiempo
 * (descuentos futuros); al registrar el form los guarda iguales.
 */
export interface AnticipoProveedorResponse {
  id_anticipo: number;
  id_empresa: number;
  empresa_nombre: string | null;
  id_proveedor: number;
  id_empleado_registro: number;
  empleado_registro_nombre: string | null;
  empleado_registro_apellido: string | null;
  id_empleado_anulacion: number | null;
  empleado_anulacion_nombre: string | null;
  empleado_anulacion_apellido: string | null;
  id_cuenta_bancaria_empresa: number | null;
  cuenta_bancaria_numero: string | null;
  cuenta_bancaria_moneda: Moneda | null;
  medio_pago: MedioPago | null;
  fecha_hora_pago: string | null;
  numero_operacion: string | null;
  saldo_inicial: number;
  saldo_actual: number;
  evidencias: IArchivo[] | null;
  esta_anulado: boolean;
  fecha_hora_anulacion: string | null;
  created_at: string;
  estado: EstadoAnticipo | string | null;
}