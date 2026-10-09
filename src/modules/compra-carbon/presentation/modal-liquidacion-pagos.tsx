import { useEffect, useState, useMemo, useRef } from "react";
import {
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconCoin,
  IconDownload,
  IconLock,
  IconPlus,
  IconReceipt,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../hooks/useNotify";
import { CompraCarbonService } from "../service/compra-carbon.service";
import type {
  CompraCarbonDetalleResponse,
  ComprobanteCompraCarbonItem,
  ComprobanteTransporteItem,
  RespuestaRegistrarComprobanteProveedor,
  RespuestaRegistrarPagoProveedor,
  RespuestaRegistrarComprobanteTransporte,
  RespuestaRegistrarPagoTransporte,
} from "../service/compra-carbon.responses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { exportarLiquidacionExcel } from "./excel/exportar-liquidacion-excel";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";

// Componentes modulares desacoplados para registro de comprobantes y pagos
import { ModalComprobanteProveedor } from "./components/modal-comprobante-proveedor";
import { ModalPagoProveedor } from "./components/modal-pago-proveedor";
import { ModalComprobanteTransporte } from "./components/modal-comprobante-transporte";
import { ModalPagoTransporte } from "./components/modal-pago-transporte";

interface Props {
  idCompraCarbon: number;
  onClose: () => void;
  onRefresh: () => void;
}

export const ModalLiquidacionPagos = ({
  idCompraCarbon,
  onClose,
  onRefresh,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [detalle, setDetalle] = useState<CompraCarbonDetalleResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const huboCambiosRef = useRef(false);

  // Estados de apertura de sub-modales
  const [modalComprobanteProv, setModalComprobanteProv] = useState(false);
  const [modalPagoProv, setModalPagoProv] = useState<{
    comprobante: ComprobanteCompraCarbonItem | null;
  } | null>(null);
  const [modalComprobanteTrans, setModalComprobanteTrans] = useState(false);
  const [modalPagoTrans, setModalPagoTrans] = useState<{
    comprobante: ComprobanteTransporteItem;
  } | null>(null);

  // Cierre de orden
  const [openConfirmCerrar, setOpenConfirmCerrar] = useState(false);
  const [loadingCerrar, setLoadingCerrar] = useState(false);

  // Carga de la información de la compra
  const cargarDetalle = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res =
        await CompraCarbonService.getCompraConDetalles(idCompraCarbon);
      if (res.success && res.data) {
        setDetalle(res.data);
      } else {
        notifyError(res.message || "No se pudo cargar el detalle de la compra");
      }
    } catch (err: unknown) {
      notifyError(
        err instanceof Error ? err.message : "Error al cargar detalle",
      );
    } finally {
      if (!silent) setLoading(false);
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
    () =>
      cargas.filter(
        (c) => !c.id_comprobante_compra_carbon && c.estado !== "Anulado",
      ),
    [cargas],
  );

  // Cargas libres para pago directo (cuando no aplica IGV)
  const cargasSinPagoDirecto = useMemo(
    () =>
      cargas.filter(
        (c) =>
          !c.id_pago_compra_carbon &&
          c.estado !== "Anulado" &&
          c.estado !== "Pagado",
      ),
    [cargas],
  );

  // Cargas con flete pendiente de comprobante de flete
  const cargasSinComprobanteFlete = useMemo(
    () =>
      cargas.filter(
        (c) =>
          c.pagar_flete &&
          !c.id_comprobante_transporte_carbon &&
          c.estado !== "Anulado",
      ),
    [cargas],
  );

  // Inserción directa de nuevo comprobante proveedor sin reconsultar todo
  const handleSuccessComprobanteProv = (
    data: RespuestaRegistrarComprobanteProveedor,
  ) => {
    huboCambiosRef.current = true;
    setDetalle((prev) => {
      if (!prev) return prev;
      const nuevasCargas = prev.cargas.map((c) =>
        data.ids_cargas.includes(c.id_carga_compra_carbon)
          ? {
              ...c,
              id_comprobante_compra_carbon:
                data.comprobante.id_comprobante_compra_carbon,
              comprobante_compra_codigo: data.comprobante.codigo_comprobante,
            }
          : c,
      );
      return {
        ...prev,
        comprobantes_proveedor: [
          ...prev.comprobantes_proveedor,
          data.comprobante,
        ],
        cargas: nuevasCargas,
      };
    });
  };

  // Inserción directa de nuevo pago proveedor sin reconsultar todo
  const handleSuccessPagoProv = (data: RespuestaRegistrarPagoProveedor) => {
    huboCambiosRef.current = true;
    setDetalle((prev) => {
      if (!prev) return prev;

      // Pago a un comprobante existente
      if (data.pago.id_comprobante_compra_carbon) {
        const nuevosComprobantes = prev.comprobantes_proveedor.map((cmp) => {
          if (
            cmp.id_comprobante_compra_carbon ===
            data.pago.id_comprobante_compra_carbon
          ) {
            const pagosActualizados = [...(cmp.pagos || []), data.pago];
            return {
              ...cmp,
              ...(data.comprobante || {}),
              pagos: pagosActualizados,
            };
          }
          return cmp;
        });

        const cmpActualizado = data.comprobante;
        const nuevasCargas =
          cmpActualizado?.estado === "Pagado"
            ? prev.cargas.map((c) =>
                c.id_comprobante_compra_carbon ===
                data.pago.id_comprobante_compra_carbon
                  ? { ...c, estado: "Pagado" }
                  : c,
              )
            : prev.cargas;

        return {
          ...prev,
          comprobantes_proveedor: nuevosComprobantes,
          cargas: nuevasCargas,
        };
      }

      // Pago directo sin comprobante
      const nuevosPagosDirectos = [...prev.pagos_directos, data.pago];
      const nuevasCargas = prev.cargas.map((c) =>
        data.ids_cargas_pagadas?.includes(c.id_carga_compra_carbon)
          ? {
              ...c,
              id_pago_compra_carbon: data.pago.id_pago_compra_carbon,
              pago_directo_numero_operacion:
                data.pago.numero_operacion || null,
              estado: "Pagado",
            }
          : c,
      );

      return {
        ...prev,
        pagos_directos: nuevosPagosDirectos,
        cargas: nuevasCargas,
      };
    });
  };

  // Inserción directa de nuevo comprobante de transporte sin reconsultar todo
  const handleSuccessComprobanteTrans = (
    data: RespuestaRegistrarComprobanteTransporte,
  ) => {
    huboCambiosRef.current = true;
    setDetalle((prev) => {
      if (!prev) return prev;
      const nuevasCargas = prev.cargas.map((c) =>
        data.ids_cargas.includes(c.id_carga_compra_carbon)
          ? {
              ...c,
              id_comprobante_transporte_carbon:
                data.comprobante.id_comprobante_transporte_carbon,
              comprobante_transporte_codigo:
                data.comprobante.codigo_comprobante,
            }
          : c,
      );
      return {
        ...prev,
        comprobantes_transporte: [
          ...prev.comprobantes_transporte,
          data.comprobante,
        ],
        cargas: nuevasCargas,
      };
    });
  };

  // Inserción directa de nuevo pago de transporte sin reconsultar todo
  const handleSuccessPagoTrans = (data: RespuestaRegistrarPagoTransporte) => {
    huboCambiosRef.current = true;
    setDetalle((prev) => {
      if (!prev) return prev;
      const nuevosComprobantesTrans = prev.comprobantes_transporte.map((ct) => {
        if (
          ct.id_comprobante_transporte_carbon ===
          data.pago.id_comprobante_transporte_carbon
        ) {
          const pagosActualizados = [...(ct.pagos || []), data.pago];
          return {
            ...ct,
            ...(data.comprobante || {}),
            pagos: pagosActualizados,
          };
        }
        return ct;
      });

      return {
        ...prev,
        comprobantes_transporte: nuevosComprobantesTrans,
      };
    });
  };

  // Cerrar compra
  const handleCerrarCompra = async () => {
    try {
      setLoadingCerrar(true);
      const res = await CompraCarbonService.cerrarCompra(idCompraCarbon);
      if (res.success) {
        notifySuccess("Compra de carbón cerrada satisfactoriamente");
        huboCambiosRef.current = true;
        setOpenConfirmCerrar(false);
        cargarDetalle(true);
      } else {
        notifyError(res.message || "Error al cerrar la compra");
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoadingCerrar(false);
    }
  };

  const handleCerrarModal = () => {
    if (huboCambiosRef.current) {
      onRefresh();
    }
    onClose();
  };

  const estaCerrada =
    cabecera?.estado === "Cerrado" ||
    cabecera?.estado === "Anulado" ||
    cabecera?.estado === "Pagado";
  const puedeCerrar = !estaCerrada && (detalle?.cargas?.length ?? 0) >= 1;

  if ((loading && !detalle) || !cabecera) {
    return (
      <ModalEstandar
        opened
        close={handleCerrarModal}
        title="Liquidación y Pagos"
        size="90rem"
        validateClose
      >
        <Paper p="xl" className="bg-zinc-950 text-center">
          <Text size="sm" c="gray">
            Cargando detalle de la orden de compra y liquidación...
          </Text>
        </Paper>
      </ModalEstandar>
    );
  }

  const rightSection = (
    <Group gap="md" align="center">
      <Text size="xs" c="gray">
        Proveedor:{" "}
        <span className="text-zinc-200 font-semibold">
          {cabecera.proveedor}
        </span>{" "}
        ({cabecera.proveedor_ruc || cabecera.proveedor_dni})
      </Text>

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
      </Group>
    </Group>
  );

  return (
    <>
      <ModalEstandar
        opened
        close={handleCerrarModal}
        title={`Liquidación y Pagos — ${cabecera.correlativo}`}
        size="90rem"
        validateClose
        rightSection={rightSection}
      >
        <Stack gap="md">
          {/* Tabs de Gestión: Carbón y Transporte */}
          <Tabs defaultValue="proveedor" color="indigo">
            <Tabs.List className="border-b border-zinc-800">
              <Tabs.Tab
                value="proveedor"
                leftSection={<IconReceipt size={15} />}
              >
                Liquidación de Carbón
              </Tabs.Tab>
              <Tabs.Tab value="fletes" leftSection={<IconCoin size={15} />}>
                Liquidación de Transporte
              </Tabs.Tab>
            </Tabs.List>

            {/* Panel 1: Liquidación de Carbón */}
            <Tabs.Panel value="proveedor" pt="md">
              {cabecera.aplica_igv ? (
                /* CON IGV: COMPROBANTES Y PAGOS */
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="sm" fw={700} c="white">
                        Comprobantes / Facturas del Proveedor
                      </Text>
                      <Text size="xs" c="gray">
                        {cargasSinComprobanteProv.length} carga(s) pendiente(s)
                        de asociar a comprobante
                      </Text>
                    </div>
                    {!estaCerrada && cargasSinComprobanteProv.length > 0 && (
                      <Button
                        size="xs"
                        radius="lg"
                        color="indigo"
                        leftSection={<IconPlus size={15} />}
                        onClick={() => setModalComprobanteProv(true)}
                      >
                        Registrar Factura Proveedor
                      </Button>
                    )}
                  </Group>

                  {comprobantesProveedor.length === 0 ? (
                    <Paper
                      p="md"
                      radius="lg"
                      className="bg-zinc-900/60 border border-zinc-800 text-center"
                    >
                      <Text size="xs" c="gray">
                        Aún no se han registrado comprobantes. Las cargas
                        entregadas deben agruparse en facturas.
                      </Text>
                    </Paper>
                  ) : (
                    comprobantesProveedor.map((cmp) => (
                      <Paper
                        key={cmp.id_comprobante_compra_carbon}
                        p="md"
                        radius="lg"
                        className="bg-zinc-900/60 border border-zinc-800"
                      >
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Group gap="xs">
                              <Text size="sm" fw={800} c="white">
                                Factura: {cmp.codigo_comprobante}
                              </Text>
                              <Badge
                                color={
                                  cmp.estado === "Pagado" ? "teal" : "yellow"
                                }
                                variant="light"
                                size="xs"
                              >
                                {cmp.estado}
                              </Badge>
                              {cmp.con_detraccion && (
                                <Badge
                                  color="orange"
                                  variant="outline"
                                  size="xs"
                                >
                                  Detracción{" "}
                                  {formatNumber(cmp.porcentaje_detraccion)}%
                                </Badge>
                              )}
                            </Group>
                            <Text size="xs" c="gray" mt={1}>
                              Emisión:{" "}
                              {dayjs(cmp.fecha_emision).format("DD/MM/YYYY")} ·
                              Registrado por: {cmp.empleado_registro}
                            </Text>
                          </div>

                          {cmp.estado !== "Pagado" && (
                            <Button
                              size="xs"
                              radius="lg"
                              color="indigo"
                              variant="light"
                              leftSection={<IconCoin size={15} />}
                              onClick={() =>
                                setModalPagoProv({
                                  comprobante: cmp,
                                })
                              }
                            >
                              Registrar Pago
                            </Button>
                          )}
                        </Group>

                        <SimpleGrid
                          cols={{ base: 2, md: 4 }}
                          spacing="sm"
                          mt="sm"
                        >
                          <Paper p="xs" className="bg-zinc-950/40 rounded-lg">
                            <Text size="xs" c="gray">
                              Total Facturado
                            </Text>
                            <Text size="sm" fw={700} c="white">
                              S/ {formatNumber(cmp.total)}
                            </Text>
                          </Paper>
                          {cmp.con_detraccion && (
                            <Paper p="xs" className="bg-zinc-950/40 rounded-lg">
                              <Text size="xs" c="gray">
                                Detracción (
                                {formatNumber(cmp.porcentaje_detraccion)}%)
                              </Text>
                              <Text size="sm" fw={700} c="orange">
                                S/ {formatNumber(cmp.monto_detraccion)}
                              </Text>
                              <Text size="xs" c="gray">
                                Pendiente: S/{" "}
                                {formatNumber(
                                  Math.max(
                                    0,
                                    Number(cmp.monto_detraccion) -
                                      Number(cmp.avance_pago_detraccion),
                                  ),
                                )}
                              </Text>
                            </Paper>
                          )}
                          <Paper p="xs" className="bg-zinc-950/40 rounded-lg">
                            <Text size="xs" c="gray">
                              Anticipos Amortizados
                            </Text>
                            <Text size="sm" fw={700} c="teal">
                              S/ {formatNumber(cmp.monto_pagado_anticipos)}
                            </Text>
                          </Paper>
                          <Paper p="xs" className="bg-zinc-950/40 rounded-lg">
                            <Text size="xs" c="gray">
                              Neto por Pagar en Banco
                            </Text>
                            <Text size="sm" fw={700} c="white">
                              S/ {formatNumber(cmp.total_neto)}
                            </Text>
                            <Text size="xs" c="gray">
                              Pendiente: S/{" "}
                              {formatNumber(
                                Math.max(
                                  0,
                                  Number(cmp.total_neto) -
                                    Number(cmp.avance_pago_neto),
                                ),
                              )}
                            </Text>
                          </Paper>
                        </SimpleGrid>

                        {/* Cargas que abarca esta Factura */}
                        {(() => {
                          const cargasDelCmp = cargas.filter(
                            (c) =>
                              c.id_comprobante_compra_carbon ===
                              cmp.id_comprobante_compra_carbon,
                          );
                          if (cargasDelCmp.length === 0) return null;
                          const totalTn = cargasDelCmp.reduce(
                            (acc, c) => acc + Number(c.cantidad),
                            0,
                          );
                          return (
                            <Paper
                              p="xs"
                              mt="sm"
                              className="bg-zinc-950/40 rounded-lg border border-zinc-800/80"
                            >
                              <Group justify="space-between" mb={6}>
                                <Group gap="xs">
                                  <Text size="xs" fw={700} c="white">
                                    Cargas amparadas ({cargasDelCmp.length}):
                                  </Text>
                                  <Badge
                                    size="xs"
                                    variant="light"
                                    color="indigo"
                                  >
                                    {formatNumber(totalTn, 2)} TN total
                                  </Badge>
                                </Group>
                              </Group>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {cargasDelCmp.map((c) => (
                                  <Group
                                    key={c.id_carga_compra_carbon}
                                    justify="space-between"
                                    p="xs"
                                    className="bg-zinc-800 rounded-md border border-zinc-700"
                                  >
                                    <Group gap="xs">
                                      <Badge
                                        size="xs"
                                        variant="outline"
                                        color="gray"
                                      >
                                        Ticket: {c.codigo_ticket_balanza}
                                      </Badge>
                                      <Text size="xs" fw={700} c="white">
                                        Placa: {c.placa}
                                      </Text>
                                      <Text size="xs" c="gray">
                                        {c.tipo_carbon_nombre} ·{" "}
                                        {formatNumber(c.cantidad, 2)} TN
                                      </Text>
                                      {c.porcentaje_ceniza > 0 && (
                                        <Text size="xs" c="gray">
                                          (
                                          {formatNumber(c.porcentaje_ceniza, 2)}
                                          % ceniza)
                                        </Text>
                                      )}
                                      <Text size="xs" fw={700} c="zinc.200">
                                        S/{" "}
                                        {formatNumber(
                                          c.subtotal_con_descuento ||
                                            c.subtotal_antes_descuento,
                                        )}
                                      </Text>
                                    </Group>
                                  </Group>
                                ))}
                              </div>
                            </Paper>
                          );
                        })()}

                        {/* Anticipos aplicados a esta Factura */}
                        {cmp.anticipos_aplicados &&
                          cmp.anticipos_aplicados.length > 0 && (
                            <Paper
                              p="xs"
                              mt="sm"
                              className="bg-zinc-950/40 rounded-lg border border-emerald-900/40"
                            >
                              <Group justify="space-between" mb={6}>
                                <Text size="xs" fw={700} c="emerald.400">
                                  Anticipos amortizados (
                                  {cmp.anticipos_aplicados.length}):
                                </Text>
                                <Text size="xs" fw={700} c="emerald.400">
                                  Total: S/{" "}
                                  {formatNumber(cmp.monto_pagado_anticipos)}
                                </Text>
                              </Group>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                                {cmp.anticipos_aplicados.map((ant) => (
                                  <div
                                    key={ant.id_transaccion}
                                    className="flex items-center justify-between gap-1.5 px-2 py-1.5 bg-zinc-800 rounded border border-zinc-600 min-w-0"
                                  >
                                    <div className="flex items-center gap-1.5 truncate text-[11px]">
                                      {ant.codigo_comprobante && (
                                        <Badge
                                          size="xs"
                                          color="cyan"
                                          variant="outline"
                                          className="px-1 py-0 h-4 text-[10px]"
                                        >
                                          Doc: {ant.codigo_comprobante}
                                        </Badge>
                                      )}
                                      <span className="text-zinc-300 truncate">
                                        {ant.medio_pago}
                                        {ant.numero_operacion
                                          ? ` · Op: ${ant.numero_operacion}`
                                          : ""}
                                      </span>
                                      {ant.fecha_hora_pago && (
                                        <span className="text-zinc-300 whitespace-nowrap">
                                          ·{" "}
                                          {dayjs(ant.fecha_hora_pago).format(
                                            "DD/MM/YYYY",
                                          )}
                                        </span>
                                      )}
                                    </div>

                                    <Text
                                      size="xs"
                                      fw={700}
                                      c="red"
                                      className="shrink-0 whitespace-nowrap"
                                    >
                                      - S/ {formatNumber(ant.monto_retirado)}
                                    </Text>
                                  </div>
                                ))}
                              </div>
                            </Paper>
                          )}

                        {/* Pagos Realizados al Comprobante */}
                        {cmp.pagos && cmp.pagos.length > 0 && (
                          <Stack gap={4} mt="sm">
                            <Text size="xs" fw={700} c="white">
                              Pagos Registrados ({cmp.pagos.length}):
                            </Text>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {cmp.pagos.map((p) => (
                                <Paper
                                  key={p.id_pago_compra_carbon}
                                  p="xs"
                                  radius="md"
                                  className="bg-zinc-800 border border-zinc-700 min-w-0 flex flex-col justify-between gap-2"
                                >
                                  <div className="space-y-1 min-w-0">
                                    <Group
                                      justify="space-between"
                                      wrap="nowrap"
                                      gap="xs"
                                    >
                                      <Group
                                        gap="xs"
                                        wrap="nowrap"
                                        className="min-w-0"
                                      >
                                        {p.es_para_detraccion ? (
                                          <Badge
                                            color="orange"
                                            variant="light"
                                            size="xs"
                                            className="shrink-0"
                                          >
                                            Detracción
                                          </Badge>
                                        ) : (
                                          <Badge
                                            color="teal"
                                            variant="light"
                                            size="xs"
                                            className="shrink-0"
                                          >
                                            Neto
                                          </Badge>
                                        )}
                                      </Group>
                                      <Text
                                        size="sm"
                                        fw={700}
                                        c="white"
                                        className="shrink-0 whitespace-nowrap"
                                      >
                                        S/ {formatNumber(p.monto_pagado)}
                                      </Text>
                                    </Group>

                                    <Text
                                      size="xs"
                                      c="gray"
                                      className="truncate"
                                    >
                                      {p.medio_pago} · Op:{" "}
                                      {p.numero_operacion || "S/N"}
                                    </Text>
                                    <Text
                                      size="xs"
                                      c="gray"
                                      className="truncate"
                                    >
                                      {dayjs(p.fecha_hora_pago).format(
                                        "DD/MM/YYYY HH:mm",
                                      )}{" "}
                                      · {p.empresa_banco} →{" "}
                                      {p.proveedor_banco || "Efectivo"}
                                    </Text>
                                  </div>
                                </Paper>
                              ))}
                            </div>
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
                        Pagos Directos al Proveedor (Modalidad Sin IGV)
                      </Text>
                      <Text size="xs" c="gray">
                        {cargasSinPagoDirecto.length} carga(s) pendiente(s) de
                        pago directo
                      </Text>
                    </div>
                    {!estaCerrada && cargasSinPagoDirecto.length > 0 && (
                      <Button
                        size="xs"
                        radius="lg"
                        color="indigo"
                        leftSection={<IconCoin size={15} />}
                        onClick={() => {
                          setModalPagoProv({ comprobante: null });
                        }}
                      >
                        Registrar Pago Directo
                      </Button>
                    )}
                  </Group>

                  {pagosDirectos.length === 0 ? (
                    <Paper
                      p="md"
                      radius="lg"
                      className="bg-zinc-900/60 border border-zinc-800 text-center"
                    >
                      <Text size="xs" c="gray">
                        Aún no se han registrado pagos directos para esta
                        compra.
                      </Text>
                    </Paper>
                  ) : (
                    pagosDirectos.map((p) => (
                      <Paper
                        key={p.id_pago_compra_carbon}
                        p="md"
                        radius="lg"
                        className="bg-zinc-900/60 border border-zinc-800"
                      >
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Group gap="xs">
                              <Text size="sm" fw={800} c="white">
                                Pago #{p.id_pago_compra_carbon}
                              </Text>
                              <Badge color="teal" variant="light" size="xs">
                                {p.medio_pago}
                              </Badge>
                              {p.numero_operacion && (
                                <Text size="xs" c="gray">
                                  Op: {p.numero_operacion}
                                </Text>
                              )}
                            </Group>
                            <Text size="xs" c="gray" mt={1}>
                              Fecha:{" "}
                              {dayjs(p.fecha_hora_pago).format(
                                "DD/MM/YYYY HH:mm",
                              )}{" "}
                              · Registrado por: {p.empleado_registro}
                            </Text>
                            <Text size="xs" c="gray">
                              Cuenta: {p.empresa_banco} →{" "}
                              {p.proveedor_banco || "Efectivo"}
                            </Text>
                          </div>
                          <Text size="md" fw={800} c="teal">
                            S/ {formatNumber(p.monto_pagado)}
                          </Text>
                        </Group>

                        {/* Cargas que abarca este Pago Directo */}
                        {(() => {
                          const cargasDelPago = cargas.filter(
                            (c) =>
                              c.id_pago_compra_carbon ===
                              p.id_pago_compra_carbon,
                          );
                          if (cargasDelPago.length === 0) return null;
                          const totalTn = cargasDelPago.reduce(
                            (acc, c) => acc + Number(c.cantidad),
                            0,
                          );
                          return (
                            <Paper
                              p="xs"
                              mt="sm"
                              className="bg-zinc-950/40 rounded-lg border border-zinc-800/80"
                            >
                              <Group justify="space-between" mb={6}>
                                <Group gap="xs">
                                  <Text size="xs" fw={700} c="white">
                                    Cargas amparadas ({cargasDelPago.length}):
                                  </Text>
                                  <Badge
                                    size="xs"
                                    variant="light"
                                    color="indigo"
                                  >
                                    {formatNumber(totalTn, 2)} TN total
                                  </Badge>
                                </Group>
                              </Group>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {cargasDelPago.map((c) => (
                                  <Group
                                    key={c.id_carga_compra_carbon}
                                    justify="space-between"
                                    p="xs"
                                    className="bg-zinc-900/50 rounded-md border border-zinc-800/50"
                                  >
                                    <Group gap="xs">
                                      <Badge
                                        size="xs"
                                        variant="outline"
                                        color="gray"
                                      >
                                        Ticket: {c.codigo_ticket_balanza}
                                      </Badge>
                                      <Text size="xs" fw={700} c="white">
                                        Placa: {c.placa}
                                      </Text>
                                      <Text size="xs" c="gray">
                                        {c.tipo_carbon_nombre} ·{" "}
                                        {formatNumber(c.cantidad, 2)} TN
                                      </Text>
                                    </Group>
                                    <Text size="xs" fw={700} c="zinc.200">
                                      S/{" "}
                                      {formatNumber(
                                        c.subtotal_con_descuento ||
                                          c.subtotal_antes_descuento,
                                      )}
                                    </Text>
                                  </Group>
                                ))}
                              </div>
                            </Paper>
                          );
                        })()}

                        {/* Anticipos aplicados */}
                        {p.anticipos_aplicados &&
                          p.anticipos_aplicados.length > 0 && (
                            <Paper
                              p="xs"
                              mt="sm"
                              className="bg-zinc-950/40 rounded-lg"
                            >
                              <Text size="xs" fw={700} c="white" mb={2}>
                                Anticipos amortizados con este pago:
                              </Text>
                              <Group gap="md">
                                {p.anticipos_aplicados.map((ant) => (
                                  <Text
                                    key={ant.id_transaccion}
                                    size="xs"
                                    c="gray"
                                  >
                                    Anticipo #{ant.id_anticipo_proveedor}: S/{" "}
                                    {formatNumber(ant.monto_retirado)}
                                  </Text>
                                ))}
                              </Group>
                            </Paper>
                          )}
                      </Paper>
                    ))
                  )}
                </Stack>
              )}
            </Tabs.Panel>

            {/* Panel 2: Liquidación de Transporte */}
            <Tabs.Panel value="fletes" pt="md">
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <div>
                    <Text size="sm" fw={700} c="white">
                      Facturas de Transporte / Flete
                    </Text>
                    <Text size="xs" c="gray">
                      {cargasSinComprobanteFlete.length} carga(s) con flete
                      pendiente de facturar
                    </Text>
                  </div>
                  {!estaCerrada && cargasSinComprobanteFlete.length > 0 && (
                    <Button
                      size="xs"
                      radius="lg"
                      color="indigo"
                      leftSection={<IconPlus size={15} />}
                      onClick={() => setModalComprobanteTrans(true)}
                    >
                      Registrar Factura Flete
                    </Button>
                  )}
                </Group>

                {comprobantesTransporte.length === 0 ? (
                  <Paper
                    p="md"
                    radius="lg"
                    className="bg-zinc-900/60 border border-zinc-800 text-center"
                  >
                    <Text size="xs" c="gray">
                      No hay comprobantes de transporte registrados.
                    </Text>
                  </Paper>
                ) : (
                  comprobantesTransporte.map((ct) => (
                    <Paper
                      key={ct.id_comprobante_transporte_carbon}
                      p="md"
                      radius="lg"
                      className="bg-zinc-900/60 border border-zinc-800"
                    >
                      <Group justify="space-between" align="flex-start">
                        <div>
                          <Group gap="xs">
                            <Text size="sm" fw={800} c="white">
                              Factura Flete: {ct.codigo_comprobante}
                            </Text>
                            <Badge
                              color={ct.estado === "Pagado" ? "teal" : "yellow"}
                              variant="light"
                              size="xs"
                            >
                              {ct.estado}
                            </Badge>
                            <Badge color="blue" variant="outline" size="xs">
                              {ct.transportista_razon_social}
                            </Badge>
                          </Group>
                          <Text size="xs" c="gray" mt={1}>
                            Emisión:{" "}
                            {dayjs(ct.fecha_emision).format("DD/MM/YYYY")} ·
                            Detracción {formatNumber(ct.porcentaje_detraccion)}%
                          </Text>
                        </div>

                        {ct.estado !== "Pagado" && (
                          <Button
                            size="xs"
                            radius="lg"
                            color="indigo"
                            variant="light"
                            leftSection={<IconCoin size={15} />}
                            onClick={() =>
                              setModalPagoTrans({
                                comprobante: ct,
                              })
                            }
                          >
                            Registrar Pago
                          </Button>
                        )}
                      </Group>

                      <SimpleGrid
                        cols={{ base: 2, md: 3 }}
                        spacing="sm"
                        mt="sm"
                      >
                        <Paper p="xs" className="bg-zinc-950/40 rounded-lg">
                          <Text size="xs" c="gray">
                            Total Flete
                          </Text>
                          <Text size="sm" fw={700} c="white">
                            S/ {formatNumber(ct.total)}
                          </Text>
                        </Paper>
                        {ct.con_detraccion && (
                          <Paper p="xs" className="bg-zinc-950/40 rounded-lg">
                            <Text size="xs" c="gray">
                              Detracción (
                              {formatNumber(ct.porcentaje_detraccion)}%)
                            </Text>
                            <Text size="sm" fw={700} c="orange">
                              S/ {formatNumber(ct.monto_detraccion)}
                            </Text>
                            <Text size="xs" c="gray">
                              Pendiente: S/{" "}
                              {formatNumber(
                                Math.max(
                                  0,
                                  Number(ct.monto_detraccion) -
                                    Number(ct.avance_pago_detraccion),
                                ),
                              )}
                            </Text>
                          </Paper>
                        )}
                        <Paper p="xs" className="bg-zinc-950/40 rounded-lg">
                          <Text size="xs" c="gray">
                            Neto por Pagar en Banco
                          </Text>
                          <Text size="sm" fw={700} c="white">
                            S/ {formatNumber(ct.total_neto)}
                          </Text>
                          <Text size="xs" c="gray">
                            Pendiente: S/{" "}
                            {formatNumber(
                              Math.max(
                                0,
                                Number(ct.total_neto) -
                                  Number(ct.avance_pago_neto),
                              ),
                            )}
                          </Text>
                        </Paper>
                      </SimpleGrid>

                      {/* Cargas transportadas que abarca esta factura de flete */}
                      {(() => {
                        const cargasDelFlete = cargas.filter(
                          (c) =>
                            c.id_comprobante_transporte_carbon ===
                            ct.id_comprobante_transporte_carbon,
                        );
                        if (cargasDelFlete.length === 0) return null;
                        const totalTn = cargasDelFlete.reduce(
                          (acc, c) => acc + Number(c.cantidad),
                          0,
                        );
                        return (
                          <Paper
                            p="xs"
                            mt="sm"
                            className="bg-zinc-950/40 rounded-lg border border-zinc-800/80"
                          >
                            <Group justify="space-between" mb={6}>
                              <Group gap="xs">
                                <Text size="xs" fw={700} c="white">
                                  Cargas transportadas ({cargasDelFlete.length}
                                  ):
                                </Text>
                                <Badge size="xs" variant="light" color="indigo">
                                  {formatNumber(totalTn, 2)} TN total
                                </Badge>
                              </Group>
                            </Group>
                            <div className="space-y-1.5">
                              {cargasDelFlete.map((c) => (
                                <Group
                                  key={c.id_carga_compra_carbon}
                                  justify="space-between"
                                  p="xs"
                                  className="bg-zinc-900/50 rounded-md border border-zinc-800/50"
                                >
                                  <Group gap="xs">
                                    <Badge
                                      size="xs"
                                      variant="outline"
                                      color="gray"
                                    >
                                      Ticket: {c.codigo_ticket_balanza}
                                    </Badge>
                                    <Text size="xs" fw={700} c="white">
                                      Placa: {c.placa}
                                    </Text>
                                    <Text size="xs" c="gray">
                                      {formatNumber(c.cantidad, 2)} TN · Flete:
                                      S/{" "}
                                      {formatNumber(c.costo_flete_por_tonelada)}
                                      /TN
                                    </Text>
                                    <Text size="xs" fw={700} c="zinc.200">
                                      S/{" "}
                                      {formatNumber(
                                        c.descuento_flete ||
                                          Number(c.cantidad) *
                                            Number(c.costo_flete_por_tonelada),
                                      )}
                                    </Text>
                                  </Group>
                                </Group>
                              ))}
                            </div>
                          </Paper>
                        );
                      })()}

                      {/* Pagos a esta factura de transporte */}
                      {ct.pagos && ct.pagos.length > 0 && (
                        <Stack gap={4} mt="sm">
                          <Text size="xs" fw={700} c="white">
                            Pagos Registrados ({ct.pagos.length}):
                          </Text>
                          {ct.pagos.map((p) => (
                            <Paper
                              key={p.id_pago_transporte_carbon}
                              p="xs"
                              radius="md"
                              className="bg-zinc-950/50 border border-zinc-800"
                            >
                              <Group justify="space-between">
                                <div>
                                  <Group gap="xs">
                                    <Text size="xs" fw={700} c="white">
                                      Pago #{p.id_pago_transporte_carbon}
                                    </Text>
                                    {p.es_para_detraccion ? (
                                      <Badge
                                        color="orange"
                                        variant="light"
                                        size="xs"
                                      >
                                        Detracción
                                      </Badge>
                                    ) : (
                                      <Badge
                                        color="teal"
                                        variant="light"
                                        size="xs"
                                      >
                                        Pago Neto
                                      </Badge>
                                    )}
                                    <Text size="xs" c="gray">
                                      {p.medio_pago} · Op:{" "}
                                      {p.numero_operacion || "S/N"}
                                    </Text>
                                  </Group>
                                  <Text size="xs" c="gray">
                                    {dayjs(p.fecha_hora_pago).format(
                                      "DD/MM/YYYY HH:mm",
                                    )}{" "}
                                    · Cuenta: {p.empresa_banco} →{" "}
                                    {p.transportista_banco || "Efectivo"}
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
        </Stack>
      </ModalEstandar>

      {/* ────────────────── SUB-MODALES DESACOPLADOS (MODAL ESTANDAR) ────────────────── */}

      {/* 1. Modal Registrar Comprobante / Factura Proveedor */}
      {cabecera && modalComprobanteProv && (
        <ModalComprobanteProveedor
          opened={modalComprobanteProv}
          onClose={() => setModalComprobanteProv(false)}
          idCompraCarbon={idCompraCarbon}
          idProveedor={cabecera.id_proveedor}
          nombreProveedor={cabecera.proveedor}
          cargasDisponibles={cargasSinComprobanteProv}
          onSuccess={handleSuccessComprobanteProv}
        />
      )}

      {/* 2. Modal Registrar Pago Proveedor (Con Factura o Directo) */}
      {cabecera && modalPagoProv !== null && (
        <ModalPagoProveedor
          opened={modalPagoProv !== null}
          onClose={() => setModalPagoProv(null)}
          idCompraCarbon={idCompraCarbon}
          idEmpresa={cabecera.id_empresa}
          idProveedor={cabecera.id_proveedor}
          nombreProveedor={cabecera.proveedor}
          comprobante={modalPagoProv.comprobante}
          cargasDisponiblesDirectas={cargasSinPagoDirecto}
          onSuccess={handleSuccessPagoProv}
        />
      )}

      {/* 3. Modal Registrar Comprobante de Transporte */}
      {cabecera && modalComprobanteTrans && (
        <ModalComprobanteTransporte
          opened={modalComprobanteTrans}
          onClose={() => setModalComprobanteTrans(false)}
          idCompraCarbon={idCompraCarbon}
          cargasDisponiblesFlete={cargasSinComprobanteFlete}
          onSuccess={handleSuccessComprobanteTrans}
        />
      )}

      {/* 4. Modal Registrar Pago de Transporte */}
      {cabecera && modalPagoTrans !== null && (
        <ModalPagoTransporte
          opened={modalPagoTrans !== null}
          onClose={() => setModalPagoTrans(null)}
          idCompraCarbon={idCompraCarbon}
          idEmpresa={cabecera.id_empresa}
          comprobante={modalPagoTrans.comprobante}
          onSuccess={handleSuccessPagoTrans}
        />
      )}

      {/* 5. Modal Confirmación Cerrar Compra */}
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
          </Text>
          <Group justify="center" gap="sm" mt="sm" w="100%">
            <Button
              variant="default"
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
    </>
  );
};
