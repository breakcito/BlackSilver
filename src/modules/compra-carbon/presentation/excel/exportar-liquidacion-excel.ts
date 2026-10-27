import ExcelJS from "exceljs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type { CompraCarbonDetalleResponse } from "../../service/compra-carbon.responses";
import { downloadWorkbook } from "../../../../presentation/utils/excel/excel-utils";
import { round2 } from "../components/input-classes";

export const exportarLiquidacionExcel = async (
  compra: CompraCarbonDetalleResponse,
) => {
  const {
    cabecera,
    comprobantes_proveedor,
    pagos_directos,
    anticipos_utilizados,
  } = compra;

  // Las cargas anuladas no forman parte de la liquidacion.
  const cargas = compra.cargas.filter((c) => c.estado !== "Anulado");

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

  // ── Cabecera superior ────────────────────────────────────────────────
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
  ws.getCell("A4").value = "OC:";
  ws.getCell("A4").font = fontHeader;
  ws.mergeCells("C4:F4");
  ws.getCell("C4").value = cabecera.correlativo;
  ws.getCell("C4").font = { ...fontHeader, color: { argb: "FFC00000" } };

  // Datos bancarios del proveedor registrados en la orden (pueden ser null).
  const dash = "-";
  const numCuenta = cabecera.proveedor_cuenta_numero ?? dash;
  const cci = cabecera.proveedor_cuenta_cci ?? dash;
  const banco =
    cabecera.proveedor_cuenta_banco ??
    cabecera.proveedor_cuenta_banco_abv ??
    dash;

  ws.mergeCells("A5:B5");
  ws.getCell("A5").value = "N° CUENTA:";
  ws.getCell("A5").font = fontHeader;
  ws.mergeCells("C5:F5");
  ws.getCell("C5").value = numCuenta;
  ws.getCell("C5").font = fontData;

  ws.mergeCells("A6:B6");
  ws.getCell("A6").value = "CCI:";
  ws.getCell("A6").font = fontHeader;
  ws.mergeCells("C6:F6");
  ws.getCell("C6").value = cci;
  ws.getCell("C6").font = fontData;

  ws.mergeCells("A7:B7");
  ws.getCell("A7").value = "BANCO:";
  ws.getCell("A7").font = fontHeader;
  ws.mergeCells("C7:F7");
  ws.getCell("C7").value = banco;
  ws.getCell("C7").font = fontData;

  // ws.getCell("N2").value = "FECHA EMISIÓN:";
  // ws.getCell("N2").font = fontHeader;
  // ws.getCell("O2").value = dayjs().format("DD/MM/YYYY");
  // ws.getCell("O2").font = fontData;

  // ── Cabecera de la tabla ─────────────────────────────────────────────
  // Fila 9; se reservan 1-7 para los datos de cabecera y datos bancarios.
  const headers = [
    "ITEM",
    "FECHA",
    "MES",
    "RUC",
    "RAZON SOCIAL",
    "ORDEN DE COMPRA",
    "N° TICKET",
    "ALMACEN",
    "PLACA",
    "LUGAR EXTRACCIÓN",
    "GUIA REMISIÓN",
    "GUIA TRANS.",
    "PRODUCTO",
    "TM",
    "% Ce",
    "P. BASE",
    "FLETE",
    "P. MATERIA PRIMA",
    "FECHA FACT.",
    "N° FACTURA",
    "SUBTOTAL (S/)",
  ];

  const headerRow = ws.getRow(9);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = fontHeader;
    cell.fill = fillHeader;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = borderThin;
  });
  headerRow.height = 24;

  let currentLine = 10;
  let totalTM = 0;
  let totalSubtotal = 0;

  cargas.forEach((c, index) => {
    const fIngreso = dayjs(c.fecha_hora_ingreso).locale("es");
    const mesNombre = fIngreso.format("MMMM").toUpperCase();

    // Comprobante del proveedor que ampara la carga.
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
      c.almacen_empresa_nombre ||
        c.almacen_cliente_direccion ||
        c.cliente_destino ||
        "—",
      c.placa,
      c.lugar_extraccion_nombre || c.lugar_extraccion_direccion || "—",
      c.guia_remitente || "—",
      c.guia_transportista || "—",
      c.tipo_carbon_nombre,
      Number(c.cantidad),
      Number(c.porcentaje_ceniza || 0),
      Number(c.precio_unitario || 0),
      Number(c.costo_flete_por_tonelada || 0),
      Number(c.precio_materia_prima || 0),
      cmp ? dayjs(cmp.fecha_emision).format("DD/MM/YYYY") : "—",
      cmp ? cmp.codigo_comprobante : "—",
      Number(c.subtotal || 0),
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
    totalSubtotal += Number(c.subtotal || 0);
    currentLine++;
  });

  // ── Fila resumen de tabla ────────────────────────────────────────────
  const sumRow = ws.getRow(currentLine);
  sumRow.getCell(13).value = "TOTAL TM:";
  sumRow.getCell(13).font = fontHeader;
  sumRow.getCell(14).value = round2(totalTM);
  sumRow.getCell(14).font = fontHeader;
  sumRow.getCell(14).numFmt = "#,##0.00";
  sumRow.getCell(14).border = borderThin;

  sumRow.getCell(20).value = "SUBTOTAL:";
  sumRow.getCell(20).font = fontHeader;
  sumRow.getCell(21).value = round2(totalSubtotal);
  sumRow.getCell(21).font = fontHeader;
  sumRow.getCell(21).numFmt = "S/ #,##0.00";
  sumRow.getCell(21).border = borderThin;
  currentLine += 2;

  // ── Cascada contable ─────────────────────────────────────────────────
  // Misma cadena que usa el comprobante del proveedor:
  // subtotal -> base imponible -> IGV -> importe total -> detraccion -> neto.
  const aplicaIgv = Boolean(cabecera.aplica_igv);
  const pctIgv = Number(cabecera.porcentaje_igv || 0);
  const pctDetraccion = Number(cabecera.porcentaje_detraccion || 0);

  const subtotal = round2(totalSubtotal);
  const totalAnticipos = round2(
    (anticipos_utilizados || []).reduce(
      (acc, ant) => acc + Number(ant.monto_retirado || 0),
      0,
    ),
  );
  const baseImponible = round2(Math.max(0, subtotal - totalAnticipos));
  const igvCalculado =
    pctIgv > 0 ? round2((baseImponible * pctIgv) / 100) : 0;
  const importeTotal = round2(baseImponible + igvCalculado);
  const detraccionCalculada =
    pctDetraccion > 0 ? round2((importeTotal * pctDetraccion) / 100) : 0;
  const netoAPagar = round2(importeTotal - detraccionCalculada);

  // Pagos netos ya realizados: con IGV se registran en los comprobantes, sin
  // IGV son los pagos directos registrados contra las cargas.
  const pagosNetosRealizados = round2(
    aplicaIgv
      ? comprobantes_proveedor.reduce(
          (acc, cp) => acc + Number(cp.avance_pago_neto || 0),
          0,
        )
      : pagos_directos.reduce(
          (acc, p) =>
            p.es_para_detraccion ? acc : acc + Number(p.monto_pagado || 0),
          0,
        ),
  );
  const saldoAPagar = round2(Math.max(0, netoAPagar - pagosNetosRealizados));

  // Detraccion retenida que aun no se ha depositado en la cuenta de SUNAT.
  const detraccionADepositar = round2(
    aplicaIgv
      ? comprobantes_proveedor.reduce(
          (acc, cp) => acc + Number(cp.monto_detraccion || 0),
          0,
        )
      : 0,
  );
  const detraccionDepositada = round2(
    aplicaIgv
      ? comprobantes_proveedor.reduce(
          (acc, cp) => acc + Number(cp.avance_pago_detraccion || 0),
          0,
        )
      : 0,
  );
  const detraccionPendiente = round2(
    Math.max(0, detraccionADepositar - detraccionDepositada),
  );

  const addSummaryRow = (
    label: string,
    value: number,
    isBold: boolean = false,
    isMinus: boolean = false,
  ) => {
    const r = ws.getRow(currentLine);
    ws.mergeCells(currentLine, 19, currentLine, 20);
    r.getCell(19).value = label;
    r.getCell(19).font = isBold ? fontHeader : fontData;
    r.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
    r.getCell(21).value = isMinus ? -Math.abs(value) : value;
    r.getCell(21).font = isBold ? fontHeader : fontData;
    r.getCell(21).numFmt = "S/ #,##0.00";
    r.getCell(21).border = borderThin;
    r.getCell(19).border = borderThin;
    currentLine++;
  };

  addSummaryRow("SUBTOTAL", subtotal);
  if (totalAnticipos > 0) {
    addSummaryRow("(-) ANTICIPOS AMORTIZADOS", totalAnticipos, false, true);
  }
  addSummaryRow("BASE IMPONIBLE", baseImponible);
  addSummaryRow(
    aplicaIgv ? `IGV (${pctIgv}%)` : "IGV (No aplica)",
    igvCalculado,
  );
  addSummaryRow("IMPORTE TOTAL", importeTotal, true);
  if (pctDetraccion > 0) {
    addSummaryRow(`(-) DETRACCIÓN (${pctDetraccion}%)`, detraccionCalculada, false, true);
  }
  addSummaryRow("NETO A PAGAR", netoAPagar, true);

  // Detalle de los anticipos amortizados en esta compra.
  if (anticipos_utilizados && anticipos_utilizados.length > 0) {
    currentLine++;
    const antHeader = ws.getRow(currentLine);
    antHeader.getCell(19).value = "ANTICIPOS APLICADOS:";
    antHeader.getCell(19).font = fontHeader;
    currentLine++;

    anticipos_utilizados.forEach((ant) => {
      const fAnt = ant.fecha_hora_pago
        ? dayjs(ant.fecha_hora_pago).format("DD/MM/YYYY")
        : "—";
      const desc = `${fAnt} - ${ant.medio_pago}`;
      addSummaryRow(desc, Number(ant.monto_retirado), false, true);
    });
  }

  // Pagos netos ya realizados y saldo final.
  if (pagosNetosRealizados > 0) {
    addSummaryRow("(-) PAGOS NETOS REALIZADOS", pagosNetosRealizados, false, true);
  }

  // La detraccion se retiene para depositarla en SUNAT: es una salida de caja
  // adicional al pago al proveedor y no debe quedar oculta en la cascada.
  const bloqueDetraccion = detraccionADepositar > 0;

  currentLine++;
  const saldoRow = ws.getRow(currentLine);
  ws.mergeCells(currentLine, 19, currentLine, 20);
  saldoRow.getCell(19).value = "SALDO A PAGAR:";
  saldoRow.getCell(19).font = { ...fontHeader, size: 10, color: { argb: "FF006100" } };
  saldoRow.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
  saldoRow.getCell(19).fill = fillSubheader;
  saldoRow.getCell(19).border = borderThin;

  saldoRow.getCell(21).value = saldoAPagar;
  saldoRow.getCell(21).font = { ...fontHeader, size: 11, color: { argb: "FF006100" } };
  saldoRow.getCell(21).fill = fillSubheader;
  saldoRow.getCell(21).numFmt = "S/ #,##0.00";
  saldoRow.getCell(21).border = borderThin;

  // Bloque de detraccion pendiente de depositar en SUNAT.
  if (bloqueDetraccion) {
    currentLine += 2;
    const detRow = ws.getRow(currentLine);
    ws.mergeCells(currentLine, 19, currentLine, 20);
    detRow.getCell(19).value = "DETRACCIÓN A DEPOSITAR (SUNAT):";
    detRow.getCell(19).font = { ...fontHeader, size: 9, color: { argb: "FF9C5700" } };
    detRow.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
    detRow.getCell(19).border = borderThin;
    detRow.getCell(21).value = detraccionADepositar;
    detRow.getCell(21).font = { ...fontHeader, size: 9, color: { argb: "FF9C5700" } };
    detRow.getCell(21).numFmt = "S/ #,##0.00";
    detRow.getCell(21).border = borderThin;

    currentLine++;
    const detPendRow = ws.getRow(currentLine);
    ws.mergeCells(currentLine, 19, currentLine, 20);
    detPendRow.getCell(19).value = "PENDIENTE DE DEPOSITAR:";
    detPendRow.getCell(19).font = { ...fontHeader, size: 9, color: { argb: "FFC00000" } };
    detPendRow.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
    detPendRow.getCell(19).border = borderThin;
    detPendRow.getCell(21).value = detraccionPendiente;
    detPendRow.getCell(21).font = { ...fontHeader, size: 9, color: { argb: "FFC00000" } };
    detPendRow.getCell(21).numFmt = "S/ #,##0.00";
    detPendRow.getCell(21).border = borderThin;
  }

  // Cargas que todavia no se han facturado al proveedor.
  const pendientes = cargas.filter(
    (c) => !c.id_comprobante_compra_carbon && c.estado !== "Anulado",
  );
  if (pendientes.length > 0) {
    currentLine += 2;
    const pendRow = ws.getRow(currentLine);
    ws.mergeCells(currentLine, 19, currentLine, 20);
    pendRow.getCell(19).value = "CARGAS PENDIENTES DE FACTURAR:";
    pendRow.getCell(19).font = { ...fontHeader, size: 9, color: { argb: "FF9C5700" } };
    pendRow.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
    pendRow.getCell(19).border = borderThin;
    pendRow.getCell(21).value = pendientes.length;
    pendRow.getCell(21).font = { ...fontHeader, size: 9, color: { argb: "FF9C5700" } };
    pendRow.getCell(21).border = borderThin;
  }

  // Ajustar anchos de columnas
  const colWidths = [
    6, 11, 10, 13, 24, 16, 12, 18, 11, 16, 14, 14, 14, 10, 8, 11, 11, 15, 12, 16, 15,
  ];
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  const filename = `LIQUIDACION_${cabecera.proveedor.replace(/\s+/g, "_")}_${cabecera.correlativo}`;
  await downloadWorkbook(wb, filename);
};
