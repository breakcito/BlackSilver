import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { Schema_Balanza } from "../../service/venta-mineral.requests";
import type { FleteDespachoItem } from "../../service/venta-mineral.responses";
import { inputClasses } from "../components/input-classes";

interface Props {
  close: () => void;
  /** Flete al que se le registra el peso. */
  flete: FleteDespachoItem | null;
  onGuardar: (payload: {
    codigo_ticket_balanza: string;
    segunda_guia_remitente: string | null;
    peso_bruto: number;
    tara: number;
    fecha_hora_pesaje: string;
    evidencias?: File[];
  }) => Promise<boolean>;
}

/**
 * Registro del peso de balanza de un flete.
 *
 * Es una operacion aparte del alta del flete: el vehiculo primero sale, y
 * recien cuando llega al molino y se pesa se conoce el ticket, el peso
 * bruto, la tara y el peso neto.
 */
export const ModalBalanza = ({ close, flete, onGuardar }: Props) => {
  const [codigoTicket, setCodigoTicket] = useState(
    () => flete?.codigo_ticket_balanza ?? "",
  );
  const [segundaGuia, setSegundaGuia] = useState(
    () => flete?.segunda_guia_remitente ?? "",
  );
  const [pesoBruto, setPesoBruto] = useState<number | string>(
    () => flete?.peso_bruto ?? 0,
  );
  const [tara, setTara] = useState<number | string>(() => flete?.tara ?? 0);
  const [fechaHoraPesaje, setFechaHoraPesaje] = useState(() =>
    flete?.fecha_hora_pesaje
      ? new Date(flete.fecha_hora_pesaje).toISOString().slice(0, 16)
      : "",
  );
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // El peso neto sale del bruto menos la tara.
  const pesoNeto = useMemo(() => {
    const bruto = Number(pesoBruto) || 0;
    const t = Number(tara) || 0;
    if (bruto <= 0) return 0;
    return Math.max(0, Math.round((bruto - t) * 1000) / 1000);
  }, [pesoBruto, tara]);

  const handleSubmit = async () => {
    setError(null);

    const payload = {
      codigo_ticket_balanza: codigoTicket.trim().toUpperCase(),
      segunda_guia_remitente: segundaGuia.trim().toUpperCase() || null,
      peso_bruto: Number(pesoBruto) || 0,
      tara: Number(tara) || 0,
      fecha_hora_pesaje: fechaHoraPesaje,
    };

    const parsed = Schema_Balanza.safeParse(payload);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Revisa los datos del pesaje",
      );
      return;
    }

    if (payload.tara >= payload.peso_bruto) {
      setError("La tara no puede ser mayor o igual al peso bruto");
      return;
    }

    setSaving(true);
    const ok = await onGuardar({
      ...payload,
      evidencias: archivos.length > 0 ? archivos : undefined,
    });
    setSaving(false);

    if (ok) close();
  };

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" variant="light" title="Revisa los datos" radius="md">
          {error}
        </Alert>
      )}

      {flete && (
        <Text size="xs" c="dimmed">
          Flete {flete.placa ?? "sin placa"} ·{" "}
          {flete.transportista ?? "sin transportista"}
          {/* {flete.guia_remitente ? ` · guia ${flete.guia_remitente}` : ""} */}
        </Text>
      )}

      <Group grow>
        <TextInput
          label="Codigo del ticket"
          placeholder="TB-000123"
          value={codigoTicket}
          onChange={(e) => setCodigoTicket(e.currentTarget.value.toUpperCase())}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />

        <TextInput
          label="Guía de Remisión (2da)"
          placeholder="GRR-000123"
          value={segundaGuia}
          onChange={(e) => setSegundaGuia(e.currentTarget.value.toUpperCase())}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
      </Group>

      <TextInput
        label="Fecha y hora del pesaje"
        type="datetime-local"
        value={fechaHoraPesaje}
        onChange={(e) => setFechaHoraPesaje(e.currentTarget.value)}
        disabled={saving}
        classNames={inputClasses}
        size="xs"
        radius="lg"
        required
      />

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <NumberInput
          label="Peso bruto (t)"
          value={pesoBruto}
          onChange={setPesoBruto}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <NumberInput
          label="Tara (t)"
          value={tara}
          onChange={setTara}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <NumberInput
          label="Peso neto (t)"
          value={pesoNeto}
          onChange={() => {}}
          fixedDecimalScale
          hideControls
          readOnly
          disabled
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
      </SimpleGrid>

      <MultiFilePicker
        label="Evidencias del pesaje"
        files={archivos}
        onFilesChange={setArchivos}
      />

      <Group justify="flex-end" gap="sm">
        <Button
          variant="default"
          onClick={close}
          disabled={saving}
          size="xs"
          radius="lg"
          leftSection={<IconX size={16} />}
        >
          Cancelar
        </Button>
        <Button
          color="indigo"
          onClick={handleSubmit}
          loading={saving}
          size="xs"
          radius="lg"
          leftSection={<IconDeviceFloppy size={16} />}
        >
          Registrar ticket
        </Button>
      </Group>
    </Stack>
  );
};
