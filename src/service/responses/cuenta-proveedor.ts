import type { EstadoBase } from "../../shared/enums/_generic/estado-base";
import type { Moneda } from "../../shared/enums/_generic/moneda";

export interface RES_CuentaProveedor {
  id_proveedor: number;
  //
  id_cuenta_bancaria: number;
  //
  id_banco: number;
  banco: string;
  banco_abv: string;
  //
  moneda: Moneda;
  numero_cuenta: string;
  cci: string | null;
  es_para_detraccion: boolean | number;
  estado: EstadoBase;
}