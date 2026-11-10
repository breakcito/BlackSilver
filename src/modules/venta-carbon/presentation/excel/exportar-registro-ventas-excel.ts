import ExcelJS from "exceljs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type {
  RES_FilaControlVentas,
  RES_ReporteControlVentas,
} from "../../service/venta-carbon.responses";
import type { ExcelBuilderFn } from "../../../../presentation/utils/excel/excel-utils";

/**
 * "Registro de Ventas" del modulo de Venta de Carbon.
 *
 * Replica el formato de referencia: un encabezado de tres niveles (grupo ->
 * sub-grupo -> columna) con los bloques:
 *
 *   DATOS DEL CARBON-INGRESOS
 *   TM
 *   ANALISIS QUIMICOS
 *   ANALISIS GRANULOMETRICOS
 *   PRECIOS
 *   FACTURA
 *   BONOS / DESCUENTOS
 *   TOTALES
 *   CONDICION DE PAGO
 *   OBSERVACION
 *
 * Cada fila del reporte es una carga de carbon que ingreso al almacen de
 * destino.
 */

// ── Paleta ───────────────────────────────────────────────────────────────
const COLOR_DATOS = "FF1F4E79";
const COLOR_QUIMICOS = "FF2E75B6";
const COLOR_GRANULOMETRICOS = "FF1F4E79";
const COLOR_PRECIOS = "FF1F4E79";
const COLOR_FACTURA = "FF00B050";
const COLOR_BONOS = "FF1F4E79";
const COLOR_TOTALES = "FF1F4E79";
const COLOR_CONDICION = "FF1F4E79";
const COLOR_OBSERVACION = "FFED1C24";

/** La columna TM y la de SUB TOTAL van en verde, como en el formato original. */
const COLOR_VERDE = "FF00B050";

const COLOR_BORDE = "FF000000";
const COLOR_TEXTO = "FF000000";

/** Azul del titulo del reporte. */
const COLOR_TITULO = "FF1F4E79";
/** Relleno de la fila de TOTALES (melocoton). */
const COLOR_FILA_TOTALES = "FFFCE4D6";

const FMT_MONEDA = '"S/."#,##0.00';
/** La detraccion se cobra en soles enteros: sin centavos. */
const FMT_MONEDA_ENTERO = '"S/."#,##0';
const FMT_NUMERO = "#,##0.00";
const FMT_ENTERO = "0";
const FMT_PORCENTAJE = '0.00"%"';

type ValorCelda = string | number | null | undefined;

type Formato =
  | "texto"
  | "moneda"
  | "moneda_entero"
  | "numero"
  | "porcentaje"
  | "entero";

interface Columna {
  /** Titulo de la columna (siempre va en la fila de nivel 3). */
  titulo: string;
  /** Ancho de la columna en caracteres. */
  ancho: number;
  /** Sub-grupo de nivel 2 que agrupa a esta columna (merge en la fila 2). */
  sub?: string;
  /** Calcula el valor de la celda. */
  valor?: (fila: RES_FilaControlVentas, index: number) => ValorCelda;
  fmt?: Formato;
  /** Formula de la celda de la fila de TOTALES (sin el signo "="). */
  total?: (ctx: ContextoTotales) => string;
  /**
   * Formula de la celda de la fila de DATOS (sin el signo "=").
   *
   * La formula se escribe en la hoja para que el calculo quede a la vista
   * del usuario; `resultado` guarda el valor ya calculado para que el
   * archivo muestre la cifra correcta sin depender de un recalculo.
   */
  formula?: (ctx: ContextoFormula) => string;
  /** Valor calculado de la formula de la celda de datos. */
  resultado?: (fila: RES_FilaControlVentas, index: number) => number;
}

/**
 * Contexto para construir la formula de una celda de la fila de DATOS.
 */
export interface ContextoFormula {
  /** Numero de la fila de datos en la hoja (1-based). */
  fila: number;
  /**
   * Letra de la columna del reporte indicada por su titulo (nivel 3).
   *
   * El titulo debe ser unico en el reporte: "TOTAL", "% DETRACCION" y
   * "NETO A PAGAR" lo son.
   */
  letra: (titulo: string) => string;
}

interface Grupo {
  /** Titulo del grupo (nivel 1). */
  titulo: string;
  /** Color base del grupo. */
  color: string;
  columnas: Columna[];
}

/**
 * Contexto para construir la formula de la celda de TOTALES de una columna.
 */
export interface ContextoTotales {
  /** Rango de datos de la PROPIA columna, p.ej. "S6:S241". */
  propio: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Aclara un color base mezclandolo con blanco. `fase` 0 = base, 1 = claro. */
const aclarar = (argb: string, fase: number): string => {
  const hex6 = argb.length === 6 ? `FF${argb}` : argb;
  const r = parseInt(hex6.slice(2, 4), 16);
  const g = parseInt(hex6.slice(4, 6), 16);
  const b = parseInt(hex6.slice(6, 8), 16);
  const mezclar = (c: number) => Math.round(c + (255 - c) * fase);
  const hex = (c: number) => mezclar(c).toString(16).padStart(2, "0");
  return `FF${hex(r)}${hex(g)}${hex(b)}`;
};

const fmtFecha = (valor: string | null | undefined): string =>
  valor ? dayjs(valor).format("DD/MM/YYYY") : "-";

const fmtMes = (valor: string | null | undefined): string =>
  valor ? dayjs(valor).locale("es").format("MMMM").toUpperCase() : "-";

const num = (valor: number | null | undefined): number => Number(valor ?? 0);

/**
 * Texto de una celda: `null`/`undefined` se muestran como "-".
 */
const texto = (valor: string | null | undefined): string =>
  valor === null || valor === undefined ? "-" : valor;

/** Numero de una celda: sin dato queda vacia, no en cero. */
const numero = (valor: number | null | undefined): number | "" =>
  valor === null || valor === undefined ? "" : Number(valor);

/**
 * Detraccion de una carga: el 10% del TOTAL de la fila, redondeado a
 * soles enteros.
 *
 * Regla de negocio: la detraccion se cobra en soles enteros (mismo criterio
 * que aplica el backend en la liquidacion de venta de carbon). El neto a
 * pagar sale de restar esa detraccion YA redondeada al total de la fila,
 * por eso hay una diferencia de centimos con el 10% exacto.
 */
const detraccionDeFila = (fila: RES_FilaControlVentas): number =>
  Math.round(num(fila.total) * 0.1);

/** Neto a pagar de una fila: TOTAL menos la detraccion ya redondeada. */
const netoDeFila = (fila: RES_FilaControlVentas): number =>
  Math.round((num(fila.total) - detraccionDeFila(fila)) * 100) / 100;

/** Condicion de pago: PAGADO si el comprobante ya esta pagado. */
const condicionPago = (fila: RES_FilaControlVentas): string => {
  if (fila.comprobante_estado) {
    return fila.comprobante_estado === "Pagado" ? "PAGADO" : "PENDIENTE";
  }
  return fila.estado === "Pagado" ? "PAGADO" : "PENDIENTE";
};

/** Ruc o Dni del cliente destino, segun el tipo de entidad. */
const documentoDestino = (fila: RES_FilaControlVentas): string =>
  texto(fila.cliente_destino_ruc || fila.cliente_destino_dni || null);

/** Porcentaje del analisis granulometrico de la carga. */
const granulometria = (
  fila: RES_FilaControlVentas,
  clave: "mayor_a_uno" | "menor_a_uno" | "un_medio",
): number | "" => {
  const analisis = fila.analisis_granulometria;
  if (!analisis) return "";
  const valor = analisis[clave];
  return valor === null || valor === undefined ? "" : Number(valor);
};

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

/** Formato numerico de Excel segun el tipo de dato de la columna. */
const numFmtDe = (fmt?: Formato): string | undefined => {
  switch (fmt) {
    case "moneda":
      return FMT_MONEDA;
    case "moneda_entero":
      return FMT_MONEDA_ENTERO;
    case "entero":
      return FMT_ENTERO;
    case "porcentaje":
      return FMT_PORCENTAJE;
    case "numero":
      return FMT_NUMERO;
    default:
      return undefined;
  }
};

// ── Estructura del reporte ───────────────────────────────────────────────

const GRUPOS: Grupo[] = [
  {
    titulo: "DATOS DEL CARBON-INGRESOS",
    color: COLOR_DATOS,
    columnas: [
      {
        titulo: "FECHA",
        ancho: 13,
        valor: (f) => fmtFecha(f.fecha_hora_ingreso),
      },
      {
        titulo: "MES",
        ancho: 12,
        valor: (f) => fmtMes(f.fecha_hora_ingreso),
      },
      {
        titulo: "RUC",
        ancho: 14,
        valor: documentoDestino,
      },
      {
        titulo: "RAZON SOCIAL",
        ancho: 28,
        valor: (f) => texto(f.cliente_destino),
      },
      {
        titulo: "ORDEN DE COMPRA",
        ancho: 20,
        valor: (f) => texto(f.codigo_orden_compra),
      },
      {
        titulo: "N° DE TICKET",
        ancho: 17,
        valor: (f) => texto(f.codigo_ticket_balanza),
      },
      {
        titulo: "ALMACEN",
        ancho: 26,
        valor: (f) => texto(f.almacen_cliente_llegada),
      },
      {
        titulo: "TRACTÓ",
        ancho: 12,
        sub: "PLACAS",
        valor: (f) => texto(f.placa),
      },
      {
        titulo: "CARRETA",
        ancho: 13,
        sub: "PLACAS",
        valor: (f) => texto(f.segunda_placa),
      },
      {
        titulo: "REPORTE",
        ancho: 12,
        valor: (f) => texto(f.numero_reporte),
      },
      {
        titulo: "Remisión",
        ancho: 14,
        sub: "N° GUÍA",
        valor: (f) => texto(f.guia_remitente),
      },
      {
        titulo: "Transportista",
        ancho: 16,
        sub: "N° GUÍA",
        valor: (f) => texto(f.guia_transportista),
      },
      {
        titulo: "PRODUCTO",
        ancho: 16,
        valor: (f) => texto(f.tipo_carbon_nombre),
      },
    ],
  },
  {
    titulo: "TM",
    color: COLOR_VERDE,
    columnas: [
      {
        titulo: "TM",
        ancho: 10,
        fmt: "numero",
        valor: (f) => num(f.cantidad_toneladas),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
    ],
  },
  {
    titulo: "ANALISIS QUIMICOS",
    color: COLOR_QUIMICOS,
    columnas: [
      {
        titulo: "%Ce",
        ancho: 11,
        fmt: "porcentaje",
        valor: (f) => numero(f.porcentaje_ceniza),
        total: (ctx) => `IFERROR(AVERAGE(${ctx.propio}),0)`,
      },
      {
        titulo: "%Hu",
        ancho: 11,
        fmt: "porcentaje",
        valor: (f) => numero(f.porcentaje_humedad),
        total: (ctx) => `IFERROR(AVERAGE(${ctx.propio}),0)`,
      },
      {
        titulo: "%S",
        ancho: 9,
        fmt: "porcentaje",
        valor: (f) => numero(f.porcentaje_azufre),
        total: (ctx) => `IFERROR(AVERAGE(${ctx.propio}),0)`,
      },
    ],
  },
  {
    titulo: "ANALISIS GRANULOMETRICOS",
    color: COLOR_GRANULOMETRICOS,
    columnas: [
      {
        titulo: '>1"',
        ancho: 10,
        fmt: "porcentaje",
        valor: (f) => granulometria(f, "mayor_a_uno"),
        total: (ctx) => `IFERROR(AVERAGE(${ctx.propio}),0)`,
      },
      {
        titulo: '1<"',
        ancho: 10,
        fmt: "porcentaje",
        valor: (f) => granulometria(f, "menor_a_uno"),
        total: (ctx) => `IFERROR(AVERAGE(${ctx.propio}),0)`,
      },
      {
        titulo: '1/2"',
        ancho: 10,
        fmt: "porcentaje",
        valor: (f) => granulometria(f, "un_medio"),
        total: (ctx) => `IFERROR(AVERAGE(${ctx.propio}),0)`,
      },
      {
        titulo: "%PIZ",
        ancho: 10,
        fmt: "porcentaje",
        valor: (f) => numero(f.porcentaje_pizarra),
        total: (ctx) => `IFERROR(AVERAGE(${ctx.propio}),0)`,
      },
    ],
  },
  {
    titulo: "PRECIOS",
    color: COLOR_PRECIOS,
    columnas: [
      {
        titulo: "precio Base",
        ancho: 13,
        fmt: "moneda",
        valor: (f) => num(f.precio_base),
        total: (ctx) => `IFERROR(AVERAGE(${ctx.propio}),0)`,
      },
    ],
  },
  {
    titulo: "FACTURA",
    color: COLOR_FACTURA,
    columnas: [
      {
        titulo: "FECHA",
        ancho: 13,
        valor: (f) => fmtFecha(f.comprobante_fecha_emision),
      },
      {
        titulo: "NUMERO",
        ancho: 17,
        valor: (f) => texto(f.comprobante_codigo),
      },
    ],
  },
  {
    titulo: "BONOS / DESCUENTOS",
    color: COLOR_BONOS,
    columnas: [
      {
        titulo: "TM",
        ancho: 10,
        fmt: "numero",
        valor: (f) => num(f.cantidad_toneladas),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
      {
        titulo: "BONO",
        ancho: 12,
        fmt: "moneda",
        valor: (f) => num(f.bono),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
      {
        titulo: "DESCUENTO",
        ancho: 13,
        fmt: "moneda",
        valor: (f) => num(f.descuento),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
      {
        titulo: "IMPORTE",
        ancho: 15,
        fmt: "moneda",
        valor: (f) => num(f.precio_materia_prima),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
    ],
  },
  {
    titulo: "SUB TOTAL",
    color: COLOR_VERDE,
    columnas: [
      {
        titulo: "SUB TOTAL",
        ancho: 15,
        fmt: "moneda",
        valor: (f) => num(f.subtotal),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
    ],
  },
  {
    titulo: "TOTALES",
    color: COLOR_TOTALES,
    columnas: [
      {
        titulo: "IGV",
        ancho: 13,
        fmt: "moneda",
        valor: (f) => num(f.monto_igv),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
      {
        titulo: "TOTAL",
        ancho: 14,
        fmt: "moneda",
        valor: (f) => num(f.total),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
      {
        titulo: "% DETRACCION",
        ancho: 14,
        fmt: "moneda_entero",
        // La detraccion ya no es la de la carga: es el 10% del TOTAL de la
        // fila, redondeado a soles enteros.
        valor: (f) => detraccionDeFila(f),
        formula: (ctx) =>
          `ROUND(${ctx.letra("TOTAL")}${ctx.fila}*0.1,0)`,
        resultado: (f) => detraccionDeFila(f),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
      {
        titulo: "NETO A PAGAR",
        ancho: 17,
        fmt: "moneda",
        // Neto = TOTAL - detraccion (la detraccion ya redondeada).
        valor: (f) => netoDeFila(f),
        formula: (ctx) =>
          `${ctx.letra("TOTAL")}${ctx.fila}-${ctx.letra("% DETRACCION")}${ctx.fila}`,
        resultado: (f) => netoDeFila(f),
        total: (ctx) => `SUM(${ctx.propio})`,
      },
    ],
  },
  {
    titulo: "CONDICION DE PAGO",
    color: COLOR_CONDICION,
    columnas: [
      {
        titulo: "Condicion",
        ancho: 13,
        valor: (f) => condicionPago(f),
      },
      {
        titulo: "Fecha",
        ancho: 13,
        valor: (f) => fmtFecha(f.pago_fecha_hora),
      },
      {
        titulo: "N° de Operación",
        ancho: 18,
        valor: (f) => texto(f.pago_numero_operacion),
      },
      {
        titulo: "N° de Cuenta",
        ancho: 17,
        valor: (f) => texto(f.pago_numero_cuenta),
      },
      {
        titulo: "Nombre de Banco",
        ancho: 20,
        valor: (f) => texto(f.pago_banco),
      },
    ],
  },
  {
    titulo: "OBSERVACION",
    color: COLOR_OBSERVACION,
    columnas: [
      {
        titulo: "OBSERVACION",
        ancho: 34,
        valor: (f) => texto(f.observacion),
      },
    ],
  },
];

export interface OpcionesRegistroVentas {
  anio: number;
  /** Logo de la empresa como data URL (`data:image/png;base64,...`). */
  logoUrl?: string | null;
}

/**
 * Construye el builder del workbook. Se separa del hook para poder generar
 * el Excel sin depender de React (y para poder probarlo aislado).
 */
export const construirExcelRegistroVentas = (
  reporte: RES_ReporteControlVentas,
  opciones: OpcionesRegistroVentas,
): { filename: string; builder: ExcelBuilderFn } => {
  const filename = `REGISTRO_DE_VENTAS_${opciones.anio}`;

  const builder: ExcelBuilderFn = async (workbook: ExcelJS.Workbook) => {
    const ws = workbook.addWorksheet(`REGISTRO DE VENTAS (${opciones.anio})`, {
      views: [{ showGridLines: false, state: "frozen", ySplit: 5 }],
    });

    // ── Estilos ────────────────────────────────────────────────────────
    const fontDatos: Partial<ExcelJS.Font> = {
      name: "Calibri",
      size: 8.5,
      color: { argb: COLOR_TEXTO },
    };
    const fontEncabezado: Partial<ExcelJS.Font> = {
      name: "Calibri",
      size: 8.5,
      bold: true,
      color: { argb: COLOR_TEXTO },
    };
    const fontTituloReporte: Partial<ExcelJS.Font> = {
      name: "Calibri",
      size: 14,
      bold: true,
      color: { argb: COLOR_TITULO },
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

    const bordeVertical: Partial<ExcelJS.Borders> = {
      left: { style: "thin", color: { argb: COLOR_BORDE } },
      right: { style: "thin", color: { argb: COLOR_BORDE } },
    };
    const bordeHorizontal: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: COLOR_BORDE } },
      bottom: { style: "thin", color: { argb: COLOR_BORDE } },
      left: { style: "thin", color: { argb: COLOR_BORDE } },
      right: { style: "thin", color: { argb: COLOR_BORDE } },
    };
    /** La fila de TOTALES cierra con doble linea, como en el reporte original. */
    const bordeTotales: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: COLOR_BORDE } },
      bottom: { style: "double", color: { argb: COLOR_BORDE } },
      left: { style: "thin", color: { argb: COLOR_BORDE } },
      right: { style: "thin", color: { argb: COLOR_BORDE } },
    };

    // ── Anchos de columna ──────────────────────────────────────────────
    const anchos: number[] = [];
    GRUPOS.forEach((grupo) => {
      grupo.columnas.forEach((col) => anchos.push(col.ancho));
    });
    anchos.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });
    const TOTAL_COLUMNAS = anchos.length;

    // ── Cabecera superior: titulo centrado en azul, logo a la derecha ────
    const FILA_TITULO = 1;
    const FILA_N1 = 3;
    const FILA_N2 = 4;
    const FILA_N3 = 5;
    const FILA_DATOS = 6;

    // El titulo se mergea en todo el ancho para que quede centrado en la
    // hoja; el logo se ancla encima, en el extremo derecho.
    ws.mergeCells(FILA_TITULO, 1, FILA_TITULO, TOTAL_COLUMNAS);
    ws.getCell(FILA_TITULO, 1).value = `REGISTRO DE VENTAS (${opciones.anio})`;
    ws.getCell(FILA_TITULO, 1).font = fontTituloReporte;
    ws.getCell(FILA_TITULO, 1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    ws.getRow(FILA_TITULO).height = 34;

    // ── Logo de la empresa (esquina superior derecha) ──────────────────
    const logoMatch = opciones.logoUrl
      ? /^data:image\/(\w+);base64,(.+)$/.exec(opciones.logoUrl)
      : null;
    if (logoMatch) {
      const imageId = workbook.addImage({
        base64: logoMatch[2],
        extension: logoMatch[1] as "png" | "jpeg" | "gif",
      });
      ws.addImage(imageId, {
        tl: { col: TOTAL_COLUMNAS - 3, row: 0 },
        ext: { width: 110, height: 38 },
      });
    }

    // ── Encabezado de tres niveles ─────────────────────────────────────
    let columna = 1;
    GRUPOS.forEach((grupo) => {
      const colorN1 = grupo.color;
      const colorN2 = aclarar(grupo.color, 0.3);
      const colorN3 = aclarar(grupo.color, 0.55);
      const colorTexto = "FFFFFFFF";

      // Nivel 1: merge horizontal del grupo.
      const ini = columna;
      const fin = columna + grupo.columnas.length - 1;
      if (fin > ini) {
        ws.mergeCells(FILA_N1, ini, FILA_N1, fin);
      }
      const celdaN1 = ws.getCell(FILA_N1, ini);
      celdaN1.value = grupo.titulo;
      celdaN1.font = {
        ...fontEncabezado,
        color: { argb: colorTexto },
      };
      celdaN1.alignment = { vertical: "middle", horizontal: "center" };
      for (let c = ini; c <= fin; c++) {
        ws.getCell(FILA_N1, c).fill = fill(colorN1);
        ws.getCell(FILA_N1, c).border = bordeVertical;
      }

      // Nivel 2: los sub-grupos (PLACAS, N° GUÍA) se mergean; las columnas
      // sueltas quedan vacias con el color del nivel.
      //
      // Nota: el titulo de cada columna va SIEMPRE en la fila de nivel 3.
      // Excel no acepta un autofiltro sobre una fila con celdas combinadas,
      // asi que la fila del filtro (nivel 3) no puede llevar merges.
      let i = 0;
      while (i < grupo.columnas.length) {
        const col = grupo.columnas[i];
        if (col.sub) {
          // Todas las columnas consecutivas con el mismo sub-grupo.
          let j = i;
          while (
            j + 1 < grupo.columnas.length &&
            grupo.columnas[j + 1].sub === col.sub
          ) {
            j++;
          }
          const subIni = ini + i;
          const subFin = ini + j;
          if (subFin > subIni) {
            ws.mergeCells(FILA_N2, subIni, FILA_N2, subFin);
          }
          const celdaSub = ws.getCell(FILA_N2, subIni);
          celdaSub.value = col.sub;
          celdaSub.font = {
            ...fontEncabezado,
            color: { argb: colorTexto },
          };
          celdaSub.alignment = { vertical: "middle", horizontal: "center" };
          for (let c = subIni; c <= subFin; c++) {
            ws.getCell(FILA_N2, c).fill = fill(colorN2);
            ws.getCell(FILA_N2, c).border = bordeVertical;
          }
          i = j + 1;
        } else {
          const celda = ws.getCell(FILA_N2, ini + i);
          celda.value = null;
          celda.alignment = { vertical: "middle", horizontal: "center" };
          ws.getCell(FILA_N2, ini + i).fill = fill(colorN2);
          ws.getCell(FILA_N2, ini + i).border = bordeVertical;
          i++;
        }
      }

      // Nivel 3: titulo de cada columna.
      //
      // El texto va alineado a la IZQUIERDA a proposito: Excel superpone el
      // boton del autofiltro sobre la celda y, centrado, el boton tapaba el
      // titulo. Alineado a la izquierda el boton queda a la derecha, libre.
      grupo.columnas.forEach((col, idx) => {
        const c = ini + idx;
        const celda = ws.getCell(FILA_N3, c);
        celda.value = col.titulo;
        celda.font = {
          ...fontEncabezado,
          color: { argb: COLOR_TEXTO },
        };
        celda.alignment = {
          vertical: "middle",
          horizontal: "left",
          indent: 1,
          wrapText: true,
        };
        ws.getCell(FILA_N3, c).fill = fill(colorN3);
        ws.getCell(FILA_N3, c).border = bordeVertical;
      });

      columna = fin + 1;
    });

    ws.getRow(FILA_N1).height = 20;
    ws.getRow(FILA_N2).height = 18;
    // 30 pt: caben dos lineas de 8.5 pt con holgura, para que los titulos
    // largos no se recorten.
    ws.getRow(FILA_N3).height = 30;

    // ── Filas de datos ─────────────────────────────────────────────────
    const cargas = reporte.cargas ?? [];

    // Letra de cada columna por su titulo (nivel 3): la necesitan las
    // formulas de datos para referenciar a otras columnas de la misma fila.
    const letraPorTitulo = new Map<string, string>();
    let idxCol = 1;
    GRUPOS.forEach((grupo) => {
      grupo.columnas.forEach((col) => {
        if (!letraPorTitulo.has(col.titulo)) {
          letraPorTitulo.set(col.titulo, letraColumna(idxCol));
        }
        idxCol++;
      });
    });
    const letra = (titulo: string): string => letraPorTitulo.get(titulo) ?? "A";

    cargas.forEach((fila, index) => {
      const nFila = FILA_DATOS + index;
      const row = ws.getRow(nFila);

      let c = 1;
      GRUPOS.forEach((grupo) => {
        grupo.columnas.forEach((col) => {
          const celda = row.getCell(c);
          const bruto = col.valor ? col.valor(fila, index) : "";
          const valor = bruto === null || bruto === undefined ? "" : bruto;

          celda.value = valor;
          celda.font = fontDatos;
          celda.border = bordeHorizontal;
          if (typeof valor === "number") {
            celda.alignment = { vertical: "middle", horizontal: "right" };
            celda.numFmt = numFmtDe(col.fmt) ?? FMT_NUMERO;
          } else {
            celda.alignment = { vertical: "middle", horizontal: "center" };
          }

          // Las celdas con formula muestran el calculo en la hoja; el
          // resultado ya calculado se guarda para que el archivo muestre la
          // cifra sin depender de un recalculo.
          if (col.formula) {
            celda.value = {
              formula: col.formula({ fila: nFila, letra }),
              result: col.resultado ? col.resultado(fila, index) : valor,
            };
          }

          c++;
        });
      });
    });

    // ── Fila de TOTALES ────────────────────────────────────────────────
    // Va debajo de los datos y FUERA del rango del autofiltro, para que no
    // se oculte al filtrar. Cada celda lleva la formula de su columna.
    if (cargas.length > 0) {
      const FILA_TOTALES = FILA_DATOS + cargas.length;
      const ULTIMA_FILA_DATO = FILA_DATOS + cargas.length - 1;

      const rowTotales = ws.getRow(FILA_TOTALES);
      rowTotales.height = 22;

      let c = 1;
      GRUPOS.forEach((grupo) => {
        grupo.columnas.forEach((col) => {
          const celda = rowTotales.getCell(c);
          celda.fill = fill(COLOR_FILA_TOTALES);
          celda.border = bordeTotales;
          celda.font = fontTotales;
          celda.alignment = { vertical: "middle", horizontal: "right" };
          const fmt = numFmtDe(col.fmt);
          if (fmt) celda.numFmt = fmt;

          if (col.total) {
            const letra = letraColumna(c);
            celda.value = {
              formula: col.total({
                propio: `${letra}${FILA_DATOS}:${letra}${ULTIMA_FILA_DATO}`,
              }),
            };
          }
          c++;
        });
      });

      // Etiqueta "TOTALES" en la primera celda.
      const celdaLabel = rowTotales.getCell(1);
      celdaLabel.value = "TOTALES";
      celdaLabel.font = { ...fontTotales, size: 10 };
      celdaLabel.alignment = {
        vertical: "middle",
        horizontal: "left",
        indent: 1,
      };
    }

    // ── Autofiltro sobre la fila de encabezados ───────────────────────
    if (cargas.length > 0) {
      ws.autoFilter = {
        from: { row: FILA_N3, column: 1 },
        to: { row: FILA_DATOS + cargas.length - 1, column: TOTAL_COLUMNAS },
      };
    }
  };

  return { filename, builder };
};
