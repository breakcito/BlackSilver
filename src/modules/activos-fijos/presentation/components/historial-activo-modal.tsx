import {
  Badge,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
} from "@mantine/core";
import {
  ClockIcon,
  CogIcon,
  PencilSquareIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { motion, AnimatePresence } from "motion/react";

import { parseCambiosLog } from "../../../../presentation/utils/parse-cambios-log";
import type { RES_ActivoFijoResumen } from "../../service/activos.responses";
import type { RES_CambiosLog } from "../../../../service/responses/_generic/cambios-log";

dayjs.locale("es");

interface HistorialActivoModalProps {
  activo: RES_ActivoFijoResumen;
}

const formatValor = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
};

const esBajaLogica = (
  cambios: RES_CambiosLog["cambios"],
): boolean =>
  cambios.some(
    (c) =>
      c.campo_bd === "estado" &&
      c.valor_anterior !== "Dado de Baja" &&
      c.valor_nuevo === "Dado de Baja",
  );

export const HistorialActivoModal = ({ activo }: HistorialActivoModalProps) => {
  const logs = parseCambiosLog(activo.cambios_log);

  const logsOrdenados = [...logs].sort((a, b) =>
    dayjs(b.update_at).valueOf() - dayjs(a.update_at).valueOf(),
  );

  if (logsOrdenados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
        <ClockIcon className="w-10 h-10 text-zinc-700 mb-3" />
        <p className="text-zinc-500 text-sm font-medium">
          No se encontraron cambios registrados para este activo.
        </p>
        <p className="text-zinc-600 text-xs mt-1 italic">
          (El log se empezó a registrar a partir de esta versión.)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Paper
        withBorder
        p="md"
        radius="lg"
        className="bg-zinc-900/30 border-zinc-800/60 flex items-center justify-between"
      >
        <Group gap="md">
          <ThemeIcon
            variant="gradient"
            gradient={{ from: "indigo", to: "violet", deg: 45 }}
            size="xl"
            radius="md"
          >
            <CogIcon className="w-6 h-6 text-white" />
          </ThemeIcon>
          <Stack gap={0}>
            <Text
              size="10px"
              fw={800}
              className="text-zinc-100 tracking-widest"
            >
              Activo
            </Text>
            <h3 className="text-sm font-bold text-white">
              {activo.producto} — {activo.correlativo}
            </h3>
          </Stack>
        </Group>
        <Stack gap={2} align="flex-end">
          <Text
            size="10px"
            fw={800}
            className="text-zinc-100 tracking-widest"
          >
            Última modificación
          </Text>
          <Badge
            size="xs"
            variant="light"
            color="indigo"
            radius="sm"
            className="font-bold border-indigo-500/20"
          >
            {dayjs(logsOrdenados[0].update_at).format("DD/MM/YYYY HH:mm")}
          </Badge>
        </Stack>
      </Paper>

      <Timeline
        active={logsOrdenados.length}
        bulletSize={28}
        lineWidth={2}
        color="indigo"
        classNames={{
          itemTitle: "text-white text-sm font-bold",
          itemBody: "pt-1",
        }}
      >
        <AnimatePresence>
          {logsOrdenados.map((log, idx) => {
            const esBaja = esBajaLogica(log.cambios);
            const Icon = esBaja ? TrashIcon : PencilSquareIcon;
            const color = esBaja ? "red" : "indigo";
            const titulo = esBaja ? "Activo eliminado" : "Edición";

            return (
              <Timeline.Item
                key={`${log.update_at}-${idx}`}
                bullet={
                  <ThemeIcon
                    size={20}
                    radius="xl"
                    variant="filled"
                    color={color}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </ThemeIcon>
                }
                title={
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-2"
                  >
                    <Text className="text-white text-sm font-bold">
                      {titulo}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color="zinc"
                      radius="sm"
                      leftSection={<UserIcon className="w-3 h-3" />}
                      className="font-medium"
                    >
                      {log.nombre_empleado?.trim() || "—"}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {dayjs(log.update_at).format("DD [de] MMMM, YYYY · HH:mm")}
                    </Text>
                  </motion.div>
                }
              >
                <Stack gap={6} mt={4} mb={6}>
                  {log.cambios.map((cambio, i) => (
                    <Paper
                      key={i}
                      withBorder
                      p="sm"
                      radius="md"
                      className="bg-zinc-900/30 border-zinc-800/60"
                    >
                      <Group
                        justify="space-between"
                        wrap="nowrap"
                        align="center"
                      >
                        <Badge
                          variant="light"
                          color="indigo"
                          size="xs"
                          radius="sm"
                          className="font-bold border-indigo-500/20"
                        >
                          {cambio.campo ?? cambio.campo_bd ?? "—"}
                        </Badge>
                        <Group gap="xs" wrap="nowrap">
                          <Text
                            size="xs"
                            className="text-zinc-400 line-through"
                          >
                            {formatValor(cambio.valor_anterior)}
                          </Text>
                          <Text size="xs" className="text-zinc-500">
                            →
                          </Text>
                          <Text size="xs" className="text-emerald-300 font-bold">
                            {formatValor(cambio.valor_nuevo)}
                          </Text>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Timeline.Item>
            );
          })}
        </AnimatePresence>
      </Timeline>
    </div>
  );
};
