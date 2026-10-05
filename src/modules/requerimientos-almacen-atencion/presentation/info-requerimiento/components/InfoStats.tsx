import { Paper, Text } from "@mantine/core";
import { ClockIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { BadgeField } from "../header/badge-field";
import type { RES_RequerimientoAlmacen } from "../../../../../service/responses/requerimientos-almacen/requerimiento-almacen";

interface InfoStatsProps {
  requerimiento: RES_RequerimientoAlmacen;
}

export const InfoStats = ({ requerimiento }: InfoStatsProps) => {
  const tieneObservacion =
    !!requerimiento.observacion && requerimiento.observacion.trim().length > 0;

  return (
    <Paper
      p="md"
      radius="lg"
      className="bg-transparent border border-zinc-800/50 mx-2"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <BadgeField
          label="Prioridad"
          value={requerimiento.premura}
          color="orange"
        />
        <BadgeField label="Estado" value={requerimiento.estado} color="green" />
        <BadgeField
          label="Fecha Solicitada"
          value={
            requerimiento.fecha_solicitud
              ? dayjs(requerimiento.fecha_solicitud).format("DD/MM/YYYY")
              : "No especificada"
          }
          icon={ClockIcon}
          isMono
        />
        <BadgeField
          label="Fecha de Registro"
          value={dayjs(requerimiento.created_at).format("DD/MM/YYYY HH:mm")}
          icon={ClockIcon}
          isMono
        />
      </div>

      {tieneObservacion && (
        <div className="mt-5 pt-5 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5 font-bold mb-2">
            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-cyan-400" />
            <Text
              size="xs"
              c="zinc.5"
              fw={800}
              className="uppercase tracking-widest"
            >
              Observaciones Generales
            </Text>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg">
            <div className="shrink-0 p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <Text
              size="sm"
              c="zinc.2"
              className="leading-snug break-words whitespace-pre-wrap"
            >
              {requerimiento.observacion}
            </Text>
          </div>
        </div>
      )}
    </Paper>
  );
};
