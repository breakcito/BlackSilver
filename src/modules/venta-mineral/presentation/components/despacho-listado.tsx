import { useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  ArrowUturnLeftIcon,
  BanknotesIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import type { DataTableColumn } from "mantine-datatable";
import dayjs from "dayjs";

import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { EstadoDespachoMineral } from "../../../../shared/enums/venta-mineral/estado-despacho-mineral";
import { DespachoDetalle } from "./despacho-detalle";
import type {
  AnalisisLaboratorioItem,
  ComprobanteDespachoItem,
  DespachoMineralDetalle,
  DespachoMineralResumen,
  FleteDespachoItem,
  GastoDespachoItem,
  LiquidacionMineralItem,
} from "../../service/venta-mineral.responses";
import type { TipoComprobanteDespacho } from "../../service/venta-mineral.requests";

interface Props {
  despachos: DespachoMineralResumen[];
  loading: boolean;
  /** Despachos desplegados (controlado). */
  desplegados: number[];
  /** Detalle ya cargado de cada despacho. */
  detalles: Record<number, DespachoMineralDetalle>;
  /** Id del despacho que se esta recargando (spinner en su fila). */
  detalleCargando: number | null;
  onExpandedChange: (ids: number[]) => void;
  onEditarDespacho: (despacho: DespachoMineralResumen) => void;
  onEliminarDespacho: (despacho: DespachoMineralResumen) => void;
  onRegistrarGasto: (despacho: DespachoMineralResumen) => void;
  onEditarGasto: (despacho: DespachoMineralResumen, gasto: GastoDespachoItem) => void;
  onEliminarGasto: (despacho: DespachoMineralResumen, gasto: GastoDespachoItem) => void;
  onRegistrarFlete: (despacho: DespachoMineralResumen) => void;
  onEditarFlete: (despacho: DespachoMineralResumen, flete: FleteDespachoItem) => void;
  onRegistrarBalanza: (despacho: DespachoMineralResumen, flete: FleteDespachoItem) => void;
  onEliminarFlete: (despacho: DespachoMineralResumen, flete: FleteDespachoItem) => void;
  onRegistrarComprobante: (
    despacho: DespachoMineralResumen,
    tipo: TipoComprobanteDespacho,
  ) => void;
  onEditarComprobante: (
    despacho: DespachoMineralResumen,
    tipo: TipoComprobanteDespacho,
    comprobante: ComprobanteDespachoItem,
  ) => void;
  onEliminarComprobante: (
    despacho: DespachoMineralResumen,
    tipo: TipoComprobanteDespacho,
    comprobante: ComprobanteDespachoItem,
  ) => void;
  onRegistrarPago: (
    despacho: DespachoMineralResumen,
    tipo: TipoComprobanteDespacho,
    comprobante: ComprobanteDespachoItem,
  ) => void;
  onRegistrarAnalisis: (despacho: DespachoMineralResumen) => void;
  onEditarAnalisis: (
    despacho: DespachoMineralResumen,
    analisis: AnalisisLaboratorioItem,
  ) => void;
  onEliminarAnalisis: (
    despacho: DespachoMineralResumen,
    analisis: AnalisisLaboratorioItem,
  ) => void;
  onRegistrarLiquidacion: (despacho: DespachoMineralResumen) => void;
  onEditarLiquidacion: (
    despacho: DespachoMineralResumen,
    liquidacion: LiquidacionMineralItem,
  ) => void;
  onEliminarLiquidacion: (
    despacho: DespachoMineralResumen,
    liquidacion: LiquidacionMineralItem,
  ) => void;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dayjs(d).format("DD/MM/YYYY");
};

const colorEstado = (estado: EstadoDespachoMineral) => {
  if (estado === EstadoDespachoMineral.Liquidado) return "green";
  if (estado === EstadoDespachoMineral.EnProceso) return "yellow";
  return "gray";
};

export const DespachoListado = ({
  despachos,
  loading,
  desplegados,
  detalles,
  detalleCargando,
  onExpandedChange,
  onEditarDespacho,
  onEliminarDespacho,
  onRegistrarGasto,
  onEditarGasto,
  onEliminarGasto,
  onRegistrarFlete,
  onEditarFlete,
  onRegistrarBalanza,
  onEliminarFlete,
  onRegistrarComprobante,
  onEditarComprobante,
  onEliminarComprobante,
  onRegistrarPago,
  onRegistrarAnalisis,
  onEditarAnalisis,
  onEliminarAnalisis,
  onRegistrarLiquidacion,
  onEditarLiquidacion,
  onEliminarLiquidacion,
}: Props) => {
  const columns: DataTableColumn<DespachoMineralResumen>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 50,
      },
      {
        accessor: "lote_codigo",
        title: "Despacho",
        textAlign: "center",
        width: 150,
        render: (r) => (
          <div className="flex flex-col gap-0.5">
            <Text size="xs" fw={800} c="white" className="font-mono">
              {r.lote_codigo ?? "—"}
            </Text>
            <Text size="xs" c="gray">
              {formatNumber(r.cantidad_sacos)} sacos
            </Text>
          </div>
        ),
      },
      {
        accessor: "molino",
        title: "Molino",
        textAlign: "center",
        width: 200,
        render: (r) => (
          <Text size="xs" fw={600} c="zinc.200" truncate>
            {r.molino ?? "—"}
          </Text>
        ),
      },
      {
        accessor: "labor",
        title: "Labor / Mina",
        textAlign: "center",
        width: 180,
        render: (r) => (
          <div className="flex flex-col gap-0.5">
            <Text size="xs" fw={600} c="zinc.200" truncate>
              {r.labor ?? "—"}
            </Text>
            <Text size="xs" c="gray" truncate>
              {r.mina ?? "—"}
            </Text>
          </div>
        ),
      },
      {
        accessor: "fecha_despacho",
        title: "Fecha",
        textAlign: "center",
        width: 110,
        render: (r) => (
          <Text size="xs" fw={600} c="emerald.4">
            {formatDate(r.fecha_despacho)}
          </Text>
        ),
      },
      {
        accessor: "cantidad_fletes",
        title: "Carga",
        textAlign: "center",
        width: 130,
        render: (r) => (
          <div className="flex flex-col gap-0.5">
            <Text size="xs" fw={600} c="zinc.200">
              {r.cantidad_fletes} flete(s)
            </Text>
            <Text size="xs" c="gray">
              {formatNumber(r.peso_neto_total)} t
            </Text>
          </div>
        ),
      },
      {
        accessor: "total_facturado",
        title: "Facturado / Pagado",
        textAlign: "center",
        width: 180,
        render: (r) => {
          const facturado =
            (r.total_facturado ?? 0) +
            (r.total_facturado_molienda ?? 0) +
            (r.total_facturado_analisis ?? 0) +
            (r.total_facturado_liquidacion ?? 0);
          const pagado =
            (r.total_pagado ?? 0) +
            (r.total_pagado_molienda ?? 0) +
            (r.total_pagado_analisis ?? 0) +
            (r.total_pagado_liquidacion ?? 0);

          return (
            <div className="flex flex-col gap-0.5">
              <Text size="xs" fw={700} c="indigo.3">
                S/ {formatNumber(facturado)}
              </Text>
              <Text size="xs" c="emerald.4">
                S/ {formatNumber(pagado)}
              </Text>
            </div>
          );
        },
      },
      {
        accessor: "estado",
        title: "Estado",
        textAlign: "center",
        width: 120,
        render: (r) => (
          <Badge
            variant="light"
            color={colorEstado(r.estado)}
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
        width: 150,
        render: (r) => (
          <div className="flex flex-col gap-0.5">
            <Text size="xs" fw={700} c="zinc.200" truncate>
              {r.empleado_registro ?? "—"}
            </Text>
            <Text size="xs" c="gray">
              {formatDate(r.created_at)}
            </Text>
          </div>
        ),
      },
      {
        accessor: "acciones",
        title: "",
        textAlign: "center",
        width: 110,
        render: (r) => (
          <Group gap={4} justify="center" wrap="nowrap">
            <Tooltip label="Editar despacho" withArrow>
              <ActionIcon
                variant="light"
                color="indigo"
                size="md"
                radius="md"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditarDespacho(r);
                }}
              >
                <ArrowUturnLeftIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Registrar gasto" withArrow>
              <ActionIcon
                variant="light"
                color="yellow"
                size="md"
                radius="md"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegistrarGasto(r);
                }}
              >
                <BanknotesIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Registrar liquidacion" withArrow>
              <ActionIcon
                variant="light"
                color="blue"
                size="md"
                radius="md"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegistrarLiquidacion(r);
                }}
              >
                <ScaleIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [
      onEditarDespacho,
      onRegistrarGasto,
      onRegistrarLiquidacion,
    ],
  );

  return (
    <Paper className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <DataTableEstandar
        records={despachos}
        columns={columns}
        idAccessor="id_despacho_mineral"
        loading={loading}
        initialPageSize={10}
        noRecordsText="No se encontraron despachos de mineral."
        rowExpansion={{
          trigger: "click",
          allowMultiple: false,
          expanded: {
            recordIds: desplegados,
            onRecordIdsChange: (ids: unknown[]) =>
              onExpandedChange(ids.map((id) => Number(id))),
          },
          expandable: () => true,
          content: ({ record }: { record: DespachoMineralResumen }) => {
            const detalle = detalles[record.id_despacho_mineral];

            if (!detalle) {
              return (
                <div className="flex items-center justify-center gap-2 py-6 text-zinc-500 text-xs">
                  <span className="animate-pulse">Cargando detalle del despacho...</span>
                </div>
              );
            }

            return (
              <DespachoDetalle
                detalle={detalle}
                loading={detalleCargando === record.id_despacho_mineral}
                onEditarDespacho={() => onEditarDespacho(record)}
                onEliminarDespacho={() => onEliminarDespacho(record)}
                onRegistrarGasto={() => onRegistrarGasto(record)}
                onEditarGasto={(gasto) => onEditarGasto(record, gasto)}
                onEliminarGasto={(gasto) => onEliminarGasto(record, gasto)}
                onRegistrarFlete={() => onRegistrarFlete(record)}
                onEditarFlete={(flete) => onEditarFlete(record, flete)}
                onRegistrarBalanza={(flete) => onRegistrarBalanza(record, flete)}
                onEliminarFlete={(flete) => onEliminarFlete(record, flete)}
                onRegistrarComprobante={(tipo) =>
                  onRegistrarComprobante(record, tipo)
                }
                onEditarComprobante={(tipo, comprobante) =>
                  onEditarComprobante(record, tipo, comprobante)
                }
                onEliminarComprobante={(tipo, comprobante) =>
                  onEliminarComprobante(record, tipo, comprobante)
                }
                onRegistrarPago={(tipo, comprobante) =>
                  onRegistrarPago(record, tipo, comprobante)
                }
                onRegistrarAnalisis={() => onRegistrarAnalisis(record)}
                onEditarAnalisis={(analisis) => onEditarAnalisis(record, analisis)}
                onEliminarAnalisis={(analisis) =>
                  onEliminarAnalisis(record, analisis)
                }
                onRegistrarLiquidacion={() => onRegistrarLiquidacion(record)}
                onEditarLiquidacion={(liquidacion) =>
                  onEditarLiquidacion(record, liquidacion)
                }
                onEliminarLiquidacion={(liquidacion) =>
                  onEliminarLiquidacion(record, liquidacion)
                }
              />
            );
          },
        }}
      />
    </Paper>
  );
};
