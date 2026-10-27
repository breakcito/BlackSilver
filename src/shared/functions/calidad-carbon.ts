import type { RES_CalidadCarbon } from "../../modules/tipo-carbon/service/tipo-carbon.responses";
import { TipoCalidadCarbon } from "../enums/carbon/tipo-calidad-carbon";

/**
 * Resuelve la calidad del carbón a partir del % de ceniza de la carga.
 *
 * replica la regla de la API: si el valor cae en el borde compartido entre
 * dos rangos (ej. 15% es fin de "Baja" e inicio de "Intermedia") gana la
 * calidad con el rango de inicio mas alto. Si no hay coincidencia exacta se
 * usa la calidad de mayor inicio (la que representa "Alta").
 */
export const resolverCalidadCarbon = (
  porcentajeCeniza: number | string | null | undefined,
  calidades: RES_CalidadCarbon[],
): RES_CalidadCarbon | null => {
  if (!calidades || calidades.length === 0) return null;

  const ceniza = Number(porcentajeCeniza);
  if (!Number.isFinite(ceniza)) return null;

  const candidatas = calidades
    .filter(
      (c) =>
        ceniza >= Number(c.porcentaje_inicio_ceniza) &&
        ceniza <= Number(c.porcentaje_fin_ceniza),
    )
    .sort(
      (a, b) =>
        Number(b.porcentaje_inicio_ceniza) - Number(a.porcentaje_inicio_ceniza),
    );

  if (candidatas.length > 0) return candidatas[0];

  return [...calidades].sort(
    (a, b) =>
      Number(b.porcentaje_inicio_ceniza) - Number(a.porcentaje_inicio_ceniza),
  )[0];
};

/**
 * Color semantico de la calidad (ceniza baja = mejor carbon).
 */
export const colorCalidadCarbon = (nombreCalidad: string | null | undefined) => {
  switch (nombreCalidad) {
    case TipoCalidadCarbon.Baja:
      return "teal";
    case TipoCalidadCarbon.Intermedia:
      return "yellow";
    case TipoCalidadCarbon.Alta:
      return "orange";
    case TipoCalidadCarbon.Calidad:
      return "red";
    default:
      return "gray";
  }
};
