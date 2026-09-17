/**
 * Estados posibles para `control_uso_activo.estado`.
 *
 * El backend define el enum (o equivalente) en BD con valores
 * 'Activo' y 'Anulado'. Aqui replicamos los valores exactos para
 * tener autocompletado en TypeScript y evitar typos.
 *
 * - Activo: registro vigente, cuenta para calculos, aparece en listados
 *   principales y en el Excel.
 * - Anulado: soft-delete. El backend se encarga de reingresar stock y
 *   eliminar fisicamente los consumos asociados. El registro ya no
 *   cuenta para nada pero se conserva para auditoria.
 */
export enum Estado_ControlUso {
  Activo = "Activo",
  Anulado = "Anulado",
}
