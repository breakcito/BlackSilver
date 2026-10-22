/**
 * Tipos de vehículo que despachan carbón.
 *
 * Espejo 1:1 de `App\Shared\Enums\VentaCarbon\TipoVehiculoCarbon`.
 */
export enum TipoVehiculoCarbon {
  Tolva = "Tolva",
  Burrita = "Burrita",
}

/**
 * Las tolvas tienen dos placas: el remolque lleva la segunda.
 * Espejo de `TipoVehiculoCarbon::exige_segunda_placa()`.
 */
export const exigeSegundaPlaca = (
  tipo: TipoVehiculoCarbon | string | null | undefined,
): boolean => tipo === TipoVehiculoCarbon.Tolva;
