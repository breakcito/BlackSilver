import dayjs from "dayjs";

import {
  BalanceMoneda,
  BalancePeriodo,
  BalanceTipo,
} from "../../../shared/enums/balances/balances";
import type {
  RES_MovimientoBalance,
  RES_OrigenBalance,
} from "../service/balances.responses";

/**
 * Rango de fechas del balance (YYYY-MM-DD).
 */
export interface RangoFechas {
  fecha_inicio: string;
  fecha_fin: string;
}

/**
 * Como se compara el periodo actual contra el de referencia.
 */
export type EstadoComparacion = "comparable" | "nuevo" | "sin_actividad";

/**
 * Totales de una moneda en el periodo actual y en el de comparacion.
 *
 * Los soles y los dolares se resumen POR SEPARADO: nunca se suman entre si.
 */
export interface ResumenMoneda {
  moneda: BalanceMoneda;
  ingresos: number;
  egresos: number;
  /** Ingresos - egresos. */
  resultado: number;
  ingresosComparativo: number;
  egresosComparativo: number;
  resultadoComparativo: number;
  /** Cantidad de movimientos en cada periodo. */
  movimientos: number;
  movimientosComparativo: number;
}

/**
 * Totales de un origen (categoria economica) en ambos periodos.
 */
export interface ResumenCategoria {
  origen: string;
  label: string;
  ambito: string;
  tipo: BalanceTipo;
  /** Suma del periodo actual. */
  total: number;
  /** Suma del periodo de comparacion. */
  totalComparativo: number;
  /** total - totalComparativo. */
  diferencia: number;
  /** Variacion porcentual; null cuando el comparativo es 0 (no es calculable). */
  variacion: number | null;
  movimientos: number;
  movimientosComparativo: number;
  /**
   * Como se compara la categoria con el periodo anterior:
   * - comparable: hubo movimiento en los dos periodos.
   * - nuevo: solo hubo movimiento en el periodo actual.
   * - sin_actividad: solo hubo movimiento en el periodo anterior.
   */
  comparacion: EstadoComparacion;
}

/**
 * Filtros que el usuario aplica sobre la informacion ya cargada.
 * Se resuelven en el navegador: recalculan al instante, sin ir al servidor.
 */
export interface FiltrosBalance {
  ambito: string | null;
  tipo: string | null;
  origen: string | null;
  busqueda: string;
}

/**
 * Monedas que maneja el balance. Se devuelven siempre las dos, tengan o no
 * movimientos, para que la vista no "salte" al cambiar de una a otra.
 */
export const MONEDAS_BALANCE: BalanceMoneda[] = [
  BalanceMoneda.Soles,
  BalanceMoneda.Dolares,
];

/**
 * Formatea un monto con su simbolo de moneda.
 * El signo va delante del simbolo: "-S/ 1,234.56", no "S/ -1,234.56".
 *
 * Cada moneda se muestra por separado: los dolares nunca se suman con los soles.
 */
export const formatearMonto = (
  moneda: BalanceMoneda | string,
  valor: number,
): string => {
  const simbolo = moneda === BalanceMoneda.Dolares ? "$" : "S/";
  const numero = Number.isFinite(valor) ? valor : 0;
  const texto = Math.abs(numero).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return numero < 0 ? `${simbolo} ${texto}` : `${simbolo} ${texto}`;
};

/**
 * Normaliza un texto para la busqueda: sin tildes y en minusculas.
 */
const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Rango de un mes calendario (YYYY-MM-DD).
 */
export const rangoDelMes = (mes: number, anio: number): RangoFechas => {
  const base = dayjs(`${anio}-${String(mes).padStart(2, "0")}-01`);
  return {
    fecha_inicio: base.startOf("month").format("YYYY-MM-DD"),
    fecha_fin: base.endOf("month").format("YYYY-MM-DD"),
  };
};

/**
 * Etiqueta de un mes: "Noviembre 2026".
 */
export const etiquetaMes = (mes: number, anio: number): string => {
  const texto = dayjs(
    `${anio}-${String(mes).padStart(2, "0")}-01`,
  ).format("MMMM YYYY");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/**
 * Etiqueta corta de un mes: "Oct 26".
 */
export const etiquetaMesCorta = (mes: number, anio: number): string => {
  const texto = dayjs(
    `${anio}-${String(mes).padStart(2, "0")}-01`,
  ).format("MMM YY");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/**
 * Variacion porcentual entre dos montos. Devuelve null cuando el monto
 * base es 0: en ese caso el porcentaje no es calculable (no es "infinitos").
 */
export const calcularVariacion = (
  actual: number,
  anterior: number,
): number | null => {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
};

/**
 * Aplica los filtros dinamicos sobre los movimientos cargados.
 *
 * La busqueda es de texto libre y revisa descripcion, referencia, detalle y
 * origen: el usuario escribe "molino", "LOT-001" o "winche" y encuentra el
 * movimiento sin saber de que modulo salio.
 */
export const filtrarMovimientos = (
  movimientos: RES_MovimientoBalance[],
  filtros: FiltrosBalance,
): RES_MovimientoBalance[] => {
  const consulta = normalizar(filtros.busqueda.trim());

  return movimientos.filter((m) => {
    if (filtros.ambito && m.ambito !== filtros.ambito) return false;
    if (filtros.tipo && m.tipo !== filtros.tipo) return false;
    if (filtros.origen && m.origen !== filtros.origen) return false;

    if (consulta) {
      const texto = normalizar(
        [
          m.descripcion,
          m.referencia ?? "",
          m.detalle ?? "",
          m.origen,
          m.fecha,
        ].join(" "),
      );
      if (!texto.includes(consulta)) return false;
    }

    return true;
  });
};

/**
 * Resumen por moneda de los movimientos recibidos.
 *
 * @param movimientos Movimientos ya filtrados (de ambos periodos).
 */
export const resumirPorMoneda = (
  movimientos: RES_MovimientoBalance[],
): ResumenMoneda[] => {
  const mapa = new Map<BalanceMoneda, ResumenMoneda>();

  MONEDAS_BALANCE.forEach((moneda) => {
    mapa.set(moneda, {
      moneda,
      ingresos: 0,
      egresos: 0,
      resultado: 0,
      ingresosComparativo: 0,
      egresosComparativo: 0,
      resultadoComparativo: 0,
      movimientos: 0,
      movimientosComparativo: 0,
    });
  });

  movimientos.forEach((m) => {
    const actual = mapa.get(m.moneda);
    if (!actual) return;

    const esActual = m.periodo === BalancePeriodo.Actual;
    if (esActual) actual.movimientos += 1;
    else actual.movimientosComparativo += 1;

    if (m.tipo === BalanceTipo.Ingreso) {
      if (esActual) actual.ingresos += m.monto;
      else actual.ingresosComparativo += m.monto;
    } else {
      if (esActual) actual.egresos += m.monto;
      else actual.egresosComparativo += m.monto;
    }
  });

  mapa.forEach((r) => {
    r.resultado = r.ingresos - r.egresos;
    r.resultadoComparativo = r.ingresosComparativo - r.egresosComparativo;
  });

  return Array.from(mapa.values());
};

/**
 * Resumen por origen (categoria economica) de los movimientos recibidos.
 *
 * Cada origen es siempre de un solo tipo (ingreso o egreso), asi que el
 * total de la categoria es el monto de ese lado del balance.
 *
 * @param movimientos Movimientos ya filtrados (de ambos periodos).
 * @param origenes    Catalogo de origenes con su etiqueta legible.
 */
export const resumirPorCategoria = (
  movimientos: RES_MovimientoBalance[],
  origenes: RES_OrigenBalance[],
): ResumenCategoria[] => {
  const etiquetas = new Map(origenes.map((o) => [o.value, o]));

  const mapa = new Map<string, ResumenCategoria>();

  const obtener = (m: RES_MovimientoBalance): ResumenCategoria => {
    let categoria = mapa.get(m.origen);
    if (!categoria) {
      const meta = etiquetas.get(m.origen);
      categoria = {
        origen: m.origen,
        label: meta?.label ?? m.origen,
        ambito: meta?.ambito ?? m.ambito,
        tipo: meta?.tipo ?? m.tipo,
        total: 0,
        totalComparativo: 0,
        diferencia: 0,
        variacion: null,
        movimientos: 0,
        movimientosComparativo: 0,
        comparacion: "comparable",
      };
      mapa.set(m.origen, categoria);
    }
    return categoria;
  };

  movimientos.forEach((m) => {
    const categoria = obtener(m);
    if (m.periodo === BalancePeriodo.Actual) {
      categoria.total += m.monto;
      categoria.movimientos += 1;
    } else {
      categoria.totalComparativo += m.monto;
      categoria.movimientosComparativo += 1;
    }
  });

  const lista = Array.from(mapa.values());
  lista.forEach((c) => {
    c.diferencia = c.total - c.totalComparativo;
    c.variacion = calcularVariacion(c.total, c.totalComparativo);

    // Una categoria sin movimientos en uno de los periodos no tiene una
    // variacion que signifique nada: se marca para poder decirlo claro.
    if (c.movimientos === 0) c.comparacion = "sin_actividad";
    else if (c.movimientosComparativo === 0) c.comparacion = "nuevo";
    else c.comparacion = "comparable";
  });

  // De mayor a menor por monto del periodo actual: el desglose se lee de
  // un vistazo, sin tener que ordenar.
  return lista.sort((a, b) => b.total - a.total);
};

/**
 * Mayor monto de una lista de categorias. Es la referencia con la que se
 * dibuja la barra de peso de cada categoria.
 */
export const mayorMonto = (categorias: ResumenCategoria[]): number =>
  categorias.reduce((max, c) => Math.max(max, c.total), 0);
