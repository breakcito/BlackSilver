import { z } from "zod";

export interface DTO_CrearMantenimiento {
  id_activo_fijo: number;
  id_mina?: number | null;
  id_almacen?: number | null;
  id_empleado_supervisor?: number | null;
  id_proveedor?: number | null;
  id_personal_externo?: number | null;
  id_empleado_ejecutor?: number | null;
  fecha_hora_mantenimiento: string;
  observacion?: string | null;
  lugar_trabajo?: string | null;
  serie_factura?: string | null;
  numero_factura?: string | null;
  costo_mano_obra?: number | null;
  otros_gastos?: Array<{ concepto: string; costo: number }> | null;
  productos_consumidos?: Array<{
    id_entrega_detalle: number;
    cantidad: number;
    comentario?: string | null;
  }> | null;
  consumos_confirmados?: number[] | null;
  evidencias?: File[] | null;
}

/**
 * Payload que se valida antes de armar el DTO. `tipo_ejecutor` existe solo
 * para que el schema pueda decidir que reglas aplican; no viaja a la API
 * (la API infiere el tipo por que campo viene poblado).
 */
export interface Schema_CrearMantenimientoInput {
  id_activo_fijo: number | null;
  tipo_ejecutor: "interno" | "externo";
  id_mina: number | null;
  id_almacen: number | null;
  lugar_trabajo: string | null;
  id_empleado_ejecutor: number | null;
  id_proveedor: number | null;
  id_personal_externo: number | null;
  fecha_hora_mantenimiento: string;
  observacion: string | null;
  serie_factura: string | null;
  numero_factura: string | null;
  costo_mano_obra: number | null;
  otros_gastos: Array<{ concepto: string; costo: number }>;
  productos_consumidos: Array<{
    id_entrega_detalle: number;
    cantidad: number;
    comentario: string | null;
  }>;
}

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Debe tener como máximo ${max} caracteres`)
    .nullable()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t ? t : null;
    });

export const Schema_CrearMantenimiento = z
  .object({
    id_activo_fijo: z.number().int().positive("Seleccione un activo fijo"),
    tipo_ejecutor: z.enum(["interno", "externo"]),
    id_mina: z.number().int().positive().nullable().optional(),
    id_almacen: z.number().int().positive().nullable().optional(),
    lugar_trabajo: textoOpcional(150),
    id_empleado_ejecutor: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),
    id_proveedor: z.number().int().positive().nullable().optional(),
    id_personal_externo: z.number().int().positive().nullable().optional(),
    fecha_hora_mantenimiento: z.string().min(1, "Indique la fecha y hora"),
    observacion: textoOpcional(1000),
    // La factura es SIEMPRE opcional: no se exige ni con ejecutor interno
    // ni con ejecutor externo. Solo se acotan los caracteres admitidos.
    serie_factura: textoOpcional(20),
    numero_factura: textoOpcional(20),
    costo_mano_obra: z
      .number()
      .nonnegative("El costo no puede ser negativo")
      .nullable()
      .optional(),
    otros_gastos: z
      .array(
        z.object({
          concepto: z.string().trim().min(1, "Ingrese el concepto del gasto"),
          costo: z.number().positive("El costo debe ser mayor a 0"),
        }),
      )
      .nullable()
      .optional(),
    productos_consumidos: z
      .array(
        z.object({
          id_entrega_detalle: z.number().int().positive(),
          cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
          comentario: textoOpcional(200),
        }),
      )
      .nullable()
      .optional(),
    consumos_confirmados: z
      .array(z.number().int().positive())
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    // --- Lugar de trabajo: exactamente uno de los tres ---
    const lugares = [
      data.id_almacen ? "almacen" : null,
      data.id_mina ? "mina" : null,
      data.lugar_trabajo ? "otro" : null,
    ].filter(Boolean);

    if (lugares.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["lugar_trabajo"],
        message: "Seleccione el lugar donde se realizó el mantenimiento",
      });
    }

    // --- Ejecutor: las reglas dependen del tipo ---
    if (data.tipo_ejecutor === "interno" && !data.id_empleado_ejecutor) {
      ctx.addIssue({
        code: "custom",
        path: ["id_empleado_ejecutor"],
        message: "Seleccione el empleado que ejecuta el mantenimiento",
      });
    }

    if (data.tipo_ejecutor === "externo") {
      if (!data.id_proveedor) {
        ctx.addIssue({
          code: "custom",
          path: ["id_proveedor"],
          message: "Seleccione el proveedor que ejecuta el mantenimiento",
        });
      }
      if (!data.id_personal_externo) {
        ctx.addIssue({
          code: "custom",
          path: ["id_personal_externo"],
          message: "Seleccione el personal del proveedor",
        });
      }
    }
  });

/**
 * Colapsa los issues de Zod en un `path -> mensaje` (solo el primero por campo)
 * para poder pintarlos inline en los inputs.
 */
export function issuesToFieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errores[key]) errores[key] = issue.message;
  }
  return errores;
}
