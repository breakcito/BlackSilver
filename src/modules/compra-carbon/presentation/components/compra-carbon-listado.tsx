import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Progress,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  CheckBadgeIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  PaperClipIcon,
  PencilSquareIcon,
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
import { EvidenciasCompraModal } from "../evidencias-compra-modal";
import {
  ConfirmacionCompraCarbonModal,
  type ProgresoCompraCarbon,
} from "../confirmacion-compra-carbon-modal";
import { AprobarLiquidacionModal } from "../aprobar-liquidacion-modal";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { EstadoCompraCarbon } from "../../../../shared/enums/compra-carbon/estado-compra-carbon";
import type {
  CompraCarbonDetalleItem,
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
  onEvidenciasActualizadas?: (cabecera: CompraCarbonResumen) => void;
  onAnulada?: (cabecera: CompraCarbonResumen) => void;
  /** Compra que se imprime automaticamente al montarse. */
  autoPrintId?: number | null;
  /** Callback cuando el listado ya proceso el autoPrintId. */
  onAutoPrintConsumido?: () => void;
}

const formatPEN = (n: number) => `S/ ${formatNumber(n)}`;

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dayjs(d).format("DD/MM/YYYY HH:mm");
};

const estadoBadge = (
  estado: string | null,
): { color: string; label: string } => {
  const e = (estado ?? "").toString();
  if (e === EstadoCompraCarbon.Preliminar)
    return { color: "yellow", label: "Preliminar" };
  if (e === EstadoCompraCarbon.Confirmado)
    return { color: "teal", label: "Confirmado" };
  if (e === EstadoCompraCarbon.Anulado)
    return { color: "red", label: "Anulado" };
  return { color: "gray", label: e || "—" };
};

const lugarLabel = (d: CompraCarbonDetalleItem): string => {
  const parts = [d.lugar_departamento, d.lugar_provincia, d.lugar_distrito]
    .filter(Boolean)
    .join(" / ");
  return parts + (d.lugar_direccion ? ` · ${d.lugar_direccion}` : "");
};

export const CompraCarbonListado = ({
  compras,
  busqueda,
  empresasById,
  proveedoresById,
  onAprobada,
  onEvidenciasActualizadas,
  onAnulada,
  autoPrintId,
  onAutoPrintConsumido,
}: Props) => {
  const { notifyError } = useNotify();
  const { print, prepare } = usePrint();
  const { anular, loading: loadingAnular } = useAnularCompraCarbon();

  // Modales de flujo
  const [modalConfirmar, setModalConfirmar] =
    useState<CompraCarbonResumen | null>(null);
  const [progresoConfirmar, setProgresoConfirmar] =
    useState<ProgresoCompraCarbon | null>(null);

  const [modalEditar, setModalEditar] = useState<CompraCarbonResumen | null>(
    null,
  );
  const [progresoEditar, setProgresoEditar] =
    useState<ProgresoCompraCarbon | null>(null);
  const [modalLiquidar, setModalLiquidar] =
    useState<CompraCarbonResumen | null>(null);
  const [modalHistorial, setModalHistorial] = useState<{
    correlativo: string;
    log: unknown;
  } | null>(null);

  const [openAnularModal, setOpenAnularModal] = useState<{
    id: number;
    correlativo: string;
  } | null>(null);
  const [openEvidenciasModal, setOpenEvidenciasModal] = useState<{
    compra: CompraCarbonResumen;
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
      evidencias: result.cabecera.evidencias ?? [],
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

  // Auto-imprimir cuando la pagina dispara autoPrintId tras registrar.
  // Se incluyen `compras` en las deps para que el efecto re-corra cuando la
  // nueva compra ya este insertada en la lista (React 18 batchea los dos
  // setState del padre, pero la prop tarda un tick en propagarse).
  useEffect(() => {
    if (!autoPrintId) return;
    const compra = compras.find((c) => c.id_compra_carbon === autoPrintId);
    if (!compra) return;
    handlePrint(compra);
    onAutoPrintConsumido?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrintId, compras]);

  const handlePrint = async (compra: CompraCarbonResumen) => {
    const empresa = empresasById[compra.id_empresa];
    if (!empresa) {
      notifyError("No se encontro la empresa para generar el PDF");
      return;
    }
    setPrintingId(compra.id_compra_carbon);
    try {
      const resp = await CompraCarbonService.getCompraConDetalles(
        compra.id_compra_carbon,
      );
      if (!resp.success) {
        notifyError(resp.message || "No se pudo cargar el detalle");
        return;
      }
      const data: CompraCarbonDetalleResponse = resp.data;
      const target = `CompraCarbon_${compra.correlativo}_${Date.now()}`;
      prepare(target);
      const CompraCarbonPDFModule = await import("../compra-carbon-pdf");
      const CompraCarbonPDF = CompraCarbonPDFModule.CompraCarbonPDF;
      print(
        <CompraCarbonPDF
          compra={{ cabecera: data.cabecera, detalles: data.detalles }}
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
    {
      accessor: "fecha_hora_ingreso",
      title: "Ingreso",
      width: 150,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <Text size="xs" c="zinc.3" className="font-mono">
          {formatDateTime(r.fecha_hora_ingreso)}
        </Text>
      ),
    },
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
    {
      accessor: "proveedor_contacto",
      title: "Contacto",
      width: 100,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => {
        const prov = proveedoresById[r.id_proveedor];
        if (!prov) return null;
        return (
          <Stack gap={0}>
            {prov.telefono && (
              <Text size="10px" c="zinc.3" className="font-mono">
                {prov.telefono}
              </Text>
            )}
            {prov.correo && (
              <Text size="10px" c="dimmed" className="truncate">
                {prov.correo}
              </Text>
            )}
            {!prov.telefono && !prov.correo && (
              <Text size="xs" c="dimmed" fs="italic">
                —
              </Text>
            )}
          </Stack>
        );
      },
    },
    {
      accessor: "almacen",
      title: "Almacen",
      width: 130,
      textAlign: "center",
      render: (r: CompraCarbonResumen) =>
        r.almacen ? (
          <Text size="xs" className="text-zinc-200">
            {r.almacen}
          </Text>
        ) : (
          <Text size="xs" c="dimmed" fs="italic">
            —
          </Text>
        ),
    },

    {
      accessor: "aplica_igv",
      title: "Aplica IGV",
      width: 100,
      textAlign: "center",
      render: (r: CompraCarbonResumen) =>
        r.aplica_igv ? (
          <Badge variant="light" color="indigo" radius="md" size="sm">
            Si · {formatNumber(Number(r.porcentaje_igv))}%
          </Badge>
        ) : (
          <Badge variant="light" color="pink" radius="md" size="sm">
            No
          </Badge>
        ),
    },
    {
      accessor: "total_antes_descuento",
      title: "Total",
      width: 120,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <Text size="xs" c="zinc.3" className="font-mono">
          {formatPEN(Number(r.total_antes_descuento))}
        </Text>
      ),
    },
    {
      accessor: "descuento_flete_total",
      title: "(−) Flete",
      width: 120,
      textAlign: "center",
      render: (r: CompraCarbonResumen) =>
        Number(r.descuento_flete) > 0 ? (
          <Text size="xs" c="yellow.4" fw={700} className="font-mono">
            −{formatPEN(Number(r.descuento_flete))}
          </Text>
        ) : (
          <Text size="xs" c="dimmed" className="text-center">
            —
          </Text>
        ),
    },
    {
      accessor: "total_con_descuento",
      title: "Total neto",
      width: 130,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <Text size="sm" fw={900} c="emerald.4" className="font-mono">
          {formatPEN(Number(r.total_con_descuento))}
        </Text>
      ),
    },
    {
      accessor: "items",
      title: "Cargas",
      width: 110,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => (
        <div className="flex items-center justify-center gap-3">
          <Badge variant="light" color="cyan" radius="md" size="md">
            {r.cantidad_items}
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
    {
      accessor: "registrado_por",
      title: "Registrado por",
      width: 160,
      render: (r: CompraCarbonResumen) => (
        <Stack gap={0}>
          <Text size="xs" className="text-zinc-200 truncate">
            {r.empleado_registro}
          </Text>
          <Text size="11px" c="gray.5" className="font-mono">
            {formatDateTime(r.created_at)}
          </Text>
        </Stack>
      ),
    },
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
      width: 220,
      textAlign: "center",
      render: (r: CompraCarbonResumen) => {
        const esPreliminar = r.estado === EstadoCompraCarbon.Preliminar;
        const esConfirmado = r.estado === EstadoCompraCarbon.Confirmado;
        const puedeEditar = esConfirmado;
        const puedeAnular = esPreliminar || esConfirmado;
        const isPrinting = printingId === r.id_compra_carbon;
        const cantEvidencias = (r.evidencias ?? []).length;
        const tieneCambios =
          r.log_cambios &&
          (Array.isArray(r.log_cambios)
            ? r.log_cambios.length > 0
            : typeof r.log_cambios === "string" && r.log_cambios !== "[]");

        return (
          <Group gap={6} justify="center" wrap="nowrap">
            {/* 1. Confirmar llegada de carga (Preliminar -> Confirmado) */}
            {esPreliminar && (
              <Tooltip label="Confirmar llegada" withArrow position="top">
                <ActionIcon
                  variant="filled"
                  color="green"
                  radius="xl"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalConfirmar(r);
                  }}
                >
                  <TruckIcon className="w-4 h-4 text-white" />
                </ActionIcon>
              </Tooltip>
            )}

            {/* 2. Aprobar Liquidacion con anticipos (Confirmado -> Liquidacion Aprobada) */}
            {esConfirmado && (
              <Tooltip label="Aprobar liquidación" withArrow position="top">
                <ActionIcon
                  variant="filled"
                  color="teal"
                  radius="xl"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalLiquidar(r);
                  }}
                >
                  <CheckBadgeIcon className="w-4 h-4 text-white" />
                </ActionIcon>
              </Tooltip>
            )}

            {/* 3. Editar compra (Preliminar o Confirmado) */}
            {puedeEditar && (
              <Tooltip label="Editar compra" withArrow position="top">
                <ActionIcon
                  variant="light"
                  color="blue"
                  radius="xl"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalEditar(r);
                  }}
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            )}

            {/* 4. Evidencias */}
            <Tooltip
              label={
                cantEvidencias > 0
                  ? `Ver archivos subidos (${cantEvidencias})`
                  : "Subir / ver archivos"
              }
              withArrow
              position="top"
            >
              <ActionIcon
                variant="light"
                color="violet"
                radius="xl"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenEvidenciasModal({ compra: r });
                }}
              >
                <PaperClipIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>

            {/* 5. PDF */}
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

            {/* 6. Historial de cambios */}
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

            {/* 7. Anular */}
            {puedeAnular && (
              <Tooltip label="Anular compra" withArrow position="top">
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
        onRowClick={({ record }: { record: CompraCarbonResumen }) =>
          handleVerDetalles(record)
        }
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
                    Total:{" "}
                    <span className="text-zinc-300 font-bold font-mono">
                      {formatPEN(
                        Number(detallesModal.compra.total_antes_descuento),
                      )}
                    </span>
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    (−) Flete:{" "}
                    <span className="text-yellow-400 font-bold font-mono">
                      −{formatPEN(Number(detallesModal.compra.descuento_flete))}
                    </span>
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    IGV
                    {detallesModal.compra.aplica_igv
                      ? ` (${formatNumber(Number(detallesModal.compra.porcentaje_igv))}%)`
                      : ""}
                    :{" "}
                    <span className="text-zinc-300 font-bold font-mono">
                      {formatPEN(Number(detallesModal.compra.monto_igv))}
                    </span>
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    Total neto:{" "}
                    <span className="text-emerald-400 font-bold font-mono">
                      {formatPEN(
                        Number(detallesModal.compra.total_con_descuento),
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
                  Cargando items...
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
                    Items ({detallesModal.data.detalles.length})
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
                      {detallesModal.data.detalles.map((d, idx) => {
                        const lugar = lugarLabel(d);
                        return (
                          <tr
                            key={d.id_detalle_compra_carbon}
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
                                  {formatNumber(Number(d.porcentaje_humedad))}%
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
                                ? formatPEN(Number(d.costo_flete_por_tonelada))
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
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalEstandar>

      {/* Modal Confirmar llegada de carga */}
      {modalConfirmar && (
        <ModalEstandar
          opened
          close={() => {
            setModalConfirmar(null);
            setProgresoConfirmar(null);
          }}
          title={`Confirmar Llegada — ${modalConfirmar.correlativo}`}
          size="75rem"
          rightSection={
            progresoConfirmar ? (
              <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-1.5 min-w-70">
                <Badge
                  color={
                    progresoConfirmar.porcentaje === 100 ? "teal" : "indigo"
                  }
                  variant="filled"
                  size="sm"
                  radius="sm"
                >
                  {progresoConfirmar.porcentaje}%
                </Badge>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center text-[11px] text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      Progreso
                    </span>
                    <span>
                      {progresoConfirmar.llenos}/{progresoConfirmar.totales}{" "}
                      campos
                    </span>
                  </div>
                  <Progress
                    value={progresoConfirmar.porcentaje}
                    color={
                      progresoConfirmar.porcentaje === 100 ? "teal" : "indigo"
                    }
                    size="xs"
                    radius="xl"
                    striped={progresoConfirmar.porcentaje < 100}
                    animated={progresoConfirmar.porcentaje < 100}
                  />
                </div>
              </div>
            ) : null
          }
        >
          <ConfirmacionCompraCarbonModal
            compra={modalConfirmar}
            modo="confirmar"
            onCancel={() => {
              setModalConfirmar(null);
              setProgresoConfirmar(null);
            }}
            onProgresoChange={setProgresoConfirmar}
            onSuccess={(data) => {
              onAprobada?.({
                ...modalConfirmar,
                ...data.cabecera,
              });
              setModalConfirmar(null);
              setProgresoConfirmar(null);
            }}
          />
        </ModalEstandar>
      )}

      {/* Modal Editar Compra (Preliminar o Confirmado) */}
      {modalEditar && (
        <ModalEstandar
          opened
          close={() => {
            setModalEditar(null);
            setProgresoEditar(null);
          }}
          title={`Editar Compra de Carbón — ${modalEditar.correlativo}`}
          size="75rem"
          rightSection={
            progresoEditar ? (
              <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-1.5 min-w-70">
                <Badge
                  color={progresoEditar.porcentaje === 100 ? "teal" : "indigo"}
                  variant="filled"
                  size="sm"
                  radius="sm"
                >
                  {progresoEditar.porcentaje}%
                </Badge>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      Progreso
                    </span>
                    <span>
                      {progresoEditar.llenos}/{progresoEditar.totales} campos
                    </span>
                  </div>
                  <Progress
                    value={progresoEditar.porcentaje}
                    color={
                      progresoEditar.porcentaje === 100 ? "teal" : "indigo"
                    }
                    size="xs"
                    radius="xl"
                    striped={progresoEditar.porcentaje < 100}
                    animated={progresoEditar.porcentaje < 100}
                  />
                </div>
              </div>
            ) : null
          }
        >
          <ConfirmacionCompraCarbonModal
            compra={modalEditar}
            modo="editar"
            onCancel={() => {
              setModalEditar(null);
              setProgresoEditar(null);
            }}
            onProgresoChange={setProgresoEditar}
            onSuccess={(data) => {
              onAprobada?.({
                ...modalEditar,
                ...data.cabecera,
              });
              setModalEditar(null);
              setProgresoEditar(null);
            }}
          />
        </ModalEstandar>
      )}

      {/* Modal Aprobar Liquidación */}
      {modalLiquidar && (
        <ModalEstandar
          opened
          close={() => setModalLiquidar(null)}
          title={`Aprobar Liquidación — ${modalLiquidar.correlativo}`}
          size="55rem"
        >
          <AprobarLiquidacionModal
            compra={modalLiquidar}
            onCancel={() => setModalLiquidar(null)}
            onSuccess={(data) => {
              onAprobada?.({
                ...modalLiquidar,
                ...data.cabecera,
              });
              setModalLiquidar(null);
            }}
          />
        </ModalEstandar>
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

      {openEvidenciasModal && (
        <EvidenciasCompraModal
          opened
          close={() => setOpenEvidenciasModal(null)}
          compra={openEvidenciasModal.compra}
          onSaved={(cabeceraActualizada) => {
            // El modal permanece abierto para que el usuario pueda seguir
            // agregando archivos. Solo actualizamos el contador de la fila
            // padre; el cierre lo decide el usuario con X / Cancelar.
            onEvidenciasActualizadas?.(cabeceraActualizada);
          }}
        />
      )}
    </>
  );
};
