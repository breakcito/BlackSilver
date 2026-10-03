import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconDeviceFloppy, IconTruckDelivery } from "@tabler/icons-react";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { ArchivoCard } from "../../../../presentation/utils/archivo/archivo-card";
import type { IArchivo } from "../../../../shared/interfaces/archivo";
import { DETRACCION_TRANSPORTE_DEFECTO } from "../../../../shared/enums/compra-carbon/estado-comprobante-carbon";
import { EstadoComprobanteCarbon } from "../../../../shared/enums/compra-carbon/estado-comprobante-carbon";
import { formatPEN, inputClasses, round2 } from "./input-classes";
import { PagosDelComprobante, type PagoCarbon } from "./pagos-del-comprobante";
import type {
  CargaComprobanteFlete,
  ComprobanteTransporteCarbonResponse,
} from "../../service/compra-carbon.responses";

interface Props {
  idTransportista: number;
  nombreTransportista: string;
  cargas: CargaComprobanteFlete[];
  comprobante: ComprobanteTransporteCarbonResponse | null;
  /** Pagos que respaldan este comprobante; se dibujan dentro de el. */
  pagos: PagoCarbon[];
  registrando: boolean;
  /** Abre el formulario de pago de este comprobante. */
  onPagar?: () => void;
  /** Saldo pendiente: se muestra en el boton de pago. */
  saldoPagar?: number;
  onRegistrar: (
    payload: {
      id_transportista: number;
      ids_detalle_carga: number[];
      codigo_comprobante: string;
      fecha_emision: string;
      con_detraccion: boolean;
      porcentaje_detraccion: number;
    },
    evidencias: File[],
  ) => void;
}

const aFechaISO = (d: Date | string | null): string => {
  if (!d) return "";
  const fecha = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
};

const COLOR_ESTADO = (estado: string): "emerald" | "yellow" | "gray" => {
  if (estado === EstadoComprobanteCarbon.Pagado) return "emerald";
  if (estado === EstadoComprobanteCarbon.EnProcesoPago) return "yellow";
  return "gray";
};

/**
 * Comprobante de flete de un transportista.
 *
 * Mismo formulario que el del proveedor: si ya esta registrado se muestra
 * relleno y deshabilitado en vez de otro formato. El total no se escribe: es la
 * suma del flete de las cargas de este transportista y lo calcula el backend.
 */
export const ComprobanteTransporteCard = ({
  idTransportista,
  nombreTransportista,
  cargas,
  comprobante,
  pagos,
  registrando,
  onPagar,
  saldoPagar,
  onRegistrar,
}: Props) => {
  const yaRegistrado = comprobante !== null;

  const [codigo, setCodigo] = useState("");
  const [fechaEmision, setFechaEmision] = useState<Date | string | null>(new Date());
  const [conDetraccion, setConDetraccion] = useState(false);
  const [porcentaje, setPorcentaje] = useState(DETRACCION_TRANSPORTE_DEFECTO);
  const [evidencias, setEvidencias] = useState<File[]>([]);

  useEffect(() => {
    if (!comprobante) return;
    setCodigo(comprobante.codigo_comprobante);
    setFechaEmision(comprobante.fecha_emision);
    setConDetraccion(comprobante.con_detraccion);
    setPorcentaje(comprobante.porcentaje_detraccion);
  }, [comprobante]);

  const total = useMemo(
    () => round2(cargas.reduce((acc, c) => acc + Number(c.descuento_flete), 0)),
    [cargas],
  );

  const montoDetraccion = round2((total * porcentaje) / 100);
  const bloqueado = yaRegistrado || registrando;
  const listo = Boolean(codigo.trim() && aFechaISO(fechaEmision));

  const guardadas: IArchivo[] = comprobante?.evidencias ?? [];

  return (
    <Paper
      p="sm"
      radius="lg"
      className={
        yaRegistrado
          ? "bg-emerald-500/5 border border-emerald-500/30 space-y-3"
          : "bg-zinc-900/40 border border-zinc-800 space-y-3"
      }
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap="xs" className="min-w-0">
          <IconTruckDelivery className="w-4 h-4 text-orange-400 shrink-0" />
          <div className="min-w-0">
            <Text size="xs" fw={700} c="white" className="truncate">
              {nombreTransportista}
            </Text>
            <Text size="11px" c="dimmed" className="font-mono">
              {cargas.length} carga{cargas.length === 1 ? "" : "s"} ·{" "}
              {formatPEN(total)}
            </Text>
          </div>
        </Group>
        {yaRegistrado && (
          <Badge
            color={COLOR_ESTADO(comprobante.estado)}
            variant="light"
            size="xs"
          >
            {comprobante.estado}
          </Badge>
        )}
      </Group>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <TextInput
          label="Código"
          placeholder="F001-00123"
          value={codigo}
          onChange={(e) => setCodigo(e.currentTarget.value.toUpperCase())}
          size="xs"
          radius="lg"
          classNames={inputClasses}
          maxLength={64}
          readOnly={yaRegistrado}
          disabled={bloqueado}
        />

        <DatePickerInput
          label="Fecha de emisión"
          value={fechaEmision}
          onChange={setFechaEmision}
          valueFormat="DD/MM/YYYY"
          size="xs"
          radius="lg"
          classNames={inputClasses}
          maxDate={new Date()}
          readOnly={yaRegistrado}
          disabled={bloqueado}
        />

        <Group gap="xs" wrap="nowrap" pb={4}>
          <Switch
            checked={conDetraccion}
            onChange={(e) => {
              const activo = e.currentTarget.checked;
              setConDetraccion(activo);
              setPorcentaje(activo ? DETRACCION_TRANSPORTE_DEFECTO : 0);
            }}
            label={
              <Text
                size="xs"
                fw={600}
                c={conDetraccion ? "yellow.3" : "dimmed"}
              >
                Detracción
              </Text>
            }
            color="yellow"
            size="xs"
            disabled={bloqueado}
            styles={{ label: { cursor: bloqueado ? "default" : "pointer" } }}
          />

          {conDetraccion && (
            <NumberInput
              value={porcentaje}
              onChange={(val) => {
                const n = Number(val);
                if (Number.isFinite(n))
                  setPorcentaje(Math.min(30, Math.max(0, n)));
              }}
              min={0}
              max={30}
              decimalScale={2}
              fixedDecimalScale
              size="xs"
              radius="lg"
              classNames={{
                ...inputClasses,
                input: `${inputClasses.input} pl-1.5 pr-4 text-right font-mono`,
              }}
              suffix=" %"
              w={86}
              disabled={bloqueado}
            />
          )}
        </Group>
      </div>

      {conDetraccion && (
        <Text size="xs" c="orange" className="font-mono">
          −{formatPEN(montoDetraccion)} de detracción ·{" "}
          <span className="text-emerald-400 font-bold">
            neto a pagar {formatPEN(round2(total - montoDetraccion))}
          </span>
        </Text>
      )}

      {yaRegistrado ? (
        guardadas.length > 0 && (
          <div>
            <Text size="xs" c="dimmed" fw={600} mb={4}>
              Evidencias
            </Text>
            <Stack gap={4}>
              {guardadas.map((ev) => (
                <ArchivoCard key={ev.path_relativo} archivo={ev} />
              ))}
            </Stack>
          </div>
        )
      ) : (
        <MultiFilePicker
          files={evidencias}
          onFilesChange={setEvidencias}
          label="Evidencias (opcional)"
          maxFiles={5}
        />
      )}

      {!yaRegistrado ? (
        <Group justify="flex-end">
          <Button
            variant="filled"
            color="orange"
            size="xs"
            radius="lg"
            leftSection={<IconDeviceFloppy className="w-4 h-4" />}
            loading={registrando}
            disabled={!listo}
            onClick={() =>
              onRegistrar(
                {
                  id_transportista: idTransportista,
                  ids_detalle_carga: cargas.map(
                    (c) => c.id_detalle_compra_carbon,
                  ),
                  codigo_comprobante: codigo.trim(),
                  fecha_emision: aFechaISO(fechaEmision),
                  con_detraccion: conDetraccion,
                  porcentaje_detraccion: conDetraccion ? porcentaje : 0,
                },
                evidencias,
              )
            }
          >
            Registrar comprobante
          </Button>
        </Group>
      ) : (
        <Group justify="flex-end">
          <Button
            variant="subtle"
            color={
              saldoPagar !== undefined && saldoPagar <= 0.01
                ? "emerald"
                : "orange"
            }
            size="compact-xs"
            radius="lg"
            onClick={onPagar}
            disabled={
              !onPagar || saldoPagar === undefined || saldoPagar <= 0.01
            }
          >
            {saldoPagar !== undefined && saldoPagar <= 0.01
              ? "Saldado"
              : `Registrar pago · ${formatPEN(saldoPagar ?? 0)}`}
          </Button>
        </Group>
      )}

      {yaRegistrado && (
        <PagosDelComprobante
          pagos={pagos}
          vacio="Sin pagos a este transportista."
        />
      )}
    </Paper>
  );
};
