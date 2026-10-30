import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { Moneda } from "../../../shared/enums/_generic/moneda";
import type { EstadoAnticipo } from "../../../shared/enums/anticipo-cliente/estado-anticipo";
import type { MedioPago } from "../../../shared/enums/anticipo-cliente/medio-pago";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";

export interface AlmacenCarbonClienteResponse {
  id_almacen: number;
  id_cliente: number;
  id_departamento: number | null;
  departamento_nombre: string | null;
  id_provincia: number | null;
  provincia_nombre: string | null;
  id_distrito: number | null;
  distrito_nombre: string | null;
  direccion: string;
  estado: EstadoBase;
}

export interface ClienteResponse {
  id_cliente: number;
  tipo_entidad: string | null;
  dni: string | null;
  ruc: string | null;
  razon_social: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  estado: EstadoBase;
  /**
   * `true` si el cliente vive en el flujo de compra de carbón (define
   * en qué pestaña/agrupación se lista). `false` para clientes de
   * logística. Backend lo persiste como tinyint (0/1); normalizamos
   * a boolean en frontend.
   */
  para_carbon: boolean;
  created_at: string;
  cambios_log: RES_CambiosLog[] | null;
  cantidad_cuentas_bancarias: number;
  cuentas_bancarias?: CuentaBancariaResponse[];
  cantidad_almacenes_carbon: number;
  almacenes_carbon?: AlmacenCarbonClienteResponse[];
  /**
   * Anticipos recibidos NO anulados (modulo carbon). Alimentan el badge
   * de la columna "Anticipos". El backend excluye los anulados con
   * `IFNULL(esta_anulado, 0) = 0`.
   */
  cantidad_anticipos: number;
  /** Suma de `saldo_actual` de los anticipos no anulados. */
  suma_saldo_anticipos: number;
}

export interface CuentaBancariaResponse {
  id_cuenta_bancaria: number;
  id_banco: number;
  banco: string;
  banco_abv: string;
  moneda: Moneda;
  numero_cuenta: string;
  cci: string | null;
  es_para_detraccion: boolean | number;
  estado: EstadoBase;
}

/**
 * Anticipo RECIBIDO de un cliente de carbon.
 *
 * A diferencia del anticipo a proveedor, aqui la plata ENTRA a la
 * empresa: solo existe la cuenta bancaria de la EMPRESA (donde se recibio
 * el dinero), no hay cuenta destino del cliente ni cambista.
 *
 * `saldo_inicial` y `saldo_actual` pueden divergir en el tiempo
 * (consumos futuros); al registrar el form los guarda iguales.
 */
export interface AnticipoClienteResponse {
  id_anticipo: number;
  id_empresa: number;
  empresa_nombre: string | null;
  id_cliente: number;
  cliente_nombre: string | null;
  id_empleado_registro: number;
  empleado_registro_nombre: string | null;
  empleado_registro_apellido: string | null;
  id_empleado_anulacion: number | null;
  empleado_anulacion_nombre: string | null;
  empleado_anulacion_apellido: string | null;
  /** Cuenta de la EMPRESA donde se recibio el dinero. */
  id_cuenta_bancaria_empresa: number | null;
  cuenta_bancaria_numero: string | null;
  cuenta_bancaria_moneda: Moneda | null;
  /** Banco de la cuenta de la empresa (nombre completo y abreviatura). */
  cuenta_bancaria_banco: string | null;
  cuenta_bancaria_banco_abv: string | null;
  medio_pago: MedioPago | null;
  fecha_hora_pago: string | null;
  numero_operacion: string | null;
  /** Comprobante / factura que respalda el anticipo (texto libre). */
  codigo_comprobante: string | null;
  observacion: string | null;
  saldo_inicial: number;
  saldo_actual: number;
  evidencias: IArchivo[] | null;
  esta_anulado: boolean | number;
  fecha_hora_anulacion: string | null;
  created_at: string;
  estado: EstadoAnticipo | string | null;
}