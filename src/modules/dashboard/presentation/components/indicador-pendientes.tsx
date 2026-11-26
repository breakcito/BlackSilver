import { useMemo, useState } from "react";
import { Badge, Text } from "@mantine/core";

import { TONOS, TONO_NEUTRO, tonoEtapa } from "../dashboard-paleta";
import { conteoPorEtapa } from "../dashboard-calculos";
import { DashboardBarra, DashboardVacio } from "./dashboard-ui";
import {
  DashboardFiltroAlmacen,
  type IOpcionAlmacen,
} from "./dashboard-filtro-almacen";
import type { RES_PendientesAtencion } from "../../service/dashboard.responses";

interface Props {
  pendientes: RES_PendientesAtencion;
}

const LIMITE_INICIAL = 6;

/**
 * Indicador 8: pendientes de atencion (embudo logistico).
 *
 * Cuenta ITEMS, no cabeceras: lo que traba el flujo es el item. El embudo
 * muestra donde se acumula la espera, y los vencidos son los que ya
 * incumplieron su plazo.
 *
 * El filtro por almacen recorta el embudo completo: las etapas se cuentan
 * solo con los items del almacen elegido.
 */
export const IndicadorPendientes = ({ pendientes }: Props) => {
  const [verTodos, setVerTodos] = useState(false);
  const [almacenActivo, setAlmacenActivo] = useState<number | null>(null);

  const opciones = useMemo<IOpcionAlmacen[]>(() => {
    const grupos = new Map<
      number,
      { id_almacen: number; almacen: string; cantidad: number }
    >();

    pendientes.etapas.forEach((etapa) => {
      if (etapa.id_almacen === null) return;

      const actual = grupos.get(etapa.id_almacen) ?? {
        id_almacen: etapa.id_almacen,
        almacen: etapa.almacen ?? `Almacen ${etapa.id_almacen}`,
        cantidad: 0,
      };
      actual.cantidad += etapa.cantidad;
      grupos.set(etapa.id_almacen, actual);
    });

    return Array.from(grupos.values()).map((grupo) => ({
      ...grupo,
      sufijo: "items",
    }));
  }, [pendientes.etapas]);

  const etapas = useMemo(() => {
    const filtradas =
      almacenActivo === null
        ? pendientes.etapas
        : pendientes.etapas.filter(
            (etapa) => etapa.id_almacen === almacenActivo,
          );

    return conteoPorEtapa(filtradas);
  }, [pendientes.etapas, almacenActivo]);

  const vencidos = useMemo(
    () =>
      almacenActivo === null
        ? pendientes.vencidos
        : pendientes.vencidos.filter(
            (vencido) => vencido.id_almacen === almacenActivo,
          ),
    [pendientes.vencidos, almacenActivo],
  );

  const total = etapas.reduce((suma, etapa) => suma + etapa.cantidad, 0);
  const maxEtapa = Math.max(0, ...etapas.map((e) => e.cantidad));

  if (pendientes.resumen.total === 0) {
    return <DashboardVacio texto="Nada esperando atencion en logistica" />;
  }

  const vencidosVisibles = verTodos
    ? vencidos
    : vencidos.slice(0, LIMITE_INICIAL);

  return (
    <div className="space-y-3">
      <DashboardFiltroAlmacen
        opciones={opciones}
        seleccionado={almacenActivo}
        onSeleccionar={setAlmacenActivo}
        sustantivo="items"
      />

      {/* Embudo */}
      <div className="space-y-2.5">
        {etapas.map((etapa) => {
          const tono = tonoEtapa(etapa.etapa);

          return (
            <div key={etapa.etapa}>
              <div className="flex items-baseline justify-between gap-2">
                <Text size="xs" className="truncate text-zinc-300">
                  {etapa.etapa}
                  {etapa.extras && (
                    <span className="ml-1.5 text-[10px] text-zinc-600">
                      (fuera del flujo)
                    </span>
                  )}
                </Text>
                <Text
                  size="sm"
                  fw={800}
                  className={`shrink-0 tabular-nums ${tono.texto}`}
                >
                  {etapa.cantidad}
                </Text>
              </div>
              <div className="mt-1">
                <DashboardBarra valor={etapa.cantidad} maximo={maxEtapa} tono={tono} />
              </div>
            </div>
          );
        })}
      </div>

      {almacenActivo !== null && (
        <Text size="xs" className="text-zinc-500">
          {total} items en el almacen seleccionado
        </Text>
      )}

      {/* Vencidos */}
      {vencidos.length > 0 && (
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between gap-2">
            <Text size="9px" fw={700} className="uppercase tracking-[0.14em] text-zinc-500">
              Fuera de plazo
            </Text>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${TONOS.red.suave} ${TONOS.red.texto}`}
            >
              {vencidos.length}
            </span>
          </div>

          {vencidosVisibles.map((vencido, indice) => (
            <div
              key={`${vencido.tipo}-${vencido.correlativo}-${indice}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
            >
              <div className="min-w-0">
                <Text size="xs" className="truncate text-zinc-200">
                  {vencido.producto}
                </Text>
                <Text size="10px" className="truncate text-zinc-500">
                  {vencido.tipo === "REQUERIMIENTO" ? "Requerimiento" : "Solicitud"} ·{" "}
                  {vencido.correlativo ?? "S/N"} · {vencido.almacen ?? "Sin almacen"}
                </Text>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge size="xs" radius="sm" variant="light" color="gray">
                  {vencido.etapa}
                </Badge>
                <Text
                  size="xs"
                  fw={700}
                  className={`tabular-nums ${
                    vencido.dias_vencido > 7 ? TONOS.red.texto : TONOS.yellow.texto
                  }`}
                >
                  +{vencido.dias_vencido} d
                </Text>
              </div>
            </div>
          ))}

          {vencidos.length > LIMITE_INICIAL && (
            <button
              type="button"
              onClick={() => setVerTodos((v) => !v)}
              className={`text-xs font-semibold transition-colors hover:text-white ${
                verTodos ? TONO_NEUTRO.texto : "text-indigo-300"
              }`}
            >
              {verTodos
                ? "Ver menos"
                : `Ver los ${vencidos.length} fuera de plazo`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
