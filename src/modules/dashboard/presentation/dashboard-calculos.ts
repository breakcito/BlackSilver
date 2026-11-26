import dayjs from "dayjs";

import { MESES } from "../../../shared/variables/meses";
import type { RES_Dashboard } from "../service/dashboard.responses";

/**
 * Formatea un monto con el simbolo de su moneda.
 *
 * Soles y dolares NUNCA se suman: cada cifra lleva el simbolo de la moneda
 * en la que esta, y el signo va delante del simbolo ("-S/ 1,234.56").
 */
export const formatearMonto = (moneda: string, valor: number): string => {
  const simbolo = moneda === "Dólares" ? "$" : "S/";
  const numero = Number.isFinite(valor) ? valor : 0;
  const texto = Math.abs(numero).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${simbolo} ${texto}`;
};

/**
 * Formatea una cantidad de unidades base sin simbolo de moneda.
 */
export const formatearCantidad = (valor: number, decimales = 2): string => {
  const numero = Number.isFinite(valor) ? valor : 0;
  return numero.toLocaleString("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
};

/**
 * Etiqueta legible de un periodo: "Noviembre 2026".
 */
export const etiquetaPeriodo = (
  fecha_inicio: string,
  fecha_fin: string,
): string => {
  const inicio = dayjs(fecha_inicio);
  const fin = dayjs(fecha_fin);

  if (inicio.month() === fin.month() && inicio.year() === fin.year()) {
    return `${MESES[inicio.month()].label} ${inicio.year()}`;
  }

  return `${MESES[inicio.month()].label} ${inicio.year()} - ${MESES[fin.month()].label} ${fin.year()}`;
};

/**
 * Variacion porcentual entre el periodo actual y el comparativo.
 *
 * Devuelve null cuando no hay base de comparacion (periodo anterior en
 * ceros): mostrar "+inf%" seria mentir.
 */
export const variacion = (
  actual: number,
  anterior: number,
): number | null => {
  if (!Number.isFinite(actual) || !Number.isFinite(anterior)) return null;
  if (anterior === 0) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
};

/**
 * Etapas del embudo logistico, en orden de avance.
 *
 * Los conteos que llegan del API pueden traer estados que no estan en esta
 * lista (el sistema permite estados nuevos): esos se muestran al final, en
 * su propia fila, para no esconder informacion.
 */
export const ETAPAS_EMBUDO = [
  "Esperando Aprobación",
  "Consultando a Logística",
  "Aprobado por Logística",
  "Solicitando Préstamo",
  "En Despacho",
];

/**
 * Cuenta los items por etapa del embudo, uniendo requerimientos y solicitudes.
 *
 * El conteo es de ITEMS (lo que realmente traba el flujo), no de cabeceras.
 */
export const conteoPorEtapa = (
  etapas: { tipo: string; etapa: string; cantidad: number }[],
): { etapa: string; cantidad: number; extras: boolean }[] => {
  const porEtapa = new Map<string, number>();

  etapas.forEach(({ etapa, cantidad }) => {
    porEtapa.set(etapa, (porEtapa.get(etapa) ?? 0) + cantidad);
  });

  const conocidas = ETAPAS_EMBUDO.filter((etapa) => porEtapa.has(etapa)).map(
    (etapa) => ({ etapa, cantidad: porEtapa.get(etapa) ?? 0, extras: false }),
  );

  const extras = Array.from(porEtapa.entries())
    .filter(([etapa]) => !ETAPAS_EMBUDO.includes(etapa))
    .map(([etapa, cantidad]) => ({ etapa, cantidad, extras: true }));

  return [...conocidas, ...extras];
};

/**
 * Aplica el Modo Auditoria.
 *
 * El Modo Auditoria es 100% del cliente: el backend no conoce el flag y lo
 * resuelve el front, igual que hace el modulo de Productos. Los productos
 * auditables desaparecen de los bloques que exponen producto (stock critico,
 * items de compra y pendientes vencidos).
 */
export const aplicarModoAuditoria = (
  data: RES_Dashboard,
  enModoAuditable: boolean,
): RES_Dashboard => {
  if (!enModoAuditable) return data;

  const stockItems = data.stock_critico.items.filter(
    (item) => !item.es_auditable,
  );
  const sinStock = stockItems.filter((item) => item.estado === "Sin stock").length;

  const porAlmacen = new Map<
    number,
    {
      id_almacen: number;
      almacen: string;
      items: number;
      criticos: number;
      sin_stock: number;
    }
  >();

  stockItems.forEach((item) => {
    const actual = porAlmacen.get(item.id_almacen) ?? {
      id_almacen: item.id_almacen,
      almacen: item.almacen,
      items: 0,
      criticos: 0,
      sin_stock: 0,
    };

    actual.items += 1;
    if (item.estado === "Sin stock") actual.sin_stock += 1;
    else actual.criticos += 1;

    porAlmacen.set(item.id_almacen, actual);
  });

  const ocs = data.compras_pendientes.ocs
    .map((oc) => {
      const items = oc.items.filter((item) => !item.es_auditable);
      return {
        ...oc,
        items,
        items_pendientes: items.filter(
          (item) => item.estado !== "Recepción Completa",
        ).length,
      };
    })
    .filter((oc) => oc.items.length > 0);

  const vencidos = data.pendientes_atencion.vencidos.filter(
    (vencido) => !vencido.es_auditable,
  );

  return {
    ...data,
    stock_critico: {
      ...data.stock_critico,
      items: stockItems,
      resumen: {
        ...data.stock_critico.resumen,
        total_items: stockItems.length,
        criticos: stockItems.length - sinStock,
        sin_stock: sinStock,
        almacenes: Array.from(porAlmacen.values()),
      },
    },
    compras_pendientes: {
      ...data.compras_pendientes,
      ocs,
    },
    pendientes_atencion: {
      ...data.pendientes_atencion,
      vencidos,
    },
  };
};
