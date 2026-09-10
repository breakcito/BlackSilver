import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import { Moneda } from "../../../shared/enums/_generic/moneda";
import { z } from "zod";

/**
 * Esquema de registro de proveedor.
 * - RUC opcional; si llega debe tener 11 digitos y el prefijo segun tipo_entidad.
 * - DNI opcional, pero si llega debe tener 8 digitos.
 * - La geografia del proveedor se elimino: ahora vive en lugares_extraccion
 *   (modulo carbon) y se persiste por separado.
 * - codigo_reinfo y contratos son exclusivos de proveedores de carbon: el
 *   backend los acepta en el payload pero los descarta si para_carbon=false.
 *   La mayuscula de REINFO se enforza en la UI y en el backend; el Zod
 *   solo valida la longitud maxima.
 */
export const Schema_CrearProveedor = z
  .object({
    tipo_entidad: z.enum(TipoEntidad),
    para_mantenimiento: z.boolean(),
    para_transporte: z.boolean(),
    para_carbon: z.boolean().optional().default(false),
    dni: z.string().optional().nullable(),
    ruc: z.string().nullable().optional(),
    razon_social: z.string().min(3, "La razón social o nombre es muy corto"),
    direccion: z.string().optional().nullable(),
    telefono: z.string().optional().nullable(),
    correo: z.email("Correo no válido").optional().or(z.literal("")),
    codigo_reinfo: z.string().max(64).nullable().optional(),
    contratos: z
      .array(
        z.object({
          url: z.string().min(1),
          path_relativo: z.string().min(1),
          nombre_original: z.string().nullable().optional(),
          extension: z.string().nullable().optional(),
        }),
      )
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    // RUC: si llega (no vacio), debe tener 11 digitos + prefijo segun tipo de
    // entidad. Si esta vacio/null, no se valida (campo opcional).
    const ruc = data.ruc ?? "";
    if (ruc.length > 0) {
      if (!/^\d{11}$/.test(ruc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RUC debe tener exactamente 11 dígitos",
          path: ["ruc"],
        });
      } else if (data.tipo_entidad === TipoEntidad.Juridica && !ruc.startsWith("20")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RUC de una persona jurídica debe comenzar con 20",
          path: ["ruc"],
        });
      } else if (data.tipo_entidad === TipoEntidad.Natural && !ruc.startsWith("10")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RUC de una persona natural debe comenzar con 10",
          path: ["ruc"],
        });
      }
    }

    // DNI: si llega, debe tener 8 digitos.
    if (data.dni && !/^\d{8}$/.test(data.dni)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El DNI debe tener exactamente 8 dígitos",
        path: ["dni"],
      });
    }
  });

export type CrearProveedorRequest = z.infer<typeof Schema_CrearProveedor>;

/**
 * Edición de proveedor. Mismas reglas que el registro pero SIN `para_carbon`:
 * ese flag define en qué pestaña vive el proveedor y no se edita (el backend
 * lo preserva). `para_mantenimiento` / `para_transporte` sí viajan siempre:
 * en el formulario de carbón no se muestran, pero el hook reenvía los valores
 * actuales para no borrarlos.
 */
export const Schema_ActualizarProveedor = z
  .object({
    tipo_entidad: z.enum(TipoEntidad),
    para_mantenimiento: z.boolean(),
    para_transporte: z.boolean(),
    dni: z.string().optional().nullable(),
    ruc: z.string().nullable().optional(),
    razon_social: z.string().min(3, "La razón social o nombre es muy corto"),
    direccion: z.string().optional().nullable(),
    telefono: z.string().optional().nullable(),
    correo: z.email("Correo no válido").optional().or(z.literal("")),
    codigo_reinfo: z.string().max(64).nullable().optional(),
    contratos: z
      .array(
        z.object({
          url: z.string().min(1),
          path_relativo: z.string().min(1),
          nombre_original: z.string().nullable().optional(),
          extension: z.string().nullable().optional(),
        }),
      )
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    const ruc = data.ruc ?? "";
    if (ruc.length > 0) {
      if (!/^\d{11}$/.test(ruc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RUC debe tener exactamente 11 dígitos",
          path: ["ruc"],
        });
      } else if (
        data.tipo_entidad === TipoEntidad.Juridica &&
        !ruc.startsWith("20")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RUC de una persona jurídica debe comenzar con 20",
          path: ["ruc"],
        });
      } else if (
        data.tipo_entidad === TipoEntidad.Natural &&
        !ruc.startsWith("10")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RUC de una persona natural debe comenzar con 10",
          path: ["ruc"],
        });
      }
    }

    if (data.dni && !/^\d{8}$/.test(data.dni)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El DNI debe tener exactamente 8 dígitos",
        path: ["dni"],
      });
    }
  });

export type ActualizarProveedorRequest = z.infer<
  typeof Schema_ActualizarProveedor
>;

export const Schema_CrearBanco = z.object({
  nombre: z.string().min(1, "El nombre del banco es requerido"),
  abreviatura: z.string().min(1, "La abreviatura es requerida"),
});
export type CrearBancoRequest = z.infer<typeof Schema_CrearBanco>;

export const Schema_CrearCuentaBancaria = z.object({
  id_proveedor: z.number().min(1, "Seleccione un proveedor"),
  id_banco: z.number().min(1, "Seleccione un banco válido"),
  moneda: z.string().min(1, "Seleccione una moneda"),
  numero_cuenta: z.string().min(1, "El número de cuenta es requerido"),
  cci: z.string().optional().nullable(),
  es_para_detraccion: z.number(),
});
export type CrearCuentaBancariaRequest = z.infer<
  typeof Schema_CrearCuentaBancaria
>;

export const Schema_EditarCuentaBancaria = z.object({
  id_banco: z.number().min(1, "Seleccione un banco válido"),
  moneda: z.nativeEnum(Moneda),
  numero_cuenta: z.string().min(1, "El número de cuenta es requerido"),
  cci: z.string().optional().nullable(),
  es_para_detraccion: z.boolean(),
});
export type EditarCuentaBancariaRequest = z.infer<
  typeof Schema_EditarCuentaBancaria
>;

/**
 * Personal del proveedor (solo modulo carbon).
 * El backend marca es_Personal=1 automaticamente cuando se le pasa
 * un id_proveedor al crear personal_externo desde este flujo.
 */
export const Schema_CrearPersonal = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().optional().nullable(),
  dni: z
    .string()
    .regex(/^\d{8}$/, "El DNI debe tener 8 dígitos")
    .optional()
    .or(z.literal("")),
});
export type CrearPersonalRequest = z.infer<typeof Schema_CrearPersonal>;

/**
 * Set de tipos de carbon asociados al proveedor (modulo carbon).
 * Reemplaza TODAS las asociaciones existentes.
 */
export const Schema_SetTiposCarbonProveedor = z.object({
  tipos_carbon: z.array(z.number().int().positive()),
});
export type SetTiposCarbonProveedorRequest = z.infer<
  typeof Schema_SetTiposCarbonProveedor
>;

/**
 * Set de lugares de extraccion asociados al proveedor (modulo carbon).
 * El proveedor se asocia a uno o mas IDs del catalogo
 * `lugar_extraccion_carbon`. La creacion/edicion del catalogo vive en
 * `POST /api/lugar-extraccion-carbon`.
 * Reemplaza TODOS los lugares existentes.
 */
export const Schema_SetLugaresExtraccionProveedor = z.object({
  lugares: z.array(z.number().int().positive()).default([]),
});
export type SetLugaresExtraccionProveedorRequest = z.infer<
  typeof Schema_SetLugaresExtraccionProveedor
>;
