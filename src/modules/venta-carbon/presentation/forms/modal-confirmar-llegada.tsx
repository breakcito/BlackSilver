import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconCheck, IconScale } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { TipoCarbonService } from "../../../tipo-carbon/service/tipo-carbon.service";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import { inputClasses } from "../components/input-classes";
import { EstadoCargaVentaCarbon } from "../../../../shared/enums/venta-carbon/estado-carga-venta-carbon";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import type {
  CargaVentaCarbonItem,
  VentaCarbonResumen,
} from "../../service/venta-carbon.responses";
import type { RES_TipoCarbon } from "../../../tipo-carbon/service/tipo-carbon.responses";

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

  const [tipos, setTipos] = useState<RES_TipoCarbon[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);

  const [idTipoConfirmado, setIdTipoConfirmado] = useState<string | null>(
    carga.id_tipo_carbon_estimado
      ? String(carga.id_tipo_carbon_estimado)
      : null,
  );
  const [cantidadConfirmada, setCantidadConfirmada] = useState<number>(
    Number(carga.cantidad_toneladas) || 0,
  );
  const [fechaHoraIngreso, setFechaHoraIngreso] = useState(
    dayjs().format("YYYY-MM-DDTHH:mm"),
  );
  const [guiaRemitente, setGuiaRemitente] = useState("");
  const [guiaTransportista, setGuiaTransportista] = useState("");
  const [codigoTicketBalanza, setCodigoTicketBalanza] = useState("");
  const [codigoReporte, setCodigoReporte] = useState("");
  const [observacion, setObservacion] = useState("");
  const [porcentajeCeniza, setPorcentajeCeniza] = useState<number>(0);
  const [porcentajeHumedad, setPorcentajeHumedad] = useState<number>(0);
  const [porcentajeAzufre, setPorcentajeAzufre] = useState<number>(0);
  const [porcentajePizarra, setPorcentajePizarra] = useState<number>(0);
  const [mayorAUno, setMayorAUno] = useState<number | string>("");
  const [menorAUno, setMenorAUno] = useState<number | string>("");
  const [unMedio, setUnMedio] = useState<number | string>("");
  const [precioBase, setPrecioBase] = useState<number>(0);
  const [descuento, setDescuento] = useState<number>(0);
  const [bono, setBono] = useState<number>(0);
  const [codigoVenta, setCodigoVenta] = useState(venta.codigo ?? "");
  const [archivos, setArchivos] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await TipoCarbonService.getTipos();
        if (cancel) return;
        if (res.success && res.data) setTipos(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancel) setLoadingTipos(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // El precio base se propone con el de la ultima carga confirmada de la
  // misma venta: mantiene la continuidad tarifaria de la operacion.
  useEffect(() => {
    const confirmadas = venta.cargas
      .filter(
        (c) =>
          c.estado === EstadoCargaVentaCarbon.LlegadaConfirmada &&
          c.id_carga_venta_carbon !== carga.id_carga_venta_carbon,
      )
      .sort((a, b) => b.id_carga_venta_carbon - a.id_carga_venta_carbon);

    const ultima = confirmadas[0];
    if (ultima && Number(ultima.precio_base) > 0) {
      setPrecioBase(Number(ultima.precio_base));
    }
  }, [venta.cargas, carga.id_carga_venta_carbon]);

  const tipoConfirmado = useMemo(
    () => tipos.find((t) => String(t.id_tipo_carbon) === idTipoConfirmado),
    [tipos, idTipoConfirmado],
  );

  const requiereAnalisis =
    tipoConfirmado?.nombre?.trim().toLowerCase() === TIPO_CON_ANALISIS;

  const subtotalSinDescuento =
    Math.round(cantidadConfirmada * precioBase * 100) / 100;
  const subtotal =
    Math.round((subtotalSinDescuento - descuento + bono) * 100) / 100;

  const handleSubmit = async () => {
    setError(null);

    if (!idTipoConfirmado) {
      setError("Debe seleccionar el tipo de carbon confirmado");
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
    if (precioBase < 0) {
      setError("El precio base no puede ser negativo");
      return;
    }
    if (subtotal < 0) {
      setError("El descuento no puede superar el subtotal");
      return;
    }

    setSaving(true);
    try {
      const res = await VentaCarbonService.confirmarLlegada(
        venta.id_venta_carbon,
        carga.id_carga_venta_carbon,
        {
          id_tipo_carbon_confirmado: Number(idTipoConfirmado),
          cantidad_toneladas: cantidadConfirmada,
          fecha_hora_ingreso: fechaHoraIngreso,
          guia_remitente: guiaRemitente.trim() || null,
          guia_transportista: guiaTransportista.trim() || null,
          codigo_ticket_balanza: codigoTicketBalanza.trim() || null,
          codigo_reporte: codigoReporte.trim() || null,
          observacion: observacion.trim() || null,
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
          precio_base: precioBase,
          descuento,
          bono,
          codigo_venta: codigoVenta.trim() || null,
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
        <Group justify="space-between" mb={4}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            Datos del despacho
          </Text>
          <Badge variant="light" color="yellow" radius="xl" size="sm">
            En camino
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs">
          <Text size="xs" c="gray">
            Tipo:{" "}
            <span className="text-zinc-200 font-semibold">
              {carga.tipo_carbon_estimado ?? "—"}
            </span>
          </Text>
          <Text size="xs" c="gray">
            Calidad:{" "}
            <span className="text-zinc-200 font-semibold">
              {carga.calidad ?? "—"}
            </span>
          </Text>
          <Text size="xs" c="gray">
            Vehiculo:{" "}
            <span className="text-zinc-200 font-semibold">
              {carga.vehiculo_placa ?? "—"}
              {carga.segunda_placa ? ` / ${carga.segunda_placa}` : ""}
            </span>
          </Text>
          <Text size="xs" c="gray">
            Salida:{" "}
            <span className="text-zinc-200 font-semibold">
              {carga.fecha_hora_salida
                ? dayjs(carga.fecha_hora_salida).format("DD/MM/YYYY HH:mm")
                : "—"}
            </span>
          </Text>
          <Text size="xs" c="gray">
            Estimado:{" "}
            <span className="text-zinc-200 font-semibold">
              {formatNumber(carga.cantidad_toneladas)} TN
            </span>
          </Text>
          <Text size="xs" c="gray">
            Destino:{" "}
            <span className="text-zinc-200 font-semibold">
              {venta.cliente_destino ?? "—"}
            </span>
          </Text>
          <Text size="xs" c="gray">
            Almacen llegada:{" "}
            <span className="text-zinc-200 font-semibold">
              {venta.almacen_cliente_llegada ?? "—"}
            </span>
          </Text>
          <Text size="xs" c="gray">
            Venta:{" "}
            <span className="text-zinc-200 font-semibold">
              {venta.correlativo}
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
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          <Select
            label="Tipo de carbon confirmado"
            placeholder={
              loadingTipos ? "Cargando..." : "Seleccione el tipo confirmado"
            }
            data={tipos.map((t) => ({
              value: String(t.id_tipo_carbon),
              label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
            }))}
            value={idTipoConfirmado}
            onChange={setIdTipoConfirmado}
            rightSection={
              loadingTipos ? <Loader size={14} color="indigo" /> : undefined
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            nothingFoundMessage="Sin tipos de carbon"
            comboboxProps={{ withinPortal: true }}
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
            label="Cantidad / peso confirmado (TN)"
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

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm" mt="sm">
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
          <TextInput
            label="Codigo de ticket de balanza"
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
          <TextInput
            label="Codigo de reporte"
            placeholder="Ej. REP-0001"
            value={codigoReporte}
            onChange={(e) =>
              setCodigoReporte(e.currentTarget.value.toUpperCase())
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />
          <TextInput
            label="Codigo de la venta (lo entrega el cliente)"
            placeholder="Ej. F001-000123"
            value={codigoVenta}
            onChange={(e) => setCodigoVenta(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm" mt="sm">
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

        <Textarea
          label="Observacion"
          placeholder="Notas del ingreso en destino..."
          value={observacion}
          onChange={(e) => setObservacion(e.currentTarget.value)}
          mt="sm"
          autosize
          minRows={2}
          maxRows={4}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          disabled={saving}
        />
      </Paper>

      {/* Valuacion */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
          Valuacion de la carga
        </Text>
        <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
          <NumberInput
            label="Precio base (S/ x TN)"
            placeholder="0.00"
            value={precioBase}
            onChange={(val) => setPrecioBase(Number(val) || 0)}
            fixedDecimalScale
            classNames={inputClasses}
            size="xs"
            radius="lg"
            hideControls
            disabled={saving}
          />
          <NumberInput
            label="Descuento (S/)"
            placeholder="0.00"
            value={descuento}
            onChange={(val) => setDescuento(Number(val) || 0)}
            fixedDecimalScale
            classNames={inputClasses}
            size="xs"
            radius="lg"
            hideControls
            disabled={saving}
          />
          <NumberInput
            label="Bono (S/)"
            placeholder="0.00"
            value={bono}
            onChange={(val) => setBono(Number(val) || 0)}
            fixedDecimalScale
            classNames={inputClasses}
            size="xs"
            radius="lg"
            hideControls
            disabled={saving}
          />
          <div className="flex flex-col justify-center items-end">
            <Text size="xs" c="gray">
              Subtotal
            </Text>
            <Text size="lg" fw={800} c={subtotal < 0 ? "red" : "teal"}>
              S/ {formatNumber(subtotal)}
            </Text>
            <Text size="xs" c="dimmed">
              {formatNumber(cantidadConfirmada)} TN × S/{" "}
              {formatNumber(precioBase)}
              {descuento > 0 ? ` - S/ ${formatNumber(descuento)}` : ""}
              {bono > 0 ? ` + S/ ${formatNumber(bono)}` : ""}
            </Text>
          </div>
        </SimpleGrid>

        <Divider my="sm" variant="dashed" color="zinc.800" />

        <MultiFilePicker
          label="Evidencias de la llegada"
          files={archivos}
          onFilesChange={setArchivos}
        />
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
    </Stack>
  );
};
