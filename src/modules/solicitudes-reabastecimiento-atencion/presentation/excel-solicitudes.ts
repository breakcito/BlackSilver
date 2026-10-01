import type ExcelJS from "exceljs";
import dayjs from "dayjs";
import { SolicitudesAtencionService } from "../service/solicitudes-atencion.service";
import type {
  RES_Solicitud,
  RES_SolicitudDetalle,
} from "../../../service/responses/solicitudes-reabastecimiento/solicitud";
import { MESES } from "../../../shared/variables/meses";
import { useNotify } from "../../../hooks/useNotify";
import { Estado_Solicitud } from "../../../shared/enums/solicitud-reabastecimiento/solicitud";

const COLOR_HEADER_BG = "FF1E3A8A";
const COLOR_HEADER_TEXT = "FFFFFFFF";
const COLOR_BORDER = "FFCBD5E1";
const COLOR_AUDITABLE_BG = "FFFEE2E2";
const COLOR_AUDITABLE_TEXT = "FF991B1B";

// Estados de la solicitud -> color de fondo para la celda "Estado".
const COLOR_ESTADO_GENERADA = "FFDBEAFE"; // azul claro
const COLOR_ESTADO_EN_DESPACHO = "FFFEF3C7"; // ámbar claro
const COLOR_ESTADO_COMPLETADA = "FFDCFCE7"; // verde claro
const COLOR_ESTADO_CERRADA = "FFE2E8F0"; // gris claro
const COLOR_ESTADO_TEXT = "FF1E293B";

const HEADERS = [
  "#",
  "F. Solicitud",
  "Solicitud",
  "Almacén Solicitante",
  "Solicitante",
  "Premura",
  "F. Entrega Est.",
  "Estado",
  "Producto",
  "U.M.",
  "Cant. Solicitada",
  "Cant. Entregada",
  "Pendiente",
  "Medio Entrega",
  "Transportista / Agencia",
  "Guía Transportista",
  "Comentario",
];

const COL_WIDTHS = [
  5, 13, 16, 24, 28, 12, 13, 16, 28, 10, 14, 14, 14, 16, 24, 18, 38,
];

const colorForEstado = (estado: string | null | undefined): string | null => {
  if (!estado) return null;
  switch (estado) {
    case Estado_Solicitud.Generada:
      return COLOR_ESTADO_GENERADA;
    case Estado_Solicitud.EnDespacho:
      return COLOR_ESTADO_EN_DESPACHO;
    case Estado_Solicitud.Completada:
      return COLOR_ESTADO_COMPLETADA;
    case Estado_Solicitud.Cerrada:
      return COLOR_ESTADO_CERRADA;
    default:
      return null;
  }
};

/**
 * Builder del Excel "reporte" de Solicitudes de Reabastecimiento.
 * Una fila por (solicitud × detalle).
 *
 * Filtros aplicados:
 * - Excluye solicitudes Anuladas siempre.
 * - Si modo auditoría está activo, excluye solicitudes con `es_auditable = true`
 *   (mismo criterio que la lista).
 *
 * Colores:
 * - Producto auditable: celda en rojo.
 * - Estado de la solicitud: celda coloreada según estado.
 *
 * Estructura de columnas espejo del Excel de Requerimientos, mas una
 * columna extra de "Almacén Solicitante" y bloque "Medio Entrega /
 * Transportista / Guía Transportista" poblado desde la ultima entrega
 * registrada en `solicitud_reabastecimiento_entrega`.
 */
export const buildSolicitudesExcel = async (
  workbook: ExcelJS.Workbook,
  solicitudes: RES_Solicitud[],
  options: {
    en_modo_auditable: boolean;
    almacenNombre: string;
    yearcito: string;
  },
) => {
  const sheet = workbook.addWorksheet("Solicitudes", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 4 }],
  });

  sheet.columns = COL_WIDTHS.map((w) => ({ width: w }));

  // Banda superior: título del reporte
  sheet.mergeCells("A1:Q2");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `REPORTE DE SOLICITUDES DE REABASTECIMIENTO - ${options.almacenNombre} - ${options.yearcito}`;
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

  // Filtrar: anuladas + auditable cuando modo auditoría ON
  const filtered = solicitudes.filter((s) => {
    if (s.estado === Estado_Solicitud.Anulada) return false;
    if (options.en_modo_auditable && s.es_auditable) return false;
    return true;
  });

  if (filtered.length === 0) {
    const emptyRow = sheet.getRow(5);
    sheet.mergeCells("A5:Q5");
    emptyRow.getCell(1).value =
      "No hay solicitudes para los filtros seleccionados (modo auditoría / mes / año / búsqueda).";
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
  const detallesPorSol = new Map<
    number,
    Awaited<
      ReturnType<typeof SolicitudesAtencionService.obtenerDetallesSolicitud>
    >["data"]
  >();

  await Promise.all(
    filtered.map(async (sol) => {
      try {
        const resp = await SolicitudesAtencionService.obtenerDetallesSolicitud(
          sol.id_solicitud,
        );
        if (resp.success && resp.data) {
          detallesPorSol.set(sol.id_solicitud, resp.data);
        } else {
          detallesPorSol.set(sol.id_solicitud, []);
        }
      } catch (err) {
        console.error("Error al obtener detalles para Excel", err);
        detallesPorSol.set(sol.id_solicitud, []);
      }
    }),
  );

  // Generar filas planas: una fila por (solicitud × detalle)
  let rowIdx = 5;
  let counter = 0;

  for (const sol of filtered) {
    const detalles = detallesPorSol.get(sol.id_solicitud) ?? [];
    const fechaSol = sol.fecha_solicitud
      ? dayjs(sol.fecha_solicitud).format("DD/MM/YYYY")
      : "—";
    const fechaEnt = sol.fecha_entrega_requerida
      ? dayjs(sol.fecha_entrega_requerida).format("DD/MM/YYYY")
      : "—";

    // Datos del transportista (de la ultima entrega registrada).
    const transportista =
      sol.proveedor_transporte || sol.agencia_transporte || "—";
    const guia = sol.guia_transportista?.trim()
      ? sol.guia_transportista
      : "—";
    const medio = sol.medio_entrega || "—";

    if (detalles.length === 0) {
      counter += 1;
      writeRow(
        sheet,
        rowIdx,
        counter,
        sol,
        fechaSol,
        fechaEnt,
        medio,
        transportista,
        guia,
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
        sol,
        fechaSol,
        fechaEnt,
        medio,
        transportista,
        guia,
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
  sol: RES_Solicitud,
  fechaSol: string,
  fechaEnt: string,
  medio: string,
  transportista: string,
  guia: string,
  det: RES_SolicitudDetalle | null,
  hasDetalle: boolean,
  productoAuditable: boolean,
) => {
  const row = sheet.getRow(rowIdx);
  row.getCell(1).value = counter;
  row.getCell(2).value = fechaSol;
  row.getCell(3).value = sol.correlativo;
  row.getCell(4).value = sol.almacen_solicitante;
  row.getCell(5).value = sol.solicitado_por;
  row.getCell(6).value = sol.premura;
  row.getCell(7).value = fechaEnt;
  row.getCell(8).value = sol.estado;
  row.getCell(9).value = det ? det.producto : "—";
  row.getCell(10).value = det ? det.unidad_medida_sol_abv : "—";
  row.getCell(11).value = det ? Number(det.cantidad_solicitada || 0) : "—";
  row.getCell(12).value = det ? Number(det.cantidad_entregada || 0) : "—";
  row.getCell(13).value = det
    ? Number(det.cantidad_solicitada || 0) - Number(det.cantidad_entregada || 0)
    : "—";
  row.getCell(14).value = medio;
  row.getCell(15).value = transportista;
  row.getCell(16).value = guia;
  row.getCell(17).value = det?.comentario || "";

  // Alineación
  row.getCell(1).alignment = { horizontal: "center" };
  row.getCell(2).alignment = { horizontal: "center" };
  row.getCell(3).alignment = { horizontal: "center" };
  row.getCell(4).alignment = { horizontal: "left" };
  row.getCell(5).alignment = { horizontal: "left" };
  row.getCell(6).alignment = { horizontal: "center" };
  row.getCell(7).alignment = { horizontal: "center" };
  row.getCell(8).alignment = { horizontal: "center" };
  row.getCell(9).alignment = { horizontal: "left" };
  row.getCell(10).alignment = { horizontal: "center" };
  row.getCell(11).alignment = { horizontal: "right" };
  row.getCell(12).alignment = { horizontal: "right" };
  row.getCell(13).alignment = { horizontal: "right" };
  row.getCell(14).alignment = { horizontal: "left" };
  row.getCell(15).alignment = { horizontal: "left" };
  row.getCell(16).alignment = { horizontal: "left" };
  row.getCell(17).alignment = { horizontal: "left", wrapText: true };

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
  const estadoBg = colorForEstado(sol.estado);
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

export interface UseSolicitudesExcelParams {
  solicitudes: RES_Solicitud[];
  mes: string;
  yearcito: string;
  almacenNombre: string;
  en_modo_auditable: boolean;
}

/**
 * Helper que arma la configuración de useExcel y dispara la generación
 * del Excel. Usado directamente por la página de atención.
 */
export const useSolicitudesExcel = () => {
  const { notifyError } = useNotify();

  const generate = (params: UseSolicitudesExcelParams) => {
    const { mes, yearcito, almacenNombre } = params;
    const mesNombre =
      MESES.find((m) => m.value === String(mes))?.label || String(mes);
    const almacenSafe =
      almacenNombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "almacen";
    const filename = `solicitudes_${almacenSafe}_${mesNombre}_${yearcito}.xlsx`;

    return {
      filename,
      builder: async (workbook: ExcelJS.Workbook) => {
        try {
          await buildSolicitudesExcel(workbook, params.solicitudes, {
            en_modo_auditable: params.en_modo_auditable,
            almacenNombre: params.almacenNombre,
            yearcito: params.yearcito,
          });
        } catch (err) {
          console.error(err);
          notifyError("No se pudo generar el Excel de solicitudes");
          throw err;
        }
      },
    };
  };

  return { generate };
};
