import dayjs from "dayjs";
import type { TipoVehiculoCarbon } from "../../../../shared/enums/venta-carbon/tipo-vehiculo-carbon";
import type { TipoCalidadCarbon } from "../../../../shared/enums/carbon/tipo-calidad-carbon";

/**
 * Estado de_edicion de una carga a despachar.
 *
 * Vive en un archivo aparte (y no dentro del componente) para que el modulo
 * pueda reutilizarla tanto en el registro de la venta como en el despacho
 * de cargas adicionales.
 */
export interface CargaVentaFormState {
  id_tipo_carbon: number | null;
  id_vehiculo_carbon: number | null;
  tipo_vehiculo: TipoVehiculoCarbon | null;
  calidad: TipoCalidadCarbon | null;
  cantidad_toneladas: number;
  segunda_placa: string;
  fecha_hora_salida: string;
  archivos: File[];
}

/**
 * Una carga totalmente vacia no cuenta: el usuario puede registrar la venta
 * sin despachar cargas, y la fila en blanco que aparece por defecto no debe
 * forzar a completarla.
 */
export const esCargaVentaVacia = (carga: CargaVentaFormState): boolean =>
  !carga.id_tipo_carbon &&
  !carga.id_vehiculo_carbon &&
  !carga.calidad &&
  !carga.cantidad_toneladas &&
  !carga.segunda_placa.trim() &&
  carga.archivos.length === 0;

/**
 * Una carga esta completa cuando tiene tipo, vehiculo, calidad, cantidad y
 * fecha de salida. El type-guard permite que el payload que se envia a la API
 * quede tipado sin `!` ni casts.
 */
export const esCargaVentaCompleta = (
  carga: CargaVentaFormState,
): carga is CargaVentaFormState & {
  id_tipo_carbon: number;
  id_vehiculo_carbon: number;
  tipo_vehiculo: TipoVehiculoCarbon;
  calidad: TipoCalidadCarbon;
} =>
  Boolean(
    carga.id_tipo_carbon &&
      carga.id_vehiculo_carbon &&
      carga.tipo_vehiculo &&
      carga.calidad &&
      carga.cantidad_toneladas > 0 &&
      carga.fecha_hora_salida,
  );

export const nuevaCargaVenta = (): CargaVentaFormState => ({
  id_tipo_carbon: null,
  id_vehiculo_carbon: null,
  tipo_vehiculo: null,
  calidad: null,
  cantidad_toneladas: 0,
  segunda_placa: "",
  fecha_hora_salida: dayjs().format("YYYY-MM-DDTHH:mm"),
  archivos: [],
});
