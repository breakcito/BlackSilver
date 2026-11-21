import { Badge, Divider, Text } from "@mantine/core";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";

import { BalanceMoneda } from "../../../../shared/enums/balances/balances";
import {
  MONEDAS_BALANCE,
  calcularVariacion,
  formatearMonto,
  type ResumenMoneda,
} from "../balances-calculos";

interface Props {
  resumenes: ResumenMoneda[];
  /** Etiqueta del periodo actual (ej. "Noviembre 2026"). */
  etiquetaPeriodo: string;
  /** Etiqueta corta del periodo de comparacion (ej. "Oct 26"). */
  etiquetaComparativo: string;
  loading?: boolean;
}

/**
 * Ficha de una moneda.
 *
 * El resultado es el dato principal: va en grande. Los ingresos y egresos
 * son el contexto: van debajo, en la misma linea, con el monto del periodo
 * de comparacion al lado para que se puedan contrastar de un vistazo.
 */
const FichaMoneda = ({
  resumen,
  etiquetaPeriodo,
  etiquetaComparativo,
  loading,
}: {
  resumen: ResumenMoneda;
  etiquetaPeriodo: string;
  etiquetaComparativo: string;
  loading: boolean;
}) => {
  const esSoles = resumen.moneda === BalanceMoneda.Soles;

  const variacion = calcularVariacion(
    resumen.resultado,
    resumen.resultadoComparativo,
  );

  const favorable =
    variacion === null || variacion === 0 ? null : variacion > 0 ? true : false;

  const sinActividadPrevia = resumen.movimientosComparativo === 0;
  const sinActividadEnPeriodo = resumen.movimientos === 0;

  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-opacity ${
        loading ? "opacity-40" : ""
      }`}
    >
      {/* Moneda + periodo */}
      <div className="flex items-center justify-between gap-2">
        <Text
          size="10px"
          fw={700}
          className="text-zinc-300 uppercase tracking-[0.16em]"
        >
          {esSoles ? "Soles" : "Dólares"}
        </Text>
        <Text size="xs" className="text-zinc-300 tabular-nums" fw={600}>
          {etiquetaPeriodo}
        </Text>
      </div>

      {/* Resultado: el dato principal */}
      <div className="mt-2.5 flex flex-wrap items-end gap-x-3 gap-y-1">
        <Text
          size="32px"
          fw={800}
          className={`leading-none tracking-tight tabular-nums ${
            sinActividadEnPeriodo
              ? "text-zinc-600"
              : resumen.resultado >= 0
                ? "text-teal-400"
                : "text-red-400"
          }`}
        >
          {sinActividadEnPeriodo
            ? "—"
            : (resumen.resultado >= 0 ? "+" : "-") +
              formatearMonto(resumen.moneda, resumen.resultado)}
        </Text>

        {variacion !== null && (
          <Badge
            size="sm"
            radius="sm"
            variant="light"
            color={favorable === null ? "gray" : favorable ? "teal" : "red"}
            leftSection={
              variacion > 0 ? (
                <ArrowUpIcon className="w-3 h-3" />
              ) : (
                <ArrowDownIcon className="w-3 h-3" />
              )
            }
          >
            {variacion > 0 ? "+" : ""}
            {variacion.toFixed(1)}%
          </Badge>
        )}
      </div>

      <Text size="xs" className="mt-1 text-zinc-300">
        {sinActividadEnPeriodo
          ? "Sin actividad en el periodo"
          : sinActividadPrevia
            ? "Sin actividad en el periodo de comparación"
            : `Resultado · ${etiquetaComparativo}: ${resumen.egresosComparativo > resumen.ingresosComparativo ? "-" : "+"} ${formatearMonto(
                resumen.moneda,
                resumen.resultadoComparativo,
              )}`}
      </Text>

      <Divider className="my-3 border-zinc-800" />

      {/* Ingresos y egresos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <Text
              size="10px"
              fw={700}
              className="text-zinc-200 uppercase tracking-wider"
            >
              Ingresos
            </Text>
          </div>
          <Text size="md" fw={700} className="mt-1 text-teal-300 tabular-nums ">
            {formatearMonto(resumen.moneda, resumen.ingresos)}
          </Text>
          <Text size="xs" className="text-zinc-300 tabular-nums ">
            {etiquetaComparativo}:{" "}
            {formatearMonto(resumen.moneda, resumen.ingresosComparativo)}
          </Text>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <Text
              size="10px"
              fw={700}
              className="text-zinc-200 uppercase tracking-wider"
            >
              Egresos
            </Text>
          </div>
          <Text size="md" fw={700} className="mt-1 text-red-300 tabular-nums ">
            {formatearMonto(resumen.moneda, resumen.egresos)}
          </Text>
          <Text size="xs" className="text-zinc-300 tabular-nums ">
            {etiquetaComparativo}:{" "}
            
            {formatearMonto(resumen.moneda, resumen.egresosComparativo)}
          </Text>
        </div>
      </div>
    </div>
  );
};

/**
 * Resumen del periodo.
 *
 * Soles y dolares conviven en la misma pantalla, cada uno en su ficha: sus
 * montos no son comparables entre si y por eso nunca se suman.
 */
export const BalancesKpis = ({
  resumenes,
  etiquetaPeriodo,
  etiquetaComparativo,
  loading = false,
}: Props) => {
  const porMoneda = new Map(resumenes.map((r) => [r.moneda, r]));

  return (
    <div className="flex flex-col gap-4">
      {MONEDAS_BALANCE.map((moneda) => {
        const resumen = porMoneda.get(moneda);
        if (!resumen) return null;
        return (
          <FichaMoneda
            key={moneda}
            resumen={resumen}
            etiquetaPeriodo={etiquetaPeriodo}
            etiquetaComparativo={etiquetaComparativo}
            loading={loading}
          />
        );
      })}
    </div>
  );
};
