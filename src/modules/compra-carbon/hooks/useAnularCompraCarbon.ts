import { useState } from "react";
import { CompraCarbonService } from "../service/compra-carbon.service";
import { useNotify } from "../../../hooks/useNotify";

/**
 * Maneja la anulacion de una compra de carbon.
 */
export const useAnularCompraCarbon = () => {
  const { notifyError, notifySuccess } = useNotify();
  const [loading, setLoading] = useState(false);

  const anular = async (
    idCompraCarbon: number,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const resp = await CompraCarbonService.anularCompra(idCompraCarbon);
      if (!resp.success) {
        notifyError(resp.message || "No se pudo anular la compra");
        return false;
      }
      notifySuccess(resp.message || "Compra anulada correctamente");
      return true;
    } catch (e) {
      console.error(e);
      notifyError("Error al anular la compra de carbon");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { anular, loading };
};