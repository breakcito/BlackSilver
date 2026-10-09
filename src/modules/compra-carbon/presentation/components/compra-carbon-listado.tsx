import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  BanknotesIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import type { DataTableColumn } from "mantine-datatable";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { CambiosLogHistorial } from "../../../../presentation/utils/cambios-log-historial";
import { CompraCarbonService } from "../../service/compra-carbon.service";
import { useNotify } from "../../../../hooks/useNotify";
import { usePrint } from "../../../../hooks/usePrint";
import { useAnularCompraCarbon } from "../../hooks/useAnularCompraCarbon";
import { ModalRegistroCargas } from "../modal-registro-cargas";
import { ModalLiquidacionPagos } from "../modal-liquidacion-pagos";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { EstadoCompraCarbon } from "../../../../shared/enums/compra-carbon/estado-compra-carbon";
import type {
  CargaCompraCarbonItem,
  CompraCarbonDetalleResponse,
  CompraCarbonResumen,
} from "../../service/compra-carbon.responses";
import type { RES_Empresa } from "../../../../service/responses/empresa";
import type { ProveedorResponse } from "../../../../modules/proveedores/service/proveedores.responses";

interface Props {
  compras: CompraCarbonResumen[];
  busqueda: string;
  empresasById: Record<number, RES_Empresa>;
  proveedoresById: Record<number, ProveedorResponse>;
  onAprobada?: (cabecera: CompraCarbonResumen) => void;
  onAnulada?: (cabecera: CompraCarbonResumen) => void;
  /** Reimprime el PDF de la cotización preliminar. */
  onReimprimir?: (compra: CompraCarbonResumen) => void;
  /** Compra recién registrada a imprimir automáticamente al montarse. */
  autoPrint?: CompraCarbonResumen | null;
  /** Callback cuando el listado ya procesó el autoPrint. */
  onAutoPrintConsumido?: () => void;
  onRefresh?: () => void;
}

const formatPEN = (n: number) => `S/ ${formatNumber(n)}`;

/**
 * Los seis estados de `EstadoCompraCarbon`.
 */
const estadoBadge = (
  estado: string | null,
): { color: string; label: string } => {
  const e = (estado ?? "").toString();
  switch (e) {
    case EstadoCompraCarbon.Preliminar:
      return { color: "gray", label: "Preliminar" };
    case EstadoCompraCarbon.Confirmado:
      return { color: "blue", label: "Confirmado" };
    case EstadoCompraCarbon.LiquidacionAprobada:
      return { color: "teal", label: "Liquidación aprobada" };
    case EstadoCompraCarbon.EnProcesoPago:
      return { color: "yellow", label: "En proceso de pago" };
    case EstadoCompraCarbon.Pagado:
      return { color: "emerald", label: "Pagado" };
    case EstadoCompraCarbon.Anulado:
      return { color: "red", label: "Anulado" };
    default:
      return { color: "gray", label: e || "—" };
  }
};

const lugarLabel = (d: CargaCompraCarbonItem): string => {
  return (
    [d.lugar_extraccion_nombre, d.lugar_extraccion_direccion]
      .filter(Boolean)
      .join(" · ") || "—"
  );
};

export const CompraCarbonListado = ({
  compras,
  busqueda,
  empresasById,
  proveedoresById,
  onAprobada: _onAprobada,
  onAnulada,
  onReimprimir: _onReimprimir,
  autoPrint,
  onAutoPrintConsumido,
  onRefresh,
}: Props) => {
  const { notifyError } = useNotify();
  const { print, prepare } = usePrint();
  const { anular, loading: loadingAnular } = useAnularCompraCarbon();

  // Modales de flujo
  const [modalCargas, setModalCargas] = useState<CompraCarbonResumen | null>(
    null,
  );
  const [modalLiquidacion, setModalLiquidacion] =
    useState<CompraCarbonResumen | null>(null);
  const [modalHistorial, setModalHistorial] = useState<{
    correlativo: string;
    log: unknown;
  } | null>(null);

  const [openAnularModal, setOpenAnularModal] = useState<{
    id: number;
    correlativo: string;
  } | null>(null);
  const [detallesModal, setDetallesModal] = useState<{
    compra: CompraCarbonResumen;
    data: CompraCarbonDetalleResponse | null;
    loading: boolean;
  } | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [printingId, setPrintingId] = useState<number | null>(null);

  const ordenadas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    const base = !term
      ? compras
      : compras.filter(
          (c) =>
            c.correlativo.toLowerCase().includes(term) ||
            c.empresa.toLowerCase().includes(term) ||
            c.proveedor.toLowerCase().includes(term),
        );
    return base.slice().sort((a, b) => b.id_compra_carbon - a.id_compra_carbon);
  }, [compras, busqueda]);

  const handleAnular = async () => {
    if (!openAnularModal) return;
    const { id } = openAnularModal;
    const compra = compras.find((c) => c.id_compra_carbon === id);
    const result = await anular(id);
    if (!result || !compra) {
      setOpenAnularModal(null);
      return;
    }
    onAnulada?.({
      ...compra,
      estado: EstadoCompraCarbon.Anulado,
    });
    setOpenAnularModal(null);
  };

  const handleVerDetalles = async (compra: CompraCarbonResumen) => {
    setDetallesModal({ compra, data: null, loading: true });
    try {
      const resp = await CompraCarbonService.getCompraConDetalles(
        compra.id_compra_carbon,
      );
      if (!resp.success) {
        notifyError(resp.message || "No se pudo cargar el detalle");
        setDetallesModal(null);
        return;
      }
      setDetallesModal({ compra, data: resp.data, loading: false });
    } catch (e) {
      console.error(e);
      notifyError("Error al cargar el detalle de la compra");
      setDetallesModal(null);
    }
  };

  // Auto-imprimir la compra recién registrada.
  useEffect(() => {
    if (!autoPrint) return;
    void handlePrint(autoPrint);
    onAutoPrintConsumido?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  const handlePrint = async (compra: CompraCarbonResumen) => {
    const empresa = empresasById[compra.id_empresa];
    if (!empresa) {
      notifyError("No se encontró la empresa para generar el PDF");
      return;
    }
    setPrintingId(compra.id_compra_carbon);
    try {
      const target = `CompraCarbon_${compra.correlativo}_${Date.now()}`;
      prepare(target);
      const CompraCarbonPDFModule = await import("../compra-carbon-pdf");
      const CompraCarbonPDF = CompraCarbonPDFModule.CompraCarbonPDF;
      print(
        <CompraCarbonPDF
          compra={{ cabecera: compra }}
          empresa={empresa}
          proveedor={proveedoresById[compra.id_proveedor] ?? null}
          urlLogoEmpresa={empresa.url_logo ?? null}
          colorPredominante={empresa.color_predominante ?? null}
        />,
        { documentTitle: `Compra de Carbon - ${compra.correlativo}`, target },
      );
    } catch (e) {
      console.error(e);
      notifyError("Error al generar el PDF");
    } finally {
      setPrintingId(null);
    }
  };

  const columns: DataTableColumn<CompraCarbonResumen>[] = [
    {
      accessor: "index",
      title: "#",
      width: 60,
      textAlign: "center",
    },
    {
      accessor: "correlativo",
      title: "Correlativo",
      width: 140,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <Text fw={800} size="xs" c="indigo.3" className="font-mono">
          {r.correlativo}
        </Text>
      ),
    },
    // {
    //   accessor: "created_at",
    //   title: "Fecha",
    //   width: 150,
    //   textAlign: "center",
    //   render: (r: CompraCarbonResumen) => (
    //     <Text size="xs" c="zinc.3" className="font-mono">
    //       {formatDateTime(r.created_at)}
    //     </Text>
    //   ),
    // },
    {
      accessor: "empresa",
      title: "Empresa",
      width: 160,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <Text size="xs" fw={700} className="text-white">
          {r.empresa}
        </Text>
      ),
    },
    {
      accessor: "proveedor",
      title: "Proveedor",
      width: 180,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => {
        const doc =
          r.proveedor_tipo_entidad === "Natural" && r.proveedor_dni
            ? `DNI: ${r.proveedor_dni}`
            : r.proveedor_ruc
              ? `RUC: ${r.proveedor_ruc}`
              : "";
        return (
          <Stack gap={0}>
            <Text size="xs" fw={700} className="text-zinc-100 truncate">
              {r.proveedor}
            </Text>
            {doc && (
              <Text size="10px" c="gray.5" className="font-mono" fw={600}>
                {doc}
              </Text>
            )}
          </Stack>
        );
      },
    },
    // {
    //   accessor: "proveedor_contacto",
    //   title: "Contacto",
    //   width: 100,
    //   textAlign: "center",
    //   render: (r: CompraCarbonResumen) => {
    //     const prov = proveedoresById[r.id_proveedor];
    //     if (!prov) return null;
    //     return (
    //       <Stack gap={0}>
    //         {prov.telefono && (
    //           <Text size="10px" c="zinc.3" className="font-mono">
    //             {prov.telefono}
    //           </Text>
    //         )}
    //         {prov.correo && (
    //           <Text size="10px" c="dimmed" className="truncate">
    //             {prov.correo}
    //           </Text>
    //         )}
    //         {!prov.telefono && !prov.correo && (
    //           <Text size="xs" c="dimmed" fs="italic">
    //             —
    //           </Text>
    //         )}
    //       </Stack>
    //     );
    //   },
    // },
    {
      accessor: "tipo_carbon_prometido",
      title: "Tipo Carbón",
      width: 140,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <Stack gap={2} align="center">
          <Text size="xs" fw={700} className="text-zinc-200">
            {r.tipo_carbon_prometido || "—"}
          </Text>
          {r.tipo_carbon_prometido_codigo && (
            <Badge size="xs" color="cyan" variant="filled" radius="sm">
              {r.tipo_carbon_prometido_codigo}
            </Badge>
          )}
        </Stack>
      ),
    },

    // {
    //   accessor: "aplica_igv",
    //   title: "Aplica IGV",
    //   width: 100,
    //   textAlign: "center",
    //   render: (r: CompraCarbonResumen) =>
    //     r.aplica_igv ? (
    //       <Badge variant="light" color="indigo" radius="md" size="sm">
    //         Si · {formatNumber(Number(r.porcentaje_igv))}%
    //       </Badge>
    //     ) : (
    //       <Badge variant="light" color="pink" radius="md" size="sm">
    //         No
    //       </Badge>
    //     ),
    // },
    {
      accessor: "total_cotizado",
      title: "Cotizado",
      width: 140,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <Stack gap={2} align="center">
          <Text size="xs" c="lime" fw={800}>
            {formatNumber(r.toneladas_prometidas)} TN
          </Text>
          <Text size="xs" c="gray" className="font-mono" fw={800}>
            S/. {formatNumber(r.total_cotizado)}
          </Text>
          {r.aplica_igv == 1 && (
            <Badge variant="light" color="indigo" radius="md" size="sm">
              Con IGV · {formatNumber(r.porcentaje_igv)}%
            </Badge>
          )}
        </Stack>
      ),
    },
    {
      accessor: "total_real_con_descuento",
      title: "Avance",
      width: 140,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <Stack gap={2} align="center">
          <Text size="xs" c="teal" fw={800}>
            {formatNumber(Number(r.total_toneladas_reales), 2)} TN
          </Text>
          <Text size="xs" c="white" className="font-mono" fw={800}>
            S/. {formatNumber(r.total_real_con_descuento)}
          </Text>
        </Stack>
      ),
    },
    {
      accessor: "cargas",
      title: "Cargas",
      width: 100,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <div className="flex items-center justify-center gap-2">
          <Badge variant="light" color="cyan" radius="md" size="md">
            {r.cantidad_cargas ?? r.cantidad_items ?? 0}
          </Badge>
          <Tooltip label="Ver cargas" withArrow position="top">
            <ActionIcon
              variant="light"
              color="cyan"
              radius="xl"
              size="md"
              onClick={(e) => {
                e.stopPropagation();
                handleVerDetalles(r);
              }}
            >
              <EyeIcon className="w-4 h-4" />
            </ActionIcon>
          </Tooltip>
        </div>
      ),
    },
    // {
    //   accessor: "registrado_por",
    //   title: "Registrado por",
    //   width: 160,
    //   render: (r: CompraCarbonResumen) => (
    //     <Stack gap={0}>
    //       <Text size="xs" className="text-zinc-200 truncate">
    //         {r.empleado_registro}
    //       </Text>
    //       <Text size="11px" c="gray.5" className="font-mono">
    //         {formatDateTime(r.created_at)}
    //       </Text>
    //     </Stack>
    //   ),
    // },
    {
      accessor: "estado",
      title: "Estado",
      width: 180,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => {
        const b = estadoBadge(r.estado);
        return (
          <Badge color={b.color} variant="light" size="sm" radius="sm">
            {b.label}
          </Badge>
        );
      },
    },
    {
      accessor: "acciones",
      title: "Acciones",
      width: 180,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => {
        const esAnulado = r.estado === EstadoCompraCarbon.Anulado;
        const esPagado = r.estado === EstadoCompraCarbon.Pagado;
        const puedeRegistrarCarga = !esAnulado && !esPagado;
        const puedeLiquidar = !esAnulado;
        const puedeAnular = !esAnulado && !esPagado && r.cantidad_items === 0;
        const isPrinting = printingId === r.id_compra_carbon;
        const tieneCambios =
          r.log_cambios &&
          (Array.isArray(r.log_cambios)
            ? r.log_cambios.length > 0
            : typeof r.log_cambios === "string" && r.log_cambios !== "[]");

        return (
          <Group gap={6} justify="center" wrap="nowrap">
            {/* 1. Registrar Carga */}
            {puedeRegistrarCarga && (
              <Tooltip label="Registrar carga" withArrow position="top">
                <ActionIcon
                  variant="filled"
                  color="blue"
                  radius="xl"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalCargas(r);
                  }}
                >
                  <TruckIcon className="w-4 h-4 text-white" />
                </ActionIcon>
              </Tooltip>
            )}

            {/* 2. Liquidación y Pagos */}
            {puedeLiquidar && (
              <Tooltip label="Liquidación y Pagos" withArrow position="top">
                <ActionIcon
                  variant="filled"
                  color="teal"
                  radius="xl"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalLiquidacion(r);
                  }}
                >
                  <BanknotesIcon className="w-4 h-4 text-white" />
                </ActionIcon>
              </Tooltip>
            )}

            {/* 4. PDF (Cotización preliminar) */}
            <Tooltip label="Ver documento (PDF)" withArrow position="top">
              <ActionIcon
                variant="light"
                color="indigo"
                radius="xl"
                size="md"
                loading={isPrinting}
                disabled={!empresasById[r.id_empresa]}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrint(r);
                }}
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>

            {/* 5. Historial de cambios */}
            {tieneCambios && (
              <Tooltip label="Historial de cambios" withArrow position="top">
                <ActionIcon
                  variant="light"
                  color="gray"
                  radius="xl"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalHistorial({
                      correlativo: r.correlativo,
                      log: r.log_cambios,
                    });
                  }}
                >
                  <ClockIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            )}

            {/* 6. Anular */}
            {puedeAnular && (
              <Tooltip label="Anular orden preliminar" withArrow position="top">
                <ActionIcon
                  variant="light"
                  color="red"
                  radius="xl"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenAnularModal({
                      id: r.id_compra_carbon,
                      correlativo: r.correlativo,
                    });
                  }}
                >
                  <XCircleIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        );
      },
    },
  ];

  if (ordenadas.length === 0) {
    return (
      <div className="border border-dashed border-zinc-800 rounded-xl px-4 py-10 text-center">
        <Text size="sm" c="dimmed" fs="italic">
          {busqueda
            ? "Sin resultados para la busqueda."
            : "Aun no hay compras de carbon registradas."}
        </Text>
      </div>
    );
  }

  return (
    <>
      <DataTableEstandar
        idAccessor="id_compra_carbon"
        columns={columns}
        records={ordenadas}
        loading={false}
        initialPageSize={15}
        // onRowClick={({ record }: { record: CompraCarbonResumen }) =>
        //   handleVerDetalles(record)
        // }
      />

      {/* Modal de detalle (al click en fila o en el ojo) */}
      <ModalEstandar
        opened={detallesModal !== null}
        close={() => setDetallesModal(null)}
        title={
          detallesModal
            ? `Cargas de ${detallesModal.compra.correlativo}`
            : "Cargas"
        }
        size="90rem"
      >
        {detallesModal && (
          <div className="space-y-4">
            {/* Resumen financiero */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <Text
                size="xs"
                fw={800}
                c="zinc.4"
                className="uppercase tracking-widest mb-3"
              >
                Resumen financiero
              </Text>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    Total Cotizado:{" "}
                    <span className="text-zinc-300 font-bold font-mono">
                      {formatPEN(Number(detallesModal.compra.total_cotizado))}
                    </span>
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    IGV Cotizado
                    {detallesModal.compra.aplica_igv
                      ? ` (${formatNumber(Number(detallesModal.compra.porcentaje_igv))}%)`
                      : ""}
                    :{" "}
                    <span className="text-zinc-300 font-bold font-mono">
                      {formatPEN(
                        Number(detallesModal.compra.monto_igv_cotizado),
                      )}
                    </span>
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    Total Real con Descuento:{" "}
                    <span className="text-emerald-400 font-bold font-mono">
                      {formatPEN(
                        Number(detallesModal.compra.total_real_con_descuento),
                      )}
                    </span>
                  </Text>
                </Group>
                {!detallesModal.compra.aplica_igv && (
                  <Badge color="gray" variant="light" size="xs" radius="sm">
                    Pago neto (sin IGV)
                  </Badge>
                )}
              </div>
            </div>

            {detallesModal.loading && (
              <Stack align="center" gap="md" py="xl">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Text
                  size="xs"
                  c="dimmed"
                  className="uppercase tracking-widest"
                >
                  Cargando cargas...
                </Text>
              </Stack>
            )}

            {!detallesModal.loading && detallesModal.data && (
              <div className="space-y-2">
                <Group gap="xs" mb="xs">
                  <Text
                    size="xs"
                    fw={800}
                    c="zinc.4"
                    className="uppercase tracking-widest"
                  >
                    Cargas Recibidas ({detallesModal.data.cargas.length})
                  </Text>
                </Group>

                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  <table className="w-full text-xs text-zinc-300">
                    <thead className="bg-zinc-900 text-zinc.400 text-[11px] font-medium uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-center w-10">#</th>
                        <th className="py-2 text-center w-30">Tipo</th>
                        <th className="px-3 py-2 text-center w-20">Ceniza</th>
                        <th className="px-3 py-2 text-center w-20">Humedad</th>
                        <th className="px-3 py-2 text-center w-24">
                          Toneladas
                        </th>
                        <th className="px-3 py-2 text-center w-28">
                          Precio × TN
                        </th>
                        <th className="px-3 py-2 text-center w-44">Lugar</th>
                        <th className="px-3 py-2 text-center w-28">Ticket</th>
                        <th className="px-3 py-2 text-center w-28">GR / GT</th>
                        <th className="px-3 py-2 text-center w-35">
                          Transportista
                        </th>
                        <th className="px-3 py-2 text-center w-24">
                          Flete × TN
                        </th>
                        <th className="px-3 py-2 text-center w-24">Subtotal</th>
                        <th className="px-3 py-2 text-center w-24">
                          (−) Flete
                        </th>
                        <th className="px-3 py-2 text-center w-28">Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-zinc-900/40">
                      {detallesModal.data.cargas.map(
                        (d: CargaCompraCarbonItem, idx: number) => {
                          const lugar = lugarLabel(d);
                          return (
                            <tr
                              key={d.id_carga_compra_carbon}
                              className="hover:bg-white/5 transition-colors"
                            >
                              <td className="px-3 py-2 text-center text-zinc-500">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2 flex justify-center">
                                <Stack gap={4} justify="center" align="center">
                                  <Text fw={700} c="zinc.100" size="xs">
                                    {d.tipo_carbon_nombre}
                                  </Text>
                                  {d.tipo_carbon_codigo && (
                                    <Badge
                                      size="xs"
                                      color="cyan"
                                      variant="filled"
                                      radius="sm"
                                    >
                                      {d.tipo_carbon_codigo}
                                    </Badge>
                                  )}
                                </Stack>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {d.porcentaje_ceniza > 0 ? (
                                  <Badge
                                    variant="light"
                                    color="grape"
                                    size="sm"
                                    radius="md"
                                  >
                                    {formatNumber(Number(d.porcentaje_ceniza))}%
                                  </Badge>
                                ) : (
                                  <Text c="dimmed">—</Text>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {d.porcentaje_humedad > 0 ? (
                                  <Badge
                                    variant="light"
                                    color="blue"
                                    size="sm"
                                    radius="md"
                                  >
                                    {formatNumber(Number(d.porcentaje_humedad))}
                                    %
                                  </Badge>
                                ) : (
                                  <Text c="dimmed">—</Text>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-white">
                                {formatNumber(Number(d.cantidad))} TN
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {formatPEN(Number(d.precio_unitario))}
                              </td>
                              <td className="px-3 py-2 text-[11px] text-zinc-300">
                                {lugar || <Text c="dimmed">—</Text>}
                              </td>
                              <td className="px-3 py-2 font-mono text-zinc-300 text-center">
                                {d.codigo_ticket_balanza || (
                                  <Text c="dimmed">—</Text>
                                )}
                              </td>
                              <td className="px-3 py-2 flex flex-row justify-center">
                                <div>
                                  <Text
                                    className="font-mono text-zinc-300"
                                    size="xs"
                                  >
                                    GR: {d.guia_remitente || "—"}
                                  </Text>
                                  <Text
                                    className="font-mono text-zinc-300"
                                    size="xs"
                                  >
                                    GT: {d.guia_transportista || "—"}
                                  </Text>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-zinc.100 text-center">
                                {d.transportista_razon_social || (
                                  <Text c="dimmed">—</Text>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-yellow-400 font-bold">
                                {Number(d.costo_flete_por_tonelada) > 0
                                  ? formatPEN(
                                      Number(d.costo_flete_por_tonelada),
                                    )
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {formatPEN(Number(d.subtotal_antes_descuento))}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-yellow-400 font-bold">
                                {Number(d.descuento_flete) > 0
                                  ? `−${formatPEN(Number(d.descuento_flete))}`
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-emerald-400 font-bold">
                                {formatPEN(Number(d.subtotal_con_descuento))}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalEstandar>

      {/* Modal Registrar Cargas */}
      {modalCargas && (
        <ModalEstandar
          opened
          close={() => setModalCargas(null)}
          title={`Registrar Carga — ${modalCargas.correlativo}`}
          size="75rem"
          validateClose
        >
          <ModalRegistroCargas
            compra={modalCargas}
            onCancel={() => setModalCargas(null)}
            onSuccess={() => {
              setModalCargas(null);
              onRefresh?.();
            }}
          />
        </ModalEstandar>
      )}

      {/* Modal Liquidación y Pagos */}
      {modalLiquidacion && (
        <ModalLiquidacionPagos
          idCompraCarbon={modalLiquidacion.id_compra_carbon}
          onClose={() => setModalLiquidacion(null)}
          onRefresh={() => {
            onRefresh?.();
          }}
        />
      )}

      {/* Modal Historial de Cambios */}
      {modalHistorial && (
        <ModalEstandar
          opened
          close={() => setModalHistorial(null)}
          title={`Historial de Cambios — ${modalHistorial.correlativo}`}
          size="45rem"
        >
          <div className="p-2">
            <CambiosLogHistorial
              cambiosLog={modalHistorial.log}
              titulo="Modificaciones Realizadas"
            />
          </div>
        </ModalEstandar>
      )}

      {/* Modal de confirmacion de anulacion */}
      <Modal
        opened={openAnularModal !== null}
        onClose={() => setOpenAnularModal(null)}
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
          <Badge color="red" variant="light" size="lg" radius="xl">
            <XCircleIcon className="w-5 h-5" />
          </Badge>
          <Text fw={800} size="lg" c="white" ta="center">
            Anular compra {openAnularModal?.correlativo}
          </Text>
          <Text size="sm" c="zinc.4" ta="center">
            Esta accion cambiara el estado a{" "}
            <Text component="span" fw={700} c="red.4">
              Anulado
            </Text>
            . No se podra revertir ni aprobar después.
          </Text>
          <div className="w-full">
            <Textarea
              label="Motivo (opcional)"
              placeholder="Describe brevemente por que se anula..."
              radius="xl"
              autosize
              minRows={2}
              maxRows={5}
              value={motivoAnular}
              onChange={(e) => setMotivoAnular(e.currentTarget.value)}
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white placeholder:text-zinc-500 transition-all",
                label: "text-zinc-300 mb-1 font-medium text-xs",
              }}
            />
          </div>
          <Group justify="center" gap="sm" mt="xs" w="100%">
            <Button
              variant="subtle"
              color="gray"
              radius="xl"
              onClick={() => setOpenAnularModal(null)}
              disabled={loadingAnular}
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              variant="filled"
              color="red"
              radius="xl"
              loading={loadingAnular}
              onClick={handleAnular}
              fullWidth
              leftSection={<XCircleIcon className="w-4 h-4" />}
            >
              Si, anular
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
