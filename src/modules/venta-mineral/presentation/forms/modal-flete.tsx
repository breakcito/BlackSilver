import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconPlus, IconX } from "@tabler/icons-react";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { Schema_Flete } from "../../service/venta-mineral.requests";
import type {
  CatalogoMineral,
  FleteDespachoItem,
} from "../../service/venta-mineral.responses";
import { inputClasses } from "../components/input-classes";
import { pesoGuiaToneladas } from "./calculos-despacho";

interface Props {
  close: () => void;
  transportistas: CatalogoMineral[];
  /** Si viene informado, el modal edita ese flete. */
  flete?: FleteDespachoItem | null;
  /** Cantidad de sacos del despacho: propone el peso de la guia. */
  cantidadSacosDespacho?: number;
  onGuardar: (payload: {
    id_transportista_mineral: number;
    placa: string | null;
    licencia_conductor: string | null;
    guia_remitente: string | null;
    peso_guia: number;
    largo: number | null;
    ancho: number | null;
    alto: number | null;
    evidencias?: File[];
  }) => Promise<boolean>;
  onRegistrarTransportista: () => void;
}

/**
 * Registro y edicion de un flete del despacho.
 *
 * El flete tiene dos bloques: los datos de la unidad (transportista, placa,
 * licencia y guia) y el ticket de balanza. El peso de la guia se propone
 * con la referencia de la operacion (50 kg por saco) y el peso neto sale del
 * bruto menos la tara.
 */
export const ModalFlete = ({
  close,
  transportistas,
  flete,
  cantidadSacosDespacho,
  onGuardar,
  onRegistrarTransportista,
}: Props) => {
  const esEdicion = Boolean(flete);

  const [idTransportista, setIdTransportista] = useState<string | null>(() =>
    flete?.id_transportista_mineral
      ? String(flete.id_transportista_mineral)
      : null,
  );
  const [placa, setPlaca] = useState(() => flete?.placa ?? "");
  const [licencia, setLicencia] = useState(
    () => flete?.licencia_conductor ?? "",
  );
  const [guia, setGuia] = useState(() => flete?.guia_remitente ?? "");
  const [pesoGuia, setPesoGuia] = useState<number | string>(
    () =>
      flete?.peso_guia ??
      (cantidadSacosDespacho ? pesoGuiaToneladas(cantidadSacosDespacho) : 0),
  );
  const [largo, setLargo] = useState<number | string>(() => flete?.largo ?? 0);
  const [ancho, setAncho] = useState<number | string>(() => flete?.ancho ?? 0);
  const [alto, setAlto] = useState<number | string>(() => flete?.alto ?? 0);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [busquedaTransportista, setBusquedaTransportista] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const transportistasVisibles = useMemo(() => {
    const q = busquedaTransportista.trim();
    if (!q) return transportistas;
    return getCoincidencias(transportistas, q, {
      keys: ["razon_social", "ruc"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [transportistas, busquedaTransportista]);

  const handleSubmit = async () => {
    setError(null);

    const payload = {
      id_transportista_mineral: Number(idTransportista),
      placa: placa.trim() || null,
      licencia_conductor: licencia.trim() || null,
      guia_remitente: guia.trim() || null,
      peso_guia: Number(pesoGuia) || 0,
      largo: Number(largo) || null,
      ancho: Number(ancho) || null,
      alto: Number(alto) || null,
    };

    const parsed = Schema_Flete.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos del flete");
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

      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Select
          label="Transportista"
          placeholder="Selecciona el transportista"
          data={transportistasVisibles.map((t) => ({
            value: String(t.id),
            label: t.razon_social,
          }))}
          value={idTransportista}
          onChange={setIdTransportista}
          searchable
          searchValue={busquedaTransportista}
          onSearchChange={setBusquedaTransportista}
          nothingFoundMessage="Sin transportistas registrados"
          comboboxProps={{ withinPortal: true }}
          disabled={saving}
          className="flex-1"
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <Button
          variant="light"
          color="indigo"
          size="xs"
          radius="lg"
          onClick={onRegistrarTransportista}
          leftSection={<IconPlus size={14} />}
          className="shrink-0"
        >
          Nuevo transportista
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <TextInput
          label="Placa"
          placeholder="ABC-123"
          value={placa}
          onChange={(e) => setPlaca(e.currentTarget.value.toUpperCase())}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <TextInput
          label="Licencia del conductor"
          placeholder="Q12345678"
          value={licencia}
          onChange={(e) => setLicencia(e.currentTarget.value.toUpperCase())}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <TextInput
          label="Guia de remitente"
          placeholder="N. 000123"
          value={guia}
          onChange={(e) => setGuia(e.currentTarget.value.toUpperCase())}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
      </SimpleGrid>

      <NumberInput
        label="Peso de la guia (tn)"
        value={pesoGuia}
        onChange={setPesoGuia}
        min={0}
        decimalScale={3}
        fixedDecimalScale
        hideControls
        disabled={saving}
        classNames={inputClasses}
        size="xs"
        radius="lg"
        required
      />

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <NumberInput
          label="Largo (m)"
          value={largo}
          onChange={setLargo}
          min={0}
          decimalScale={3}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Ancho (m)"
          value={ancho}
          onChange={setAncho}
          min={0}
          decimalScale={3}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Alto (m)"
          value={alto}
          onChange={setAlto}
          min={0}
          decimalScale={3}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
      </SimpleGrid>

      <MultiFilePicker
        label="Evidencias del flete"
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
          {esEdicion ? "Guardar cambios" : "Registrar flete"}
        </Button>
      </Group>
    </Stack>
  );
};
