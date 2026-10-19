import { useState, useEffect } from "react";
import {
  ActionIcon,
  Button,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCoins, IconPlus } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { AuxService } from "../../../../service/auxiliar.service";
import { ProveedoresService } from "../../../proveedores/service/proveedores.service";
import {
  CambistaService,
  type RES_Cambista,
} from "../../../../service/cambista.service";
import { MedioPago } from "../../../../shared/enums/anticipo-proveedor/medio-pago";
import { CustomDatePicker } from "../../../../presentation/utils/date-picker-input";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { ModalNuevoCambista } from "../../../proveedores/presentation/anticipos-proveedor/components/modal-nuevo-cambista";
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
  const [pagoATerceros, setPagoATerceros] = useState(false);
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [fechaHoraPago, setFechaHoraPago] = useState<Date | null>(
    () => new Date(),
  );
  const [codigoComprobante, setCodigoComprobante] = useState("");
  const [observacion, setObservacion] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Cambistas
  const [cambistas, setCambistas] = useState<RES_Cambista[]>([]);
  const [idCambista, setIdCambista] = useState<string | null>(null);
  const [loadingCambistas, setLoadingCambistas] = useState(true);
  const [modalNuevoCambistaAbierto, setModalNuevoCambistaAbierto] =
    useState(false);

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
      setFechaHoraPago(new Date());
      setCodigoComprobante("");
      setObservacion("");
      setArchivos([]);
      setIdCambista(null);
      setCambistas([]);
      setPagoATerceros(false);

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
            // Sin filtro: mostramos TODAS las cuentas del proveedor, igual
            // que el modal de Registrar Anticipo en el modulo de
            // proveedores (que recibe `cuentasProveedor` como prop sin
            // filtrar). El anticipo en si no es detraccion, asi que el
            // operador debe poder elegir cualquier cuenta destino.
            const lista = res.map((c: CuentaBancariaResponse) => ({
              id: c.id_cuenta_bancaria,
              label: `${c.banco} (${c.numero_cuenta})`,
            }));
            setCuentasProveedor(lista);
            // Al abrir el modal (cuando pagoATerceros es false),
            // preseleccionamos la primera cuenta si existe.
            if (lista.length > 0) {
              setIdCuentaProveedor(String(lista[0].id));
            }
          }
        })
        .catch(console.error);

      // Cambistas: lista chica, una sola carga al abrir el modal.
      setLoadingCambistas(true);
      CambistaService.listar()
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setCambistas(res.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingCambistas(false));
    }
  }, [opened, idEmpresa, idProveedor]);

  // Pago a terceros: si se activa el switch mientras el modal esta
  // abierto, vaciamos la cuenta destino. Al desactivarlo, no tocamos la
  // seleccion (la que el operador dejo queda).
  useEffect(() => {
    if (pagoATerceros) {
      setIdCuentaProveedor(null);
    }
  }, [pagoATerceros]);

  const requiereBanco =
    medioPago === MedioPago.Transferencia || medioPago === MedioPago.Deposito;
  const requiereCambista = medioPago === MedioPago.Efectivo;

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
    if (requiereBanco && !pagoATerceros && !idCuentaProveedor) {
      notifyError(
        "Seleccione la cuenta bancaria de destino del proveedor (o active pago a terceros)",
      );
      return;
    }
    if (requiereBanco && !numeroOperacion.trim()) {
      notifyError("Ingrese el número de operación bancaria");
      return;
    }
    if (!fechaHoraPago) {
      notifyError("Ingrese la fecha del pago");
      return;
    }

    // El `CustomDatePicker` emite `Date`, lo pasamos a `YYYY-MM-DD` que es el
    // formato que acepta el back (le agrega ` 00:00:00` al persistir).
    const fechaFormateada = dayjs(fechaHoraPago).format("YYYY-MM-DD");

    setGuardando(true);
    try {
      const resp = await ProveedoresService.registrarAnticipoPorProveedor(
        idProveedor,
        {
          id_empresa: idEmpresa,
          id_cuenta_bancaria_empresa: idCuentaEmpresa
            ? Number(idCuentaEmpresa)
            : null,
          id_cuenta_bancaria_proveedor:
            !pagoATerceros && idCuentaProveedor
              ? Number(idCuentaProveedor)
              : null,
          // En Efectivo la plata sale del bolsillo del cambista. Para
          // los demas medios va null (el back lo normaliza igual).
          id_cambista: idCambista ? Number(idCambista) : null,
          medio_pago: medioPago,
          fecha_hora_pago: fechaFormateada,
          numero_operacion: numeroOperacion.trim() || null,
          codigo_comprobante: codigoComprobante.trim() || null,
          observacion: observacion.trim() || null,
          pago_a_terceros: pagoATerceros,
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
        <Group gap="sm" align="center" wrap="nowrap">
          {nombreProveedor && (
            <Text size="sm" fw={700} c="white">
              {nombreProveedor}
            </Text>
          )}
          <Switch
            checked={pagoATerceros}
            onChange={(e) => setPagoATerceros(e.currentTarget.checked)}
            size="sm"
            color="yellow"
            radius="xl"
            label={
              <Text
                size="xs"
                fw={600}
                c={pagoATerceros ? "yellow.3" : "zinc.4"}
              >
                Pago a terceros
              </Text>
            }
          />
        </Group>
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
              placeholder="Seleccione"
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
              clearable
              withAsterisk={!pagoATerceros}
              required={!pagoATerceros}
            />
          </SimpleGrid>
        )}

        {/* Fecha, N° Operación y Recibo */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <CustomDatePicker
            label="Fecha del pago"
            value={fechaHoraPago}
            onChange={(v) => setFechaHoraPago(v)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            withAsterisk
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
          ) : requiereCambista ? (
            <Group align="flex-end" wrap="nowrap" gap="xs">
              <Select
                label="Cambista"
                placeholder={
                  loadingCambistas ? "Cargando..." : "Seleccione"
                }
                data={cambistas.map((c) => ({
                  value: String(c.id_cambista),
                  label: c.nombre,
                }))}
                value={idCambista}
                onChange={setIdCambista}
                searchable
                clearable
                disabled={loadingCambistas}
                rightSection={
                  loadingCambistas ? (
                    <Loader size="xs" color="indigo" />
                  ) : undefined
                }
                classNames={inputClasses}
                size="xs"
                radius="lg"
                withAsterisk
                required
                style={{ flexGrow: 1, minWidth: 0 }}
              />
              <ActionIcon
                onClick={() => setModalNuevoCambistaAbierto(true)}
                color="indigo"
                variant="light"
                size="lg"
                title="Anadir cambista"
                aria-label="Anadir cambista"
                className="mb-1"
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Group>
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

        {/* N° Comprobante / Recibo de referencia: opcional y se ve siempre. */}
      <TextInput
        label="N° Comprobante / Recibo de referencia (opcional)"
        placeholder="Ej. FAC-001 o REC-001"
        value={codigoComprobante}
        onChange={(e) => setCodigoComprobante(e.currentTarget.value.toUpperCase())}
        classNames={inputClasses}
        size="xs"
        radius="lg"
      />

        {/* Evidencias */}
        <MultiFilePicker
          label="Evidencias"
          description="Opcional. PDF, JPG, PNG, etc."
          files={archivos}
          onFilesChange={setArchivos}
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

      <ModalNuevoCambista
        opened={modalNuevoCambistaAbierto}
        close={() => setModalNuevoCambistaAbierto(false)}
        onCreated={(c) => {
          // Sumamos la fila creada (viene con id_cambista + nombre del
          // back) al listado del select y la dejamos auto-seleccionada.
          setCambistas((prev) => {
            const sinDup = prev.filter(
              (x) => x.id_cambista !== c.id_cambista,
            );
            return [...sinDup, c].sort((a, b) =>
              a.nombre.localeCompare(b.nombre),
            );
          });
          setIdCambista(String(c.id_cambista));
        }}
      />
    </ModalEstandar>
  );
};
