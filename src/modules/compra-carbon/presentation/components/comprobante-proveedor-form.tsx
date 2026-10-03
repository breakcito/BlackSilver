import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Group,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { ArchivoCard } from "../../../../presentation/utils/archivo/archivo-card";
import type { IArchivo } from "../../../../shared/interfaces/archivo";
import { DETRACCION_PROVEEDOR_DEFECTO } from "../../../../shared/enums/compra-carbon/estado-comprobante-carbon";
import { formatPEN, inputClasses, round2 } from "./input-classes";
import { PagosDelComprobante, type PagoCarbon } from "./pagos-del-comprobante";
import type { ComprobanteCompraCarbonResponse } from "../../service/compra-carbon.responses";

interface Props {
  /** Total que el backend toma del `total_con_descuento` de la compra. */
  total: number | string;
  /** Cuando existe, el form se muestra relleno y deshabilitado. */
  comprobante: ComprobanteCompraCarbonResponse | null;
  /** Pagos que respaldan este comprobante; se dibujan dentro de el. */
  pagos: PagoCarbon[];
  registrando: boolean;
  /** Abre el formulario de pago de este comprobante. */
  onPagar?: () => void;
  /** Saldo pendiente: se muestra en el boton de pago. */
  saldoPagar?: number;
  onRegistrar: (
    payload: {
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

/**
 * Datos del comprobante que entrega el proveedor.
 *
 * Cuando el comprobante ya esta registrado el mismo form se muestra relleno y
 * deshabilitado: el usuario ve exactamente los mismos campos que lleno al
 * registrar, sin convertirlos en otro formato que obligue a leer de nuevo.
 * El backend no acepta modificar un comprobante, asi que no hay edicion.
 */
export const ComprobanteProveedorForm = ({
  total,
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
  const [porcentaje, setPorcentaje] = useState(DETRACCION_PROVEEDOR_DEFECTO);
  const [evidencias, setEvidencias] = useState<File[]>([]);

  // Al llegar el comprobante se refleja en los mismos campos del form.
  useEffect(() => {
    if (!comprobante) return;
    setCodigo(comprobante.codigo_comprobante);
    setFechaEmision(comprobante.fecha_emision);
    setConDetraccion(comprobante.con_detraccion);
    setPorcentaje(comprobante.porcentaje_detraccion);
  }, [comprobante]);

  const bloqueado = yaRegistrado || registrando;
  const t = round2(total);
  const montoDetraccion = round2((t * porcentaje) / 100);

  const listo = useMemo(
    () => Boolean(codigo.trim() && aFechaISO(fechaEmision)),
    [codigo, fechaEmision],
  );

  /** Archivos ya persistidos (solo lectura) frente a los adjuntos pendientes. */
  const guardadas: IArchivo[] = comprobante?.evidencias ?? [];

  return (
    <Stack gap={10}>
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
              setPorcentaje(activo ? DETRACCION_PROVEEDOR_DEFECTO : 0);
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
            neto a pagar {formatPEN(round2(t - montoDetraccion))}
          </span>
        </Text>
      )}

      {yaRegistrado ? (
        guardadas.length > 0 ? (
          <div>
            <Text size="9px" tt="uppercase" fw={700} c="dimmed" className="tracking-wider mb-1">
              Evidencias · {guardadas.length}
            </Text>
            <Stack gap={4}>
              {guardadas.map((ev) => (
                <ArchivoCard key={ev.path_relativo} archivo={ev} />
              ))}
            </Stack>
          </div>
        ) : null
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
            color="indigo"
            size="xs"
            radius="lg"
            leftSection={<IconDeviceFloppy className="w-4 h-4" />}
            loading={registrando}
            disabled={!listo}
            onClick={() =>
              onRegistrar(
                {
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
            color={saldoPagar !== undefined && saldoPagar <= 0.01 ? "emerald" : "indigo"}
            size="compact-xs"
            radius="lg"
            onClick={onPagar}
            disabled={!onPagar || saldoPagar === undefined || saldoPagar <= 0.01}
          >
            {saldoPagar !== undefined && saldoPagar <= 0.01
              ? "Saldado"
              : `Registrar pago · ${formatPEN(saldoPagar ?? 0)}`}
          </Button>
        </Group>
      )}

      {yaRegistrado && (
        <PagosDelComprobante pagos={pagos} vacio="Sin pagos al proveedor." />
      )}
    </Stack>
  );
};
