import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { IconCheck, IconPlus, IconScale, IconTruck } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import { inputClasses } from "../components/input-classes";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { FormVehiculoCarbon } from "../../../../presentation/utils/form-vehiculo-carbon";
import { useCatalogosDespacho } from "../../hooks/useCatalogosDespacho";
import {
  exigeSegundaPlaca,
  type TipoVehiculoCarbon,
} from "../../../../shared/enums/venta-carbon/tipo-vehiculo-carbon";
import {
  esTipoCalidadCarbon,
  type TipoCalidadCarbon,
} from "../../../../shared/enums/carbon/tipo-calidad-carbon";
import type {
  CargaVentaCarbonItem,
  VentaCarbonResumen,
} from "../../service/venta-carbon.responses";

interface Props {
  venta: VentaCarbonResumen;
  carga: CargaVentaCarbonItem;
  onClose: () => void;
  onConfirmed: (venta: VentaCarbonResumen) => void;
}

/** Tipo de carbon que exige analisis granulometrico y % de pizarra. */
const TIPO_CON_ANALISIS = "tipo a";

export const ModalConfirmarLlegada = ({
  venta,
  carga,
  onClose,
  onConfirmed,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();
  const { tipos, calidades, vehiculos, marcas, reloadVehiculos, reloadMarcas } =
    useCatalogosDespacho();

  const [idTipoConfirmado, setIdTipoConfirmado] = useState<string | null>(
    carga.id_tipo_carbon ? String(carga.id_tipo_carbon) : null,
  );
  const [calidad, setCalidad] = useState<TipoCalidadCarbon | null>(
    carga.calidad ?? null,
  );
  const [cantidadConfirmada, setCantidadConfirmada] = useState<number>(
    Number(carga.cantidad_toneladas) || 0,
  );
  const [fechaHoraIngreso, setFechaHoraIngreso] = useState(
    dayjs().format("YYYY-MM-DDTHH:mm"),
  );
  const [idVehiculo, setIdVehiculo] = useState<string | null>(null);
  const [segundaPlaca, setSegundaPlaca] = useState("");
  const [vehiculoBusqueda, setVehiculoBusqueda] = useState("");
  const [guiaRemitente, setGuiaRemitente] = useState("");
  const [guiaTransportista, setGuiaTransportista] = useState("");
  const [codigoTicketBalanza, setCodigoTicketBalanza] = useState("");
  const [fueAceptado, setFueAceptado] = useState(true);
  const [observacion, setobservacion] = useState<string>("");
  const [porcentajeCeniza, setPorcentajeCeniza] = useState<number>(0);
  const [porcentajeHumedad, setPorcentajeHumedad] = useState<number>(0);
  const [porcentajeAzufre, setPorcentajeAzufre] = useState<number>(0);
  const [porcentajePizarra, setPorcentajePizarra] = useState<number>(0);
  const [mayorAUno, setMayorAUno] = useState<number | string>("");
  const [menorAUno, setMenorAUno] = useState<number | string>("");
  const [unMedio, setUnMedio] = useState<number | string>("");
  const [archivos, setArchivos] = useState<File[]>([]);

  const [openNuevoVehiculo, setOpenNuevoVehiculo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehiculosVisibles = useMemo(() => {
    const q = vehiculoBusqueda.trim();
    if (!q) return vehiculos;
    return getCoincidencias(vehiculos, q, {
      keys: ["placa", "marca", "tipo_vehiculo"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [vehiculos, vehiculoBusqueda]);

  const vehiculoSeleccionado = useMemo(
    () => vehiculos.find((v) => String(v.id_vehiculo_carbon) === idVehiculo),
    [vehiculos, idVehiculo],
  );

  const tipoVehiculo = (vehiculoSeleccionado?.tipo_vehiculo ??
    null) as TipoVehiculoCarbon | null;

  const esTolva = exigeSegundaPlaca(tipoVehiculo);

  const tipoConfirmado = useMemo(
    () => tipos.find((t) => String(t.id_tipo_carbon) === idTipoConfirmado),
    [tipos, idTipoConfirmado],
  );

  const requiereAnalisis =
    tipoConfirmado?.nombre?.trim().toLowerCase() === TIPO_CON_ANALISIS;

  useEffect(() => {
    setobservacion(
      fueAceptado
        ? `ACEPTADO COMO ${tipoConfirmado?.nombre.toUpperCase() ?? "—"}`
        : `RECHAZADO COMO ${tipoConfirmado?.nombre.toUpperCase() ?? "—"}`,
    );
  }, [fueAceptado, tipoConfirmado]);

  const handleSubmit = async () => {
    setError(null);

    if (!idTipoConfirmado) {
      setError("Debe seleccionar el tipo de carbon confirmado");
      return;
    }
    if (!calidad) {
      setError("Debe indicar la calidad del carbon que llego");
      return;
    }
    if (!cantidadConfirmada || cantidadConfirmada <= 0) {
      setError("La cantidad confirmada debe ser mayor a 0");
      return;
    }
    if (!fechaHoraIngreso) {
      setError("Debe indicar la fecha y hora de ingreso al almacen");
      return;
    }
    if (!idVehiculo) {
      setError("Debe indicar el vehiculo que transporto la carga");
      return;
    }
    if (esTolva && !segundaPlaca.trim()) {
      setError("El vehiculo es Tolva, debe ingresar la segunda placa");
      return;
    }

    setSaving(true);
    try {
      const res = await VentaCarbonService.confirmarLlegada(
        venta.id_venta_carbon,
        carga.id_carga_venta_carbon,
        {
          id_tipo_carbon: Number(idTipoConfirmado),
          calidad,
          cantidad_toneladas: cantidadConfirmada,
          fecha_hora_ingreso: fechaHoraIngreso,
          id_vehiculo_carbon: Number(idVehiculo),
          segunda_placa: segundaPlaca.trim() || null,
          guia_remitente: guiaRemitente.trim() || null,
          guia_transportista: guiaTransportista.trim() || null,
          codigo_ticket_balanza: codigoTicketBalanza.trim() || null,
          observacion: fueAceptado ? null : observacion.trim() || null,
          porcentaje_ceniza: porcentajeCeniza,
          porcentaje_humedad: porcentajeHumedad,
          porcentaje_azufre: porcentajeAzufre,
          porcentaje_pizarra: requiereAnalisis ? porcentajePizarra : 0,
          analisis_granulometria: requiereAnalisis
            ? {
                mayor_a_uno: mayorAUno === "" ? null : Number(mayorAUno),
                menor_a_uno: menorAUno === "" ? null : Number(menorAUno),
                un_medio: unMedio === "" ? null : Number(unMedio),
              }
            : null,
          fue_aceptado: fueAceptado,
          archivos,
        },
      );

      if (res.success && res.data) {
        notifySuccess("Llegada confirmada correctamente");
        onConfirmed(res.data);
      } else {
        const msg = res.message || "Error al confirmar la llegada";
        setError(msg);
        notifyError(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" variant="light" title="Atencion" radius="md">
          {error}
        </Alert>
      )}

      {/* Resumen del despacho */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <SimpleGrid cols={{ base: 2, md: 10 }} spacing="xs">
          <Text size="xs" c="gray" style={{ gridColumn: "span 1" }}>
            Tipo:{" "}
            <span className="text-zinc-200 font-semibold">
              {carga.tipo_carbon ?? "—"}
            </span>
          </Text>

          <Text size="xs" c="gray" style={{ gridColumn: "span 1" }}>
            Calidad:{" "}
            <span className="text-zinc-200 font-semibold">
              {carga.calidad ?? "—"}
            </span>
          </Text>

          <Text size="xs" c="gray" style={{ gridColumn: "span 1" }}>
            TN:{" "}
            <span className="text-zinc-200 font-semibold">
              {formatNumber(carga.cantidad_toneladas)}
            </span>
          </Text>

          <Text size="xs" c="gray" style={{ gridColumn: "span 2" }}>
            Salida:{" "}
            <span className="text-zinc-200 font-semibold">
              {carga.fecha_hora_salida
                ? dayjs(carga.fecha_hora_salida).format("DD/MM/YYYY HH:mm")
                : "—"}
            </span>
          </Text>

          <Text size="xs" c="gray" style={{ gridColumn: "span 2" }}>
            Destino:{" "}
            <span className="text-zinc-200 font-semibold">
              {venta.cliente_destino ?? "—"}
            </span>
          </Text>

          <Text size="xs" c="gray" style={{ gridColumn: "span 2" }}>
            Almacen llegada:{" "}
            <span className="text-zinc-200 font-semibold">
              {venta.almacen_cliente_llegada ?? "—"}
            </span>
          </Text>
        </SimpleGrid>
      </Paper>

      {/* Recepcion */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
          <Select
            label="Tipo de carbon"
            placeholder={
              tipos.length === 0 ? "Cargando..." : "Seleccione el tipo"
            }
            data={tipos.map((t) => ({
              value: String(t.id_tipo_carbon),
              label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
            }))}
            value={idTipoConfirmado}
            onChange={setIdTipoConfirmado}
            rightSection={
              tipos.length === 0 ? (
                <Loader size={14} color="indigo" />
              ) : undefined
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            nothingFoundMessage="Sin tipos de carbon"
            comboboxProps={{ withinPortal: true }}
            disabled={saving}
          />

          <Select
            label="Calidad"
            placeholder="Seleccione la calidad"
            data={calidades.map((c) => ({ value: c.nombre, label: c.nombre }))}
            value={calidad}
            onChange={(val) =>
              setCalidad(esTipoCalidadCarbon(val) ? val : null)
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <TextInput
            label="Fecha y hora de ingreso"
            type="datetime-local"
            value={fechaHoraIngreso}
            onChange={(e) => setFechaHoraIngreso(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <NumberInput
            label="Cantidad (TN)"
            placeholder="0.00"
            value={cantidadConfirmada}
            onChange={(val) => setCantidadConfirmada(Number(val) || 0)}
            leftSection={<IconScale size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            hideControls
            disabled={saving}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 6 }} spacing="sm" mt="sm">
          <div className="col-span-1 md:col-span-2">
            <Group gap="xs" align="flex-end" wrap="nowrap">
              <Select
                label="Vehiculo"
                className="flex-1"
                placeholder={
                  vehiculos.length === 0 ? "Cargando..." : "Seleccione vehiculo"
                }
                data={vehiculosVisibles.map((v) => ({
                  value: String(v.id_vehiculo_carbon),
                  label: `${v.placa}${v.marca ? ` · ${v.marca}` : ""} (${v.tipo_vehiculo})`,
                }))}
                value={idVehiculo}
                onChange={setIdVehiculo}
                searchValue={vehiculoBusqueda}
                onSearchChange={setVehiculoBusqueda}
                leftSection={<IconTruck size={16} />}
                classNames={inputClasses}
                size="xs"
                radius="lg"
                searchable
                clearable
                nothingFoundMessage="Sin vehiculos registrados"
                comboboxProps={{ withinPortal: true }}
                // El filtrado lo hace `getCoincidencias` (Fuse + FlexSearch):
                // el filtro por subcadena de Mantine descartaria las
                // coincidencias difusas (placa mal escrita, marca parcial).
                filter={({ options }) => options}
                disabled={saving}
              />
              <Tooltip label="Registrar nuevo vehiculo" withArrow>
                <ActionIcon
                  size={32}
                  variant="filled"
                  color="indigo.6"
                  radius="lg"
                  onClick={() => setOpenNuevoVehiculo(true)}
                  disabled={saving}
                  className="mb-0.75"
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
            {vehiculoSeleccionado && (
              <Text size="xs" c="dimmed" mt={4}>
                Tipo: {vehiculoSeleccionado.tipo_vehiculo}
                {vehiculoSeleccionado.marca
                  ? ` · Marca: ${vehiculoSeleccionado.marca}`
                  : ""}
              </Text>
            )}
          </div>

          <TextInput
            label={`Segunda placa ${esTolva ? "" : ""}`}
            placeholder="Ej. A1B-234"
            value={segundaPlaca}
            onChange={(e) =>
              setSegundaPlaca(e.currentTarget.value.toUpperCase())
            }
            disabled={!esTolva || saving}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <TextInput
            label="Ticket de balanza"
            placeholder="Ej. 5629"
            value={codigoTicketBalanza}
            onChange={(e) =>
              setCodigoTicketBalanza(e.currentTarget.value.toUpperCase())
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <Switch
            label="Carga aceptada"
            checked={fueAceptado}
            onChange={(e) => setFueAceptado(e.currentTarget.checked)}
            color="teal"
            size="xs"
            mt={32}
            disabled={saving}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 5 }} spacing="sm" mt="sm">
          <TextInput
            label="Guia de remitente"
            placeholder="Ej. EG07-1327"
            value={guiaRemitente}
            onChange={(e) =>
              setGuiaRemitente(e.currentTarget.value.toUpperCase())
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />
          <TextInput
            label="Guia de transportista"
            placeholder="Ej. V001-1234"
            value={guiaTransportista}
            onChange={(e) =>
              setGuiaTransportista(e.currentTarget.value.toUpperCase())
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <NumberInput
            label="% Ceniza"
            placeholder="0.00"
            value={porcentajeCeniza}
            onChange={(val) => setPorcentajeCeniza(Number(val) || 0)}
            max={100}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            hideControls
            disabled={saving}
          />
          <NumberInput
            label="% Humedad"
            placeholder="0.00"
            value={porcentajeHumedad}
            onChange={(val) => setPorcentajeHumedad(Number(val) || 0)}
            max={100}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            hideControls
            disabled={saving}
          />
          <NumberInput
            label="% Azufre"
            placeholder="0.00"
            value={porcentajeAzufre}
            onChange={(val) => setPorcentajeAzufre(Number(val) || 0)}
            max={100}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            hideControls
            disabled={saving}
          />
        </SimpleGrid>

        {requiereAnalisis && (
          <Paper
            mt="sm"
            p="sm"
            radius="lg"
            className="bg-indigo-950/20 border border-indigo-500/30"
          >
            <Group gap="xs" mb="xs">
              <Badge variant="light" color="indigo" radius="xl" size="sm">
                Tipo A
              </Badge>
              <Text size="xs" c="gray">
                Este tipo exige porcentaje de pizarra y analisis granulometrico.
              </Text>
            </Group>
            <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
              <NumberInput
                label={'Mayor a 1" (%)'}
                placeholder="0.00"
                value={mayorAUno}
                onChange={setMayorAUno}
                max={100}
                classNames={inputClasses}
                size="xs"
                radius="lg"
                hideControls
                disabled={saving}
              />
              <NumberInput
                label={'Menor a 1" (%)'}
                placeholder="0.00"
                value={menorAUno}
                onChange={setMenorAUno}
                max={100}
                classNames={inputClasses}
                size="xs"
                radius="lg"
                hideControls
                disabled={saving}
              />
              <NumberInput
                label={'1/2" (%)'}
                placeholder="0.00"
                value={unMedio}
                onChange={setUnMedio}
                max={100}
                classNames={inputClasses}
                size="xs"
                radius="lg"
                hideControls
                disabled={saving}
              />
              <NumberInput
                label="% Pizarra"
                placeholder="0.00"
                value={porcentajePizarra}
                onChange={(val) => setPorcentajePizarra(Number(val) || 0)}
                max={100}
                classNames={inputClasses}
                size="xs"
                radius="lg"
                hideControls
                disabled={saving}
              />
            </SimpleGrid>
          </Paper>
        )}

        <div className="flex flex-row gap-4 items-baseline">
          <div className="w-1/3">
            <Textarea
              label="Observacion"
              placeholder="Notas del ingreso en destino..."
              value={observacion}
              onChange={(e) =>
                setobservacion(e.currentTarget.value.toUpperCase())
              }
              mt="sm"
              autosize
              minRows={2}
              maxRows={4}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              disabled={saving}
              w="100%"
            />
          </div>
          <div className="w-2/3">
            <MultiFilePicker
              label="Adjuntar evidencia"
              files={archivos}
              onFilesChange={setArchivos}
            />
          </div>
        </div>
      </Paper>

      <Group justify="flex-end" gap="sm">
        <Button
          variant="default"
          onClick={onClose}
          disabled={saving}
          size="xs"
          radius="lg"
        >
          Cancelar
        </Button>
        <Button
          color="indigo"
          onClick={handleSubmit}
          loading={saving}
          size="xs"
          radius="lg"
          leftSection={<IconCheck size={16} />}
        >
          Confirmar llegada
        </Button>
      </Group>

      <ModalEstandar
        opened={openNuevoVehiculo}
        close={() => setOpenNuevoVehiculo(false)}
        validateClose
        title="Nuevo Vehiculo"
        size="md"
      >
        <FormVehiculoCarbon
          marcas={marcas}
          onSuccess={(nuevo) => {
            reloadVehiculos();
            setIdVehiculo(String(nuevo.id_vehiculo_carbon));
            setOpenNuevoVehiculo(false);
          }}
          onMarcaRegistrada={(marca) => reloadMarcas(marca)}
          onCancel={() => setOpenNuevoVehiculo(false)}
        />
      </ModalEstandar>
    </Stack>
  );
};
