export interface MovimientoKardexCarbonItem {
  id_kardex_carbon: number;
  id_almacen: number;
  almacen_nombre: string;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo?: string;

  /** Carga de COMPRA que origina el movimiento (Ingreso). */
  id_carga_compra_carbon?: number | null;
  codigo_ticket_balanza?: string | null;
  placa?: string | null;
  guia_remitente?: string | null;
  id_compra_carbon?: number | null;
  compra_correlativo?: string | null;
  proveedor_razon_social?: string | null;

  /** Carga de VENTA que origina el movimiento (Salida). */
  id_carga_venta_carbon?: number | null;
  id_venta_carbon?: number | null;
  venta_correlativo?: string | null;
  cliente_razon_social?: string | null;
  /** Codigo de la orden de compra que da el cliente (va en la liquidacion). */
  venta_codigo_orden_compra?: string | null;
  venta_numero_reporte?: string | null;
  venta_codigo_ticket_balanza?: string | null;
  venta_placa?: string | null;

  fecha_hora_movimiento: string;
  tipo_movimiento: "Ingreso" | "Salida" | string;
  stock_anterior: number;
  cantidad_movimiento: number;
  stock_resultante: number;
  costo_total: number;
  /** Costo efectivo: el total de la carga que origina el movimiento. */
  costo_total_efectivo?: number;
  created_at?: string;
}
