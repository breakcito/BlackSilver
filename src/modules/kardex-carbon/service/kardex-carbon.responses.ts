export interface MovimientoKardexCarbonItem {
  id_kardex_carbon: number;
  id_almacen: number;
  almacen_nombre: string;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo?: string;
  id_carga_compra_carbon?: number | null;
  codigo_ticket_balanza?: string | null;
  placa?: string | null;
  guia_remitente?: string | null;
  id_compra_carbon?: number | null;
  compra_correlativo?: string | null;
  proveedor_razon_social?: string | null;
  fecha_hora_movimiento: string;
  tipo_movimiento: "Ingreso" | "Salida" | string;
  stock_anterior: number;
  cantidad_movimiento: number;
  stock_resultante: number;
  costo_total: number;
  created_at?: string;
}
