import type { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";
import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";

export interface RES_TurnoLaboral {
  id: number;
  tipo_turno: TipoTurno | string;
  hora_ingreso: string;
  hora_salida: string;
  minutos_tolerancia: number | null;
  total_horas: number | null;
  estado: EstadoBase | string;
}