import { useEffect, useState } from "react";
import { ClientesService } from "../../clientes/service/clientes.service";
import type { ClienteResponse } from "../../clientes/service/clientes.responses";

/**
 * Clientes para las liquidaciones y los analisis asumidos por el cliente.
 *
 * No se filtra por `para_carbon`: en mineral no hay una marca que separe al
 * cliente de mineral del de carbon, asi que se muestran todos los clientes
 * activos.
 */
export const useClientesDespacho = () => {
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const data = await ClientesService.getClientes();
        if (cancel) return;
        setClientes(
          (data ?? []).filter((c) => c.estado !== "Inactivo" && c.estado !== "Eliminado"),
        );
      } catch (error) {
        console.error(error);
        if (!cancel) setClientes([]);
      } finally {
        if (!cancel) setIsLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  return { clientes, isLoading };
};
