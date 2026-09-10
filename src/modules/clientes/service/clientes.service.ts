import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  CrearClienteRequest,
  CrearCuentaBancariaRequest,
  DTO_ActualizarCliente,
  EditarCuentaBancariaRequest,
} from "./clientes.requests";
import type { ClienteResponse, CuentaBancariaResponse } from "./clientes.responses";

export class ClientesService {
  static async getClientes(): Promise<ClienteResponse[]> {
    const { data } = await api.get("/clientes");
    return data.data;
  }

  static async crearCliente(
    payload: CrearClienteRequest
  ): Promise<ClienteResponse> {
    const { data } = await api.post("/clientes", payload);
    return data.data;
  }

  /**
   * Actualizar campos administrativos de un cliente.
   * El backend calcula el diff y lo apendea a cambios_log.
   * El estado NO se envía: lo gestiona eliminarCliente (soft-delete).
   */
  static async actualizarCliente(
    idCliente: number,
    dto: DTO_ActualizarCliente
  ): Promise<IRespuesta<ClienteResponse>> {
    const response = await api.put<IRespuesta<ClienteResponse>>(
      `/clientes/${idCliente}`,
      {
        tipo_entidad: dto.tipo_entidad ?? null,
        dni: dto.dni ?? null,
        ruc: dto.ruc ?? null,
        razon_social: dto.razon_social,
        direccion: dto.direccion ?? null,
        telefono: dto.telefono ?? null,
        correo: dto.correo ?? null,
      }
    );
    return response.data;
  }

  /**
   * Desactivar (soft delete) un cliente. Cambia estado a Inactivo.
   */
  static async eliminarCliente(
    idCliente: number
  ): Promise<IRespuesta<ClienteResponse>> {
    const response = await api.delete<IRespuesta<ClienteResponse>>(
      `/clientes/${idCliente}`
    );
    return response.data;
  }

  static async getCuentasBancarias(
    idCliente: number
  ): Promise<CuentaBancariaResponse[]> {
    const { data } = await api.get(
      `/clientes/cuentas-bancarias/${idCliente}`
    );
    return data.data;
  }

  static async crearCuentaBancaria(
    payload: CrearCuentaBancariaRequest
  ): Promise<CuentaBancariaResponse> {
    const { data } = await api.post("/clientes/cuentas-bancarias", payload);
    return data.data;
  }

  static async actualizarCuentaBancaria(
    id: number,
    payload: EditarCuentaBancariaRequest
  ): Promise<IRespuesta<CuentaBancariaResponse>> {
    const { data } = await api.put<IRespuesta<CuentaBancariaResponse>>(
      `/clientes/cuentas-bancarias/${id}`,
      {
        id_banco: payload.id_banco,
        moneda: payload.moneda,
        numero_cuenta: payload.numero_cuenta,
        cci: payload.cci || null,
        es_para_detraccion: payload.es_para_detraccion,
      }
    );
    return data;
  }
}