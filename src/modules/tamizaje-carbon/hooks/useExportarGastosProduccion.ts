import { useCallback, useState } from "react";
import dayjs from "dayjs";

import { useExcel } from "../../../hooks/useExcel";
import { useNotify } from "../../../hooks/useNotify";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import { construirExcelGastosProduccion } from "../presentation/excel/exportar-gastos-produccion-excel";
import type { RES_GastoProduccionExport } from "../service/tamizaje-carbon.responses";

/**
 * Exportacion de los gastos de produccion.
 *
 * Dos modalidades:
 *  - general: todos los gastos (de zarandeo y de blending) del periodo
 *    elegido,
 *  - por grupo: los gastos de un grupo de operaciones (un zarandeo y sus
 *    gastos comparten grupo).
 *
 * El archivo se encola al portal global de Excel: la generacion no bloquea
 * el hilo principal porque el reporte puede traer muchas filas.
 */
export const useExportarGastosProduccion = () => {
  const { generateExcel } = useExcel();
  const { notifyError, notifyInfo } = useNotify();
  const [exportando, setExportando] = useState(false);
  /** Id del registro que se esta exportando: la fila muestra el spinner. */
  const [idExportando, setIdExportando] = useState<number | null>(null);

  /**
   * Genera el Excel a partir de los gastos ya cargados.
   *
   * Si no hay gastos en el periodo, no se descarga nada: solo se avisa con
   * una notificacion informativa.
   */
  const generar = useCallback(
    (
      gastos: RES_GastoProduccionExport[],
      titulo: string,
      subtitulo: string,
      nombreArchivo: string,
    ) => {
      if (!gastos || gastos.length === 0) {
        notifyInfo("No hay gastos de producción en el periodo seleccionado.");
        return;
      }

      const { filename, builder } = construirExcelGastosProduccion(gastos, {
        titulo,
        subtitulo,
        nombreArchivo,
      });

      generateExcel({ filename, builder });
    },
    [generateExcel, notifyInfo],
  );

  /** Export general de una vista: por rango de fechas. */
  const exportarPorRango = useCallback(
    async (
      fechaInicio: string,
      fechaFin: string,
      tipo: "blending" | "zarandeo",
    ) => {
      setExportando(true);
      try {
        const resp = await TamizajeCarbonService.getGastosExportarRango(
          fechaInicio,
          fechaFin,
          tipo,
        );
        if (!resp.success || !resp.data) {
          notifyError(resp.message || "No se pudieron cargar los gastos");
          return;
        }

        const subtitulo = `Del ${dayjs(fechaInicio).format("DD/MM/YYYY")} al ${dayjs(fechaFin).format("DD/MM/YYYY")}`;
        generar(
          resp.data,
          "GASTOS DE PRODUCCIÓN",
          subtitulo,
          `Gastos_produccion_${tipo}_${fechaInicio}_${fechaFin}`,
        );
      } catch (error) {
        console.error(error);
        notifyError("Ocurrió un error al generar el Excel de gastos");
      } finally {
        setExportando(false);
      }
    },
    [generar, notifyError],
  );

  /** Export de un grupo de gastos (el de un zarandeo o de un blending). */
  const exportarGrupo = useCallback(
    async (idGrupo: number, registro?: string) => {
      setIdExportando(idGrupo);
      setExportando(true);
      try {
        const resp = await TamizajeCarbonService.getGastosExportarGrupo(idGrupo);
        if (!resp.success || !resp.data) {
          notifyError(resp.message || "No se pudieron cargar los gastos");
          return;
        }

        generar(
          resp.data,
          "GASTOS DE PRODUCCIÓN",
          registro ? `Grupo ${registro}` : `Grupo #${idGrupo}`,
          `Gastos_produccion_grupo_${registro ?? idGrupo}`,
        );
      } catch (error) {
        console.error(error);
        notifyError("Ocurrió un error al generar el Excel de gastos");
      } finally {
        setExportando(false);
        setIdExportando(null);
      }
    },
    [generar, notifyError],
  );

  return {
    exportarPorRango,
    exportarGrupo,
    exportando,
    idExportando,
  };
};
