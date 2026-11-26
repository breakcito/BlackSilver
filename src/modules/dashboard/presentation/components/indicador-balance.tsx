import { useMemo, useState } from "react";
import { Badge, Text } from "@mantine/core";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";

import { TONO_EGRESO, TONO_INGRESO, TONO_NEUTRO } from "../dashboard-paleta";
import { etiquetaPeriodo, formatearMonto } from "../dashboard-calculos";
import type { RES_BalanceDashboard } from "../../service/dashboard.responses";

interface Props {
  balance: RES_BalanceDashboard;
  periodo: { fecha_inicio: string; fecha_fin: string };
  comparativo: { comparativo_inicio: string; comparativo_fin: string };
}

/** "CONSUMO_MINERAL" -> "Consumo mineral". */
const humanizar = (valor: string): string =>
  valor
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (letra) => letra.toUpperCase());

const COLUMNAS =
  "grid grid-cols-[minmax(0,1fr)_132px_132px_118px] gap-2 items-center";

/**
 * Ficha de una moneda.
 *
 * El resultado es el dato principal: va en grande. Los ingresos y egresos
 * son el contexto: van debajo, con el periodo anterior al lado para
 * contrastar de un vistazo.
 */
const FichaMoneda = ({
  moneda,
  ingresos,
  egresos,
  resultado,
  comparativo,
  etiquetaActual,
  etiquetaAnterior,
}: {
  moneda: string;
  ingresos: number;
  egresos: number;
  resultado: number;
  comparativo: { ingresos: number; egresos: number; resultado: number };
  etiquetaActual: string;
  etiquetaAnterior: string;
}) => {
  const variacionResultado =
    comparativo.resultado !== 0
      ? ((resultado - comparativo.resultado) / Math.abs(comparativo.resultado)) * 100
      : null;
  const favorable =
    variacionResultado === null || variacionResultado === 0
      ? null
      : variacionResultado > 0;
  const sinActividad = ingresos === 0 && egresos === 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <Text size="10px" fw={700} className="uppercase tracking-[0.16em] text-zinc-300">
          {moneda}
        </Text>
        <Text size="xs" fw={600} className="tabular-nums text-zinc-300">
          {etiquetaActual}
        </Text>
      </div>

      <div className="mt-2.5 flex flex-wrap items-end gap-x-3 gap-y-1">
        <Text
          size="30px"
          fw={800}
          className={`leading-none tabular-nums tracking-tight ${
            sinActividad
              ? "text-zinc-600"
              : resultado >= 0
                ? TONO_INGRESO.texto
                : TONO_EGRESO.texto
          }`}
        >
          {sinActividad
            ? "—"
            : `${resultado >= 0 ? "+" : "-"}${formatearMonto(moneda, resultado)}`}
        </Text>

        {variacionResultado !== null && (
          <Badge
            size="sm"
            radius="sm"
            variant="light"
            color={favorable === null ? "gray" : favorable ? "teal" : "red"}
            leftSection={
              variacionResultado > 0 ? (
                <ArrowUpIcon className="w-3 h-3" />
              ) : (
                <ArrowDownIcon className="w-3 h-3" />
              )
            }
          >
            {variacionResultado > 0 ? "+" : ""}
            {variacionResultado.toFixed(1)}%
          </Badge>
        )}
      </div>

      <Text size="xs" className="mt-1 text-zinc-400">
        {sinActividad
          ? "Sin actividad en el periodo"
          : `Resultado · ${etiquetaAnterior}: ${
              comparativo.resultado >= 0 ? "+" : "-"
            } ${formatearMonto(moneda, comparativo.resultado)}`}
      </Text>

      <div className="mt-3 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            <Text size="10px" fw={700} className="uppercase tracking-wider text-zinc-200">
              Ingresos
            </Text>
          </div>
          <Text size="md" fw={700} className="mt-1 tabular-nums text-teal-300">
            {formatearMonto(moneda, ingresos)}
          </Text>
          <Text size="xs" className="tabular-nums text-zinc-400">
            {etiquetaAnterior}: {formatearMonto(moneda, comparativo.ingresos)}
          </Text>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <Text size="10px" fw={700} className="uppercase tracking-wider text-zinc-200">
              Egresos
            </Text>
          </div>
          <Text size="md" fw={700} className="mt-1 tabular-nums text-red-300">
            {formatearMonto(moneda, egresos)}
          </Text>
          <Text size="xs" className="tabular-nums text-zinc-400">
            {etiquetaAnterior}: {formatearMonto(moneda, comparativo.egresos)}
          </Text>
        </div>
      </div>
    </div>
  );
};

/**
 * Desglose de una moneda por origen.
 *
 * Es la misma grilla del modulo Balances: categoria, monto del periodo,
 * monto del periodo anterior y variacion. Sin la comparacion no se puede
 * leer si el movimiento crecio o cayo.
 */
const DesgloseMoneda = ({
  origenes,
  etiquetaActual,
  etiquetaAnterior,
}: {
  origenes: RES_BalanceDashboard["origenes"];
  etiquetaActual: string;
  etiquetaAnterior: string;
}) => {
  const maxMonto = useMemo(
    () => Math.max(0, ...origenes.map((o) => o.monto)),
    [origenes],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className={`${COLUMNAS} px-3 py-2 border-b border-zinc-800 bg-zinc-900/80`}>
        <Text size="10px" fw={700} className="uppercase tracking-wider text-zinc-300">
          Categoria
        </Text>
        <Text size="10px" fw={700} className="uppercase tracking-wider text-zinc-300 text-left">
          {etiquetaActual}
        </Text>
        <Text size="10px" fw={700} className="uppercase tracking-wider text-zinc-300 text-left">
          {etiquetaAnterior}
        </Text>
        <Text size="10px" fw={700} className="uppercase tracking-wider text-zinc-300 text-left">
          Variacion
        </Text>
      </div>

      {origenes.map((origen, indice) => {
        const esIngreso = origen.tipo === "INGRESO";
        const ancho = maxMonto > 0 ? (origen.monto / maxMonto) * 100 : 0;

        // El color dice si el BALANCE mejora: mas ingreso o menos gasto.
        const mejora = esIngreso
          ? origen.monto > origen.anterior
          : origen.monto < origen.anterior;

        return (
          <div
            key={`${origen.origen}-${origen.tipo}`}
            className={`${COLUMNAS} px-3 py-2.5 hover:bg-zinc-800/40 transition-colors ${
              indice < origenes.length - 1 ? "border-b border-zinc-800/70" : ""
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  esIngreso ? "bg-teal-400" : "bg-red-400"
                }`}
              />
              <Text size="xs" fw={600} className="text-zinc-100 truncate">
                {humanizar(origen.origen)}
              </Text>
            </div>

            <div className="flex flex-col gap-1 items-start">
              <Text size="xs" fw={700} className="text-white tabular-nums leading-none">
                {formatearMonto(origen.moneda, origen.monto)}
              </Text>
              <div className="mr-auto h-1.5 w-18 rounded-full bg-zinc-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    esIngreso ? "bg-teal-400" : "bg-red-400"
                  }`}
                  style={{ width: `${Math.max(4, ancho)}%` }}
                />
              </div>
            </div>

            <div className="text-left">
              {origen.anterior === 0 ? (
                <Text size="xs" className="text-zinc-400">
                  Sin actividad
                </Text>
              ) : (
                <Text size="xs" fw={600} className="text-zinc-200 tabular-nums">
                  {formatearMonto(origen.moneda, origen.anterior)}
                </Text>
              )}
            </div>

            <div className="text-left flex flex-col items-start gap-0.5">
              {origen.variacion === null ? (
                <Text size="xs" className="text-zinc-400">
                  —
                </Text>
              ) : (
                <>
                  <Text
                    size="xs"
                    fw={700}
                    className={`tabular-nums leading-none ${
                      origen.variacion === 0
                        ? "text-zinc-200"
                        : mejora
                          ? "text-teal-400"
                          : "text-red-400"
                    }`}
                  >
                    {origen.variacion > 0 ? "+" : ""}
                    {origen.variacion.toFixed(1)}%
                  </Text>
                  <Text size="xs" fw={600} className="text-zinc-400 tabular-nums">
                    {origen.monto - origen.anterior > 0 ? "+" : ""}
                    {formatearMonto(origen.moneda, origen.monto - origen.anterior)}
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
 * Indicador 3: ingresos, egresos y balance del periodo.
 *
 * Soles y dolares van en columnas separadas porque sus montos no son
 * comparables entre si: nunca se suman.
 */
export const IndicadorBalance = ({ balance, periodo, comparativo }: Props) => {
  const [verTodos, setVerTodos] = useState(false);
  const MAX_ORIGENES = 8;

  const etiquetaActual = etiquetaPeriodo(periodo.fecha_inicio, periodo.fecha_fin);
  const etiquetaAnterior = etiquetaPeriodo(
    comparativo.comparativo_inicio,
    comparativo.comparativo_fin,
  );

  if (balance.monedas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center">
        <Text size="xs" className="text-zinc-500">
          Sin informacion de balance en este periodo
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {balance.monedas.map((moneda) => (
          <FichaMoneda
            key={moneda.moneda}
            moneda={moneda.moneda}
            ingresos={moneda.ingresos}
            egresos={moneda.egresos}
            resultado={moneda.resultado}
            comparativo={moneda.comparativo}
            etiquetaActual={etiquetaActual}
            etiquetaAnterior={etiquetaAnterior}
          />
        ))}
      </div>

      {/* Desglose por origen: una tabla por moneda */}
      {balance.monedas.map((moneda) => {
        const origenes = balance.origenes.filter(
          (origen) => origen.moneda === moneda.moneda,
        );

        if (origenes.length === 0) return null;

        const visibles = verTodos
          ? origenes
          : origenes.slice(0, MAX_ORIGENES);

        return (
          <div key={moneda.moneda}>
            <Text
              size="9px"
              fw={700}
              className="mb-1.5 uppercase tracking-[0.14em] text-zinc-500"
            >
              Que origen explica el movimiento · {moneda.moneda}
            </Text>

            <DesgloseMoneda
              origenes={visibles}
              etiquetaActual={etiquetaActual}
              etiquetaAnterior={etiquetaAnterior}
            />
          </div>
        );
      })}

      {balance.origenes.length > MAX_ORIGENES && (
        <button
          type="button"
          onClick={() => setVerTodos((v) => !v)}
          className={`text-xs font-semibold transition-colors hover:text-white ${
            verTodos ? TONO_NEUTRO.texto : "text-indigo-300"
          }`}
        >
          {verTodos ? "Ver menos" : "Ver todos los origenes"}
        </button>
      )}
    </div>
  );
};
