import { useState } from "react";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Textarea,
} from "@mantine/core";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { TipoGastoDespacho } from "../../../../shared/enums/venta-mineral/tipo-gasto-despacho";
import { Schema_Gasto } from "../../service/venta-mineral.requests";
import type { GastoDespachoItem } from "../../service/venta-mineral.responses";
import { inputClasses } from "../components/input-classes";

interface Props {
  close: () => void;
  /** Si viene informado, el modal edita ese gasto. */
  gasto?: GastoDespachoItem | null;
  onGuardar: (payload: {
    tipo_gasto: string;
    descripcion: string | null;
    monto: number;
  }) => Promise<boolean>;
}

/**
 * Registro y edicion de un gasto del despacho (winche, winchadores).
 */
export const ModalGasto = ({ close, gasto, onGuardar }: Props) => {
  const esEdicion = Boolean(gasto);

  const [tipoGasto, setTipoGasto] = useState<string>(
    () => gasto?.tipo_gasto ?? TipoGastoDespacho.Winche,
  );
  const [descripcion, setDescripcion] = useState(
    () => gasto?.descripcion ?? "",
  );
  const [monto, setMonto] = useState<number | string>(
    () => gasto?.monto ?? 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    const payload = {
      tipo_gasto: tipoGasto,
      descripcion: descripcion.trim() || null,
      monto: Number(monto) || 0,
    };

    const parsed = Schema_Gasto.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos del gasto");
      return;
    }

    setSaving(true);
    const ok = await onGuardar(payload);
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

      <Select
        label="Tipo de gasto"
        data={Object.values(TipoGastoDespacho)}
        value={tipoGasto}
        onChange={(valor) => setTipoGasto(valor ?? TipoGastoDespacho.Winche)}
        allowDeselect={false}
        disabled={saving}
        classNames={inputClasses}
        size="xs"
        radius="lg"
        required
      />

      <Textarea
        label="Descripcion"
        placeholder="Ej. Wincha del turno noche, 4 horas..."
        value={descripcion}
        onChange={(e) => setDescripcion(e.currentTarget.value)}
        autosize
        minRows={2}
        maxRows={4}
        disabled={saving}
        classNames={inputClasses}
        size="xs"
        radius="lg"
      />

      <NumberInput
        label="Monto (S/)"
        value={monto}
        onChange={setMonto}
        min={0}
        fixedDecimalScale
        decimalScale={2}
        hideControls
        disabled={saving}
        classNames={inputClasses}
        size="xs"
        radius="lg"
        required
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
          {esEdicion ? "Guardar cambios" : "Registrar gasto"}
        </Button>
      </Group>
    </Stack>
  );
};
