import type { EstadoLoteMineral } from "../../../shared/enums/lote-mineral";

export interface LoteMineralResumen {
  id_lote_mineral: number;
  codigo: string | null;
  fecha_inicio_produccion: string | null;
  descripcion: string | null;
  estado: EstadoLoteMineral;
  created_at: string;
  id_contratista: number;
  contratista: string;
  id_mina: number;
  mina: string;
  id_labor: number | null;
  labor: string | null;
  labor_prefijo: string | null;
  id_empleado_registro: number;
  empleado_registro: string;
  // Cantidad de sacos del lote.
  cantidad_sacos: number | null;
}
