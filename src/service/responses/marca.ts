export interface RES_Marca {
  id_marca: number;
  nombre: string;
  /**
   * La marca pertenece al catálogo de vehículos (camiones, tolvas, etc).
   * Las marcas de vehículos se listan antes que el resto.
   */
  de_vehiculos: boolean | number;
}
