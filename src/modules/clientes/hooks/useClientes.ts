import { useState, useCallback, useEffect } from "react";
import { ClientesService } from "../service/clientes.service";
import type { ClienteResponse } from "../service/clientes.responses";
import { useNotify } from "../../../hooks/useNotify";

export const useClientes = () => {
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { notifySuccess, notifyError } = useNotify();

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ClientesService.getClientes();
      setClientes(res);
    } catch (error) {
      console.error(error);
      notifyError("Ocurrió un error al cargar los clientes");
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const insertCliente = (nuevoCliente: ClienteResponse) => {
    setClientes((prev) => [...prev, nuevoCliente]);
  };

  const updateCliente = (clienteActualizado: ClienteResponse) => {
    setClientes((prev) =>
      prev.map((c) => {
        if (c.id_cliente !== clienteActualizado.id_cliente) return c;

        const cuentas =
          clienteActualizado.cuentas_bancarias ?? c.cuentas_bancarias ?? [];
        const cantidadConsistente =
          clienteActualizado.cantidad_cuentas_bancarias ?? cuentas.length;

        return {
          ...clienteActualizado,
          cuentas_bancarias: cuentas,
          cantidad_cuentas_bancarias: cantidadConsistente,
        };
      })
    );
  };

  /**
   * Soft-delete via cambiar estado a Inactivo. El backend devuelve el cliente
   * actualizado con cambios_log; reemplazamos la fila en la lista local para
   * reflejar el nuevo estado.
   */
  const eliminarCliente = useCallback(
    async (idCliente: number): Promise<boolean> => {
      if (
        !window.confirm(
          "¿Está seguro de eliminar este cliente? Esta acción lo desactivará (soft-delete).",
        )
      ) {
        return false;
      }

      setDeletingId(idCliente);
      try {
        const resp = await ClientesService.eliminarCliente(idCliente);
        if (resp.success) {
          notifySuccess(resp.message);
          setClientes((prev) =>
            prev.map((c) => (c.id_cliente === idCliente ? resp.data : c)),
          );
          return true;
        }
        notifyError(resp.message);
        return false;
      } catch (err) {
        console.error(err);
        notifyError("Error inesperado al eliminar el cliente.");
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [notifySuccess, notifyError],
  );

  return {
    clientes,
    loading,
    fetchClientes,
    recargar: fetchClientes,
    insertCliente,
    updateCliente,
    eliminarCliente,
    deletingId,
  };
};