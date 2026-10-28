import ExcelJS from "exceljs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type {
  RES_FilaControlCompras,
  RES_ReporteControlCompras,
} from "../../service/compra-carbon.responses";
import type { ExcelBuilderFn } from "../../../../presentation/utils/excel/excel-utils";
import { round2 } from "../components/input-classes";

/**
 * "Registro de Compras" (Control de Compras) del módulo de Compra de Carbón.
 *
 * Replica el formato de referencia: un encabezado de tres niveles (grupo ->
 * sub-grupo -> columna) con los bloques:
 *
 *   DATOS DEL CARBON-INGRESOS (PROVEEDORES)
 *   ANALISIS QUIMICOS
 *   ANALISIS GRANULOMETRICOS
 *   PRODUCCION
 *   PRECIOS / DESCUENTOS
 *   FACTURACION MATERIA PRIMA
 *   FACTURACION FLETES (TRANSPORTISTAS)
 *   OBSERVACION
 *
 * Cada fila del reporte es una carga que ingreso al almacen.
 */

// ── Paleta ───────────────────────────────────────────────────────────────
const COLOR_DATOS = "FF1F4E79";
const COLOR_QUIMICOS = "FF2E75B6";
const COLOR_PRECIOS = "FF1F4E79";
const COLOR_FACTURACION_MP = "FF00B050";
const COLOR_FACTURACION_FLETE = "FFFFFF00";
const COLOR_OBSERVACION = "FFED1C24";

const COLOR_BORDE = "FF000000";
const COLOR_TEXTO = "FF000000";

const FMT_MONEDA = '"S/."#,##0.00';
const FMT_NUMERO = "#,##0.00";
const FMT_ENTERO = "0";
const FMT_PORCENTAJE = '0.00"%"';

type ValorCelda = string | number | null | undefined;

type Formato = "texto" | "moneda" | "numero" | "porcentaje" | "entero";

interface Columna {
  /** Titulo de la columna (siempre va en la fila de nivel 3). */
  titulo: string;
  /** Ancho de la columna en caracteres. */
  ancho: number;
  /** Sub-grupo de nivel 2 que agrupa a esta columna (merge en la fila 2). */
  sub?: string;
  /** Calcula el valor de la celda. */
  valor?: (fila: RES_FilaControlCompras, index: number) => ValorCelda;
  fmt?: Formato;
}

interface Grupo {
  /** Titulo del grupo (nivel 1). */
  titulo: string;
  /** Color base del grupo. */
  color: string;
  /** Texto negro en las cabeceras: para los grupos de fondo claro (amarillo). */
  textoNegro?: boolean;
  /** Las celdas del grupo solo se rellenan si la carga paga flete. */
  soloConFlete?: boolean;
  columnas: Columna[];
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
 *
 * La cadena vacia "" se conserva: son las columnas reservadas (CARRETA,
 * %S, granulometria, produccion) que quedan vacias a proposito.
 */
const texto = (valor: string | null | undefined): string =>
  valor === null || valor === undefined ? "-" : valor;

/** Numero de una celda: sin dato queda vacia, no en cero. */
const numero = (valor: number | null | undefined): number | "" =>
  valor === null || valor === undefined ? "" : Number(valor);

/** Etiqueta de la condicion de pago: PAGADO si hay pago, PENDIENTE si no. */
const condicionPago = (fechaPago: string | null | undefined): string =>
  fechaPago ? "PAGADO" : "PENDIENTE";

/** Ruc o Dni del proveedor, segun el tipo de entidad. */
const documentoProveedor = (fila: RES_FilaControlCompras): string =>
  texto(fila.proveedor_ruc || fila.proveedor_dni || null);

/** Ruc o Dni del transportista. */
const documentoTransportista = (fila: RES_FilaControlCompras): string =>
  texto(fila.transportista_ruc || fila.transportista_dni || null);

/** Almacen de destino: de la empresa o, si no, de un cliente. */
const almacenDestino = (fila: RES_FilaControlCompras): string =>
  fila.almacen_empresa_nombre ||
  fila.almacen_cliente_direccion ||
  fila.cliente_destino ||
  "";

// ── Estructura del reporte ───────────────────────────────────────────────

const GRUPOS: Grupo[] = [
  {
    titulo: "DATOS DEL CARBON-INGRESOS (PROVEEDORES)",
    color: COLOR_DATOS,
    columnas: [
      {
        titulo: "ITEM",
        ancho: 10,
        fmt: "entero",
        valor: (_f, index) => index + 1,
      },
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
        valor: documentoProveedor,
      },
      {
        titulo: "RAZON SOCIAL",
        ancho: 26,
        valor: (f) => texto(f.proveedor),
      },
      {
        titulo: "ORDEN DE COMPRA",
        ancho: 20,
        valor: (f) => texto(f.correlativo),
      },
      {
        titulo: "N° DE TICKET",
        ancho: 17,
        valor: (f) => texto(f.codigo_ticket_balanza),
      },
      {
        titulo: "ALMACEN",
        ancho: 20,
        valor: almacenDestino,
      },
      {
        titulo: "TRACTÓ",
        ancho: 12,
        sub: "PLACAS",
        valor: (f) => texto(f.placa),
      },
      {
        // La carreta todavia no se registra en la carga: la columna queda
        // reservada para cuando exista ese dato.
        titulo: "CARRETA",
        ancho: 13,
        sub: "PLACAS",
        valor: () => "",
      },
      {
        titulo: "LUGAR",
        ancho: 18,
        valor: (f) => texto(f.lugar_extraccion),
      },
      {
        titulo: "Remisión",
        ancho: 14,
        sub: "EG",
        valor: (f) => texto(f.guia_remitente),
      },
      {
        titulo: "Transportista",
        ancho: 16,
        sub: "EG",
        valor: (f) => texto(f.guia_transportista),
      },
      {
        titulo: "Producto",
        ancho: 14,
        valor: (f) => texto(f.tipo_carbon_nombre),
      },
      {
        titulo: "TM",
        ancho: 10,
        fmt: "numero",
        valor: (f) => num(f.cantidad),
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
      },
      {
        // El azufre no se registra en la carga de compra: queda reservado.
        titulo: "S%",
        ancho: 9,
        valor: () => "",
      },
      {
        titulo: "%Hu",
        ancho: 11,
        fmt: "porcentaje",
        valor: (f) => numero(f.porcentaje_humedad),
      },
    ],
  },
  {
    titulo: "PRECIOS / DESCUENTOS",
    color: COLOR_PRECIOS,
    columnas: [
      {
        titulo: "P. BASE",
        ancho: 12,
        fmt: "moneda",
        valor: (f) => num(f.precio_unitario),
      },
      {
        titulo: "FLETE",
        ancho: 12,
        fmt: "moneda",
        valor: (f) => num(f.costo_flete_por_tonelada),
      },
      {
        // Precio de balanza: todavia no definido, queda reservado.
        titulo: "BALANZA",
        ancho: 13,
        valor: () => "",
      },
      {
        titulo: "P. MATERIA PRIMA",
        ancho: 20,
        fmt: "moneda",
        valor: (f) => num(f.precio_materia_prima),
      },
    ],
  },
  {
    titulo: "FACTURACION MATERIA PRIMA",
    color: COLOR_FACTURACION_MP,
    columnas: [
      {
        titulo: "FECHA",
        ancho: 13,
        valor: (f) => fmtFecha(f.comprobante_fecha_emision),
      },
      {
        titulo: "N° DE FACTURA",
        ancho: 17,
        valor: (f) => texto(f.comprobante_codigo),
      },
      {
        titulo: "SUBTOTAL",
        ancho: 14,
        fmt: "moneda",
        valor: (f) => num(f.subtotal),
      },
      {
        titulo: "IGV",
        ancho: 13,
        fmt: "moneda",
        valor: (f) => num(f.monto_igv),
      },
      {
        titulo: "TOTAL",
        ancho: 14,
        fmt: "moneda",
        valor: (f) => num(f.total),
      },
      {
        titulo: "DETRACCION",
        ancho: 15,
        fmt: "moneda",
        valor: (f) => num(f.monto_detraccion),
      },
      {
        titulo: "NETO A PAGAR",
        ancho: 17,
        fmt: "moneda",
        valor: (f) => num(f.neto_a_pagar),
      },
      {
        titulo: "FECHA",
        ancho: 13,
        sub: "CONDICION",
        valor: (f) => fmtFecha(f.pago_fecha_hora),
      },
      {
        titulo: "CONDICION",
        ancho: 14,
        sub: "CONDICION",
        valor: (f) => condicionPago(f.pago_fecha_hora),
      },
      {
        titulo: "MEDIO DE PAGO",
        ancho: 18,
        sub: "CONDICION",
        valor: (f) => texto(f.pago_medio),
      },
      {
        titulo: "N. BANCO",
        ancho: 18,
        sub: "CONDICION",
        valor: (f) => texto(f.pago_proveedor_banco),
      },
      {
        titulo: "N° DE CUENTA",
        ancho: 17,
        sub: "CONDICION",
        valor: (f) => texto(f.pago_proveedor_numero_cuenta),
      },
      {
        titulo: "N° OPERACIÓN",
        ancho: 18,
        sub: "CONDICION",
        valor: (f) => texto(f.pago_numero_operacion),
      },
    ],
  },
  {
    titulo: "FACTURACION FLETES (TRANSPORTISTAS)",
    color: COLOR_FACTURACION_FLETE,
    // El fondo es amarillo: el texto blanco se lee mal.
    textoNegro: true,
    soloConFlete: true,
    columnas: [
      {
        titulo: "FECHA",
        ancho: 13,
        valor: (f) => fmtFecha(f.comprobante_transporte_fecha_emision),
      },
      {
        titulo: "MES",
        ancho: 12,
        valor: (f) => fmtMes(f.comprobante_transporte_fecha_emision),
      },
      {
        titulo: "N° DE FACTURA",
        ancho: 17,
        valor: (f) => texto(f.comprobante_transporte_codigo),
      },
      {
        titulo: "RUC",
        ancho: 14,
        valor: documentoTransportista,
      },
      {
        titulo: "RAZON SOCIAL",
        ancho: 26,
        valor: (f) => texto(f.transportista_razon_social),
      },
      {
        titulo: "SUBTOTAL",
        ancho: 14,
        fmt: "moneda",
        valor: (f) => num(f.flete_subtotal),
      },
      {
        titulo: "IGV",
        ancho: 13,
        fmt: "moneda",
        valor: (f) => num(f.flete_igv),
      },
      {
        titulo: "TOTAL",
        ancho: 14,
        fmt: "moneda",
        valor: (f) => num(f.flete_total),
      },
      {
        titulo: "DETRACCION",
        ancho: 15,
        fmt: "moneda",
        valor: (f) => num(f.flete_monto_detraccion),
      },
      {
        titulo: "NETO A PAGAR",
        ancho: 17,
        fmt: "moneda",
        valor: (f) => num(f.flete_neto_a_pagar),
      },
      {
        titulo: "FECHA",
        ancho: 13,
        sub: "CONDICION",
        valor: (f) => fmtFecha(f.pago_flete_fecha_hora),
      },
      {
        titulo: "CONDICION",
        ancho: 14,
        sub: "CONDICION",
        valor: (f) => condicionPago(f.pago_flete_fecha_hora),
      },
      {
        titulo: "MEDIO DE PAGO",
        ancho: 18,
        sub: "CONDICION",
        valor: (f) => texto(f.pago_flete_medio),
      },
      {
        titulo: "N. BANCO",
        ancho: 18,
        sub: "CONDICION",
        valor: (f) => texto(f.pago_flete_banco),
      },
      {
        titulo: "N° DE CUENTA",
        ancho: 17,
        sub: "CONDICION",
        valor: (f) => texto(f.pago_flete_numero_cuenta),
      },
      {
        titulo: "N° OPERACIÓN",
        ancho: 18,
        sub: "CONDICION",
        valor: (f) => texto(f.pago_flete_numero_operacion),
      },
    ],
  },
  {
    titulo: "OBSERVACION",
    color: COLOR_OBSERVACION,
    columnas: [
      {
        titulo: "COSTO DE MATERIA PRIMA",
        ancho: 25,
        fmt: "moneda",
        valor: (f) => round2(num(f.subtotal) + num(f.flete_subtotal)),
      },
      {
        titulo: "COSTO DE MATERIA PRIMA MAS IGV",
        ancho: 31,
        fmt: "moneda",
        valor: (f) => round2(num(f.neto_a_pagar) + num(f.flete_total)),
      },
      {
        titulo: "IMPUESTO",
        ancho: 14,
        fmt: "moneda",
        valor: (f) =>
          round2(
            num(f.neto_a_pagar) +
              num(f.flete_total) -
              num(f.subtotal) -
              num(f.flete_subtotal),
          ),
      },
    ],
  },
];

// ── Generador ────────────────────────────────────────────────────────────

export interface OpcionesControlCompras {
  anio: number;
  /** Logo de la empresa como data URL (`data:image/png;base64,...`). */
  logoUrl?: string | null;
}

/**
 * Construye el builder del workbook. Se separa del hook para poder generar
 * el Excel sin depender de React (y para poder probarlo aislado).
 */
export const construirExcelControlCompras = (
  reporte: RES_ReporteControlCompras,
  opciones: OpcionesControlCompras,
): { filename: string; builder: ExcelBuilderFn } => {
  const filename = `CONTROL_DE_COMPRAS_${opciones.anio}`;

  const builder: ExcelBuilderFn = async (workbook: ExcelJS.Workbook) => {
    const ws = workbook.addWorksheet(`CONTROL DE COMPRAS (${opciones.anio})`, {
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

    // ── Cabecera superior: titulo a la izquierda, logo a la derecha ────
    const FILA_TITULO = 1;
    const FILA_N1 = 3;
    const FILA_N2 = 4;
    const FILA_N3 = 5;
    const FILA_DATOS = 6;

    ws.getCell(FILA_TITULO, 1).value = `CONTROL DE COMPRAS (${opciones.anio})`;
    ws.getCell(FILA_TITULO, 1).font = fontTituloReporte;
    ws.getCell(FILA_TITULO, 1).alignment = {
      vertical: "middle",
      horizontal: "left",
    };
    ws.getRow(FILA_TITULO).height = 34;

    // ── Anchos de columna ──────────────────────────────────────────────
    const anchos: number[] = [];
    GRUPOS.forEach((grupo) => {
      grupo.columnas.forEach((col) => anchos.push(col.ancho));
    });
    anchos.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });
    const TOTAL_COLUMNAS = anchos.length;

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
      // Los grupos de fondo claro (amarillo) llevan texto negro: el blanco
      // sobre amarillo no se lee.
      const colorTexto = grupo.textoNegro ? COLOR_TEXTO : "FFFFFFFF";

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

      // Nivel 2: los sub-grupos (PLACAS, EG, CONDICION) se mergean; las
      // columnas sueltas quedan vacias con el color del nivel.
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
      // titulo (Excel lo recortaba y no se veia hasta hacer clic en la
      // celda). Alineado a la izquierda el boton queda a la derecha, libre.
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
    cargas.forEach((fila, index) => {
      const nFila = FILA_DATOS + index;
      const row = ws.getRow(nFila);

      let c = 1;
      GRUPOS.forEach((grupo) => {
        const aplicaFlete = !grupo.soloConFlete || Boolean(fila.pagar_flete);
        grupo.columnas.forEach((col) => {
          const celda = row.getCell(c);
          const bruto = aplicaFlete && col.valor ? col.valor(fila, index) : "";
          const valor = bruto === null || bruto === undefined ? "" : bruto;

          celda.value = valor;
          celda.font = fontDatos;
          celda.border = bordeHorizontal;
          if (typeof valor === "number") {
            celda.alignment = { vertical: "middle", horizontal: "right" };
            switch (col.fmt) {
              case "moneda":
                celda.numFmt = FMT_MONEDA;
                break;
              case "entero":
                celda.numFmt = FMT_ENTERO;
                break;
              case "porcentaje":
                celda.numFmt = FMT_PORCENTAJE;
                break;
              default:
                celda.numFmt = FMT_NUMERO;
            }
          } else {
            celda.alignment = { vertical: "middle", horizontal: "center" };
          }
          c++;
        });
      });
    });

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
