import { useState } from "react";
import { Badge, Text } from "@mantine/core";

import { TONOS, TONO_NEUTRO, TONO_ROSA, tonoCobro } from "../dashboard-paleta";
import { formatearMonto } from "../dashboard-calculos";
import { DashboardBarra, DashboardVacio } from "./dashboard-ui";
import type { RES_CobrosPendientes } from "../../service/dashboard.responses";

interface Props {
  cobros: RES_CobrosPendientes;
}

const LIMITE_INICIAL = 8;

/**
 * Indicador 5: cobros pendientes (cartera por cobrar).
 *
 * Lo que se cobró no cuenta; lo que se emitio y no se cobro, si. Los
 * anticipos ya aplicados se descuentan del saldo porque son dinero recibido.
 */
export const IndicadorCobros = ({ cobros }: Props) => {
  const [verTodos, setVerTodos] = useState(false);

  if (cobros.items.length === 0) {
    return (
      <DashboardVacio texto="No hay comprobantes emitidos pendientes de cobro" />
    );
  }

  const visibles = verTodos ? cobros.items : cobros.items.slice(0, LIMITE_INICIAL);

  return (
    <div className="space-y-3">
      {/* Saldo por moneda */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cobros.resumen.por_moneda.map((moneda) => (
          <div
            key={moneda.moneda}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
          >
            <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
              Por cobrar · {moneda.moneda}
            </Text>
            <Text
              size="22px"
              fw={800}
              className={`mt-0.5 leading-none tabular-nums ${TONO_ROSA.texto}`}
            >
              {formatearMonto(moneda.moneda, moneda.saldo)}
            </Text>
            <Text size="xs" className="mt-1 text-zinc-500">
              {moneda.comprobantes} comprobantes
            </Text>
          </div>
        ))}
      </div>

      {/* Anticipos por amortizar */}
      {cobros.resumen.saldo_anticipos > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <div className="min-w-0">
            <Text size="xs" className="text-zinc-300">
              Anticipos de cliente por aplicar
            </Text>
            <Text size="10px" className="truncate text-zinc-500">
              Dinero ya recibido que todavia no se facturo
            </Text>
          </div>
          <Text size="sm" fw={700} className={`shrink-0 tabular-nums ${TONOS.yellow.texto}`}>
            {formatearMonto("Soles", cobros.resumen.saldo_anticipos)}
          </Text>
        </div>
      )}

      {/* Mayor cartera por cliente */}
      {cobros.resumen.por_cliente.length > 0 && (
        <div className="space-y-1.5">
          <Text size="9px" fw={700} className="uppercase tracking-[0.14em] text-zinc-500">
            Mayor cartera por cliente
          </Text>
          {cobros.resumen.por_cliente.slice(0, 3).map((cliente) => (
            <div
              key={cliente.cliente}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <Text size="xs" className="truncate text-zinc-300">
                {cliente.cliente}
              </Text>
              <Text size="xs" fw={700} className="shrink-0 tabular-nums text-zinc-200">
                {formatearMonto("Soles", cliente.saldo)}
              </Text>
            </div>
          ))}
        </div>
      )}

      {/* Comprobantes */}
      <div className="space-y-2 border-t border-zinc-800 pt-3">
        {visibles.map((comprobante) => {
          const tono = tonoCobro(comprobante.estado);

          return (
            <div
              key={`${comprobante.tipo}-${comprobante.id_comprobante}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text size="sm" fw={600} className="truncate text-zinc-100">
                      {comprobante.cliente ?? "Sin cliente"}
                    </Text>
                    <Badge size="xs" radius="sm" variant="light" color={tono.chip}>
                      {comprobante.estado}
                    </Badge>
                    <Badge size="xs" radius="sm" variant="light" color="gray">
                      {comprobante.tipo.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <Text size="10px" className="mt-0.5 truncate text-zinc-500">
                    {comprobante.codigo ?? `Comprobante #${comprobante.id_comprobante}`} ·
                    emitida el {comprobante.fecha_emision}
                  </Text>
                </div>

                <Text
                  size="sm"
                  fw={800}
                  className="shrink-0 tabular-nums text-zinc-100"
                >
                  {formatearMonto(comprobante.moneda, comprobante.saldo)}
                </Text>
              </div>

              <div className="mt-2">
                <DashboardBarra
                  valor={comprobante.avance_pct}
                  maximo={100}
                  tono={tono}
                />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                <span className="tabular-nums text-zinc-500">
                  Neto {formatearMonto(comprobante.moneda, comprobante.monto_neto)}
                </span>
                <span className="tabular-nums text-zinc-400">
                  Cobrado {formatearMonto(comprobante.moneda, comprobante.monto_pagado)}{" "}
                  ({comprobante.avance_pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {cobros.items.length > LIMITE_INICIAL && (
        <button
          type="button"
          onClick={() => setVerTodos((v) => !v)}
          className={`text-xs font-semibold transition-colors hover:text-white ${
            verTodos ? TONO_NEUTRO.texto : TONO_ROSA.texto
          }`}
        >
          {verTodos ? "Ver menos" : `Ver los ${cobros.items.length} comprobantes`}
        </button>
      )}
    </div>
  );
};
