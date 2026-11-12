import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
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
import {
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
  IconTruckDelivery,
  IconWallet,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { TipoGastoDespacho } from "../../../../shared/enums/venta-mineral/tipo-gasto-despacho";
import { Schema_Despacho } from "../../service/venta-mineral.requests";
import type {
  CatalogoMineral,
  DespachoMineralResumen,
  LoteMineralDespachable,
} from "../../service/venta-mineral.responses";
import { inputClasses } from "../components/input-classes";

interface GastoFormItem {
  tipo_gasto: string;
  descripcion: string;
  monto: number | string;
}

/**
 * Peso de la guia que se propone al registrar un despacho: 25 tn.
 *
 * Es solo un valor por defecto: el usuario puede cambiarlo por el real.
 */
const PESO_GUIA_POR_DEFECTO_TONELADAS = 25;

interface Props {
  close: () => void;
  lotesDespachables: LoteMineralDespachable[];
  molinos: CatalogoMineral[];
  transportistas: CatalogoMineral[];
  /** Si viene informado, el modal edita ese despacho. */
  despacho?: DespachoMineralResumen | null;
  onGuardar: (
    payload: {
      id_lote_mineral: number;
      id_molino: number;
      fecha_despacho: string;
      cantidad_sacos: number;
      observaciones: string | null;
      flete: {
        id_transportista_mineral: number;
        placa: string | null;
        licencia_conductor: string | null;
        guia_remitente: string | null;
        peso_guia: number;
        largo: number | null;
        ancho: number | null;
        alto: number | null;
      };
      gastos: {
        tipo_gasto: string;
        descripcion: string | null;
        monto: number;
      }[];
    },
    evidencias?: File[],
  ) => Promise<boolean>;
  onRegistrarMolino: () => void;
  onRegistrarTransportista: () => void;
}

/**
 * Registro y edicion de un despacho de mineral a molienda.
 *
 * El despacho se registra CON su flete: el mineral se lleva en una sola
 * unidad, asi que la carga se captura de una vez. Los gastos (winche,
 * winchadores) son opcionales y tambien se pueden agregar despues.
 */
export const ModalDespacho = ({
  close,
  lotesDespachables,
  molinos,
  transportistas,
  despacho,
  onGuardar,
  onRegistrarMolino,
  onRegistrarTransportista,
}: Props) => {
  const esEdicion = Boolean(despacho);

  /* ---------------- Despacho ---------------- */
  const [idLote, setIdLote] = useState<string | null>(() =>
    despacho?.id_lote_mineral ? String(despacho.id_lote_mineral) : null,
  );
  const [idMolino, setIdMolino] = useState<string | null>(() =>
    despacho?.id_molino ? String(despacho.id_molino) : null,
  );
  const [fechaDespacho, setFechaDespacho] = useState(() =>
    despacho?.fecha_despacho
      ? dayjs(despacho.fecha_despacho).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
  );
  const [cantidadSacos, setCantidadSacos] = useState<number | string>(
    () => despacho?.cantidad_sacos ?? 0,
  );
  const [observaciones, setObservaciones] = useState(
    () => despacho?.observaciones ?? "",
  );

  /* ---------------- Flete ---------------- */
  const [idTransportista, setIdTransportista] = useState<string | null>(null);
  const [placa, setPlaca] = useState("");
  const [licencia, setLicencia] = useState("");
  const [guia, setGuia] = useState("");
  const [pesoGuia, setPesoGuia] = useState<number | string>(
    PESO_GUIA_POR_DEFECTO_TONELADAS,
  );
  const [largo, setLargo] = useState<number | string>(0);
  const [ancho, setAncho] = useState<number | string>(0);
  const [alto, setAlto] = useState<number | string>(0);
  const [archivos, setArchivos] = useState<File[]>([]);

  /* ---------------- Gastos ---------------- */
  const [gastos, setGastos] = useState<GastoFormItem[]>([]);

  const [busquedaLote, setBusquedaLote] = useState("");
  const [busquedaMolino, setBusquedaMolino] = useState("");
  const [busquedaTransportista, setBusquedaTransportista] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lotesVisibles = useMemo(() => {
    const q = busquedaLote.trim();
    if (!q) return lotesDespachables;
    return getCoincidencias(lotesDespachables, q, {
      keys: ["codigo", "labor", "mina", "contratista"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [lotesDespachables, busquedaLote]);

  const molinosVisibles = useMemo(() => {
    const q = busquedaMolino.trim();
    if (!q) return molinos;
    return getCoincidencias(molinos, q, {
      keys: ["razon_social", "ruc"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [molinos, busquedaMolino]);

  const transportistasVisibles = useMemo(() => {
    const q = busquedaTransportista.trim();
    if (!q) return transportistas;
    return getCoincidencias(transportistas, q, {
      keys: ["razon_social", "ruc"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [transportistas, busquedaTransportista]);

  const handleLoteChange = (valor: string | null) => {
    setIdLote(valor);
    if (!valor) return;

    const lote = lotesDespachables.find(
      (l) => String(l.id_lote_mineral) === valor,
    );
    if (lote) {
      setCantidadSacos(lote.cantidad_sacos);
    }
  };

  const handleSacosChange = (valor: number | string) => {
    setCantidadSacos(valor);
  };

  const totalGastos = useMemo(
    () => gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0),
    [gastos],
  );

  const agregarGasto = () =>
    setGastos((prev) => [
      ...prev,
      { tipo_gasto: TipoGastoDespacho.Winche, descripcion: "", monto: 0 },
    ]);

  const quitarGasto = (indice: number) =>
    setGastos((prev) => prev.filter((_, i) => i !== indice));

  const handleSubmit = async () => {
    setError(null);

    const payload = {
      id_lote_mineral: Number(idLote),
      id_molino: Number(idMolino),
      fecha_despacho: fechaDespacho,
      cantidad_sacos: Number(cantidadSacos) || 0,
      observaciones: observaciones.trim() || null,
      flete: {
        id_transportista_mineral: Number(idTransportista),
        placa: placa.trim() || null,
        licencia_conductor: licencia.trim() || null,
        guia_remitente: guia.trim() || null,
        peso_guia: Number(pesoGuia) || 0,
        largo: Number(largo) || null,
        ancho: Number(ancho) || null,
        alto: Number(alto) || null,
      },
      gastos: gastos.map((g) => ({
        tipo_gasto: g.tipo_gasto,
        descripcion: g.descripcion.trim() || null,
        monto: Number(g.monto) || 0,
      })),
    };

    if (!esEdicion) {
      const parsed = Schema_Despacho.safeParse(payload);
      if (!parsed.success) {
        setError(
          parsed.error.issues[0]?.message ?? "Revisa los datos del despacho",
        );
        return;
      }
    }

    setSaving(true);
    const ok = await onGuardar(
      payload,
      archivos.length > 0 ? archivos : undefined,
    );
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
          label="Lote de mineral"
          placeholder="Selecciona el lote finalizado"
          data={lotesVisibles.map((l) => ({
            value: String(l.id_lote_mineral),
            label: `${l.codigo ?? "Sin codigo"} · ${l.labor ?? "sin labor"}`,
          }))}
          value={idLote}
          onChange={handleLoteChange}
          searchable
          searchValue={busquedaLote}
          onSearchChange={setBusquedaLote}
          nothingFoundMessage="Sin lotes despachables"
          comboboxProps={{ withinPortal: true }}
          disabled={saving || esEdicion}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />

        <Group gap="xs" align="flex-end" wrap="nowrap">
          <Select
            label="Molino de destino"
            placeholder="Selecciona el molino"
            data={molinosVisibles.map((m) => ({
              value: String(m.id),
              label: m.razon_social,
            }))}
            value={idMolino}
            onChange={setIdMolino}
            searchable
            searchValue={busquedaMolino}
            onSearchChange={setBusquedaMolino}
            nothingFoundMessage="Sin molinos registrados"
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
            onClick={onRegistrarMolino}
            leftSection={<IconPlus size={14} />}
            className="shrink-0"
          >
            Nuevo
          </Button>
        </Group>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          label="Fecha del despacho"
          type="date"
          value={fechaDespacho}
          onChange={(e) => setFechaDespacho(e.currentTarget.value)}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <NumberInput
          label="Cantidad de sacos"
          value={cantidadSacos}
          onChange={handleSacosChange}
          min={1}
          hideControls
          fixedDecimalScale
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
      </SimpleGrid>

      {/* ---------------- Flete ---------------- */}
      {esEdicion ? (
        <Text size="xs" c="dimmed">
          El flete y los gastos se editan en sus propias secciones del despacho.
        </Text>
      ) : (
        <>
          <Divider
            label={
              <Group gap={6}>
                <IconTruckDelivery size={14} />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Flete de la carga
                </span>
              </Group>
            }
            className="border-zinc-800"
            labelPosition="left"
          />

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
              label="Guía de Remisión (1ra)"
              placeholder="N. 000123"
              value={guia}
              onChange={(e) => setGuia(e.currentTarget.value.toUpperCase())}
              disabled={saving}
              classNames={inputClasses}
              size="xs"
              radius="lg"
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="sm">
            <NumberInput
              label="Peso de la guia (tn)"
          
              value={pesoGuia}
              onChange={(valor) => {
                setPesoGuia(valor);
              }}
              fixedDecimalScale
              
              hideControls
              disabled={saving}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
            <NumberInput
              label="Largo (m)"
              value={largo}
              onChange={setLargo}
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
        </>
      )}

      {/* ---------------- Gastos ---------------- */}
      {esEdicion ? null : (
        <>
          <Divider
            label={
              <Group gap={6}>
                <IconWallet size={14} />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Gastos del despacho
                </span>
              </Group>
            }
            className="border-zinc-800"
            labelPosition="left"
          />

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Winches y winchadores. Opcional: tambien se pueden agregar
              despues.
            </Text>
            <Button
              variant="light"
              color="indigo"
              size="compact-xs"
              radius="md"
              onClick={agregarGasto}
              leftSection={<IconPlus size={12} />}
            >
              Agregar gasto
            </Button>
          </Group>

          {gastos.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" py="xs">
              Sin gastos en este despacho.
            </Text>
          ) : (
            <Stack gap="xs">
              {gastos.map((gasto, indice) => (
                <Paper
                  key={`gasto-${indice}`}
                  p="xs"
                  radius="md"
                  className="bg-zinc-900/60 border border-zinc-800/70"
                >
                  <Group gap="xs" align="flex-end" wrap="nowrap">
                    <Select
                      label="Tipo"
                      data={Object.values(TipoGastoDespacho)}
                      value={gasto.tipo_gasto}
                      onChange={(valor) =>
                        setGastos((prev) =>
                          prev.map((g, i) =>
                            i === indice
                              ? {
                                  ...g,
                                  tipo_gasto: valor ?? TipoGastoDespacho.Winche,
                                }
                              : g,
                          ),
                        )
                      }
                      allowDeselect={false}
                      disabled={saving}
                      className="w-40 shrink-0"
                      classNames={inputClasses}
                      size="xs"
                      radius="lg"
                    />
                    <TextInput
                      label="Descripcion"
                      placeholder="Ej. Wincha turno noche, 4 horas"
                      value={gasto.descripcion}
                      onChange={(e) =>
                        setGastos((prev) =>
                          prev.map((g, i) =>
                            i === indice
                              ? {
                                  ...g,
                                  descripcion:
                                    e.currentTarget.value.toUpperCase(),
                                }
                              : g,
                          ),
                        )
                      }
                      disabled={saving}
                      className="flex-1"
                      classNames={inputClasses}
                      size="xs"
                      radius="lg"
                    />
                    <NumberInput
                      label="Monto (S/)"
                      value={gasto.monto}
                      onChange={(valor) =>
                        setGastos((prev) =>
                          prev.map((g, i) =>
                            i === indice ? { ...g, monto: valor } : g,
                          ),
                        )
                      }
                      
                      fixedDecimalScale
                      
                      hideControls
                      disabled={saving}
                      className="w-36 shrink-0"
                      classNames={inputClasses}
                      size="xs"
                      radius="lg"
                    />
                    <Button
                      variant="subtle"
                      color="red"
                      size="compact-xs"
                      onClick={() => quitarGasto(indice)}
                      leftSection={<IconTrash size={12} />}
                      className="shrink-0"
                    >
                      Quitar
                    </Button>
                  </Group>
                </Paper>
              ))}

              <Group justify="flex-end">
                <Badge color="orange" variant="light" size="md" radius="md">
                  Total de gastos: S/ {totalGastos.toFixed(2)}
                </Badge>
              </Group>
            </Stack>
          )}
        </>
      )}

      <Textarea
        label="Observaciones"
        placeholder="Notas del despacho..."
        value={observaciones}
        onChange={(e) =>
          setObservaciones(e.currentTarget.value.toUpperCase())
        }
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
          {esEdicion ? "Guardar cambios" : "Registrar despacho"}
        </Button>
      </Group>
    </Stack>
  );
};
