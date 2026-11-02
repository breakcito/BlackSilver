import { useCallback, useState } from "react";
import { useExcel } from "../../../hooks/useExcel";
import { useNotify } from "../../../hooks/useNotify";
import { CompraCarbonService } from "../service/compra-carbon.service";
import { construirExcelLiquidacionMultiple } from "../presentation/excel/exportar-liquidacion-excel";
import type { CompraCarbonResumen } from "../service/compra-carbon.responses";

/** Progreso de la obtencion de los detalles de las compras seleccionadas. */
export interface ProgresoLiquidacion {
  hechos: number;
  total: number;
}

/**
 * Exportacion masiva de liquidaciones: varias compras de carbon en un solo
 * archivo Excel.
 *
 * El detalle de cada compra se obtiene por separado (el endpoint es por
 * compra) y, cuando estan todos, el archivo se encola al portal global de
 * Excel: la generacion no bloquea el hilo principal porque el archivo puede
 * traer muchas cargas.
 */
export const useExportarLiquidacionMultiple = () => {
  const { generateExcel } = useExcel();
  const { notifyError, notifyInfo } = useNotify();
  const [exportando, setExportando] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoLiquidacion | null>(null);

  const exportar = useCallback(
    async (compras: CompraCarbonResumen[]) => {
      if (compras.length === 0) {
        notifyError("Seleccione al menos una compra para exportar.");
        return;
      }

      setExportando(true);
      setProgreso({ hechos: 0, total: compras.length });

      try {
        // Los detalles se piden en paralelo: cada compra necesita su propio
        // endpoint.
        const detalles = await Promise.all(
          compras.map(async (compra) => {
            const res = await CompraCarbonService.getCompraConDetalles(
              compra.id_compra_carbon,
            );
            setProgreso((prev) => ({
              hechos: (prev?.hechos ?? 0) + 1,
              total: compras.length,
            }));
            if (!res.success || !res.data) {
              throw new Error(
                res.message ||
                  `No se pudo obtener la liquidación de la compra ${compra.correlativo}`,
              );
            }
            return res.data;
          }),
        );

        const { filename, builder } =
          construirExcelLiquidacionMultiple(detalles);

        generateExcel({ filename, builder });
        notifyInfo(
          `Liquidación de ${detalles.length} compra(s) lista para descargar.`,
        );
      } catch (error) {
        console.error(error);
        notifyError(
          error instanceof Error
            ? error.message
            : "Error al exportar la liquidación",
        );
      } finally {
        setExportando(false);
        setProgreso(null);
      }
    },
    [generateExcel, notifyError, notifyInfo],
  );

  return { exportar, exportando, progreso };
};
