import type ExcelJS from "exceljs";
import dayjs from "dayjs";
import type { RES_ControlUsoLog } from "../service/control-uso.responses";
import { MESES } from "../../../shared/variables/meses";
import { Estado_ControlUso } from "../../../shared/enums/control-uso/estadoControlUso";

/**
 * Mapea `tipo_turno` (Dia / Noche / null) al label que se muestra en el
 * Excel. Si no hay turno seleccionado, devuelve "-" para que la celda
 * no quede visualmente vacia.
 */
const turnoLabel = (raw: string | number | null | undefined): string => {
  const v = (raw ?? "").toString().trim().toLowerCase();
  if (v === "noche") return "NOCHE";
  if (v === "dia" || v === "día") return "DÍA";
  return "-";
};

/**
 * Da formato a un registro de combustible para mostrarlo en una celda:
 * "50 gal" / "20 lt" / etc. Si no hay dato, devuelve "-" (igual que
 * turno) para que la celda no quede visualmente vacia.
 */
const formatCombustible = (
  info: { cantidad: number; unidad: string; producto: string } | undefined,
): string => {
  if (!info) return "-";
  const cant = Number(info.cantidad);
  if (!Number.isFinite(cant) || cant <= 0) return "-";
  // Truncamos a 2 decimales solo para display. El backend hace el
  // acumulado en double y conserva precision; en el Excel basta con
  // 2 decimales.
  const cantRedondeada = Math.round(cant * 100) / 100;
  const cantStr = cantRedondeada.toString().replace(/\.?0+$/, "");
  const unidad = (info.unidad ?? "").trim();
  return unidad ? `${cantStr} ${unidad}` : cantStr;
};

export const buildControlHorasExcel = async (
  workbook: ExcelJS.Workbook,
  logs: RES_ControlUsoLog[],
  mes: number,
  anio: number,
  consumosCombustiblePorUuid: Record<
    string,
    { cantidad: number; unidad: string; producto: string }
  > = {}
) => {
  const mesNombre = (MESES.find((m) => m.value === String(mes))?.label || String(mes)).toUpperCase();

  const COLOR_HEADER_BG = "FF1E3A8A"; // Indigo/Navy Dark
  const COLOR_HEADER_TEXT = "FFFFFFFF";
  const COLOR_BORDER = "FFCBD5E1";
  const COLOR_ROW_ALT = "FFF8FAFC";

  // Filtrar los registros anulados: NO aparecen en el Excel principal
  // (solo_activos para reportes).
  const horometroLogs = logs.filter((l) => {
    if (
      (l.estado ?? Estado_ControlUso.Activo).toString().toLowerCase() ===
      Estado_ControlUso.Anulado.toLowerCase()
    ) {
      return false;
    }
    return (
      l.cantidad_vueltas === null || l.cantidad_vueltas === undefined
    );
  });

  if (horometroLogs.length === 0) {
    const sheet = workbook.addWorksheet("Sin Registros", { views: [{ showGridLines: true }] });
    sheet.addRow(["No existen registros de horas de trabajo para el período seleccionado."]);
    return;
  }

  // Agrupar logs por Activo Fijo Y Lugar de Trabajo (Mina / Tercero / Ubicación)
  const gruposMap = new Map<string, RES_ControlUsoLog[]>();
  horometroLogs.forEach((l) => {
    let lugarKey = "TERCEROS";
    if (l.es_para_mina && l.mina) {
      lugarKey = l.mina.toUpperCase();
    } else if (l.cliente) {
      lugarKey = l.cliente.toUpperCase();
    } else if (l.ubicacion_activo) {
      lugarKey = l.ubicacion_activo.toUpperCase();
    }

    const groupKey = `${l.id_activo_fijo}_${lugarKey}`;
    const list = gruposMap.get(groupKey) || [];
    list.push(l);
    gruposMap.set(groupKey, list);
  });

  gruposMap.forEach((activoLogs) => {
    const primerLog = activoLogs[0];
    const nombreActivo = (primerLog.producto || primerLog.categoria || "EQUIPO").toUpperCase();
    const codigoActivo = (primerLog.codigo || primerLog.correlativo || "").toUpperCase();

    // Determinar Lugar de Trabajo específico
    let lugarTrabajo = "GENERAL";
    if (primerLog.es_para_mina && primerLog.mina) {
      lugarTrabajo = primerLog.mina.toUpperCase();
    } else if (primerLog.cliente) {
      lugarTrabajo = primerLog.cliente.toUpperCase();
    } else if (primerLog.ubicacion_activo) {
      lugarTrabajo = primerLog.ubicacion_activo.toUpperCase();
    }

    // Generar nombre de pestaña único (máx 31 caracteres)
    const labelSheet = codigoActivo ? `${codigoActivo} - ${lugarTrabajo}` : `${nombreActivo} - ${lugarTrabajo}`;
    const sheetTitle = labelSheet.slice(0, 30).replace(/[:\\/?*[\]]/g, "_");

    const sheet = workbook.addWorksheet(sheetTitle, { views: [{ showGridLines: true }] });

    // Columnas del formato de Horómetro. La columna COMBUSTIBLE va
    // antes de OBSERVACIONES y muestra la cantidad asignada al grupo
    // UUID una sola vez (en la primera fila de cada grupo).
    sheet.columns = [
      { key: "item", width: 7 },
      { key: "fecha", width: 14 },
      { key: "mes", width: 12 },
      { key: "cod_lote", width: 16 },
      { key: "equipo", width: 26 },
      { key: "turno", width: 10 },
      { key: "cliente", width: 28 },
      { key: "hora_inicio", width: 14 },
      { key: "hora_fin", width: 14 },
      { key: "horometro_inicio", width: 14 },
      { key: "horometro_fin", width: 14 },
      { key: "total_horas", width: 12 },
      { key: "precio_unitario", width: 14 },
      { key: "costo_total", width: 16 },
      { key: "combustible", width: 16 },
      { key: "observaciones", width: 30 },
    ];

    // Cabecera superior de la Hoja
    let rowIdx = 1;

    // Fila 1-2: Título Principal (ahora hasta columna P por la nueva
    // columna COMBUSTIBLE).
    sheet.mergeCells(`A${rowIdx}:P${rowIdx + 1}`);
    const titleCell = sheet.getCell(`A${rowIdx}`);
    titleCell.value = `CONTROL DE HORAS DE TRABAJO - ${nombreActivo} ${codigoActivo ? `(${codigoActivo})` : ""}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF0F172A" }, name: "Arial" };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    rowIdx += 3;

    // Fila Metadata del Equipo
    const metaRow1 = sheet.getRow(rowIdx);
    metaRow1.getCell("item").value = "NOMBRE DEL EQUIPO:";
    metaRow1.getCell("cod_lote").value = nombreActivo;
    sheet.mergeCells(`A${rowIdx}:C${rowIdx}`);
    sheet.mergeCells(`D${rowIdx}:G${rowIdx}`);
    metaRow1.getCell("item").font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    metaRow1.getCell("item").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } };
    metaRow1.getCell("cod_lote").font = { bold: true, size: 9 };

    const dateCell = sheet.getCell(`M${rowIdx}`);
    dateCell.value = "FECHA / MES:";
    dateCell.font = { bold: true, size: 9 };
    const valDateCell = sheet.getCell(`N${rowIdx}`);
    valDateCell.value = `${mesNombre} ${anio}`;
    valDateCell.font = { bold: true, size: 9 };
    rowIdx++;

    const metaRow2 = sheet.getRow(rowIdx);
    metaRow2.getCell("item").value = "LUGAR DE TRABAJO:";
    metaRow2.getCell("cod_lote").value = lugarTrabajo;
    sheet.mergeCells(`A${rowIdx}:C${rowIdx}`);
    sheet.mergeCells(`D${rowIdx}:G${rowIdx}`);
    metaRow2.getCell("item").font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    metaRow2.getCell("item").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } };
    metaRow2.getCell("cod_lote").font = { bold: true, size: 9 };
    rowIdx += 2;

    // Encabezados de Tabla (Fila Doble). Ponemos TODOS los valores en el
    // `values` object para evitar inconsistencias entre `getCell(key)` y
    // `row.values`. Las sub-cabeceras viven en headerRow2.
    const headerRow1 = sheet.getRow(rowIdx);
    headerRow1.values = {
      item: "ITEM",
      fecha: "FECHA",
      mes: "MES",
      cod_lote: "COD. LOTE",
      equipo: "N° EQUIPO",
      turno: "TURNO",
      cliente: "CLIENTE / TRABAJO",
      hora_inicio: "HORAS",
      horometro_inicio: "HORÓMETRO",
      total_horas: "TOTALES",
      // COMBUSTIBLE: celda simple (columna O). Aparece una sola vez por
      // grupo UUID en las filas de datos; el texto del header lo da el
      // values object aqui.
      combustible: "COMBUSTIBLE/GL",
      observaciones: "OBSERVACIONES",
    };

    sheet.mergeCells(`H${rowIdx}:I${rowIdx}`); // HORAS (INICIO - FIN)
    sheet.mergeCells(`J${rowIdx}:K${rowIdx}`); // HOROMETRO (INICIO - FIN)
    sheet.mergeCells(`L${rowIdx}:N${rowIdx}`); // TOTALES (HORAS | P.UNIT | TOTAL)

    rowIdx++;
    const headerRow2 = sheet.getRow(rowIdx);
    headerRow2.values = {
      hora_inicio: "INICIO",
      hora_fin: "TÉRMINO",
      horometro_inicio: "INICIO",
      horometro_fin: "TÉRMINO",
      total_horas: "T. HORAS",
      precio_unitario: "P. UNITARIO",
      costo_total: "TOTAL S/.",
    };

    // Merge vertical para columnas fijas. Ahora COMBUSTIBLE (O) y
    // OBSERVACIONES (P) son columnas simples (una sola fila de cabecera).
    ["A", "B", "C", "D", "E", "F", "G", "O", "P"].forEach((col) => {
      sheet.mergeCells(`${col}${rowIdx - 1}:${col}${rowIdx}`);
    });

    // Estilar Encabezados
    for (let r = rowIdx - 1; r <= rowIdx; r++) {
      const row = sheet.getRow(r);
      row.height = 20;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } };
        cell.font = { bold: true, color: { argb: COLOR_HEADER_TEXT }, size: 9, name: "Arial" };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: COLOR_BORDER } },
          bottom: { style: "thin", color: { argb: COLOR_BORDER } },
          left: { style: "thin", color: { argb: COLOR_BORDER } },
          right: { style: "thin", color: { argb: COLOR_BORDER } },
        };
      });
    }

    rowIdx++;

    // Filas de Datos
    let sumHoras = 0;
    let sumCosto = 0;
    // UUID del grupo ya pintado en la columna COMBUSTIBLE. Lo usamos
    // para mostrar la cantidad UNA sola vez por grupo UUID (en la
    // primera fila de cada grupo).
    let lastUuidPintado: string | null | undefined = "__UNSET__";

    activoLogs.forEach((log, idx) => {
      const row = sheet.getRow(rowIdx);
      row.height = 19;

      const inicioDt = dayjs(log.fecha_hora_inicio_control);
      const finDt = log.fecha_hora_fin_control ? dayjs(log.fecha_hora_fin_control) : null;

      const clienteNombre = log.es_para_mina
        ? [log.mina, log.labor].filter(Boolean).join(" - ")
        : log.cliente || "GENERAL";

      const horasVal = Number(log.total_horas || 0);
      const precioVal = Number(log.precio_unitario || 0);
      const costoVal = Number(log.costo_total || 0);

      sumHoras += horasVal;
      sumCosto += costoVal;

      // TURNO: leemos el valor real de la API (Dia / Noche / null) y lo
      // mapeamos a DÍA / NOCHE / "" via el helper. Antes estaba
      // hardcodeado a "DÍA" (bug fix).
      const turnoTxt = turnoLabel(log.tipo_turno);

      // COMBUSTIBLE: solo pintamos la celda en la primera fila de cada
      // grupo UUID; las filas siguientes del mismo grupo quedan vacias
      // (asi no aparece "50 gal 50 gal 50 gal" en cada fila).
      const uuidActual = log.uuid_grupo ?? null;
      let combustibleTxt = "";
      if (lastUuidPintado !== uuidActual) {
        const info = uuidActual
          ? consumosCombustiblePorUuid[uuidActual]
          : undefined;
        combustibleTxt = formatCombustible(info);
        lastUuidPintado = uuidActual;
      }

      row.values = {
        item: idx + 1,
        fecha: inicioDt.format("DD/MM/YYYY"),
        mes: mesNombre,
        cod_lote: log.lote_mineral || "-",
        equipo: log.codigo || codigoActivo || nombreActivo,
        turno: turnoTxt,
        cliente: clienteNombre,
        hora_inicio: inicioDt.format("hh:mm a"),
        hora_fin: finDt ? finDt.format("hh:mm a") : "-",
        horometro_inicio: log.horometro_inicio !== null ? Number(log.horometro_inicio) : "-",
        horometro_fin: log.horometro_fin !== null ? Number(log.horometro_fin) : "-",
        total_horas: horasVal,
        precio_unitario: precioVal,
        costo_total: costoVal,
        combustible: combustibleTxt,
        observaciones: log.observacion || "-",
      };

      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font = { size: 9, name: "Arial" };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: COLOR_BORDER } },
          bottom: { style: "thin", color: { argb: COLOR_BORDER } },
          left: { style: "thin", color: { argb: COLOR_BORDER } },
          right: { style: "thin", color: { argb: COLOR_BORDER } },
        };

        if (colNum === 12) cell.numFmt = "0.00";
        if (colNum === 13 || colNum === 14) cell.numFmt = '"S/."#,##0.00';
      });

      if (idx % 2 === 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ROW_ALT } };
        });
      }

      rowIdx++;
    });

    // Fila Totalizadora
    const totalRow = sheet.getRow(rowIdx);
    totalRow.height = 22;
    sheet.mergeCells(`A${rowIdx}:K${rowIdx}`);
    const labelTotalCell = sheet.getCell(`A${rowIdx}`);
    labelTotalCell.value = "TOTAL GENERAL DEL MES:";
    labelTotalCell.font = { bold: true, size: 9.5, color: { argb: "FF0F172A" } };
    labelTotalCell.alignment = { vertical: "middle", horizontal: "right" };

    totalRow.getCell("total_horas").value = sumHoras;
    totalRow.getCell("total_horas").numFmt = "0.00";
    totalRow.getCell("costo_total").value = sumCosto;
    totalRow.getCell("costo_total").numFmt = '"S/."#,##0.00';

    totalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true, size: 10, name: "Arial" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      cell.border = {
        top: { style: "double", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
      };
    });
  });
};
