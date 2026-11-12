import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconDeviceFloppy, IconTruckDelivery, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { Moneda } from "../../../../shared/enums/_generic/moneda";
import type {
  ComprobanteDespachoItem,
  FleteDespachoItem,
} from "../../service/venta-mineral.responses";
import { ComprobanteFormPanel } from "../components/comprobante-form-panel";
import { inputClasses } from "../components/input-classes";
import {
  calcularImportes,
  DETRACCION_FLETE_POR_DEFECTO,
  IGV_POR_DEFECTO,
  simboloMoneda,
  subtotalFlete,
} from "./calculos-despacho";

interface Props {
  close: () => void;
  /** Fletes del despacho. Un despacho tiene un solo flete. */
  fletesDisponibles: FleteDespachoItem[];
  /** Si viene informado, el modal edita ese comprobante. */
  comprobante?: ComprobanteDespachoItem | null;
  onGuardar: (payload: {
    codigo_comprobante: string;
    fecha_emision: string;
    con_detraccion: boolean;
    porcentaje_detraccion: number;
    porcentaje_igv: number;
    id_fletes: number[];
    id_transportista_mineral: number;
    toneladas_cobradas: number;
    precio_por_tonelada: number;
    moneda: string;
    tipo_cambio: number;
    evidencias?: File[];
  }) => Promise<boolean>;
}

/**
 * Registro y edicion del comprobante de flete.
 *
 * El despacho tiene UN SOLO flete (el mineral se lleva en una sola
 * unidad): no hay que seleccionarlo. Lo que se captura es el precio por
 * tonelada y el resto de los datos del comprobante.
 *
 * El comprobante puede estar en soles o en dolares. La detraccion SIEMPRE
 * se cobra en soles: por eso se guarda el tipo de cambio y el monto de la
 * detraccion en soles.
 */
export const ModalComprobanteFlete = ({
  close,
  fletesDisponibles,
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
  const [porcentajeDetraccion, setPorcentajeDetraccion] = useState<number | string>(
    () => comprobante?.porcentaje_detraccion ?? DETRACCION_FLETE_POR_DEFECTO,
  );
  const [porcentajeIgv, setPorcentajeIgv] = useState<number | string>(
    () => comprobante?.porcentaje_igv ?? IGV_POR_DEFECTO,
  );
  const [precioPorTonelada, setPrecioPorTonelada] = useState<number | string>(
    () => comprobante?.precio_por_tonelada ?? 0,
  );
  const [moneda, setMoneda] = useState<Moneda>(
    () => comprobante?.moneda ?? Moneda.Soles,
  );
  const [tipoCambio, setTipoCambio] = useState<number | string>(
    () => comprobante?.tipo_cambio ?? 1,
  );
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // El flete del despacho: el mineral se lleva en una sola unidad.
  const flete = useMemo(() => {
    if (comprobante?.fletes?.length) return comprobante.fletes[0];
    return fletesDisponibles[0] ?? null;
  }, [comprobante, fletesDisponibles]);

  // Toneladas facturadas: el peso neto de balanza o, si no hay, el de la
  // guia. Es el mismo criterio que aplica el backend. El usuario puede
  // corregirlo: lo que se guarda es el TONELADAS COBRADAS del comprobante,
  // no el flete.
  const [toneladas, setToneladas] = useState<number | string>(() => {
    if (comprobante?.toneladas_cobradas) return comprobante.toneladas_cobradas;
    if (!flete) return 0;

    const pesoNeto = Number(flete.peso_neto);
    const pesoGuia = Number(flete.peso_guia);

    return Math.round((pesoNeto > 0 ? pesoNeto : pesoGuia) * 1000) / 1000;
  });

  // Al cambiar la moneda, el tipo de cambio vuelve a su valor por defecto:
  // 1 en soles y vacio en dolares (hay que digitarlo). El ajuste se hace
  // durante el render (no en un efecto) para no provocar renders en cascada.
  const [monedaAnterior, setMonedaAnterior] = useState(moneda);

  if (monedaAnterior !== moneda) {
    setMonedaAnterior(moneda);
    setTipoCambio(moneda === Moneda.Soles ? 1 : "");
  }

  const esDolar = moneda === Moneda.Dolares;
  const simbolo = simboloMoneda(moneda);
  const tipoCambioNum = Number(tipoCambio) || 0;

  const subtotal = useMemo(
    () => subtotalFlete(Number(toneladas) || 0, Number(precioPorTonelada) || 0),
    [toneladas, precioPorTonelada],
  );

  const importes = useMemo(
    () =>
      calcularImportes(
        subtotal,
        Number(porcentajeIgv) || 0,
        conDetraccion ? Number(porcentajeDetraccion) || 0 : 0,
        esDolar ? tipoCambioNum : 1,
      ),
    [
      subtotal,
      porcentajeIgv,
      porcentajeDetraccion,
      conDetraccion,
      esDolar,
      tipoCambioNum,
    ],
  );

  const handleSubmit = async () => {
    setError(null);

    if (!flete) {
      setError("El despacho no tiene un flete registrado");
      return;
    }
    if (!codigo.trim()) {
      setError("Ingresa el numero del comprobante");
      return;
    }
    if (!fecha) {
      setError("Ingresa la fecha de emision");
      return;
    }
    if (!flete.id_transportista_mineral) {
      setError("El flete no tiene transportista");
      return;
    }
    if ((Number(precioPorTonelada) || 0) <= 0) {
      setError("Ingresa el precio por tonelada");
      return;
    }
    if ((Number(toneladas) || 0) <= 0) {
      setError("Ingresa las toneladas que se facturan");
      return;
    }
    if (esDolar && tipoCambioNum <= 0) {
      setError("Ingresa el tipo de cambio del comprobante en dolares");
      return;
    }

    setSaving(true);
    const ok = await onGuardar({
      codigo_comprobante: codigo.trim().toUpperCase(),
      fecha_emision: fecha,
      con_detraccion: conDetraccion,
      porcentaje_detraccion: Number(porcentajeDetraccion) || 0,
      porcentaje_igv: Number(porcentajeIgv) || 0,
      id_fletes: [flete.id_flete_despacho],
      id_transportista_mineral: flete.id_transportista_mineral,
      toneladas_cobradas: Number(toneladas) || 0,
      precio_por_tonelada: Number(precioPorTonelada) || 0,
      moneda,
      tipo_cambio: esDolar ? tipoCambioNum : 1,
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

      {flete ? (
        <Paper
          p="sm"
          radius="lg"
          className="bg-zinc-950/60 border border-zinc-800"
        >
          <Group gap="xs" mb="xs">
            <IconTruckDelivery size={16} className="text-indigo-400" />
            <Text size="xs" fw={700} c="white">
              Carga que se factura
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <div>
              <Text size="xs" c="dimmed">
                Unidad
              </Text>
              <Text size="xs" fw={600} c="zinc.200">
                {flete.placa ?? "Sin placa"}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Transportista
              </Text>
              <Text size="xs" fw={600} c="zinc.200">
                {flete.transportista ?? "Sin transportista"}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Guia
              </Text>
              <Text size="xs" fw={600} c="zinc.200">
                {flete.guia_remitente ?? "-"}
              </Text>
            </div>
            <NumberInput
              label="Toneladas"
              value={toneladas}
              onChange={setToneladas}
              hideControls
              disabled={saving}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              suffix=" t"
              required
            />
          </SimpleGrid>
        </Paper>
      ) : (
        <Alert color="yellow" variant="light" title="Sin flete" radius="md">
          Registra el flete del despacho antes de facturarlo: el mineral se
          lleva en una sola unidad.
        </Alert>
      )}

      {/* Moneda y tipo de cambio del comprobante */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Select
          label="Moneda"
          data={Object.values(Moneda)}
          value={moneda}
          onChange={(valor) => setMoneda((valor as Moneda) ?? Moneda.Soles)}
          allowDeselect={false}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        {esDolar && (
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
        )}
      </SimpleGrid>

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
        simbolo={simbolo}
        mostrarDetraccionEnSoles={esDolar}
        campoFila1={
          <NumberInput
            label={`Precio por tonelada (${simbolo})`}
            value={precioPorTonelada}
            onChange={setPrecioPorTonelada}
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
