import ExcelJS from "exceljs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type {
  CompraCarbonDetalleResponse,
  CargaCompraCarbonItem,
  TransportistaFlete,
} from "../../service/compra-carbon.responses";
import { downloadWorkbook } from "../../../../presentation/utils/excel/excel-utils";
import { round2 } from "../components/input-classes";

const DASH = "-";

/**
 * Columnas del detalle. `col` es el índice 1-based dentro de la hoja.
 *
 * La hoja replica la disposicion de `liquidacion-flete.png`: cabecera de dos
 * niveles, una columna por placa de tracto (sin carreta), el bloque de guias
 * partido en remitente/transportista y el bloque de factura con la fecha, el
 * numero de comprobante y el subtotal del flete.
 */
const COLUMNAS = 19;

const C = {
  ITEM: 1,
  FECHA: 2,
  MES: 3,
  RUC: 4,
  RAZON_SOCIAL: 5,
  ORDEN_COMPRA: 6,
  TICKET: 7,
  ALMACEN: 8,
  PLACA: 9,
  LUGAR: 10,
  GUIA_REMISION: 11,
  GUIA_TRANSPORTISTA: 12,
  PRODUCTO: 13,
  TM: 14,
  P_BASE: 15,
  FLETE: 16,
  FACTURA_FECHA: 17,
  FACTURA_NUMERO: 18,
  FACTURA_SUBTOTAL: 19,
} as const;

/**
 * Exporta la liquidación de fletes de una compra, agrupando las cargas por
 * transportista. Solo tiene sentido si alguna carga tiene `pagar_flete`.
 */
export const exportarLiquidacionFleteExcel = async (
  compra: CompraCarbonDetalleResponse,
) => {
  const { cabecera, cargas, transportistas_flete } = compra;

  const cargasConFlete = cargas.filter(
    (c) => c.pagar_flete && c.estado !== "Anulado",
  );

  if (cargasConFlete.length === 0) {
    throw new Error(
      "Esta orden de compra no tiene cargas con flete por pagar al transportista.",
    );
  }

  // Una carga con flete pero sin transportista no se puede liquidar: es un
  // dato incompleto, no algo que se deba descartar en silencio.
  const sinTransportista = cargasConFlete.filter((c) => !c.id_transportista);
  if (sinTransportista.length > 0) {
    throw new Error(
      `Hay ${sinTransportista.length} carga(s) con flete pero sin transportista asignado (ticket ${sinTransportista
        .map((c) => c.codigo_ticket_balanza)
        .join(", ")}).`,
    );
  }

  const cuentaPorTransportista = new Map<number, TransportistaFlete>(
    (transportistas_flete || []).map((t) => [t.id_transportista, t]),
  );

  // Agrupar las cargas por transportista, conservando el orden de ingreso.
  const grupos = new Map<number, CargaCompraCarbonItem[]>();
  cargasConFlete.forEach((c) => {
    const id = c.id_transportista as number;
    const actual = grupos.get(id);
    if (actual) {
      actual.push(c);
    } else {
      grupos.set(id, [c]);
    }
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Liquidación de Fletes", {
    views: [{ showGridLines: true }],
  });

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
  const fontLabel: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 8.5,
    bold: true,
    color: { argb: "FF000000" },
  };
  const fillHeader: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E79" },
  };
  const fillTransportista: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFCD5B4" },
  };
  const fillTotales: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF2CC" },
  };
  const fillNeto: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF00B050" },
  };
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFBFBFBF" } },
    left: { style: "thin", color: { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
    right: { style: "thin", color: { argb: "FFBFBFBF" } },
  };
  const borderMedio: Partial<ExcelJS.Borders> = {
    top: { style: "medium", color: { argb: "FF000000" } },
    left: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "medium", color: { argb: "FF000000" } },
    right: { style: "medium", color: { argb: "FF000000" } },
  };

  const pctIgvFlete = Number(cabecera.porcentaje_igv_flete || 0);
  const pctDetraccionFlete = Number(cabecera.porcentaje_detraccion_flete || 0);

  let linea = 1;

  for (const [idTransportista, cargasGrupo] of grupos) {
    const transportista = cuentaPorTransportista.get(idTransportista);
    const razonSocial =
      transportista?.razon_social?.trim() ||
      cargasGrupo[0]?.transportista_razon_social ||
      "Transportista sin nombre";
    const ruc = transportista?.ruc || cargasGrupo[0]?.transportista_ruc || DASH;

    // ── Bloque de identificación del transportista ─────────────────────
    const bloqueIdentificacion: [string, string][] = [
      ["TRANSPORTISTA:", razonSocial],
      ["N° DE CUENTA:", transportista?.numero_cuenta || DASH],
      ["CCI:", transportista?.cci || DASH],
      ["NOMBRE DE BANCO:", transportista?.banco || DASH],
    ];

    bloqueIdentificacion.forEach(([label, valor]) => {
      const fila = ws.getRow(linea);
      ws.mergeCells(linea, 1, linea, 2);
      const celdaLabel = fila.getCell(1);
      celdaLabel.value = label;
      celdaLabel.font = fontLabel;
      celdaLabel.alignment = { vertical: "middle", horizontal: "left" };
      celdaLabel.fill = fillTransportista;
      celdaLabel.border = borderMedio;

      ws.mergeCells(linea, 3, linea, 6);
      const celdaValor = fila.getCell(3);
      celdaValor.value = valor;
      celdaValor.font = { ...fontData, bold: true };
      celdaValor.alignment = { vertical: "middle", horizontal: "center" };
      celdaValor.fill = fillTransportista;
      celdaValor.border = borderMedio;

      // La banda naranja se extiende hasta el final de la tabla. Se estilan
      // celda por celda (sin merge) para no dejar un rango combinado vacío.
      for (let c = 7; c <= COLUMNAS; c++) {
        fila.getCell(c).fill = fillTransportista;
        fila.getCell(c).border = borderMedio;
      }
      fila.height = 16;
      linea++;
    });

    // ── Cabecera de dos niveles ───────────────────────────────────────
    const filaNivel1 = ws.getRow(linea);
    const nivel1: [number, number, string][] = [
      [C.ITEM, C.ITEM, "ITEM"],
      [C.FECHA, C.FECHA, "FECHA"],
      [C.MES, C.MES, "MES"],
      [C.RUC, C.RUC, "RUC"],
      [C.RAZON_SOCIAL, C.RAZON_SOCIAL, "Razón Social"],
      [C.ORDEN_COMPRA, C.ORDEN_COMPRA, "Orden de Compra"],
      [C.TICKET, C.TICKET, "N° Ticket"],
      [C.ALMACEN, C.ALMACEN, "Almacén"],
      [C.PLACA, C.PLACA, "Placas"],
      [C.LUGAR, C.LUGAR, "Lugar de Extracción"],
      [C.GUIA_REMISION, C.GUIA_TRANSPORTISTA, "N° Guía"],
      [C.PRODUCTO, C.PRODUCTO, "Producto"],
      [C.TM, C.TM, "TM"],
      [C.P_BASE, C.FLETE, "Precios"],
      [C.FACTURA_FECHA, C.FACTURA_SUBTOTAL, "Factura"],
    ];
    nivel1.forEach(([desde, hasta, titulo]) => {
      if (desde !== hasta) {
        ws.mergeCells(linea, desde, linea, hasta);
      }
      const celda = filaNivel1.getCell(desde);
      celda.value = titulo;
      celda.font = { ...fontHeader, color: { argb: "FFFFFFFF" } };
      celda.fill = fillHeader;
      celda.alignment = { vertical: "middle", horizontal: "center" };
      for (let c = desde; c <= hasta; c++) {
        filaNivel1.getCell(c).fill = fillHeader;
        filaNivel1.getCell(c).border = borderThin;
      }
    });
    filaNivel1.height = 18;
    linea++;

    const filaNivel2 = ws.getRow(linea);
    const nivel2: [number, string][] = [
      [C.PLACA, "Tracto"],
      [C.GUIA_REMISION, "Remisión"],
      [C.GUIA_TRANSPORTISTA, "Transportista"],
      // "P. Base" es el precio del carbon transportado; el flete es lo que
      // realmente paga la empresa al transportista.
      [C.P_BASE, "P. Base (Carbón)"],
      [C.FLETE, "Flete / TN"],
      [C.FACTURA_FECHA, "Fecha"],
      [C.FACTURA_NUMERO, "N° Factura"],
      [C.FACTURA_SUBTOTAL, "Subtotal"],
    ];
    nivel2.forEach(([col, titulo]) => {
      const celda = filaNivel2.getCell(col);
      celda.value = titulo;
      celda.font = { ...fontHeader, color: { argb: "FFFFFFFF" } };
      celda.fill = fillHeader;
      celda.alignment = { vertical: "middle", horizontal: "center" };
    });
    // Las columnas sin sub-nivel se dejan sin rotulo: el titulo del nivel
    // superior ya las identifica.
    [
      C.ITEM,
      C.FECHA,
      C.MES,
      C.RUC,
      C.RAZON_SOCIAL,
      C.ORDEN_COMPRA,
      C.TICKET,
      C.ALMACEN,
      C.LUGAR,
      C.PRODUCTO,
      C.TM,
    ].forEach((col) => {
      const celda = filaNivel2.getCell(col);
      celda.font = { ...fontHeader, color: { argb: "FFFFFFFF" } };
      celda.fill = fillHeader;
      celda.alignment = { vertical: "middle", horizontal: "center" };
    });
    filaNivel2.height = 18;
    linea++;

    // ── Detalle de las cargas ─────────────────────────────────────────
    let totalTM = 0;
    let totalSubtotalFlete = 0;

    cargasGrupo.forEach((c, index) => {
      const fIngreso = dayjs(c.fecha_hora_ingreso).locale("es");
      const fila = ws.getRow(linea);
      const almacen =
        c.almacen_empresa_nombre ||
        c.almacen_cliente_direccion ||
        c.cliente_destino ||
        DASH;

      const valores: (string | number)[] = [];
      valores[C.ITEM - 1] = index + 1;
      valores[C.FECHA - 1] = fIngreso.format("DD/MM/YYYY");
      valores[C.MES - 1] = fIngreso.format("MMMM").toUpperCase();
      valores[C.RUC - 1] = ruc;
      valores[C.RAZON_SOCIAL - 1] = razonSocial;
      valores[C.ORDEN_COMPRA - 1] = cabecera.correlativo;
      valores[C.TICKET - 1] = c.codigo_ticket_balanza || DASH;
      valores[C.ALMACEN - 1] = almacen;
      valores[C.PLACA - 1] = c.placa || DASH;
      valores[C.LUGAR - 1] =
        c.lugar_extraccion_nombre || c.lugar_extraccion_direccion || DASH;
      valores[C.GUIA_REMISION - 1] = c.guia_remitente || DASH;
      valores[C.GUIA_TRANSPORTISTA - 1] = c.guia_transportista || DASH;
      valores[C.PRODUCTO - 1] = c.tipo_carbon_nombre;
      valores[C.TM - 1] = Number(c.cantidad || 0);
      valores[C.P_BASE - 1] = Number(c.precio_unitario || 0);
      valores[C.FLETE - 1] = Number(c.costo_flete_por_tonelada || 0);
      valores[C.FACTURA_FECHA - 1] = c.comprobante_transporte_fecha_emision
        ? dayjs(c.comprobante_transporte_fecha_emision).format("DD/MM/YYYY")
        : DASH;
      valores[C.FACTURA_NUMERO - 1] =
        c.comprobante_transporte_codigo || DASH;
      valores[C.FACTURA_SUBTOTAL - 1] = Number(c.flete_subtotal || 0);

      valores.forEach((v, idx) => {
        const celda = fila.getCell(idx + 1);
        celda.value = v;
        celda.font = fontData;
        celda.border = borderThin;
        if (typeof v === "number") {
          celda.alignment = { vertical: "middle", horizontal: "right" };
          if (idx + 1 === C.TM) {
            celda.numFmt = "#,##0.00";
          } else if (idx + 1 >= C.P_BASE) {
            celda.numFmt = "S/ #,##0.00";
          }
        } else {
          celda.alignment = { vertical: "middle", horizontal: "center" };
        }
      });

      totalTM += Number(c.cantidad || 0);
      totalSubtotalFlete += Number(c.flete_subtotal || 0);
      linea++;
    });

    // ── Fila de totales del detalle ──────────────────────────────────
    const filaTotales = ws.getRow(linea);
    ws.mergeCells(linea, 1, linea, C.TM - 1);
    const celdaTotales = filaTotales.getCell(1);
    celdaTotales.value = "TOTALES";
    celdaTotales.font = fontHeader;
    celdaTotales.alignment = { vertical: "middle", horizontal: "right" };
    for (let c = 1; c <= C.TM - 1; c++) {
      filaTotales.getCell(c).border = borderThin;
    }
    filaTotales.getCell(C.TM).value = round2(totalTM);
    filaTotales.getCell(C.TM).font = fontHeader;
    filaTotales.getCell(C.TM).numFmt = "#,##0.00";
    filaTotales.getCell(C.TM).border = borderThin;
    for (let c = C.P_BASE; c <= C.FLETE; c++) {
      filaTotales.getCell(c).border = borderThin;
    }
    filaTotales.getCell(C.FACTURA_SUBTOTAL).value = round2(totalSubtotalFlete);
    filaTotales.getCell(C.FACTURA_SUBTOTAL).font = fontHeader;
    filaTotales.getCell(C.FACTURA_SUBTOTAL).numFmt = "S/ #,##0.00";
    filaTotales.getCell(C.FACTURA_SUBTOTAL).border = borderThin;
    for (let c = C.FACTURA_FECHA; c <= C.FACTURA_NUMERO; c++) {
      filaTotales.getCell(c).border = borderThin;
    }
    linea += 2;

    // ── Bloque de liquidacion del transportista ───────────────────────
    const subtotal = round2(totalSubtotalFlete);
    const igv = pctIgvFlete > 0 ? round2((subtotal * pctIgvFlete) / 100) : 0;
    const total = round2(subtotal + igv);
    const detraccion =
      pctDetraccionFlete > 0 ? round2((total * pctDetraccionFlete) / 100) : 0;
    const neto = round2(total - detraccion);

    const agregarFilaLiquidacion = (
      label: string,
      valor: number,
      opts: { bold?: boolean; verde?: boolean } = {},
    ) => {
      const fila = ws.getRow(linea);
      ws.mergeCells(linea, C.P_BASE, linea, C.FACTURA_NUMERO);
      const celdaLabel = fila.getCell(C.P_BASE);
      celdaLabel.value = label;
      celdaLabel.font = opts.verde
        ? { ...fontHeader, size: 10, color: { argb: "FFFFFFFF" } }
        : opts.bold
          ? fontHeader
          : fontData;
      celdaLabel.alignment = { vertical: "middle", horizontal: "right" };
      if (opts.verde) {
        for (let c = C.P_BASE; c <= C.FACTURA_NUMERO; c++) {
          fila.getCell(c).fill = fillNeto;
        }
      }

      const celdaValor = fila.getCell(C.FACTURA_SUBTOTAL);
      celdaValor.value = valor;
      celdaValor.font = opts.verde
        ? { ...fontHeader, size: 11, color: { argb: "FFFFFFFF" } }
        : opts.bold
          ? fontHeader
          : fontData;
      celdaValor.numFmt = "S/ #,##0.00";
      celdaValor.alignment = { vertical: "middle", horizontal: "right" };
      if (opts.verde) {
        celdaValor.fill = fillNeto;
      } else if (opts.bold) {
        celdaValor.fill = fillTotales;
      }
      linea++;
    };

    agregarFilaLiquidacion("SUB TOTAL", subtotal);
    agregarFilaLiquidacion(
      pctIgvFlete > 0 ? `IGV (${pctIgvFlete}%)` : "IGV",
      igv,
    );
    agregarFilaLiquidacion("TOTAL", total, { bold: true });
    if (pctDetraccionFlete > 0) {
      agregarFilaLiquidacion(
        `DETRACCIÓN (${pctDetraccionFlete}%)`,
        detraccion,
      );
    }
    agregarFilaLiquidacion("TOTAL", total - detraccion, { bold: true });
    agregarFilaLiquidacion("NETO A PAGAR", neto, { verde: true });

    // Separador entre grupos de transportista.
    linea += 2;
  }

  // ── Anchos de columna ────────────────────────────────────────────────
  const anchos = [
    6, 11, 10, 14, 26, 16, 12, 18, 12, 18, 14, 14, 14, 10, 12, 12, 12, 16, 14,
  ];
  anchos.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  const filename = `LIQUIDACION_FLETE_${cabecera.correlativo}`;
  await downloadWorkbook(wb, filename);
};
