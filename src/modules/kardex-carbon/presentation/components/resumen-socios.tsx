import { Divider, Group, Paper, Text, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";

import { cn } from "../../../../shared/functions/cn";
import { formatNumber } from "../../../../shared/functions/formatNumber";

export interface ItemResumenSocio {
  /** Razon social del proveedor o del cliente. */
  nombre: string;
  /** Toneladas acumulados en el periodo. */
  tn: number;
}

interface Props {
  /** Titulo del bloque: "Por Proveedor", "Por Cliente"... */
  titulo: string;
  items: ItemResumenSocio[];
  /** Toneladas totales del bloque. */
  total: number;
  /** Clase Tailwind del acento (color del valor): "text-pink-400"... */
  colorAcento: string;
  /** Clase Tailwind del fondo del icono. */
  colorIcono: string;
  icono: ReactNode;
  /** Texto cuando no hay movimientos en el periodo. */
  mensajeVacio: string;
}

const formatTN = (n: number) => `${formatNumber(n)} TN`;

/**
 * Resumen horizontal de un grupo de socios (proveedores o clientes) con las
 * toneladas que movieron en el periodo.
 *
 * Version compacta: el icono va junto al titulo, las tarjetas tienen ancho
 * fijo (el nombre se trunca y se lee completo en el tooltip) y cada bloque
 * hace su propio scroll horizontal para no invadir al contiguo.
 */
export const ResumenSocios = ({
  titulo,
  items,
  total,
  colorAcento,
  colorIcono,
  icono,
  mensajeVacio,
}: Props) => (
  <div className="space-y-1 min-w-0">
    <div className="flex items-center justify-between px-0.5">
      <Group gap="xs">
        <div
          className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center shrink-0 border",
            colorIcono,
          )}
        >
          {icono}
        </div>
        <Text size="xs" fw={700} c={"gray"} className="uppercase tracking-wider">
          {titulo}
        </Text>
        <Divider orientation="vertical" />
        <Text size="xs" c="gray" fw={600}>
          TOTAL:{" "}
          <span className={cn("font-bold", colorAcento)}>{formatTN(total)}</span>
        </Text>
      </Group>
    </div>

    {items.length === 0 ? (
      <Text size="xs" c="dimmed" className="italic px-0.5">
        {mensajeVacio}
      </Text>
    ) : (
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
        {items.map((item) => (
          <Tooltip
            key={item.nombre}
            label={item.nombre}
            withArrow
            position="top"
            multiline
            maw={280}
          >
            <Paper className="group w-52 shrink-0 rounded-lg px-2.5 py-1.5 border bg-zinc-900/50 border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-200">
              <div className="flex items-center gap-1.5">
                <Text
                  size="xs"
                  fw={700}
                  className="truncate text-zinc-200 group-hover:text-white transition-colors"
                >
                  {item.nombre}
                </Text>
                <Divider orientation="vertical" className="mx-0.5" />
                <Text
                  size="xs"
                  fw={800}
                  className={cn(
                    "font-mono whitespace-nowrap",
                    item.tn > 0 ? colorAcento : "text-zinc-400",
                  )}
                >
                  {formatTN(item.tn)}
                </Text>
              </div>
            </Paper>
          </Tooltip>
        ))}
      </div>
    )}
  </div>
);
