import { useMemo } from "react";
import { Text } from "@mantine/core";

import { BalanceTipo } from "../../../../shared/enums/balances/balances";
import {
  formatearMonto,
  type ResumenCategoria,
} from "../balances-calculos";

interface Props {
  /** Categorias de cada moneda: el desglose nunca mezcla montos. */
  grupos: { moneda: string; categorias: ResumenCategoria[] }[];
}

/**
 * Grilla del desglose de una moneda.
 *
 * Se construye a mano (y no con la tabla estandar) para que la barra de
 * peso quede alineada con la cifra que representa y para que las columnas
 * de montos caigan exactas: comparar es leer de un vistazo.
 */
const Grilla = ({
  categorias,
  moneda,
}: {
  categorias: ResumenCategoria[];
  moneda: string;
}) => {
  /**
   * Referencia de la barra: el mayor monto de cada lado (ingresos y egresos).
   * Las barras son comparables dentro de su moneda, nunca entre monedas.
   */
  const { maxIngresos, maxEgresos } = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;
    categorias.forEach((c) => {
      if (c.tipo === BalanceTipo.Ingreso) ingresos = Math.max(ingresos, c.total);
      else egresos = Math.max(egresos, c.total);
    });
    return { maxIngresos: ingresos, maxEgresos: egresos };
  }, [categorias]);

  if (categorias.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center">
        <Text size="xs" className="text-zinc-500">
          Sin movimientos en {moneda === "Soles" ? "soles" : "dólares"}
        </Text>
      </div>
    );
  }

  const columnas = "grid grid-cols-[minmax(0,1fr)_132px_132px_118px] gap-2 items-center";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Encabezado */}
      <div
        className={`${columnas} px-3 py-2 border-b border-zinc-800 bg-zinc-900/80`}
      >
        <Text size="10px" fw={700} className="text-zinc-300 uppercase tracking-wider">
          Categoría
        </Text>
        <Text
          size="10px"
          fw={700}
          className="text-zinc-300 uppercase tracking-wider text-left"
        >
          Periodo actual
        </Text>
        <Text
          size="10px"
          fw={700}
          className="text-zinc-300 uppercase tracking-wider text-left"
        >
          Anterior
        </Text>
        <Text
          size="10px"
          fw={700}
          className="text-zinc-300 uppercase tracking-wider text-left"
        >
          Variación
        </Text>
      </div>

      {/* Filas */}
      {categorias.map((c, indice) => {
        const esIngreso = c.tipo === BalanceTipo.Ingreso;
        const referencia = esIngreso ? maxIngresos : maxEgresos;
        const ancho = referencia > 0 ? (c.total / referencia) * 100 : 0;

        // El color dice si el BALANCE mejora: mas ingreso o menos gasto.
        const mejora = esIngreso ? c.diferencia > 0 : c.diferencia < 0;

        return (
          <div
            key={c.origen}
            className={`${columnas} px-3 py-2.5 hover:bg-zinc-800/40 transition-colors ${
              indice < categorias.length - 1 ? "border-b border-zinc-800/70" : ""
            }`}
          >
            {/* Categoria */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  esIngreso ? "bg-teal-400" : "bg-red-400"
                }`}
              />
              <Text size="xs" fw={600} className="text-zinc-100 truncate">
                {c.label}
              </Text>
            </div>

            {/* Periodo actual + barra de peso */}
            <div className="flex flex-col gap-1 items-start">
              {c.movimientos === 0 ? (
                <Text size="xs" className="text-zinc-400">
                  Sin actividad
                </Text>
              ) : (
                <>
                  <Text
                    size="xs"
                    fw={700}
                    className="text-white tabular-nums leading-none"
                  >
                    {formatearMonto(moneda, c.total)}
                  </Text>
                  <div className="mr-auto h-1.5 w-18 rounded-full bg-zinc-700/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        esIngreso ? "bg-teal-400" : "bg-red-400"
                      }`}
                      style={{ width: `${Math.max(4, ancho)}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Periodo anterior */}
            <div className="text-left">
              {c.movimientosComparativo === 0 ? (
                <Text size="xs" className="text-zinc-400">
                  Sin actividad
                </Text>
              ) : (
                <Text size="xs" fw={600} className="text-zinc-200 tabular-nums">
                  {formatearMonto(moneda, c.totalComparativo)}
                </Text>
              )}
            </div>

            {/* Variacion */}
            <div className="text-left flex flex-col items-start gap-0.5">
              {c.variacion === null ? (
                <Text size="xs" className="text-zinc-400">
                  —
                </Text>
              ) : (
                <>
                  <Text
                    size="xs"
                    fw={700}
                    className={`tabular-nums leading-none ${
                      c.diferencia === 0
                        ? "text-zinc-200"
                        : mejora
                          ? "text-teal-400"
                          : "text-red-400"
                    }`}
                  >
                    {c.variacion > 0 ? "+" : ""}
                    {c.variacion.toFixed(1)}%
                  </Text>
                  <Text size="xs" fw={600} className="text-zinc-400 tabular-nums">
                    {c.diferencia === 0
                      ? "—"
                      : `${c.diferencia > 0 ? "+" : "−"}${formatearMonto(
                          moneda,
                          Math.abs(c.diferencia),
                        )}`}
                  </Text>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Desglose del balance por categoria.
 *
 * Un panel por moneda, en paralelo: los soles y los dolares se ven a la
 * vez pero jamas se suman. Cada panel mantiene su propia escala, porque un
 * equivalente en dolares no es comparable con uno en soles.
 */
export const BalancesDesgloseCategorias = ({ grupos }: Props) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {grupos.map((grupo) => (
        <div key={grupo.moneda} className="min-w-0">
          <div className="flex items-center gap-2 px-1 pb-2">
            <span
              className={`w-2 h-2 rounded-full ${
                grupo.moneda === "Soles" ? "bg-zinc-300" : "bg-blue-400"
              }`}
            />
            <Text
              size="xs"
              fw={700}
              className="text-zinc-200 uppercase tracking-[0.14em]"
            >
              {grupo.moneda}
            </Text>
            <Text size="xs" className="text-zinc-400">
              {grupo.categorias.length}{" "}
              {grupo.categorias.length === 1 ? "categoría" : "categorías"}
            </Text>
          </div>

          <Grilla categorias={grupo.categorias} moneda={grupo.moneda} />
        </div>
      ))}
    </div>
  );
};
