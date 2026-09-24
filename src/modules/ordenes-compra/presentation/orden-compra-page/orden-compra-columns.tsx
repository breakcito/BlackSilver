import { Badge, Group, Stack, Text, ActionIcon, Tooltip } from "@mantine/core";
import { FileText, Eye, AlertCircle, Receipt } from "lucide-react";
import dayjs from "dayjs";
import { type DataTableColumn } from "mantine-datatable";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { Estado_OrdenCompra } from "../../../../shared/enums/orden-compra/orden-compra";
import type { RES_OrdenCompra } from "../../../../service/responses/ordenes-compra/orden-compra";

export const COLOR_BY_STATE: Record<string, { color: string; label: string }> =
  {
    [Estado_OrdenCompra.Generada]: { color: "grape", label: "Generada" },
    [Estado_OrdenCompra.EnRecepcion]: { color: "blue", label: "En Recepción" },
    [Estado_OrdenCompra.Anulada]: { color: "red", label: "Anulada" },
    [Estado_OrdenCompra.Cerrada]: { color: "gray", label: "Cerrada" },
    [Estado_OrdenCompra.Completada]: { color: "green", label: "Completada" },
  };

interface GetColumnsProps {
  handleVerDetalle: (orden: RES_OrdenCompra) => void;
  handlePrintOC: (orden: RES_OrdenCompra) => void;
  handleAbrirRegistroComprobante: (orden: RES_OrdenCompra) => void;
  printingId: number | null;
}
export const getOrdenCompraColumns = ({
  handleVerDetalle,
  handlePrintOC,
  handleAbrirRegistroComprobante,
  printingId,
}: GetColumnsProps): DataTableColumn<RES_OrdenCompra>[] => [
  {
    accessor: "index",
    title: "#",
    textAlign: "center",
    width: 50,
  },
  {
    accessor: "correlativo",
    title: "Cód. Orden",
    width: 160,
    render: (item) => {
      const isPending =
        item.estado === Estado_OrdenCompra.Generada ||
        item.estado === Estado_OrdenCompra.EnRecepcion;

      return (
        <Group gap={8} wrap="nowrap">
          {isPending && (
            <Tooltip label="Pendiente de Recepción" withArrow color="orange">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </div>
            </Tooltip>
          )}
          <Badge
            variant={isPending ? "filled" : "light"}
            color={isPending ? "orange" : "blue"}
            radius="sm"
            size="sm"
            className={`font-bold px-2 tracking-widest text-sm ${isPending ? "shadow-lg shadow-orange-500/20" : ""}`}
          >
            {item.correlativo}
          </Badge>
        </Group>
      );
    },
  },
  {
    accessor: "proveedor",
    title: "Proveedor",
    width: 250,
    render: (item) => (
      <Stack gap={2}>
        <Text size="xs" fw={700} className="truncate leading-tight" c="lime.3">
          {item.proveedor}
        </Text>
        <Text
          size="10px"
          c="zinc.5"
          fw={700}
          className="uppercase tracking-widest"
        >
          DNI/RUC: {item.documento_proveedor}
        </Text>
      </Stack>
    ),
  },
  {
    accessor: "correlativo_cotizacion",
    title: "Cotización Ref.",
    width: 130,
    render: (item) => (
      <Badge
        variant="light"
        color="pink"
        radius="sm"
        size="sm"
        className="font-bold px-2"
      >
        {item.correlativo_cotizacion || "Sin Ref."}
      </Badge>
    ),
  },
  {
    accessor: "fecha_hora_orden",
    title: "Emisión",
    width: 120,
    render: (item) => (
      <Text size="xs" fw={800} className="text-zinc-200">
        {dayjs(item.fecha_hora_orden).format("DD/MM/YYYY")}
      </Text>
    ),
  },
  {
    accessor: "total_despues_igv",
    title: "Importe Total",
    textAlign: "center",
    width: 170,
    render: (item) => {
      const sinComprobante = !item.tiene_comprobante;
      return (
        <Stack gap={2} justify="center" align="center">
          <Text
            size="sm"
            fw={900}
            className="text-zinc-100 font-mono leading-none"
          >
            {item.moneda === "Soles" ? "S/." : "$"}{" "}
            {formatNumber(Number(item.total_despues_igv))}
          </Text>
          <Text size="9px" c="zinc.5" fw={700} className="uppercase tracking-widest">
            {item.metodo_pago}
          </Text>
          {sinComprobante && (
            <Tooltip
              label="Seleccionar recepciones para registrar comprobante"
              withArrow
              color="red"
            >
              <Badge
                variant="light"
                color="red"
                size="sm"
                radius="sm"
                onClick={() => handleAbrirRegistroComprobante(item)}
                className="cursor-pointer uppercase tracking-widest font-extrabold hover:bg-red-500/30 hover:text-red-300 transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  <Receipt size={10} className="shrink-0" />
                  Sin Comprobante
                </span>
              </Badge>
            </Tooltip>
          )}
        </Stack>
      );
    },
  },
  {
    accessor: "estado",
    title: "Estado",
    width: 150,
    textAlign: "center",
    render: (item) => {
      const isPending =
        item.estado === Estado_OrdenCompra.Generada ||
        item.estado === Estado_OrdenCompra.EnRecepcion;
      const stateInfo = COLOR_BY_STATE[item.estado] ?? {
        color: "zinc",
        label: item.estado,
      };

      return (
        <Group justify="center" gap={6}>
          <Badge
            variant="light"
            color={stateInfo.color}
            size="sm"
            radius="sm"
            className="font-bold tracking-widest"
          >
            {stateInfo.label.toUpperCase()}
          </Badge>
          {isPending && (
            <AlertCircle size={14} className="text-orange-500 animate-pulse" />
          )}
        </Group>
      );
    },
  },
  {
    accessor: "acciones",
    title: "Acciones",
    textAlign: "center",
    width: 120,
    render: (item) => (
      <Group gap="xs" justify="center">
        <Tooltip label="Ver Detalle" withArrow>
          <ActionIcon
            variant="subtle"
            color="indigo"
            onClick={() => handleVerDetalle(item)}
          >
            <Eye size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Imprimir" withArrow>
          <ActionIcon
            variant="subtle"
            color="zinc"
            loading={printingId === item.id_orden_compra}
            onClick={() => handlePrintOC(item)}
          >
            <FileText size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    ),
  },
];
