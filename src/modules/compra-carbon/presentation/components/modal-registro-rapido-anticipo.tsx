import { useState, useEffect } from "react";
import {
  Button,
  FileInput,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCoins, IconUpload } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { AuxService } from "../../../../service/auxiliar.service";
import { ProveedoresService } from "../../../proveedores/service/proveedores.service";
import { MedioPago } from "../../../../shared/enums/anticipo-proveedor/medio-pago";
import type {
  AnticipoProveedorResponse,
  CuentaBancariaResponse,
} from "../../../proveedores/service/proveedores.responses";
import { inputClasses } from "./input-classes";

interface Props {
  opened: boolean;
  onClose: () => void;
  idProveedor: number;
  idEmpresa?: number;
  nombreProveedor?: string;
  onSuccess: (nuevoAnticipo: AnticipoProveedorResponse) => void;
}

const DEFAULT_EMPRESA_ID = 1;

export const ModalRegistroRapidoAnticipo = ({
  opened,
  onClose,
  idProveedor,
  idEmpresa = DEFAULT_EMPRESA_ID,
  nombreProveedor,
  onSuccess,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [monto, setMonto] = useState<number | string>("");
  const [medioPago, setMedioPago] = useState<MedioPago>(MedioPago.Transferencia);
  const [idCuentaEmpresa, setIdCuentaEmpresa] = useState<string | null>(null);
  const [idCuentaProveedor, setIdCuentaProveedor] = useState<string | null>(null);
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [fechaHoraPago, setFechaHoraPago] = useState(
    dayjs().format("YYYY-MM-DDTHH:mm"),
  );
  const [codigoComprobante, setCodigoComprobante] = useState("");
  const [observacion, setObservacion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Listas de cuentas
  const [cuentasEmpresa, setCuentasEmpresa] = useState<
    { id: number; label: string }[]
  >([]);
  const [cuentasProveedor, setCuentasProveedor] = useState<
    { id: number; label: string }[]
  >([]);

  useEffect(() => {
    if (opened) {
      setMonto("");
      setMedioPago(MedioPago.Transferencia);
      setNumeroOperacion("");
      setFechaHoraPago(dayjs().format("YYYY-MM-DDTHH:mm"));
      setCodigoComprobante("");
      setObservacion("");
      setArchivos([]);

      // Cargar cuentas
      AuxService.get_cuentas_empresa({ id_empresa: idEmpresa })
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            const lista = res.data.map((c) => ({
              id: c.id_cuenta_bancaria,
              label: `${c.banco} (${c.numero_cuenta}) - ${c.moneda}`,
            }));
            setCuentasEmpresa(lista);
            if (lista.length > 0) setIdCuentaEmpresa(String(lista[0].id));
          }
        })
        .catch(console.error);

      ProveedoresService.getCuentasBancarias(idProveedor)
        .then((res) => {
          if (Array.isArray(res)) {
            const noDetraccion = res.filter((c) => !c.es_para_detraccion);
            const lista = noDetraccion.map((c: CuentaBancariaResponse) => ({
              id: c.id_cuenta_bancaria,
              label: `${c.banco} (${c.numero_cuenta})`,
            }));
            setCuentasProveedor(lista);
            if (lista.length > 0) setIdCuentaProveedor(String(lista[0].id));
          }
        })
        .catch(console.error);
    }
  }, [opened, idEmpresa, idProveedor]);

  const requiereBanco =
    medioPago === MedioPago.Transferencia || medioPago === MedioPago.Deposito;

  const handleGuardar = async () => {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      notifyError("Ingrese un monto válido para el anticipo");
      return;
    }
    if (requiereBanco && !idCuentaEmpresa) {
      notifyError("Seleccione la cuenta de la empresa de origen");
      return;
    }
    if (requiereBanco && !idCuentaProveedor) {
      notifyError("Seleccione la cuenta bancaria de destino del proveedor");
      return;
    }
    if (requiereBanco && !numeroOperacion.trim()) {
      notifyError("Ingrese el número de operación bancaria");
      return;
    }
    if (!fechaHoraPago) {
      notifyError("Ingrese la fecha y hora del pago");
      return;
    }

    const fechaFormateada =
      fechaHoraPago.replace("T", " ") +
      (fechaHoraPago.length === 16 ? ":00" : "");

    setGuardando(true);
    try {
      const resp = await ProveedoresService.registrarAnticipoPorProveedor(
        idProveedor,
        {
          id_empresa: idEmpresa,
          id_cuenta_bancaria_empresa: idCuentaEmpresa
            ? Number(idCuentaEmpresa)
            : null,
          id_cuenta_bancaria_proveedor: idCuentaProveedor
            ? Number(idCuentaProveedor)
            : null,
          medio_pago: medioPago,
          fecha_hora_pago: fechaFormateada,
          numero_operacion: numeroOperacion.trim() || null,
          codigo_comprobante: codigoComprobante.trim() || null,
          observacion: observacion.trim() || null,
          pago_a_terceros: false,
          saldo: montoNum,
          evidencias: archivos.length > 0 ? archivos : null,
        },
      );

      if (resp && resp.success && resp.data) {
        notifySuccess("Anticipo registrado y disponible para amortizar");
        onSuccess(resp.data);
        onClose();
      } else {
        notifyError(resp?.message || "No se pudo registrar el anticipo");
      }
    } catch (e: unknown) {
      notifyError(
        e instanceof Error ? e.message : "Error inesperado al guardar anticipo",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title="Registrar Anticipo"
      size="lg"
      validateClose
      rightSection={
        <Text size="sm" fw={700} c="white">
          {nombreProveedor}
        </Text>
      }
    >
      <Stack gap="md">
        {/* Monto y Medio de Pago */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <NumberInput
            label="Monto del Anticipo (S/)"
            placeholder="0.00"
            value={monto}
            onChange={setMonto}
            fixedDecimalScale
            classNames={inputClasses}
            size="xs"
            radius="lg"
            required
          />

          <Select
            label="Medio de pago"
            data={[
              { value: MedioPago.Transferencia, label: "Transferencia" },
              { value: MedioPago.Deposito, label: "Depósito" },
              { value: MedioPago.Efectivo, label: "Efectivo" },
            ]}
            value={medioPago}
            onChange={(val) =>
              setMedioPago((val as MedioPago) || MedioPago.Transferencia)
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            required
          />
        </SimpleGrid>

        {/* Cuentas Bancarias */}
        {requiereBanco && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Select
              label="Cuenta de la empresa (origen)"
              placeholder="Seleccione cuenta"
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

            <Select
              label="Cuenta del proveedor (destino)"
              placeholder="Seleccione cuenta"
              data={cuentasProveedor.map((c) => ({
                value: String(c.id),
                label: c.label,
              }))}
              value={idCuentaProveedor}
              onChange={setIdCuentaProveedor}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              searchable
              required
            />
          </SimpleGrid>
        )}

        {/* Fecha, N° Operación y Recibo */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Fecha y hora del pago"
            type="datetime-local"
            value={fechaHoraPago}
            onChange={(e) => setFechaHoraPago(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            required
          />

          {requiereBanco ? (
            <TextInput
              label="N° Operación bancaria"
              placeholder="Ej. 12345678"
              value={numeroOperacion}
              onChange={(e) => setNumeroOperacion(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
          ) : (
            <TextInput
              label="N° Recibo / Vale (opcional)"
              placeholder="Ej. REC-001"
              value={codigoComprobante}
              onChange={(e) => setCodigoComprobante(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
            />
          )}
        </SimpleGrid>

        {requiereBanco && (
          <TextInput
            label="N° Comprobante / Recibo de referencia (opcional)"
            placeholder="Ej. FAC-001 o REC-001"
            value={codigoComprobante}
            onChange={(e) => setCodigoComprobante(e.currentTarget.value.toUpperCase())}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />
        )}

        {/* Voucher / Evidencias */}
        <FileInput
          label="Voucher / Evidencia del anticipo (opcional)"
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
          placeholder="Motivo o glosa del anticipo..."
          value={observacion}
          onChange={(e) => setObservacion(e.currentTarget.value)}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />

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
            color="yellow"
            size="xs"
            radius="lg"
            loading={guardando}
            leftSection={<IconCoins size={14} />}
            onClick={handleGuardar}
          >
            Guardar Anticipo
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
