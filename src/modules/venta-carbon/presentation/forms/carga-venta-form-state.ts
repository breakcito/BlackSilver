import dayjs from "dayjs";
import type { TipoCalidadCarbon } from "../../../../shared/enums/carbon/tipo-calidad-carbon";

/**
 * Estado de edicion de una carga a despachar.
 *
 * Vive en un archivo aparte (y no dentro del componente) para que el modulo
 * pueda reutilizarla tanto en el registro de la venta como en el despacho
 * de cargas adicionales.
 *
 * Al despachar solo se pide el tipo de carbon, la calidad, las toneladas, la
 * fecha/hora de salida y las evidencias. El vehiculo y la segunda placa se
 * registran al confirmar la llegada.
 */
export interface CargaVentaFormState {
  id_tipo_carbon: number | null;
  calidad: TipoCalidadCarbon | null;
  cantidad_toneladas: number;
  fecha_hora_salida: string;
  archivos: File[];
}

/**
 * Una carga esta completa cuando tiene tipo, calidad, cantidad y fecha de
 * salida. El type-guard permite que el payload que se envia a la API quede
 * tipado sin `!` ni casts.
 */
export const esCargaVentaCompleta = (
  carga: CargaVentaFormState,
): carga is CargaVentaFormState & {
  id_tipo_carbon: number;
  calidad: TipoCalidadCarbon;
} =>
  Boolean(
    carga.id_tipo_carbon &&
      carga.calidad &&
      carga.cantidad_toneladas > 0 &&
      carga.fecha_hora_salida,
  );

export const nuevaCargaVenta = (): CargaVentaFormState => ({
  id_tipo_carbon: null,
  calidad: null,
  cantidad_toneladas: 0,
  fecha_hora_salida: dayjs().format("YYYY-MM-DDTHH:mm"),
  archivos: [],
});
