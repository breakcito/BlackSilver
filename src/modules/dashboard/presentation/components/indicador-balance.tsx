import { useMemo, useState } from "react";
import { Badge, Text } from "@mantine/core";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";

import {
  TONO_EGRESO,
  TONO_INGRESO,
  TONO_NEUTRO,
} from "../dashboard-paleta";
import {
  etiquetaPeriodo,
  formatearMonto,
  variacion,
} from "../dashboard-calculos";
import { DashboardBarra, DashboardVacio } from "./dashboard-ui";
import type { RES_BalanceDashboard } from "../../service/dashboard.responses";

interface Props {
  balance: RES_BalanceDashboard;
  periodo: { fecha_inicio: string; fecha_fin: string };
  comparativo: { fecha_inicio: string; fecha_fin: string };
}

/** "CONSUMO_MINERAL" -> "Consumo mineral". */
const humanizar = (valor: string): string =>
  valor
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (letra) => letra.toUpperCase());

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
  origenes,
}: {
  moneda: string;
  ingresos: number;
  egresos: number;
  resultado: number;
  comparativo: { ingresos: number; egresos: number; resultado: number };
  etiquetaActual: string;
  etiquetaAnterior: string;
  origenes: RES_BalanceDashboard["origenes"];
}) => {
  const variacionResultado = variacion(resultado, comparativo.resultado);
  const favorable =
    variacionResultado === null || variacionResultado === 0
      ? null
      : variacionResultado > 0;
  const sinActividad = ingresos === 0 && egresos === 0;

  const maxOrigen = useMemo(
    () => Math.max(0, ...origenes.map((o) => o.monto)),
    [origenes],
  );

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
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

      {origenes.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
          <Text size="9px" fw={700} className="uppercase tracking-[0.14em] text-zinc-500">
            Que origen explica el movimiento
          </Text>

          {origenes.map((origen) => (
            <div key={`${origen.origen}-${origen.tipo}`}>
              <div className="flex items-baseline justify-between gap-2">
                <Text size="xs" className="truncate text-zinc-300">
                  {humanizar(origen.origen)}
                </Text>
                <Text
                  size="xs"
                  fw={700}
                  className={`shrink-0 tabular-nums ${
                    origen.tipo === "INGRESO" ? TONO_INGRESO.texto : TONO_EGRESO.texto
                  }`}
                >
                  {formatearMonto(origen.moneda, origen.monto)}
                </Text>
              </div>
              <div className="mt-1">
                <DashboardBarra
                  valor={origen.monto}
                  maximo={maxOrigen}
                  tono={origen.tipo === "INGRESO" ? TONO_INGRESO : TONO_EGRESO}
                />
              </div>
            </div>
          ))}
        </div>
      )}
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
  const MAX_ORIGENES = 6;

  const etiquetaActual = etiquetaPeriodo(periodo.fecha_inicio, periodo.fecha_fin);
  const etiquetaAnterior = etiquetaPeriodo(
    comparativo.fecha_inicio,
    comparativo.fecha_fin,
  );

  if (balance.monedas.length === 0) {
    return <DashboardVacio texto="Sin informacion de balance en este periodo" />;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 lg:grid-cols-2">
        {balance.monedas.map((moneda) => {
          const origenes = balance.origenes.filter((o) => o.moneda === moneda.moneda);
          const visibles = verTodos
            ? origenes
            : origenes.slice(0, MAX_ORIGENES);

          return (
            <FichaMoneda
              key={moneda.moneda}
              moneda={moneda.moneda}
              ingresos={moneda.ingresos}
              egresos={moneda.egresos}
              resultado={moneda.resultado}
              comparativo={moneda.comparativo}
              etiquetaActual={etiquetaActual}
              etiquetaAnterior={etiquetaAnterior}
              origenes={visibles}
            />
          );
        })}
      </div>

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
