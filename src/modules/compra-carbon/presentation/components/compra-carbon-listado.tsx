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
  ArrowDownTrayIcon,
  BanknotesIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  LockClosedIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import type { DataTableColumn } from "mantine-datatable";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { CambiosLogHistorial } from "../../../../presentation/utils/cambios-log-historial";
import { AuxService } from "../../../../service/auxiliar.service";
import { CompraCarbonService } from "../../service/compra-carbon.service";
import { useNotify } from "../../../../hooks/useNotify";
import { usePrint } from "../../../../hooks/usePrint";
import { useAnularCompraCarbon } from "../../hooks/useAnularCompraCarbon";
import { ModalRegistroCargas } from "../modal-registro-cargas";
import { ModalLiquidacionPagos } from "../modal-liquidacion-pagos";
import { exportarLiquidacionExcel } from "../excel/exportar-liquidacion-excel";
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
  empresasById?: Record<number, RES_Empresa>;
  proveedoresById?: Record<number, ProveedorResponse>;
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
 * Los cinco estados de `EstadoCompraCarbon`.
 */
const estadoBadge = (
  estado: string | null,
): { color: string; label: string } => {
  const e = (estado ?? "").toString();
  switch (e) {
    case EstadoCompraCarbon.Preliminar:
      return { color: "gray", label: "Preliminar" };
    case EstadoCompraCarbon.EnLiquidacion:
      return { color: "blue", label: "En Liquidación" };
    case EstadoCompraCarbon.Cerrado:
      return { color: "orange", label: "Cerrado" };
    case EstadoCompraCarbon.Pagado:
      return { color: "emerald", label: "Pagado" };
    case EstadoCompraCarbon.Anulado:
      return { color: "red", label: "Anulado" };
    default:
      return { color: "gray", label: e || "—" };
  }
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
  const { notifyError, notifySuccess } = useNotify();
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
  const [openCerrarModal, setOpenCerrarModal] = useState<{
    id: number;
    correlativo: string;
  } | null>(null);
  const [loadingCerrar, setLoadingCerrar] = useState(false);
  const [detallesModal, setDetallesModal] = useState<{
    compra: CompraCarbonResumen;
    data: CompraCarbonDetalleResponse | null;
    loading: boolean;
  } | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const handleExportarExcel = async (r: CompraCarbonResumen) => {
    try {
      setExportingId(r.id_compra_carbon);
      const res = await CompraCarbonService.getCompraConDetalles(
        r.id_compra_carbon,
      );
      if (res.data) {
        await exportarLiquidacionExcel(res.data);
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setExportingId(null);
    }
  };

  const handleCerrarCompra = async (id: number) => {
    try {
      setLoadingCerrar(true);
      const res = await CompraCarbonService.cerrarCompra(id);
      if (res.success) {
        notifySuccess("Orden de compra de carbón cerrada satisfactoriamente");
        setOpenCerrarModal(null);
        if (detallesModal) {
          setDetallesModal(null);
        }
        onRefresh?.();
      } else {
        notifyError(res.message || "Error al cerrar la compra");
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoadingCerrar(false);
    }
  };

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

  const [empresasCache, setEmpresasCache] = useState<
    Record<number, RES_Empresa>
  >({});

  const handlePrint = async (compra: CompraCarbonResumen) => {
    let empresa =
      (empresasById && empresasById[compra.id_empresa]) ||
      empresasCache[compra.id_empresa];
    if (!empresa) {
      try {
        const empRes = await AuxService.get_empresas();
        if (empRes.success && empRes.data) {
          const map: Record<number, RES_Empresa> = {};
          for (const e of empRes.data) {
            map[e.id_empresa] = e;
          }
          setEmpresasCache((prev) => ({ ...prev, ...map }));
          empresa = map[compra.id_empresa];
        }
      } catch (err) {
        console.error(err);
      }
    }
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
          proveedor={
            proveedoresById ? proveedoresById[compra.id_proveedor] : null
          }
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
      width: 50,
      textAlign: "center",
    },
    {
      accessor: "correlativo",
      title: "Correlativo",
      width: 100,
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
      width: 150,
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
      width: 150,
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
      width: 100,
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
      width: 120,
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
      width: 120,
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
      width: 120,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => {
        const esAnulado = r.estado === EstadoCompraCarbon.Anulado;
        const esPagado = r.estado === EstadoCompraCarbon.Pagado;
        const esCerrado = r.estado === EstadoCompraCarbon.Cerrado;
        const puedeRegistrarCarga = !esAnulado && !esPagado && !esCerrado;
        return (
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
          </div>
        );
      },
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
      width: 120,
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
      width: 130,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => {
        const esAnulado = r.estado === EstadoCompraCarbon.Anulado;
        const esPagado = r.estado === EstadoCompraCarbon.Pagado;
        const esCerrado = r.estado === EstadoCompraCarbon.Cerrado;
        const totalCargas = r.cantidad_cargas ?? r.cantidad_items ?? 0;
        const puedeLiquidar = !esAnulado;
        const puedeCerrar =
          !esAnulado && !esPagado && !esCerrado && totalCargas >= 1;
        const puedeAnular =
          !esAnulado && !esPagado && !esCerrado && totalCargas === 0;
        const isPrinting = printingId === r.id_compra_carbon;
        const tieneCambios =
          r.log_cambios &&
          (Array.isArray(r.log_cambios)
            ? r.log_cambios.length > 0
            : typeof r.log_cambios === "string" && r.log_cambios !== "[]");

        return (
          <Group gap={6} justify="center" wrap="nowrap">
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

            {/* Exportar Liquidación (Excel) */}
            {totalCargas > 0 && (
              <Tooltip label="Exportar Liquidación (Excel)" withArrow position="top">
                <ActionIcon
                  variant="light"
                  color="teal"
                  radius="xl"
                  size="md"
                  loading={exportingId === r.id_compra_carbon}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportarExcel(r);
                  }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            )}

            {/* 3. Cerrar Compra (solo con >= 1 carga) */}
            {puedeCerrar && (
              <Tooltip
                label="Cerrar orden (no admitir más cargas)"
                withArrow
                position="top"
              >
                <ActionIcon
                  variant="light"
                  color="orange"
                  radius="xl"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenCerrarModal({
                      id: r.id_compra_carbon,
                      correlativo: r.correlativo,
                    });
                  }}
                >
                  <LockClosedIcon className="w-4 h-4" />
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
        size="95rem"
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
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs">
                    <Text
                      size="xs"
                      fw={800}
                      c="zinc.4"
                      className="uppercase tracking-widest"
                    >
                      Cargas Recibidas ({detallesModal.data.cargas.length})
                    </Text>
                    {detallesModal.compra.estado ===
                      EstadoCompraCarbon.Cerrado && (
                      <Badge
                        color="orange"
                        variant="light"
                        size="xs"
                        radius="sm"
                      >
                        Compra Cerrada
                      </Badge>
                    )}
                  </Group>

                  <Group gap="xs">
                    {detallesModal.data.cargas.length >= 1 &&
                      detallesModal.compra.estado !==
                        EstadoCompraCarbon.Anulado &&
                      detallesModal.compra.estado !==
                        EstadoCompraCarbon.Pagado &&
                      detallesModal.compra.estado !==
                        EstadoCompraCarbon.Cerrado && (
                        <Button
                          size="compact-xs"
                          variant="light"
                          color="orange"
                          radius="md"
                          leftSection={
                            <LockClosedIcon className="w-3.5 h-3.5" />
                          }
                          onClick={() => {
                            setOpenCerrarModal({
                              id: detallesModal.compra.id_compra_carbon,
                              correlativo: detallesModal.compra.correlativo,
                            });
                          }}
                        >
                          Cerrar compra
                        </Button>
                      )}

                    {detallesModal.data.cargas.length > 0 &&
                      detallesModal.compra.estado !==
                        EstadoCompraCarbon.Anulado &&
                      detallesModal.compra.estado !==
                        EstadoCompraCarbon.Pagado &&
                      detallesModal.compra.estado !==
                        EstadoCompraCarbon.Cerrado && (
                        <Button
                          size="compact-xs"
                          variant="light"
                          color="indigo"
                          radius="md"
                          leftSection={<TruckIcon className="w-3.5 h-3.5" />}
                          onClick={() => {
                            const comp = detallesModal.compra;
                            setDetallesModal(null);
                            setModalCargas(comp);
                          }}
                        >
                          Añadir carga
                        </Button>
                      )}
                  </Group>
                </Group>

                {detallesModal.data.cargas.length === 0 ? (
                  <div className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center bg-zinc-900/30">
                    <Stack align="center" gap="sm">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <TruckIcon className="w-7 h-7" />
                      </div>
                      <Text size="sm" fw={700} c="zinc.100">
                        Sin cargas registradas
                      </Text>
                      <Text size="xs" c="dimmed" maw={480}>
                        Esta orden preliminar aún no tiene cargas o camiones
                        despachados por el proveedor. Puedes registrar cada
                        cargamento que vaya ingresando a planta con el botón
                        inferior.
                      </Text>
                      {detallesModal.compra.estado !==
                        EstadoCompraCarbon.Anulado &&
                        detallesModal.compra.estado !==
                          EstadoCompraCarbon.Pagado &&
                        detallesModal.compra.estado !==
                          EstadoCompraCarbon.Cerrado && (
                          <Button
                            size="xs"
                            color="indigo"
                            radius="lg"
                            leftSection={<TruckIcon className="w-4 h-4" />}
                            onClick={() => {
                              const comp = detallesModal.compra;
                              setDetallesModal(null);
                              setModalCargas(comp);
                            }}
                            mt="xs"
                          >
                            Registrar primera carga
                          </Button>
                        )}
                    </Stack>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-xs text-zinc-300">
                      <thead className="bg-zinc-900 text-zinc-400 text-[11px] font-medium uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2 text-center w-8">#</th>
                          <th className="py-2 text-center w-28">Tipo</th>
                          <th className="px-3 py-2 text-center w-16">Ticket</th>
                          <th className="px-3 py-2 text-center w-28">
                            Lugar Ext.
                          </th>
                          <th className="px-3 py-2 text-center w-35">
                            Transportista
                          </th>
                          <th className="px-3 py-2 text-center w-28">
                            GR / GT
                          </th>
                          <th className="px-3 py-2 text-center w-24">Leyes</th>
                          <th className="px-3 py-2 text-center w-28">
                            Toneladas
                          </th>
                          <th className="px-3 py-2 text-center w-24">
                            Subtotal
                          </th>
                          <th className="px-3 py-2 text-center w-24">
                            (−) Flete
                          </th>
                          <th className="px-3 py-2 text-center w-28">Neto</th>
                          <th className="px-3 py-2 text-center w-24">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 bg-zinc-900/40">
                        {detallesModal.data.cargas.map(
                          (d: CargaCompraCarbonItem, idx: number) => {
                            return (
                              <tr
                                key={d.id_carga_compra_carbon}
                                className="hover:bg-white/5 transition-colors"
                              >
                                <td className="px-3 py-2 text-center text-zinc-500">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2 flex justify-center">
                                  <Stack
                                    gap={4}
                                    justify="center"
                                    align="center"
                                  >
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
                                <td className="px-3 py-2 font-mono text-zinc-300 text-center">
                                  {d.codigo_ticket_balanza || (
                                    <Text c="dimmed">—</Text>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center text-zinc-300">
                                  {d.lugar_extraccion_direccion || (
                                    <Text c="dimmed">—</Text>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-zinc.100 text-center">
                                  {d.transportista_razon_social || (
                                    <Text c="dimmed">—</Text>
                                  )}
                                </td>
                                <td className="px-3 py-2 flex flex-row justify-center">
                                  <div className="flex flex-col items-start justify-center gap-1.5">
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

                                <td className="px-3 py-2 text-center">
                                  <div className="flex flex-col gap-2 items-center justify-center">
                                    {d.porcentaje_ceniza > 0 ? (
                                      <Badge
                                        variant="light"
                                        color="grape"
                                        size="sm"
                                        radius="md"
                                      >
                                        {formatNumber(
                                          Number(d.porcentaje_ceniza),
                                        )}{" "}
                                        %Ce
                                      </Badge>
                                    ) : (
                                      <Text c="dimmed">—</Text>
                                    )}
                                    {d.porcentaje_humedad > 0 ? (
                                      <Badge
                                        variant="light"
                                        color="blue"
                                        size="sm"
                                        radius="md"
                                      >
                                        {formatNumber(
                                          Number(d.porcentaje_humedad),
                                        )}{" "}
                                        %H2O
                                      </Badge>
                                    ) : (
                                      <Text c="dimmed">—</Text>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-white">
                                  <Text size="xs" c={"teal"} fw={800}>
                                    {formatNumber(Number(d.cantidad))} TN
                                  </Text>
                                  <Text
                                    size="11px"
                                    mt={5}
                                    c={"yellow"}
                                    fw={600}
                                  >
                                    {formatPEN(Number(d.precio_unitario))} P/U
                                  </Text>
                                </td>

                                <td className="px-3 py-2 text-center">
                                  <Text size="xs" fw={800} c={"teal"}>
                                    {formatPEN(
                                      Number(d.subtotal_antes_descuento),
                                    )}
                                  </Text>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Text size="xs" fw={700} c={"red"}>
                                    {Number(d.descuento_flete) > 0
                                      ? `−${formatPEN(Number(d.descuento_flete))}`
                                      : "—"}
                                  </Text>
                                  <Text size="11px" fw={600} c={""} mt={5}>
                                    {Number(d.costo_flete_por_tonelada) > 0
                                      ? formatPEN(
                                          Number(d.costo_flete_por_tonelada),
                                        ) + " x TN"
                                      : "—"}
                                  </Text>
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-emerald-400 font-bold">
                                  {formatPEN(Number(d.subtotal_con_descuento))}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Badge
                                    size="xs"
                                    variant="light"
                                    color={
                                      d.estado === "Pagado"
                                        ? "emerald"
                                        : d.estado === "Anulado"
                                          ? "red"
                                          : "blue"
                                    }
                                  >
                                    {d.estado || "En Liquidación"}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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

      {/* Modal de confirmacion de cierre de compra */}
      <Modal
        opened={openCerrarModal !== null}
        onClose={() => !loadingCerrar && setOpenCerrarModal(null)}
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
            <LockClosedIcon className="w-5 h-5" />
          </Badge>
          <Text fw={800} size="lg" c="white" ta="center">
            Cerrar orden {openCerrarModal?.correlativo}
          </Text>
          <Text size="sm" c="zinc.4" ta="center">
            Al cerrar esta orden de compra se establecerá el estado a{" "}
            <Text component="span" fw={700} c="orange.4">
              Cerrado
            </Text>{" "}
            y se registrará la fecha y usuario de cierre.
            <br />
            <br />
            <Text component="span" fw={600} c="white">
              Ya no se permitirá registrar nuevas cargas de carbón a esta orden.
            </Text>{" "}
            El proceso de liquidación y pagos continuará con las cargas
            actuales.
          </Text>
          <Group justify="center" gap="sm" mt="xs" w="100%">
            <Button
              variant="subtle"
              color="gray"
              radius="xl"
              onClick={() => setOpenCerrarModal(null)}
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
              onClick={() => {
                if (openCerrarModal) {
                  handleCerrarCompra(openCerrarModal.id);
                }
              }}
              fullWidth
              leftSection={<LockClosedIcon className="w-4 h-4" />}
            >
              Sí, cerrar orden
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
