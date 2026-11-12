import { useCallback, useState } from "react";
import { ClientesService } from "../../clientes/service/clientes.service";
import type { ClienteResponse } from "../../clientes/service/clientes.responses";

/**
 * Clientes para las liquidaciones y los analisis asumidos por el cliente.
 *
 * No se filtran por `para_carbon`: en mineral no hay una marca que separe al
 * cliente de mineral del de carbon, asi que se muestran todos los clientes
 * activos.
 *
 * El catalogo NO se carga al entrar al modulo: se pide al abrir el modal
 * que lo necesita (analisis o liquidacion).
 */
export const useClientesDespacho = () => {
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /** Carga el catalogo de clientes. Se llama al abrir el modal que lo usa. */
  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ClientesService.getClientes();
      setClientes(
        (data ?? []).filter((c) => c.estado !== "Inactivo" && c.estado !== "Eliminado"),
      );
    } catch (error) {
      console.error(error);
      setClientes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { clientes, isLoading, cargar };
};
