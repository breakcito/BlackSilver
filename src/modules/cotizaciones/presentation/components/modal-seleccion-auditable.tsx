import {
  Badge,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { ShieldCheckIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";

interface ModalSeleccionAuditableProps {
  opened: boolean;
  onClose: () => void;
  /**
   * Items separados por auditable / no auditable. Los nombres vienen del
   * catálogo (cacheado en el padre) para evitar un fetch extra.
   */
  auditables: { id: number; nombre: string }[];
  noAuditables: { id: number; nombre: string }[];
  onElegir: (quedarseCon: "auditable" | "no_auditable") => void;
}

/**
 * Modal de advertencia cuando los items seleccionados mezclan productos
 * auditables con no auditables. Obliga al usuario a elegir un subset
 * (porque una cotizacion / comparativo no puede mezclar tipos). Pensado
 * para el flujo "Cotizar" desde Detalle de Solicitud de Reabastecimiento.
 *
 * Implementado sobre `ModalEstandar` para mantener consistencia con el resto
 * del sistema (header con accent amarillo, body oscuro, close automatico).
 */
export const ModalSeleccionAuditable = ({
  opened,
  onClose,
  auditables,
  noAuditables,
  onElegir,
}: ModalSeleccionAuditableProps) => {
  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title={
        <Group gap="xs" align="center">
          <ShieldExclamationIcon className="w-5 h-5 text-amber-500" />
          <Text fw={800} className="text-zinc-100">
            Productos con estado auditable mixto
          </Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        {/* Lista de auditables */}
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Group gap="xs" align="center">
              <ShieldCheckIcon className="w-4 h-4 text-red-400" />
              <Text fw={700} size="sm" className="text-zinc-200">
                Auditables
              </Text>
            </Group>
            <Badge color="red" variant="filled" radius="md" size="sm">
              {auditables.length}
            </Badge>
          </Group>
          {auditables.length === 0 ? (
            <Text size="xs" c="dimmed" fs="italic">
              (sin items auditables seleccionados)
            </Text>
          ) : (
            <Stack
              gap={4}
              className="max-h-32 overflow-y-auto bg-red-950/10 border border-red-500/20 rounded-lg p-2"
            >
              {auditables.map((p) => (
                <Text key={p.id} size="xs" className="text-zinc-300">
                  • {p.nombre}
                </Text>
              ))}
            </Stack>
          )}
        </Stack>

        {/* Lista de no auditables */}
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Group gap="xs" align="center">
              <ShieldExclamationIcon className="w-4 h-4 text-zinc-500" />
              <Text fw={700} size="sm" className="text-zinc-200">
                No auditables
              </Text>
            </Group>
            <Badge color="zinc" variant="filled" radius="md" size="sm">
              {noAuditables.length}
            </Badge>
          </Group>
          {noAuditables.length === 0 ? (
            <Text size="xs" c="dimmed" fs="italic">
              (sin items no auditables seleccionados)
            </Text>
          ) : (
            <Stack
              gap={4}
              className="max-h-32 overflow-y-auto bg-zinc-900/40 border border-zinc-800 rounded-lg p-2"
            >
              {noAuditables.map((p) => (
                <Text key={p.id} size="xs" className="text-zinc-300">
                  • {p.nombre}
                </Text>
              ))}
            </Stack>
          )}
        </Stack>

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button
            variant="subtle"
            color="zinc"
            onClick={onClose}
            radius="xl"
            size="sm"
          >
            Cancelar
          </Button>
          <Button
            color="zinc"
            disabled={noAuditables.length === 0}
            onClick={() => onElegir("no_auditable")}
            radius="xl"
            size="sm"
            className="font-semibold"
          >
            Cotizar no auditables ({noAuditables.length})
          </Button>
          <Button
            color="red"
            disabled={auditables.length === 0}
            onClick={() => onElegir("auditable")}
            radius="xl"
            size="sm"
            className="font-semibold shadow-md shadow-red-900/30"
          >
            Cotizar auditables ({auditables.length})
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
