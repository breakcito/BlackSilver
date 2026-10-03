import { useEffect, useState } from "react";
import {
  Button,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { IconPaperclip, IconWallet } from "@tabler/icons-react";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { SelectCuenta, type CuentaOparable } from "./select-cuenta";
import {
  MEDIO_PAGO_EXIGE_OPERACION,
  MedioPago,
} from "../../../../shared/enums/compra-carbon/medio-pago";
import { inputClasses } from "./input-classes";

interface Props {
  destino: "proveedor" | "transportista";
  nombreTercero: string;
  /** El switch vive en el header del modal; aqui solo se refleja. */
  esParaDetraccion: boolean;
  saldoDisponible: number;
  idEmpresa: number;
  /** Entidad a la que pertenece la cuenta de destino. */
  idEntidadDestino: number;
  cuentasEmpresa: CuentaOparable[];
  /** Ya viene filtrado por soles y por el flag de detracción. */
  cuentasDestino: CuentaOparable[];
  registrando: boolean;
  onSubmit: (
    payload: {
      id_cuenta_bancaria_empresa: number;
      cuenta_destino: number;
      medio_pago: MedioPago;
      numero_operacion: string | null;
      fecha_hora_pago: string;
      es_para_detraccion: boolean;
      monto_pagado: number;
      observacion: string | null;
    },
    evidencias: File[],
  ) => void;
  onCancelar: () => void;
}

const MEDIOS_PAGO = Object.values(MedioPago).map((v) => ({
  value: v,
  label: v,
}));

const aFechaHoraMySQL = (d: Date | string | null): string => {
  if (!d) return "";
  const fecha = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(fecha.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ` +
    `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`
  );
};

/**
 * Formulario de pago al proveedor o al transportista.
 *
 * No incluye el switch de detraccion: vive en el header del modal flotante,
 * que es donde la decision se toma una sola vez y no se pierde de vista.
 */
export const RegistroPagoForm = ({
  destino,
  nombreTercero,
  esParaDetraccion,
  saldoDisponible,
  idEmpresa,
  idEntidadDestino,
  cuentasEmpresa,
  cuentasDestino,
  registrando,
  onSubmit,
  onCancelar,
}: Props) => {
  const [cuentaEmpresa, setCuentaEmpresa] = useState<string | null>(null);
  const [cuentaDestino, setCuentaDestino] = useState<string | null>(null);
  const [medioPago, setMedioPago] = useState<MedioPago>(
    MedioPago.Transferencia,
  );
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [fechaHoraPago, setFechaHoraPago] = useState<Date | string | null>(
    new Date(),
  );
  const [monto, setMonto] = useState<number | string>(saldoDisponible);
  const [observacion, setObservacion] = useState("");
  const [evidencias, setEvidencias] = useState<File[]>([]);

  useEffect(() => {
    setMonto(saldoDisponible);
  }, [saldoDisponible]);

  // Cambiar de bucket invalida la cuenta elegida: ya no pertenece a la lista.
  useEffect(() => {
    setCuentaDestino(null);
  }, [esParaDetraccion]);

  const requiereOperacion = MEDIO_PAGO_EXIGE_OPERACION(medioPago);
  const montoNum = Number(monto) || 0;

  const listo =
    Boolean(cuentaEmpresa) &&
    Boolean(cuentaDestino) &&
    aFechaHoraMySQL(fechaHoraPago) !== "" &&
    montoNum > 0 &&
    (!requiereOperacion || numeroOperacion.trim() !== "");

  return (
    <Stack gap="sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectCuenta
          label="Cuenta de la empresa"
          placeholder="De donde sale el dinero"
          cuentas={cuentasEmpresa}
          destino="empresa"
          idEntidad={idEmpresa}
          value={cuentaEmpresa}
          onChange={setCuentaEmpresa}
          disabled={registrando}
          predeterminadoDetraccion={false}
          required
        />

        <SelectCuenta
          label={
            esParaDetraccion
              ? `Cuenta de detracción de ${nombreTercero}`
              : `Cuenta de ${nombreTercero}`
          }
          placeholder={
            cuentasDestino.length === 0
              ? "Sin cuentas — usa +"
              : "A donde entra el dinero"
          }
          cuentas={cuentasDestino}
          destino={destino}
          idEntidad={idEntidadDestino}
          value={cuentaDestino}
          onChange={setCuentaDestino}
          disabled={registrando}
          predeterminadoDetraccion={esParaDetraccion}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NumberInput
          label="Monto"
          placeholder="0.00"
          value={monto}
          onChange={setMonto}
          min={0.01}
          max={saldoDisponible}
          decimalScale={2}
          fixedDecimalScale
          prefix="S/ "
          size="xs"
          radius="lg"
          classNames={inputClasses}
          disabled={registrando}
          required
        />

        <Select
          label="Medio de pago"
          data={MEDIOS_PAGO}
          value={medioPago}
          onChange={(v) =>
            setMedioPago((v as MedioPago) ?? MedioPago.Transferencia)
          }
          size="xs"
          radius="lg"
          classNames={inputClasses}
          comboboxProps={{ withinPortal: true }}
          disabled={registrando}
          required
        />

        <TextInput
          label="Número de operación"
          placeholder={requiereOperacion ? "Ej. OP-987654" : "Opcional"}
          value={numeroOperacion}
          onChange={(e) => setNumeroOperacion(e.currentTarget.value)}
          size="xs"
          radius="lg"
          classNames={inputClasses}
          required={requiereOperacion}
          disabled={registrando}
        />
      </div>
      <Grid gutter="xs">
        <Grid.Col span={{ base: 12, sm: 5, md: 4 }}>
          <DateTimePicker
            label="Fecha y hora del pago"
            value={fechaHoraPago}
            onChange={(v) => {
              if (!v) setFechaHoraPago(null);
              else if (typeof v === "string") setFechaHoraPago(new Date(v));
              else setFechaHoraPago(v);
            }}
            size="xs"
            radius="lg"
            classNames={inputClasses}
            disabled={registrando}
            required
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 7, md: 8 }}>
          <Textarea
            label="Observación"
            placeholder="Opcional"
            value={observacion}
            onChange={(e) => setObservacion(e.currentTarget.value)}
            maxLength={500}
            autosize
            minRows={2}
            size="xs"
            radius="lg"
            classNames={inputClasses}
            disabled={registrando}
          />
        </Grid.Col>
      </Grid>

      <MultiFilePicker
        files={evidencias}
        onFilesChange={setEvidencias}
        label="Evidencias (opcional)"
        maxFiles={5}
      />

      <Group justify="flex-end" gap="sm">
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          radius="lg"
          onClick={onCancelar}
          disabled={registrando}
        >
          Cancelar
        </Button>
        <Button
          variant="filled"
          color={esParaDetraccion ? "yellow" : "indigo"}
          size="xs"
          radius="lg"
          leftSection={
            esParaDetraccion ? (
              <IconWallet className="w-4 h-4" />
            ) : (
              <IconPaperclip className="w-4 h-4" />
            )
          }
          loading={registrando}
          disabled={!listo}
          onClick={() =>
            onSubmit(
              {
                id_cuenta_bancaria_empresa: Number(cuentaEmpresa),
                cuenta_destino: Number(cuentaDestino),
                medio_pago: medioPago,
                numero_operacion: numeroOperacion.trim() || null,
                fecha_hora_pago: aFechaHoraMySQL(fechaHoraPago),
                es_para_detraccion: esParaDetraccion,
                monto_pagado: montoNum,
                observacion: observacion.trim() || null,
              },
              evidencias,
            )
          }
        >
          {esParaDetraccion ? "Pagar detracción" : "Registrar pago"}
        </Button>
      </Group>
    </Stack>
  );
};
