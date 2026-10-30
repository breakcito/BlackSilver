import type { AnalisisGranulometria } from "./venta-carbon.responses";
import type { TipoCalidadCarbon } from "../../../shared/enums/carbon/tipo-calidad-carbon";

export interface CargaVentaFormItem {
  id_tipo_carbon: number;
  id_vehiculo_carbon: number;
  tipo_vehiculo: string;
  calidad: TipoCalidadCarbon;
  cantidad_toneladas: number;
  segunda_placa: string | null;
  fecha_hora_salida: string;
  archivos: File[];
}

export interface CrearVentaCarbonRequest {
  id_empresa: number;
  id_cliente: number;
  id_cliente_destino: number;
  id_almacen_empresa_salida: number;
  id_almacen_cliente_llegada: number;
  cargas: CargaVentaFormItem[];
}

export interface ConfirmarLlegadaPayload {
  id_tipo_carbon: number;
  cantidad_toneladas: number;
  fecha_hora_ingreso: string;
  guia_remitente: string | null;
  guia_transportista: string | null;
  codigo_ticket_balanza: string | null;
  codigo_reporte: string | null;
  observacion: string | null;
  porcentaje_ceniza: number;
  porcentaje_humedad: number;
  porcentaje_azufre: number;
  porcentaje_pizarra: number;
  analisis_granulometria: AnalisisGranulometria | null;
  precio_base: number;
  descuento: number;
  bono: number;
  codigo_venta: string | null;
  archivos: File[];
}
