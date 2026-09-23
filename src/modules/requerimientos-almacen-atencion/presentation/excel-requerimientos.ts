import type ExcelJS from "exceljs";
import dayjs from "dayjs";
import { AtencionService } from "../service/atencion.service";
import type {
  RES_DetalleRequerimiento,
  RES_RequerimientoAlmacen,
} from "../../../service/responses/requerimientos-almacen/requerimiento-almacen";
import { MESES } from "../../../shared/variables/meses";
import { useNotify } from "../../../hooks/useNotify";
import { Estado_Requerimiento } from "../../../shared/enums/requerimiento-almacen/requerimiento";

const COLOR_HEADER_BG = "FF1E3A8A";
const COLOR_HEADER_TEXT = "FFFFFFFF";
const COLOR_BORDER = "FFCBD5E1";
const COLOR_AUDITABLE_BG = "FFFEE2E2";
const COLOR_AUDITABLE_TEXT = "FF991B1B";

// Estados del requerimiento -> color de fondo para la celda "Estado"
const COLOR_ESTADO_GENERADO = "FFDBEAFE"; // azul claro
const COLOR_ESTADO_EN_DESPACHO = "FFFEF3C7"; // ámbar claro
const COLOR_ESTADO_COMPLETADO = "FFDCFCE7"; // verde claro
const COLOR_ESTADO_CERRADO = "FFE2E8F0"; // gris claro
const COLOR_ESTADO_TEXT = "FF1E293B";

const HEADERS = [
  "#",
  "Requerimiento",
  "Solicitante",
  "Labor",
  "F. Solicitud",
  "F. Entrega Est.",
  "Turno",
  "Estado",
  "Producto",
  "U.M.",
  "Cant. Solicitada",
  "Comentario",
];

const COL_WIDTHS = [5, 16, 28, 22, 13, 13, 10, 18, 28, 10, 14, 38];

/**
 * Color de fondo según el estado del requerimiento.
 */
const colorForEstado = (estado: string | null | undefined): string | null => {
  if (!estado) return null;
  switch (estado) {
    case Estado_Requerimiento.Generado:
      return COLOR_ESTADO_GENERADO;
    case Estado_Requerimiento.EnDespacho:
      return COLOR_ESTADO_EN_DESPACHO;
    case Estado_Requerimiento.Completado:
      return COLOR_ESTADO_COMPLETADO;
    case Estado_Requerimiento.Cerrado:
      return COLOR_ESTADO_CERRADO;
    default:
      return null;
  }
};

/**
 * Builder del Excel "reporte" de Requerimientos de Almacén.
 * Una fila por (requerimiento × detalle).
 *
 * Filtros aplicados:
 * - Excluye requerimientos Anulados.
 * - Si modo auditoría está activo, excluye requerimientos con es_auditable = true
 *   (mismo criterio que la lista en useEntregas.ts).
 *
 * Colores:
 * - Producto auditable: celda en rojo.
 * - Estado del requerimiento: celda coloreada según estado.
 */
export const buildRequerimientosExcel = async (
  workbook: ExcelJS.Workbook,
  requerimientos: RES_RequerimientoAlmacen[],
  options: {
    en_modo_auditable: boolean;
    almacenNombre: string;
    yearcito: string;
  },
) => {
  const sheet = workbook.addWorksheet("Requerimientos", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 4 }],
  });

  sheet.columns = COL_WIDTHS.map((w) => ({ width: w }));

  // Banda superior: título del reporte
  sheet.mergeCells("A1:L2");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `REPORTE DE REQUERIMIENTOS DE ALMACÉN - ${options.almacenNombre} - ${options.yearcito}`;
  titleCell.font = {
    bold: true,
    size: 16,
    color: { argb: "FF0F172A" },
    name: "Arial",
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  // Subtítulo: fecha de generación
  const metaRow = sheet.getRow(3);
  metaRow.getCell(1).value = `Generado: ${dayjs().format("DD/MM/YYYY HH:mm")}`;
  metaRow.getCell(1).font = {
    italic: true,
    size: 9,
    color: { argb: "FF64748B" },
    name: "Arial",
  };
  metaRow.getCell(1).alignment = { horizontal: "left" };

  // Cabeceras de columnas
  const headerRow = sheet.getRow(4);
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_HEADER_BG },
    };
    cell.font = {
      bold: true,
      color: { argb: COLOR_HEADER_TEXT },
      size: 10,
      name: "Arial",
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: COLOR_BORDER } },
      left: { style: "thin", color: { argb: COLOR_BORDER } },
      right: { style: "thin", color: { argb: COLOR_BORDER } },
      bottom: { style: "thin", color: { argb: COLOR_BORDER } },
    };
  });
  headerRow.height = 22;

  // Filtrar: anulados + auditable cuando modo auditoría ON
  const filtered = requerimientos.filter((r) => {
    if (r.estado === Estado_Requerimiento.Anulado) return false;
    if (options.en_modo_auditable && r.es_auditable) return false;
    return true;
  });

  if (filtered.length === 0) {
    const emptyRow = sheet.getRow(5);
    sheet.mergeCells("A5:L5");
    emptyRow.getCell(1).value =
      "No hay requerimientos para los filtros seleccionados (modo auditoría / mes / año / búsqueda).";
    emptyRow.getCell(1).font = {
      italic: true,
      color: { argb: "FF64748B" },
      name: "Arial",
    };
    emptyRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    return;
  }

  // Cargar todos los detalles en paralelo
  const detallesPorReq = new Map<
    number,
    Awaited<ReturnType<typeof AtencionService.obtenerDetallesRequerimiento>>["data"]
  >();

  await Promise.all(
    filtered.map(async (req) => {
      try {
        const resp = await AtencionService.obtenerDetallesRequerimiento(
          req.id_requerimiento,
        );
        if (resp.success && resp.data) {
          detallesPorReq.set(req.id_requerimiento, resp.data);
        } else {
          detallesPorReq.set(req.id_requerimiento, []);
        }
      } catch (err) {
        console.error("Error al obtener detalles para Excel", err);
        detallesPorReq.set(req.id_requerimiento, []);
      }
    }),
  );

  // Generar filas planas: una fila por (req × detalle)
  let rowIdx = 5;
  let counter = 0;

  for (const req of filtered) {
    const detalles = detallesPorReq.get(req.id_requerimiento) ?? [];
    const fechaSol = req.fecha_solicitud
      ? dayjs(req.fecha_solicitud).format("DD/MM/YYYY")
      : "—";
    const fechaEnt = req.fecha_entrega_requerida
      ? dayjs(req.fecha_entrega_requerida).format("DD/MM/YYYY")
      : "—";

    if (detalles.length === 0) {
      // Requerimiento sin detalles: una sola fila con guiones en producto/UM/cantidad
      counter += 1;
      writeRow(
        sheet,
        rowIdx,
        counter,
        req,
        fechaSol,
        fechaEnt,
        null,
        false,
        false,
      );
      rowIdx += 1;
      continue;
    }

    for (const det of detalles) {
      counter += 1;
      writeRow(
        sheet,
        rowIdx,
        counter,
        req,
        fechaSol,
        fechaEnt,
        det,
        true,
        det.es_auditable,
      );
      rowIdx += 1;
    }
  }
};

const writeRow = (
  sheet: ExcelJS.Worksheet,
  rowIdx: number,
  counter: number,
  req: RES_RequerimientoAlmacen,
  fechaSol: string,
  fechaEnt: string,
  det: RES_DetalleRequerimiento | null,
  hasDetalle: boolean,
  productoAuditable: boolean,
) => {
  const row = sheet.getRow(rowIdx);
  row.getCell(1).value = counter;
  row.getCell(2).value = req.correlativo;
  row.getCell(3).value = req.solicitante;
  row.getCell(4).value = req.labor || "—";
  row.getCell(5).value = fechaSol;
  row.getCell(6).value = fechaEnt;
  // Columna 7 = Turno: "Dia" | "Noche" | "—" (sin turno)
  row.getCell(7).value =
    req.tipo_turno === "Dia" || req.tipo_turno === "Noche"
      ? req.tipo_turno
      : "—";
  row.getCell(8).value = req.estado;
  row.getCell(9).value = det ? det.producto : "—";
  row.getCell(10).value = det ? det.unidad_medida_req_abv : "—";
  row.getCell(11).value = det ? Number(det.cantidad_solicitada || 0) : "—";
  row.getCell(12).value = det?.comentario || "";

  // Alineación
  row.getCell(1).alignment = { horizontal: "center" };
  row.getCell(2).alignment = { horizontal: "center" };
  row.getCell(3).alignment = { horizontal: "left" };
  row.getCell(4).alignment = { horizontal: "left" };
  row.getCell(5).alignment = { horizontal: "center" };
  row.getCell(6).alignment = { horizontal: "center" };
  row.getCell(7).alignment = { horizontal: "center" };
  row.getCell(8).alignment = { horizontal: "center" };
  row.getCell(9).alignment = { horizontal: "left" };
  row.getCell(10).alignment = { horizontal: "center" };
  row.getCell(11).alignment = { horizontal: "right" };
  row.getCell(12).alignment = { horizontal: "left", wrapText: true };

  // Estilo base (fuente + bordes)
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: "Arial", size: 10 };
    cell.border = {
      top: { style: "thin", color: { argb: COLOR_BORDER } },
      left: { style: "thin", color: { argb: COLOR_BORDER } },
      right: { style: "thin", color: { argb: COLOR_BORDER } },
      bottom: { style: "thin", color: { argb: COLOR_BORDER } },
    };
  });

  // Producto auditable: resaltar celda (solo si hay detalle y es auditable)
  if (hasDetalle && productoAuditable) {
    row.getCell(9).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_AUDITABLE_BG },
    };
    row.getCell(9).font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: COLOR_AUDITABLE_TEXT },
    };
  }

  // Estado coloreado
  const estadoBg = colorForEstado(req.estado);
  if (estadoBg) {
    row.getCell(8).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: estadoBg },
    };
    row.getCell(8).font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: COLOR_ESTADO_TEXT },
    };
  }

  void rowIdx;
};

export interface UseRequerimientosExcelParams {
  requerimientos: RES_RequerimientoAlmacen[];
  mes: string;
  yearcito: string;
  almacenNombre: string;
  en_modo_auditable: boolean;
}

/**
 * Helper que arma la configuración de useExcel y dispara la generación
 * del Excel. Usado directamente por la página de atención.
 */
export const useRequerimientosExcel = () => {
  const { notifyError } = useNotify();

  const generate = (params: UseRequerimientosExcelParams) => {
    const { mes, yearcito, almacenNombre } = params;
    const mesNombre =
      MESES.find((m) => m.value === String(mes))?.label || String(mes);
    const almacenSafe =
      almacenNombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "almacen";
    const filename = `requerimientos_${almacenSafe}_${mesNombre}_${yearcito}.xlsx`;

    return {
      filename,
      builder: async (workbook: ExcelJS.Workbook) => {
        try {
          await buildRequerimientosExcel(workbook, params.requerimientos, {
            en_modo_auditable: params.en_modo_auditable,
            almacenNombre: params.almacenNombre,
            yearcito: params.yearcito,
          });
        } catch (err) {
          console.error(err);
          notifyError("No se pudo generar el Excel de requerimientos");
          throw err;
        }
      },
    };
  };

  return { generate };
};
