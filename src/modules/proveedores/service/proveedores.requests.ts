import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import { Moneda } from "../../../shared/enums/_generic/moneda";
import { MedioPago } from "../../../shared/enums/anticipo-proveedor/medio-pago";
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

/**
 * Almacenes de carbon de un proveedor (modulo carbon).
 *
 * Cada almacen es propio del proveedor (1:N): se persiste en
 * `almacen_carbon_proveedor` con `id_proveedor`. `direccion` es obligatoria;
 * los ids de ubigeo son opcionales. Se valida la longitud maxima del
 * VARCHAR(256) declarado en la tabla.
 */
export const Schema_AlmacenCarbon = z.object({
  id_departamento: z.number().int().positive().nullable().optional(),
  id_provincia: z.number().int().positive().nullable().optional(),
  id_distrito: z.number().int().positive().nullable().optional(),
  direccion: z
    .string()
    .min(1, "La dirección es obligatoria")
    .max(256, "La dirección no puede superar 256 caracteres"),
});
export type CrearAlmacenCarbonRequest = z.infer<typeof Schema_AlmacenCarbon>;
export type ActualizarAlmacenCarbonRequest = z.infer<
  typeof Schema_AlmacenCarbon
>;

/**
 * Registro de un anticipo a proveedor (modulo carbon).
 *
 * El backend exige id_cuenta_bancaria_empresa + fecha_hora_pago +
 * numero_operacion cuando medio_pago es Transferencia o Deposito;
 * aqui solo validamos tipos (el server-side rechaza la combinacion
 * invalida con 422).
 *
 * `saldo` es el unico campo numerico visible: el form lo guarda en
 * `saldo_inicial` y `saldo_actual` (iguales al registrar).
 *
 * Cuentas: `id_cuenta_bancaria_empresa` es la cuenta ORIGEN (de donde
 * sale el dinero) e `id_cuenta_bancaria_proveedor` la cuenta DESTINO
 * (del proveedor). El destino es opcional y, cuando `pago_a_terceros`
 * esta activo, el backend lo fuerza a null porque el dinero no llego a
 * ninguna cuenta del proveedor.
 *
 * `codigo_comprobante` es la factura que respalda el anticipo (texto
 * libre, no referencia a otra tabla). `observacion` es una nota libre.
 * Los max coinciden con el VARCHAR declarado en la tabla y con las
 * reglas del controller: 64 y 500.
 *
 * `evidencias` NO entra en el schema a proposito: son los archivos
 * binarios que viajan en el multipart y los valida el backend (o el propio
 * upload del browser), no nuestras reglas de negocio. Se anexa al tipo de
 * transporte en `RegistrarAnticipoRequest`.
 */
export const Schema_RegistrarAnticipo = z
  .object({
    id_empresa: z.number().int().positive("La empresa es obligatoria"),
    id_cuenta_bancaria_empresa: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),
    id_cuenta_bancaria_proveedor: z
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
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
        "Formato de fecha y hora invalido",
      )
      .nullable()
      .optional(),
    numero_operacion: z
      .string()
      .max(64, "El numero de operacion no puede superar 64 caracteres")
      .nullable()
      .optional(),
    codigo_comprobante: z
      .string()
      .max(64, "La factura no puede superar 64 caracteres")
      .nullable()
      .optional(),
    observacion: z
      .string()
      .max(500, "La observacion no puede superar 500 caracteres")
      .nullable()
      .optional(),
    // Opcional (no `.default`) a proposito: asi el tipo de salida sigue
    // aceptando payloads que no lo envian, como el registro rapido de
    // anticipo dentro de la liquidacion de compra-carbon.
    pago_a_terceros: z.boolean().optional(),
    saldo: z.number().positive("El saldo debe ser mayor a 0"),
  })
  .superRefine((data, ctx) => {
    // Transferencia y Deposito salen de una cuenta bancaria: sin origen,
    // fecha y numero de operacion el anticipo no es trazable.
    const requiereBanco =
      data.medio_pago === MedioPago.Transferencia ||
      data.medio_pago === MedioPago.Deposito;

    if (!requiereBanco) return;

    if (!data.id_cuenta_bancaria_empresa) {
      ctx.addIssue({
        code: "custom",
        message: "Selecciona la cuenta de la empresa de donde sale el dinero",
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
  });

/** Campos de negocio del anticipo (los que valida el schema). */
export type RegistrarAnticipoData = z.infer<typeof Schema_RegistrarAnticipo>;

/**
 * Payload de transporte: los datos de negocio mas los adjuntos. El service
 * lo arma como `multipart/form-data` y el backend guarda los archivos con
 * `ArchivoHelper::guardarArchivos()`, que devuelve la metadata que se
 * persiste en la columna JSON `evidencias`.
 */
export interface RegistrarAnticipoRequest extends RegistrarAnticipoData {
  evidencias?: File[] | null;
}
