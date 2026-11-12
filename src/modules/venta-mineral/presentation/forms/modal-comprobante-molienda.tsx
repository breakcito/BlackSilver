import { useMemo, useState } from "react";
import { Alert, Button, Group, NumberInput, Stack } from "@mantine/core";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import type { ComprobanteDespachoItem } from "../../service/venta-mineral.responses";
import { ComprobanteFormPanel } from "../components/comprobante-form-panel";
import { inputClasses } from "../components/input-classes";
import {
  calcularImportes,
  DETRACCION_ESTANDAR_POR_DEFECTO,
  IGV_POR_DEFECTO,
} from "./calculos-despacho";

interface Props {
  close: () => void;
  /** Si viene informado, el modal edita ese comprobante. */
  comprobante?: ComprobanteDespachoItem | null;
  onGuardar: (payload: {
    codigo_comprobante: string;
    fecha_emision: string;
    con_detraccion: boolean;
    porcentaje_detraccion: number;
    porcentaje_igv: number;
    monto: number;
    evidencias?: File[];
  }) => Promise<boolean>;
}

/**
 * Registro y edicion del comprobante de molienda.
 *
 * Es la factura del molino de destino: un solo comprobante por despacho.
 */
export const ModalComprobanteMolienda = ({
  close,
  comprobante,
  onGuardar,
}: Props) => {
  const esEdicion = Boolean(comprobante);

  const [codigo, setCodigo] = useState(
    () => comprobante?.codigo_comprobante ?? "",
  );
  const [fecha, setFecha] = useState(() =>
    comprobante?.fecha_emision
      ? dayjs(comprobante.fecha_emision).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
  );
  const [conDetraccion, setConDetraccion] = useState(
    () => comprobante?.con_detraccion ?? true,
  );
  const [porcentajeDetraccion, setPorcentajeDetraccion] = useState<
    number | string
  >(
    () => comprobante?.porcentaje_detraccion ?? DETRACCION_ESTANDAR_POR_DEFECTO,
  );
  const [porcentajeIgv, setPorcentajeIgv] = useState<number | string>(
    () => comprobante?.porcentaje_igv ?? IGV_POR_DEFECTO,
  );
  const [monto, setMonto] = useState<number | string>(
    () => comprobante?.subtotal ?? 0,
  );
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const importes = useMemo(
    () =>
      calcularImportes(
        Number(monto) || 0,
        Number(porcentajeIgv) || 0,
        conDetraccion ? Number(porcentajeDetraccion) || 0 : 0,
      ),
    [monto, porcentajeIgv, porcentajeDetraccion, conDetraccion],
  );

  const handleSubmit = async () => {
    setError(null);

    if (!codigo.trim()) {
      setError("Ingresa el numero del comprobante");
      return;
    }
    if (!fecha) {
      setError("Ingresa la fecha de emision");
      return;
    }
    if ((Number(monto) || 0) <= 0) {
      setError("Ingresa el monto de la molienda");
      return;
    }

    setSaving(true);
    const ok = await onGuardar({
      codigo_comprobante: codigo.trim().toUpperCase(),
      fecha_emision: fecha,
      con_detraccion: conDetraccion,
      porcentaje_detraccion: Number(porcentajeDetraccion) || 0,
      porcentaje_igv: Number(porcentajeIgv) || 0,
      monto: Number(monto) || 0,
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

      <ComprobanteFormPanel
        codigo={codigo}
        setCodigo={setCodigo}
        fecha={fecha}
        setFecha={setFecha}
        conDetraccion={conDetraccion}
        setConDetraccion={setConDetraccion}
        porcentajeDetraccion={porcentajeDetraccion}
        setPorcentajeDetraccion={setPorcentajeDetraccion}
        porcentajeIgv={porcentajeIgv}
        setPorcentajeIgv={setPorcentajeIgv}
        importes={importes}
        disabled={saving}
        igvEnFila2
        campoFila1={
          <NumberInput
            label="Monto de la molienda (S/)"
            value={monto}
            onChange={setMonto}
            hideControls
            disabled={saving}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            required
          />
        }
      />

      <MultiFilePicker
        label="Evidencias del comprobante"
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
          {esEdicion ? "Guardar cambios" : "Registrar comprobante"}
        </Button>
      </Group>
    </Stack>
  );
};
