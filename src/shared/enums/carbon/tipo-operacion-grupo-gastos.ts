/**
 * Tipo de operacion que agrupa un grupo de gastos de produccion.
 *
 * Espejo 1:1 de `App\Shared\Enums\Carbon\TipoOperacionGrupoGastos`.
 *
 * Un grupo es de UN solo tipo: los gastos de zarandear y los de mezclar son
 * operaciones distintas y se registran por separado.
 */
export enum TipoOperacionGrupoGastos {
  Zarandeo = "zarandeo",
  Blending = "blending",
}
