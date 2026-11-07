import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconPlus, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { AsumidoPorAnalisis } from "../../../../shared/enums/venta-mineral/asumido-por-analisis";
import { Schema_Analisis } from "../../service/venta-mineral.requests";
import type {
  AnalisisLaboratorioItem,
  CatalogoMineral,
} from "../../service/venta-mineral.responses";
import { inputClasses } from "../components/input-classes";
import { codigoClienteAnalisisPropio } from "./calculos-despacho";

interface Props {
  close: () => void;
  laboratorios: CatalogoMineral[];
  clientes: { id_cliente: number; razon_social: string }[];
  /** Si viene informado, el modal edita ese analisis. */
  analisis?: AnalisisLaboratorioItem | null;
  /** Labor del lote despachado: compone el codigo del cliente cuando el analisis es propio. */
  nombreLabor?: string | null;
  /** Sacos despachados: forman parte del codigo del cliente cuando el analisis es propio. */
  cantidadSacos?: number;
  onGuardar: (payload: {
    id_laboratorio: number;
    id_cliente: number | null;
    asumido_por: string;
    codigo_laboratorio: string | null;
    codigo_cliente: string | null;
    fecha_analisis: string | null;
    porcentaje_humedad: number;
    ley_oro: number;
    ley_plata: number;
    ley_cobre: number;
    ley_zinc: number;
    ley_arsenico: number;
    costo_servicio: number;
    evidencias?: File[];
  }) => Promise<boolean>;
  onRegistrarLaboratorio: () => void;
}

/**
 * Registro y edicion de un analisis de laboratorio.
 *
 * Si el analisis lo asume la empresa, el codigo del cliente lo compone el
 * sistema con la labor del lote y los sacos despachados (ej. GENESIS-465).
 * Si lo asume el cliente, el codigo se digita.
 */
export const ModalAnalisis = ({
  close,
  laboratorios,
  clientes,
  analisis,
  nombreLabor,
  cantidadSacos,
  onGuardar,
  onRegistrarLaboratorio,
}: Props) => {
  const esEdicion = Boolean(analisis);

  const [idLaboratorio, setIdLaboratorio] = useState<string | null>(() =>
    analisis?.id_laboratorio ? String(analisis.id_laboratorio) : null,
  );
  const [asumidoPor, setAsumidoPor] = useState<string>(
    () => analisis?.asumido_por ?? AsumidoPorAnalisis.Propio,
  );
  const [idCliente, setIdCliente] = useState<string | null>(() =>
    analisis?.id_cliente ? String(analisis.id_cliente) : null,
  );
  const [codigoCliente, setCodigoCliente] = useState(
    () => analisis?.codigo_cliente ?? "",
  );
  const [codigoLaboratorio, setCodigoLaboratorio] = useState(
    () => analisis?.codigo_laboratorio ?? "",
  );
  const [fechaAnalisis, setFechaAnalisis] = useState(() =>
    analisis?.fecha_analisis
      ? dayjs(analisis.fecha_analisis).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
  );
  const [porcentajeHumedad, setPorcentajeHumedad] = useState<number | string>(
    () => analisis?.porcentaje_humedad ?? 0,
  );
  const [leyOro, setLeyOro] = useState<number | string>(
    () => analisis?.ley_oro ?? 0,
  );
  const [leyPlata, setLeyPlata] = useState<number | string>(
    () => analisis?.ley_plata ?? 0,
  );
  const [leyCobre, setLeyCobre] = useState<number | string>(
    () => analisis?.ley_cobre ?? 0,
  );
  const [leyZinc, setLeyZinc] = useState<number | string>(
    () => analisis?.ley_zinc ?? 0,
  );
  const [leyArsenico, setLeyArsenico] = useState<number | string>(
    () => analisis?.ley_arsenico ?? 0,
  );
  const [costoServicio, setCostoServicio] = useState<number | string>(
    () => analisis?.costo_servicio ?? 0,
  );
  const [archivos, setArchivos] = useState<File[]>([]);
  const [busquedaLaboratorio, setBusquedaLaboratorio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const laboratoriosVisibles = useMemo(() => {
    const q = busquedaLaboratorio.trim();
    if (!q) return laboratorios;
    return getCoincidencias(laboratorios, q, {
      keys: ["razon_social", "ruc"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [laboratorios, busquedaLaboratorio]);

  const esPropio = asumidoPor === AsumidoPorAnalisis.Propio;

  // El codigo del cliente de un analisis propio lo compone el sistema.
  const codigoClienteCalculado = useMemo(
    () => codigoClienteAnalisisPropio(nombreLabor, cantidadSacos ?? 0),
    [nombreLabor, cantidadSacos],
  );

  const handleSubmit = async () => {
    setError(null);

    const payload = {
      id_laboratorio: Number(idLaboratorio),
      id_cliente: esPropio ? null : idCliente ? Number(idCliente) : null,
      asumido_por: asumidoPor,
      codigo_laboratorio: codigoLaboratorio.trim() || null,
      codigo_cliente: esPropio
        ? codigoClienteCalculado || null
        : codigoCliente.trim() || null,
      fecha_analisis: fechaAnalisis || null,
      porcentaje_humedad: Number(porcentajeHumedad) || 0,
      ley_oro: Number(leyOro) || 0,
      ley_plata: Number(leyPlata) || 0,
      ley_cobre: Number(leyCobre) || 0,
      ley_zinc: Number(leyZinc) || 0,
      ley_arsenico: Number(leyArsenico) || 0,
      costo_servicio: Number(costoServicio) || 0,
    };

    const parsed = Schema_Analisis.safeParse(payload);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Revisa los datos del analisis",
      );
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
          label="Laboratorio"
          placeholder="Selecciona el laboratorio"
          data={laboratoriosVisibles.map((l) => ({
            value: String(l.id),
            label: l.razon_social,
          }))}
          value={idLaboratorio}
          onChange={setIdLaboratorio}
          searchable
          searchValue={busquedaLaboratorio}
          onSearchChange={setBusquedaLaboratorio}
          nothingFoundMessage="Sin laboratorios registrados"
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
          onClick={onRegistrarLaboratorio}
          leftSection={<IconPlus size={14} />}
          className="shrink-0"
        >
          Nuevo laboratorio
        </Button>
      </Group>

      <div>
        <Text size="xs" className={inputClasses.label} mb={4}>
          Quien es responsable
        </Text>
        <SegmentedControl
          fullWidth
          size="xs"
          radius="lg"
          value={asumidoPor}
          onChange={setAsumidoPor}
          disabled={saving}
          data={[
            { label: "La empresa", value: AsumidoPorAnalisis.Propio },
            { label: "El cliente", value: AsumidoPorAnalisis.Cliente },
          ]}
        />
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        {esPropio ? (
          <TextInput
            label="Codigo del cliente"
            value={codigoClienteCalculado}
            onChange={() => {}}
            readOnly
            disabled
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />
        ) : (
          <>
            <Select
              label="Cliente que asume el analisis"
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
              label="Codigo del cliente del analisis"
              placeholder="Codigo que entrega el cliente"
              value={codigoCliente}
              onChange={(e) => setCodigoCliente(e.currentTarget.value)}
              disabled={saving}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
          </>
        )}

        <TextInput
          label="Codigo del laboratorio"
          placeholder="Codigo que asigna el laboratorio"
          value={codigoLaboratorio}
          onChange={(e) => setCodigoLaboratorio(e.currentTarget.value)}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />

        <TextInput
          label="Fecha del analisis"
          type="date"
          value={fechaAnalisis}
          onChange={(e) => setFechaAnalisis(e.currentTarget.value)}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
        <NumberInput
          label="Ley de oro"
          value={leyOro}
          onChange={setLeyOro}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Ley de plata"
          value={leyPlata}
          onChange={setLeyPlata}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Ley de cobre"
          value={leyCobre}
          onChange={setLeyCobre}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Ley de zinc"
          value={leyZinc}
          onChange={setLeyZinc}
          fixedDecimalScale
          hideControls
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <NumberInput
          label="Ley de arsenico"
          value={leyArsenico}
          onChange={setLeyArsenico}
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
      </SimpleGrid>

      <NumberInput
        label="Costo del servicio (S/)"
        value={costoServicio}
        onChange={setCostoServicio}
        
        fixedDecimalScale
        
        hideControls
        disabled={saving}
        classNames={inputClasses}
        size="xs"
        radius="lg"
      />

      <MultiFilePicker
        label="Evidencias del analisis"
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
          {esEdicion ? "Guardar cambios" : "Registrar analisis"}
        </Button>
      </Group>
    </Stack>
  );
};
