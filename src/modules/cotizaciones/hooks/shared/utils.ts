import type {
  DTO_CotizacionRequest,
  DTO_CotizacionDetalle,
} from "../../service/cotizaciones.requests";
import { Periodo } from "../../../../shared/enums/_generic/periodo";
import { TipoDespachoCompra } from "../../../../shared/enums/_generic/tipo-despacho-compra";
import { Estado_Cotizacion_Detalle } from "../../../../shared/enums/cotizacion/cotizacion";
import type { RES_Proveedor } from "../../../../service/responses/proveedor";
import type { RES_UnidadMedida } from "../../../../service/responses/unidad-medida";
import type { RES_Producto } from "../../../../service/responses/producto";
import type { RES_Empresa } from "../../../../service/responses/empresa";
import type { RES_Almacen } from "../../../../service/responses/almacen";
import type { RES_Mina } from "../../../../service/responses/mina";

/**
 * Producto mínimo para calcular el factor de conversión: solo necesita el id
 * de la unidad base. Sirve tanto para `RES_Producto` (registro/edición) como
 * para los objetos "maestros" que se inyectan a las celdas.
 */
export interface ProductoConUnidadBase {
  id_unidad_medida_base: number;
}

/**
 * Resuelve el factor de conversión entre la unidad base de un producto y la
 * unidad de detalle seleccionada por el usuario en una cotización.
 *
 * Devuelve:
 * - `1` si la unidad del detalle es la misma que la base del producto.
 * - El factor "1 detalle = X base" si la API tiene registrada la conversión
 *   universal (ej. 1 Metro = 100 Centímetros, factor = 100).
 * - `null` si las unidades difieren y NO hay conversión registrada: en ese
 *   caso el usuario debe tipear el factor manualmente.
 *
 * Modelo de la API (ver `ConversionUnidadMedida`): la conversión se modela
 * como "1 destino (B) = factor origens (A)". En la respuesta que devuelve
 * `AuxService.get_unidades_medida({ incluir_conversiones: true })`, la unidad
 * consultada aparece como `id_unidad_origen` y la relacionada como
 * `id_unidad_destino`. El formulario necesita "1 detalle = X base", por lo
 * que hay que invertir el factor cuando la unidad del detalle es el origen y
 * la base es el destino (1/factor origens => "1 origen = 1/factor destinos").
 */
export function calcularFactorConversion(
  producto: ProductoConUnidadBase | null | undefined,
  idUnidadMedida: number,
  unidadesMaestras: RES_UnidadMedida[],
): number | null {
  if (!producto || !idUnidadMedida) return null;

  // Misma unidad: factor implícito = 1. No requiere lookup.
  if (producto.id_unidad_medida_base === idUnidadMedida) return 1;

  const unidadDetalle = unidadesMaestras.find(
    (u) => u.id_unidad_medida === idUnidadMedida,
  );
  if (!unidadDetalle?.conversiones) return null;

  const conv = unidadDetalle.conversiones.find(
    (c) => c.id_unidad_destino === producto.id_unidad_medida_base,
  );
  if (!conv) return null;

  const factorOrigenesPorDestino = Number(conv.factor_conversion);
  if (!factorOrigenesPorDestino || factorOrigenesPorDestino <= 0) return null;

  // "1 destino = factor origens"  =>  "1 origen = 1/factor destinos".
  return 1 / factorOrigenesPorDestino;
}

export interface MaestrosState {
  proveedores: RES_Proveedor[];
  unidades: RES_UnidadMedida[];
  catalogo: RES_Producto[];
  empresas: RES_Empresa[];
  almacenes: RES_Almacen[];
  minas: RES_Mina[];
}

export interface LoadingMaestrosState {
  proveedores: boolean;
  unidades: boolean;
  catalogo: boolean;
  empresas: boolean;
  almacenes: boolean;
  minas: boolean;
}

/** Días equivalentes por período de tiempo de entrega */
export const DIAS_POR_PERIODO: Record<Periodo, number> = {
  [Periodo.Diario]: 1,
  [Periodo.Semanal]: 7,
  [Periodo.Mensual]: 30,
  [Periodo.Anual]: 365,
  [Periodo.Ninguno]: 0,
};

/** Detalle inicial vacío para un nuevo producto en la tabla */
export const detalleVacio = (
  id_producto: number,
  id_unidad_medida: number,
): DTO_CotizacionDetalle => ({
  id_producto,
  id_unidad_medida,
  id_almacen_recepcionista: 0,
  id_mina_destino: null,
  tipo_despacho: TipoDespachoCompra.Envio,
  lugar_recojo: null,
  tiempo_entrega: 1,
  tiempo_entrega_periodo: Periodo.Semanal,
  tiempo_entrega_dias: 7,
  cantidad: 1,
  contenido_por_presentacion: 1,
  cantidad_base: 1,
  precio_unitario: null,
  precio_unitario_base: null,
  no_cotiza: false,
  comentario: null,
  estado: Estado_Cotizacion_Detalle.Pendiente,
});

/**
 * Recalcula los totales de una cotización dado el subtotal de los detalles activos.
 */
export function recalcularTotales(
  cot: DTO_CotizacionRequest,
  detalles?: DTO_CotizacionDetalle[],
): Pick<
  DTO_CotizacionRequest,
  "total_antes_igv" | "monto_igv" | "total_despues_igv"
> {
  const items = detalles ?? cot.detalles;
  const subtotal = items.reduce((acc, d) => {
    if (d.no_cotiza) return acc;
    return acc + d.cantidad * (d.precio_unitario || 0);
  }, 0);

  const base = subtotal + (cot.costo_flete ?? 0) + (cot.otros_gastos ?? 0);
  const factor = 1 + cot.porcentaje_igv / 100;

  if (cot.incluye_igv) {
    const total_antes = base / factor;
    const monto_igv = base - total_antes;
    return { total_antes_igv: total_antes, monto_igv, total_despues_igv: base };
  } else {
    const monto_igv = base * (cot.porcentaje_igv / 100);
    const total_despues_igv = base + monto_igv;
    return { total_antes_igv: base, monto_igv, total_despues_igv };
  }
}
