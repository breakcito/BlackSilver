import ExcelJS from "exceljs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type {
  ComprobanteVentaCarbonItem,
  LiquidacionVentaCarbonItem,
  VentaCarbonResumen,
} from "../../service/venta-carbon.responses";
import { downloadWorkbook } from "../../../../presentation/utils/excel/excel-utils";
import { round2 } from "../forms/liquidacion-calculos";

// ---------------------------------------------------------------------------
// Estilos compartidos por todas las hojas del archivo
// ---------------------------------------------------------------------------
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

/**
 * Encabezados de la tabla de detalle de una carga.
 *
 * Se eliminaron del formato de compra las columnas de ALMACEN, LUGAR DE
 * EXTRACCION y FLETE: en una venta no aplican.
 */
const HEADERS_TABLA = [
  "ITEM",
  "FECHA",
  "MES",
  "RUC",
  "RAZON SOCIAL",
  "ORDEN DE COMPRA",
  "N° TICKET",
  "PLACA",
  "GUIA REMISIÓN",
  "GUIA TRANS.",
  "PRODUCTO",
  "TM",
  "% Ce",
  "P. BASE",
  "P. MATERIA PRIMA",
  "FECHA FACT.",
  "N° FACTURA",
  "SUBTOTAL (S/)",
];

/** Anchos de columna de la tabla de detalle. */
const ANCHOS_COLUMNAS = [
  6, 11, 10, 13, 24, 16, 12, 11, 14, 14, 14, 10, 8, 11, 15, 12, 16, 15,
];

/**
 * Indices (1-based) de las columnas donde se apoyan las cifras.
 *
 * La cascada contable se escribe sobre las ULTIMAS TRES columnas de la
 * tabla, igual que en el formato de compra: la etiqueta ocupa dos columnas
 * y el valor va en la ultima (SUBTOTAL).
 */
const COL_PRODUCTO = 11;
const COL_TM = 12;
const COL_PORC_CE = 13;
const COL_N_FACTURA = 17;
const COL_SUBTOTAL = 18;
/** Etiqueta de la cascada: ocupa las dos columnas previas al SUBTOTAL. */
const COL_CASCADA_ETIQUETA = COL_SUBTOTAL - 2;

/**
 * Totales de una liquidacion de venta.
 */
export interface TotalesLiquidacionVenta {
  subtotal: number;
  anticipos: number;
  baseImponible: number;
  igv: number;
  importeTotal: number;
  detraccion: number;
  neto: number;
  /** Pagos del neto ya realizados. */
  pagosNetosRealizados: number;
  saldoAPagar: number;
  /** Detraccion retenida que aun no se deposito en SUNAT. */
  detraccionADepositar: number;
  detraccionPendiente: number;
  totalTM: number;
  aplicaIgv: boolean;
  pctIgv: number;
  pctDetraccion: number;
}

/**
 * Calcula la cascada contable de una liquidacion de venta.
 *
 * Los importes salen del COMPROBANTE de la liquidacion (subtotal, anticipos
 * amortizados, base imponible, IGV, importe total, detraccion y neto). Si la
 * liquidacion todavia no tiene comprobante, se usan los totales de la propia
 * liquidacion.
 */
export const calcularTotalesLiquidacionVenta = (
  venta: VentaCarbonResumen,
  liquidacion: LiquidacionVentaCarbonItem,
): TotalesLiquidacionVenta => {
  const comprobante: ComprobanteVentaCarbonItem | null =
    liquidacion.comprobante ?? null;

  const subtotal = round2(
    comprobante ? Number(comprobante.subtotal) : Number(liquidacion.subtotal),
  );
  const anticipos = round2(
    comprobante ? Number(comprobante.monto_pagado_anticipos) : 0,
  );
  const baseImponible = round2(
    comprobante ? Number(comprobante.base_imponible) : subtotal - anticipos,
  );
  const igv = round2(
    comprobante ? Number(comprobante.monto_igv) : Number(liquidacion.monto_igv),
  );
  const importeTotal = round2(
    comprobante
      ? Number(comprobante.importe_total)
      : Number(liquidacion.total),
  );
  const detraccion = round2(
    comprobante
      ? Number(comprobante.monto_detraccion)
      : Number(liquidacion.monto_detraccion),
  );
  const neto = round2(
    comprobante ? Number(comprobante.monto_neto) : Number(liquidacion.neto_a_pagar),
  );

  const pagosNetosRealizados = round2(
    comprobante ? Number(comprobante.avance_pago_neto) : 0,
  );
  const detraccionDepositada = round2(
    comprobante ? Number(comprobante.avance_pago_detraccion) : 0,
  );

  const totalTM = round2(
    liquidacion.cargas.reduce(
      (acc, c) => acc + Number(c.cantidad_toneladas || 0),
      0,
    ),
  );

  return {
    subtotal,
    anticipos,
    baseImponible,
    igv,
    importeTotal,
    detraccion,
    neto,
    pagosNetosRealizados,
    saldoAPagar: round2(Math.max(0, neto - pagosNetosRealizados)),
    detraccionADepositar: detraccion,
    detraccionPendiente: round2(
      Math.max(0, detraccion - detraccionDepositada),
    ),
    totalTM,
    aplicaIgv: Number(venta.porcentaje_igv || 0) > 0,
    pctIgv: Number(venta.porcentaje_igv || 0),
    pctDetraccion: Number(venta.porcentaje_detraccion || 0),
  };
};

/**
 * Datos bancarios del PRIMER pago que NO es para detraccion (el del neto).
 */
interface DatosCuenta {
  numero: string | null;
  cci: string | null;
  banco: string | null;
}

/**
 * Primer pago del neto del comprobante de la liquidacion, si lo hay.
 */
const primerPagoNeto = (
  liquidacion: LiquidacionVentaCarbonItem,
): ComprobanteVentaCarbonItem["pagos"][number] | null => {
  const pagos = liquidacion.comprobante?.pagos ?? [];
  return (
    [...pagos]
      .filter((p) => !p.es_para_detraccion)
      .sort((a, b) => {
        const fa = a.fecha_hora_pago ?? "";
        const fb = b.fecha_hora_pago ?? "";
        if (fa === fb) return a.id_pago_venta_carbon - b.id_pago_venta_carbon;
        return fa < fb ? -1 : 1;
      })[0] ?? null
  );
};

/**
 * Escribe una fila "etiqueta: valor" de la cabecera superior, con la
 * etiqueta en A:B y el valor en C:F.
 */
const escribirFilaCabecera = (
  ws: ExcelJS.Worksheet,
  fila: number,
  etiqueta: string,
  valor: string,
  fuente: Partial<ExcelJS.Font>,
): void => {
  ws.mergeCells(fila, 1, fila, 2);
  ws.getCell(fila, 1).value = etiqueta;
  ws.getCell(fila, 1).font = fontHeader;
  ws.mergeCells(fila, 3, fila, 6);
  ws.getCell(fila, 3).value = valor;
  ws.getCell(fila, 3).font = fuente;
};

/**
 * Pinta una liquidacion de venta completa (cabecera, tabla de cargas,
 * resumen y cascada contable) dentro de una hoja.
 *
 * @param ws Hoja destino.
 * @param venta Venta a la que pertenece la liquidacion.
 * @param liquidacion Liquidacion a pintar.
 * @param filaInicio Fila donde arranca el bloque.
 * @returns La ultima fila usada por el bloque.
 */
export const pintarLiquidacionVentaEnHoja = (
  ws: ExcelJS.Worksheet,
  venta: VentaCarbonResumen,
  liquidacion: LiquidacionVentaCarbonItem,
  filaInicio: number,
): number => {
  const t = calcularTotalesLiquidacionVenta(venta, liquidacion);
  const comprobante = liquidacion.comprobante ?? null;

  let linea = filaInicio;

  // -- Cabecera del cliente ------------------------------------------------
  // En una venta el carbon se le vende a un cliente pero llega a otro: el
  // "PROVEEDOR" del formato es el cliente DESTINO, a donde llega la carga.
  const clienteDestino = venta.cliente_destino ?? "";
  const documentoDestino =
    venta.cliente_destino_ruc || venta.cliente_destino_dni || "";

  escribirFilaCabecera(
    ws,
    linea,
    "PROVEEDOR:",
    clienteDestino || "—",
    { ...fontHeader, size: 10, color: { argb: "FF1F497D" } },
  );
  linea++;

  escribirFilaCabecera(
    ws,
    linea,
    "RUC / DNI:",
    documentoDestino || "—",
    fontData,
  );
  linea++;

  // -- Cabecera de la orden -------------------------------------------------
  escribirFilaCabecera(
    ws,
    linea,
    "OC:",
    liquidacion.codigo_orden_compra || "—",
    { ...fontHeader, color: { argb: "FFC00000" } },
  );
  linea++;

  // Datos bancarios de la cuenta de la empresa donde se recibe el PRIMER
  // pago que no es para detraccion (el del neto).
  const dash = "-";
  const pago = primerPagoNeto(liquidacion);
  const cuenta: DatosCuenta = {
    numero: pago?.empresa_numero_cuenta ?? null,
    cci: pago?.empresa_cci ?? null,
    banco: pago?.empresa_banco ?? null,
  };

  escribirFilaCabecera(ws, linea, "N° CUENTA:", cuenta.numero ?? dash, fontData);
  linea++;
  escribirFilaCabecera(ws, linea, "CCI:", cuenta.cci ?? dash, fontData);
  linea++;
  escribirFilaCabecera(ws, linea, "BANCO:", cuenta.banco ?? dash, fontData);
  linea++;

  linea++;

  // -- Cabecera de la tabla -------------------------------------------------
  const headerRow = ws.getRow(linea);
  HEADERS_TABLA.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = fontHeader;
    cell.fill = fillHeader;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = borderThin;
  });
  headerRow.height = 24;
  linea++;

  liquidacion.cargas.forEach((c, index) => {
    const fIngreso = dayjs(c.fecha_hora_ingreso).locale("es");
    const mesNombre = fIngreso.format("MMMM").toUpperCase();

    const row = ws.getRow(linea);
    const values = [
      index + 1,
      fIngreso.format("DD/MM/YYYY"),
      mesNombre,
      venta.cliente_destino_ruc || "—",
      clienteDestino || "—",
      liquidacion.codigo_orden_compra || "—",
      c.codigo_ticket_balanza || "—",
      c.vehiculo_placa || "—",
      c.guia_remitente || "—",
      c.guia_transportista || "—",
      c.tipo_carbon || "—",
      Number(c.cantidad_toneladas || 0),
      Number(c.porcentaje_ceniza || 0),
      Number(c.precio_base || 0),
      Number(c.precio_materia_prima || 0),
      comprobante
        ? dayjs(comprobante.fecha_emision).format("DD/MM/YYYY")
        : "—",
      comprobante ? comprobante.codigo_comprobante : "—",
      Number(c.subtotal || 0),
    ];

    values.forEach((v, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = v;
      cell.font = fontData;
      cell.border = borderThin;
      if (typeof v === "number") {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        if (idx === COL_TM - 1 || idx === COL_PORC_CE - 1) {
          // TM y % Ce: numero simple.
          cell.numFmt = "#,##0.00";
        } else if (idx >= COL_PORC_CE) {
          // De P. BASE en adelante: montos en soles.
          cell.numFmt = "S/ #,##0.00";
        }
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    linea++;
  });

  // -- Fila resumen de tabla -----------------------------------------------
  const sumRow = ws.getRow(linea);
  sumRow.getCell(COL_PRODUCTO).value = "TOTAL TM:";
  sumRow.getCell(COL_PRODUCTO).font = fontHeader;
  sumRow.getCell(COL_TM).value = t.totalTM;
  sumRow.getCell(COL_TM).font = fontHeader;
  sumRow.getCell(COL_TM).numFmt = "#,##0.00";
  sumRow.getCell(COL_TM).border = borderThin;

  sumRow.getCell(COL_N_FACTURA).value = "SUBTOTAL:";
  sumRow.getCell(COL_N_FACTURA).font = fontHeader;
  sumRow.getCell(COL_SUBTOTAL).value = t.subtotal;
  sumRow.getCell(COL_SUBTOTAL).font = fontHeader;
  sumRow.getCell(COL_SUBTOTAL).numFmt = "S/ #,##0.00";
  sumRow.getCell(COL_SUBTOTAL).border = borderThin;
  linea += 2;

  // -- Cascada contable -----------------------------------------------------
  const addSummaryRow = (
    label: string,
    value: number,
    isBold: boolean = false,
    isMinus: boolean = false,
  ) => {
    const r = ws.getRow(linea);
    ws.mergeCells(linea, COL_CASCADA_ETIQUETA, linea, COL_SUBTOTAL - 1);
    r.getCell(COL_CASCADA_ETIQUETA).value = label;
    r.getCell(COL_CASCADA_ETIQUETA).font = isBold ? fontHeader : fontData;
    r.getCell(COL_CASCADA_ETIQUETA).alignment = {
      vertical: "middle",
      horizontal: "right",
    };
    r.getCell(COL_SUBTOTAL).value = isMinus ? -Math.abs(value) : value;
    r.getCell(COL_SUBTOTAL).font = isBold ? fontHeader : fontData;
    r.getCell(COL_SUBTOTAL).numFmt = "S/ #,##0.00";
    r.getCell(COL_SUBTOTAL).border = borderThin;
    r.getCell(COL_CASCADA_ETIQUETA).border = borderThin;
    linea++;
  };

  addSummaryRow("SUBTOTAL", t.subtotal);
  if (t.anticipos > 0) {
    addSummaryRow("(-) ANTICIPOS AMORTIZADOS", t.anticipos, false, true);
  }
  addSummaryRow("BASE IMPONIBLE", t.baseImponible);
  addSummaryRow(
    t.aplicaIgv ? `IGV (${t.pctIgv}%)` : "IGV (No aplica)",
    t.igv,
  );
  addSummaryRow("IMPORTE TOTAL", t.importeTotal, true);
  if (t.pctDetraccion > 0) {
    addSummaryRow(
      `(-) DETRACCIÓN (${t.pctDetraccion}%)`,
      t.detraccion,
      false,
      true,
    );
  }
  addSummaryRow("NETO A PAGAR", t.neto, true);

  // Detalle de los anticipos del cliente aplicados a esta liquidacion.
  if (comprobante && comprobante.anticipos_utilizados.length > 0) {
    linea++;
    const antHeader = ws.getRow(linea);
    ws.mergeCells(linea, COL_CASCADA_ETIQUETA, linea, COL_SUBTOTAL - 1);
    antHeader.getCell(COL_CASCADA_ETIQUETA).value = "ANTICIPOS APLICADOS:";
    antHeader.getCell(COL_CASCADA_ETIQUETA).font = fontHeader;
    antHeader.getCell(COL_CASCADA_ETIQUETA).alignment = {
      vertical: "middle",
      horizontal: "right",
    };
    antHeader.getCell(COL_CASCADA_ETIQUETA).border = borderThin;
    linea++;

    comprobante.anticipos_utilizados.forEach((ant) => {
      const fAnt = ant.fecha_hora_pago
        ? dayjs(ant.fecha_hora_pago).format("DD/MM/YYYY")
        : "—";
      const desc = `${fAnt} - ${ant.medio_pago}`;
      addSummaryRow(desc, Number(ant.monto_retirado), false, true);
    });
  }

  // Pagos netos ya realizados y saldo final.
  if (t.pagosNetosRealizados > 0) {
    addSummaryRow(
      "(-) PAGOS NETOS REALIZADOS",
      t.pagosNetosRealizados,
      false,
      true,
    );
  }

  linea++;
  const saldoRow = ws.getRow(linea);
  ws.mergeCells(linea, COL_CASCADA_ETIQUETA, linea, COL_SUBTOTAL - 1);
  saldoRow.getCell(COL_CASCADA_ETIQUETA).value = "SALDO A PAGAR:";
  saldoRow.getCell(COL_CASCADA_ETIQUETA).font = {
    ...fontHeader,
    size: 10,
    color: { argb: "FF006100" },
  };
  saldoRow.getCell(COL_CASCADA_ETIQUETA).alignment = {
    vertical: "middle",
    horizontal: "right",
  };
  saldoRow.getCell(COL_CASCADA_ETIQUETA).fill = fillSubheader;
  saldoRow.getCell(COL_CASCADA_ETIQUETA).border = borderThin;

  saldoRow.getCell(COL_SUBTOTAL).value = t.saldoAPagar;
  saldoRow.getCell(COL_SUBTOTAL).font = {
    ...fontHeader,
    size: 11,
    color: { argb: "FF006100" },
  };
  saldoRow.getCell(COL_SUBTOTAL).fill = fillSubheader;
  saldoRow.getCell(COL_SUBTOTAL).numFmt = "S/ #,##0.00";
  saldoRow.getCell(COL_SUBTOTAL).border = borderThin;

  // Bloque de detraccion pendiente de depositar en SUNAT.
  if (t.detraccionADepositar > 0) {
    linea += 2;
    const detRow = ws.getRow(linea);
    ws.mergeCells(linea, COL_CASCADA_ETIQUETA, linea, COL_SUBTOTAL - 1);
    detRow.getCell(COL_CASCADA_ETIQUETA).value =
      "DETRACCIÓN A DEPOSITAR (SUNAT):";
    detRow.getCell(COL_CASCADA_ETIQUETA).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FF9C5700" },
    };
    detRow.getCell(COL_CASCADA_ETIQUETA).alignment = {
      vertical: "middle",
      horizontal: "right",
    };
    detRow.getCell(COL_CASCADA_ETIQUETA).border = borderThin;
    detRow.getCell(COL_SUBTOTAL).value = t.detraccionADepositar;
    detRow.getCell(COL_SUBTOTAL).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FF9C5700" },
    };
    detRow.getCell(COL_SUBTOTAL).numFmt = "S/ #,##0.00";
    detRow.getCell(COL_SUBTOTAL).border = borderThin;

    linea++;
    const detPendRow = ws.getRow(linea);
    ws.mergeCells(linea, COL_CASCADA_ETIQUETA, linea, COL_SUBTOTAL - 1);
    detPendRow.getCell(COL_CASCADA_ETIQUETA).value = "PENDIENTE DE DEPOSITAR:";
    detPendRow.getCell(COL_CASCADA_ETIQUETA).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FFC00000" },
    };
    detPendRow.getCell(COL_CASCADA_ETIQUETA).alignment = {
      vertical: "middle",
      horizontal: "right",
    };
    detPendRow.getCell(COL_CASCADA_ETIQUETA).border = borderThin;
    detPendRow.getCell(COL_SUBTOTAL).value = t.detraccionPendiente;
    detPendRow.getCell(COL_SUBTOTAL).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FFC00000" },
    };
    detPendRow.getCell(COL_SUBTOTAL).numFmt = "S/ #,##0.00";
    detPendRow.getCell(COL_SUBTOTAL).border = borderThin;
  }

  return linea;
};

/**
 * Ajusta los anchos de las columnas de la tabla de detalle.
 */
const ajustarAnchosDetalle = (ws: ExcelJS.Worksheet): void => {
  ANCHOS_COLUMNAS.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
};

/**
 * Exporta la liquidacion de UNA venta (formato individual, una hoja).
 */
export const exportarLiquidacionVentaExcel = async (
  venta: VentaCarbonResumen,
  liquidacion: LiquidacionVentaCarbonItem,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Liquidación", {
    views: [{ showGridLines: true }],
  });

  pintarLiquidacionVentaEnHoja(ws, venta, liquidacion, 2);
  ajustarAnchosDetalle(ws);

  const filename = `LIQUIDACION_${(venta.cliente_destino ?? "VENTA").replace(/\s+/g, "_")}_${liquidacion.codigo_orden_compra ?? liquidacion.id_liquidacion_venta_carbon}`;
  await downloadWorkbook(wb, filename);
};
