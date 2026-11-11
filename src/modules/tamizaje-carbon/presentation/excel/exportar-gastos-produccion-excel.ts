import ExcelJS from "exceljs";
import dayjs from "dayjs";
import "dayjs/locale/es";

import type { ExcelBuilderFn } from "../../../../presentation/utils/excel/excel-utils";
import { TipoGastoZarandeo } from "../../../../shared/enums/carbon/tipo-gasto-zarandeo";
import type { RES_GastoProduccionExport } from "../../service/tamizaje-carbon.responses";

/**
 * Reporte de "Gastos de Produccion" del modulo de Produccion de Carbon.
 *
 * Cada fila es un gasto de produccion (pala, lanza, agua, escogedores u
 * otro) cargado a un zarandeo o a un blending. Las columnas salen de
 * El formato sigue el diseno de referencia: una fila de encabezados con
 * filtro, las filas de datos y la fila de TOTALES.
 *
 *   FECHA INICIO     -> fecha_hora_zarandeo / fecha_hora_blending (22-May)
 *   FECHA DE PAGO    -> fecha_pago (2/06/2026)
 *   MES              -> mes de la fecha inicio (MAYO)
 *   TIPO             -> gasto, u "Otros: <otro_gasto>"
 *   DESCRIPCION      -> descripcion del gasto
 *   RUC / PROVEEDOR  -> proveedor del gasto
 *   CANTIDAD / PRECIO UNITARIO / TOTAL -> del gasto
 *   CONDICION        -> esta_pagado
 */

const COLOR_ENCABEZADO = "FF2E75B6";
const COLOR_SUBTITULO = "FF1F4E79";
const COLOR_BORDE = "FF000000";
const COLOR_TEXTO = "FF000000";
/** Relleno de la fila de TOTALES (melocoton). */
const COLOR_FILA_TOTALES = "FFFCE4D6";

const FMT_NUMERO = "#,##0.00";

type ValorCelda = string | number | null | undefined;

type Formato = "texto" | "numero";

interface Columna {
  /** Titulo de la columna. */
  titulo: string;
  /** Ancho de la columna en caracteres. */
  ancho: number;
  /** Calcula el valor de la celda. */
  valor: (fila: RES_GastoProduccionExport) => ValorCelda;
  fmt?: Formato;
  /** Formula de la celda de la fila de TOTALES (sin el signo "="). */
  total?: (rango: string) => string;
  /** Los encabezados de texto van alineados a la izquierda; el resto al centro. */
  encabezadoIzquierda?: boolean;
}

const num = (valor: number | null | undefined): number => Number(valor ?? 0);

/**
 * Letra de columna de Excel a partir del indice 1-based: 1 -> A, 26 -> Z,
 * 27 -> AA, 28 -> AB.
 */
const letraColumna = (indice: number): string => {
  let n = indice;
  let letras = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
};

/**
 * Nombre de archivo seguro: sin tildes y sin caracteres prohibidos.
 */
const sanitizeNombreArchivo = (nombre: string): string =>
  nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 120);

/**
 * Fecha corta del diseno de referencia: dia y mes ("22-May").
 */
const fechaCorta = (fecha: string | null | undefined): string => {
  if (!fecha) return "";
  const d = dayjs(fecha).locale("es");
  const mes = d.format("MMM");
  return `${d.format("D")}-${mes.charAt(0).toUpperCase()}${mes.slice(1)}`;
};

/** Fecha de pago del diseno de referencia: "2/06/2026". */
const fechaPagoTexto = (fecha: string | null | undefined): string => {
  if (!fecha) return "";
  return dayjs(fecha).format("D/MM/YYYY");
};

/**
 * Tipo del gasto: el enum, o "Otros: <lo que se escribio>".
 */
const tipoGasto = (fila: RES_GastoProduccionExport): string => {
  if (fila.gasto === TipoGastoZarandeo.Otro) {
    return fila.otro_gasto ? `Otros: ${fila.otro_gasto}` : "Otros";
  }
  return fila.gasto;
};

/** Condicion de pago: PAGADO o PENDIENTE. */
const condicionPago = (fila: RES_GastoProduccionExport): string =>
  fila.esta_pagado ? "PAGADO" : "PENDIENTE";

const COLUMNAS: Columna[] = [
  {
    titulo: "FECHA INICIO",
    ancho: 13,
    valor: (f) => fechaCorta(f.fecha_inicio),
  },
  {
    titulo: "FECHA DE PAGO",
    ancho: 14,
    valor: (f) => fechaPagoTexto(f.fecha_pago),
  },
  {
    titulo: "MES",
    ancho: 11,
    valor: (f) =>
      f.fecha_inicio
        ? dayjs(f.fecha_inicio).locale("es").format("MMMM").toUpperCase()
        : "",
  },
  {
    titulo: "TIPO",
    ancho: 16,
    valor: tipoGasto,
  },
  {
    titulo: "DESCRIPCION",
    ancho: 34,
    valor: (f) => f.descripcion || "",
    encabezadoIzquierda: true,
  },
  {
    titulo: "RUC",
    ancho: 15,
    // El proveedor puede ser persona natural (DNI) o juridica (RUC).
    valor: (f) => f.proveedor_ruc || f.proveedor_dni || "",
  },
  {
    titulo: "PROVEEDOR",
    ancho: 26,
    valor: (f) => f.proveedor_razon_social || "",
    encabezadoIzquierda: true,
  },
  {
    titulo: "CANTIDAD",
    ancho: 12,
    fmt: "numero",
    valor: (f) => num(f.cantidad),
    total: (rango) => `SUM(${rango})`,
  },
  {
    titulo: "PRECIO UNITARIO",
    ancho: 14,
    fmt: "numero",
    valor: (f) => num(f.precio_unitario),
  },
  {
    titulo: "TOTAL",
    ancho: 14,
    fmt: "numero",
    valor: (f) => num(f.total),
    total: (rango) => `SUM(${rango})`,
  },
  {
    titulo: "CONDICION",
    ancho: 13,
    valor: condicionPago,
  },
];

export interface OpcionesGastosProduccion {
  /** Titulo del reporte (va en la primera fila, centrado). */
  titulo: string;
  /** Subtitulo: el periodo o el registro del que sale el reporte. */
  subtitulo?: string;
  /** Nombre del archivo (sin extension). Por defecto "GASTOS_PRODUCCION". */
  nombreArchivo?: string;
}

/**
 * Construye el builder del workbook. Se separa del hook para poder generar
 * el Excel sin depender de React.
 */
export const construirExcelGastosProduccion = (
  gastos: RES_GastoProduccionExport[],
  opciones: OpcionesGastosProduccion,
): { filename: string; builder: ExcelBuilderFn } => {
  const filename = sanitizeNombreArchivo(
    opciones.nombreArchivo ?? "GASTOS_PRODUCCION",
  );

  const builder: ExcelBuilderFn = async (workbook: ExcelJS.Workbook) => {
    const ws = workbook.addWorksheet("GASTOS DE PRODUCCION");

    const fontNormal: Partial<ExcelJS.Font> = {
      name: "Calibri",
      size: 9,
      color: { argb: COLOR_TEXTO },
    };
    const fontEncabezado: Partial<ExcelJS.Font> = {
      name: "Calibri",
      size: 9,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    const fontTitulo: Partial<ExcelJS.Font> = {
      name: "Calibri",
      size: 14,
      bold: true,
      color: { argb: COLOR_ENCABEZADO },
    };
    const fontSubtitulo: Partial<ExcelJS.Font> = {
      name: "Calibri",
      size: 9,
      italic: true,
      color: { argb: COLOR_SUBTITULO },
    };
    const fontTotales: Partial<ExcelJS.Font> = {
      name: "Calibri",
      size: 9,
      bold: true,
      color: { argb: COLOR_TEXTO },
    };

    const fill = (argb: string): ExcelJS.Fill => ({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb },
    });

    const bordeHorizontal: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: COLOR_BORDE } },
      bottom: { style: "thin", color: { argb: COLOR_BORDE } },
      left: { style: "thin", color: { argb: COLOR_BORDE } },
      right: { style: "thin", color: { argb: COLOR_BORDE } },
    };
    /** La fila de TOTALES cierra con doble linea, como en los demas reportes. */
    const bordeTotales: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: COLOR_BORDE } },
      bottom: { style: "double", color: { argb: COLOR_BORDE } },
      left: { style: "thin", color: { argb: COLOR_BORDE } },
      right: { style: "thin", color: { argb: COLOR_BORDE } },
    };

    const TOTAL_COLUMNAS = COLUMNAS.length;
    COLUMNAS.forEach((col, idx) => {
      ws.getColumn(idx + 1).width = col.ancho;
    });

    // ── Titulo ────────────────────────────────────────────────────────
    const FILA_TITULO = 1;
    // Con subtitulo hay una fila mas: el encabezado baja.
    const FILA_ENCABEZADO = opciones.subtitulo ? 3 : 2;
    const FILA_DATOS = FILA_ENCABEZADO + 1;

    ws.mergeCells(FILA_TITULO, 1, FILA_TITULO, TOTAL_COLUMNAS);
    const celdaTitulo = ws.getCell(FILA_TITULO, 1);
    celdaTitulo.value = opciones.titulo;
    celdaTitulo.font = fontTitulo;
    celdaTitulo.alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(FILA_TITULO).height = 26;

    if (opciones.subtitulo) {
      ws.mergeCells(FILA_TITULO + 1, 1, FILA_TITULO + 1, TOTAL_COLUMNAS);
      const celdaSub = ws.getCell(FILA_TITULO + 1, 1);
      celdaSub.value = opciones.subtitulo;
      celdaSub.font = fontSubtitulo;
      celdaSub.alignment = { vertical: "middle", horizontal: "center" };
      ws.getRow(FILA_TITULO + 1).height = 16;
    }

    // ── Encabezado ────────────────────────────────────────────────────
    const filaEncabezado = ws.getRow(FILA_ENCABEZADO);
    filaEncabezado.height = 26;
    COLUMNAS.forEach((col, idx) => {
      const celda = filaEncabezado.getCell(idx + 1);
      celda.value = col.titulo;
      celda.font = fontEncabezado;
      celda.fill = fill(COLOR_ENCABEZADO);
      // Los titulos cortos van centrados; los de texto, a la izquierda (como
      // en el diseno de referencia).
      celda.alignment = {
        vertical: "middle",
        horizontal: col.encabezadoIzquierda ? "left" : "center",
        indent: col.encabezadoIzquierda ? 1 : 0,
        wrapText: true,
      };
      celda.border = bordeHorizontal;
    });

    // ── Filas de datos ────────────────────────────────────────────────
    gastos.forEach((gasto, index) => {
      const row = ws.getRow(FILA_DATOS + index);

      COLUMNAS.forEach((col, idx) => {
        const celda = row.getCell(idx + 1);
        const valor = col.valor(gasto);

        celda.value = valor === null || valor === undefined ? "" : valor;
        celda.font = fontNormal;
        celda.border = bordeHorizontal;

        if (typeof valor === "number") {
          celda.alignment = { vertical: "middle", horizontal: "right" };
          celda.numFmt = FMT_NUMERO;
        } else {
          celda.alignment = { vertical: "middle", horizontal: "left" };
        }
      });
    });

    // ── Fila de TOTALES ───────────────────────────────────────────────
    if (gastos.length > 0) {
      const FILA_TOTALES = FILA_DATOS + gastos.length;
      const ULTIMA_FILA_DATO = FILA_DATOS + gastos.length - 1;

      const rowTotales = ws.getRow(FILA_TOTALES);
      rowTotales.height = 22;

      COLUMNAS.forEach((col, idx) => {
        const celda = rowTotales.getCell(idx + 1);
        celda.fill = fill(COLOR_FILA_TOTALES);
        celda.border = bordeTotales;
        celda.font = fontTotales;
        celda.alignment = { vertical: "middle", horizontal: "right" };

        if (col.fmt === "numero") celda.numFmt = FMT_NUMERO;

        if (col.total) {
          const letra = letraColumna(idx + 1);
          celda.value = {
            formula: col.total(`${letra}${FILA_DATOS}:${letra}${ULTIMA_FILA_DATO}`),
          };
        }
      });

      const celdaLabel = rowTotales.getCell(1);
      celdaLabel.value = "TOTALES";
      celdaLabel.font = { ...fontTotales, size: 10 };
      celdaLabel.alignment = {
        vertical: "middle",
        horizontal: "left",
        indent: 1,
      };
    }

    // ── Autofiltro ────────────────────────────────────────────────────
    if (gastos.length > 0) {
      ws.autoFilter = {
        from: { row: FILA_ENCABEZADO, column: 1 },
        to: { row: FILA_DATOS + gastos.length - 1, column: TOTAL_COLUMNAS },
      };
    }

    // El encabezado queda congelado (con o sin subtitulo, la fila de
    // congelacion es la del encabezado).
    ws.views = [
      { showGridLines: false, state: "frozen", ySplit: FILA_ENCABEZADO },
    ];
  };

  return { filename, builder };
};
