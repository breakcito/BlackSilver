import { z } from "zod";
import type { EstadoLoteMineral } from "../../../shared/enums/lote-mineral";

export interface RegistrarLoteMineralRequest {
  id_contratista: number;
  id_mina: number;
  id_labor: number;
  descripcion?: string | null;
  fecha_inicio_produccion?: string | null;
  estado_inicial: EstadoLoteMineral;
}

export const Schema_ActualizarCantidadSacos = z.object({
  cantidad_sacos: z
    .number({ error: "Ingresa la cantidad de sacos" })
    .int("La cantidad de sacos debe ser un numero entero")
    .min(0, "La cantidad de sacos no puede ser negativa"),
});

export type DTO_ActualizarCantidadSacos = z.infer<
  typeof Schema_ActualizarCantidadSacos
>;
