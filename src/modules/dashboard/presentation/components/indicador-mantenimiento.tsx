import { useMemo, useState } from "react";
import { Badge, Text } from "@mantine/core";

import { TONOS, TONO_NEUTRO, tonoMantenimiento } from "../dashboard-paleta";
import { formatearCantidad } from "../dashboard-calculos";
import { DashboardVacio } from "./dashboard-ui";
import {
  DashboardFiltroAlmacen,
  agruparPorAlmacen,
  type IOpcionAlmacen,
} from "./dashboard-filtro-almacen";
import type { RES_MantenimientoAlertas } from "../../service/dashboard.responses";

interface Props {
  mantenimiento: RES_MantenimientoAlertas;
}

const LIMITE_INICIAL = 8;

/**
 * Como se mide cada dimension de control.
 *
 * La misma maquinaria puede llevar horometro, odometro o contador de
 * vueltas: el badge dice en cual de las tres se esta midiendo la alerta,
 * porque "faltan 50" no significa lo mismo si son horas, kilometros o
 * vueltas.
 */
const DIMENSION: Record<string, { etiqueta: string; unidad: string }> = {
  horas: { etiqueta: "Horometro", unidad: "h" },
  kilometros: { etiqueta: "Odometro", unidad: "km" },
  vueltas: { etiqueta: "Vueltas", unidad: "vueltas" },
};

/**
 * Fila de una dimension de control.
 *
 * La maquina puede medir su desgaste en horas, kilometros o vueltas: cada
 * dimension se muestra con su propio estado, para que se vea cual es la que
 * aprieta y cual todavia esta holgada.
 */
const FilaDimension = ({
  dimension,
  total,
  servicio,
  restantes,
  nivel,
}: {
  dimension: string;
  total: number;
  servicio: number;
  restantes: number;
  nivel: string;
}) => {
  const tono = tonoMantenimiento(nivel);
  const info = DIMENSION[dimension] ?? { etiqueta: dimension, unidad: dimension };

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
      <span className="flex w-[86px] shrink-0 items-center gap-1.5 text-zinc-300">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tono.punto}`} />
        {info.etiqueta}
      </span>

      <span className="tabular-nums text-zinc-400">
        Uso {formatearCantidad(total)} {info.unidad}
      </span>

      <span className="text-zinc-700">→</span>

      <span className="tabular-nums text-zinc-500">
        Servicio {formatearCantidad(servicio)} {info.unidad}
      </span>

      <span className={`font-semibold tabular-nums ${tono.texto}`}>
        {restantes < 0
          ? `Vencio hace ${formatearCantidad(Math.abs(restantes))} ${info.unidad}`
          : `Faltan ${formatearCantidad(restantes)} ${info.unidad}`}
      </span>
    </div>
  );
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
  const [almacenActivo, setAlmacenActivo] = useState<number | null>(null);

  const opciones = useMemo<IOpcionAlmacen[]>(() => {
    const base = agruparPorAlmacen(
      mantenimiento.items,
      (items) => items.length,
    );

    return base.map((opcion) => {
      const vencidos = mantenimiento.items.filter(
        (item) =>
          item.id_almacen === opcion.id_almacen && item.nivel === "Vencido",
      ).length;

      return {
        ...opcion,
        sufijo: "maquinas",
        extra:
          vencidos > 0
            ? { texto: `${vencidos} vencidos`, tono: TONOS.red }
            : undefined,
      };
    });
  }, [mantenimiento.items]);

  const items = useMemo(
    () =>
      almacenActivo === null
        ? mantenimiento.items
        : mantenimiento.items.filter(
            (item) => item.id_almacen === almacenActivo,
          ),
    [mantenimiento.items, almacenActivo],
  );

  if (mantenimiento.items.length === 0) {
    return (
      <DashboardVacio texto="Ninguna maquina cerca de su proximo mantenimiento" />
    );
  }

  const visibles = verTodos ? items : items.slice(0, LIMITE_INICIAL);

  const resumen = [
    { texto: `${mantenimiento.resumen.vencidos} vencidos`, tono: TONOS.red },
    { texto: `${mantenimiento.resumen.criticos} criticos`, tono: TONOS.yellow },
    { texto: `${mantenimiento.resumen.proximos} proximos`, tono: TONOS.indigo },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DashboardFiltroAlmacen
          opciones={opciones}
          seleccionado={almacenActivo}
          onSeleccionar={setAlmacenActivo}
          sustantivo="maquinas"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {resumen.map((chip) => (
          <span
            key={chip.texto}
            className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${chip.tono.suave} ${chip.tono.texto}`}
          >
            {chip.texto}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {visibles.map((activo) => {
          const tono = tonoMantenimiento(activo.nivel);

          // Solo se distinguir las dimensiones que disparan la alerta: las
          // demas quedan en su fila con su propio color.
          const enAlerta = activo.dimensiones.filter(
            (dimension) => dimension.nivel !== "OK",
          );

          const ubicacion = activo.mina ?? activo.almacen ?? "Sin ubicacion";

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
                    {activo.correlativo ?? activo.codigo ?? "Sin codigo"} ·{" "}
                    {ubicacion}
                    {activo.estado_activo !== "En Uso"
                      ? ` · ${activo.estado_activo}`
                      : ""}
                  </Text>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {enAlerta.map((dimension) => (
                    <Badge
                      key={dimension.dimension}
                      size="xs"
                      radius="sm"
                      variant="light"
                      color="gray"
                    >
                      {DIMENSION[dimension.dimension]?.etiqueta ??
                        dimension.dimension}
                    </Badge>
                  ))}
                  <Badge
                    size="xs"
                    radius="sm"
                    variant="light"
                    color={tono.chip}
                  >
                    {activo.nivel}
                  </Badge>
                </div>
              </div>

              <div className="mt-2 space-y-1">
                {activo.dimensiones.map((dimension) => (
                  <FilaDimension
                    key={dimension.dimension}
                    dimension={dimension.dimension}
                    total={dimension.total}
                    servicio={dimension.servicio}
                    restantes={dimension.restantes}
                    nivel={dimension.nivel}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {items.length > LIMITE_INICIAL && (
        <button
          type="button"
          onClick={() => setVerTodos((v) => !v)}
          className={`text-xs font-semibold transition-colors hover:text-white ${
            verTodos ? TONO_NEUTRO.texto : "text-indigo-300"
          }`}
        >
          {verTodos ? "Ver menos" : `Ver las ${items.length} maquinas`}
        </button>
      )}
    </div>
  );
};
