import { useMemo, useState } from "react";
import { Badge, Text } from "@mantine/core";

import { TONO_NEUTRO, tonoStock } from "../dashboard-paleta";
import { formatearCantidad } from "../dashboard-calculos";
import { DashboardBarra, DashboardVacio } from "./dashboard-ui";
import type { RES_StockCritico } from "../../service/dashboard.responses";

interface Props {
  stock: RES_StockCritico;
}

const LIMITE_INICIAL = 8;

/**
 * Indicador 1: stock critico por almacen.
 *
 * El universo es el inventario real: solo aparecen los productos que tienen
 * lotes en ese almacen. Cada fila dice cuanto hay, cuanto se pide y cuanto
 * falta, con una barra de cobertura que hace visible la distancia al minimo.
 */
export const IndicadorStockCritico = ({ stock }: Props) => {
  const [verTodos, setVerTodos] = useState(false);

  const porAlmacen = useMemo(() => {
    const grupos = new Map<
      number,
      { id_almacen: number; almacen: string; items: RES_StockCritico["items"] }
    >();

    stock.items.forEach((item) => {
      const actual = grupos.get(item.id_almacen) ?? {
        id_almacen: item.id_almacen,
        almacen: item.almacen,
        items: [],
      };
      actual.items.push(item);
      grupos.set(item.id_almacen, actual);
    });

    return Array.from(grupos.values());
  }, [stock.items]);

  if (stock.items.length === 0) {
    return (
      <DashboardVacio texto="Ningun producto por debajo de su stock minimo" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen por almacen */}
      <div className="flex flex-wrap gap-2">
        {stock.resumen.almacenes.map((almacen) => (
          <span
            key={almacen.id_almacen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs"
          >
            <span className="font-semibold text-zinc-200">{almacen.almacen}</span>
            {almacen.sin_stock > 0 && (
              <span className="rounded bg-red-500/15 px-1 text-[10px] font-bold text-red-300">
                {almacen.sin_stock} sin stock
              </span>
            )}
            <span className="rounded bg-yellow-500/15 px-1 text-[10px] font-bold text-yellow-300">
              {almacen.criticos} criticos
            </span>
          </span>
        ))}
      </div>

      {/* Detalle */}
      <div className="space-y-4">
        {porAlmacen.map((grupo) => {
          const visibles = verTodos
            ? grupo.items
            : grupo.items.slice(0, LIMITE_INICIAL);

          return (
            <div key={grupo.id_almacen}>
              <div className="mb-2 flex items-center gap-2">
                <Text
                  size="10px"
                  fw={700}
                  className="uppercase tracking-[0.14em] text-zinc-400"
                >
                  {grupo.almacen}
                </Text>
                <span className="h-px flex-1 bg-zinc-800" />
                <Text size="10px" className="tabular-nums text-zinc-500">
                  {grupo.items.length} productos
                </Text>
              </div>

              <div className="space-y-2">
                {visibles.map((item) => {
                  const tono = tonoStock(item.estado);

                  return (
                    <div
                      key={`${item.id_almacen}-${item.id_producto}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Text
                            size="sm"
                            fw={600}
                            className="truncate text-zinc-100"
                          >
                            {item.producto}
                          </Text>
                          <Text size="xs" className="truncate text-zinc-500">
                            {item.categoria ?? "Sin categoria"}
                            {item.unidad ? ` · ${item.unidad}` : ""}
                          </Text>
                        </div>

                        <Badge
                          size="xs"
                          radius="sm"
                          variant="light"
                          color={tono.chip}
                          className="shrink-0"
                        >
                          {item.estado}
                        </Badge>
                      </div>

                      <div className="mt-2">
                        <DashboardBarra
                          valor={Math.min(item.stock_actual_base, item.stock_minimo_base)}
                          maximo={item.stock_minimo_base}
                          tono={tono}
                        />
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                        <span className="tabular-nums text-zinc-400">
                          Stock{" "}
                          <span className="font-bold text-zinc-200">
                            {formatearCantidad(item.stock_actual_base)}
                          </span>{" "}
                          / {formatearCantidad(item.stock_minimo_base)}
                        </span>
                        <span className={`font-semibold tabular-nums ${tono.texto}`}>
                          Faltan {formatearCantidad(item.faltante_base)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {stock.items.length > LIMITE_INICIAL && (
        <button
          type="button"
          onClick={() => setVerTodos((v) => !v)}
          className={`text-xs font-semibold transition-colors hover:text-white ${
            verTodos ? TONO_NEUTRO.texto : "text-indigo-300"
          }`}
        >
          {verTodos
            ? "Ver menos"
            : `Ver los ${stock.items.length} productos`}
        </button>
      )}
    </div>
  );
};
