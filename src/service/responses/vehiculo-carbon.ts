export interface RES_VehiculoCarbon {
  id_vehiculo_carbon: number;
  id_marca: number | null;
  marca: string | null;
  /** Tipo de vehículo: "Tolva" | "Burrita". */
  tipo_vehiculo: string;
  placa: string;
}
