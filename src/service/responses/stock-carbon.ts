export interface RES_StockCarbon {
  id_stock_carbon: number;
  id_almacen: number;
  almacen_nombre: string;
  id_tipo_carbon: number;
  tipo_carbon_nombre: string;
  tipo_carbon_codigo: string | null;
  /** Calidad del carbón: "Baja" | "Intermedia" | "Alta". */
  calidad: string | null;
  stock_actual: number;
}
