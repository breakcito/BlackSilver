import { useState } from "react";
import {
  Stack,
  Button,
  Group,
  Text,
  Textarea,
  Badge,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import type { DateValue } from "@mantine/dates";
import { CheckCircleIcon, ExclamationTriangleIcon, CalendarIcon, CubeIcon } from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { ActivosService } from "../../service/activos.service";
import { useNotify } from "../../../../hooks/useNotify";
import type { RES_ActivoFijoResumen } from "../../service/activos.responses";
import { useAuthStore } from "../../../../stores/auth.store";
import dayjs from "dayjs";

interface Props {
  opened: boolean;
  close: () => void;
  activo: RES_ActivoFijoResumen;
  tipoControl: "horometro" | "odometro" | "vueltas";
  onSuccess: () => void;
}

export const ActivoMantenimientoModal = ({ opened, close, activo, tipoControl, onSuccess }: Props) => {
  const { notifySuccess, notifyError } = useNotify();
  const { usuario } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [fechaMantenimiento, setFechaMantenimiento] = useState<Date | null>(new Date());

  const handleSubmit = async () => {
    if (!usuario?.id_empleado) {
      notifyError("No se pudo identificar al empleado activo.");
      return;
    }
    
    setSaving(true);
    try {
      const res = await ActivosService.registrarMantenimiento({
        id_activo: activo.id_activo,
        id_empleado_registro: usuario.id_empleado,
        tipo_control: tipoControl,
        observacion: observacion.trim() || null,
        fecha_hora_mantenimiento: fechaMantenimiento ? dayjs(fechaMantenimiento).format("YYYY-MM-DD HH:mm:ss") : null
      });

      if (res.success) {
        notifySuccess("Mantenimiento registrado con éxito");
        onSuccess();
        close();
      } else {
        notifyError(res.message);
      }
    } catch (error) {
      console.error(error);
      notifyError("Error al registrar mantenimiento");
    } finally {
      setSaving(false);
    }
  };

  const tipoLabel = {
    horometro: "Horas",
    odometro: "Kilómetros",
    vueltas: "Vueltas"
  }[tipoControl];

  const actualValue = {
    horometro: `${activo.total_horas} h.`,
    odometro: `${activo.total_kilometros} km`,
    vueltas: `${activo.total_vueltas} vueltas`
  }[tipoControl];

  const fieldClasses = {
    input: "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500",
    label: "text-zinc-300 mb-1 font-medium",
  };

  return (
    <ModalEstandar
      opened={opened}
      close={close}
      validateClose
      title="Resolver Alerta de Mantenimiento"
      size="md"
    >
      <Stack gap="md">
        {/* Warning Indicator */}
        <Group
          wrap="nowrap"
          align="flex-start"
          className="bg-red-500/10 p-4 rounded-xl border border-red-500/20"
        >
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500 shrink-0" />
          <Stack gap={4}>
            <Text size="sm" c="white" fw={500}>
              Mantenimiento por {tipoLabel.toLowerCase()} requerido
            </Text>
            <Text size="xs" c="red.2">
              Al confirmar que se ha realizado el mantenimiento , la alerta se
              reprogramará basándose en el intervalo configurado.
            </Text>
          </Stack>
        </Group>

        {/* Visual Details Card */}
        <Stack
          gap="xs"
          className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30"
        >
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <CubeIcon className="w-4 h-4 text-zinc-400" />
              <Text size="xs" c="zinc.4" fw={500}>
                Activo:
              </Text>
            </Group>
            <Text size="xs" fw={700} c="white">
              {activo.correlativo} - {activo.producto}
            </Text>
          </Group>

          <Group justify="space-between" align="center">
            <Group gap="xs">
              <CalendarIcon className="w-4 h-4 text-zinc-400" />
              <Text size="xs" c="zinc.4" fw={500}>
                Tipo de Control / Valor:
              </Text>
            </Group>
            <Group gap="xs">
              <Badge variant="light" color="indigo" size="xs">
                {tipoLabel}
              </Badge>
              <Text size="xs" fw={700} c="white">
                {actualValue}
              </Text>
            </Group>
          </Group>
        </Stack>

        {/* Fecha Mantenimiento picker */}
        <DateTimePicker
          label="Fecha y Hora de Mantenimiento"
          value={fechaMantenimiento}
          onChange={(val: DateValue) =>
            setFechaMantenimiento(val ? new Date(val) : null)
          }
          required
          size="xs"
          radius="lg"
          classNames={fieldClasses}
        />

        {/* Observation Textarea */}
        <Textarea
          label="Observaciones (opc.)"
          placeholder="Ej: Cambio de aceite y filtros..."
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          minRows={3}
          size="xs"
          radius="lg"
          classNames={fieldClasses}
        />

        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            color="zinc.5"
            onClick={close}
            disabled={saving}
            size="xs"
            radius="lg"
          >
            Cancelar
          </Button>
          <Button
            color="green.6"
            onClick={handleSubmit}
            loading={saving}
            size="xs"
            radius="lg"
            leftSection={<CheckCircleIcon className="w-4 h-4" />}
          >
            Confirmar Mantenimiento
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
