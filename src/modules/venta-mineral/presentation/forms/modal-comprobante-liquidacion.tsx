import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconDeviceFloppy, IconFileInvoice, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import type {
  ComprobanteDespachoItem,
  LiquidacionMineralItem,
} from "../../service/venta-mineral.responses";
import { ComprobanteFormPanel } from "../components/comprobante-form-panel";
import { inputClasses } from "../components/input-classes";
import { calcularImportes } from "./calculos-despacho";

/** El comprobante de liquidacion es SIEMPRE en dolares. */
const SIMBOLO = "$";

interface Props {
  close: () => void;
  /** Liquidaciones del despacho que todavia no tienen comprobante. */
  liquidacionesDisponibles: LiquidacionMineralItem[];
  /** Si viene informado, el modal edita ese comprobante. */
  comprobante?: ComprobanteDespachoItem | null;
  onGuardar: (payload: {
    codigo_comprobante: string;
    fecha_emision: string;
    tipo_cambio: number;
    con_detraccion: boolean;
    porcentaje_detraccion: number;
    porcentaje_igv: number;
    id_liquidacion_mineral: number;
    evidencias?: File[];
  }) => Promise<boolean>;
}

/**
 * Registro y edicion del comprobante de liquidacion.
 *
 * El comprobante COPIA los importes de la liquidacion que lo respalda: no se
 * capturan a mano. Si la liquidacion cambia, el comprobante se recalcula.
 *
 * El comprobante va en DOLARES: el tipo de cambio indica a cuanto se cobra
 * la detraccion, que siempre se cobra en soles.
 */
export const ModalComprobanteLiquidacion = ({
  close,
  liquidacionesDisponibles,
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
  const [tipoCambio, setTipoCambio] = useState<number | string>(
    () => comprobante?.tipo_cambio ?? 1,
  );
  const [conDetraccion, setConDetraccion] = useState(
    () => comprobante?.con_detraccion ?? true,
  );
  const [idLiquidacion, setIdLiquidacion] = useState<string | null>(() =>
    comprobante?.id_liquidacion_mineral
      ? String(comprobante.id_liquidacion_mineral)
      : null,
  );
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const liquidacionSeleccionada = useMemo(
    () =>
      liquidacionesDisponibles.find(
        (l) => String(l.id_liquidacion_mineral) === idLiquidacion,
      ),
    [liquidacionesDisponibles, idLiquidacion],
  );

  // El porcentaje de detraccion e IGV los define la liquidacion: el
  // comprobante los replica, no se editan a mano.
  const porcentajeIgv = liquidacionSeleccionada?.porcentaje_igv ?? 18;
  const porcentajeDetraccion = liquidacionSeleccionada?.porcentaje_detraccion ?? 12;

  const tipoCambioNum = Number(tipoCambio) || 0;

  const importes = useMemo(
    () =>
      calcularImportes(
        Number(liquidacionSeleccionada?.subtotal) || 0,
        Number(porcentajeIgv) || 0,
        conDetraccion ? Number(porcentajeDetraccion) || 0 : 0,
        tipoCambioNum,
      ),
    [
      liquidacionSeleccionada,
      porcentajeIgv,
      porcentajeDetraccion,
      conDetraccion,
      tipoCambioNum,
    ],
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
    if (!idLiquidacion) {
      setError("Selecciona la liquidacion que respalda este comprobante");
      return;
    }
    if (tipoCambioNum <= 0) {
      setError("Ingresa el tipo de cambio");
      return;
    }

    setSaving(true);
    const ok = await onGuardar({
      codigo_comprobante: codigo.trim().toUpperCase(),
      fecha_emision: fecha,
      tipo_cambio: tipoCambioNum,
      con_detraccion: conDetraccion,
      porcentaje_detraccion: Number(porcentajeDetraccion) || 0,
      porcentaje_igv: Number(porcentajeIgv) || 0,
      id_liquidacion_mineral: Number(idLiquidacion),
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

      <Select
        label="Liquidacion"
        placeholder="Selecciona la liquidacion"
        data={liquidacionesDisponibles.map((l) => ({
          value: String(l.id_liquidacion_mineral),
          label: `${l.codigo_liquidacion ?? "Sin codigo"} · ${l.elemento_quimico} · ${l.cliente ?? "sin cliente"}`,
        }))}
        value={idLiquidacion}
        onChange={setIdLiquidacion}
        searchable
        nothingFoundMessage="Sin liquidaciones disponibles"
        comboboxProps={{ withinPortal: true }}
        disabled={saving || esEdicion}
        classNames={inputClasses}
        size="xs"
        radius="lg"
        required
      />

      {liquidacionSeleccionada && (
        <Text size="xs" c="dimmed">
          Neto de la liquidacion: {SIMBOLO}{" "}
          {formatNumber(liquidacionSeleccionada.neto)} · peso neto{" "}
          {formatNumber(liquidacionSeleccionada.peso_neto)} t
        </Text>
      )}

      {/* Tipo de cambio: el comprobante es en dolares y la detraccion se
          cobra en soles. */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <NumberInput
          label="Tipo de cambio"
          value={tipoCambio}
          onChange={setTipoCambio}
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <Text size="xs" c="dimmed" style={{ alignSelf: "end" }}>
          1 {SIMBOLO} = S/ {formatNumber(tipoCambioNum)} · la detraccion se
          cobra en soles.
        </Text>
      </SimpleGrid>

      <ComprobanteFormPanel
        codigo={codigo}
        setCodigo={setCodigo}
        fecha={fecha}
        setFecha={setFecha}
        conDetraccion={conDetraccion}
        setConDetraccion={setConDetraccion}
        porcentajeDetraccion={porcentajeDetraccion}
        porcentajeIgv={porcentajeIgv}
        importes={importes}
        disabled={saving}
        simbolo={SIMBOLO}
        mostrarDetraccionEnSoles
      />

      <MultiFilePicker
        label="Evidencias del comprobante"
        files={archivos}
        onFilesChange={setArchivos}
      />

      <Text size="xs" c="dimmed">
        <IconFileInvoice size={12} className="inline mr-1" />
        Los importes no se capturan: el comprobante replica los de la
        liquidacion.
      </Text>

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
