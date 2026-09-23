import { useState } from "react";
import { ClientesService } from "../service/clientes.service";
import { useNotify } from "../../../hooks/useNotify";
import {
  Schema_CrearCliente,
  type CrearClienteRequest,
} from "../service/clientes.requests";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { ClienteResponse } from "../service/clientes.responses";

/**
 * Hook para registrar un cliente.
 *
 * `modoCarbon` define el flag `para_carbon` automaticamente:
 * - false (default): cliente de logistica.
 * - true: cliente de carbon (queda listado en la pestaña Carbon).
 *
 * La pagina pasa esta flag segun la tab activa (patron proveedores).
 */
export const useRegistroCliente = (
  onSuccess: (p: ClienteResponse) => void,
  modoCarbon: boolean = false,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifySuccess, notifyError } = useNotify();

  const [payload, setPayload] = useState<CrearClienteRequest>({
    tipo_entidad: TipoEntidad.Juridica,
    dni: "",
    ruc: "",
    razon_social: "",
    direccion: "",
    telefono: "",
    correo: "",
    para_carbon: modoCarbon,
  });

  const handleChange = (field: keyof CrearClienteRequest, value: string) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSelectChange = (value: string | null) => {
    if (value) {
      setPayload((prev) => ({
        ...prev,
        tipo_entidad: value as TipoEntidad,
      }));
      if (error) setError(null);
    }
  };

  /**
   * Documento unificado (RUC o DNI). Mapeo por largo:
   *  - 8 digitos -> DNI (siempre valido, no depende del tipo)
   *  - cualquier otro largo -> RUC (11 digitos + prefijo segun tipo lo valida Zod)
   *  - vacio -> ambos en ""
   * El payload conserva `ruc` y `dni` separados para no tocar el backend.
   */
  const documento = payload.dni || payload.ruc || "";
  const setDocumento = (value: string) => {
    const limpio = value.replace(/\D/g, "");
    if (limpio.length === 8) {
      setPayload((prev) => ({ ...prev, dni: limpio, ruc: "" }));
    } else {
      setPayload((prev) => ({ ...prev, dni: "", ruc: limpio }));
    }
    if (error) setError(null);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validation = Schema_CrearCliente.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const created = await ClientesService.crearCliente(validation.data);
      notifySuccess("Cliente registrado exitosamente");
      setPayload({
        tipo_entidad: TipoEntidad.Juridica,
        dni: "",
        ruc: "",
        razon_social: "",
        direccion: "",
        telefono: "",
        correo: "",
        para_carbon: modoCarbon,
      });
      onSuccess(created);
    } catch (e) {
      console.error(e);
      notifyError("Ocurrió un error al registrar el cliente");
    } finally {
      setLoading(false);
    }
  };

  return {
    payload,
    documento,
    setDocumento,
    handleChange,
    handleSelectChange,
    submit,
    loading,
    error,
  };
};
