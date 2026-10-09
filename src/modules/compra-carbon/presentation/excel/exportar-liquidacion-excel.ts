import ExcelJS from "exceljs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type { CompraCarbonDetalleResponse } from "../../service/compra-carbon.responses";
import { downloadWorkbook } from "../../../../presentation/utils/excel/excel-utils";

export const exportarLiquidacionExcel = async (
  compra: CompraCarbonDetalleResponse,
) => {
  const { cabecera, cargas, comprobantes_proveedor, anticipos_utilizados } = compra;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Liquidación", {
    views: [{ showGridLines: true }],
  });

  // Estilos base
  const fontHeader: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 9,
    bold: true,
    color: { argb: "FF000000" },
  };
  const fontData: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 8.5,
    color: { argb: "FF000000" },
  };
  const fillHeader: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" },
  };
  const fillSubheader: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F2F2" },
  };
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFBFBFBF" } },
    left: { style: "thin", color: { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
    right: { style: "thin", color: { argb: "FFBFBFBF" } },
  };

  // Cabecera superior
  ws.mergeCells("A2:B2");
  ws.getCell("A2").value = "PROVEEDOR:";
  ws.getCell("A2").font = fontHeader;
  ws.mergeCells("C2:F2");
  ws.getCell("C2").value = cabecera.proveedor;
  ws.getCell("C2").font = { ...fontHeader, size: 10, color: { argb: "FF1F497D" } };

  ws.mergeCells("A3:B3");
  ws.getCell("A3").value = "RUC / DNI:";
  ws.getCell("A3").font = fontHeader;
  ws.mergeCells("C3:F3");
  ws.getCell("C3").value = cabecera.proveedor_ruc || cabecera.proveedor_dni || "—";
  ws.getCell("C3").font = fontData;

  ws.mergeCells("A4:B4");
  ws.getCell("A4").value = "N° DE REPORTE:";
  ws.getCell("A4").font = fontHeader;
  ws.mergeCells("C4:F4");
  ws.getCell("C4").value = cabecera.correlativo;
  ws.getCell("C4").font = { ...fontHeader, color: { argb: "FFC00000" } };

  ws.getCell("N2").value = "FECHA EMISIÓN:";
  ws.getCell("N2").font = fontHeader;
  ws.getCell("O2").value = dayjs().format("DD/MM/YYYY");
  ws.getCell("O2").font = fontData;

  // Cabecera de la tabla (Fila 6 y 7)
  const headersRow1 = [
    "ITEM", "FECHA", "MES", "RUC", "RAZON SOCIAL", "ORDEN DE COMPRA",
    "N° TICKET", "ALMACEN", "PLACA", "LUGAR EXTRACCIÓN",
    "GUIA REMISIÓN", "GUIA TRANS.", "PRODUCTO", "TM", "% Ce",
    "P. BASE", "FLETE / TN", "P. MATERIA PRIMA", "FECHA FACT.", "N° FACTURA", "SUBTOTAL (S/)"
  ];

  const headerRow = ws.getRow(6);
  headersRow1.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = fontHeader;
    cell.fill = fillHeader;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = borderThin;
  });
  headerRow.height = 24;

  let currentLine = 7;
  let totalTM = 0;
  let subtotalGeneral = 0;

  cargas.forEach((c, index) => {
    const fIngreso = dayjs(c.fecha_hora_ingreso).locale("es");
    const mesNombre = fIngreso.format("MMMM").toUpperCase();
    const precioBase = Number(c.precio_unitario || 0);
    const flete = c.pagar_flete ? Number(c.costo_flete_por_tonelada || 0) : 0;
    const precioMateriaPrima = Math.max(0, precioBase - flete);
    const subtotalCarga = Number(c.subtotal_con_descuento || 0);

    // Buscar si está asignada a comprobante
    const cmp = comprobantes_proveedor.find(
      (cp) => cp.id_comprobante_compra_carbon === c.id_comprobante_compra_carbon,
    );

    const row = ws.getRow(currentLine);
    const values = [
      index + 1,
      fIngreso.format("DD/MM/YYYY"),
      mesNombre,
      cabecera.proveedor_ruc || cabecera.proveedor_dni || "—",
      cabecera.proveedor,
      cabecera.correlativo,
      c.codigo_ticket_balanza || "—",
      c.almacen_empresa_nombre || c.almacen_cliente_direccion || "—",
      c.placa,
      c.lugar_extraccion_nombre || "—",
      c.guia_remitente || "—",
      c.guia_transportista || "—",
      c.tipo_carbon_nombre,
      Number(c.cantidad),
      Number(c.porcentaje_ceniza || 0),
      precioBase,
      flete,
      precioMateriaPrima,
      cmp ? dayjs(cmp.fecha_emision).format("DD/MM/YYYY") : "—",
      cmp ? cmp.codigo_comprobante : (c.pago_directo_numero_operacion ? `Pago Op: ${c.pago_directo_numero_operacion}` : "—"),
      subtotalCarga,
    ];

    values.forEach((v, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = v;
      cell.font = fontData;
      cell.border = borderThin;
      if (typeof v === "number") {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        if (idx === 13 || idx === 14) {
          cell.numFmt = "#,##0.00";
        } else if (idx >= 15) {
          cell.numFmt = "S/ #,##0.00";
        }
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    totalTM += Number(c.cantidad);
    subtotalGeneral += subtotalCarga;
    currentLine++;
  });

  // Fila resumen de tabla
  const sumRow = ws.getRow(currentLine);
  sumRow.getCell(13).value = "TOTAL TM:";
  sumRow.getCell(13).font = fontHeader;
  sumRow.getCell(14).value = totalTM;
  sumRow.getCell(14).font = fontHeader;
  sumRow.getCell(14).numFmt = "#,##0.00";
  sumRow.getCell(14).border = borderThin;

  sumRow.getCell(20).value = "SUBTOTAL:";
  sumRow.getCell(20).font = fontHeader;
  sumRow.getCell(21).value = subtotalGeneral;
  sumRow.getCell(21).font = fontHeader;
  sumRow.getCell(21).numFmt = "S/ #,##0.00";
  sumRow.getCell(21).border = borderThin;
  currentLine += 2;

  // Bloque de Liquidación Final
  const aplicaIgv = Boolean(cabecera.aplica_igv);
  const igvCalculado = aplicaIgv ? Math.round(subtotalGeneral * (Number(cabecera.porcentaje_igv || 18) / 100) * 100) / 100 : 0;
  const totalConIgv = aplicaIgv ? subtotalGeneral + igvCalculado : subtotalGeneral;

  const totalDetraccion = comprobantes_proveedor.reduce(
    (acc, cp) => acc + Number(cp.monto_detraccion || 0),
    0,
  );
  const netoAPagar = subtotalGeneral; // La suma de subtotal con descuento

  const addSummaryRow = (label: string, value: number, isBold: boolean = false, isMinus: boolean = false) => {
    const r = ws.getRow(currentLine);
    r.getCell(19).value = label;
    r.getCell(19).font = isBold ? fontHeader : fontData;
    r.getCell(21).value = isMinus ? -Math.abs(value) : value;
    r.getCell(21).font = isBold ? fontHeader : fontData;
    r.getCell(21).numFmt = "S/ #,##0.00";
    r.getCell(21).border = borderThin;
    r.getCell(19).border = borderThin;
    currentLine++;
  };

  addSummaryRow("SUB TOTAL", subtotalGeneral);
  if (aplicaIgv) {
    addSummaryRow(`IGV (${cabecera.porcentaje_igv}%)`, igvCalculado);
    addSummaryRow("TOTAL", totalConIgv, true);
  }
  if (totalDetraccion > 0) {
    addSummaryRow("(-) DETRACCIÓN", totalDetraccion, false, true);
  }
  addSummaryRow("NETO A PAGAR", netoAPagar, true);

  // Anticipos aplicados
  const totalAnticipos = (anticipos_utilizados || []).reduce(
    (acc, ant) => acc + Number(ant.monto_retirado || 0),
    0,
  );

  if (anticipos_utilizados && anticipos_utilizados.length > 0) {
    currentLine++;
    const antHeader = ws.getRow(currentLine);
    antHeader.getCell(18).value = "ANTICIPOS APLICADOS:";
    antHeader.getCell(18).font = fontHeader;
    currentLine++;

    anticipos_utilizados.forEach((ant) => {
      const fAnt = ant.fecha_hora_pago ? dayjs(ant.fecha_hora_pago).format("DD/MM/YYYY") : "—";
      const desc = `${fAnt} - ${ant.medio_pago} ${ant.numero_operacion ? `(Op: ${ant.numero_operacion})` : ""}`;
      addSummaryRow(desc, Number(ant.monto_retirado), false, true);
    });
  }

  // Saldo a Pagar Final
  const saldoFinal = Math.max(0, netoAPagar - totalAnticipos);
  currentLine++;
  const saldoRow = ws.getRow(currentLine);
  saldoRow.getCell(19).value = "SALDO A PAGAR:";
  saldoRow.getCell(19).font = { ...fontHeader, size: 10, color: { argb: "FF006100" } };
  saldoRow.getCell(19).fill = fillSubheader;
  saldoRow.getCell(19).border = borderThin;

  saldoRow.getCell(21).value = saldoFinal;
  saldoRow.getCell(21).font = { ...fontHeader, size: 11, color: { argb: "FF006100" } };
  saldoRow.getCell(21).fill = fillSubheader;
  saldoRow.getCell(21).numFmt = "S/ #,##0.00";
  saldoRow.getCell(21).border = borderThin;

  // Ajustar anchos de columnas
  const colWidths = [
    6, 11, 10, 13, 24, 16, 12, 18, 11, 16, 14, 14, 14, 10, 8, 11, 11, 14, 12, 16, 15
  ];
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  const filename = `LIQUIDACION_${cabecera.proveedor.replace(/\s+/g, "_")}_${cabecera.correlativo}`;
  await downloadWorkbook(wb, filename);
};
