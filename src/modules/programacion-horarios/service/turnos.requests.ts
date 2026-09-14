import { z } from "zod";
import { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const numberTransform = (val: unknown) => {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

export const Schema_CrearTurno = z.object({
  tipo_turno: z.enum([TipoTurno.Dia, TipoTurno.Noche]),
  hora_ingreso: z
    .string()
    .regex(timeRegex, "Formato HH:mm (24h)"),
  hora_salida: z
    .string()
    .regex(timeRegex, "Formato HH:mm (24h)"),
  minutos_tolerancia: z
    .number()
    .int()
    .min(0)
    .max(1440)
    .nullable()
    .optional()
    .transform(numberTransform),
  total_horas: z
    .number()
    .min(0)
    .max(48),
  estado: z.enum(["Activo", "Inactivo"]).optional().default("Activo"),
});

export type DTO_CrearTurno = z.infer<typeof Schema_CrearTurno>;

export const Schema_ActualizarTurno = z.object({
  tipo_turno: z.enum([TipoTurno.Dia, TipoTurno.Noche]).optional(),
  hora_ingreso: z
    .string()
    .regex(timeRegex, "Formato HH:mm (24h)")
    .optional(),
  hora_salida: z
    .string()
    .regex(timeRegex, "Formato HH:mm (24h)")
    .optional(),
  minutos_tolerancia: z
    .number()
    .int()
    .min(0)
    .max(1440)
    .nullable()
    .optional()
    .transform(numberTransform),
  total_horas: z.number().min(0).max(48).optional(),
});

export type DTO_ActualizarTurno = z.infer<typeof Schema_ActualizarTurno>;

export const Schema_CambiarEstadoTurno = z.object({
  estado: z.enum(["Activo", "Inactivo"]),
});

export type DTO_CambiarEstadoTurno = z.infer<typeof Schema_CambiarEstadoTurno>;