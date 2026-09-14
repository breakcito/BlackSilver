import type { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import type { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";

export interface RES_ProgramacionHorario {
  id: number;
  id_empleado: number;
  empleado?: string;
  empleado_url_foto?: string | null;
  id_contrato_trabajo: number;
  /**
   * Snapshots del contrato al momento del INSERT.
   * NO se actualizan cuando el contrato cambia.
   * Si difieren de `contrato_*_actual`, la programación está desfasada.
   */
  programacion_tipo_contrato?: string | null;
  programacion_sueldo_base?: string | number | null;
  programacion_sueldo_real?: string | number | null;
  programacion_sueldo_diario?: string | number | null;
  /**
   * Valores ACTUALES del contrato (referenciados via JOIN).
   * Sirven para detectar inconsistencias con los snapshots.
   */
  contrato_tipo_contrato?: string | null;
  contrato_sueldo_base?: string | number | null;
  contrato_sueldo_real?: string | number | null;
  contrato_sueldo_diario?: string | number | null;
  contrato_fecha_inicio?: string | null;
  contrato_fecha_fin?: string | null;
  contrato_indefinido?: boolean;
  contrato_id_almacen?: number | null;
  contrato_id_labor?: number | null;
  contrato_id_oficina?: number | null;
  contrato_id_cargo?: number | null;
  /**
   * @deprecated Mantenido por compatibilidad. Usar `programacion_tipo_contrato`.
   */
  tipo_contrato?: string;
  id_turno_laboral: number;
  tipo_turno?: TipoTurno | string;
  hora_ingreso?: string;
  hora_salida?: string;
  minutos_tolerancia?: number | null;
  id_oficina: number | null;
  id_almacen: number | null;
  id_labor: number | null;
  almacen_nombre?: string | null;
  labor_nombre?: string | null;
  oficina_nombre?: string | null;
  fecha_inicio: string;
  por_tiempo_indefinido: boolean;
  fecha_fin: string | null;
  dias_laborables: string;
  estado: EstadoBase | string;
}

/**
 * Detecta el tipo de lugar de la programación (almacén, labor u oficina).
 * Una programación activa solo puede tener UNO de los tres asignado.
 */
type TipoLugar = "almacen" | "labor" | "oficina";

const detectarTipoLugarProgramacion = (p: RES_ProgramacionHorario): TipoLugar | null => {
  if (p.id_almacen) return "almacen";
  if (p.id_labor) return "labor";
  if (p.id_oficina) return "oficina";
  return null;
};

const detectarTipoLugarContrato = (p: RES_ProgramacionHorario): TipoLugar | null => {
  if (p.contrato_id_almacen) return "almacen";
  if (p.contrato_id_labor) return "labor";
  if (p.contrato_id_oficina) return "oficina";
  return null;
};

/**
 * true si el lugar de la programación no coincide con el especificado en su contrato.
 *
 * Detecta DOS tipos de inconsistencia:
 *  1. Tipo cruzado: la programación tiene almacén pero el contrato tiene labor
 *     (o cualquier combinación almacén/labor/oficina que no coincida).
 *  2. Mismo tipo pero IDs diferentes: ambos son almacén pero con id_almacen distinto.
 *
 * Se usa para mostrar el badge "(Lugar distinto)" en la celda correspondiente
 * dentro de la grilla.
 */
export const lugarDiferenteContrato = (p: RES_ProgramacionHorario): boolean => {
  const progTipo = detectarTipoLugarProgramacion(p);
  const ctoTipo = detectarTipoLugarContrato(p);

  // Si los tipos difieren, hay inconsistencia directa.
  if (progTipo !== ctoTipo) return true;

  // Si ninguno tiene lugar definido, no hay inconsistencia.
  if (progTipo === null) return false;

  // Mismo tipo: comparar IDs.
  if (progTipo === "almacen" && p.contrato_id_almacen &&
      Number(p.id_almacen) !== Number(p.contrato_id_almacen)) return true;
  if (progTipo === "labor" && p.contrato_id_labor &&
      Number(p.id_labor) !== Number(p.contrato_id_labor)) return true;
  if (progTipo === "oficina" && p.contrato_id_oficina &&
      Number(p.id_oficina) !== Number(p.contrato_id_oficina)) return true;

  return false;
};

export interface RES_ProgramacionAsignada {
  programaciones: RES_ProgramacionHorario[];
  rechazados: Array<{
    id_empleado: number;
    motivo: string;
  }>;
  total_creados: number;
  total_rechazados: number;
}

export interface RES_EmpleadoElegible {
  id_empleado: number;
  nombre_completo: string;
  dni?: string;
  url_foto?: string;
  con_contrato: boolean;
  id_contrato_vigente: number | null;
  id_cargo: number | null;
  contrato_estado?: string | null;
  tipo_contrato_vigente?: string | null;
  contrato_indefinido?: boolean;
  contrato_fecha_fin?: string | null;
  puede_cubrir: boolean;
  matchea_lugar?: boolean;
}