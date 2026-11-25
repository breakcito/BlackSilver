import { useState } from "react";
import { Badge, Text } from "@mantine/core";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import { TONOS, TONO_NEUTRO, tonoMantenimiento } from "../dashboard-paleta";
import { formatearCantidad } from "../dashboard-calculos";
import { DashboardBarra, DashboardVacio } from "./dashboard-ui";
import type { RES_MantenimientoAlertas } from "../../service/dashboard.responses";

interface Props {
  mantenimiento: RES_MantenimientoAlertas;
}

const LIMITE_INICIAL = 8;

const UNIDAD_DIMENSION: Record<string, string> = {
  horas: "h",
  kilometros: "km",
  vueltas: "vueltas",
};

/**
 * Indicador 2: alertas de mantenimiento de maquinaria.
 *
 * Es un indicador de ESTADO, no de periodo: una maquina a 20 horas de su
 * mantenimiento no deja de estarlo porque cambie el mes. Por eso el backend
 * no lo filtra por periodo y aqui solo se ordena por urgencia.
 */
export const IndicadorMantenimiento = ({ mantenimiento }: Props) => {
  const [verTodos, setVerTodos] = useState(false);

  if (mantenimiento.items.length === 0) {
    return (
      <DashboardVacio texto="Ninguna maquina cerca de su proximo mantenimiento" />
    );
  }

  const visibles = verTodos
    ? mantenimiento.items
    : mantenimiento.items.slice(0, LIMITE_INICIAL);

  const resumen = [
    { texto: `${mantenimiento.resumen.vencidos} vencidos`, tono: TONOS.red },
    { texto: `${mantenimiento.resumen.criticos} criticos`, tono: TONOS.yellow },
    { texto: `${mantenimiento.resumen.proximos} proximos`, tono: TONOS.indigo },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {resumen.map((chip) => (
          <span
            key={chip.texto}
            className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${chip.tono.suave} ${chip.tono.texto}`}
          >
            {chip.texto}
          </span>
        ))}

        {mantenimiento.resumen.umbrales_obsoletos > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-300"
            title="El contador ya supero el intervalo de mantenimiento pero el umbral nunca se reprogramo"
          >
            <ExclamationTriangleIcon className="h-3 w-3" />
            {mantenimiento.resumen.umbrales_obsoletos} umbral obsoleto
          </span>
        )}
      </div>

      <div className="space-y-2">
        {visibles.map((activo) => {
          const tono = tonoMantenimiento(activo.nivel);
          const unidad = UNIDAD_DIMENSION[activo.dimension] ?? activo.dimension;

          return (
            <div
              key={activo.id_activo_fijo}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Text size="sm" fw={600} className="truncate text-zinc-100">
                    {activo.producto}
                  </Text>
                  <Text size="xs" className="truncate text-zinc-500">
                    {activo.correlativo ?? activo.codigo ?? "Sin codigo"}
                    {activo.almacen ? ` · ${activo.almacen}` : ""}
                  </Text>
                </div>

                <Badge
                  size="xs"
                  radius="sm"
                  variant="light"
                  color={tono.chip}
                  className="shrink-0"
                >
                  {activo.nivel}
                </Badge>
              </div>

              <div className="mt-2">
                <DashboardBarra
                  valor={Math.min(activo.total, activo.umbral)}
                  maximo={activo.umbral}
                  tono={tono}
                />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                <span className="tabular-nums text-zinc-400">
                  {formatearCantidad(activo.total)} /{" "}
                  {formatearCantidad(activo.umbral)} {unidad}
                </span>
                <span className={`font-semibold tabular-nums ${tono.texto}`}>
                  {activo.restantes < 0
                    ? `Vencio hace ${formatearCantidad(Math.abs(activo.restantes))} ${unidad}`
                    : `Faltan ${formatearCantidad(activo.restantes)} ${unidad}`}
                </span>
              </div>

              {activo.umbral_obsoleto && (
                <Text size="xs" className="mt-1 text-indigo-300">
                  El umbral no se reprogramo: el contador ya supero el intervalo.
                </Text>
              )}
            </div>
          );
        })}
      </div>

      {mantenimiento.items.length > LIMITE_INICIAL && (
        <button
          type="button"
          onClick={() => setVerTodos((v) => !v)}
          className={`text-xs font-semibold transition-colors hover:text-white ${
            verTodos ? TONO_NEUTRO.texto : "text-indigo-300"
          }`}
        >
          {verTodos
            ? "Ver menos"
            : `Ver las ${mantenimiento.items.length} maquinas`}
        </button>
      )}
    </div>
  );
};
