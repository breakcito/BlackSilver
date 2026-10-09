import { useState, useEffect, useMemo } from "react";
import {
  Badge,
  Button,
  Checkbox,
  FileInput,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCoins,
  IconCreditCard,
  IconPlus,
  IconRefresh,
  IconUpload,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { AuxService } from "../../../../service/auxiliar.service";
import { ProveedoresService } from "../../../proveedores/service/proveedores.service";
import type {
  AnticipoProveedorResponse,
  CuentaBancariaResponse,
} from "../../../proveedores/service/proveedores.responses";
import { CompraCarbonService } from "../../service/compra-carbon.service";
import type {
  CargaCompraCarbonItem,
  ComprobanteCompraCarbonItem,
  RespuestaRegistrarPagoProveedor,
} from "../../service/compra-carbon.responses";
import { inputClasses, round2 } from "./input-classes";
import { ModalRegistroRapidoAnticipo } from "./modal-registro-rapido-anticipo";

interface Props {
  opened: boolean;
  onClose: () => void;
  idCompraCarbon: number;
  idEmpresa: number;
  idProveedor: number;
  nombreProveedor?: string;
  /** Si tiene comprobante es pago a factura con IGV; si es null es pago directo sin IGV */
  comprobante: ComprobanteCompraCarbonItem | null;
  /** Cargas sin pago directo disponible (solo si no aplica IGV) */
  cargasDisponiblesDirectas?: CargaCompraCarbonItem[];
  onSuccess: (data: RespuestaRegistrarPagoProveedor) => void;
}

export const ModalPagoProveedor = ({
  opened,
  onClose,
  idCompraCarbon,
  idEmpresa,
  idProveedor,
  nombreProveedor,
  comprobante,
  cargasDisponiblesDirectas = [],
  onSuccess,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  // Estados del Formulario de Pago
  const [idCuentaEmpresa, setIdCuentaEmpresa] = useState<string | null>(null);
  const [idCuentaProveedor, setIdCuentaProveedor] = useState<string | null>(
    null,
  );
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

  // Modo Directo (Sin IGV)
  const [cargasSeleccionadas, setCargasSeleccionadas] = useState<number[]>([]);
  const [anticiposSeleccionados, setAnticiposSeleccionados] = useState<
    Record<number, number>
  >({});

  // Cuentas Bancarias
  const [cuentasEmpresa, setCuentasEmpresa] = useState<
    { id: number; label: string; moneda?: string }[]
  >([]);
  const [cuentasProveedor, setCuentasProveedor] = useState<
    { id: number; label: string; es_detraccion?: boolean }[]
  >([]);

  // Anticipos del Proveedor (en caso de pago directo sin IGV)
  const [anticipos, setAnticipos] = useState<AnticipoProveedorResponse[]>([]);
  const [loadingAnticipos, setLoadingAnticipos] = useState(false);
  const [modalNuevoAnticipo, setModalNuevoAnticipo] = useState(false);

  // Cargar cuentas bancarias
  const cargarCuentas = async () => {
    try {
      // 1. Cuentas empresa (soles)
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

      // 2. Cuentas proveedor
      const provRes = await ProveedoresService.getCuentasBancarias(idProveedor);
      if (Array.isArray(provRes)) {
        setCuentasProveedor(
          provRes.map((c: CuentaBancariaResponse) => ({
            id: c.id_cuenta_bancaria,
            label: `${c.banco} (${c.numero_cuenta})${c.es_para_detraccion ? " [CUENTA DETRACCIÓN BN]" : ""}`,
            es_detraccion: Boolean(c.es_para_detraccion),
          })),
        );
      }
    } catch (e) {
      console.error("Error al cargar cuentas bancarias:", e);
    }
  };

  // Cargar anticipos cuando es pago directo
  const cargarAnticipos = async () => {
    if (!idProveedor || comprobante !== null) return;
    setLoadingAnticipos(true);
    try {
      const resp =
        await ProveedoresService.getAnticiposPorProveedor(idProveedor);
      if (resp && resp.success && Array.isArray(resp.data)) {
        const disponibles = resp.data.filter((a) => {
          const esAnulado =
            Number(a.esta_anulado) === 1 || a.estado === "Anulado";
          const saldo = Number(a.saldo_actual);
          return !esAnulado && saldo > 0.001;
        });
        setAnticipos(disponibles);
      } else {
        setAnticipos([]);
      }
    } catch (e) {
      console.error("Error al cargar anticipos:", e);
      setAnticipos([]);
    } finally {
      setLoadingAnticipos(false);
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

      if (comprobante) {
        // Sugerir saldo pendiente neto o de detracción
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
      } else {
        // Modo directo
        cargarAnticipos();
        const todosIds = cargasDisponiblesDirectas.map(
          (c) => c.id_carga_compra_carbon,
        );
        setCargasSeleccionadas(todosIds);
        setAnticiposSeleccionados({});
      }
    }
  }, [opened, comprobante, idEmpresa, idProveedor]);

  // Si cambia el switch de detracción en comprobante, ajustar sugerencia de monto
  useEffect(() => {
    if (comprobante) {
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
      setIdCuentaProveedor(null);
    }
  }, [esParaDetraccion, comprobante]);

  // Cálculos para Pago Directo (Sin IGV)
  const totalCargasDirectas = useMemo(() => {
    if (comprobante) return 0;
    const seleccionadas = cargasDisponiblesDirectas.filter((c) =>
      cargasSeleccionadas.includes(c.id_carga_compra_carbon),
    );
    const suma = seleccionadas.reduce(
      (acc, c) => acc + Number(c.subtotal_con_descuento || 0),
      0,
    );
    return round2(suma);
  }, [comprobante, cargasDisponiblesDirectas, cargasSeleccionadas]);

  const totalAnticiposDirectos = useMemo(() => {
    if (comprobante) return 0;
    const suma = Object.values(anticiposSeleccionados).reduce(
      (acc, val) => acc + (Number(val) || 0),
      0,
    );
    return round2(suma);
  }, [comprobante, anticiposSeleccionados]);

  const montoNetoDirectoSugerido = useMemo(() => {
    if (comprobante) return 0;
    return round2(Math.max(0, totalCargasDirectas - totalAnticiposDirectos));
  }, [comprobante, totalCargasDirectas, totalAnticiposDirectos]);

  // Actualizar automáticamente monto a pagar sugerido en pago directo
  useEffect(() => {
    if (!comprobante) {
      setMontoPagado(montoNetoDirectoSugerido);
    }
  }, [montoNetoDirectoSugerido, comprobante]);

  const handleSetMontoAnticipoDirecto = (idAnticipo: number, monto: number) => {
    const anticipo = anticipos.find((a) => a.id_anticipo === idAnticipo);
    const saldoMax = anticipo ? Number(anticipo.saldo_actual) : 0;
    const montoValido = Math.min(Math.max(0, monto), saldoMax);

    setAnticiposSeleccionados((prev) => {
      const copia = { ...prev };
      if (montoValido <= 0) {
        delete copia[idAnticipo];
      } else {
        copia[idAnticipo] = round2(montoValido);
      }
      return copia;
    });
  };

  const handleGuardar = async () => {
    if (!idCuentaEmpresa) {
      notifyError("Seleccione la cuenta bancaria de origen de la empresa");
      return;
    }
    if (medioPago !== "Efectivo" && !idCuentaProveedor) {
      notifyError(
        "Para transferencias o depósitos debe seleccionar la cuenta de destino del proveedor",
      );
      return;
    }
    if (medioPago !== "Efectivo" && !numeroOperacion.trim()) {
      notifyError("Ingrese el número de operación bancaria");
      return;
    }
    const montoNum = Number(montoPagado);
    if (
      !comprobante &&
      totalCargasDirectas > 0 &&
      montoNum <= 0 &&
      totalAnticiposDirectos <= 0
    ) {
      notifyError("Ingrese un monto a pagar válido o aplique anticipos");
      return;
    }
    if (comprobante && montoNum <= 0) {
      notifyError("Ingrese un monto a pagar válido mayor a 0");
      return;
    }
    if (!fechaHoraPago) {
      notifyError("Ingrese la fecha y hora de la transacción");
      return;
    }

    const payloadAnticipos = Object.entries(anticiposSeleccionados)
      .filter(([, monto]) => Number(monto) > 0)
      .map(([id, monto]) => ({
        id_anticipo_proveedor: Number(id),
        monto_retirado: Number(monto),
      }));

    setGuardando(true);
    try {
      const res = await CompraCarbonService.registrarPagoProveedor(
        idCompraCarbon,
        {
          id_comprobante_compra_carbon: comprobante
            ? comprobante.id_comprobante_compra_carbon
            : undefined,
          id_cuenta_bancaria_empresa: Number(idCuentaEmpresa),
          id_cuenta_bancaria_proveedor: idCuentaProveedor
            ? Number(idCuentaProveedor)
            : undefined,
          medio_pago: medioPago,
          numero_operacion: numeroOperacion.trim() || undefined,
          fecha_hora_pago:
            fechaHoraPago.replace("T", " ") +
            (fechaHoraPago.length === 16 ? ":00" : ""),
          es_para_detraccion: comprobante ? esParaDetraccion : false,
          monto_pagado: montoNum,
          observacion: observacion.trim() || undefined,
          ids_cargas:
            !comprobante && cargasSeleccionadas.length > 0
              ? cargasSeleccionadas
              : undefined,
          anticipos:
            !comprobante && payloadAnticipos.length > 0
              ? payloadAnticipos
              : undefined,
          evidencias: archivos.length > 0 ? archivos : undefined,
        },
      );

      if (res && res.success) {
        notifySuccess("Pago registrado exitosamente");
        onSuccess(res.data);
        onClose();
      } else {
        notifyError(res?.message || "Error al registrar el pago");
      }
    } catch (err: unknown) {
      notifyError(
        err instanceof Error
          ? err.message
          : "Error inesperado al guardar el pago",
      );
    } finally {
      setGuardando(false);
    }
  };

  const cuentasProveedorFiltradas = cuentasProveedor.filter((c) =>
    esParaDetraccion ? c.es_detraccion : !c.es_detraccion,
  );

  return (
    <>
      <ModalEstandar
        opened={opened}
        close={onClose}
        title={
          comprobante
            ? `Registrar Pago a Factura: ${comprobante.codigo_comprobante}`
            : "Registrar Pago Directo (Sin IGV)"
        }
        size="lg"
        validateClose
        rightSection={
          comprobante && comprobante.con_detraccion ? (
            <Checkbox
              checked={esParaDetraccion}
              onChange={(e) => setEsParaDetraccion(e.currentTarget.checked)}
              size="xs"
              color="orange"
              styles={{ root: { pointerEvents: "all" } }}
              label={
                <div className="leading-tight">
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
              }
            />
          ) : null
        }
      >
        <Stack gap="md">
          {/* Cabecera Informativa */}
          <Paper
            p="xs"
            radius="md"
            className="bg-zinc-900/60 border border-zinc-800"
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed">
                  Proveedor
                </Text>
                <Text size="sm" fw={700} c="white">
                  {nombreProveedor || "Proveedor"}
                </Text>
              </div>
              {comprobante ? (
                <Group gap="xs">
                  <Badge color="indigo" variant="light" size="sm">
                    Factura {comprobante.codigo_comprobante}
                  </Badge>
                  {comprobante.con_detraccion && (
                    <Badge color="orange" variant="light" size="sm">
                      Detracción{" "}
                      {formatNumber(comprobante.porcentaje_detraccion)}%
                    </Badge>
                  )}
                </Group>
              ) : (
                <Badge color="gray" variant="light" size="sm">
                  Modalidad Directa (Sin IGV)
                </Badge>
              )}
            </Group>
          </Paper>

          {/* Cuentas de la Empresa (Origen) */}
          <Select
            label="Cuenta bancaria de la empresa (origen)"
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

          {/* Medio de pago y N° Operación */}
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
              placeholder={
                medioPago === "Efectivo" ? "Opcional" : "Ej. 0987654"
              }
              value={numeroOperacion}
              onChange={(e) => setNumeroOperacion(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required={medioPago !== "Efectivo"}
            />
          </SimpleGrid>

          {/* Cuenta Destino del Proveedor */}
          {medioPago !== "Efectivo" && (
            <Select
              label={"Cuenta bancaria del proveedor"}
              placeholder={
                cuentasProveedorFiltradas.length > 0
                  ? "Seleccione cuenta del proveedor"
                  : "El proveedor no tiene cuentas registradas para este tipo"
              }
              data={cuentasProveedorFiltradas.map((c) => ({
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
          )}

          {/* Fecha y Monto a Pagar */}
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

          {/* Modo Sin IGV: Selección de Cargas */}
          {!comprobante && cargasDisponiblesDirectas.length > 0 && (
            <div>
              <Text size="xs" fw={700} c="white" mb={4}>
                Cargas abarcadas por este pago ({cargasSeleccionadas.length}/
                {cargasDisponiblesDirectas.length}):
              </Text>
              <Paper
                p="xs"
                radius="md"
                className="bg-zinc-950/60 border border-zinc-800 max-h-40 overflow-y-auto"
              >
                <Stack gap={6}>
                  {cargasDisponiblesDirectas.map((c) => {
                    const check = cargasSeleccionadas.includes(
                      c.id_carga_compra_carbon,
                    );
                    return (
                      <Group
                        key={c.id_carga_compra_carbon}
                        justify="space-between"
                        className="p-1 rounded hover:bg-zinc-900/40"
                      >
                        <Checkbox
                          size="xs"
                          label={`Ticket #${c.codigo_ticket_balanza} · Placa ${c.placa} (${formatNumber(c.cantidad, 2)} TN)`}
                          checked={check}
                          onChange={(e) => {
                            if (e.currentTarget.checked) {
                              setCargasSeleccionadas((p) => [
                                ...p,
                                c.id_carga_compra_carbon,
                              ]);
                            } else {
                              setCargasSeleccionadas((p) =>
                                p.filter(
                                  (id) => id !== c.id_carga_compra_carbon,
                                ),
                              );
                            }
                          }}
                        />
                        <Text size="xs" fw={700} c="white">
                          S/ {formatNumber(c.subtotal_con_descuento)}
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
              </Paper>
            </div>
          )}

          {/* Modo Sin IGV: Anticipos Disponibles para amortizar */}
          {!comprobante && (
            <div>
              <Group justify="space-between" mb={4}>
                <Group gap="xs">
                  <IconCoins size={16} className="text-yellow-400" />
                  <Text size="xs" fw={700} c="white">
                    Anticipos:
                  </Text>
                </Group>
                <Group gap="xs">
                  <Button
                    variant="light"
                    size="compact-xs"
                    color="yellow"
                    radius="md"
                    leftSection={<IconPlus size={12} />}
                    onClick={() => setModalNuevoAnticipo(true)}
                  >
                    Registrar Anticipo
                  </Button>
                  <Tooltip label="Refrescar anticipos">
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="yellow"
                      loading={loadingAnticipos}
                      onClick={cargarAnticipos}
                      leftSection={<IconRefresh size={12} />}
                    >
                      Actualizar
                    </Button>
                  </Tooltip>
                </Group>
              </Group>

              {loadingAnticipos ? (
                <Paper
                  p="xs"
                  className="bg-zinc-950/60 border border-zinc-800 text-center"
                >
                  <Group justify="center" gap="xs">
                    <Loader size="xs" color="yellow" />
                    <Text size="xs" c="dimmed">
                      Consultando anticipos...
                    </Text>
                  </Group>
                </Paper>
              ) : anticipos.length === 0 ? (
                <Paper
                  p="xs"
                  radius="md"
                  className="bg-zinc-950/40 border border-dashed border-zinc-800"
                >
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <ThemeIcon
                        color="yellow"
                        variant="light"
                        size="sm"
                        radius="xl"
                      >
                        <IconAlertCircle size={14} />
                      </ThemeIcon>
                      <Text size="xs" c="dimmed">
                        El proveedor no tiene anticipos con saldo libre para
                        descontar.
                      </Text>
                    </Group>
                  </Group>
                </Paper>
              ) : (
                <Paper
                  p="xs"
                  radius="md"
                  className="bg-zinc-950/60 border border-zinc-800 max-h-40 overflow-y-auto"
                >
                  <SimpleGrid cols={{ base: 2 }} spacing="xs">
                    {anticipos.map((a) => {
                      const saldoDisp = Number(a.saldo_actual);
                      const usado = anticiposSeleccionados[a.id_anticipo] || 0;
                      return (
                        <Group
                          key={a.id_anticipo}
                          justify="space-between"
                          align="center"
                          wrap="nowrap"
                          className="p-1.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80"
                        >
                          <div className="min-w-0">
                            <Text size="xs" fw={700} c="white" truncate>
                              {a.codigo_comprobante}
                            </Text>
                            <Text size="xs" c="gray" truncate>
                              Disponible:{" "}
                              <span className="text-emerald-400 font-bold">
                                S/ {formatNumber(saldoDisp)}
                              </span>
                            </Text>
                          </div>
                          <NumberInput
                            placeholder="Monto"
                            max={saldoDisp}
                            min={0}
                            size="xs"
                            radius="lg"
                            w={90}
                            value={usado || ""}
                            onChange={(val) =>
                              handleSetMontoAnticipoDirecto(
                                a.id_anticipo,
                                Number(val) || 0,
                              )
                            }
                          />
                        </Group>
                      );
                    })}
                  </SimpleGrid>
                </Paper>
              )}
            </div>
          )}

          {/* Voucher y Evidencias */}
          <FileInput
            label="Constancia de pago / Voucher (opcional)"
            placeholder="Adjuntar voucher o constancia bancaria"
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
            placeholder="Detalle o glosa del pago..."
            value={observacion}
            onChange={(e) => setObservacion(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          {/* Resumen del Pago */}
          <Paper
            p="xs"
            radius="md"
            className="bg-indigo-950/20 border border-indigo-900/40"
          >
            <Group justify="space-between">
              <Text size="xs" c="gray">
                Medio: <span className="text-white font-bold">{medioPago}</span>
              </Text>
              {!comprobante && totalAnticiposDirectos > 0 && (
                <Text size="xs" c="yellow.4">
                  Anticipos: -S/ {formatNumber(totalAnticiposDirectos)}
                </Text>
              )}
              <Text size="sm" fw={800} c="teal.4">
                Monto a transferir: S/ {formatNumber(Number(montoPagado) || 0)}
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

      <ModalRegistroRapidoAnticipo
        opened={modalNuevoAnticipo}
        onClose={() => setModalNuevoAnticipo(false)}
        idProveedor={idProveedor}
        idEmpresa={idEmpresa}
        nombreProveedor={nombreProveedor}
        onSuccess={(nuevo) => {
          setAnticipos((prev) => [nuevo, ...prev]);
          handleSetMontoAnticipoDirecto(
            nuevo.id_anticipo,
            Number(nuevo.saldo_actual),
          );
        }}
      />
    </>
  );
};
