import type { ITonoDashboard } from "../dashboard-paleta";

/**
 * Opcion de filtro por almacen.
 *
 * Las opciones las arma CADA bloque con los almacenes que aparecen en sus
 * propios datos: asi el filtro nunca ofrece un almacen que no tiene nada que
 * mostrar, que es lo que hacia confuso el filtro global.
 */
export interface IOpcionAlmacen {
  id_almacen: number;
  almacen: string;
  /** Numero que se cuenta (productos, maquinas, ordenes...). */
  cantidad: number;
  /** Sufijo del numero: "productos", "maquinas", "items". */
  sufijo?: string;
  /** Contador secundario (ej. "2 sin stock"). */
  extra?: { texto: string; tono: ITonoDashboard };
}

interface Props {
  opciones: IOpcionAlmacen[];
  /** Almacen activo. `null` significa "todos". */
  seleccionado: number | null;
  onSeleccionar: (id_almacen: number | null) => void;
  /** Sustantivo de lo que se cuenta: "productos", "maquinas", "items". */
  sustantivo: string;
  /**
   * Sustantivo del chip "Todos".
   *
   * Por defecto es el mismo, pero un bloque puede necesitar distintos: en
   * stock critico, "Todos" cuenta los productos y cada almacen cuenta sus
   * criticos mas los que estan sin stock.
   */
  totalEtiqueta?: string;
  /**
   * Total que muestra el chip "Todos".
   *
   * Por defecto es la suma de las opciones, pero un bloque puede necesitar
   * otro: en stock critico, "Todos" cuenta los productos mientras cada
   * almacen cuenta sus criticos mas los que estan sin stock.
   */
  total?: number;
}

/**
 * Filtro por almacen de un indicador.
 *
 * Los chips son el filtro: el usuario ve el desglose y lo usa para filtrar
 * con un click, sin volver a pedir los datos. Volver a pulsar el chip activo
 * lo desactiva.
 */
export const DashboardFiltroAlmacen = ({
  opciones,
  seleccionado,
  onSeleccionar,
  sustantivo,
  totalEtiqueta,
  total,
}: Props) => {
  if (opciones.length === 0) return null;

  const suma = opciones.reduce((suma, opcion) => suma + opcion.cantidad, 0);
  const totalMostrado = total ?? suma;

  const claseBase =
    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors";
  const claseActivo =
    "border-indigo-500/50 bg-indigo-500/15 text-indigo-200";
  const claseInactivo =
    "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {opciones.length > 1 && (
        <button
          type="button"
          onClick={() => onSeleccionar(null)}
          className={`${claseBase} ${
            seleccionado === null ? claseActivo : claseInactivo
          }`}
        >
          <span>Todos</span>
          <span className="tabular-nums opacity-70">
            {totalMostrado} {totalEtiqueta ?? sustantivo}
          </span>
        </button>
      )}

      {opciones.map((opcion) => {
        const activo = seleccionado === opcion.id_almacen;

        return (
          <button
            key={opcion.id_almacen}
            type="button"
            onClick={() => onSeleccionar(activo ? null : opcion.id_almacen)}
            className={`${claseBase} ${activo ? claseActivo : claseInactivo}`}
          >
            <span className="font-semibold">{opcion.almacen}</span>
            <span className="tabular-nums opacity-70">
              {opcion.cantidad} {opcion.sufijo ?? sustantivo}
            </span>
            {opcion.extra && (
              <span
                className={`rounded px-1 text-[10px] font-bold ${opcion.extra.tono.suave} ${opcion.extra.tono.texto}`}
              >
                {opcion.extra.texto}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Agrupa items por almacen para armar las opciones del filtro.
 *
 * @param items Items con `id_almacen` y `almacen`.
 */
export const agruparPorAlmacen = <
  T extends { id_almacen: number | null; almacen: string | null },
>(
  items: T[],
  contar: (items: T[]) => number,
): IOpcionAlmacen[] => {
  const grupos = new Map<number, { almacen: string; items: T[] }>();

  items.forEach((item) => {
    if (item.id_almacen === null) return;

    const actual = grupos.get(item.id_almacen) ?? {
      almacen: item.almacen ?? `Almacen ${item.id_almacen}`,
      items: [],
    };
    actual.items.push(item);
    grupos.set(item.id_almacen, actual);
  });

  return Array.from(grupos.entries()).map(([id_almacen, grupo]) => ({
    id_almacen,
    almacen: grupo.almacen,
    cantidad: contar(grupo.items),
  }));
};
