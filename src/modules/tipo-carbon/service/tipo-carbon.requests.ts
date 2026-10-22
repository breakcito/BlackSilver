import { z } from "zod";

export const Schema_CrearTipoCarbon = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(128),
  codigo: z.string().max(32).optional().nullable(),
  para_compra: z.boolean().default(false),
});
export type CrearTipoCarbonRequest = z.infer<typeof Schema_CrearTipoCarbon>;

export const Schema_ActualizarTipoCarbon = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(128),
  codigo: z.string().max(32).optional().nullable(),
  para_compra: z.boolean().default(false),
});
export type ActualizarTipoCarbonRequest = z.infer<
  typeof Schema_ActualizarTipoCarbon
>;

export const Schema_VarianteTipoCarbon = z.object({
  id_tipo_variante: z.number().int().positive(),
  porcentaje_extraccion: z
    .number()
    .min(0, "El porcentaje no puede ser negativo")
    .max(100, "El porcentaje no puede superar el 100%"),
});
export type VarianteTipoCarbonInput = z.infer<typeof Schema_VarianteTipoCarbon>;

export const Schema_SetVariantes = z.object({
  variantes: z.array(Schema_VarianteTipoCarbon).default([]),
});
export type SetVariantesRequest = z.infer<typeof Schema_SetVariantes>;
