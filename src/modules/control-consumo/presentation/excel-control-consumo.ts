import type ExcelJS from "exceljs";
import dayjs from "dayjs";
import { MESES } from "../../../shared/variables/meses";
import type {
  RES_Consumo,
  RES_ConsumoDirecto,
  RES_ResumenEntregasReq,
} from "../service/control-consumo.responses";
import { formatNumber } from "../../../shared/functions/formatNumber";

const COLOR_HEADER_BG = "FF1E3A8A";
const COLOR_HEADER_TEXT = "FFFFFFFF";
const COLOR_BORDER = "FFCBD5E1";
const COLOR_ROW_ALT = "FFFAFAFA";
const COLOR_COST = "FFF0FDF4";
const COLOR_AUDITABLE_BG = "FFFEE2E2";
const COLOR_AUDITABLE_TEXT = "FF991B1B";
const COLOR_TOTAL_BG = "FFE2E8F0";

const HEADERS: Array<{ key: string; title: string; width: number }> = [
  { key: "item", title: "#", width: 5 },
  { key: "fecha_req", title: "Fecha Req.", width: 12 },
  { key: "mes", title: "Mes", width: 12 },
  { key: "tipo_turno", title: "Turno", width: 12 },
  { key: "lote_solicitante", title: "N° Lote", width: 24 },
  { key: "almacen", title: "Almacén", width: 20 },
  { key: "consumidor", title: "Consumidor", width: 18 }, // puede ser la labor de destino, un activo fijo (consumo directo por registro de uso o por mantenimiento) o un cliente
  { key: "tipo_bien", title: "Sistema de Costos", width: 12 },
  { key: "producto", title: "Producto", width: 30 },
  { key: "u_base", title: "U.M.", width: 10 },
  { key: "moneda", title: "Moneda", width: 8 },
  { key: "costo_unitario", title: "Precio Unit.", width: 14 },
  { key: "cant_entregada_base", title: "Cant. Entregada", width: 14 },
  { key: "costo_entregado", title: "Costo Entregado", width: 16 },
  { key: "cant_consumida_total", title: "Cantidad Consumida", width: 14 },
  { key: "costo_total_consumo", title: "Costo Consumo", width: 16 },
  { key: "fecha_consumo", title: "F. Consumo", width: 16 },
  { key: "comentario", title: "Comentario", width: 36 },

  // { key: "solicitante", title: "Solicitante", width: 26 },
  // { key: "cargo_solicitante", title: "Cargo Solicitante", width: 18 },
  // { key: "mina", title: "Mina", width: 18 },
  // { key: "categoria", title: "Sistema de Costos", width: 18 },
  // { key: "lote_producto", title: "Lote Producto", width: 16 },
  // { key: "restante_base", title: "Restante", width: 13 },
  // { key: "costo_restante", title: "Costo Restante", width: 16 },
  // { key: "estado", title: "Estado", width: 14 },
  // { key: "lote_mineral", title: "Lote Mineral", width: 14 },
  // { key: "mina_lote", title: "Mina Lote", width: 16 },
  // { key: "labor_lote", title: "Labor Lote", width: 16 },
  // { key: "empleado_registro", title: "Empleado Reg.", width: 24 },
  // { key: "cargo_registro", title: "Cargo Reg.", width: 18 },
  // { key: "estado_consumo", title: "Estado Consumo", width: 14 },
  // { key: "para_mantenimiento", title: "Mant.?", width: 8 },
  // { key: "para_produccion", title: "Prod.?", width: 8 },
  // { key: "af_consumidor", title: "Activo Fijo", width: 14 },
  // { key: "marca_af", title: "Marca AF", width: 16 },
  // { key: "modelo_af", title: "Modelo AF", width: 16 },
  // { key: "costo_af", title: "Costo AF", width: 14 },
  // { key: "labor_destino", title: "Labor Destino", width: 22 },
];

const COL_KEYS = HEADERS.map((h) => h.key);

/**
 * Convierte un índice numérico de columna (1-indexed) a letra Excel (ej: 1 -> A, 15 -> O).
 */
const getColLetter = (colIndex: number): string => {
  let letter = "";
  let temp = colIndex;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
};

/**
 * Aplana la estructura agrupada (requerimiento → entrega → detalle → consumos[])
 * y los consumos directos en una lista plana de filas.
 */
export const flattenConsumosForExcel = (
  reporte: RES_ResumenEntregasReq[],
  consumosDirectos: RES_ConsumoDirecto[] = [],
): Array<{
  consumo: RES_Consumo;
  detalle: RES_ResumenEntregasReq;
}> => {
  const flat: Array<{ consumo: RES_Consumo; detalle: RES_ResumenEntregasReq }> =
    [];

  // 1. Entregas por requerimiento
  reporte.forEach((det) => {
    if (!det.consumos || det.consumos.length === 0) {
      flat.push({
        consumo: {
          id_consumo: 0,
          id_requerimiento_almacen_entrega_detalle:
            det.id_entrega_requerimiento_detalle,
          id_activo_fijo_consumidor: null,
          id_labor_destino: null,
          id_empleado_registro: 0,
          empleado_registro: "",
          cantidad_base_consumida: 0,
          fecha_hora_consumo: "",
          comentario_consumo: null,
          created_at: "",
          estado: "Sin Consumir" as never,
          tipo_turno: null,
        },
        detalle: det,
      });
      return;
    }
    det.consumos.forEach((c) => flat.push({ consumo: c, detalle: det }));
  });

  // 2. Consumos directos originados en uso de maquinaria/activos
  consumosDirectos.forEach((cd) => {
    flat.push({
      consumo: {
        id_consumo: cd.id_consumo,
        id_requerimiento_almacen_entrega_detalle: 0,
        tipo_turno: cd.tipo_turno,
        id_activo_fijo_consumidor: cd.id_activo_fijo_consumidor,
        correlativo_activo_fijo_consumidor:
          cd.correlativo_activo_fijo_consumidor,
        producto_activo_fijo_consumidor: cd.producto_activo_fijo_consumidor,
        modelo_activo_fijo_consumidor: cd.modelo_activo_fijo_consumidor,
        costo_compra_activo_fijo_consumidor:
          cd.costo_compra_activo_fijo_consumidor,
        id_marca_activo_fijo_consumidor: cd.id_marca_activo_fijo_consumidor,
        marca_activo_fijo_consumidor: cd.marca_activo_fijo_consumidor,
        id_labor_destino: cd.id_labor_destino ?? null,
        labor: cd.labor_destino ?? null,
        id_empleado_registro: cd.id_empleado_registro,
        empleado_registro: cd.empleado_registro,
        id_cargo_registro: cd.id_cargo_registro,
        cargo_registro: cd.cargo_registro,
        cantidad_base_consumida: cd.cantidad_base_consumida,
        fecha_hora_consumo: cd.fecha_hora_consumo,
        comentario_consumo: cd.comentario_consumo,
        created_at: cd.created_at,
        estado: cd.estado,
        codigo_lote_mineral: cd.codigo_lote_mineral,
        costo_unitario_base: cd.costo_unitario_base,
        origen_costo_unitario: cd.origen_costo_unitario,
        costo_total_consumo: cd.costo_total_consumo,
        para_mantenimiento: cd.para_mantenimiento,
        para_produccion: cd.para_produccion,
        id_lote_mineral: cd.id_lote_mineral,
      },
      detalle: {
        id_entrega_requerimiento_detalle: -cd.id_consumo,
        id_requerimiento_almacen: 0,
        correlativo_requerimiento: "Consumo Directo",
        fecha_requerimiento: cd.fecha_hora_consumo,
        es_auditable: false,
        id_empleado_solicitante: cd.id_empleado_registro,
        id_contratista_solicitante: 0,
        solicitante: cd.empleado_registro,
        id_cargo_solicitante: cd.id_cargo_registro,
        cargo_solicitante: cd.cargo_registro,
        id_mina: cd.id_mina || 0,
        mina: cd.mina || "S/M",
        labor: cd.labor_destino || null,
        id_almacen_destino: cd.id_almacen,
        almacen_destino: cd.almacen,
        id_producto: cd.id_producto,
        producto: cd.producto,
        id_categoria: cd.id_categoria,
        categoria: cd.categoria,
        id_unidad_medida_base: cd.id_unidad_medida_base,
        unidad_medida_base: cd.unidad_medida_base,
        unidad_medida_base_abv: cd.unidad_medida_base_abv,
        moneda: cd.moneda || "PEN",
        id_unidad_medida_req: cd.id_unidad_medida,
        unidad_medida_req: cd.unidad_medida,
        unidad_medida_req_abv: cd.unidad_medida_abv,
        es_consumible: true,
        tipo_bien: cd.tipo_bien as never,
        cantidad_solicitada_base: cd.cantidad_base,
        cantidad_solicitada: cd.cantidad_consumo,
        id_requerimiento_almacen_entrega: 0,
        fecha_hora_entrega: cd.fecha_hora_consumo,
        cantidad_entregada_base: cd.cantidad_base_consumida,
        cantidad_entregada_req: cd.cantidad_consumo,
        cantidad_consumida_base: cd.cantidad_base_consumida,
        correlativo_lote_producto: cd.correlativo_lote_producto,
        costo_unitario_base: cd.costo_unitario_base,
        consumos: [],
      },
    });
  });

  return flat;
};

/**
 * Builder del Excel "plano" de Control de Consumo.
 */
export const buildControlConsumoExcel = async (
  workbook: ExcelJS.Workbook,
  reporte: RES_ResumenEntregasReq[],
  consumosDirectos: RES_ConsumoDirecto[] = [],
  mes: number,
  anio: number,
) => {
  const mesNombre = (
    MESES.find((m) => m.value === String(mes))?.label || String(mes)
  ).toUpperCase();

  const sheet = workbook.addWorksheet("Consumos", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 4 }],
  });

  sheet.columns = HEADERS.map((h) => ({ key: h.key, width: h.width }));

  const totalCols = HEADERS.length;
  const lastColLetter = getColLetter(totalCols);

  // Banda superior: título del reporte
  sheet.mergeCells(`A1:${lastColLetter}2`);
  const titleCell = sheet.getCell("A1");
  titleCell.value =
    "REPORTE DE CONTROL DE CONSUMO - ANÁLISIS DE COSTOS DE PRODUCCIÓN";
  titleCell.font = {
    bold: true,
    size: 16,
    color: { argb: "FF0F172A" },
    name: "Arial",
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  let rowIdx = 3;
  // Subtítulo: rango y totales
  const metaRow = sheet.getRow(rowIdx);
  const totalConsumosReq = reporte.reduce(
    (acc, d) => acc + (d.consumos?.length ?? 0),
    0,
  );
  const totalConsumosCount = totalConsumosReq + consumosDirectos.length;

  metaRow.getCell(1).value =
    `Período: ${mesNombre} ${anio}    •    Entregas Req: ${reporte.length}    •    Consumos Directos: ${consumosDirectos.length}    •    Total Consumos: ${totalConsumosCount}`;
  metaRow.getCell(1).font = {
    bold: true,
    size: 10,
    color: { argb: "FF475569" },
    name: "Arial",
  };
  metaRow.getCell(1).alignment = { horizontal: "left" };

  const genColStart = Math.max(1, totalCols - 2);
  const genColStartLetter = getColLetter(genColStart);
  const generatedCell = sheet.getCell(`${genColStartLetter}${rowIdx}`);
  generatedCell.value = `Generado: ${dayjs().format("DD/MM/YYYY HH:mm")}`;
  generatedCell.font = {
    italic: true,
    size: 9,
    color: { argb: "FF64748B" },
    name: "Arial",
  };
  generatedCell.alignment = { horizontal: "right" };
  sheet.mergeCells(`${genColStartLetter}${rowIdx}:${lastColLetter}${rowIdx}`);

  rowIdx += 1;

  // Cabeceras de las columnas
  const headerRow = sheet.getRow(rowIdx);
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.title;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_HEADER_BG },
    };
    cell.font = {
      bold: true,
      color: { argb: COLOR_HEADER_TEXT },
      size: 9,
      name: "Arial",
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: COLOR_BORDER } },
      left: { style: "thin", color: { argb: COLOR_BORDER } },
      right: { style: "thin", color: { argb: COLOR_BORDER } },
      bottom: { style: "thin", color: { argb: COLOR_BORDER } },
    };
  });
  headerRow.height = 26;

  rowIdx += 1;

  const flat = flattenConsumosForExcel(reporte, consumosDirectos);

  if (flat.length === 0) {
    sheet.mergeCells(`A${rowIdx}:${lastColLetter}${rowIdx + 1}`);
    const empty = sheet.getCell(`A${rowIdx}`);
    empty.value =
      "No hay consumos para los filtros seleccionados (mes / año / búsqueda).";
    empty.font = { italic: true, color: { argb: "FF64748B" }, name: "Arial" };
    empty.alignment = { vertical: "middle", horizontal: "center" };
    return;
  }

  let totalCantConsumida = 0;
  let totalCostoConsumo = 0;
  let totalRestante = 0;

  flat.forEach(({ consumo, detalle }, idx) => {
    const r = sheet.getRow(rowIdx);
    r.height = 22;
    const cantConsumidaBase = Number(consumo.cantidad_base_consumida ?? 0);
    const cantConsumidaTotalBase = Number(detalle.cantidad_consumida_base ?? 0);
    const cantEntregadaBase = Number(detalle.cantidad_entregada_base ?? 0);
    const restanteBase = cantEntregadaBase - cantConsumidaTotalBase;
    const costoUnit = Number(detalle.costo_unitario_base ?? 0);
    const costoEntregado = cantEntregadaBase * costoUnit;
    const costoRestante = restanteBase * costoUnit;
    const costoTotalConsumo =
      consumo.id_consumo === 0
        ? 0
        : Number(consumo.costo_total_consumo ?? cantConsumidaBase * costoUnit);
    const estadoConsumoCalc =
      cantConsumidaTotalBase >= cantEntregadaBase && cantEntregadaBase > 0
        ? "Consumo Total"
        : cantConsumidaTotalBase > 0
          ? "Consumo Parcial"
          : "Sin Consumir";

    totalCantConsumida += cantConsumidaBase;
    totalCostoConsumo += costoTotalConsumo;
    totalRestante += restanteBase;

    const paraMant =
      consumo.para_mantenimiento === true ||
      Number(consumo.para_mantenimiento) === 1;
    const paraProd =
      consumo.para_produccion === true || Number(consumo.para_produccion) === 1;

    // Formatear lote_solicitante: PRIMER_NOMBRE - CODIGO_LOTE (ej. ROBERTO - GN-12315)
    const solicitanteRaw = (detalle.solicitante || "").trim();
    const primerNombre = solicitanteRaw
      ? solicitanteRaw.split(" ")[0].toUpperCase()
      : "";
    const codigoLote =
      consumo.codigo_lote_mineral ||
      detalle.codigo_lote_mineral_destino ||
      detalle.correlativo_lote_producto ||
      "";
    let loteFormateado = "";
    if (primerNombre && codigoLote) {
      loteFormateado = `${primerNombre} - ${codigoLote}`;
    } else if (primerNombre) {
      loteFormateado = primerNombre;
    } else {
      loteFormateado = codigoLote;
    }

    // Formatear mes: Nombre del mes del requerimiento o del consumo
    const fechaParaMes =
      detalle.fecha_requerimiento || consumo.fecha_hora_consumo;
    const mesNum = fechaParaMes ? dayjs(fechaParaMes).month() + 1 : mes;
    const mesTexto = (
      MESES.find((m) => m.value === String(mesNum))?.label || String(mesNum)
    ).toUpperCase();

    // Determinar consumidor:
    // 1) Si tiene activo fijo consumidor: nombre legible del producto AF o su correlativo
    // 2) Si tiene destino original de activo fijo: correlativo_activo_fijo_destino
    // 3) Si tiene labor: labor_destino o labor del requerimiento
    // 4) Fallback a solicitante o mina
    const afConsumidor =
      consumo.producto_activo_fijo_consumidor ||
      consumo.correlativo_activo_fijo_consumidor ||
      detalle.correlativo_activo_fijo_destino;
    const laborConsumidor = consumo.labor || detalle.labor;
    const consumidorFinal = afConsumidor
      ? consumo.correlativo_activo_fijo_consumidor &&
        consumo.producto_activo_fijo_consumidor
        ? `${consumo.producto_activo_fijo_consumidor} (${consumo.correlativo_activo_fijo_consumidor})`
        : afConsumidor
      : laborConsumidor || detalle.solicitante || "General";

    r.values = {
      item: idx + 1,
      fecha_req: dayjs(detalle.fecha_requerimiento).format("DD/MM/YYYY"),
      mes: mesTexto,
      tipo_turno: consumo.tipo_turno ?? "-",
      lote_solicitante: loteFormateado,
      almacen: detalle.almacen_destino ?? "",
      consumidor: consumidorFinal,
      tipo_bien: detalle.tipo_bien ?? "",
      producto: detalle.producto ?? "",
      u_base: detalle.unidad_medida_base_abv ?? "",
      moneda: detalle.moneda ?? "PEN",
      cant_entregada_base: formatNumber(cantEntregadaBase),
      costo_entregado: formatNumber(costoEntregado),
      cant_consumida_total: formatNumber(cantConsumidaTotalBase),
      costo_unitario: formatNumber(costoUnit),
      costo_total_consumo: formatNumber(costoTotalConsumo),
      fecha_consumo: consumo.fecha_hora_consumo
        ? dayjs(consumo.fecha_hora_consumo).format("DD/MM/YYYY HH:mm")
        : "",
      comentario: consumo.comentario_consumo ?? "",

      // Campos comentados que se preservan en r.values por si se reactivan
      solicitante: detalle.solicitante ?? "",
      cargo_solicitante: detalle.cargo_solicitante ?? "",
      mina: detalle.mina ?? "",
      labor: detalle.labor ?? "",
      categoria: detalle.categoria ?? "",
      lote_producto: detalle.correlativo_lote_producto ?? "",
      restante_base: restanteBase,
      costo_restante: costoRestante,
      estado: estadoConsumoCalc,
      lote_mineral: consumo.codigo_lote_mineral ?? "",
      mina_lote: consumo.mina_lote_mineral ?? "",
      labor_lote: consumo.labor_lote_mineral ?? "",
      empleado_registro: consumo.empleado_registro ?? "",
      cargo_registro: consumo.cargo_registro ?? "",
      estado_consumo: consumo.estado ?? "",
      para_mantenimiento: paraMant ? "Sí" : "No",
      para_produccion: paraProd ? "Sí" : "No",
      af_consumidor:
        consumo.producto_activo_fijo_consumidor ||
        consumo.correlativo_activo_fijo_consumidor ||
        "",
      marca_af: consumo.marca_activo_fijo_consumidor ?? "",
      modelo_af: consumo.modelo_activo_fijo_consumidor ?? "",
      costo_af: Number(consumo.costo_compra_activo_fijo_consumidor ?? 0),
      labor_destino: consumo.labor ?? "",
    };

    r.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { size: 9, name: "Arial" };
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: COLOR_BORDER } },
        left: { style: "thin", color: { argb: COLOR_BORDER } },
        right: { style: "thin", color: { argb: COLOR_BORDER } },
        bottom: { style: "thin", color: { argb: COLOR_BORDER } },
      };

      const key = COL_KEYS[colNum - 1];
      if (
        key === "cant_entregada_base" ||
        key === "cant_consumida_total" ||
        key === "restante_base"
      ) {
        cell.numFmt = "0.0000";
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
      if (
        key === "costo_unitario" ||
        key === "costo_entregado" ||
        key === "costo_total_consumo" ||
        key === "costo_restante" ||
        key === "costo_af"
      ) {
        cell.numFmt = '"S/."#,##0.0000';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
      if (
        key === "item" ||
        key === "mes" ||
        key === "moneda" ||
        key === "u_base" ||
        key === "tipo_turno" ||
        key === "para_mantenimiento" ||
        key === "para_produccion"
      ) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    // Alternado
    if (idx % 2 === 1) {
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLOR_ROW_ALT },
        };
      });
    }

    // Resaltar filas con costo > 0 (en la columna de costo total)
    if (costoTotalConsumo > 0) {
      const cell = r.getCell(COL_KEYS.indexOf("costo_total_consumo") + 1);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLOR_COST },
      };
    }

    // Resaltar auditable
    if (detalle.es_auditable === true || Number(detalle.es_auditable) === 1) {
      const cellProducto = r.getCell(COL_KEYS.indexOf("producto") + 1);
      cellProducto.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLOR_AUDITABLE_BG },
      };
      cellProducto.font = {
        ...(cellProducto.font || {}),
        color: { argb: COLOR_AUDITABLE_TEXT },
        bold: true,
      };
    }

    rowIdx += 1;
  });

  // Fila Totalizadora
  const totalRow = sheet.getRow(rowIdx);
  totalRow.height = 24;

  // Encontrar la primera columna numérica de total para hacer el merge de la etiqueta
  const firstTotalColIdx = Math.min(
    ...[
      COL_KEYS.indexOf("cant_entregada_base"),
      COL_KEYS.indexOf("costo_entregado"),
      COL_KEYS.indexOf("cant_consumida_total"),
      COL_KEYS.indexOf("costo_total_consumo"),
    ].filter((idx) => idx !== -1),
  );

  const mergeEndCol =
    firstTotalColIdx !== Infinity && firstTotalColIdx > 0
      ? getColLetter(firstTotalColIdx)
      : "A";

  if (mergeEndCol !== "A") {
    sheet.mergeCells(`A${rowIdx}:${mergeEndCol}${rowIdx}`);
  }
  const labelTotalCell = totalRow.getCell(1);
  labelTotalCell.value = "TOTAL GENERAL DEL PERÍODO:";
  labelTotalCell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
  labelTotalCell.alignment = { vertical: "middle", horizontal: "right" };

  const totalCantEntregada = flat.reduce(
    (acc, d) => acc + Number(d.detalle.cantidad_entregada_base ?? 0),
    0,
  );
  const totalCantConsumidaDetalle = flat.reduce(
    (acc, d) => acc + Number(d.consumo.cantidad_base_consumida ?? 0),
    0,
  );
  const totalCostoEntregado = flat.reduce(
    (acc, d) =>
      acc +
      Number(d.detalle.cantidad_entregada_base ?? 0) *
        Number(d.detalle.costo_unitario_base ?? 0),
    0,
  );
  const totalCostoRestante = flat.reduce(
    (acc, d) =>
      acc +
      (Number(d.detalle.cantidad_entregada_base ?? 0) -
        Number(d.consumo.cantidad_base_consumida ?? 0)) *
        Number(d.detalle.costo_unitario_base ?? 0),
    0,
  );

  const setTotalCell = (key: string, val: number, fmt: string) => {
    const colIdx = COL_KEYS.indexOf(key);
    if (colIdx !== -1) {
      const cell = totalRow.getCell(colIdx + 1);
      cell.value = val;
      cell.numFmt = fmt;
    }
  };

  setTotalCell("cant_entregada_base", totalCantEntregada, "0.00");
  setTotalCell("cant_consumida_total", totalCantConsumidaDetalle, "0.00");
  setTotalCell("restante_base", totalRestante, "0.0000");
  setTotalCell("costo_entregado", totalCostoEntregado, '"S/."#,##0.00');
  setTotalCell("costo_total_consumo", totalCostoConsumo, '"S/."#,##0.00');
  setTotalCell("costo_restante", totalCostoRestante, '"S/."#,##0.00');

  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, size: 10, name: "Arial" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_TOTAL_BG },
    };
    cell.border = {
      top: { style: "double", color: { argb: "FF0F172A" } },
      bottom: { style: "double", color: { argb: "FF0F172A" } },
    };
  });
};

export interface BuildControlConsumoExcelParams {
  reporte: RES_ResumenEntregasReq[];
  consumosDirectos?: RES_ConsumoDirecto[];
  mes: number;
  anio: number;
}

/**
 * Helper que arma la configuración de useExcel y dispara la generación del Excel.
 */
export const useControlConsumoExcel = () => {
  const generate = (params: BuildControlConsumoExcelParams) => {
    const { reporte, consumosDirectos = [], mes, anio } = params;
    const mesNombre =
      MESES.find((m) => m.value === String(mes))?.label || String(mes);
    const filename = `Control_Consumo_Costos_${mesNombre}_${anio}.xlsx`;

    return {
      filename,
      builder: async (workbook: ExcelJS.Workbook) => {
        await buildControlConsumoExcel(
          workbook,
          reporte,
          consumosDirectos,
          mes,
          anio,
        );
      },
    };
  };

  return { generate };
};
