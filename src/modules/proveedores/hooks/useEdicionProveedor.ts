import { useEffect, useState } from "react";
import { ProveedoresService } from "../service/proveedores.service";
import { useNotify } from "../../../hooks/useNotify";
import {
  Schema_ActualizarProveedor,
  type ActualizarProveedorRequest,
} from "../service/proveedores.requests";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";
import type { ProveedorResponse } from "../service/proveedores.responses";

/**
 * Hook de edicion de proveedor (logistica y carbon).
 *
 * IMPORTANTE — campos ocultos:
 *  - `para_carbon` no se envia: define en que pestaña vive el proveedor y el
 *    backend lo preserva.
 *  - En el formulario de CARBON no se muestran los switches
 *    `para_mantenimiento` / `para_transporte`, pero el payload se hidrata con
 *    los valores actuales del proveedor y los reenvia. Si no se hiciera, el
 *    PUT los escribiria en `false` y se borrarian silenciosamente.
 */
export const useEdicionProveedor = (
  proveedor: ProveedorResponse | null,
  onSuccess: (p: ProveedorResponse) => void,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifySuccess, notifyError } = useNotify();

  const [payload, setPayload] = useState<ActualizarProveedorRequest>({
    tipo_entidad: TipoEntidad.Juridica,
    para_mantenimiento: false,
    para_transporte: false,
    dni: "",
    ruc: "",
    razon_social: "",
    direccion: "",
    telefono: "",
    correo: "",
  });

  // Hidratacion desde el proveedor recibido.
  useEffect(() => {
    if (!proveedor) return;

    setPayload({
      tipo_entidad: proveedor.tipo_entidad,
      para_mantenimiento: !!proveedor.para_mantenimiento,
      para_transporte: !!proveedor.para_transporte,
      dni: proveedor.dni ?? "",
      ruc: proveedor.ruc ?? "",
      razon_social: proveedor.razon_social ?? "",
      direccion: proveedor.direccion ?? "",
      telefono: proveedor.telefono ?? "",
      correo: proveedor.correo ?? "",
    });
    setError(null);
  }, [proveedor]);

  const handleChange = <K extends keyof ActualizarProveedorRequest>(
    field: K,
    value: ActualizarProveedorRequest[K],
  ) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  /**
   * Al cambiar el tipo de entidad se limpian DNI y RUC porque el prefijo del
   * RUC depende del tipo (10 natural / 20 juridica) y quedaria invalido.
   */
  const handleSelectChange = (value: string | null) => {
    if (!value) return;
    setPayload((prev) => ({
      ...prev,
      tipo_entidad: value as TipoEntidad,
      dni: "",
      ruc: "",
    }));
    if (error) setError(null);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!proveedor) return;

    const validation = Schema_ActualizarProveedor.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const resp = await ProveedoresService.actualizarProveedor(
        proveedor.id_proveedor,
        validation.data,
      );
      if (!resp.success) {
        setError(resp.message);
        return;
      }
      notifySuccess(resp.message);
      onSuccess(resp.data);
    } catch (err) {
      console.error(err);
      notifyError("Ocurrio un error al actualizar el proveedor");
    } finally {
      setLoading(false);
    }
  };

  return { payload, handleChange, handleSelectChange, submit, loading, error };
};
