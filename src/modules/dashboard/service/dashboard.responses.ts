/** Periodo medido y periodo contra el que se compara. */
export interface RES_PeriodoDashboard {
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
}

/** Contador global de alertas abiertas. */
export interface RES_AlertasDashboard {
  total: number;
  por_bloque: {
    stock_critico: number;
    mantenimiento: number;
    compras_pendientes: number;
    cobros_pendientes: number;
    pendientes_atencion: number;
  };
}

/* ── Indicador 1: stock critico por almacen ─────────────────────────── */

export interface RES_ItemStockCritico {
  id_almacen: number;
  almacen: string;
  id_producto: number;
  producto: string;
  categoria: string | null;
  unidad: string | null;
  stock_actual_base: number;
  stock_minimo_base: number;
  faltante_base: number;
  /** Fraccion del minimo cubierta (1 = todo cubierto). */
  cobertura: number;
  /** "Sin stock" | "Crítico". */
  estado: string;
  es_auditable: boolean;
}

export interface RES_ResumenStockCritico {
  total_items: number;
  criticos: number;
  sin_stock: number;
  almacenes: {
    id_almacen: number;
    almacen: string;
    items: number;
    criticos: number;
    sin_stock: number;
  }[];
}

export interface RES_StockCritico {
  items: RES_ItemStockCritico[];
  resumen: RES_ResumenStockCritico;
  error?: string;
}

/* ── Indicador 2: alertas de mantenimiento ──────────────────────────── */

export interface RES_ItemMantenimiento {
  id_activo_fijo: number;
  codigo: string | null;
  correlativo: string | null;
  producto: string;
  estado_activo: string;
  id_almacen: number | null;
  almacen: string | null;
  /** "horas" | "kilometros" | "vueltas". */
  dimension: string;
  total: number;
  umbral: number;
  intervalo: number;
  restantes: number;
  porcentaje_restante: number;
  /** "Vencido" | "Crítico" | "Próximo". */
  nivel: string;
  /** El contador ya paso el intervalo pero el umbral no se reprogramo. */
  umbral_obsoleto: boolean;
}

export interface RES_MantenimientoAlertas {
  items: RES_ItemMantenimiento[];
  resumen: {
    vencidos: number;
    criticos: number;
    proximos: number;
    umbrales_obsoletos: number;
    evaluados: number;
  };
  error?: string;
}

/* ── Indicador 3: balance del periodo ───────────────────────────────── */

export interface RES_BalanceDashboard {
  monedas: {
    moneda: string;
    ingresos: number;
    egresos: number;
    resultado: number;
    comparativo: {
      ingresos: number;
      egresos: number;
      resultado: number;
    };
  }[];
  origenes: {
    origen: string;
    ambito: string;
    tipo: string;
    moneda: string;
    monto: number;
  }[];
  ambitos: {
    ambito: string;
    moneda: string;
    ingresos: number;
    egresos: number;
    resultado: number;
  }[];
  error?: string;
}

/* ── Indicador 4: compras pendientes de recepcion ───────────────────── */

export interface RES_ItemCompra {
  id_detalle: number;
  id_orden_compra: number;
  id_producto: number;
  producto: string;
  es_auditable: boolean;
  cantidad_requerida: number;
  cantidad_requerida_base: number;
  contenido_por_presentacion: number;
  precio_unitario_base: number;
  estado: string;
  id_almacen_recepcionista: number | null;
  almacen: string | null;
  unidad: string | null;
}

export interface RES_OrdenCompraPendiente {
  id_orden_compra: number;
  correlativo: string | null;
  numero_correlativo: string | null;
  proveedor: string | null;
  fecha_hora_orden: string;
  fecha_vencimiento_pago: string | null;
  moneda: string;
  total: number;
  estado: string;
  dias_antiguedad: number;
  items_total: number;
  items_pendientes: number;
  pago_vencido: boolean;
  items: RES_ItemCompra[];
}

export interface RES_ComprasPendientes {
  ocs: RES_OrdenCompraPendiente[];
  items: RES_ItemCompra[];
  resumen: {
    total_ocs: number;
    items_pendientes: number;
    por_moneda: { moneda: string; monto: number; ocs: number }[];
    antiguedad_max_dias: number;
    transferencias_en_transito: number;
    recepciones_con_incidencia: number;
  };
  error?: string;
}

/* ── Indicador 5: cobros pendientes ─────────────────────────────────── */

export interface RES_ComprobantePendiente {
  tipo: string;
  id_comprobante: number;
  codigo: string | null;
  id_cliente: number | null;
  cliente: string | null;
  fecha_emision: string;
  moneda: string;
  ambito: string;
  estado: string;
  monto_total: number;
  monto_neto: number;
  monto_pagado: number;
  saldo: number;
  /** Porcentaje cobrado del neto (0-100). */
  avance_pct: number;
}

export interface RES_AnticipoCliente {
  id_anticipo: number;
  id_cliente: number | null;
  cliente: string | null;
  fecha_hora_pago: string;
  saldo_actual: number;
  estado: string;
}

export interface RES_CobrosPendientes {
  items: RES_ComprobantePendiente[];
  anticipos: RES_AnticipoCliente[];
  resumen: {
    total_comprobantes: number;
    por_moneda: { moneda: string; saldo: number; comprobantes: number }[];
    por_cliente: { cliente: string; saldo: number; comprobantes: number }[];
    saldo_anticipos: number;
  };
  error?: string;
}

/* ── Indicador 8: pendientes de atencion ────────────────────────────── */

export interface RES_PendientesAtencion {
  etapas: { tipo: string; etapa: string; cantidad: number }[];
  vencidos: {
    tipo: string;
    correlativo: string | null;
    producto: string;
    es_auditable: boolean;
    etapa: string;
    cantidad_solicitada_base: number;
    fecha_entrega_requerida: string;
    dias_vencido: number;
    premura: string | null;
    id_almacen: number | null;
    almacen: string | null;
  }[];
  resumen: {
    total: number;
    vencidos: number;
    por_tipo: { tipo: string; cantidad: number }[];
  };
  error?: string;
}

/* ── Indicador 9: costo de mantenimiento ────────────────────────────── */

export interface RES_MantenimientoCosto {
  id_mantenimiento: number;
  id_activo_fijo: number;
  activo_correlativo: string | null;
  activo_producto: string;
  fecha_hora_mantenimiento: string;
  costo_mano_obra: number;
  costo_otros_gastos: number;
  costo_insumos: number;
  costo_total: number;
}

export interface RES_CostoMantenimiento {
  mantenimientos: RES_MantenimientoCosto[];
  por_activo: {
    id_activo_fijo: number;
    activo_correlativo: string | null;
    activo_producto: string;
    cantidad: number;
    costo_total: number;
  }[];
  resumen: {
    cantidad: number;
    costo_mano_obra: number;
    costo_otros_gastos: number;
    costo_insumos: number;
    costo_total: number;
    costo_promedio: number;
  };
  error?: string;
}

/* ── Payload completo ───────────────────────────────────────────────── */

export interface RES_Dashboard {
  periodo: RES_PeriodoDashboard;
  comparativo: RES_PeriodoDashboard;
  filtros: { id_almacen: number | null };
  alertas: RES_AlertasDashboard;
  stock_critico: RES_StockCritico;
  mantenimiento_alertas: RES_MantenimientoAlertas;
  balance: RES_BalanceDashboard;
  compras_pendientes: RES_ComprasPendientes;
  cobros_pendientes: RES_CobrosPendientes;
  pendientes_atencion: RES_PendientesAtencion;
  costo_mantenimiento: RES_CostoMantenimiento;
}
