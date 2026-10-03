import type { EstadoBase } from "../../shared/enums/_generic/estado-base";
import type { Moneda } from "../../shared/enums/_generic/moneda";

/**
 * Cuenta bancaria de un transportista (catálogo del módulo Compra de Carbón).
 *
 * El `es_para_detraccion` marca la cuenta del Banco de la Nación que designa
 * SUNAT para recibir el monto retenido. Solo aplica si el banco es nacional
 * y la cuenta está en soles (regla que valida el backend al crear/editar).
 */
export interface RES_CuentaTransportista {
  id_cuenta_bancaria: number;
  id_transportista: number;
  id_banco: number;
  banco: string;
  banco_abv: string;
  es_nacional: boolean | number;
  moneda: Moneda;
  numero_cuenta: string;
  cci: string | null;
  es_para_detraccion: boolean | number;
  estado: EstadoBase;
}
