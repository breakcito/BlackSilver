import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  ActualizarProveedorRequest,
  CrearBancoRequest,
  CrearCuentaBancariaRequest,
  CrearProveedorRequest,
  CrearPersonalRequest,
  EditarCuentaBancariaRequest,
  SetLugaresExtraccionProveedorRequest,
  SetTiposCarbonProveedorRequest,
} from "./proveedores.requests";

export type {
  ActualizarProveedorRequest,
  CrearBancoRequest,
  CrearCuentaBancariaRequest,
  CrearProveedorRequest,
  CrearPersonalRequest,
  EditarCuentaBancariaRequest,
  SetLugaresExtraccionProveedorRequest,
  SetTiposCarbonProveedorRequest,
};
import type {
  CuentaBancariaResponse,
  LugarExtraccionResponse,
  ProveedorResponse,
  TipoCarbonProveedorResponse,
} from "./proveedores.responses";

export const ProveedoresService = {
  getProveedores: async (filters?: {
    para_carbon?: boolean;
  }): Promise<ProveedorResponse[]> => {
    const { data } = await api.get("/proveedores", { params: filters });
    return data.data; // Retorna el payload del ApiResponse
  },

  crearProveedor: async (
    payload: CrearProveedorRequest,
  ): Promise<ProveedorResponse> => {
    const { data } = await api.post("/proveedores", {
      tipo_entidad: payload.tipo_entidad,
      paraMantenimiento: payload.para_mantenimiento,
      paraTransporte: payload.para_transporte,
      paraCarbon: payload.para_carbon ?? false,
      dni: payload.dni,
      ruc: payload.ruc,
      razon_social: payload.razon_social,
      direccion: payload.direccion,
      telefono: payload.telefono,
      correo: payload.correo,
    });
    return data.data;
  },

  getCuentasBancarias: async (
    idProveedor: number,
  ): Promise<CuentaBancariaResponse[]> => {
    const { data } = await api.get(
      `/proveedores/cuentas-bancarias/${idProveedor}`,
    );
    return data.data;
  },

  /**
   * Actualiza un proveedor (logistica o carbon).
   *
   * A diferencia de `crearProveedor`, devuelve el `IRespuesta` completo en vez
   * de `data.data`: el backend responde con HTTP 200 y `success: false` en los
   * errores de negocio (RUC duplicado, no existe), asi que hay que poder
   * leer `success` y `message` para no reportar un exito falso.
   */
  actualizarProveedor: async (
    idProveedor: number,
    payload: ActualizarProveedorRequest,
  ): Promise<IRespuesta<ProveedorResponse>> => {
    const { data } = await api.put<IRespuesta<ProveedorResponse>>(
      `/proveedores/${idProveedor}`,
      {
        tipo_entidad: payload.tipo_entidad,
        paraMantenimiento: payload.para_mantenimiento,
        paraTransporte: payload.para_transporte,
        dni: payload.dni,
        ruc: payload.ruc,
        razon_social: payload.razon_social,
        direccion: payload.direccion,
        telefono: payload.telefono,
        correo: payload.correo,
      },
    );
    return data;
  },

  /** Eliminacion logica (estado -> Inactivo). */
  eliminarProveedor: async (
    idProveedor: number,
  ): Promise<IRespuesta<ProveedorResponse>> => {
    const { data } = await api.delete<IRespuesta<ProveedorResponse>>(
      `/proveedores/${idProveedor}`,
    );
    return data;
  },

  crearCuentaBancaria: async (
    payload: CrearCuentaBancariaRequest,
  ): Promise<CuentaBancariaResponse> => {
    const { data } = await api.post("/proveedores/cuentas-bancarias", payload);
    return data.data;
  },

  actualizarCuentaBancaria: async (
    id: number,
    payload: EditarCuentaBancariaRequest,
  ): Promise<CuentaBancariaResponse> => {
    const { data } = await api.put(
      `/proveedores/cuentas-bancarias/${id}`,
      payload,
    );
    return data.data;
  },

  /**
   * Tipos de carbon asociados a un proveedor (modulo carbon).
   */
  getTiposCarbonPorProveedor: async (
    idProveedor: number,
  ): Promise<IRespuesta<TipoCarbonProveedorResponse[]>> => {
    const { data } = await api.get<IRespuesta<TipoCarbonProveedorResponse[]>>(
      `/proveedores/${idProveedor}/tipos-carbon`,
    );
    return data;
  },

  /**
   * Reemplaza los tipos de carbon asociados a un proveedor.
   */
  setTiposCarbonPorProveedor: async (
    idProveedor: number,
    payload: SetTiposCarbonProveedorRequest,
  ): Promise<IRespuesta<TipoCarbonProveedorResponse[]>> => {
    const { data } = await api.put<IRespuesta<TipoCarbonProveedorResponse[]>>(
      `/proveedores/${idProveedor}/tipos-carbon`,
      payload,
    );
    return data;
  },

  /**
   * Lugares de extraccion de un proveedor (modulo carbon).
   */
  getLugaresExtraccionPorProveedor: async (
    idProveedor: number,
  ): Promise<IRespuesta<LugarExtraccionResponse[]>> => {
    const { data } = await api.get<IRespuesta<LugarExtraccionResponse[]>>(
      `/proveedores/${idProveedor}/lugares-extraccion`,
    );
    return data;
  },

  /**
   * Reemplaza los lugares de extraccion asociados a un proveedor.
   */
  setLugaresExtraccionPorProveedor: async (
    idProveedor: number,
    payload: SetLugaresExtraccionProveedorRequest,
  ): Promise<IRespuesta<LugarExtraccionResponse[]>> => {
    const { data } = await api.put<IRespuesta<LugarExtraccionResponse[]>>(
      `/proveedores/${idProveedor}/lugares-extraccion`,
      payload,
    );
    return data;
  },
};
