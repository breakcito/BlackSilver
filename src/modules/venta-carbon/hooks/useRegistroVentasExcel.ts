import { useCallback, useState } from "react";
import { useExcel } from "../../../hooks/useExcel";
import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import { VentaCarbonService } from "../service/venta-carbon.service";
import { construirExcelRegistroVentas } from "../presentation/excel/exportar-registro-ventas-excel";

/**
 * Exportacion del reporte "Registro de Ventas".
 *
 * El archivo se encola al portal global de Excel: la generacion no bloquea
 * el hilo principal porque el reporte puede traer cientos de cargas.
 */
export const useRegistroVentasExcel = () => {
  const { generateExcel } = useExcel();
  const { notifyError } = useNotify();
  const [exportando, setExportando] = useState(false);

  const exportar = useCallback(
    async (anio: number) => {
      setExportando(true);
      try {
        const resp = await VentaCarbonService.getReporteRegistroVentas(anio);
        if (!resp.success || !resp.data) {
          notifyError(resp.message || "No se pudo cargar el registro de ventas");
          return;
        }

        const cargas = resp.data.cargas ?? [];
        if (cargas.length === 0) {
          notifyError(`No hay cargas de carbón ingresadas en ${anio}.`);
          return;
        }

        // El logo es el de la empresa a la que pertenece la primera carga
        // del reporte: el archivo es de una sola empresa.
        let logoUrl: string | null = null;
        try {
          const empresas = await AuxService.get_empresas();
          if (empresas.success && empresas.data) {
            const idEmpresa = cargas[0].id_empresa;
            const empresa = empresas.data.find((e) => e.id_empresa === idEmpresa);
            logoUrl = empresa?.url_logo ?? null;
          }
        } catch (error) {
          // El logo es decorativo: si falla, el reporte se genera igual.
          console.error(error);
        }

        const { filename, builder } = construirExcelRegistroVentas(resp.data, {
          anio,
          logoUrl,
        });

        generateExcel({ filename, builder });
      } catch (error) {
        console.error(error);
        notifyError("Ocurrió un error al generar el registro de ventas");
      } finally {
        setExportando(false);
      }
    },
    [generateExcel, notifyError],
  );

  return { exportar, exportando };
};
