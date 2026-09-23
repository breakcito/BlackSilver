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
      // NO se limpian dni/ruc: el usuario puede tipear el documento antes de
      // elegir el tipo, o cambiar entre Natural/Juridica sin perder lo
      // tipeado. La validacion Zod se encarga del prefijo al submit.
      setPayload((prev) => ({
        ...prev,
        tipo_entidad: value as TipoEntidad,
      }));
      if (error) setError(null);
    }
  };

  /**
   * Documento unificado (RUC o DNI). Por largo:
   *  - 8 digitos -> DNI (siempre valido, no depende del tipo)
   *  - cualquier otro largo -> RUC (11 digitos + prefijo segun tipo lo valida Zod)
   *  - vacio -> ambos en ""
   * Esto permite un solo input en la UI sin tocar el payload ni el backend.
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
