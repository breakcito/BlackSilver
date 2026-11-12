import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconCash, IconDeviceFloppy, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { AuxService } from "../../../../service/auxiliar.service";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { Moneda } from "../../../../shared/enums/_generic/moneda";
import {
  MEDIO_PAGO_DESPACHO_EXIGE_OPERACION,
  MedioPagoDespacho,
} from "../../../../shared/enums/venta-mineral/medio-pago-despacho";
import { simboloMoneda } from "./calculos-despacho";
import type { RES_CuentaEmpresa } from "../../../../service/responses/cuenta-empresa";
import type { ComprobanteDespachoItem } from "../../service/venta-mineral.responses";
import { inputClasses } from "../components/input-classes";

interface Props {
  close: () => void;
  comprobante: ComprobanteDespachoItem;
  onGuardar: (payload: {
    medio_pago: string;
    numero_operacion: string | null;
    fecha_hora_pago: string;
    es_para_detraccion: boolean;
    monto_pagado: number;
    id_cuenta_bancaria_empresa: number | null;
    observacion: string | null;
    evidencias?: File[];
  }) => Promise<boolean>;
}

/**
 * Registro de un pago sobre un comprobante de despacho.
 *
 * El neto y la detraccion son dos cuentas distintas: cada pago se imputa a
 * una de las dos y no puede superar su saldo pendiente.
 */
export const ModalPago = ({ close, comprobante, onGuardar }: Props) => {
  const [cuentas, setCuentas] = useState<RES_CuentaEmpresa[]>([]);
  const [medioPago, setMedioPago] = useState<string>(
    MedioPagoDespacho.Transferencia,
  );
  const [idCuenta, setIdCuenta] = useState<string | null>(null);
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [fechaHoraPago, setFechaHoraPago] = useState(
    dayjs().format("YYYY-MM-DDTHH:mm"),
  );
  const [esParaDetraccion, setEsParaDetraccion] = useState(false);
  const [montoPagado, setMontoPagado] = useState<number | string>(0);
  /** Ultimo saldo con el que se calibro el monto: sirve para saber si hay
   * que volver a ajustarlo. */
  const [saldoCalibrado, setSaldoCalibrado] = useState<number | null>(null);
  const [observacion, setObservacion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await AuxService.get_cuentas_empresa({});
        if (cancel) return;
        if (res.success && res.data) setCuentas(res.data);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  /** Moneda del comprobante: solo el de flete puede estar en dolares. */
  const monedaComprobante = comprobante.moneda ?? Moneda.Soles;

  /**
   * La detraccion SIEMPRE se cobra en soles: en ese caso el saldo y el
   * monto van en soles. El neto va en la moneda del comprobante.
   */
  const monedaPago = esParaDetraccion ? Moneda.Soles : monedaComprobante;
  const simbolo = simboloMoneda(monedaPago);

  /** Saldo pendiente del bucket elegido (neto o detraccion). */
  const pendiente = useMemo(() => {
    const saldo = esParaDetraccion
      ? Number(comprobante.monto_detraccion_soles) -
        Number(comprobante.avance_detraccion)
      : Number(comprobante.neto_a_pagar) - Number(comprobante.avance_neto);

    return Math.max(0, Math.round(saldo * 100) / 100);
  }, [comprobante, esParaDetraccion]);

  // Ajuste durante el render (patron de React para estado derivado): si el
  // saldo pendiente cambio, el monto se recalibra con el nuevo saldo.
  if (saldoCalibrado !== pendiente) {
    setSaldoCalibrado(pendiente);
    setMontoPagado(pendiente);
  }

  const exigeOperacion = MEDIO_PAGO_DESPACHO_EXIGE_OPERACION(medioPago);

  // La cuenta elegida debe ser de la moneda del pago: si cambia el bucket
  // (neto o detraccion), la seleccion se limpia. El ajuste se hace durante
  // el render (no en un efecto) para no provocar renders en cascada.
  const [monedaAnterior, setMonedaAnterior] = useState(monedaPago);

  if (monedaAnterior !== monedaPago) {
    setMonedaAnterior(monedaPago);
    setIdCuenta(null);
  }

  /**
   * Solo se listan las cuentas de la moneda del pago: las del comprobante
   * para el neto y las de soles para la detraccion.
   */
  const cuentasVisibles = useMemo(
    () =>
      cuentas
        .filter((c) => (c.moneda ?? Moneda.Soles) === monedaPago)
        .map((c) => ({
          value: String(c.id_cuenta_bancaria),
          label: `${c.banco} · ${c.numero_cuenta} (${c.moneda ?? Moneda.Soles})`,
        })),
    [cuentas, monedaPago],
  );

  const montoNum = Number(montoPagado) || 0;

  const handleSubmit = async () => {
    setError(null);

    if (exigeOperacion && !numeroOperacion.trim()) {
      setError("El numero de operacion es obligatorio para este medio de pago");
      return;
    }
    if (exigeOperacion && !idCuenta) {
      setError("Debe indicar la cuenta bancaria donde ingreso el dinero");
      return;
    }
    if (!fechaHoraPago) {
      setError("Debe indicar la fecha y hora del pago");
      return;
    }
    if (montoNum <= 0) {
      setError("El monto pagado debe ser mayor a 0");
      return;
    }
    if (montoNum - pendiente > 0.01) {
      setError(
        `El monto supera el saldo pendiente (${simbolo} ${formatNumber(pendiente)})`,
      );
      return;
    }

    setSaving(true);
    const ok = await onGuardar({
      medio_pago: medioPago,
      numero_operacion: numeroOperacion.trim() || null,
      fecha_hora_pago: fechaHoraPago,
      es_para_detraccion: esParaDetraccion,
      monto_pagado: montoNum,
      id_cuenta_bancaria_empresa: idCuenta ? Number(idCuenta) : null,
      observacion: observacion.trim() || null,
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

      <Group grow align="flex-start">
        <Select
          label="Medio de pago"
          data={Object.values(MedioPagoDespacho)}
          value={medioPago}
          onChange={(valor) =>
            setMedioPago(valor ?? MedioPagoDespacho.Transferencia)
          }
          allowDeselect={false}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <Select
          label="Cuenta bancaria de la empresa"
          placeholder={
            exigeOperacion ? "Selecciona la cuenta" : "Opcional en efectivo"
          }
          data={cuentasVisibles}
          value={idCuenta}
          onChange={setIdCuenta}
          searchable
          nothingFoundMessage="Sin cuentas registradas"
          comboboxProps={{ withinPortal: true }}
          disabled={saving || !exigeOperacion}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
      </Group>

      <Group grow align="flex-start">
        <TextInput
          label="Numero de operacion"
          placeholder={exigeOperacion ? "Ej. OP-000123" : "Opcional en efectivo"}
          value={numeroOperacion}
          onChange={(e) =>
            setNumeroOperacion(e.currentTarget.value.toUpperCase())
          }
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
        <TextInput
          label="Fecha y hora del pago"
          type="datetime-local"
          value={fechaHoraPago}
          onChange={(e) => setFechaHoraPago(e.currentTarget.value)}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
      </Group>

      <Switch
        label="El pago es para la detraccion"
        description={
          esParaDetraccion
            ? "Se descuenta del saldo de detraccion"
            : "Se descuenta del saldo del neto a pagar"
        }
        checked={esParaDetraccion}
        onChange={(e) => setEsParaDetraccion(e.currentTarget.checked)}
        color="orange"
        size="xs"
        disabled={saving}
      />

      <Group grow align="flex-start">
        <NumberInput
          label={`Monto pagado (${simbolo})`}
          value={montoPagado}
          onChange={setMontoPagado}
          fixedDecimalScale
          hideControls
          leftSection={<IconCash size={16} />}
          disabled={saving}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          required
        />
        <div className="pt-6">
          <Text size="xs" c="gray">
            Saldo pendiente
            <Text size="sm" fw={700} c="orange.3">
              {simbolo} {formatNumber(pendiente)}
            </Text>
          </Text>
        </div>
      </Group>

      {montoNum - pendiente > 0.01 && (
        <Text size="xs" c="red.4" fw={600}>
          El monto supera el saldo pendiente
        </Text>
      )}

      <Textarea
        label="Observacion"
        placeholder="Notas del pago..."
        value={observacion}
        onChange={(e) => setObservacion(e.currentTarget.value.toUpperCase())}
        autosize
        minRows={2}
        maxRows={4}
        disabled={saving}
        classNames={inputClasses}
        size="xs"
        radius="lg"
      />

      <MultiFilePicker
        label="Evidencias del pago"
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
          Registrar pago
        </Button>
      </Group>
    </Stack>
  );
};
