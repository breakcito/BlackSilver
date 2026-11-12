import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Despacho                                                           */
/* ------------------------------------------------------------------ */

export interface RegistrarDespachoRequest {
  id_lote_mineral: number;
  id_molino: number;
  fecha_despacho: string;
  cantidad_sacos: number;
  observaciones?: string | null;
  /** El flete va en el mismo alta: el mineral se lleva en una sola unidad. */
  flete: {
    id_transportista_mineral: number;
    placa?: string | null;
    licencia_conductor?: string | null;
    guia_remitente?: string | null;
    peso_guia: number;
    largo?: number | null;
    ancho?: number | null;
    alto?: number | null;
  };
  /** Gastos iniciales del despacho (winche, winchadores). */
  gastos?: {
    tipo_gasto: string;
    descripcion?: string | null;
    monto: number;
  }[];
}

export const Schema_Despacho = z.object({
  id_lote_mineral: z.number({ error: "Selecciona el lote a despachar" }).int(),
  id_molino: z.number({ error: "Selecciona el molino de destino" }).int(),
  fecha_despacho: z
    .string({ error: "Indica la fecha del despacho" })
    .min(1, "Indica la fecha del despacho"),
  cantidad_sacos: z
    .number({ error: "Ingresa la cantidad de sacos" })
    .int("La cantidad de sacos debe ser un número entero")
    .positive("La cantidad de sacos debe ser mayor a 0"),
  observaciones: z.string().max(500, "Máximo 500 caracteres").nullish(),
  flete: z.object({
    id_transportista_mineral: z
      .number({ error: "Selecciona el transportista del flete" })
      .int(),
    peso_guia: z
      .number({ error: "Ingresa el peso de la guía" })
      .positive("El peso de la guía debe ser mayor a 0"),
  }),
  gastos: z
    .array(
      z.object({
        tipo_gasto: z.string().min(1, "Elige el tipo de gasto"),
        monto: z.number().min(0, "El monto no puede ser negativo"),
      }),
    )
    .nullish(),
});

export type DTO_Despacho = z.infer<typeof Schema_Despacho>;

/**
 * Cabecera del despacho. En la edicion solo se cambian estos datos: el
 * flete y los gastos se editan en sus propias secciones.
 */
export interface ActualizarDespachoRequest {
  id_lote_mineral: number;
  id_molino: number;
  fecha_despacho: string;
  cantidad_sacos: number;
  observaciones?: string | null;
}

/* ------------------------------------------------------------------ */
/* Gasto                                                              */
/* ------------------------------------------------------------------ */

export interface RegistrarGastoRequest {
  tipo_gasto: string;
  descripcion?: string | null;
  monto: number;
}

export const Schema_Gasto = z.object({
  tipo_gasto: z
    .string({ error: "Selecciona el tipo de gasto" })
    .min(1, "Selecciona el tipo de gasto"),
  descripcion: z.string().max(500, "Máximo 500 caracteres").nullish(),
  monto: z
    .number({ error: "Ingresa el monto" })
    .min(0, "El monto no puede ser negativo"),
});

export type DTO_Gasto = z.infer<typeof Schema_Gasto>;

/* ------------------------------------------------------------------ */
/* Flete                                                              */
/* ------------------------------------------------------------------ */

export interface RegistrarFleteRequest {
  id_transportista_mineral: number;
  placa?: string | null;
  licencia_conductor?: string | null;
  guia_remitente?: string | null;
  peso_guia: number;
  largo?: number | null;
  ancho?: number | null;
  alto?: number | null;
  evidencias?: File[];
}

export const Schema_Flete = z.object({
  id_transportista_mineral: z
    .number({ error: "Selecciona el transportista" })
    .int(),
  placa: z.string().max(50, "Máximo 50 caracteres").nullish(),
  licencia_conductor: z.string().max(50, "Máximo 50 caracteres").nullish(),
  guia_remitente: z.string().max(50, "Máximo 50 caracteres").nullish(),
  peso_guia: z
    .number({ error: "Ingresa el peso de la guía" })
    .positive("El peso de la guía debe ser mayor a 0"),
  largo: z.number().min(0, "No puede ser negativo").nullish(),
  ancho: z.number().min(0, "No puede ser negativo").nullish(),
  alto: z.number().min(0, "No puede ser negativo").nullish(),
});

/**
 * Peso de balanza del flete. Se registra DESPUES: el flete primero se
 * despacha y recien cuando llega al molino y se pesa se conoce el ticket,
 * el bruto, la tara y el neto.
 */
export interface RegistrarBalanzaRequest {
  codigo_ticket_balanza: string;
  /** 2da guia de remision: se digita cuando el vehiculo llega al molino. */
  segunda_guia_remitente?: string | null;
  peso_bruto: number;
  tara: number;
  fecha_hora_pesaje: string;
  evidencias?: File[];
}

export const Schema_Balanza = z.object({
  codigo_ticket_balanza: z
    .string({ error: "Ingresa el código del ticket" })
    .min(1, "Ingresa el código del ticket"),
  segunda_guia_remitente: z.string().max(50, "Máximo 50 caracteres").nullish(),
  peso_bruto: z
    .number({ error: "Ingresa el peso bruto" })
    .positive("El peso bruto debe ser mayor a 0"),
  tara: z
    .number({ error: "Ingresa la tara" })
    .positive("La tara debe ser mayor a 0"),
  fecha_hora_pesaje: z
    .string({ error: "Indica la fecha y hora del pesaje" })
    .min(1, "Indica la fecha y hora del pesaje"),
});

export type DTO_Flete = z.infer<typeof Schema_Flete>;

/* ------------------------------------------------------------------ */
/* Analisis                                                           */
/* ------------------------------------------------------------------ */

export interface RegistrarAnalisisRequest {
  id_laboratorio: number;
  id_cliente?: number | null;
  asumido_por: string;
  codigo_laboratorio?: string | null;
  codigo_cliente?: string | null;
  fecha_analisis?: string | null;
  porcentaje_humedad?: number | null;
  ley_oro?: number | null;
  ley_plata?: number | null;
  ley_cobre?: number | null;
  ley_zinc?: number | null;
  ley_arsenico?: number | null;
  ley_hierro?: number | null;
  ley_plomo?: number | null;
  costo_servicio?: number | null;
  evidencias?: File[];
}

export const Schema_Analisis = z
  .object({
    id_laboratorio: z
      .number({ error: "Selecciona el laboratorio" })
      .int(),
    id_cliente: z.number().int().nullish(),
    asumido_por: z
    .string({ error: "Indica quién asume el análisis" })
    .min(1, "Indica quién asume el análisis"),
    codigo_laboratorio: z.string().max(100, "Máximo 100 caracteres").nullish(),
    codigo_cliente: z.string().max(100, "Máximo 100 caracteres").nullish(),
    fecha_analisis: z.string().nullish(),
    porcentaje_humedad: z
      .number()
      .min(0, "Entre 0 y 100")
      .max(100, "Entre 0 y 100")
      .nullish(),
    ley_oro: z.number().min(0, "No puede ser negativo").nullish(),
    ley_plata: z.number().min(0, "No puede ser negativo").nullish(),
    ley_cobre: z.number().min(0, "No puede ser negativo").nullish(),
    ley_zinc: z.number().min(0, "No puede ser negativo").nullish(),
    ley_arsenico: z.number().min(0, "No puede ser negativo").nullish(),
    ley_hierro: z.number().min(0, "No puede ser negativo").nullish(),
    ley_plomo: z.number().min(0, "No puede ser negativo").nullish(),
    costo_servicio: z.number().min(0, "No puede ser negativo").nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.asumido_por === "Cliente") {
      if (!data.codigo_cliente || data.codigo_cliente.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["codigo_cliente"],
          message: "Ingresa el código del cliente del análisis",
        });
      }
      if (!data.id_cliente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["id_cliente"],
          message: "Selecciona el cliente que asume el análisis",
        });
      }
    }
  });

export type DTO_Analisis = z.infer<typeof Schema_Analisis>;

/* ------------------------------------------------------------------ */
/* Liquidacion                                                        */
/* ------------------------------------------------------------------ */

export interface RegistrarLiquidacionRequest {
  id_cliente: number;
  codigo_liquidacion: string;
  elemento_quimico: string;
  fecha_liquidacion: string;
  peso_humedo: number;
  tara?: number | null;
  porcentaje_humedad?: number | null;
  merma?: number | null;
  ley_elemento?: number | null;
  porcentaje_recuperacion?: number | null;
  /** Total de deducciones de la liquidacion. */
  total_deducciones?: number | null;
  valor_por_tonelada: number;
  porcentaje_igv?: number | null;
  porcentaje_detraccion?: number | null;
  observaciones?: string | null;
}

export const Schema_Liquidacion = z.object({
  id_cliente: z.number({ error: "Selecciona el cliente" }).int(),
  codigo_liquidacion: z
    .string({ error: "Ingresa el código de la liquidación" })
    .min(1, "Ingresa el código de la liquidación"),
  elemento_quimico: z
    .string({ error: "Selecciona el elemento químico" })
    .min(1, "Selecciona el elemento químico"),
  fecha_liquidacion: z
    .string({ error: "Indica la fecha de la liquidación" })
    .min(1, "Indica la fecha de la liquidación"),
  peso_humedo: z
    .number({ error: "Ingresa el peso húmedo" })
    .positive("El peso húmedo debe ser mayor a 0"),
  tara: z.number().min(0, "No puede ser negativo").nullish(),
  porcentaje_humedad: z
    .number()
    .min(0, "Entre 0 y 100")
    .max(100, "Entre 0 y 100")
    .nullish(),
  merma: z.number().min(0, "No puede ser negativo").nullish(),
  ley_elemento: z.number().min(0, "No puede ser negativo").nullish(),
  porcentaje_recuperacion: z
    .number()
    .min(0, "Entre 0 y 100")
    .max(100, "Entre 0 y 100")
    .nullish(),
  total_deducciones: z.number().min(0, "No puede ser negativo").nullish(),
  valor_por_tonelada: z
    .number({ error: "Ingresa el valor por tonelada" })
    .positive("El valor por tonelada debe ser mayor a 0"),
  porcentaje_igv: z
    .number()
    .min(0, "Entre 0 y 100")
    .max(100, "Entre 0 y 100")
    .nullish(),
  porcentaje_detraccion: z
    .number()
    .min(0, "Entre 0 y 100")
    .max(100, "Entre 0 y 100")
    .nullish(),
  observaciones: z.string().max(500, "Máximo 500 caracteres").nullish(),
});

export type DTO_Liquidacion = z.infer<typeof Schema_Liquidacion>;

/* ------------------------------------------------------------------ */
/* Comprobante                                                        */
/* ------------------------------------------------------------------ */

export type TipoComprobanteDespacho =
  | "flete"
  | "molienda"
  | "analisis"
  | "liquidacion";

export interface RegistrarComprobanteRequest {
  codigo_comprobante: string;
  fecha_emision: string;
  con_detraccion: boolean;
  porcentaje_detraccion: number;
  porcentaje_igv: number;
  // Flete
  id_fletes?: number[];
  id_transportista_mineral?: number;
  toneladas_cobradas?: number;
  precio_por_tonelada?: number;
  /** Moneda del comprobante (solo el de flete). */
  moneda?: string;
  /** Tipo de cambio a soles: 1 cuando la moneda es Soles. */
  tipo_cambio?: number;
  // Molienda
  monto?: number;
  // Analisis
  id_analisis?: number[];
  // Liquidacion
  id_liquidacion_mineral?: number;
  evidencias?: File[];
}

/* ------------------------------------------------------------------ */
/* Pago                                                               */
/* ------------------------------------------------------------------ */

export interface RegistrarPagoRequest {
  medio_pago: string;
  numero_operacion?: string | null;
  fecha_hora_pago: string;
  es_para_detraccion: boolean;
  monto_pagado: number;
  id_cuenta_bancaria_empresa?: number | null;
  observacion?: string | null;
  evidencias?: File[];
}

export const Schema_Pago = z.object({
  medio_pago: z
    .string({ error: "Selecciona el medio de pago" })
    .min(1, "Selecciona el medio de pago"),
  numero_operacion: z.string().max(100, "Máximo 100 caracteres").nullish(),
  fecha_hora_pago: z
    .string({ error: "Indica la fecha y hora del pago" })
    .min(1, "Indica la fecha y hora del pago"),
  monto_pagado: z
    .number({ error: "Ingresa el monto pagado" })
    .positive("El monto debe ser mayor a 0"),
});

export type DTO_Pago = z.infer<typeof Schema_Pago>;
