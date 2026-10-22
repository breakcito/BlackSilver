import type { IArchivo } from "../../../shared/interfaces/archivo";
import type { TipoCalidadCarbon } from "../../../shared/enums/carbon/tipo-calidad-carbon";
import type { EstadoCargaVentaCarbon } from "../../../shared/enums/venta-carbon/estado-carga-venta-carbon";
import type { EstadoVentaCarbon } from "../../../shared/enums/venta-carbon/estado-venta-carbon";

export interface AnalisisGranulometria {
  mayor_a_uno: number | null;
  menor_a_uno: number | null;
  un_medio: number | null;
}

export interface CargaVentaCarbonItem {
  id_carga_venta_carbon: number;
  id_venta_carbon: number;
  id_empleado_registro: number;
  empleado_registro: string;

  /** Datos del despacho. */
  id_tipo_carbon_estimado: number;
  tipo_carbon_estimado: string | null;
  tipo_carbon_estimado_codigo: string | null;
  id_vehiculo_carbon: number | null;
  vehiculo_placa: string | null;
  vehiculo_tipo: string | null;
  vehiculo_marca: string | null;
  calidad: TipoCalidadCarbon | null;
  cantidad_estimada: number;
  segunda_placa: string | null;
  fecha_hora_salida: string | null;

  /** Datos de la llegada. */
  id_tipo_carbon_confirmado: number | null;
  tipo_carbon_confirmado: string | null;
  tipo_carbon_confirmado_codigo: string | null;
  cantidad_confirmada: number;
  fecha_hora_ingreso: string | null;
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
  subtotal_sin_descuento: number;
  descuento: number;
  bono: number;
  subtotal: number;

  evidencias: IArchivo[];
  estado: EstadoCargaVentaCarbon;
  created_at: string;
}

export interface VentaCarbonResumen {
  id_venta_carbon: number;
  correlativo: string;
  numero_correlativo: number;
  /** Código de la venta: lo entrega el cliente con su documento de compra. */
  codigo: string | null;

  id_empresa: number;
  empresa: string;
  empresa_ruc: string | null;

  id_cliente: number;
  cliente: string | null;
  cliente_ruc: string | null;

  id_cliente_destino: number;
  cliente_destino: string | null;
  cliente_destino_ruc: string | null;

  id_almacen_empresa_salida: number;
  almacen_empresa_salida: string | null;

  id_almacen_cliente_llegada: number;
  almacen_cliente_llegada: string | null;

  id_empleado_registro: number;
  empleado_registro: string | null;
  created_at: string;

  cantidad_cargas: number;
  cantidad_cargas_confirmadas: number;
  total_toneladas_estimadas: number;
  total_toneladas_confirmadas: number;
  total_subtotal: number;

  estado: EstadoVentaCarbon;
  cargas: CargaVentaCarbonItem[];
}
