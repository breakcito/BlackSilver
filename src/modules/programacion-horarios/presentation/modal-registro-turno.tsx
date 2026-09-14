import { useEffect, useRef } from "react";
import {
  Stack,
  Group,
  Select,
  Button,
  NumberInput,
  Alert,
  Badge,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import {
  ClockIcon,
  SunIcon,
  MoonIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { useRegistroTurno } from "../hooks/useRegistroTurno";
import type { RES_TurnoLaboral } from "../service/turnos.responses";
import { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";

interface ModalRegistroTurnoProps {
  opened: boolean;
  close: () => void;
  turnoEditar?: RES_TurnoLaboral | null;
  onSuccess?: (turno: RES_TurnoLaboral) => void;
  zIndex?: number;
}

const TIPOS_TURNO_OPTIONS = [
  { value: "Dia", label: "Día" },
  { value: "Noche", label: "Noche" },
];

export const ModalRegistroTurno = ({
  opened,
  close,
  turnoEditar,
  onSuccess,
  zIndex,
}: ModalRegistroTurnoProps) => {
  const { form, setField, precargar, reset, loading, handleSubmitCrear, handleSubmitEditar } =
    useRegistroTurno((turno) => {
      onSuccess?.(turno);
      close();
    });

  const refIngreso = useRef<HTMLInputElement>(null);
  const refSalida = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!opened) return;
    if (turnoEditar) {
      precargar(turnoEditar);
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, turnoEditar]);

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  const handleConfirmar = async () => {
    if (turnoEditar) {
      await handleSubmitEditar(turnoEditar.id);
    } else {
      await handleSubmitCrear();
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={close}
      title={turnoEditar ? "Editar Horario" : "Registrar Horario"}
      size="md"
      zIndex={zIndex}
    >
      <Stack gap="md">
        <Select
          label="Horario"
          placeholder="Seleccione"
          data={TIPOS_TURNO_OPTIONS}
          value={form.tipo_turno}
          onChange={(val) => setField("tipo_turno", (val as TipoTurno) ?? TipoTurno.Dia)}
          leftSection={
            form.tipo_turno === "Noche" ? (
              <MoonIcon className="w-4 h-4 text-zinc-500" />
            ) : (
              <SunIcon className="w-4 h-4 text-zinc-500" />
            )
          }
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          required
          withAsterisk
          comboboxProps={{ withinPortal: true, zIndex: (zIndex ?? 2000) + 100 }}
          disabled={loading}
        />

        <Group grow align="flex-start" gap="md">
          <div>
            <TimeInput
              ref={refIngreso}
              label="Hora de Ingreso"
              placeholder="Seleccione hora"
              leftSection={<ClockIcon className="w-4 h-4 text-zinc-500" />}
              value={form.hora_ingreso || undefined}
              onChange={(event) => {
                const val = event.currentTarget.value;
                const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(val ?? "");
                const formatted = match ? `${match[1]}:${match[2]}` : "";
                setField("hora_ingreso", formatted);
              }}
              onClick={() => refIngreso.current?.showPicker?.()}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              required
              withAsterisk
              disabled={loading}
            />
            {form.hora_ingreso && (
              <span className="text-[10px] text-blue-400 font-bold mt-1 block ml-1">
                ({dayjs(`2000-01-01 ${form.hora_ingreso}`).format("hh:mm A")})
              </span>
            )}
          </div>

          <div>
            <TimeInput
              ref={refSalida}
              label="Hora de Salida"
              placeholder="Seleccione hora"
              leftSection={<ClockIcon className="w-4 h-4 text-zinc-500" />}
              value={form.hora_salida || undefined}
              onChange={(event) => {
                const val = event.currentTarget.value;
                const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(val ?? "");
                const formatted = match ? `${match[1]}:${match[2]}` : "";
                setField("hora_salida", formatted);
              }}
              onClick={() => refSalida.current?.showPicker?.()}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              required
              withAsterisk
              disabled={loading}
            />
            {form.hora_salida && (
              <span className="text-[10px] text-blue-400 font-bold mt-1 block ml-1">
                ({dayjs(`2000-01-01 ${form.hora_salida}`).format("hh:mm A")})
                {form.hora_ingreso &&
                  form.hora_salida &&
                  dayjs(`2000-01-01 ${form.hora_salida}`).isBefore(
                    dayjs(`2000-01-01 ${form.hora_ingreso}`)
                  ) && (
                    <span className="text-amber-400 font-bold ml-1">
                      (Día siguiente)
                    </span>
                  )}
              </span>
            )}
          </div>
        </Group>

        {form.total_horas > 0 && (
          <Group justify="center" mt={-8}>
            <Badge
              variant="light"
              color="indigo"
              radius="md"
              size="lg"
              className="font-bold border border-indigo-500/30"
              leftSection={<ClockIcon className="w-3.5 h-3.5" />}
            >
              {form.total_horas.toFixed(2)} horas totales
            </Badge>
          </Group>
        )}

        <NumberInput
          label="Minutos de tolerancia (opcional)"
          placeholder="Ej. 15"
          hideControls
          value={form.minutos_tolerancia ?? ""}
          onChange={(v) =>
            setField(
              "minutos_tolerancia",
              v === "" || v === null ? null : Number(v),
            )
          }
          leftSection={<ClockIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          min={0}
          max={1440}
          disabled={loading}
        />

        {form.tipo_turno === "Noche" && (
          <Alert
            variant="light"
            color="indigo"
            radius="md"
            icon={<ExclamationCircleIcon className="w-4 h-4" />}
            styles={{ message: { fontSize: "12px" } }}
          >
            Los turnos <strong>Noche</strong> cruzan medianoche: la hora de salida
            corresponde al día siguiente.
          </Alert>
        )}



        <Group justify="flex-end" mt="md" gap="md">
          <Button
            variant="subtle"
            onClick={close}
            disabled={loading}
            radius="lg"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            Cancelar
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              void handleConfirmar();
            }}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-8"
          >
            {turnoEditar ? "Guardar Cambios" : "Registrar Turno"}
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};