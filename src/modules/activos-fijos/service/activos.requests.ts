import type {
  EstadoActivoFijo,
  MovimientoActivoFijo,
} from "../../../shared/enums/activo-fijo";
import type { IArchivo } from "../../../shared/interfaces/archivo";

//
export interface REQ_CrearActivo {
  id_producto: number;
  id_almacen?: number | null;
  id_mina?: number | null;
  id_labor?: number | null;
  ids_labores_abastecidas?: number[] | null;
  id_marca?: number | null;
  codigo?: string | null;
  numero_serie?: string | null;
  modelo?: string | null;
  yearcito_modelo?: number | null;
  descripcion?: string | null;
  serie_placa?: string | null;
  numero_placa?: string | null;
  // Etiquetas / tags libres (estilo hashtags). El usuario las escribe
  // separadas por coma o Enter. null = sin especificaciones.
  especificaciones?: string[] | null;
  fecha_hora_ingreso?: string | null;
  estado?: EstadoActivoFijo;
  id_empleado_responsable?: number | null;
  serie_factura_compra?: string | null;
  numero_factura_compra?: string | null;
  costo_compra?: number | null;
  evidencias?: IArchivo[] | null;
}

export interface REQ_ActualizarUbicacion {
  id_activo: number;
  tipo_movimiento: MovimientoActivoFijo;
  id_almacen?: number | null;
  id_mina?: number | null;
  descripcion?: string | null;
  fecha_hora_movimiento?: string | null;
}

export interface REQ_ActualizarActivo {
  codigo?: string | null;
  numero_serie?: string | null;
  modelo?: string | null;
  yearcito_modelo?: number | null;
  descripcion?: string | null;
  serie_placa?: string | null;
  numero_placa?: string | null;
  id_labor?: number | null;
  // Estado editable. Si el usuario lo envía explícitamente, tiene prioridad
  // sobre el cálculo automático que new_ubicacion haría al mover.
  estado?: EstadoActivoFijo | null;
  // Etiquetas / tags libres (estilo hashtags de YouTube / redes sociales).
  // El usuario las escribe separadas por coma o Enter. null = limpiar todas.
  especificaciones?: string[] | null;
  // Cambio opcional de ubicación. Si cambia respecto al estado actual,
  // el backend registra el movimiento en activo_fijo_ubicacion_log.
  id_almacen?: number | null;
  id_mina?: number | null;
  descripcion_ubicacion?: string | null;
}

/**
 * Ajuste manual de los contadores de uso de un activo.
 * Solo se envían los totales que el usuario efectivamente cambió respecto al
 * valor actual; los omitidos se conservan. `motivo` es opcional; si se
 * envía queda registrado en `activo_fijo.cambios_log`.
 */
export interface REQ_AjustarTotalesActivo {
  total_horas?: number | null;
  total_kilometros?: number | null;
  total_vueltas?: number | null;
  motivo?: string;
}
