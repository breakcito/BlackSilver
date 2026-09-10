import { useState } from "react";
import { ClientesService } from "../service/clientes.service";
import { useNotify } from "../../../hooks/useNotify";
import {
  Schema_CrearCliente,
  type CrearClienteRequest,
} from "../service/clientes.requests";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { ClienteResponse } from "../service/clientes.responses";

export const useRegistroCliente = (
  onSuccess: (p: ClienteResponse) => void,
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
      });
      onSuccess(created);
    } catch (e) {
      console.error(e);
      notifyError("Ocurrió un error al registrar el cliente");
    } finally {
      setLoading(false);
    }
  };

  return { payload, handleChange, handleSelectChange, submit, loading, error };
};
