import { useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  DocumentIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import type { DataTableColumn } from "mantine-datatable";
import dayjs from "dayjs";

import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { colorCalidadCarbon } from "../../../../shared/functions/calidad-carbon";
import { EstadoCargaVentaCarbon } from "../../../../shared/enums/venta-carbon/estado-carga-venta-carbon";
import { EstadoVentaCarbon } from "../../../../shared/enums/venta-carbon/estado-venta-carbon";
import type {
  CargaVentaCarbonItem,
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
  onConfirmarLlegada: (
    venta: VentaCarbonResumen,
    carga: CargaVentaCarbonItem,
  ) => void;
  onDespacharCargas: (venta: VentaCarbonResumen) => void;
}

export const VentaCarbonListado = ({
  ventas,
  loading,
  onConfirmarLlegada,
  onDespacharCargas,
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
        width: 120,
        render: (r) => (
          <div className="flex flex-col gap-1">
            <Text size="xs" fw={800} className="text-white font-mono">
              {r.correlativo}
            </Text>
            {r.codigo ? (
              <Badge size="xs" variant="light" color="blue" radius="sm">
                {r.codigo}
              </Badge>
            ) : (
              <Text size="11px" c="gray" fs="italic">
                Sin codigo del cliente
              </Text>
            )}
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
            <Stack gap={2} align="start">
              <Text size="xs" fw={600} c="zinc.300" truncate>
                {r.almacen_empresa_salida ?? "—"}
              </Text>
              <Text size="xs" fw={600} c="indigo.3" truncate>
                {r.almacen_cliente_llegada ?? "—"}
              </Text>
            </Stack>
          </Group>
        ),
      },
      {
        accessor: "cantidad_cargas",
        title: "Cargas",
        textAlign: "center",
        width: 120,
        render: (r) => (
          <Group gap={4} justify="center" wrap="nowrap">
            <Group gap={4}>
              <Badge variant="light" color="indigo" radius="md" size="sm">
                {r.cantidad_cargas} cargas
              </Badge>
              <Tooltip label="Despachar mas cargas" withArrow>
                <ActionIcon
                  variant="light"
                  color="indigo"
                  size="md"
                  radius="md"
                  onClick={() => onDespacharCargas(r)}
                >
                  <PlusIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </Group>
            {r.cantidad_cargas_confirmadas > 0 && (
              <Badge variant="light" color="teal" radius="md" size="sm">
                {r.cantidad_cargas_confirmadas}
              </Badge>
            )}
          </Group>
        ),
      },
      {
        accessor: "total_toneladas",
        title: "Toneladas",
        textAlign: "center",
        width: 120,
        render: (r) => (
          <div className="flex flex-col">
            <Text size="xs" fw={700} c="zinc.100">
              {formatNumber(r.total_toneladas)} TN
            </Text>
            {r.total_toneladas_confirmadas > 0 && (
              <Text size="xs" c="teal.4" fw={800}>
                {formatNumber(r.total_toneladas_confirmadas)} TN confirmadas
              </Text>
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
            {formatPEN(r.total_subtotal)}
          </Text>
        ),
      },
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

  const renderCargas = (venta: VentaCarbonResumen) => {
    if (!venta.cargas || venta.cargas.length === 0) {
      return (
        <div className="px-4 py-6 text-center">
          <Text size="xs" c="dimmed" fs="italic">
            Esta venta aun no tiene cargas despachadas.
          </Text>
        </div>
      );
    }

    return (
      <div className="px-4 py-3 bg-zinc-950/40">
        <Table
          highlightOnHover
          withTableBorder={false}
          verticalSpacing="xs"
          horizontalSpacing="sm"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                ta={"center"}
                w={60}
                className="text-zinc-400 text-xs font-semibold"
              >
                Carga
              </Table.Th>
              <Table.Th
                ta={"center"}
                w={170}
                className="text-zinc-400 text-xs font-semibold"
              >
                Tipo / Calidad
              </Table.Th>
              <Table.Th
                ta={"center"}
                w={170}
                className="text-zinc-400 text-xs font-semibold"
              >
                Vehiculo
              </Table.Th>
              <Table.Th
                ta={"center"}
                w={160}
                className="text-zinc-400 text-xs font-semibold"
              >
                TN
              </Table.Th>
              <Table.Th
                ta={"center"}
                w={180}
                className="text-zinc-400 text-xs font-semibold"
              >
                Salida / Ingreso
              </Table.Th>
              <Table.Th
                ta={"center"}
                w={160}
                className="text-zinc-400 text-xs font-semibold"
              >
                Guias / Ticket
              </Table.Th>
              <Table.Th
                ta={"center"}
                w={160}
                className="text-zinc-400 text-xs font-semibold"
              >
                Subtotal
              </Table.Th>
              <Table.Th
                ta={"center"}
                w={140}
                className="text-zinc-400 text-xs font-semibold"
              >
                Estado
              </Table.Th>
              <Table.Th
                ta={"center"}
                w={160}
                className="text-zinc-400 text-xs font-semibold"
              >
                Accion
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {venta.cargas.map((carga, i) => (
              <Table.Tr key={carga.id_carga_venta_carbon}>
                <Table.Td ta={"center"}>
                  <Badge size="xs" variant="light" color="indigo" radius="sm">
                    #{i + 1}
                  </Badge>
                </Table.Td>
                <Table.Td ta={"center"}>
                  <div className="flex flex-col gap-1 items-center">
                    <Text size="xs" fw={600} c="zinc.100">
                      {carga.tipo_carbon_estimado ?? "—"}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={colorCalidadCarbon(carga.calidad)}
                      radius="sm"
                    >
                      {carga.calidad ?? "Sin calidad"}
                    </Badge>
                    {carga.tipo_carbon_confirmado &&
                      carga.tipo_carbon_confirmado !==
                        carga.tipo_carbon_estimado && (
                        <Text size="11px" c="yellow.4" fw={600}>
                          conf: {carga.tipo_carbon_confirmado}
                        </Text>
                      )}
                  </div>
                </Table.Td>
                <Table.Td ta={"center"}>
                  <div className="flex flex-col gap-2.5 items-center">
                    <Group gap={4}>
                      <Text
                        size="xs"
                        fw={600}
                        c="zinc.200"
                        className="font-mono"
                      >
                        {carga.vehiculo_placa ?? "—"}
                      </Text>
                      {carga.vehiculo_tipo && (
                        <Badge size="xs" color="cyan">
                          {carga.vehiculo_tipo}
                        </Badge>
                      )}
                    </Group>
                    {carga.segunda_placa && (
                      <Text size="11px" c="gray" className="font-mono">
                        2da: {carga.segunda_placa}
                      </Text>
                    )}
                  </div>
                </Table.Td>
                <Table.Td ta={"center"}>
                  <div className="flex flex-col ">
                    <Text size="xs" fw={700} c="zinc.100">
                      {formatNumber(carga.cantidad_toneladas)}
                    </Text>
                  </div>
                </Table.Td>
                <Table.Td ta={"center"}>
                  <div className="flex flex-col gap-0.5">
                    <Text size="xs" c="zinc.400">
                      {formatDateTime(carga.fecha_hora_salida)}
                    </Text>
                    <Text size="xs" c="indigo.3">
                      {formatDateTime(carga.fecha_hora_ingreso)}
                    </Text>
                  </div>
                </Table.Td>
                <Table.Td ta={"center"}>
                  <div className="flex flex-col gap-0.5">
                    <Text size="xs" c="zinc.300" className="font-mono">
                      {carga.guia_remitente || "—"}
                    </Text>
                    <Text size="11px" c="gray" className="font-mono">
                      {carga.codigo_ticket_balanza
                        ? `Ticket ${carga.codigo_ticket_balanza}`
                        : "Sin ticket"}
                    </Text>
                  </div>
                </Table.Td>
                <Table.Td align="right" ta={"center"}>
                  <Text size="xs" fw={700} c="lime">
                    {formatPEN(carga.subtotal)}
                  </Text>
                </Table.Td>
                <Table.Td ta={"center"}>
                  <div className="flex flex-col gap-2 items-center">
                    <Badge
                      size="md"
                      variant={
                        carga.estado === EstadoCargaVentaCarbon.EnCamino
                          ? "filled"
                          : "light"
                      }
                      color={
                        carga.estado === EstadoCargaVentaCarbon.EnCamino
                          ? "yellow"
                          : "teal"
                      }
                      radius="md"
                    >
                      {carga.estado}
                    </Badge>
                    <Badge
                      size="md"
                      variant="light"
                      color={carga.evidencias?.length ? "indigo" : "gray"}
                      radius="md"
                      leftSection={<DocumentIcon className="w-3 h-3" />}
                    >
                      {carga.evidencias?.length ?? 0} evid.
                    </Badge>
                  </div>
                </Table.Td>
                <Table.Td ta={"center"}>
                  {carga.estado === EstadoCargaVentaCarbon.EnCamino ? (
                    <Button
                      size="xs"
                      radius="md"
                      color="teal"
                      variant="light"
                      leftSection={<CheckCircleIcon className="w-3.5 h-3.5" />}
                      onClick={() => onConfirmarLlegada(venta, carga)}
                      className="font-semibold"
                    >
                      Confirmar llegada
                    </Button>
                  ) : (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
    );
  };

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
          trigger: "always",
          expandable: ({ record }: { record: VentaCarbonResumen }) =>
            (record.cargas?.length ?? 0) > 0,
          content: ({ record }: { record: VentaCarbonResumen }) =>
            renderCargas(record),
        }}
      />
    </Paper>
  );
};
