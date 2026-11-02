import ExcelJS from "exceljs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type { CompraCarbonDetalleResponse } from "../../service/compra-carbon.responses";
import {
  downloadWorkbook,
  type ExcelBuilderFn,
} from "../../../../presentation/utils/excel/excel-utils";
import { round2 } from "../components/input-classes";

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

/** Encabezados de la tabla de detalle de una carga. */
const HEADERS_TABLA = [
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

/** Anchos de columna de la tabla de detalle. */
const ANCHOS_COLUMNAS = [
  6, 11, 10, 13, 24, 16, 12, 18, 11, 16, 14, 14, 14, 10, 8, 11, 11, 15, 12, 16, 15,
];

/**
 * Totales de una liquidacion. Se usan para pintar la cascada contable.
 */
export interface TotalesLiquidacion {
  /** Toneladas de las cargas que forman parte de la liquidacion. */
  totalTM: number;
  /** Suma de los subtotales de las cargas. */
  subtotal: number;
  /** Anticipos amortizados contra esta compra. */
  anticipos: number;
  /** Base imponible: subtotal menos anticipos. */
  baseImponible: number;
  igv: number;
  importeTotal: number;
  /** Detraccion redondeada a entero: es lo que se retiene. */
  detraccion: number;
  neto: number;
  /** Pagos netos ya realizados al proveedor. */
  pagosNetosRealizados: number;
  saldoAPagar: number;
  /** Detraccion retenida que aun no se deposito en SUNAT. */
  detraccionADepositar: number;
  detraccionDepositada: number;
  detraccionPendiente: number;
  /** Cargas todavia no facturadas al proveedor. */
  cargasPendientes: number;
  aplicaIgv: boolean;
  pctIgv: number;
  pctDetraccion: number;
}

/**
 * Datos bancarios de la cuenta del proveedor registrada en la orden.
 */
interface DatosCuenta {
  numero: string | null;
  cci: string | null;
  banco: string | null;
}

/** Opciones de pintado de un bloque de liquidacion dentro de una hoja. */
interface OpcionesBloque {
  /**
   * Escribe la cabecera del proveedor (PROVEEDOR + RUC/DNI) antes del bloque.
   * En el archivo individual es siempre true; en el colectivo se escribe una
   * sola vez por hoja.
   */
  incluirProveedor: boolean;
  /**
   * Cuenta bancaria del bloque anterior de la misma hoja. Los datos
   * bancarios solo se imprimen si son distintos a los del bloque anterior.
   */
  cuentaPrevia?: DatosCuenta | null;
}

/**
 * Calcula la cascada contable de una liquidacion.
 *
 * Es la misma cadena que usa el comprobante del proveedor:
 * subtotal -> base imponible -> IGV -> importe total -> detraccion -> neto.
 *
 * La detraccion se redondea a entero (sin decimales): es lo que se retiene y
 * queda guardado en el comprobante.
 */
export const calcularTotalesLiquidacion = (
  compra: CompraCarbonDetalleResponse,
): TotalesLiquidacion => {
  const {
    cabecera,
    comprobantes_proveedor,
    pagos_directos,
    anticipos_utilizados,
  } = compra;

  // Las cargas anuladas no forman parte de la liquidacion.
  const cargas = compra.cargas.filter((c) => c.estado !== "Anulado");

  const totalTM = cargas.reduce((acc, c) => acc + Number(c.cantidad || 0), 0);
  const subtotal = round2(
    cargas.reduce((acc, c) => acc + Number(c.subtotal || 0), 0),
  );

  const aplicaIgv = Boolean(cabecera.aplica_igv);
  const pctIgv = Number(cabecera.porcentaje_igv || 0);
  const pctDetraccion = Number(cabecera.porcentaje_detraccion || 0);

  const anticipos = round2(
    (anticipos_utilizados || []).reduce(
      (acc, ant) => acc + Number(ant.monto_retirado || 0),
      0,
    ),
  );
  const baseImponible = round2(Math.max(0, subtotal - anticipos));
  const igv = pctIgv > 0 ? round2((baseImponible * pctIgv) / 100) : 0;
  const importeTotal = round2(baseImponible + igv);
  const detraccion =
    pctDetraccion > 0 ? Math.round((importeTotal * pctDetraccion) / 100) : 0;
  const neto = round2(importeTotal - detraccion);

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
  const saldoAPagar = round2(Math.max(0, neto - pagosNetosRealizados));

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

  const pendientes = cargas.filter(
    (c) => !c.id_comprobante_compra_carbon && c.estado !== "Anulado",
  );

  return {
    totalTM: round2(totalTM),
    subtotal,
    anticipos,
    baseImponible,
    igv,
    importeTotal,
    detraccion,
    neto,
    pagosNetosRealizados,
    saldoAPagar,
    detraccionADepositar,
    detraccionDepositada,
    detraccionPendiente,
    cargasPendientes: pendientes.length,
    aplicaIgv,
    pctIgv,
    pctDetraccion,
  };
};

/**
 * Nombre de hoja seguro para Excel: maximo 31 caracteres y sin los
 * caracteres que Excel prohibe. Si ya existe, se agrega un sufijo.
 */
const nombreHojaSeguro = (base: string, usados: Set<string>): string => {
  const limpio = (base || "Hoja")
    .replace(/[\\/*?:[\]]/g, "-")
    .trim()
    .slice(0, 31);
  let nombre = limpio || "Hoja";
  let i = 2;
  while (usados.has(nombre.toLowerCase())) {
    const sufijo = ` (${i})`;
    nombre = `${limpio.slice(0, 31 - sufijo.length)}${sufijo}`;
    i++;
  }
  usados.add(nombre.toLowerCase());
  return nombre;
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
 * Pinta una liquidacion completa (cabecera de la OC, tabla de cargas,
 * resumen y cascada contable) dentro de una hoja.
 *
 * @param ws Hoja destino.
 * @param compra Detalle de la compra a liquidar.
 * @param filaInicio Fila donde arranca el bloque.
 * @param opciones Ver OpcionesBloque.
 * @returns La ultima fila usada por el bloque.
 */
export const pintarLiquidacionEnHoja = (
  ws: ExcelJS.Worksheet,
  compra: CompraCarbonDetalleResponse,
  filaInicio: number,
  opciones: OpcionesBloque = { incluirProveedor: true },
): number => {
  const { cabecera, comprobantes_proveedor, anticipos_utilizados } = compra;
  const t = calcularTotalesLiquidacion(compra);

  // Las cargas anuladas no forman parte de la liquidacion.
  const cargas = compra.cargas.filter((c) => c.estado !== "Anulado");

  let linea = filaInicio;

  // -- Cabecera del proveedor ----------------------------------------------
  if (opciones.incluirProveedor) {
    escribirFilaCabecera(
      ws,
      linea,
      "PROVEEDOR:",
      cabecera.proveedor,
      { ...fontHeader, size: 10, color: { argb: "FF1F497D" } },
    );
    linea++;

    escribirFilaCabecera(
      ws,
      linea,
      "RUC / DNI:",
      cabecera.proveedor_ruc || cabecera.proveedor_dni || "—",
      fontData,
    );
    linea++;
  }

  // -- Cabecera de la orden -------------------------------------------------
  escribirFilaCabecera(
    ws,
    linea,
    "OC:",
    cabecera.correlativo,
    { ...fontHeader, color: { argb: "FFC00000" } },
  );
  linea++;

  // Datos bancarios de la cuenta del proveedor registrada en la orden. Solo
  // se imprimen si son distintos a los del bloque anterior de la hoja.
  const dash = "-";
  const cuenta: DatosCuenta = {
    numero: cabecera.proveedor_cuenta_numero ?? null,
    cci: cabecera.proveedor_cuenta_cci ?? null,
    banco:
      cabecera.proveedor_cuenta_banco ??
      cabecera.proveedor_cuenta_banco_abv ??
      null,
  };
  const previa = opciones.cuentaPrevia ?? null;
  const cambiaronDatos =
    !previa ||
    previa.numero !== cuenta.numero ||
    previa.cci !== cuenta.cci ||
    previa.banco !== cuenta.banco;

  if (cambiaronDatos) {
    escribirFilaCabecera(
      ws,
      linea,
      "N° CUENTA:",
      cuenta.numero ?? dash,
      fontData,
    );
    linea++;
    escribirFilaCabecera(ws, linea, "CCI:", cuenta.cci ?? dash, fontData);
    linea++;
    escribirFilaCabecera(ws, linea, "BANCO:", cuenta.banco ?? dash, fontData);
    linea++;
  }
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

  cargas.forEach((c, index) => {
    const fIngreso = dayjs(c.fecha_hora_ingreso).locale("es");
    const mesNombre = fIngreso.format("MMMM").toUpperCase();

    // Comprobante del proveedor que ampara la carga.
    const cmp = comprobantes_proveedor.find(
      (cp) => cp.id_comprobante_compra_carbon === c.id_comprobante_compra_carbon,
    );

    const row = ws.getRow(linea);
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

    linea++;
  });

  // -- Fila resumen de tabla -----------------------------------------------
  const sumRow = ws.getRow(linea);
  sumRow.getCell(13).value = "TOTAL TM:";
  sumRow.getCell(13).font = fontHeader;
  sumRow.getCell(14).value = t.totalTM;
  sumRow.getCell(14).font = fontHeader;
  sumRow.getCell(14).numFmt = "#,##0.00";
  sumRow.getCell(14).border = borderThin;

  sumRow.getCell(20).value = "SUBTOTAL:";
  sumRow.getCell(20).font = fontHeader;
  sumRow.getCell(21).value = t.subtotal;
  sumRow.getCell(21).font = fontHeader;
  sumRow.getCell(21).numFmt = "S/ #,##0.00";
  sumRow.getCell(21).border = borderThin;
  linea += 2;

  // -- Cascada contable -----------------------------------------------------
  const addSummaryRow = (
    label: string,
    value: number,
    isBold: boolean = false,
    isMinus: boolean = false,
  ) => {
    const r = ws.getRow(linea);
    ws.mergeCells(linea, 19, linea, 20);
    r.getCell(19).value = label;
    r.getCell(19).font = isBold ? fontHeader : fontData;
    r.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
    r.getCell(21).value = isMinus ? -Math.abs(value) : value;
    r.getCell(21).font = isBold ? fontHeader : fontData;
    r.getCell(21).numFmt = "S/ #,##0.00";
    r.getCell(21).border = borderThin;
    r.getCell(19).border = borderThin;
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

  // Detalle de los anticipos amortizados en esta compra.
  if (anticipos_utilizados && anticipos_utilizados.length > 0) {
    linea++;
    const antHeader = ws.getRow(linea);
    antHeader.getCell(19).value = "ANTICIPOS APLICADOS:";
    antHeader.getCell(19).font = fontHeader;
    linea++;

    anticipos_utilizados.forEach((ant) => {
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

  // La detraccion se retiene para depositarla en SUNAT: es una salida de caja
  // adicional al pago al proveedor y no debe quedar oculta en la cascada.
  const bloqueDetraccion = t.detraccionADepositar > 0;

  linea++;
  const saldoRow = ws.getRow(linea);
  ws.mergeCells(linea, 19, linea, 20);
  saldoRow.getCell(19).value = "SALDO A PAGAR:";
  saldoRow.getCell(19).font = {
    ...fontHeader,
    size: 10,
    color: { argb: "FF006100" },
  };
  saldoRow.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
  saldoRow.getCell(19).fill = fillSubheader;
  saldoRow.getCell(19).border = borderThin;

  saldoRow.getCell(21).value = t.saldoAPagar;
  saldoRow.getCell(21).font = {
    ...fontHeader,
    size: 11,
    color: { argb: "FF006100" },
  };
  saldoRow.getCell(21).fill = fillSubheader;
  saldoRow.getCell(21).numFmt = "S/ #,##0.00";
  saldoRow.getCell(21).border = borderThin;

  // Bloque de detraccion pendiente de depositar en SUNAT.
  if (bloqueDetraccion) {
    linea += 2;
    const detRow = ws.getRow(linea);
    ws.mergeCells(linea, 19, linea, 20);
    detRow.getCell(19).value = "DETRACCIÓN A DEPOSITAR (SUNAT):";
    detRow.getCell(19).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FF9C5700" },
    };
    detRow.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
    detRow.getCell(19).border = borderThin;
    detRow.getCell(21).value = t.detraccionADepositar;
    detRow.getCell(21).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FF9C5700" },
    };
    detRow.getCell(21).numFmt = "S/ #,##0.00";
    detRow.getCell(21).border = borderThin;

    linea++;
    const detPendRow = ws.getRow(linea);
    ws.mergeCells(linea, 19, linea, 20);
    detPendRow.getCell(19).value = "PENDIENTE DE DEPOSITAR:";
    detPendRow.getCell(19).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FFC00000" },
    };
    detPendRow.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
    detPendRow.getCell(19).border = borderThin;
    detPendRow.getCell(21).value = t.detraccionPendiente;
    detPendRow.getCell(21).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FFC00000" },
    };
    detPendRow.getCell(21).numFmt = "S/ #,##0.00";
    detPendRow.getCell(21).border = borderThin;
  }

  // Cargas que todavia no se han facturado al proveedor.
  if (t.cargasPendientes > 0) {
    linea += 2;
    const pendRow = ws.getRow(linea);
    ws.mergeCells(linea, 19, linea, 20);
    pendRow.getCell(19).value = "CARGAS PENDIENTES DE FACTURAR:";
    pendRow.getCell(19).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FF9C5700" },
    };
    pendRow.getCell(19).alignment = { vertical: "middle", horizontal: "right" };
    pendRow.getCell(19).border = borderThin;
    pendRow.getCell(21).value = t.cargasPendientes;
    pendRow.getCell(21).font = {
      ...fontHeader,
      size: 9,
      color: { argb: "FF9C5700" },
    };
    pendRow.getCell(21).border = borderThin;
  }

  return linea;
};

/**
 * Ajusta los anchos de las 21 columnas de la tabla de detalle.
 */
const ajustarAnchosDetalle = (ws: ExcelJS.Worksheet): void => {
  ANCHOS_COLUMNAS.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
};

/**
 * Exporta la liquidacion de UNA compra (formato individual, una hoja).
 */
export const exportarLiquidacionExcel = async (
  compra: CompraCarbonDetalleResponse,
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Liquidación", {
    views: [{ showGridLines: true }],
  });

  pintarLiquidacionEnHoja(ws, compra, 2, { incluirProveedor: true });
  ajustarAnchosDetalle(ws);

  const filename = `LIQUIDACION_${compra.cabecera.proveedor.replace(/\s+/g, "_")}_${compra.cabecera.correlativo}`;
  await downloadWorkbook(wb, filename);
};

/** Compras agrupadas por proveedor. */
interface GrupoProveedor {
  idProveedor: number;
  proveedor: string;
  compras: CompraCarbonDetalleResponse[];
}

/**
 * Agrupa las compras por proveedor, conservando el orden de la lista
 * recibida.
 */
const agruparPorProveedor = (
  compras: CompraCarbonDetalleResponse[],
): GrupoProveedor[] => {
  const grupos: GrupoProveedor[] = [];
  const porId = new Map<number, GrupoProveedor>();

  for (const compra of compras) {
    const id = compra.cabecera.id_proveedor;
    let grupo = porId.get(id);
    if (!grupo) {
      grupo = {
        idProveedor: id,
        proveedor: compra.cabecera.proveedor,
        compras: [],
      };
      porId.set(id, grupo);
      grupos.push(grupo);
    }
    grupo.compras.push(compra);
  }

  return grupos;
};

/**
 * Pinta la hoja de un proveedor: la cabecera del proveedor y, dentro, un
 * bloque de liquidacion por cada OC.
 */
const pintarHojaProveedor = (
  wb: ExcelJS.Workbook,
  grupo: GrupoProveedor,
  nombreHoja: string,
): void => {
  const ws = wb.addWorksheet(nombreHoja, { views: [{ showGridLines: true }] });

  let linea = 2;
  let cuentaPrevia: DatosCuenta | null = null;

  grupo.compras.forEach((compra, index) => {
    const { cabecera } = compra;
    linea =
      pintarLiquidacionEnHoja(ws, compra, linea, {
        incluirProveedor: index === 0,
        cuentaPrevia,
      }) + 1;

    cuentaPrevia = {
      numero: cabecera.proveedor_cuenta_numero ?? null,
      cci: cabecera.proveedor_cuenta_cci ?? null,
      banco:
        cabecera.proveedor_cuenta_banco ??
        cabecera.proveedor_cuenta_banco_abv ??
        null,
    };
  });

  ajustarAnchosDetalle(ws);
};

/**
 * Construye el Excel con la liquidacion de VARIAS compras en un solo
 * archivo: una hoja por proveedor (con un bloque de liquidacion por OC
 * dentro).
 */
export const construirExcelLiquidacionMultiple = (
  compras: CompraCarbonDetalleResponse[],
): { filename: string; builder: ExcelBuilderFn } => {
  const grupos = agruparPorProveedor(compras);
  const filename = `LIQUIDACION_${dayjs().format("YYYY-MM-DD")}`;

  const builder: ExcelBuilderFn = async (workbook: ExcelJS.Workbook) => {
    const usados = new Set<string>();
    grupos.forEach((grupo) => {
      pintarHojaProveedor(
        workbook,
        grupo,
        nombreHojaSeguro(grupo.proveedor, usados),
      );
    });
  };

  return { filename, builder };
};
