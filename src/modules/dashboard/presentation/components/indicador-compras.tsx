import { useState } from "react";
import { Badge, Text } from "@mantine/core";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import { TONOS, TONO_NEUTRO, TONO_PRIMARIO, tonoRecepcion } from "../dashboard-paleta";
import { formatearCantidad, formatearMonto } from "../dashboard-calculos";
import { DashboardVacio } from "./dashboard-ui";
import type { RES_ComprasPendientes } from "../../service/dashboard.responses";

interface Props {
  compras: RES_ComprasPendientes;
}

const LIMITE_INICIAL = 6;

/**
 * Indicador 4: compras pendientes de recepcion.
 *
 * El capital comprometido no es del todo perdida, pero mientras la mercaderia
 * no llega el almacen trabaja con menos. Por eso la antiguedad y el vencimiento
 * del pago se muestran al lado del monto.
 */
export const IndicadorCompras = ({ compras }: Props) => {
  const [verTodos, setVerTodos] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);

  if (compras.resumen.total_ocs === 0) {
    return <DashboardVacio texto="No hay ordenes de compra sin recepcion" />;
  }

  const visibles = verTodos ? compras.ocs : compras.ocs.slice(0, LIMITE_INICIAL);
  const resumen = compras.resumen;

  return (
    <div className="space-y-3">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
            Ordenes abiertas
          </Text>
          <Text size="lg" fw={800} className="tabular-nums text-zinc-100">
            {resumen.total_ocs}
          </Text>
        </div>

        <div>
          <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
            Items pendientes
          </Text>
          <Text size="lg" fw={800} className="tabular-nums text-zinc-100">
            {resumen.items_pendientes}
          </Text>
        </div>

        <div>
          <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
            Mas antigua
          </Text>
          <Text
            size="lg"
            fw={800}
            className={`tabular-nums ${
              resumen.antiguedad_max_dias > 30 ? TONOS.red.texto : "text-zinc-100"
            }`}
          >
            {resumen.antiguedad_max_dias} d
          </Text>
        </div>

        <div>
          <Text size="9px" fw={700} className="uppercase tracking-wider text-zinc-500">
            En transito
          </Text>
          <Text
            size="lg"
            fw={800}
            className={`tabular-nums ${
              resumen.transferencias_en_transito > 0
                ? TONOS.yellow.texto
                : "text-zinc-100"
            }`}
          >
            {resumen.transferencias_en_transito}
          </Text>
        </div>
      </div>

      {/* Monto comprometido por moneda */}
      {resumen.por_moneda.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resumen.por_moneda.map((moneda) => (
            <span
              key={moneda.moneda}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs"
            >
              <span className="text-zinc-400">{moneda.moneda}</span>
              <span className="font-bold tabular-nums text-indigo-300">
                {formatearMonto(moneda.moneda, moneda.monto)}
              </span>
              <span className="text-[10px] text-zinc-500">
                {moneda.ocs} OC
              </span>
            </span>
          ))}
        </div>
      )}

      {resumen.recepciones_con_incidencia > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {resumen.recepciones_con_incidencia} recepcion(es) registrada(s) con
          incidencia.
        </div>
      )}

      {/* Ordenes */}
      <div className="space-y-2">
        {visibles.map((oc) => {
          const estaAbierta = abierta === oc.id_orden_compra;

          return (
            <div
              key={oc.id_orden_compra}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40"
            >
              <button
                type="button"
                onClick={() =>
                  setAbierta(estaAbierta ? null : oc.id_orden_compra)
                }
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-900/70"
              >
                {estaAbierta ? (
                  <ChevronDownIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                ) : (
                  <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text size="sm" fw={700} className="text-zinc-100">
                      {oc.correlativo ?? `OC #${oc.id_orden_compra}`}
                    </Text>
                    <Badge size="xs" radius="sm" variant="light" color="gray">
                      {oc.estado}
                    </Badge>
                    {oc.pago_vencido && (
                      <Badge size="xs" radius="sm" variant="light" color="red">
                        Pago vencido
                      </Badge>
                    )}
                  </div>

                  <Text size="xs" className="mt-0.5 truncate text-zinc-500">
                    {oc.proveedor ?? "Sin proveedor"} · {oc.items_pendientes} de{" "}
                    {oc.items_total} items pendientes · {oc.dias_antiguedad} d
                  </Text>
                </div>

                <Text
                  size="sm"
                  fw={700}
                  className="shrink-0 tabular-nums text-indigo-300"
                >
                  {formatearMonto(oc.moneda, oc.total)}
                </Text>
              </button>

              {estaAbierta && oc.items.length > 0 && (
                <div className="space-y-1.5 border-t border-zinc-800 px-3 py-2.5">
                  {oc.items.map((item) => {
                    const tono = tonoRecepcion(item.estado);

                    return (
                      <div
                        key={item.id_detalle}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <Text size="xs" className="truncate text-zinc-300">
                            {item.producto}
                          </Text>
                          <Text size="10px" className="truncate text-zinc-600">
                            {formatearCantidad(item.cantidad_requerida_base)}{" "}
                            {item.unidad ?? "und"} · {item.almacen ?? "Sin almacen"}
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
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {compras.ocs.length > LIMITE_INICIAL && (
        <button
          type="button"
          onClick={() => setVerTodos((v) => !v)}
          className={`text-xs font-semibold transition-colors hover:text-white ${
            verTodos ? TONO_NEUTRO.texto : TONO_PRIMARIO.texto
          }`}
        >
          {verTodos ? "Ver menos" : `Ver las ${compras.ocs.length} ordenes`}
        </button>
      )}
    </div>
  );
};
