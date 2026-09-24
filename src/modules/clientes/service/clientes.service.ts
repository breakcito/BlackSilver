import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  ActualizarAlmacenCarbonClienteRequest,
  CrearAlmacenCarbonClienteRequest,
  CrearClienteRequest,
  CrearCuentaBancariaRequest,
  DTO_ActualizarCliente,
  EditarCuentaBancariaRequest,
} from "./clientes.requests";
import type {
  AlmacenCarbonClienteResponse,
  ClienteResponse,
  CuentaBancariaResponse,
} from "./clientes.responses";

export type {
  ActualizarAlmacenCarbonClienteRequest,
  CrearAlmacenCarbonClienteRequest,
};

export const ClientesService = {
  getClientes: async (filters?: {
    para_carbon?: boolean;
  }): Promise<ClienteResponse[]> => {
    const params = filters
      ? {
          ...(filters.para_carbon !== undefined && {
            para_carbon: filters.para_carbon ? 1 : 0,
          }),
        }
      : undefined;
    const { data } = await api.get("/clientes", { params });
    return data.data;
  },

  crearCliente: async (
    payload: CrearClienteRequest,
  ): Promise<ClienteResponse> => {
    const { data } = await api.post("/clientes", {
      ...payload,
      paraCarbon: payload.para_carbon ?? false,
    });
    return data.data;
  },

  /**
   * Actualizar campos administrativos de un cliente.
   * El backend calcula el diff y lo apendea a cambios_log.
   * El estado NO se envía: lo gestiona eliminarCliente (soft-delete).
   * `para_carbon` NO se envía: define la pestaña donde vive el cliente
   * y se congela al crear — mismo patrón que proveedores.
   */
  actualizarCliente: async (
    idCliente: number,
    dto: DTO_ActualizarCliente,
  ): Promise<IRespuesta<ClienteResponse>> => {
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
  },

  /** Eliminacion logica (estado -> Inactivo). */
  eliminarCliente: async (
    idCliente: number,
  ): Promise<IRespuesta<ClienteResponse>> => {
    const response = await api.delete<IRespuesta<ClienteResponse>>(
      `/clientes/${idCliente}`
    );
    return response.data;
  },

  getCuentasBancarias: async (
    idCliente: number,
  ): Promise<CuentaBancariaResponse[]> => {
    const { data } = await api.get(
      `/clientes/cuentas-bancarias/${idCliente}`,
    );
    return data.data;
  },

  crearCuentaBancaria: async (
    payload: CrearCuentaBancariaRequest,
  ): Promise<CuentaBancariaResponse> => {
    const { data } = await api.post("/clientes/cuentas-bancarias", payload);
    return data.data;
  },

  actualizarCuentaBancaria: async (
    id: number,
    payload: EditarCuentaBancariaRequest,
  ): Promise<IRespuesta<CuentaBancariaResponse>> => {
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
  },

  /**
   * Almacenes de carbon de un cliente (modulo carbon).
   */
  getAlmacenesCarbonPorCliente: async (
    idCliente: number,
  ): Promise<IRespuesta<AlmacenCarbonClienteResponse[]>> => {
    const { data } = await api.get<IRespuesta<AlmacenCarbonClienteResponse[]>>(
      `/clientes/${idCliente}/almacenes-carbon`,
    );
    return data;
  },

  /**
   * Lista todos los almacenes de carbon activos de clientes activos.
   */
  getAlmacenesCarbonTodos: async (): Promise<
    IRespuesta<
      (AlmacenCarbonClienteResponse & {
        cliente_razon_social?: string;
        cliente_tipo_entidad?: string;
        cliente_ruc?: string | null;
        cliente_dni?: string | null;
      })[]
    >
  > => {
    const { data } = await api.get<
      IRespuesta<
        (AlmacenCarbonClienteResponse & {
          cliente_razon_social?: string;
          cliente_tipo_entidad?: string;
          cliente_ruc?: string | null;
          cliente_dni?: string | null;
        })[]
      >
    >("/clientes/almacenes-carbon");
    return data;
  },

  crearAlmacenCarbonPorCliente: async (
    idCliente: number,
    payload: CrearAlmacenCarbonClienteRequest,
  ): Promise<IRespuesta<AlmacenCarbonClienteResponse>> => {
    const { data } = await api.post<IRespuesta<AlmacenCarbonClienteResponse>>(
      `/clientes/${idCliente}/almacenes-carbon`,
      payload,
    );
    return data;
  },

  actualizarAlmacenCarbonPorCliente: async (
    idCliente: number,
    idAlmacen: number,
    payload: ActualizarAlmacenCarbonClienteRequest,
  ): Promise<IRespuesta<AlmacenCarbonClienteResponse>> => {
    const { data } = await api.put<IRespuesta<AlmacenCarbonClienteResponse>>(
      `/clientes/${idCliente}/almacenes-carbon/${idAlmacen}`,
      payload,
    );
    return data;
  },

  eliminarAlmacenCarbonPorCliente: async (
    idCliente: number,
    idAlmacen: number,
  ): Promise<IRespuesta<AlmacenCarbonClienteResponse>> => {
    const { data } = await api.delete<IRespuesta<AlmacenCarbonClienteResponse>>(
      `/clientes/${idCliente}/almacenes-carbon/${idAlmacen}`,
    );
    return data;
  },
};