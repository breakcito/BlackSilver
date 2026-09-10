import { useState } from "react";
import { ProveedoresService } from "../service/proveedores.service";
import { useNotify } from "../../../hooks/useNotify";
import {
  Schema_CrearProveedor,
  type CrearProveedorRequest,
} from "../service/proveedores.requests";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { ProveedorResponse } from "../service/proveedores.responses";

export const useRegistroProveedor = (
  onSuccess: (p: ProveedorResponse) => void,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifySuccess, notifyError } = useNotify();

  const [payload, setPayload] = useState<CrearProveedorRequest>({
    tipo_entidad: TipoEntidad.Juridica,
    para_mantenimiento: false,
    para_transporte: false,
    para_carbon: false,
    dni: "",
    ruc: "",
    razon_social: "",
    direccion: "",
    telefono: "",
    correo: "",
    codigo_reinfo: null,
    contratos: [],
  });

  const handleChange = <K extends keyof CrearProveedorRequest>(
    field: K,
    value: CrearProveedorRequest[K],
  ) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSelectChange = (value: string | null) => {
    if (value) {
      setPayload((prev) => ({
        ...prev,
        tipo_entidad: value as TipoEntidad,
        dni: "", // Limpiar para evitar basura entre tipos
        ruc: "",
      }));
      if (error) setError(null);
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validation = Schema_CrearProveedor.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const created = await ProveedoresService.crearProveedor(validation.data);
      notifySuccess("Proveedor registrado exitosamente");
      setPayload({
        tipo_entidad: TipoEntidad.Juridica,
        para_mantenimiento: false,
        para_transporte: false,
        para_carbon: false,
        dni: "",
        ruc: "",
        razon_social: "",
        direccion: "",
        telefono: "",
        correo: "",
        codigo_reinfo: null,
        contratos: [],
      });
      onSuccess(created);
    } catch (e) {
      console.error(e);
      notifyError("Ocurrió un error al registrar el proveedor");
    } finally {
      setLoading(false);
    }
  };

  return { payload, handleChange, handleSelectChange, submit, loading, error };
};
