/**
 * Tipos de gasto de producción asociados a un zarandeo de carbón.
 * 'Otro' obliga a describir el concepto en el campo `otro_gasto`.
 */
export enum TipoGastoZarandeo {
  Pala = "Pala",
  Lanza = "Lanza",
  Agua = "Agua",
  Escogedores = "Escogedores",
  Otro = "Otro",
}

/**
 * Pala y Lanza se tarifan por horas trabajadas (hora de inicio / hora de fin).
 */
export const esGastoPorHoras = (gasto: TipoGastoZarandeo | string): boolean =>
  gasto === TipoGastoZarandeo.Pala || gasto === TipoGastoZarandeo.Lanza;
