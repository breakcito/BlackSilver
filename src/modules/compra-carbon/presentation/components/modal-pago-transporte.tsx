import { useState, useEffect } from "react";
import {
  Badge,
  Button,
  FileInput,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCreditCard, IconUpload } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { AuxService } from "../../../../service/auxiliar.service";
import { CompraCarbonService } from "../../service/compra-carbon.service";
import type {
  ComprobanteTransporteItem,
  RespuestaRegistrarPagoTransporte,
} from "../../service/compra-carbon.responses";
import { inputClasses } from "./input-classes";

interface Props {
  opened: boolean;
  onClose: () => void;
  idCompraCarbon: number;
  idEmpresa: number;
  comprobante: ComprobanteTransporteItem;
  onSuccess: (data: RespuestaRegistrarPagoTransporte) => void;
}

export const ModalPagoTransporte = ({
  opened,
  onClose,
  idCompraCarbon,
  idEmpresa,
  comprobante,
  onSuccess,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [idCuentaEmpresa, setIdCuentaEmpresa] = useState<string | null>(null);
  const [idCuentaTransportista, setIdCuentaTransportista] = useState<
    string | null
  >(null);
  const [medioPago, setMedioPago] = useState<string>("Transferencia");
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [fechaHoraPago, setFechaHoraPago] = useState(
    dayjs().format("YYYY-MM-DDTHH:mm"),
  );
  const [esParaDetraccion, setEsParaDetraccion] = useState(false);
  const [montoPagado, setMontoPagado] = useState<number | string>("");
  const [observacion, setObservacion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Cuentas bancarias
  const [cuentasEmpresa, setCuentasEmpresa] = useState<
    { id: number; label: string; moneda?: string }[]
  >([]);
  const [cuentasTransportista, setCuentasTransportista] = useState<
    { id: number; label: string; es_detraccion?: boolean }[]
  >([]);

  // Cargar cuentas
  const cargarCuentas = async () => {
    try {
      // Cuentas empresa
      const empRes = await AuxService.get_cuentas_empresa({
        id_empresa: idEmpresa,
      });
      if (empRes?.success && Array.isArray(empRes.data)) {
        const ctas = empRes.data.map((c) => ({
          id: c.id_cuenta_bancaria,
          label: `${c.banco} (${c.numero_cuenta}) - ${c.moneda}`,
          moneda: c.moneda,
        }));
        setCuentasEmpresa(ctas);
        if (ctas.length > 0 && !idCuentaEmpresa) {
          setIdCuentaEmpresa(String(ctas[0].id));
        }
      }

      // Cuentas transportista
      const idTrans = comprobante.id_transportista;
      if (idTrans) {
        const transRes = await AuxService.get_cuentas_transportista({
          id_transportista: idTrans,
        });
        if (transRes?.success && Array.isArray(transRes.data)) {
          setCuentasTransportista(
            transRes.data.map((c) => ({
              id: c.id_cuenta_bancaria,
              label: `${c.banco} (${c.numero_cuenta})${c.es_para_detraccion ? " [CUENTA DETRACCIÓN BN]" : ""}`,
              es_detraccion: Boolean(c.es_para_detraccion),
            })),
          );
        }
      }
    } catch (e) {
      console.error("Error al cargar cuentas de transporte:", e);
    }
  };

  useEffect(() => {
    if (opened) {
      cargarCuentas();
      setMedioPago("Transferencia");
      setNumeroOperacion("");
      setFechaHoraPago(dayjs().format("YYYY-MM-DDTHH:mm"));
      setObservacion("");
      setArchivos([]);
      setEsParaDetraccion(false);

      const pendienteNeto = Math.max(
        0,
        Number(comprobante.total_neto) - Number(comprobante.avance_pago_neto),
      );
      const pendienteDet = Math.max(
        0,
        Number(comprobante.monto_detraccion) -
          Number(comprobante.avance_pago_detraccion),
      );
      const saldoSugerido = pendienteNeto > 0 ? pendienteNeto : pendienteDet;
      setMontoPagado(saldoSugerido > 0 ? saldoSugerido : "");
    }
  }, [opened, comprobante, idEmpresa]);

  useEffect(() => {
    if (esParaDetraccion) {
      const pendienteDet = Math.max(
        0,
        Number(comprobante.monto_detraccion) -
          Number(comprobante.avance_pago_detraccion),
      );
      setMontoPagado(pendienteDet > 0 ? pendienteDet : "");
    } else {
      const pendienteNeto = Math.max(
        0,
        Number(comprobante.total_neto) - Number(comprobante.avance_pago_neto),
      );
      setMontoPagado(pendienteNeto > 0 ? pendienteNeto : "");
    }
    setIdCuentaTransportista(null);
  }, [esParaDetraccion, comprobante]);

  const cuentasTransFiltradas = cuentasTransportista.filter((c) =>
    esParaDetraccion ? c.es_detraccion : !c.es_detraccion,
  );

  const handleGuardar = async () => {
    if (!idCuentaEmpresa) {
      notifyError("Seleccione la cuenta bancaria de origen de la empresa");
      return;
    }
    if (medioPago !== "Efectivo" && !idCuentaTransportista) {
      notifyError(
        "Para transferencias o depósitos debe seleccionar la cuenta del transportista",
      );
      return;
    }
    if (medioPago !== "Efectivo" && !numeroOperacion.trim()) {
      notifyError("Ingrese el número de operación bancaria");
      return;
    }
    const montoNum = Number(montoPagado);
    if (!montoNum || montoNum <= 0) {
      notifyError("Ingrese un monto a pagar válido mayor a 0");
      return;
    }
    if (!fechaHoraPago) {
      notifyError("Ingrese la fecha y hora de la transacción");
      return;
    }

    setGuardando(true);
    try {
      const res = await CompraCarbonService.registrarPagoTransporte(
        idCompraCarbon,
        {
          id_comprobante_transporte_carbon:
            comprobante.id_comprobante_transporte_carbon,
          id_cuenta_bancaria_empresa: Number(idCuentaEmpresa),
          id_cuenta_bancaria_transportista: idCuentaTransportista
            ? Number(idCuentaTransportista)
            : undefined,
          medio_pago: medioPago,
          numero_operacion: numeroOperacion.trim() || undefined,
          fecha_hora_pago:
            fechaHoraPago.replace("T", " ") +
            (fechaHoraPago.length === 16 ? ":00" : ""),
          es_para_detraccion: esParaDetraccion,
          monto_pagado: montoNum,
          observacion: observacion.trim() || undefined,
          evidencias: archivos.length > 0 ? archivos : undefined,
        },
      );

      if (res && res.success) {
        notifySuccess("Pago de flete registrado exitosamente");
        onSuccess(res.data);
        onClose();
      } else {
        notifyError(res?.message || "Error al registrar el pago de transporte");
      }
    } catch (err: unknown) {
      notifyError(
        err instanceof Error
          ? err.message
          : "Error inesperado al guardar el pago de transporte",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title={`Registrar Pago: ${comprobante.codigo_comprobante}`}
      size="lg"
      validateClose
      rightSection={
        comprobante.con_detraccion && (
          <Group justify="space-between" p="sm">
            <div>
              <Text size="xs" fw={600} c="white">
                Pagar detracción
              </Text>
              <Text size="xs" c="gray">
                Pendiente: S/{" "}
                {formatNumber(
                  Math.max(
                    0,
                    Number(comprobante.monto_detraccion) -
                      Number(comprobante.avance_pago_detraccion),
                  ),
                )}
              </Text>
            </div>
            <Switch
              checked={esParaDetraccion}
              onChange={(e) => setEsParaDetraccion(e.currentTarget.checked)}
              color="orange"
              size="sm"
            />
          </Group>
        )
      }
    >
      <Stack gap="md">
        {/* Información del Comprobante */}
        <Paper
          p="xs"
          radius="md"
          className="bg-zinc-900/60 border border-zinc-800"
        >
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed">
                Transportista
              </Text>
              <Text size="sm" fw={700} c="white">
                {comprobante.transportista_razon_social}
              </Text>
            </div>
            <Group gap="xs">
              <Badge color="indigo" variant="light" size="sm">
                Factura {comprobante.codigo_comprobante}
              </Badge>
              {comprobante.con_detraccion && (
                <Badge color="orange" variant="light" size="sm">
                  Detracción {comprobante.porcentaje_detraccion}%
                </Badge>
              )}
            </Group>
          </Group>
        </Paper>

        {/* Cuenta de Origen Empresa */}
        <Select
          label="Cuenta bancaria de la empresa"
          placeholder="Seleccione cuenta de Cupper en soles"
          data={cuentasEmpresa.map((c) => ({
            value: String(c.id),
            label: c.label,
          }))}
          value={idCuentaEmpresa}
          onChange={setIdCuentaEmpresa}
          classNames={inputClasses}
          size="xs"
          radius="lg"
          searchable
          required
        />
        {/* Medio de Pago y N° Operación */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select
            label="Medio de pago"
            data={["Transferencia", "Depósito", "Efectivo"]}
            value={medioPago}
            onChange={(val) => setMedioPago(val || "Transferencia")}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            required
          />

          <TextInput
            label="N° Operación"
            placeholder={medioPago === "Efectivo" ? "Opcional" : "Obligatorio"}
            value={numeroOperacion}
            onChange={(e) => setNumeroOperacion(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            required={medioPago !== "Efectivo"}
          />
        </SimpleGrid>

        {/* Cuenta Destino Transportista */}
        {medioPago !== "Efectivo" && (
          <Select
            label={"Cuenta bancaria del transportista "}
            placeholder={
              cuentasTransFiltradas.length > 0
                ? "Seleccione cuenta del transportista"
                : "No hay cuentas registradas para esta modalidad"
            }
            data={cuentasTransFiltradas.map((c) => ({
              value: String(c.id),
              label: c.label,
            }))}
            value={idCuentaTransportista}
            onChange={setIdCuentaTransportista}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            required
          />
        )}

        {/* Fecha y Monto */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Fecha y hora de pago"
            type="datetime-local"
            value={fechaHoraPago}
            onChange={(e) => setFechaHoraPago(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            required
          />

          <NumberInput
            label="Monto a pagar (S/)"
            placeholder="0.00"
            value={montoPagado}
            onChange={setMontoPagado}
            fixedDecimalScale
            classNames={inputClasses}
            size="xs"
            radius="lg"
            required
          />
        </SimpleGrid>

        {/* Voucher */}
        <FileInput
          label="Constancia de pago / Voucher (opcional)"
          placeholder="Adjuntar voucher"
          multiple
          value={archivos}
          onChange={setArchivos}
          leftSection={<IconUpload size={16} />}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />

        {/* Observación */}
        <TextInput
          label="Observación"
          placeholder="Detalle o referencia del pago..."
          value={observacion}
          onChange={(e) => setObservacion(e.currentTarget.value)}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />

        {/* Resumen */}
        <Paper
          p="xs"
          radius="md"
          className="bg-indigo-950/20 border border-indigo-900/40"
        >
          <Group justify="space-between">
            <Text size="xs" c="gray">
              Medio: <span className="text-white font-bold">{medioPago}</span>
            </Text>
            <Text size="sm" fw={700} c="teal">
              Monto: S/ {formatNumber(Number(montoPagado) || 0)}
            </Text>
          </Group>
        </Paper>

        {/* Botones */}
        <Group justify="flex-end" gap="xs" mt="xs">
          <Button
            variant="default"
            size="xs"
            radius="lg"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            color="indigo"
            size="xs"
            radius="lg"
            loading={guardando}
            leftSection={<IconCreditCard size={14} />}
            onClick={handleGuardar}
          >
            Registrar Pago
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
