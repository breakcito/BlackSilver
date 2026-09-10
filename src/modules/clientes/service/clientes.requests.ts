import { z } from "zod";
import { Moneda } from "../../../shared/enums/_generic/moneda";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";

/**
 * Registro de cliente.
 * Patron Proveedores: RUC obligatorio (11 digitos, prefijo 10/20 segun
 * tipo_entidad); DNI opcional (8 digitos si llega). Razon social obligatoria.
 */
export const Schema_CrearCliente = z
  .object({
    tipo_entidad: z.enum(TipoEntidad),
    dni: z
      .string()
      .nullable()
      .refine((val) => !val || /^\d{8}$/.test(val), {
        message: "El DNI debe tener exactamente 8 dígitos",
      }),
    ruc: z.string().min(1, "El RUC es obligatorio"),
    razon_social: z.string().min(2, "La razón social es obligatoria"),
    direccion: z.string().nullable(),
    telefono: z.string().nullable(),
    correo: z
      .string()
      .nullable()
      .refine((val) => !val || z.string().email().safeParse(val).success, {
        message: "Debe ser un correo electrónico válido",
      }),
  })
  .superRefine((data, ctx) => {
    if (!/^\d{11}$/.test(data.ruc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El RUC debe tener exactamente 11 dígitos",
        path: ["ruc"],
      });
    } else if (
      data.tipo_entidad === TipoEntidad.Juridica &&
      !data.ruc.startsWith("20")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El RUC de una persona jurídica debe comenzar con 20",
        path: ["ruc"],
      });
    } else if (
      data.tipo_entidad === TipoEntidad.Natural &&
      !data.ruc.startsWith("10")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El RUC de una persona natural debe comenzar con 10",
        path: ["ruc"],
      });
    }
  });

export type CrearClienteRequest = z.infer<typeof Schema_CrearCliente>;

/**
 * Edicion administrativa de cliente.
 * Mismas reglas que el registro: RUC obligatorio con prefijo segun
 * tipo_entidad; DNI opcional. Solo se exponen los campos modificables.
 *
 * NO incluye:
 *  - estado: lo gestiona eliminar_cliente (soft-delete).
 */
export const Schema_ActualizarCliente = z
  .object({
    tipo_entidad: z.enum(TipoEntidad),
    dni: z
      .string()
      .nullable()
      .refine((val) => !val || /^\d{8}$/.test(val), {
        message: "El DNI debe tener exactamente 8 dígitos",
      }),
    ruc: z.string().min(1, "El RUC es obligatorio"),
    razon_social: z.string().min(2, "La razón social es obligatoria"),
    direccion: z.string().max(255).nullable(),
    telefono: z.string().max(20).nullable(),
    correo: z
      .string()
      .max(100)
      .nullable()
      .refine((val) => !val || z.string().email().safeParse(val).success, {
        message: "Debe ser un correo electrónico válido",
      }),
  })
  .superRefine((data, ctx) => {
    if (!/^\d{11}$/.test(data.ruc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El RUC debe tener exactamente 11 dígitos",
        path: ["ruc"],
      });
    } else if (
      data.tipo_entidad === TipoEntidad.Juridica &&
      !data.ruc.startsWith("20")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El RUC de una persona jurídica debe comenzar con 20",
        path: ["ruc"],
      });
    } else if (
      data.tipo_entidad === TipoEntidad.Natural &&
      !data.ruc.startsWith("10")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El RUC de una persona natural debe comenzar con 10",
        path: ["ruc"],
      });
    }
  });

export type DTO_ActualizarCliente = z.infer<typeof Schema_ActualizarCliente>;

export const Schema_CrearCuentaBancaria = z.object({
  id_cliente: z.number().min(1, "Seleccione un cliente"),
  id_banco: z.number().min(1, "Seleccione un banco válido"),
  moneda: z.string().min(1, "Seleccione una moneda"),
  numero_cuenta: z.string().min(1, "El número de cuenta es requerido"),
  cci: z.string().optional().nullable(),
  es_para_detraccion: z.number(), // 1 o 0
});
export type CrearCuentaBancariaRequest = z.infer<
  typeof Schema_CrearCuentaBancaria
>;

export const Schema_EditarCuentaBancaria = z.object({
  id_banco: z.number().int().positive(),
  moneda: z.nativeEnum(Moneda),
  numero_cuenta: z
    .string()
    .min(1, "El número de cuenta es obligatorio")
    .max(128, "Máximo 128 caracteres")
    .regex(/^\d+$/, "Solo dígitos"),
  cci: z
    .string()
    .max(128, "Máximo 128 caracteres")
    .regex(/^\d+$/, "Solo dígitos")
    .optional()
    .or(z.literal("")),
  es_para_detraccion: z.boolean().default(false),
});
export type EditarCuentaBancariaRequest = z.infer<
  typeof Schema_EditarCuentaBancaria
>;