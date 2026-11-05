import { useCallback, useState } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { exportarLiquidacionVentaExcel } from "../presentation/excel/exportar-liquidacion-venta-excel";
import type {
  LiquidacionVentaCarbonItem,
  VentaCarbonResumen,
} from "../service/venta-carbon.responses";

/**
 * Exportacion de la liquidacion de una venta a Excel.
 *
 * A diferencia del "Registro de Ventas", el archivo de una liquidacion es
 * chico (las cargas de una sola liquidacion): se genera y se descarga en el
 * momento, sin pasar por la cola global.
 */
export const useExportarLiquidacionVenta = () => {
  const { notifySuccess, notifyError } = useNotify();
  const [exportando, setExportando] = useState(false);

  const exportar = useCallback(
    async (
      venta: VentaCarbonResumen,
      liquidacion: LiquidacionVentaCarbonItem,
    ) => {
      setExportando(true);
      try {
        await exportarLiquidacionVentaExcel(venta, liquidacion);
        notifySuccess("Liquidación exportada");
      } catch (error) {
        console.error(error);
        notifyError(
          error instanceof Error
            ? error.message
            : "Ocurrió un error al exportar la liquidación",
        );
      } finally {
        setExportando(false);
      }
    },
    [notifyError, notifySuccess],
  );

  return { exportar, exportando };
};
