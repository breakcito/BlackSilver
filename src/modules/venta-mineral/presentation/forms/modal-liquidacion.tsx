import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { ElementoQuimicoMineral } from "../../../../shared/enums/venta-mineral/elemento-quimico-mineral";
import { Schema_Liquidacion } from "../../service/venta-mineral.requests";
import type { LiquidacionMineralItem } from "../../service/venta-mineral.responses";
import { inputClasses } from "../components/input-classes";
import {
  calcularImportesLiquidacion,
  DETRACCION_ESTANDAR_POR_DEFECTO,
  IGV_POR_DEFECTO,
} from "./calculos-despacho";

interface Props {
  close: () => void;
  clientes: { id_cliente: number; razon_social: string }[];
  /** Si viene informada, el modal edita esa liquidacion. */
  liquidacion?: LiquidacionMineralItem | null;
  onGuardar: (payload: {
    id_cliente: number;
    codigo_liquidacion: string;
    elemento_quimico: string;
    fecha_liquidacion: string;
    peso_humedo: number;
    tara: number;
    porcentaje_humedad: number;
    merma: number;
    ley_elemento: number;
    porcentaje_recuperacion: number;
    maquila: number;
    penalidad: number;
    valor_por_tonelada: number;
    porcentaje_igv: number;
    porcentaje_detraccion: number;
    observaciones: string | null;
  }) => Promise<boolean>;
}

/**
 * Registro y edicion de una liquidacion de mineral.
 *
 * La liquidacion se registra POR ELEMENTO QUIMICO (oro o plata). Los pesos y
 * los importes se derivan en vivo: el backend los recalcula al guardar con
 * el mismo criterio.
 */
export const ModalLiquidacion = ({
  close,
  clientes,
  liquidacion,
  onGuardar,
}: Props) => {
  const esEdicion = Boolean(liquidacion);

  const [idCliente, setIdCliente] = useState<string | null>(() =>
    liquidacion?.id_cliente ? String(liquidacion.id_cliente) : null,
  );
  const [codigo, setCodigo] = useState(
    () => liquidacion?.codigo_liquidacion ?? "",
  );
  const [elemento, setElemento] = useState<string>(
    () => liquidacion?.elemento_quimico ?? ElementoQuimicoMineral.Oro,
  );
  const [fecha, setFecha] = useState(() =>
    liquidacion?.fecha_liquidacion
      ? dayjs(liquidacion.fecha_liquidacion).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
  );
  const [pesoHumedo, setPesoHumedo] = useState<number | string>(
    () => liquidacion?.peso_humedo ?? 0,
  );
  const [tara, setTara] = useState<number | string>(
    () => liquidacion?.tara ?? 0,
  );
  const [porcentajeHumedad, setPorcentajeHumedad] = useState<number | string>(
    () => liquidacion?.porcentaje_humedad ?? 0,
  );
  const [merma, setMerma] = useState<number | string>(
    () => liquidacion?.merma ?? 0,
  );
  const [ley, setLey] = useState<number | string>(
    () => liquidacion?.ley_elemento ?? 0,
  );
  const [porcentajeRecuperacion, setPorcentajeRecuperacion] = useState<
    number | string
  >(() => liquidacion?.porcentaje_recuperacion ?? 0);
  const [maquila, setMaquila] = useState<number | string>(
    () => liquidacion?.maquila ?? 0,
  );
  const [penalidad, setPenalidad] = useState<number | string>(
    () => liquidacion?.penalidad ?? 0,
  );
  const [valorPorTonelada, setValorPorTonelada] = useState<number | string>(
    () => liquidacion?.valor_por_tonelada ?? 0,
  );
  const [porcentajeIgv, setPorcentajeIgv] = useState<number | string>(
    () => liquidacion?.porcentaje_igv ?? IGV_POR_DEFECTO,
  );
  const [porcentajeDetraccion, setPorcentajeDetraccion] = useState<
    number | string
  >(
    () => liquidacion?.porcentaje_detraccion ?? DETRACCION_ESTANDAR_POR_DEFECTO,
  );
  const [observaciones, setObservaciones] = useState(
    () => liquidacion?.observaciones ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Importes en vivo: el backend aplica exactamente el mismo criterio.
  const importes = useMemo(
    () =>
      calcularImportesLiquidacion({
        peso_humedo: Number(pesoHumedo) || 0,
        tara: Number(tara) || 0,
        porcentaje_humedad: Number(porcentajeHumedad) || 0,
        merma: Number(merma) || 0,
        maquila: Number(maquila) || 0,
        penalidad: Number(penalidad) || 0,
        valor_por_tonelada: Number(valorPorTonelada) || 0,
        porcentaje_igv: Number(porcentajeIgv) || 0,
        porcentaje_detraccion: Number(porcentajeDetraccion) || 0,
      }),
    [
      pesoHumedo,
      tara,
      porcentajeHumedad,
      merma,
      maquila,
      penalidad,
      valorPorTonelada,
      porcentajeIgv,
      porcentajeDetraccion,
    ],
  );

  const handleSubmit = async () => {
    setError(null);

    const payload = {
      id_cliente: Number(idCliente),
      codigo_liquidacion: codigo.trim(),
      elemento_quimico: elemento,
      fecha_liquidacion: fecha,
      peso_humedo: Number(pesoHumedo) || 0,
      tara: Number(tara) || 0,
      porcentaje_humedad: Number(porcentajeHumedad) || 0,
      merma: Number(merma) || 0,
      ley_elemento: Number(ley) || 0,
      porcentaje_recuperacion: Number(porcentajeRecuperacion) || 0,
      maquila: Number(maquila) || 0,
      penalidad: Number(penalidad) || 0,
      valor_por_tonelada: Number(valorPorTonelada) || 0,
      porcentaje_igv: Number(porcentajeIgv) || 0,
      porcentaje_detraccion: Number(porcentajeDetraccion) || 0,
      observaciones: observaciones.trim() || null,
    };

    const parsed = Schema_Liquidacion.safeParse(payload);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Revisa los datos de la liquidacion",
      );
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

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Select
          label="Cliente"
          placeholder="Selecciona el cliente"
          data={clientes.map((c) => ({
            value: String(c.id_cliente),
            label: c.razon_social,
          }))}
          value={idCliente}
          onChange={setIdCliente}
          searchable
          nothingFoundMessage="Sin clientes"
          comboboxProps={{ withinPortal: true }}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <TextInput
          label="Codigo de la liquidacion"
          placeholder="LIQ-0001"
          value={codigo}
          onChange={(e) => setCodigo(e.currentTarget.value.toUpperCase())}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <Select
          label="Elemento quimico"
          data={Object.values(ElementoQuimicoMineral)}
          value={elemento}
          onChange={(valor) => setElemento(valor ?? ElementoQuimicoMineral.Oro)}
          allowDeselect={false}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <TextInput
          label="Fecha de la liquidacion"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.currentTarget.value)}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
      </SimpleGrid>

      <Divider
        label={
          <span className="text-xs font-semibold uppercase tracking-wide">
            Pesos
          </span>
        }
        className="border-zinc-800"
        labelPosition="left"
      />

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
        <NumberInput
          label="Peso humedo (t)"
          value={pesoHumedo}
          onChange={setPesoHumedo}
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
        />
        <NumberInput
          label="% de humedad"
          value={porcentajeHumedad}
          onChange={setPorcentajeHumedad}
          max={100}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Peso seco TMS (t)"
          value={importes.peso_seco}
          onChange={() => {}}
          fixedDecimalScale
          hideControls
          readOnly
          disabled
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Merma (t)"
          value={merma}
          onChange={setMerma}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Peso neto (t)"
          value={importes.peso_neto}
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

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <NumberInput
          label="Ley acordada"
          value={ley}
          onChange={setLey}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="% de recuperacion"
          value={porcentajeRecuperacion}
          onChange={setPorcentajeRecuperacion}
          max={100}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
      </SimpleGrid>

      <Divider
        label={
          <span className="text-xs font-semibold uppercase tracking-wide">
            Valor
          </span>
        }
        className="border-zinc-800"
        labelPosition="left"
      />

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
        <NumberInput
          label="Maquila (S/)"
          value={maquila}
          onChange={setMaquila}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Penalidad (S/)"
          value={penalidad}
          onChange={setPenalidad}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Total de deducciones"
          value={importes.total_deducciones}
          onChange={() => {}}
          fixedDecimalScale
          hideControls
          readOnly
          disabled
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Valor por tonelada TMS (S/)"
          value={valorPorTonelada}
          onChange={setValorPorTonelada}
          min={0}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <NumberInput
          label="IGV (%)"
          value={porcentajeIgv}
          onChange={setPorcentajeIgv}
          min={0}
          max={100}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Detraccion (%)"
         
          value={porcentajeDetraccion}
          onChange={setPorcentajeDetraccion}
          max={100}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
      </SimpleGrid>

      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
          Importes de la liquidacion
        </Text>
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
          <Text size="xs" c="gray">
            Subtotal
            <Text size="sm" fw={700} c="zinc.200">
              S/ {formatNumber(importes.subtotal)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            IGV
            <Text size="sm" fw={700} c="zinc.200">
              S/ {formatNumber(importes.igv)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Total
            <Text size="sm" fw={700} c="indigo.3">
              S/ {formatNumber(importes.total)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Detraccion
            <Text size="sm" fw={700} c="orange.3">
              S/ {formatNumber(importes.detraccion)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Neto
            <Text size="sm" fw={800} c="lime.3">
              S/ {formatNumber(importes.neto)}
            </Text>
          </Text>
        </SimpleGrid>
      </Paper>

      <Textarea
        label="Observaciones"
        placeholder="Notas de la liquidacion..."
        value={observaciones}
        onChange={(e) => setObservaciones(e.currentTarget.value)}
        autosize
        minRows={2}
        maxRows={4}
        disabled={saving}
        classNames={inputClasses}
        size="xs"
        radius="lg"
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
          {esEdicion ? "Guardar cambios" : "Registrar liquidacion"}
        </Button>
      </Group>
    </Stack>
  );
};
