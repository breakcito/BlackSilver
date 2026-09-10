import {
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import {
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useLoteEdicion } from "../../hooks/useLoteEdicion";
import type { RES_Lote } from "../../service/lotes.responses";
import { CustomDatePicker } from "../../../../presentation/utils/date-picker-input";

dayjs.locale("es");

interface EditarLoteModalProps {
  lote: RES_Lote;
  onSuccess: (lote: RES_Lote) => void;
  onCancel: () => void;
}

export const EditarLoteModal = ({
  lote,
  onSuccess,
  onCancel,
}: EditarLoteModalProps) => {
  const {
    descripcion,
    setDescripcion,
    serieFacturaCompra,
    setSerieFacturaCompra,
    numeroFacturaCompra,
    setNumeroFacturaCompra,
    fechaHoraIngreso,
    setFechaHoraIngreso,
    submitting,
    error,
    handleSubmit,
  } = useLoteEdicion({ lote, onSuccess });

  const inputClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500",
    label: "text-zinc-300 mb-1 font-medium",
    description: "text-zinc-500 text-[11px] mt-1",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-1">
      {/* Header con info del lote */}
      <Paper
        withBorder
        p="md"
        radius="lg"
        className="bg-zinc-900/20 border-zinc-800"
      >
        <Group justify="space-between">
          <Stack gap={2}>
            <Text
              size="10px"
              fw={800}
              c="zinc.5"
              className="uppercase tracking-[0.2em] leading-none mb-1 text-zinc-500"
            >
              Lote a editar
            </Text>
            <Text
              fw={800}
              size="md"
              className="text-zinc-100 uppercase tracking-tight"
            >
              {lote.producto}
            </Text>
          </Stack>
          <Badge
            variant="light"
            color="violet"
            size="sm"
            radius="sm"
            className="font-bold border border-violet-500/20"
          >
            {lote.correlativo}
          </Badge>
        </Group>
      </Paper>

      {/* Fecha de ingreso (mismo patrón que registro-lote.tsx). */}
      <CustomDatePicker
        label="Fecha de ingreso"
        placeholder="Seleccione fecha de entrada"
        withAsterisk
        value={fechaHoraIngreso}
        onChange={(date) => setFechaHoraIngreso(date as Date | null)}
      />

      {/* Datos de factura */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="Serie Factura"
          placeholder="Ej. F001"
          maxLength={64}
          value={serieFacturaCompra}
          onChange={(e) =>
            setSerieFacturaCompra(e.currentTarget.value.toUpperCase())
          }
          classNames={inputClasses}
          radius="lg"
          size="sm"
        />
        <TextInput
          label="Número Factura"
          placeholder="Ej. 000123"
          maxLength={64}
          value={numeroFacturaCompra}
          onChange={(e) =>
            setNumeroFacturaCompra(e.currentTarget.value.toUpperCase())
          }
          classNames={inputClasses}
          radius="lg"
          size="sm"
        />
      </div>

      {/* Fecha de vencimiento (solo referencia; uso ternario para evitar
          que React renderice el literal "0" cuando es_perecible === 0). */}
      {lote.es_perecible == true ? (
        <div className="flex items-center gap-3 p-3 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
          <div className="flex-1">
            <Text
              size="10px"
              fw={800}
              className="uppercase tracking-[0.15em] leading-none mb-1 text-zinc-500"
            >
              Fecha de vencimiento
            </Text>
            <Text size="sm" fw={600} className="text-zinc-300">
              {lote.fecha_vencimiento
                ? dayjs(lote.fecha_vencimiento).format("DD/MM/YYYY")
                : "Sin fecha registrada"}
            </Text>
          </div>
          <Text
            size="9px"
            c="dimmed"
            fs="italic"
            className="uppercase tracking-wider"
          >
            Solo registro
          </Text>
        </div>
      ) : null}

      {/* Descripción */}
      <Textarea
        label="Descripción o referencia"
        placeholder="Notas adicionales, guía de remisión, etc."
        minRows={3}
        maxLength={1000}
        value={descripcion}
        onChange={(e) => setDescripcion(e.currentTarget.value)}
        classNames={inputClasses}
        radius="lg"
        size="sm"
      />

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl">
          <Text c="red.5" size="xs" ta="center" fw={700}>
            {error}
          </Text>
        </div>
      )}

      {/* Footer */}
      <Group
        justify="flex-end"
        mt="md"
        gap="md"
        className="pt-6 border-t border-zinc-800/40"
      >
        <Button
          variant="subtle"
          onClick={onCancel}
          disabled={submitting}
          radius="lg"
          size="sm"
          className="text-zinc-500 hover:text-white font-bold"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={submitting}
          radius="lg"
          size="sm"
          className="bg-linear-to-r from-zinc-100 to-zinc-300 text-zinc-900 font-bold hover:from-white hover:to-zinc-200 shadow-lg border-0 px-8"
          leftSection={<ArchiveBoxIcon className="w-4 h-4" />}
        >
          Guardar Cambios
        </Button>
      </Group>
    </form>
  );
};
