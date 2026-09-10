import { api } from "../../../service/_api";
import type { RES_Labor } from "../../../service/responses/labor";
import type { RES_Banco } from "../../../service/responses/banco";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  DTO_AsignarLaboresContratista,
  DTO_CrearContratista,
  DTO_ActualizarContratista,
  DTO_CrearEmpleado,
  DTO_ActualizarEmpleado,
  DTO_CrearCuentaBancariaEmpleado,
  DTO_ActualizarCuentaBancariaEmpleado,
} from "./empleados.requests";
import type {
  RES_ContratistaResumen,
  RES_EmpleadoResumen,
  RES_CuentaBancariaEmpleado,
} from "./empleados.responses";

/**
 * Construye un FormData a partir de un DTO.
 * - Omite keys con valores `null` o `undefined`.
 * - Serializa `boolean` como `"1"` / `"0"` para que Laravel los
 *   acepte correctamente en sus reglas de validación `boolean`.
 * - Serializa arrays como `key[]=value` para que Laravel los
 *   parsee como listas en sus reglas de validación `array`.
 * - Conserva `File` tal cual.
 */
const buildFormData = (dto: Record<string, unknown>): FormData => {
  const formData = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === "boolean") {
      formData.append(key, value ? "1" : "0");
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === null || item === undefined) return;
        formData.append(`${key}[]`, String(item));
      });
      return;
    }
    formData.append(key, value instanceof File ? value : String(value));
  });
  return formData;
};

export class EmpleadosService {
  private static PATH = "/empleados";

  public static get_empleados = async (): Promise<
    IRespuesta<RES_EmpleadoResumen[]>
  > => {
    const { data } = await api.get(this.PATH);
    return data;
  };

  public static toggle_con_contrato = async (
    ids: number[],
    conContrato: boolean,
  ): Promise<IRespuesta<null>> => {
    const { data } = await api.patch(`${this.PATH}/toggle-con-contrato`, {
      ids,
      con_contrato: conContrato,
    });
    return data;
  };

  public static crear_empleado = async (
    dto: DTO_CrearEmpleado,
  ): Promise<IRespuesta<RES_EmpleadoResumen>> => {
    const formData = buildFormData(dto as unknown as Record<string, unknown>);
    const { data } = await api.post(this.PATH, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

  public static actualizar_foto = async (
    idEmpleado: number,
    file: File,
  ): Promise<IRespuesta<string>> => {
    const formData = new FormData();
    formData.append("foto", file);
    const { data } = await api.post(
      `${this.PATH}/foto/${idEmpleado}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  };

  public static actualizar_empleado = async (
    idEmpleado: number,
    dto: DTO_ActualizarEmpleado,
  ): Promise<IRespuesta<RES_EmpleadoResumen>> => {
    const { data } = await api.put(`${this.PATH}/${idEmpleado}`, dto);
    return data;
  };

  public static eliminar_empleado = async (
    idEmpleado: number,
  ): Promise<IRespuesta<null>> => {
    const { data } = await api.delete(`${this.PATH}/${idEmpleado}`);
    return data;
  };

  public static get_cuentas_bancarias = async (
    idEmpleado: number,
  ): Promise<IRespuesta<RES_CuentaBancariaEmpleado[]>> => {
    const { data } = await api.get(`${this.PATH}/cuentas-bancarias/${idEmpleado}`);
    return data;
  };

  public static crear_cuenta_bancaria = async (
    payload: DTO_CrearCuentaBancariaEmpleado,
  ): Promise<IRespuesta<RES_CuentaBancariaEmpleado>> => {
    const { data } = await api.post(`${this.PATH}/cuentas-bancarias`, payload);
    return data;
  };

  public static actualizar_cuenta_bancaria = async (
    idCuentaBancaria: number,
    payload: DTO_ActualizarCuentaBancariaEmpleado,
  ): Promise<IRespuesta<RES_CuentaBancariaEmpleado>> => {
    const { data } = await api.put(
      `${this.PATH}/cuentas-bancarias/${idCuentaBancaria}`,
      payload,
    );
    return data;
  };

  public static get_bancos = async (): Promise<IRespuesta<RES_Banco[]>> => {
    const { data } = await api.get("/aux/bancos");
    return data;
  };

  public static crear_banco = async (payload: {
    nombre: string;
    abreviatura: string;
  }): Promise<IRespuesta<RES_Banco>> => {
    const { data } = await api.post("/aux/bancos", payload);
    return data;
  };
}

export class ContratistasService {
  private static PATH = "/contratistas";

  public static get_contratistas = async (
    idMina?: number,
  ): Promise<IRespuesta<RES_ContratistaResumen[]>> => {
    const { data } = await api.get(this.PATH, {
      params: { id_mina: idMina },
    });
    return data;
  };

  public static toggle_con_contrato = async (
    ids: number[],
    conContrato: boolean,
  ): Promise<IRespuesta<null>> => {
    return EmpleadosService.toggle_con_contrato(ids, conContrato);
  };

  public static crear_contratista = async (
    dto: DTO_CrearContratista,
  ): Promise<IRespuesta<RES_ContratistaResumen>> => {
    const formData = buildFormData(dto as unknown as Record<string, unknown>);
    const { data } = await api.post(this.PATH, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

  public static actualizar_foto = async (
    idContratista: number,
    file: File,
  ): Promise<IRespuesta<string>> => {
    const formData = new FormData();
    formData.append("foto", file);
    const { data } = await api.post(
      `${this.PATH}/${idContratista}/foto`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return data;
  };

  public static actualizar_contratista = async (
    idContratista: number,
    dto: DTO_ActualizarContratista,
  ): Promise<IRespuesta<RES_ContratistaResumen>> => {
    const { data } = await api.put(`${this.PATH}/${idContratista}`, dto);
    return data;
  };

  public static eliminar_contratista = async (
    idContratista: number,
  ): Promise<IRespuesta<null>> => {
    const { data } = await api.delete(`${this.PATH}/${idContratista}`);
    return data;
  };
  public static get_labores_disponibles = async (
    idMina: number,
    idContratista?: number,
  ): Promise<IRespuesta<RES_Labor[]>> => {
    const { data } = await api.get(`/aux/labores`, {
      params: {
        id_mina: idMina,
        id_contratista_excluyente: idContratista,
      },
    });
    return data;
  };

  public static asignar_labores = async (
    idContratista: number,
    dto: DTO_AsignarLaboresContratista,
  ): Promise<IRespuesta<RES_ContratistaResumen>> => {
    const { data } = await api.post(
      `${this.PATH}/${idContratista}/labores`,
      dto,
    );
    return data;
  };
}
