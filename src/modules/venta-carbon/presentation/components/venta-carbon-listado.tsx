import { useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Divider,
  Group,
  Paper,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  ArrowUturnLeftIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import type { DataTableColumn } from "mantine-datatable";
import dayjs from "dayjs";

import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { EstadoVentaCarbon } from "../../../../shared/enums/venta-carbon/estado-venta-carbon";
import { VentaCarbonDetalle } from "./venta-carbon-detalle";
import type {
  CargaVentaCarbonItem,
  ComprobanteVentaCarbonItem,
  LiquidacionVentaCarbonItem,
  VentaCarbonResumen,
} from "../../service/venta-carbon.responses";

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dayjs(d).format("DD/MM/YYYY HH:mm");
};

const formatPEN = (val: number | null | undefined) =>
  `S/ ${formatNumber(Number(val ?? 0))}`;

const colorEstadoVenta = (estado: EstadoVentaCarbon) => {
  switch (estado) {
    case EstadoVentaCarbon.Completada:
      return "teal";
    case EstadoVentaCarbon.EnCurso:
      return "yellow";
    default:
      return "gray";
  }
};

interface Props {
  ventas: VentaCarbonResumen[];
  loading: boolean;
  /** Ventas desplegadas (controlado: `trigger: "always"` ignora el estado). */
  desplegadas: number[];
  /** Detalle ya descargado de cada venta desplegada. */
  detalles: Record<number, VentaCarbonResumen>;
  /** Id de la venta cuyo detalle se esta descargando. */
  detalleCargando: number | null;
  onExpandedChange: (ids: number[]) => void;
  onConfirmarLlegada: (
    venta: VentaCarbonResumen,
    carga: CargaVentaCarbonItem,
  ) => void;
  onDespacharCargas: (venta: VentaCarbonResumen) => void;
  onLiquidar: (venta: VentaCarbonResumen) => void;
  onLiquidarGrupo: (
    venta: VentaCarbonResumen,
    idTipoCarbon: number,
    idsCargas: number[],
  ) => void;
  onEditarLiquidacion: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
  ) => void;
  onConfirmarLiquidacion: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
  ) => void;
  onRegistrarComprobante: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
  ) => void;
  onRegistrarPago: (
    venta: VentaCarbonResumen,
    liquidacion: LiquidacionVentaCarbonItem,
    comprobante: ComprobanteVentaCarbonItem,
  ) => void;
}

export const VentaCarbonListado = ({
  ventas,
  loading,
  desplegadas,
  detalles,
  detalleCargando,
  onExpandedChange,
  onConfirmarLlegada,
  onDespacharCargas,
  onLiquidarGrupo,
  onEditarLiquidacion,
  onConfirmarLiquidacion,
  onRegistrarComprobante,
  onRegistrarPago,
}: Props) => {
  const columns: DataTableColumn<VentaCarbonResumen>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 50,
      },
      {
        accessor: "correlativo",
        title: "Venta",
        textAlign: "center",
        width: 130,
        render: (r) => (
          <div className="flex flex-col gap-1">
            <Text size="xs" fw={800} className="text-white font-mono">
              {r.correlativo}
            </Text>
            {/* <Badge size="xs" variant="light" color="gray" radius="sm">
              IGV {formatNumber(r.porcentaje_igv)}% · Detr.{" "}
              {formatNumber(r.porcentaje_detraccion)}%
            </Badge> */}
          </div>
        ),
      },
      {
        accessor: "cliente",
        title: "Cliente / Destino",
        textAlign: "center",
        width: 220,
        render: (r) => (
          <div className="flex flex-col gap-1 items-center">
            <Text size="xs" fw={700} className="text-zinc-100 truncate">
              {r.cliente ?? "—"}
            </Text>
            <Text size="xs" c="zinc.400" fw={600} truncate>
              {r.cliente_destino ?? "—"}
            </Text>
          </div>
        ),
      },
      {
        accessor: "almacen_empresa_salida",
        title: "Almacenes",
        textAlign: "center",
        width: 230,
        render: (r) => (
          <Group gap={5} wrap="nowrap" justify="center">
            <ArrowUturnLeftIcon className="w-4 h-4 text-zinc-300 shrink-0 rotate-180" />
            <Group gap={2} className="flex-col items-start">
              <Text size="xs" fw={600} c="zinc.300" truncate>
                {r.almacen_empresa_salida ?? "—"}
              </Text>
              <Text size="xs" fw={600} c="indigo.3" truncate>
                {r.almacen_cliente_llegada ?? "—"}
              </Text>
            </Group>
          </Group>
        ),
      },
      {
        accessor: "cantidad_cargas",
        title: "Cargas",
        textAlign: "center",
        width: 150,
        render: (r) => (
          <div className="flex flex-col gap-2 items-center">
            <Group gap={6}>
              <Badge variant="light" color="teal" radius="md" size="md">
                {r.cantidad_cargas} cargas
              </Badge>
              <Tooltip label="Despachar mas cargas" withArrow>
                <ActionIcon
                  variant="light"
                  color="grape"
                  size="md"
                  radius="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDespacharCargas(r);
                  }}
                >
                  <PlusIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </Group>
            {r.cantidad_cargas_confirmadas > 0 && (
              <Badge variant="light" color="lime" radius="md" size="xs">
                {r.cantidad_cargas_confirmadas} confirmadas
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessor: "total_toneladas",
        title: "Toneladas",
        textAlign: "center",
        width: 120,
        render: (r) => (
          <div className="flex flex-col gap-2">
            <Text size="xs" fw={700} c="zinc.100">
              {formatNumber(r.total_toneladas)} TN despachadas
            </Text>
            {r.total_toneladas_confirmadas > 0 && (
              <>
                <Divider orientation="horizontal" />
                <Text size="xs" c="teal.4" fw={800}>
                  {formatNumber(r.total_toneladas_confirmadas)} TN confirmadas
                </Text>
              </>
            )}
          </div>
        ),
      },
      {
        accessor: "total_subtotal",
        title: "Total",
        textAlign: "center",
        width: 120,
        render: (r) => (
          <Text size="xs" fw={800} c="lime">
            {formatPEN(r.total_total)}
          </Text>
        ),
      },
      // {
      //   accessor: "cantidad_liquidaciones",
      //   title: "Liquidaciones",
      //   textAlign: "center",
      //   width: 140,
      //   render: (r) => {
      //     const cantidad = r.cantidad_liquidaciones ?? 0;
      //     return (
      //       <Group gap={4} justify="center" wrap="nowrap">
      //         <Badge
      //           variant="light"
      //           color={cantidad > 0 ? "blue" : "gray"}
      //           radius="md"
      //           size="sm"
      //         >
      //           {cantidad} liq.
      //         </Badge>
      //         <Tooltip label="Registrar liquidacion" withArrow>
      //           <ActionIcon
      //             variant="light"
      //             color="blue"
      //             size="md"
      //             radius="md"
      //             onClick={(e) => {
      //               e.stopPropagation();
      //               onLiquidar(r);
      //             }}
      //           >
      //             <ScaleIcon className="w-4 h-4" />
      //           </ActionIcon>
      //         </Tooltip>
      //       </Group>
      //     );
      //   },
      // },
      {
        accessor: "estado",
        title: "Estado",
        textAlign: "center",
        width: 120,
        render: (r) => (
          <Badge
            variant="light"
            color={colorEstadoVenta(r.estado)}
            radius="md"
            size="sm"
          >
            {r.estado}
          </Badge>
        ),
      },
      {
        accessor: "empleado_registro",
        title: "Registro",
        textAlign: "center",
        width: 160,
        render: (r) => (
          <div className="flex flex-col gap-0.5">
            <Text size="xs" fw={700} c="zinc.200">
              {r.empleado_registro ?? "—"}
            </Text>
            <Text size="xs" c="gray">
              {formatDateTime(r.created_at)}
            </Text>
          </div>
        ),
      },
    ],
    [onDespacharCargas],
  );

  return (
    <Paper className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <DataTableEstandar
        records={ventas}
        columns={columns}
        idAccessor="id_venta_carbon"
        loading={loading}
        initialPageSize={10}
        noRecordsText="No se encontraron ventas de carbon."
        rowExpansion={{
          // `trigger: "always"` despliega TODAS las filas e ignora el
          // estado controlado. Con "click" el despliegue lo maneja el padre
          // y solo hay una venta abierta a la vez.
          trigger: "click",
          allowMultiple: false,
          expanded: {
            recordIds: desplegadas,
            onRecordIdsChange: (ids: unknown[]) =>
              onExpandedChange(ids.map((id) => Number(id))),
          },
          expandable: () => true,
          content: ({ record }: { record: VentaCarbonResumen }) => (
            <VentaCarbonDetalle
              detalle={detalles[record.id_venta_carbon] ?? null}
              loading={detalleCargando === record.id_venta_carbon}
              onConfirmarLlegada={onConfirmarLlegada}
              onLiquidarGrupo={onLiquidarGrupo}
              onEditarLiquidacion={onEditarLiquidacion}
              onConfirmarLiquidacion={onConfirmarLiquidacion}
              onRegistrarComprobante={onRegistrarComprobante}
              onRegistrarPago={onRegistrarPago}
            />
          ),
        }}
      />
    </Paper>
  );
};
