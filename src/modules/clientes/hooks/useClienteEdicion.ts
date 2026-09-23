import { useEffect, useState } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { ClientesService } from "../service/clientes.service";
import { Schema_ActualizarCliente, type DTO_ActualizarCliente } from "../service/clientes.requests";
import type { ClienteResponse } from "../service/clientes.responses";
import { TipoEntidad } from "../../../shared/enums/_generic/tipo-entidad";

interface UseClienteEdicionProps {
  cliente: ClienteResponse | null;
  onSuccess: (cliente: ClienteResponse) => void;
}

/**
 * Hook para el modal de edicion administrativa de un cliente.
 * Maneja el formulario, validacion con Zod y envio al backend.
 * NO expone estado: lo gestiona eliminarCliente (soft-delete).
 */
export const useClienteEdicion = ({
  cliente,
  onSuccess,
}: UseClienteEdicionProps) => {
  const { notifySuccess } = useNotify();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipoEntidad, setTipoEntidad] = useState<TipoEntidad>(
    TipoEntidad.Juridica,
  );
  const [documento, setDocumento] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

  // Sincronizar el formulario cuando cambia el cliente a editar.
  useEffect(() => {
    if (!cliente) return;
    setTipoEntidad(
      (cliente.tipo_entidad as TipoEntidad | null) ?? TipoEntidad.Juridica,
    );
    // Hidratacion del input unificado: preferimos dni (8 digitos) si existe,
    // si no usamos ruc. Nunca ambos a la vez en el campo visible.
    setDocumento(cliente.dni ?? cliente.ruc ?? "");
    setRazonSocial(cliente.razon_social ?? "");
    setDireccion(cliente.direccion ?? "");
    setTelefono(cliente.telefono ?? "");
    setCorreo(cliente.correo ?? "");
    setError(null);
  }, [cliente]);

  const handleTipoEntidadChange = (value: string | null) => {
    if (!value) return;
    setTipoEntidad(value as TipoEntidad);
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cliente) return;

    setSubmitting(true);
    setError(null);

    // Mapeo del input unificado al payload que espera el backend:
    // 8 digitos -> dni, cualquier otro largo -> ruc, vacio -> ambos null.
    const limpio = documento.replace(/\D/g, "");
    const esDni = limpio.length === 8;
    const dniValue = esDni ? limpio : null;
    const rucValue = limpio.length === 0 || esDni ? null : limpio;

    // `para_carbon` NO se incluye: define la pestaña donde vive el cliente
    // (logística vs carbón) y se congela al crear — mismo patrón que
    // proveedores. Se preserva en backend al no estar en el payload.
    const values: DTO_ActualizarCliente = {
      tipo_entidad: tipoEntidad,
      dni: dniValue,
      ruc: rucValue,
      razon_social: razonSocial,
      direccion: direccion || null,
      telefono: telefono || null,
      correo: correo || null,
    };

    const validation = Schema_ActualizarCliente.safeParse(values);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setSubmitting(false);
      return;
    }

    try {
      const result = await ClientesService.actualizarCliente(
        cliente.id_cliente,
        validation.data,
      );
      if (result.success) {
        notifySuccess(
          `El cliente ${cliente.razon_social} ha sido actualizado correctamente.`,
        );
        onSuccess(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error(err);
      setError("Error inesperado al actualizar el cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    tipoEntidad,
    setTipoEntidad: handleTipoEntidadChange,
    documento,
    setDocumento,
    razonSocial,
    setRazonSocial,
    direccion,
    setDireccion,
    telefono,
    setTelefono,
    correo,
    setCorreo,
    submitting,
    error,
    handleSubmit,
  };
};
