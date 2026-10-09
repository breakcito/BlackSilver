import { useEffect, useState, useMemo } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Divider,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconCoin,
  IconDownload,
  IconLock,
  IconPlus,
  IconReceipt,
  IconTruck,
  IconUpload,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../hooks/useNotify";
import { AuxService } from "../../../service/auxiliar.service";
import { ProveedoresService } from "../../proveedores/service/proveedores.service";
import { CompraCarbonService } from "../service/compra-carbon.service";
import type { CompraCarbonDetalleResponse } from "../service/compra-carbon.responses";
import type { AnticipoProveedorResponse, CuentaBancariaResponse } from "../../proveedores/service/proveedores.responses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { exportarLiquidacionExcel } from "./excel/exportar-liquidacion-excel";

interface Props {
  idCompraCarbon: number;
  onClose: () => void;
  onRefresh: () => void;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  label: "text-zinc-300 mb-1 font-semibold tracking-tight",
};

export const ModalLiquidacionPagos = ({ idCompraCarbon, onClose, onRefresh }: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [detalle, setDetalle] = useState<CompraCarbonDetalleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [anticiposDisponibles, setAnticiposDisponibles] = useState<AnticipoProveedorResponse[]>([]);

  // Cuentas bancarias
  const [cuentasEmpresa, setCuentasEmpresa] = useState<{ id: number; label: string; moneda?: string }[]>([]);
  const [cuentasProveedor, setCuentasProveedor] = useState<{ id: number; label: string; es_detraccion?: boolean }[]>([]);
  const [cuentasTransportista, setCuentasTransportista] = useState<{ id: number; label: string; es_detraccion?: boolean }[]>([]);

  // Sub-modales
  const [modalComprobanteProv, setModalComprobanteProv] = useState(false);
  const [modalPagoProv, setModalPagoProv] = useState<{ idComprobante: number | null } | null>(null);
  const [modalComprobanteTrans, setModalComprobanteTrans] = useState(false);
  const [modalPagoTrans, setModalPagoTrans] = useState<{ idComprobante: number } | null>(null);
  const [openConfirmCerrar, setOpenConfirmCerrar] = useState(false);
  const [loadingCerrar, setLoadingCerrar] = useState(false);

  // Form State Comprobante Proveedor
  const [compProvCodigo, setCompProvCodigo] = useState("");
  const [compProvFecha, setCompProvFecha] = useState(dayjs().format("YYYY-MM-DD"));
  const [compProvObs, setCompProvObs] = useState("");
  const [compProvConDetraccion, setCompProvConDetraccion] = useState(true);
  const [compProvPctDetraccion, setCompProvPctDetraccion] = useState<number | string>(10);
  const [compProvCargasSeleccionadas, setCompProvCargasSeleccionadas] = useState<number[]>([]);
  const [compProvAnticiposSeleccionados, setCompProvAnticiposSeleccionados] = useState<Record<number, number>>({});
  const [compProvArchivos, setCompProvArchivos] = useState<File[]>([]);
  const [guardandoCompProv, setGuardandoCompProv] = useState(false);

  // Form State Pago Proveedor
  const [pagoProvCuentaEmpresa, setPagoProvCuentaEmpresa] = useState<string | null>(null);
  const [pagoProvCuentaProveedor, setPagoProvCuentaProveedor] = useState<string | null>(null);
  const [pagoProvMedio, setPagoProvMedio] = useState<string>("Transferencia");
  const [pagoProvOperacion, setPagoProvOperacion] = useState("");
  const [pagoProvFecha, setPagoProvFecha] = useState(dayjs().format("YYYY-MM-DDTHH:mm"));
  const [pagoProvEsDetraccion, setPagoProvEsDetraccion] = useState(false);
  const [pagoProvMonto, setPagoProvMonto] = useState<number | string>(0);
  const [pagoProvObs, setPagoProvObs] = useState("");
  const [pagoProvCargasDirectas, setPagoProvCargasDirectas] = useState<number[]>([]);
  const [pagoProvAnticiposDirectos, setPagoProvAnticiposDirectos] = useState<Record<number, number>>({});
  const [pagoProvArchivos, setPagoProvArchivos] = useState<File[]>([]);
  const [guardandoPagoProv, setGuardandoPagoProv] = useState(false);

  // Form State Comprobante Transporte
  const [compTransIdTransportista, setCompTransIdTransportista] = useState<string | null>(null);
  const [compTransCodigo, setCompTransCodigo] = useState("");
  const [compTransFecha, setCompTransFecha] = useState(dayjs().format("YYYY-MM-DD"));
  const [compTransObs, setCompTransObs] = useState("");
  const [compTransConDetraccion, setCompTransConDetraccion] = useState(true);
  const [compTransPctDetraccion, setCompTransPctDetraccion] = useState<number | string>(4);
  const [compTransCargasSeleccionadas, setCompTransCargasSeleccionadas] = useState<number[]>([]);
  const [compTransArchivos, setCompTransArchivos] = useState<File[]>([]);
  const [guardandoCompTrans, setGuardandoCompTrans] = useState(false);

  // Form State Pago Transporte
  const [pagoTransCuentaEmpresa, setPagoTransCuentaEmpresa] = useState<string | null>(null);
  const [pagoTransCuentaTrans, setPagoTransCuentaTrans] = useState<string | null>(null);
  const [pagoTransMedio, setPagoTransMedio] = useState<string>("Transferencia");
  const [pagoTransOperacion, setPagoTransOperacion] = useState("");
  const [pagoTransFecha, setPagoTransFecha] = useState(dayjs().format("YYYY-MM-DDTHH:mm"));
  const [pagoTransEsDetraccion, setPagoTransEsDetraccion] = useState(false);
  const [pagoTransMonto, setPagoTransMonto] = useState<number | string>(0);
  const [pagoTransObs, setPagoTransObs] = useState("");
  const [pagoTransArchivos, setPagoTransArchivos] = useState<File[]>([]);
  const [guardandoPagoTrans, setGuardandoPagoTrans] = useState(false);

  // Carga de la información de la compra
  const cargarDetalle = async () => {
    setLoading(true);
    try {
      const res = await CompraCarbonService.getCompraConDetalles(idCompraCarbon);
      if (res.success && res.data) {
        setDetalle(res.data);

        // Cargar cuentas empresa
        const ctasEmpRes = await AuxService.get_cuentas_empresa({ id_empresa: res.data.cabecera.id_empresa });
        if (ctasEmpRes.success && ctasEmpRes.data) {
          setCuentasEmpresa(
            ctasEmpRes.data.map((c) => ({
              id: c.id_cuenta_bancaria,
              label: `${c.banco} (${c.numero_cuenta}) - ${c.moneda}`,
              moneda: c.moneda,
            })),
          );
        }

        // Cargar anticipos y cuentas del proveedor
        const [antRes, ctasProvRes] = await Promise.all([
          ProveedoresService.getAnticiposPorProveedor(res.data.cabecera.id_proveedor),
          ProveedoresService.getCuentasBancarias(res.data.cabecera.id_proveedor),
        ]);

        if (antRes.success && antRes.data) {
          setAnticiposDisponibles(antRes.data.filter((a: AnticipoProveedorResponse) => !a.esta_anulado && Number(a.saldo_actual) > 0.01));
        }
        if (ctasProvRes && Array.isArray(ctasProvRes)) {
          setCuentasProveedor(
            ctasProvRes.map((c: CuentaBancariaResponse) => ({
              id: c.id_cuenta_bancaria,
              label: `${c.banco} (${c.numero_cuenta})${c.es_para_detraccion ? " [DETRACCIÓN]" : ""}`,
              es_detraccion: Boolean(c.es_para_detraccion),
            })),
          );
        }
      } else {
        notifyError(res.message || "No se pudo cargar el detalle de la compra");
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error al cargar detalle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDetalle();
  }, [idCompraCarbon]);

  const cabecera = detalle?.cabecera;
  const cargas = detalle?.cargas || [];
  const comprobantesProveedor = detalle?.comprobantes_proveedor || [];
  const pagosDirectos = detalle?.pagos_directos || [];
  const comprobantesTransporte = detalle?.comprobantes_transporte || [];

  // Cargas libres para comprobante proveedor
  const cargasSinComprobanteProv = useMemo(
    () => cargas.filter((c) => !c.id_comprobante_compra_carbon && c.estado !== "Anulado"),
    [cargas],
  );

  // Cargas libres para pago directo (cuando no aplica IGV)
  const cargasSinPagoDirecto = useMemo(
    () => cargas.filter((c) => !c.id_pago_compra_carbon && c.estado !== "Anulado" && c.estado !== "Pagado"),
    [cargas],
  );

  // Cargas con flete pendiente de comprobante de flete
  const cargasSinComprobanteFlete = useMemo(
    () => cargas.filter((c) => c.pagar_flete && !c.id_comprobante_transporte_carbon && c.estado !== "Anulado"),
    [cargas],
  );

  // Total de cargas seleccionadas en comprobante proveedor
  const totalCargasCompProv = useMemo(() => {
    return compProvCargasSeleccionadas.reduce((acc, id) => {
      const c = cargas.find((item) => item.id_carga_compra_carbon === id);
      return acc + (c ? Number(c.subtotal_con_descuento || 0) : 0);
    }, 0);
  }, [compProvCargasSeleccionadas, cargas]);

  // Total de anticipos aplicados en comprobante proveedor
  const totalAnticiposCompProv = useMemo(() => {
    return Object.values(compProvAnticiposSeleccionados).reduce((a, b) => a + Number(b || 0), 0);
  }, [compProvAnticiposSeleccionados]);

  // Guardar Comprobante Proveedor
  const handleGuardarComprobanteProv = async () => {
    if (!compProvCodigo.trim()) {
      notifyError("Ingrese el código del comprobante");
      return;
    }
    if (compProvCargasSeleccionadas.length === 0) {
      notifyError("Debe seleccionar al menos una carga para incluir en la factura");
      return;
    }

    setGuardandoCompProv(true);
    try {
      const listaAnticipos = Object.entries(compProvAnticiposSeleccionados)
        .filter(([_, m]) => Number(m) > 0)
        .map(([id, m]) => ({ id_anticipo_proveedor: Number(id), monto_retirado: Number(m) }));

      const res = await CompraCarbonService.registrarComprobanteProveedor(idCompraCarbon, {
        codigo_comprobante: compProvCodigo.trim(),
        fecha_emision: compProvFecha,
        observacion: compProvObs.trim() || null,
        con_detraccion: compProvConDetraccion,
        porcentaje_detraccion: compProvConDetraccion ? Number(compProvPctDetraccion) : 0,
        ids_cargas: compProvCargasSeleccionadas,
        anticipos: listaAnticipos,
        evidencias: compProvArchivos,
      });

      if (res.success) {
        notifySuccess("Comprobante del proveedor registrado con éxito");
        setModalComprobanteProv(false);
        setCompProvCodigo("");
        setCompProvCargasSeleccionadas([]);
        setCompProvAnticiposSeleccionados({});
        setCompProvArchivos([]);
        cargarDetalle();
        onRefresh();
      } else {
        notifyError(res.message || "Error al registrar comprobante");
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setGuardandoCompProv(false);
    }
  };

  // Guardar Pago Proveedor
  const handleGuardarPagoProv = async () => {
    if (!pagoProvCuentaEmpresa) {
      notifyError("Seleccione la cuenta bancaria de la empresa");
      return;
    }
    if (pagoProvMedio !== "Efectivo" && !pagoProvCuentaProveedor) {
      notifyError("Seleccione la cuenta del proveedor");
      return;
    }
    if (Number(pagoProvMonto) <= 0) {
      notifyError("Ingrese un monto válido a pagar");
      return;
    }

    setGuardandoPagoProv(true);
    try {
      const listaAnticiposDirectos = Object.entries(pagoProvAnticiposDirectos)
        .filter(([_, m]) => Number(m) > 0)
        .map(([id, m]) => ({ id_anticipo_proveedor: Number(id), monto_retirado: Number(m) }));

      const res = await CompraCarbonService.registrarPagoProveedor(idCompraCarbon, {
        id_comprobante_compra_carbon: modalPagoProv?.idComprobante || null,
        id_cuenta_bancaria_empresa: Number(pagoProvCuentaEmpresa),
        id_cuenta_bancaria_proveedor: pagoProvCuentaProveedor ? Number(pagoProvCuentaProveedor) : null,
        medio_pago: pagoProvMedio,
        numero_operacion: pagoProvOperacion.trim() || null,
        fecha_hora_pago: pagoProvFecha,
        es_para_detraccion: pagoProvEsDetraccion,
        monto_pagado: Number(pagoProvMonto),
        observacion: pagoProvObs.trim() || null,
        ids_cargas: pagoProvCargasDirectas,
        anticipos: listaAnticiposDirectos,
        evidencias: pagoProvArchivos,
      });

      if (res.success) {
        notifySuccess("Pago al proveedor registrado con éxito");
        setModalPagoProv(null);
        setPagoProvMonto(0);
        setPagoProvOperacion("");
        setPagoProvCargasDirectas([]);
        setPagoProvAnticiposDirectos({});
        setPagoProvArchivos([]);
        cargarDetalle();
        onRefresh();
      } else {
        notifyError(res.message || "Error al registrar pago");
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setGuardandoPagoProv(false);
    }
  };

  // Guardar Comprobante Transporte
  const handleGuardarComprobanteTrans = async () => {
    if (!compTransIdTransportista) {
      notifyError("Seleccione el transportista");
      return;
    }
    if (!compTransCodigo.trim()) {
      notifyError("Ingrese el número de factura de transporte");
      return;
    }
    if (compTransCargasSeleccionadas.length === 0) {
      notifyError("Seleccione las cargas asociadas a este flete");
      return;
    }

    setGuardandoCompTrans(true);
    try {
      const res = await CompraCarbonService.registrarComprobanteTransporte(idCompraCarbon, {
        id_transportista: Number(compTransIdTransportista),
        codigo_comprobante: compTransCodigo.trim(),
        fecha_emision: compTransFecha,
        observacion: compTransObs.trim() || null,
        con_detraccion: compTransConDetraccion,
        porcentaje_detraccion: compTransConDetraccion ? Number(compTransPctDetraccion) : 0,
        ids_cargas: compTransCargasSeleccionadas,
        evidencias: compTransArchivos,
      });

      if (res.success) {
        notifySuccess("Comprobante de flete registrado exitosamente");
        setModalComprobanteTrans(false);
        setCompTransCodigo("");
        setCompTransCargasSeleccionadas([]);
        setCompTransArchivos([]);
        cargarDetalle();
        onRefresh();
      } else {
        notifyError(res.message || "Error al registrar comprobante de flete");
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setGuardandoCompTrans(false);
    }
  };

  // Guardar Pago Transporte
  const handleGuardarPagoTrans = async () => {
    if (!modalPagoTrans) return;
    if (!pagoTransCuentaEmpresa) {
      notifyError("Seleccione la cuenta bancaria de la empresa");
      return;
    }
    if (Number(pagoTransMonto) <= 0) {
      notifyError("Ingrese un monto válido a pagar");
      return;
    }

    setGuardandoPagoTrans(true);
    try {
      const res = await CompraCarbonService.registrarPagoTransporte(idCompraCarbon, {
        id_comprobante_transporte_carbon: modalPagoTrans.idComprobante,
        id_cuenta_bancaria_empresa: Number(pagoTransCuentaEmpresa),
        id_cuenta_bancaria_transportista: pagoTransCuentaTrans ? Number(pagoTransCuentaTrans) : null,
        medio_pago: pagoTransMedio,
        numero_operacion: pagoTransOperacion.trim() || null,
        fecha_hora_pago: pagoTransFecha,
        es_para_detraccion: pagoTransEsDetraccion,
        monto_pagado: Number(pagoTransMonto),
        observacion: pagoTransObs.trim() || null,
        evidencias: pagoTransArchivos,
      });

      if (res.success) {
        notifySuccess("Pago de transporte registrado con éxito");
        setModalPagoTrans(null);
        setPagoTransMonto(0);
        setPagoTransOperacion("");
        setPagoTransArchivos([]);
        cargarDetalle();
        onRefresh();
      } else {
        notifyError(res.message || "Error al registrar pago");
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setGuardandoPagoTrans(false);
    }
  };

  // Cerrar compra
  const handleCerrarCompra = async () => {
    try {
      setLoadingCerrar(true);
      const res = await CompraCarbonService.cerrarCompra(idCompraCarbon);
      if (res.success) {
        notifySuccess("Compra de carbón cerrada satisfactoriamente");
        setOpenConfirmCerrar(false);
        cargarDetalle();
        onRefresh();
      } else {
        notifyError(res.message || "Error al cerrar la compra");
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoadingCerrar(false);
    }
  };

  if (loading || !detalle || !cabecera) {
    return (
      <Paper p="xl" className="bg-zinc-950 text-center">
        <Text size="sm" c="dimmed">
          Cargando detalle de la orden de compra y liquidación...
        </Text>
      </Paper>
    );
  }

  const estaCerrada =
    cabecera.estado === "Cerrado" ||
    cabecera.estado === "Anulado" ||
    cabecera.estado === "Pagado";
  const puedeCerrar = !estaCerrada && detalle.cargas.length >= 1;

  return (
    <Stack gap="md">
      {/* Cabecera de la Liquidación */}
      <Paper p="md" radius="lg" className="bg-zinc-900/60 border border-zinc-800">
        <Group justify="space-between" align="center">
          <div>
            <Group gap="xs" align="center">
              <Text size="lg" fw={800} c="white">
                {cabecera.correlativo}
              </Text>
              <Badge
                color={
                  cabecera.estado === "Pagado"
                    ? "teal"
                    : cabecera.estado === "En Liquidación"
                      ? "indigo"
                      : cabecera.estado === "Cerrado"
                        ? "orange"
                        : "yellow"
                }
                variant="light"
                size="sm"
              >
                {cabecera.estado}
              </Badge>
              {cabecera.estado === "Cerrado" && (
                <Badge color="orange" variant="outline" size="sm">
                  Orden Cerrada
                </Badge>
              )}
              <Badge color={cabecera.aplica_igv ? "indigo" : "gray"} variant="outline" size="sm">
                {cabecera.aplica_igv ? `Aplica IGV (${cabecera.porcentaje_igv}%)` : "Sin IGV"}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" mt={2}>
              Proveedor: <span className="text-zinc-200 font-semibold">{cabecera.proveedor}</span> ({cabecera.proveedor_ruc || cabecera.proveedor_dni}) · Empresa: <span className="text-zinc-200 font-semibold">{cabecera.empresa}</span>
            </Text>
          </div>

          <Group gap="xs">
            <Button
              size="xs"
              radius="lg"
              color="teal"
              variant="light"
              leftSection={<IconDownload size={15} />}
              onClick={() => exportarLiquidacionExcel(detalle)}
            >
              Exportar Liquidación (Excel)
            </Button>
            {puedeCerrar && (
              <Button
                size="xs"
                radius="lg"
                color="orange"
                variant="light"
                leftSection={<IconLock size={15} />}
                onClick={() => setOpenConfirmCerrar(true)}
              >
                Cerrar Compra
              </Button>
            )}
            <Button
              size="xs"
              radius="lg"
              color="gray"
              variant="default"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </Group>
        </Group>

        <Divider my="sm" color="zinc.8" />

        {/* Cifras clave */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <div>
            <Text size="xs" c="dimmed">
              Prometido
            </Text>
            <Text size="sm" fw={700} c="white">
              {formatNumber(cabecera.toneladas_prometidas, 2)} TN ({cabecera.tipo_carbon_prometido})
            </Text>
            <Text size="xs" c="dimmed">
              Cotizado: S/ {formatNumber(cabecera.total_cotizado)}
            </Text>
          </div>

          <div>
            <Text size="xs" c="dimmed">
              Real Recibido ({cargas.length} cargas)
            </Text>
            <Text size="sm" fw={700} c="indigo.4">
              {formatNumber(cabecera.total_toneladas_reales, 2)} TN
            </Text>
            <Text size="xs" c="dimmed">
              Valorizado: S/ {formatNumber(cabecera.total_real_con_descuento)}
            </Text>
          </div>

          <div>
            <Text size="xs" c="dimmed">
              Comprobantes Proveedor
            </Text>
            <Text size="sm" fw={700} c="white">
              {comprobantesProveedor.length} registrados
            </Text>
          </div>

          <div>
            <Text size="xs" c="dimmed">
              Comprobantes Flete
            </Text>
            <Text size="sm" fw={700} c="white">
              {comprobantesTransporte.length} registrados
            </Text>
          </div>
        </SimpleGrid>
      </Paper>

      {/* Tabs de Gestión */}
      <Tabs defaultValue="cargas" color="indigo">
        <Tabs.List className="border-b border-zinc-800">
          <Tabs.Tab value="cargas" leftSection={<IconTruck size={15} />}>
            Cargas recibidas ({cargas.length})
          </Tabs.Tab>
          <Tabs.Tab value="proveedor" leftSection={<IconReceipt size={15} />}>
            Liquidación Proveedor ({cabecera.aplica_igv ? `${comprobantesProveedor.length} Facturas` : `${pagosDirectos.length} Pagos`})
          </Tabs.Tab>
          <Tabs.Tab value="fletes" leftSection={<IconCoin size={15} />}>
            Fletes de Transporte ({comprobantesTransporte.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* Panel 1: Cargas Recibidas */}
        <Tabs.Panel value="cargas" pt="md">
          <Paper p="md" radius="lg" className="bg-zinc-900/60 border border-zinc-800 overflow-x-auto">
            {cargas.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="lg">
                No hay cargas registradas aún para esta orden de compra.
              </Text>
            ) : (
              <Table striped highlightOnHover className="text-xs">
                <Table.Thead>
                  <Table.Tr className="text-zinc-400">
                    <Table.Th>#</Table.Th>
                    <Table.Th>Fecha / Hora</Table.Th>
                    <Table.Th>Placa</Table.Th>
                    <Table.Th>Ticket</Table.Th>
                    <Table.Th>Destino</Table.Th>
                    <Table.Th>Tipo Carbón</Table.Th>
                    <Table.Th>TM</Table.Th>
                    <Table.Th>%Ce</Table.Th>
                    <Table.Th>P. Base</Table.Th>
                    <Table.Th>Flete</Table.Th>
                    <Table.Th>Subtotal</Table.Th>
                    <Table.Th>Estado</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {cargas.map((c, i) => (
                    <Table.Tr key={c.id_carga_compra_carbon}>
                      <Table.Td>{i + 1}</Table.Td>
                      <Table.Td>{dayjs(c.fecha_hora_ingreso).format("DD/MM/YYYY HH:mm")}</Table.Td>
                      <Table.Td className="font-semibold text-white">{c.placa}</Table.Td>
                      <Table.Td>{c.codigo_ticket_balanza}</Table.Td>
                      <Table.Td>{c.almacen_empresa_nombre || c.cliente_destino || "—"}</Table.Td>
                      <Table.Td>{c.tipo_carbon_nombre}</Table.Td>
                      <Table.Td className="font-bold">{formatNumber(c.cantidad, 3)}</Table.Td>
                      <Table.Td>{formatNumber(c.porcentaje_ceniza, 2)}%</Table.Td>
                      <Table.Td>S/ {formatNumber(c.precio_unitario)}</Table.Td>
                      <Table.Td>
                        {c.pagar_flete ? (
                          <span className="text-red-400">-S/ {formatNumber(c.descuento_flete)}</span>
                        ) : (
                          "—"
                        )}
                      </Table.Td>
                      <Table.Td className="font-bold text-indigo-400">
                        S/ {formatNumber(c.subtotal_con_descuento)}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          color={c.estado === "Pagado" ? "teal" : "yellow"}
                          variant="light"
                        >
                          {c.estado}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>

        {/* Panel 2: Liquidación y Pagos Proveedor */}
        <Tabs.Panel value="proveedor" pt="md">
          {cabecera.aplica_igv ? (
            /* CON IGV: COMPROBANTES Y PAGOS */
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="sm" fw={700} c="white">
                    Comprobantes / Facturas del Proveedor
                  </Text>
                  <Text size="xs" c="dimmed">
                    {cargasSinComprobanteProv.length} carga(s) pendiente(s) de asociar a comprobante
                  </Text>
                </div>
                {!estaCerrada && cargasSinComprobanteProv.length > 0 && (
                  <Button
                    size="xs"
                    radius="lg"
                    color="indigo"
                    leftSection={<IconPlus size={15} />}
                    onClick={() => {
                      setCompProvCargasSeleccionadas(cargasSinComprobanteProv.map((c) => c.id_carga_compra_carbon));
                      setModalComprobanteProv(true);
                    }}
                  >
                    Registrar Factura Proveedor
                  </Button>
                )}
              </Group>

              {comprobantesProveedor.length === 0 ? (
                <Paper p="md" radius="lg" className="bg-zinc-900/60 border border-zinc-800 text-center">
                  <Text size="xs" c="dimmed">
                    Aún no se han registrado comprobantes. Las cargas entregadas deben agruparse en facturas.
                  </Text>
                </Paper>
              ) : (
                comprobantesProveedor.map((cmp) => (
                  <Paper key={cmp.id_comprobante_compra_carbon} p="md" radius="lg" className="bg-zinc-900/60 border border-zinc-800">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Group gap="xs">
                          <Text size="sm" fw={800} c="white">
                            Factura: {cmp.codigo_comprobante}
                          </Text>
                          <Badge color={cmp.estado === "Pagado" ? "teal" : "yellow"} variant="light" size="xs">
                            {cmp.estado}
                          </Badge>
                          {cmp.con_detraccion && (
                            <Badge color="orange" variant="outline" size="xs">
                              Detracción {cmp.porcentaje_detraccion}%
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" mt={1}>
                          Emisión: {dayjs(cmp.fecha_emision).format("DD/MM/YYYY")} · Registrado por: {cmp.empleado_registro}
                        </Text>
                      </div>

                      {cmp.estado !== "Pagado" && (
                        <Button
                          size="xs"
                          radius="lg"
                          color="indigo"
                          variant="light"
                          leftSection={<IconCoin size={15} />}
                          onClick={() => setModalPagoProv({ idComprobante: cmp.id_comprobante_compra_carbon })}
                        >
                          Registrar Pago
                        </Button>
                      )}
                    </Group>

                    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm" mt="md" className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <div>
                        <Text size="xs" c="dimmed">Total Factura</Text>
                        <Text size="sm" fw={700} c="white">S/ {formatNumber(cmp.total)}</Text>
                      </div>
                      {cmp.con_detraccion && (
                        <div>
                          <Text size="xs" c="dimmed">Detracción ({cmp.porcentaje_detraccion}%)</Text>
                          <Text size="sm" fw={700} c="orange.4">S/ {formatNumber(cmp.monto_detraccion)}</Text>
                          <Text size="xs" c="dimmed">Pagado: S/ {formatNumber(cmp.avance_pago_detraccion)}</Text>
                        </div>
                      )}
                      <div>
                        <Text size="xs" c="dimmed">Anticipos Aplicados</Text>
                        <Text size="sm" fw={700} c="zinc.4">- S/ {formatNumber(cmp.monto_pagado_anticipos)}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Neto a Pagar</Text>
                        <Text size="sm" fw={700} c="indigo.4">S/ {formatNumber(cmp.total_neto)}</Text>
                        <Text size="xs" c="dimmed">Pagado: S/ {formatNumber(cmp.avance_pago_neto)}</Text>
                      </div>
                    </SimpleGrid>

                    {/* Pagos del comprobante */}
                    {cmp.pagos && cmp.pagos.length > 0 && (
                      <Stack gap="xs" mt="md">
                        <Text size="xs" fw={700} c="zinc.4">
                          Historial de Pagos Realizados:
                        </Text>
                        {cmp.pagos.map((p) => (
                          <Paper key={p.id_pago_compra_carbon} p="xs" radius="md" className="bg-zinc-950/40 border border-zinc-800/60">
                            <Group justify="space-between">
                              <div>
                                <Group gap="xs">
                                  <Badge color={p.es_para_detraccion ? "orange" : "teal"} size="xs" variant="light">
                                    {p.es_para_detraccion ? "Detracción" : "Neto"}
                                  </Badge>
                                  <Text size="xs" fw={600} c="white">
                                    {p.medio_pago} {p.numero_operacion ? `(Op: ${p.numero_operacion})` : ""}
                                  </Text>
                                </Group>
                                <Text size="xs" c="dimmed">
                                  {dayjs(p.fecha_hora_pago).format("DD/MM/YYYY HH:mm")} · Cuenta: {p.empresa_banco} → {p.proveedor_banco || "Efectivo"}
                                </Text>
                              </div>
                              <Text size="sm" fw={700} c="white">
                                S/ {formatNumber(p.monto_pagado)}
                              </Text>
                            </Group>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                ))
              )}
            </Stack>
          ) : (
            /* SIN IGV: PAGOS DIRECTOS */
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="sm" fw={700} c="white">
                    Pagos Directos al Proveedor (Sin Comprobante)
                  </Text>
                  <Text size="xs" c="dimmed">
                    {cargasSinPagoDirecto.length} carga(s) pendiente(s) de liquidar / pagar
                  </Text>
                </div>
                {!estaCerrada && cargasSinPagoDirecto.length > 0 && (
                  <Button
                    size="xs"
                    radius="lg"
                    color="indigo"
                    leftSection={<IconCoin size={15} />}
                    onClick={() => {
                      setPagoProvCargasDirectas(cargasSinPagoDirecto.map((c) => c.id_carga_compra_carbon));
                      setModalPagoProv({ idComprobante: null });
                    }}
                  >
                    Registrar Pago Directo
                  </Button>
                )}
              </Group>

              {pagosDirectos.length === 0 ? (
                <Paper p="md" radius="lg" className="bg-zinc-900/60 border border-zinc-800 text-center">
                  <Text size="xs" c="dimmed">
                    No se han registrado pagos directos aún.
                  </Text>
                </Paper>
              ) : (
                pagosDirectos.map((p) => (
                  <Paper key={p.id_pago_compra_carbon} p="md" radius="lg" className="bg-zinc-900/60 border border-zinc-800">
                    <Group justify="space-between">
                      <div>
                        <Group gap="xs">
                          <Text size="sm" fw={700} c="white">
                            {p.medio_pago} {p.numero_operacion ? `· Op: ${p.numero_operacion}` : ""}
                          </Text>
                          <Badge color="teal" size="xs" variant="light">
                            Pagado
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {dayjs(p.fecha_hora_pago).format("DD/MM/YYYY HH:mm")} · Cuenta: {p.empresa_banco} ({p.empresa_numero_cuenta}) → {p.proveedor_banco || "Efectivo"}
                        </Text>
                      </div>
                      <Text size="sm" fw={800} c="indigo.4">
                        S/ {formatNumber(p.monto_pagado)}
                      </Text>
                    </Group>
                  </Paper>
                ))
              )}
            </Stack>
          )}
        </Tabs.Panel>

        {/* Panel 3: Fletes de Transporte */}
        <Tabs.Panel value="fletes" pt="md">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" fw={700} c="white">
                  Comprobantes y Pagos de Transporte / Flete
                </Text>
                <Text size="xs" c="dimmed">
                  {cargasSinComprobanteFlete.length} carga(s) con flete pendiente de asociar a factura
                </Text>
              </div>
              {!estaCerrada && cargasSinComprobanteFlete.length > 0 && (
                <Button
                  size="xs"
                  radius="lg"
                  color="indigo"
                  leftSection={<IconPlus size={15} />}
                  onClick={() => {
                    setCompTransCargasSeleccionadas(cargasSinComprobanteFlete.map((c) => c.id_carga_compra_carbon));
                    if (cargasSinComprobanteFlete[0]?.id_transportista) {
                      setCompTransIdTransportista(String(cargasSinComprobanteFlete[0].id_transportista));
                    }
                    setModalComprobanteTrans(true);
                  }}
                >
                  Registrar Factura Flete
                </Button>
              )}
            </Group>

            {comprobantesTransporte.length === 0 ? (
              <Paper p="md" radius="lg" className="bg-zinc-900/60 border border-zinc-800 text-center">
                <Text size="xs" c="dimmed">
                  No hay comprobantes de transporte registrados.
                </Text>
              </Paper>
            ) : (
              comprobantesTransporte.map((ct) => (
                <Paper key={ct.id_comprobante_transporte_carbon} p="md" radius="lg" className="bg-zinc-900/60 border border-zinc-800">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Group gap="xs">
                        <Text size="sm" fw={800} c="white">
                          Factura Flete: {ct.codigo_comprobante}
                        </Text>
                        <Badge color={ct.estado === "Pagado" ? "teal" : "yellow"} variant="light" size="xs">
                          {ct.estado}
                        </Badge>
                        <Badge color="blue" variant="outline" size="xs">
                          {ct.transportista_razon_social}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed" mt={1}>
                        Emisión: {dayjs(ct.fecha_emision).format("DD/MM/YYYY")} · Detracción {ct.porcentaje_detraccion}%
                      </Text>
                    </div>

                    {ct.estado !== "Pagado" && (
                      <Button
                        size="xs"
                        radius="lg"
                        color="indigo"
                        variant="light"
                        leftSection={<IconCoin size={15} />}
                        onClick={() => {
                          setModalPagoTrans({ idComprobante: ct.id_comprobante_transporte_carbon });
                          // Cargar cuentas del transportista
                          AuxService.get_cuentas_transportista({ id_transportista: ct.id_transportista }).then((res) => {
                            if (res.success && res.data) {
                              setCuentasTransportista(
                                res.data.map((c) => ({
                                  id: c.id_cuenta_bancaria,
                                  label: `${c.banco} (${c.numero_cuenta})${c.es_para_detraccion ? " [DETRACCIÓN]" : ""}`,
                                  es_detraccion: Boolean(c.es_para_detraccion),
                                })),
                              );
                            }
                          });
                        }}
                      >
                        Pagar Flete
                      </Button>
                    )}
                  </Group>

                  <SimpleGrid cols={{ base: 2, md: 3 }} spacing="sm" mt="md" className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                    <div>
                      <Text size="xs" c="dimmed">Total Flete</Text>
                      <Text size="sm" fw={700} c="white">S/ {formatNumber(ct.total)}</Text>
                    </div>
                    {ct.con_detraccion && (
                      <div>
                        <Text size="xs" c="dimmed">Detracción ({ct.porcentaje_detraccion}%)</Text>
                        <Text size="sm" fw={700} c="orange.4">S/ {formatNumber(ct.monto_detraccion)}</Text>
                        <Text size="xs" c="dimmed">Pagado: S/ {formatNumber(ct.avance_pago_detraccion)}</Text>
                      </div>
                    )}
                    <div>
                      <Text size="xs" c="dimmed">Neto a Pagar</Text>
                      <Text size="sm" fw={700} c="indigo.4">S/ {formatNumber(ct.total_neto)}</Text>
                      <Text size="xs" c="dimmed">Pagado: S/ {formatNumber(ct.avance_pago_neto)}</Text>
                    </div>
                  </SimpleGrid>

                  {/* Pagos del transporte */}
                  {ct.pagos && ct.pagos.length > 0 && (
                    <Stack gap="xs" mt="md">
                      <Text size="xs" fw={700} c="zinc.4">
                        Pagos de flete realizados:
                      </Text>
                      {ct.pagos.map((p) => (
                        <Paper key={p.id_pago_transporte_carbon} p="xs" radius="md" className="bg-zinc-950/40 border border-zinc-800/60">
                          <Group justify="space-between">
                            <div>
                              <Group gap="xs">
                                <Badge color={p.es_para_detraccion ? "orange" : "teal"} size="xs" variant="light">
                                  {p.es_para_detraccion ? "Detracción" : "Neto"}
                                </Badge>
                                <Text size="xs" fw={600} c="white">
                                  {p.medio_pago} {p.numero_operacion ? `(Op: ${p.numero_operacion})` : ""}
                                </Text>
                              </Group>
                              <Text size="xs" c="dimmed">
                                {dayjs(p.fecha_hora_pago).format("DD/MM/YYYY HH:mm")} · Cuenta: {p.empresa_banco} → {p.transportista_banco || "Efectivo"}
                              </Text>
                            </div>
                            <Text size="sm" fw={700} c="white">
                              S/ {formatNumber(p.monto_pagado)}
                            </Text>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Paper>
              ))
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* ────────────────── SUB-MODALES ────────────────── */}

      {/* 1. Modal Registrar Comprobante Proveedor */}
      <Modal
        opened={modalComprobanteProv}
        onClose={() => setModalComprobanteProv(false)}
        title="Registrar Factura / Comprobante del Proveedor"
        size="lg"
        centered
      >
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            <TextInput
              label="Número de comprobante"
              placeholder="Ej. F001-000123"
              value={compProvCodigo}
              onChange={(e) => setCompProvCodigo(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
            <TextInput
              label="Fecha de emisión"
              type="date"
              value={compProvFecha}
              onChange={(e) => setCompProvFecha(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
          </SimpleGrid>

          <Group justify="space-between" p="xs" className="bg-zinc-900/60 rounded-xl border border-zinc-800">
            <div>
              <Text size="xs" fw={600} c="white">¿Aplica detracción SUNAT?</Text>
              <Text size="xs" c="dimmed">Retención para el Banco de la Nación</Text>
            </div>
            <Group gap="xs">
              {compProvConDetraccion && (
                <NumberInput
                  value={compProvPctDetraccion}
                  onChange={setCompProvPctDetraccion}
                  min={1}
                  max={30}
                  size="xs"
                  radius="lg"
                  w={70}
                />
              )}
              <Switch
                checked={compProvConDetraccion}
                onChange={(e) => setCompProvConDetraccion(e.currentTarget.checked)}
                color="indigo"
                size="sm"
              />
            </Group>
          </Group>

          {/* Selección de Cargas */}
          <div>
            <Text size="xs" fw={700} c="white" mb={4}>
              Seleccione las cargas a incluir en esta factura:
            </Text>
            <Paper p="xs" radius="md" className="bg-zinc-950/60 border border-zinc-800 max-h-48 overflow-y-auto">
              <Stack gap={6}>
                {cargasSinComprobanteProv.map((c) => (
                  <Group key={c.id_carga_compra_carbon} justify="space-between">
                    <Checkbox
                      size="xs"
                      label={`Ticket #${c.codigo_ticket_balanza} · Placa ${c.placa} (${formatNumber(c.cantidad, 2)} TN)`}
                      checked={compProvCargasSeleccionadas.includes(c.id_carga_compra_carbon)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          setCompProvCargasSeleccionadas((prev) => [...prev, c.id_carga_compra_carbon]);
                        } else {
                          setCompProvCargasSeleccionadas((prev) => prev.filter((id) => id !== c.id_carga_compra_carbon));
                        }
                      }}
                    />
                    <Text size="xs" fw={700} c="white">
                      S/ {formatNumber(c.subtotal_con_descuento)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
          </div>

          {/* Anticipos Disponibles */}
          {anticiposDisponibles.length > 0 && (
            <div>
              <Text size="xs" fw={700} c="white" mb={4}>
                Anticipos del proveedor disponibles para descontar:
              </Text>
              <Paper p="xs" radius="md" className="bg-zinc-950/60 border border-zinc-800 max-h-40 overflow-y-auto">
                <Stack gap={8}>
                  {anticiposDisponibles.map((a) => (
                    <Group key={a.id_anticipo} justify="space-between">
                      <div>
                        <Text size="xs" fw={600} c="white">
                          Anticipo #{a.id_anticipo} ({dayjs(a.fecha_hora_pago).format("DD/MM/YYYY")})
                        </Text>
                        <Text size="xs" c="dimmed">
                          Saldo libre: S/ {formatNumber(a.saldo_actual)}
                        </Text>
                      </div>
                      <NumberInput
                        placeholder="Monto a usar"
                        max={Number(a.saldo_actual)}
                        min={0}
                        size="xs"
                        radius="lg"
                        w={120}
                        value={compProvAnticiposSeleccionados[a.id_anticipo] || ""}
                        onChange={(val) =>
                          setCompProvAnticiposSeleccionados((prev) => ({
                            ...prev,
                            [a.id_anticipo]: Number(val) || 0,
                          }))
                        }
                      />
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </div>
          )}

          <FileInput
            label="Evidencias / Factura digital (PDF, XML, Imagen)"
            placeholder="Adjuntar archivos"
            multiple
            value={compProvArchivos}
            onChange={setCompProvArchivos}
            leftSection={<IconUpload size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <TextInput
            label="Observación"
            placeholder="Opcional"
            value={compProvObs}
            onChange={(e) => setCompProvObs(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          {/* Resumen */}
          <Paper p="xs" radius="md" className="bg-indigo-950/20 border border-indigo-900/40">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Total Cargas: S/ {formatNumber(totalCargasCompProv)}</Text>
              {totalAnticiposCompProv > 0 && (
                <Text size="xs" c="dimmed">Anticipos: -S/ {formatNumber(totalAnticiposCompProv)}</Text>
              )}
              <Text size="sm" fw={800} c="indigo.4">
                Total Factura: S/ {formatNumber(totalCargasCompProv)}
              </Text>
            </Group>
          </Paper>

          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="default" size="xs" radius="lg" onClick={() => setModalComprobanteProv(false)}>
              Cancelar
            </Button>
            <Button
              color="indigo"
              size="xs"
              radius="lg"
              loading={guardandoCompProv}
              onClick={handleGuardarComprobanteProv}
            >
              Guardar Factura
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 2. Modal Registrar Pago Proveedor (Con Comprobante o Directo) */}
      <Modal
        opened={modalPagoProv !== null}
        onClose={() => setModalPagoProv(null)}
        title={
          modalPagoProv?.idComprobante
            ? "Registrar Pago a Factura del Proveedor"
            : "Registrar Pago Directo (Sin IGV)"
        }
        size="md"
        centered
      >
        <Stack gap="sm">
          <Select
            label="Cuenta bancaria de la empresa (origen)"
            placeholder="Seleccione cuenta de Cupper"
            data={cuentasEmpresa.map((c) => ({ value: String(c.id), label: c.label }))}
            value={pagoProvCuentaEmpresa}
            onChange={setPagoProvCuentaEmpresa}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            required
          />

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            <Select
              label="Medio de pago"
              data={["Transferencia", "Depósito", "Efectivo"]}
              value={pagoProvMedio}
              onChange={(val) => setPagoProvMedio(val || "Transferencia")}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />

            <TextInput
              label="N° Operación"
              placeholder={pagoProvMedio === "Efectivo" ? "Opcional" : "Obligatorio"}
              value={pagoProvOperacion}
              onChange={(e) => setPagoProvOperacion(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required={pagoProvMedio !== "Efectivo"}
            />
          </SimpleGrid>

          {pagoProvMedio !== "Efectivo" && (
            <Select
              label="Cuenta bancaria del proveedor (destino)"
              placeholder="Seleccione cuenta"
              data={cuentasProveedor
                .filter((c) => (pagoProvEsDetraccion ? c.es_detraccion : !c.es_detraccion))
                .map((c) => ({ value: String(c.id), label: c.label }))}
              value={pagoProvCuentaProveedor}
              onChange={setPagoProvCuentaProveedor}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              searchable
              required
            />
          )}

          {modalPagoProv?.idComprobante && (
            <Group justify="space-between" p="xs" className="bg-zinc-900/60 rounded-xl border border-zinc-800">
              <Text size="xs" fw={600} c="white">¿Es pago de detracción?</Text>
              <Switch
                checked={pagoProvEsDetraccion}
                onChange={(e) => setPagoProvEsDetraccion(e.currentTarget.checked)}
                color="orange"
                size="sm"
              />
            </Group>
          )}

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            <TextInput
              label="Fecha y hora de pago"
              type="datetime-local"
              value={pagoProvFecha}
              onChange={(e) => setPagoProvFecha(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />

            <NumberInput
              label="Monto a pagar (S/)"
              placeholder="0.00"
              value={pagoProvMonto}
              onChange={setPagoProvMonto}
              min={0.01}
              decimalScale={2}
              fixedDecimalScale
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
          </SimpleGrid>

          {/* Selección de Cargas en Pago Directo */}
          {!modalPagoProv?.idComprobante && cargasSinPagoDirecto.length > 0 && (
            <div>
              <Text size="xs" fw={700} c="white" mb={4}>
                Seleccione las cargas que abarca este pago directo:
              </Text>
              <Paper p="xs" radius="md" className="bg-zinc-950/60 border border-zinc-800 max-h-36 overflow-y-auto">
                <Stack gap={6}>
                  {cargasSinPagoDirecto.map((c) => (
                    <Group key={c.id_carga_compra_carbon} justify="space-between">
                      <Checkbox
                        size="xs"
                        label={`Ticket #${c.codigo_ticket_balanza} · Placa ${c.placa}`}
                        checked={pagoProvCargasDirectas.includes(c.id_carga_compra_carbon)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setPagoProvCargasDirectas((p) => [...p, c.id_carga_compra_carbon]);
                          } else {
                            setPagoProvCargasDirectas((p) => p.filter((id) => id !== c.id_carga_compra_carbon));
                          }
                        }}
                      />
                      <Text size="xs" fw={700} c="white">S/ {formatNumber(c.subtotal_con_descuento)}</Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </div>
          )}

          <FileInput
            label="Constancia de pago / Voucher"
            placeholder="Adjuntar voucher"
            multiple
            value={pagoProvArchivos}
            onChange={setPagoProvArchivos}
            leftSection={<IconUpload size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <TextInput
            label="Observación"
            placeholder="Opcional"
            value={pagoProvObs}
            onChange={(e) => setPagoProvObs(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="default" size="xs" radius="lg" onClick={() => setModalPagoProv(null)}>
              Cancelar
            </Button>
            <Button
              color="indigo"
              size="xs"
              radius="lg"
              loading={guardandoPagoProv}
              onClick={handleGuardarPagoProv}
            >
              Registrar Pago
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 3. Modal Registrar Comprobante Transporte */}
      <Modal
        opened={modalComprobanteTrans}
        onClose={() => setModalComprobanteTrans(false)}
        title="Registrar Factura de Flete de Transporte"
        size="lg"
        centered
      >
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <TextInput
              label="Factura transporte"
              placeholder="Ej. F001-9988"
              value={compTransCodigo}
              onChange={(e) => setCompTransCodigo(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
            <TextInput
              label="Fecha de emisión"
              type="date"
              value={compTransFecha}
              onChange={(e) => setCompTransFecha(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
            <Group justify="space-between" align="center" className="p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <Text size="xs" fw={600} c="white">Detracción</Text>
              <Switch
                checked={compTransConDetraccion}
                onChange={(e) => setCompTransConDetraccion(e.currentTarget.checked)}
                color="indigo"
                size="sm"
              />
            </Group>
          </SimpleGrid>

          {compTransConDetraccion && (
            <NumberInput
              label="% Detracción transporte"
              value={compTransPctDetraccion}
              onChange={setCompTransPctDetraccion}
              min={0}
              max={100}
              classNames={inputClasses}
              size="xs"
              radius="lg"
            />
          )}

          {/* Cargas asociadas al flete */}
          <div>
            <Text size="xs" fw={700} c="white" mb={4}>
              Cargas cubiertas por este comprobante de flete:
            </Text>
            <Paper p="xs" radius="md" className="bg-zinc-950/60 border border-zinc-800 max-h-48 overflow-y-auto">
              <Stack gap={6}>
                {cargasSinComprobanteFlete.map((c) => (
                  <Group key={c.id_carga_compra_carbon} justify="space-between">
                    <Checkbox
                      size="xs"
                      label={`Ticket #${c.codigo_ticket_balanza} · Placa ${c.placa} (${c.transportista_razon_social})`}
                      checked={compTransCargasSeleccionadas.includes(c.id_carga_compra_carbon)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          setCompTransCargasSeleccionadas((p) => [...p, c.id_carga_compra_carbon]);
                        } else {
                          setCompTransCargasSeleccionadas((p) => p.filter((id) => id !== c.id_carga_compra_carbon));
                        }
                      }}
                    />
                    <Text size="xs" fw={700} c="white">S/ {formatNumber(c.descuento_flete)}</Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
          </div>

          <FileInput
            label="Evidencias de la factura de transporte"
            placeholder="Adjuntar archivos"
            multiple
            value={compTransArchivos}
            onChange={setCompTransArchivos}
            leftSection={<IconUpload size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <TextInput
            label="Observación"
            placeholder="Opcional"
            value={compTransObs}
            onChange={(e) => setCompTransObs(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="default" size="xs" radius="lg" onClick={() => setModalComprobanteTrans(false)}>
              Cancelar
            </Button>
            <Button
              color="indigo"
              size="xs"
              radius="lg"
              loading={guardandoCompTrans}
              onClick={handleGuardarComprobanteTrans}
            >
              Guardar Factura Flete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 4. Modal Registrar Pago Transporte */}
      <Modal
        opened={modalPagoTrans !== null}
        onClose={() => setModalPagoTrans(null)}
        title="Registrar Pago de Flete al Transportista"
        size="md"
        centered
      >
        <Stack gap="sm">
          <Select
            label="Cuenta bancaria de la empresa (origen)"
            placeholder="Seleccione cuenta"
            data={cuentasEmpresa.map((c) => ({ value: String(c.id), label: c.label }))}
            value={pagoTransCuentaEmpresa}
            onChange={setPagoTransCuentaEmpresa}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            required
          />

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            <Select
              label="Medio de pago"
              data={["Transferencia", "Depósito", "Efectivo"]}
              value={pagoTransMedio}
              onChange={(val) => setPagoTransMedio(val || "Transferencia")}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
            <TextInput
              label="N° Operación"
              placeholder={pagoTransMedio === "Efectivo" ? "Opcional" : "Obligatorio"}
              value={pagoTransOperacion}
              onChange={(e) => setPagoTransOperacion(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
            />
          </SimpleGrid>

          {pagoTransMedio !== "Efectivo" && (
            <Select
              label="Cuenta del transportista"
              placeholder="Seleccione cuenta"
              data={cuentasTransportista
                .filter((c) => (pagoTransEsDetraccion ? c.es_detraccion : !c.es_detraccion))
                .map((c) => ({ value: String(c.id), label: c.label }))}
              value={pagoTransCuentaTrans}
              onChange={setPagoTransCuentaTrans}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              searchable
            />
          )}

          <Group justify="space-between" p="xs" className="bg-zinc-900/60 rounded-xl border border-zinc-800">
            <Text size="xs" fw={600} c="white">¿Es pago de detracción de transporte?</Text>
            <Switch
              checked={pagoTransEsDetraccion}
              onChange={(e) => setPagoTransEsDetraccion(e.currentTarget.checked)}
              color="orange"
              size="sm"
            />
          </Group>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            <TextInput
              label="Fecha y hora de pago"
              type="datetime-local"
              value={pagoTransFecha}
              onChange={(e) => setPagoTransFecha(e.currentTarget.value)}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
            <NumberInput
              label="Monto a pagar (S/)"
              placeholder="0.00"
              value={pagoTransMonto}
              onChange={setPagoTransMonto}
              min={0.01}
              decimalScale={2}
              fixedDecimalScale
              classNames={inputClasses}
              size="xs"
              radius="lg"
              required
            />
          </SimpleGrid>

          <FileInput
            label="Constancia de pago / Voucher"
            placeholder="Adjuntar voucher"
            multiple
            value={pagoTransArchivos}
            onChange={setPagoTransArchivos}
            leftSection={<IconUpload size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <TextInput
            label="Observación (opcional)"
            placeholder="Detalle o referencia del pago..."
            value={pagoTransObs}
            onChange={(e) => setPagoTransObs(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
          />

          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="default" size="xs" radius="lg" onClick={() => setModalPagoTrans(null)}>
              Cancelar
            </Button>
            <Button
              color="indigo"
              size="xs"
              radius="lg"
              loading={guardandoPagoTrans}
              onClick={handleGuardarPagoTrans}
            >
              Registrar Pago
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Confirmación Cerrar Compra */}
      <Modal
        opened={openConfirmCerrar}
        onClose={() => !loadingCerrar && setOpenConfirmCerrar(false)}
        centered
        radius="xl"
        withCloseButton={false}
        size="md"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        classNames={{
          content: "bg-zinc-950 border border-white/10 shadow-2xl shadow-black",
        }}
      >
        <Stack gap="md" align="center" className="p-6">
          <Badge color="orange" variant="light" size="lg" radius="xl">
            <IconLock size={20} />
          </Badge>
          <Text fw={800} size="lg" c="white" ta="center">
            Cerrar orden {cabecera?.correlativo}
          </Text>
          <Text size="sm" c="zinc.4" ta="center">
            Al cerrar esta compra se establecerá el estado a{" "}
            <Text component="span" fw={700} c="orange.4">
              Cerrado
            </Text>{" "}
            y se registrará la fecha y usuario de cierre.
            <br />
            <br />
            <Text component="span" fw={600} c="white">
              Ya no se permitirá registrar nuevas cargas de carbón a esta orden.
            </Text>{" "}
            El proceso de liquidación, facturación y pagos continuará con las cargas actuales.
          </Text>
          <Group justify="center" gap="sm" mt="xs" w="100%">
            <Button
              variant="subtle"
              color="gray"
              radius="xl"
              onClick={() => setOpenConfirmCerrar(false)}
              disabled={loadingCerrar}
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              variant="filled"
              color="orange"
              radius="xl"
              loading={loadingCerrar}
              onClick={handleCerrarCompra}
              fullWidth
              leftSection={<IconLock size={16} />}
            >
              Sí, cerrar orden
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
