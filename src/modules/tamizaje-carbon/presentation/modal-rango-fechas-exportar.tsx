import { useState } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";

import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";

interface Props {
  opened: boolean;
  onClose: () => void;
  /** Se llama con el rango elegido (YYYY-MM-DD) al confirmar. */
  onExportar: (fechaInicio: string, fechaFin: string) => void;
  /** Loading mientras se genera el Excel. */
  loading?: boolean;
  /** Texto del boton principal. */
  textoBoton?: string;
}

/**
 * Modal para pedir el periodo del export general de gastos de produccion.
 *
 * Por defecto propone el ultimo mes hasta hoy: desde hace un mes hasta la
 * fecha de hoy. El usuario puede ajustarlo antes de exportar.
 *
 * El componente se monta cada vez que se abre (el panel lo renderiza solo
 * mientras esta abierto), asi que el rango propuesto siempre parte del
 * ultimo mes hasta hoy.
 */
export const ModalRangoFechasExportar = ({
  opened,
  onClose,
  onExportar,
  loading = false,
  textoBoton = "Exportar",
}: Props) => {
  const [fechaInicio, setFechaInicio] = useState<Date | null>(() =>
    dayjs().subtract(1, "month").toDate(),
  );
  const [fechaFin, setFechaFin] = useState<Date | null>(() => dayjs().toDate());

  const rangoInvalido =
    !fechaInicio || !fechaFin || dayjs(fechaFin).isBefore(dayjs(fechaInicio));

  const handleExportar = () => {
    if (rangoInvalido) return;
    onExportar(
      dayjs(fechaInicio).format("YYYY-MM-DD"),
      dayjs(fechaFin).format("YYYY-MM-DD"),
    );
  };

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title="Exportar gastos de producción"
      size="30rem"
      validateClose
      rightSection={
        <Group gap={6}>
          <Text size="xs" c="gray" fw={600}>
            {fechaInicio && fechaFin
              ? `${dayjs(fechaInicio).format("DD/MM/YYYY")} - ${dayjs(fechaFin).format("DD/MM/YYYY")}`
              : "Elige el periodo"}
          </Text>
        </Group>
      }
    >
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          Elige el periodo de los gastos a exportar. Por defecto se propone el
          ultimo mes hasta hoy.
        </Text>

        <Group grow align="flex-end">
          <CustomDatePicker
            label="Desde"
            value={fechaInicio}
            onChange={setFechaInicio}
            radius="lg"
            size="xs"
            required
            error={fechaFin && fechaInicio && dayjs(fechaFin).isBefore(dayjs(fechaInicio)) ? "Rango inválido" : undefined}
          />
          <CustomDatePicker
            label="Hasta"
            value={fechaFin}
            onChange={setFechaFin}
            radius="lg"
            size="xs"
            required
            error={fechaFin && fechaInicio && dayjs(fechaFin).isBefore(dayjs(fechaInicio)) ? "Rango inválido" : undefined}
          />
        </Group>

        <Group justify="flex-end" mt="sm">
          <Button
            variant="default"
            radius="lg"
            size="xs"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            color="indigo"
            radius="lg"
            size="xs"
            onClick={handleExportar}
            loading={loading}
            disabled={rangoInvalido}
            leftSection={<CalendarDaysIcon className="w-4 h-4" />}
          >
            {textoBoton}
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
