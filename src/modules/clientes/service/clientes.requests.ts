import { z } from "zod";
import { Moneda } from "../../../shared/enums/_generic/moneda";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import { MedioPago } from "../../../shared/enums/anticipo-cliente/medio-pago";

/**
 * Registro de cliente.
 * Patron Proveedores (mismo criterio): RUC opcional (11 digitos, prefijo
 * 10/20 segun tipo_entidad); DNI opcional (8 digitos si llega).
 * El frontend mapea 8 digitos -> campo dni, 11 digitos -> campo ruc.
 * Razon social obligatoria.
 *
 * `para_carbon` opcional: true para clientes del flujo de compra de
 * carbón, false (default) para clientes de logística.
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
    ruc: z
      .string()
      .nullable()
      .refine((val) => !val || /^\d{11}$/.test(val), {
        message: "El RUC debe tener exactamente 11 dígitos",
      }),
    razon_social: z.string().min(2, "La razón social es obligatoria"),
    direccion: z.string().nullable(),
    telefono: z.string().nullable(),
    correo: z
      .string()
      .nullable()
      .refine((val) => !val || z.string().email().safeParse(val).success, {
        message: "Debe ser un correo electrónico válido",
      }),
    para_carbon: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    // Validacion de prefijo de RUC segun tipo de entidad. Solo se aplica si
    // llega ruc: cuando es null, el documento viene por dni (8 digitos).
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
  });

export type CrearClienteRequest = z.infer<typeof Schema_CrearCliente>;

/**
 * Edicion administrativa de cliente.
 * Mismas reglas que el registro: RUC opcional (11 digitos con prefijo
 * segun tipo_entidad si llega); DNI opcional. Solo se exponen los campos
 * modificables.
 *
 * NO incluye:
 *  - estado: lo gestiona eliminar_cliente (soft-delete).
 *  - para_carbon: define la pestaña donde vive el cliente (logística vs
 *    carbón) y se congela al crear — mismo patrón que proveedores.
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
    ruc: z
      .string()
      .nullable()
      .refine((val) => !val || /^\d{11}$/.test(val), {
        message: "El RUC debe tener exactamente 11 dígitos",
      }),
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

/**
 * Almacen de carbon de un cliente (modulo carbon).
 *
 * Misma forma que `Schema_AlmacenCarbon` (proveedores): direccion
 * obligatoria (VARCHAR(256)), los ids de ubigeo son opcionales. La
 * duplicacion es intencional: mantiene la autodocumentacion del modulo
 * y permite divergir en el futuro sin tocar el modulo gemelo.
 */
export const Schema_AlmacenCarbonCliente = z.object({
  id_departamento: z.number().int().positive().nullable().optional(),
  id_provincia: z.number().int().positive().nullable().optional(),
  id_distrito: z.number().int().positive().nullable().optional(),
  direccion: z
    .string()
    .min(1, "La dirección es obligatoria")
    .max(256, "La dirección no puede superar 256 caracteres"),
});
export type CrearAlmacenCarbonClienteRequest = z.infer<
  typeof Schema_AlmacenCarbonCliente
>;
export type ActualizarAlmacenCarbonClienteRequest = z.infer<
  typeof Schema_AlmacenCarbonCliente
>;

/**
 * Registro de un anticipo RECIBIDO de un cliente de carbon.
 *
 * A diferencia del anticipo a proveedor, la plata ENTRA a la empresa:
 * solo existe la cuenta bancaria de la EMPRESA (donde se recibio el
 * dinero). No hay cuenta destino del cliente ni cambista.
 *
 * `id_cliente` NO viaja en el payload: sale de la ruta. `id_empleado_registro`
 * tampoco: lo toma el backend del JWT.
 *
 * Los max coinciden con el VARCHAR declarado en la tabla `anticipo_cliente`:
 * `numero_operacion` y `codigo_comprobante` son VARCHAR(128) y
 * `observacion` es TEXT.
 *
 * `evidencias` NO entra en el schema a proposito: son los archivos
 * binarios que viajan en el multipart y los valida el backend. Se anexa
 * al tipo de transporte en `RegistrarAnticipoClienteRequest`.
 */
export const Schema_RegistrarAnticipoCliente = z
  .object({
    id_empresa: z.number().int().positive("La empresa es obligatoria"),
    /** Cuenta de la empresa donde se recibio el dinero (opcional en efectivo). */
    id_cuenta_bancaria_empresa: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),
    medio_pago: z.nativeEnum(MedioPago, {
      error: "Seleccione el medio de pago",
    }),
    fecha_hora_pago: z
      .string()
      .regex(
        // El back acepta fecha sola o fecha+hora (con ` 00:00:00` si va sola).
        /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/,
        "Formato de fecha invalido",
      )
      .nullable()
      .optional(),
    numero_operacion: z
      .string()
      .max(128, "El numero de operacion no puede superar 128 caracteres")
      .nullable()
      .optional(),
    codigo_comprobante: z
      .string()
      .max(128, "El comprobante no puede superar 128 caracteres")
      .nullable()
      .optional(),
    observacion: z
      .string()
      .max(65535, "La observacion es demasiado larga")
      .nullable()
      .optional(),
    // DECIMAL(12,2) en la tabla: 10 enteros + 2 decimales.
    saldo: z
      .number()
      .positive("El saldo debe ser mayor a 0")
      .max(9999999999.99, "El saldo no puede superar S/ 9,999,999,999.99"),
  })
  .superRefine((data, ctx) => {
    const requiereBanco =
      data.medio_pago === MedioPago.Transferencia ||
      data.medio_pago === MedioPago.Deposito;

    if (requiereBanco) {
      // Transferencia y Depósito provienen de una cuenta bancaria: sin
      // cuenta, fecha y numero de operacion el anticipo no es trazable.
      if (!data.id_cuenta_bancaria_empresa) {
        ctx.addIssue({
          code: "custom",
          message:
            "Selecciona la cuenta de la empresa donde se recibio el dinero",
          path: ["id_cuenta_bancaria_empresa"],
        });
      }
      if (!data.fecha_hora_pago) {
        ctx.addIssue({
          code: "custom",
          message: "Indica la fecha del pago",
          path: ["fecha_hora_pago"],
        });
      }
      if (!data.numero_operacion?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Indica el numero de operacion",
          path: ["numero_operacion"],
        });
      }
    }
  });

/** Campos de negocio del anticipo (los que valida el schema). */
export type RegistrarAnticipoClienteData = z.infer<
  typeof Schema_RegistrarAnticipoCliente
>;

/**
 * Payload de transporte: los datos de negocio mas los adjuntos. El service
 * lo arma como `multipart/form-data` y el backend guarda los archivos con
 * `ArchivoHelper::guardarArchivos()`, que devuelve la metadata que se
 * persiste en la columna JSON `evidencias`.
 */
export interface RegistrarAnticipoClienteRequest
  extends RegistrarAnticipoClienteData {
  evidencias?: File[] | null;
}