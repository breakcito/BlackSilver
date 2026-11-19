/**
 * Espejo 1:1 de `App\Shared\Enums\Balances\AmbitoBalance`.
 *
 * Separa la operacion de MINERAL de la de CARBON: sus ingresos y egresos
 * provienen de cadenas de negocio distintas y no se mezclan en el balance.
 */
export enum BalanceAmbito {
  Mineral = "MINERAL",
  Carbon = "CARBON",
}

/**
 * Espejo 1:1 de `App\Shared\Enums\Balances\TipoBalance`.
 *
 * - Ingreso: entra dinero a la empresa.
 * - Egreso: sale dinero.
 */
export enum BalanceTipo {
  Ingreso = "INGRESO",
  Egreso = "EGRESO",
}

/**
 * Espejo 1:1 de `App\Shared\Enums\_Generic\Moneda`.
 *
 * Los importes en dolares NUNCA se suman con los soles: el balance los
 * muestra por separado.
 */
export enum BalanceMoneda {
  Soles = "Soles",
  Dolares = "Dólares",
}

/**
 * Periodo al que pertenece un movimiento dentro de la respuesta del API.
 */
export enum BalancePeriodo {
  Actual = "ACTUAL",
  Comparativo = "COMPARATIVO",
}

/**
 * Espejo 1:1 de `App\Shared\Enums\Balances\OrigenBalance`.
 *
 * Cada origen identifica una familia de registros economicos. La etiqueta
 * legible NO se replica aqui: la envia el API en `catalogos.origenes` para
 * que el texto viva en un solo lado (el backend).
 */
export enum BalanceOrigen {
  // MINERAL - EGRESOS
  ConsumoMineral = "CONSUMO_MINERAL",
  GastoExtra = "GASTO_EXTRA",
  Mantenimiento = "MANTENIMIENTO",
  GastoDespacho = "GASTO_DESPACHO",
  FleteDespacho = "FLETE_DESPACHO",
  MoliendaDespacho = "MOLIENDA_DESPACHO",
  AnalisisDespacho = "ANALISIS_DESPACHO",
  // MINERAL - INGRESOS
  AlquilerMaquinaria = "ALQUILER_MAQUINARIA",
  VentaMineral = "VENTA_MINERAL",
  // CARBON - EGRESOS
  CompraCarbon = "COMPRA_CARBON",
  FleteCompraCarbon = "FLETE_COMPRA_CARBON",
  GastoProduccionCarbon = "GASTO_PRODUCCION_CARBON",
  // CARBON - INGRESOS
  VentaCarbon = "VENTA_CARBON",
}

/**
 * Criterio con el que se compara el periodo actual contra otro.
 */
export enum ModoComparacion {
  /** Mes calendario anterior (o periodo de igual duracion si el rango es libre). */
  MesAnterior = "MES_ANTERIOR",
  /** Mismo mes del ano anterior. */
  MismoMesAnioAnterior = "MISMO_MES_ANIO_ANTERIOR",
  /** Rango elegido a mano por el usuario. */
  Personalizado = "PERSONALIZADO",
}
