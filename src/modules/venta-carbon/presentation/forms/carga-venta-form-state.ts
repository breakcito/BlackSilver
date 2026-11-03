import dayjs from "dayjs";

/**
 * Estado de edicion de una carga a despachar.
 *
 * Vive en un archivo aparte (y no dentro del componente) para que el modulo
 * pueda reutilizarla tanto en el registro de la venta como en el despacho
 * de cargas adicionales.
 *
 * La carga cuelga de un BLENDING (el lote de carbon que sale del almacen).
 * Al elegirlo se autocompletan el porcentaje de ceniza y las toneladas, pero
 * el usuario puede ajustarlas.
 *
 * El vehiculo y la segunda placa se registran en el despacho: la segunda
 * placa siempre es opcional.
 */
export interface CargaVentaFormState {
  id_blending_carbon: number | null;
  /** % de ceniza heredado del blending (editable). */
  porcentaje_ceniza: number;
  cantidad_toneladas: number;
  fecha_hora_salida: string;
  id_vehiculo_carbon: string | null;
  segunda_placa: string;
  archivos: File[];
}

/**
 * Una carga esta completa cuando tiene blending, cantidad y fecha de
 * salida. El type-guard permite que el payload que se envia a la API quede
 * tipado sin `!` ni casts.
 */
export const esCargaVentaCompleta = (
  carga: CargaVentaFormState,
): carga is CargaVentaFormState & {
  id_blending_carbon: number;
} =>
  Boolean(
    carga.id_blending_carbon &&
      carga.cantidad_toneladas > 0 &&
      carga.fecha_hora_salida,
  );

export const nuevaCargaVenta = (): CargaVentaFormState => ({
  id_blending_carbon: null,
  porcentaje_ceniza: 0,
  cantidad_toneladas: 0,
  fecha_hora_salida: dayjs().format("YYYY-MM-DDTHH:mm"),
  id_vehiculo_carbon: null,
  segunda_placa: "",
  archivos: [],
});
