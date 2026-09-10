import { z } from "zod";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import { TipoProducto } from "../../../shared/enums/_generic/tipo-producto";

export const Schema_RegistroCategoria = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  descripcion: z.string().optional(),
  tipo_producto: z.enum(TipoProducto),
  clasificacion_bien: z.preprocess(
    (val) => (val === "" ? null : val),
    z.enum(TipoBien).nullable().optional(),
  ),
  es_consumible: z.boolean().default(false),
  para_cocina: z.boolean().default(false),
  para_mina: z.boolean().default(false),
  es_auditable: z.boolean().default(false),
  para_transporte: z.boolean().default(false),
  control_por_odometro: z.boolean().default(false),
  control_por_horometro: z.boolean().default(false),
  control_por_vueltas: z.boolean().default(false),
  ids_categorias_consumidoras: z.array(z.number()).default([]),
});

export type DTO_RegistroCategoria = z.infer<typeof Schema_RegistroCategoria>;

/**
 * Edición de categoría. Reutiliza la forma del registro pero exige
 * `clasificacion_bien` (el backend la valida como requerida en el PUT) y
 * omite `ids_categorias_consumidoras`, que no se gestiona desde este flujo.
 */
export const Schema_ActualizarCategoria = Schema_RegistroCategoria.omit({
  ids_categorias_consumidoras: true,
}).extend({
  clasificacion_bien: z.enum(TipoBien, {
    message: "Debe seleccionar una clasificación",
  }),
});

export type DTO_ActualizarCategoria = z.infer<
  typeof Schema_ActualizarCategoria
>;
