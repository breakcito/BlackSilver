import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconCash } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { AuxService } from "../../../../service/auxiliar.service";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import {
  MedioPagoVentaCarbon,
  MEDIO_PAGO_VENTA_EXIGE_OPERACION,
} from "../../../../shared/enums/venta-carbon/medio-pago-venta-carbon";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import { inputClasses } from "../components/input-classes";
import type {
  ComprobanteVentaCarbonItem,
  VentaCarbonResumen,
} from "../../service/venta-carbon.responses";
import type { RES_CuentaEmpresa } from "../../../../service/responses/cuenta-empresa";

interface Props {
  venta: VentaCarbonResumen;
  comprobante: ComprobanteVentaCarbonItem;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Registro de un pago del cliente sobre el comprobante de una liquidacion.
 *
 * El monto no puede superar el saldo pendiente del bucket elegido (neto o
 * detraccion): el backend lo valida con la fila bloqueada.
 */
export const ModalPago = ({
  venta,
  comprobante,
  onClose,
  onSaved,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [cuentas, setCuentas] = useState<RES_CuentaEmpresa[]>([]);
  const [medioPago, setMedioPago] = useState<string>(
    MedioPagoVentaCarbon.Transferencia,
  );
  const [idCuenta, setIdCuenta] = useState<string | null>(null);
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [fechaHoraPago, setFechaHoraPago] = useState(
    dayjs().format("YYYY-MM-DDTHH:mm"),
  );
  const [esParaDetraccion, setEsParaDetraccion] = useState(false);
  const [montoPagado, setMontoPagado] = useState<number | string>(0);
  const [observacion, setObservacion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await AuxService.get_cuentas_empresa({
          id_empresa: venta.id_empresa,
        });
        if (cancel) return;
        if (res.success && res.data) setCuentas(res.data);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [venta.id_empresa]);

  /** Saldo pendiente del bucket elegido (neto o detraccion). */
  const pendiente = useMemo(() => {
    const saldo = esParaDetraccion
      ? Number(comprobante.monto_detraccion) -
        Number(comprobante.avance_pago_detraccion)
      : Number(comprobante.monto_neto) - Number(comprobante.avance_pago_neto);
    return Math.max(0, Math.round(saldo * 100) / 100);
  }, [comprobante, esParaDetraccion]);

  // El monto se propone con el saldo pendiente: es lo que el cliente suele
  // pagar de una vez.
  useEffect(() => {
    setMontoPagado(pendiente);
  }, [pendiente]);

  const exigeOperacion = MEDIO_PAGO_VENTA_EXIGE_OPERACION(medioPago);

  const cuentasVisibles = useMemo(
    () =>
      cuentas.map((c) => ({
        value: String(c.id_cuenta_bancaria),
        label: `${c.banco} · ${c.numero_cuenta}`,
      })),
    [cuentas],
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
        `El monto supera el saldo pendiente (S/ ${formatNumber(pendiente)})`,
      );
      return;
    }

    setSaving(true);
    try {
      const res = await VentaCarbonService.registrarPago(
        venta.id_venta_carbon,
        comprobante.id_comprobante_venta_carbon,
        {
          id_cuenta_bancaria_empresa: idCuenta ? Number(idCuenta) : null,
          medio_pago: medioPago,
          numero_operacion: numeroOperacion.trim() || null,
          fecha_hora_pago: fechaHoraPago,
          es_para_detraccion: esParaDetraccion,
          monto_pagado: montoNum,
          observacion: observacion.trim() || null,
          evidencias: archivos.length > 0 ? archivos : undefined,
        },
      );

      if (res.success) {
        notifySuccess("Pago registrado correctamente");
        onSaved();
      } else {
        const msg = res.message || "Error al registrar el pago";
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

      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
          Datos del pago
        </Text>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          <Select
            label="Medio de pago"
            data={[
              { value: MedioPagoVentaCarbon.Transferencia, label: "Transferencia" },
              { value: MedioPagoVentaCarbon.Deposito, label: "Depósito" },
              { value: MedioPagoVentaCarbon.Efectivo, label: "Efectivo" },
            ]}
            value={medioPago}
            onChange={(val) => setMedioPago(val ?? MedioPagoVentaCarbon.Transferencia)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <Select
            label="Cuenta bancaria de la empresa (ingreso del dinero)"
            placeholder={
              exigeOperacion ? "Seleccione la cuenta" : "Opcional en efectivo"
            }
            data={cuentasVisibles}
            value={idCuenta}
            onChange={setIdCuenta}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            clearable
            nothingFoundMessage="Sin cuentas registradas"
            comboboxProps={{ withinPortal: true }}
            disabled={saving || !exigeOperacion}
          />

          <TextInput
            label="Numero de operacion"
            placeholder={exigeOperacion ? "Ej. OP-000123" : "Opcional en efectivo"}
            value={numeroOperacion}
            onChange={(e) => setNumeroOperacion(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <TextInput
            label="Fecha y hora del pago"
            type="datetime-local"
            value={fechaHoraPago}
            onChange={(e) => setFechaHoraPago(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />
        </SimpleGrid>

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
          mt="sm"
          disabled={saving}
        />
      </Paper>

      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
          Monto del pago
        </Text>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          <NumberInput
            label="Monto pagado (S/)"
            value={montoPagado}
            onChange={setMontoPagado}
            fixedDecimalScale
            min={0}
            hideControls
            leftSection={<IconCash size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />
          <Text size="xs" c="gray">
            Saldo pendiente
            <Text size="sm" fw={700} c="orange.3">
              S/ {formatNumber(pendiente)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Comprobante
            <Text size="sm" fw={700} c="zinc.200">
              {comprobante.codigo_comprobante}
            </Text>
          </Text>
        </SimpleGrid>

        {montoNum - pendiente > 0.01 && (
          <Text size="xs" c="red.4" fw={600} mt="xs">
            El monto supera el saldo pendiente
          </Text>
        )}

        <Textarea
          label="Observacion"
          placeholder="Notas del pago..."
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

        <MultiFilePicker
          label="Evidencias del pago"
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
          leftSection={<IconCash size={16} />}
        >
          Registrar pago
        </Button>
      </Group>
    </Stack>
  );
};
