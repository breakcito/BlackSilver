import type { MetodoPago } from "../../../shared/enums/_generic/metodo-pago";
import type { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import type { Moneda } from "../../../shared/enums/_generic/moneda";
import type { Periodo } from "../../../shared/enums/_generic/periodo";
import type { TipoDespachoCompra } from "../../../shared/enums/_generic/tipo-despacho-compra";
import type {
  Estado_OrdenCompra,
  Estado_OrdenCompraDetalle,
} from "../../../shared/enums/orden-compra/orden-compra";

export interface RES_OrdenCompra {
  id_orden_compra: number;
  correlativo: string;
  //
  id_cotizacion: number;
  correlativo_cotizacion: string;
  //
  id_empresa: number;
  empresa: string;
  empresa_ruc: string;
  empresa_logo: string | null;
  color_predominante_empresa: string | null;
  //
  id_proveedor: number;
  proveedor: string;
  documento_proveedor: string;
  //
  observacion: string | null;
  fecha_hora_orden: string;
  //
  metodo_pago: MetodoPago;
  fecha_vencimiento_pago: string | null;
  moneda: Moneda;
  tipo_cambio_aplicado: number;
  es_auditable: boolean;
  //
  costo_flete: number;
  otros_gastos: number;
  //
  total_antes_igv: number;
  incluye_igv: boolean;
  porcentaje_igv: number;
  monto_igv: number;
  total_despues_igv: number;
  //
  id_empleado_registro: number;
  empleado_registro: string | null;
  cargo_empleado_registro: string | null;
  //
  created_at: string;
  estado: Estado_OrdenCompra;
  // para saber tiene un comrpobante registrado
  tiene_comprobante: boolean | number;
  // Detalles insertados por la api
  detalles?: RES_OrdenCompraDetalle[];
}

export interface RES_OrdenCompraDetalle {
  id_orden_compra_detalle: number;
  id_orden_compra: number;
  id_cotizacion_detalle: number;
  //
  id_almacen_recepcionista: number;
  almacen_recepcionista: string;
  para_un_almacen_principal: boolean;
  id_mina_destino: number | null;
  mina_destino: string | null;
  //
  tipo_despacho: TipoDespachoCompra;
  lugar_recojo: string | null;
  //
  tiempo_entrega: number;
  tiempo_entrega_periodo: Periodo;
  tiempo_entrega_dias: number;
  //
  id_producto: number;
  producto: string;
  es_auditable: boolean;
  es_perecible: boolean;
  tipo_bien: TipoBien;
  //
  id_unidad_medida_oc: number;
  unidad_medida_oc: string;
  unidad_medida_oc_abv: string;
  //
  id_unidad_medida_base: number;
  unidad_medida_base: string;
  unidad_medida_base_abv: string;
  //
  cantidad_requerida: number;
  contenido_por_presentacion: number;
  cantidad_requerida_base: number;
  cantidad_recepcionada_base: number;
  //
  precio_unitario: number;
  precio_unitario_base: number;
  //
  comentario: string | null;
  estado: Estado_OrdenCompraDetalle;
}
