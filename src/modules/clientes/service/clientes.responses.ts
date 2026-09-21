import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { Moneda } from "../../../shared/enums/_generic/moneda";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";

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