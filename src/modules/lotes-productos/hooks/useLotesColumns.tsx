import { useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Divider,
  Group,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import {
  CalendarDaysIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  PrinterIcon,
  DocumentTextIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { type DataTableColumn } from "mantine-datatable";

import type { RES_Lote } from "../service/lotes.responses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { EstadoBase } from "../../../shared/enums/_generic/estado-base";
import { useAuditoriaStore } from "../../../stores/auditoria.store";

interface UseLotesColumnsProps {
  onPrint: (lote: RES_Lote) => void;
  onEditAjuste: (lote: RES_Lote) => void;
  onEdit: (lote: RES_Lote) => void;
  onDelete: (lote: RES_Lote) => void;
  onHistory: (lote: RES_Lote) => void;
  deletingId: number | null;
}

export const useLotesColumns = ({
  onPrint,
  onEditAjuste,
  onEdit,
  onDelete,
  onHistory,
  deletingId,
}: UseLotesColumnsProps) => {
  const { en_modo_auditable } = useAuditoriaStore();
  return useMemo(() => {
    const columns: DataTableColumn<RES_Lote>[] = [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 60,
      },
      {
        accessor: "ticket",
        title: "",
        width: 35,
        render: (record) => (
          <ActionIcon
            variant="subtle"
            color="indigo"
            size="lg"
            onClick={() => onPrint(record)}
            className="hover:bg-indigo-900/30 transition-colors rounded-xl"
          >
            <PrinterIcon className="w-5 h-5 text-indigo-400" />
          </ActionIcon>
        ),
      },
      {
        accessor: "codigo_lote",
        title: "Cód. Lote",
        textAlign: "center",
        width: 130,
        render: (record) => (
          <Badge
            variant="light"
            color="indigo"
            radius="md"
            className="font-bold border border-indigo-500/20 py-3 mx-auto"
          >
            {en_modo_auditable && record.correlativo_auditoria
              ? record.correlativo_auditoria
              : record.correlativo}
          </Badge>
        ),
      },
      {
        accessor: "stock_actual",
        title: "Stock Disponible",
        textAlign: "center",
        width: 320,
        render: (record) => {
          return (
            <div className="flex flex-row justify-center">
              <Group gap="lg" wrap="nowrap" justify="center">
                {record.unidad_medida_base_abv !== record.unidad_medida_abv && (
                  <>
                    <Badge
                      variant="filled"
                      color="teal.9"
                      radius="md"
                      className="text-white font-bold h-7 px-3 shadow-lg shadow-teal-900/40"
                    >
                      {formatNumber(record.stock_actual)}{" "}
                      {record.unidad_medida_abv}
                    </Badge>

                    <div className="flex items-center gap-1 mt-1 px-1">
                      <Text size="10px" c="white" fw={800}>
                        {formatNumber(record.contenido_por_presentacion)}{" "}
                        {record.unidad_medida_base_abv} x{" "}
                        {record.unidad_medida_abv}
                      </Text>
                    </div>
                  </>
                )}

                <div className="flex flex-col items-center">
                  <Badge
                    variant="light"
                    color="pink.6"
                    radius="md"
                    className="font-bold h-7 border border-pink-500/20"
                  >
                    {formatNumber(record.stock_actual_base)}{" "}
                    {record.unidad_medida_base_abv}
                  </Badge>
                </div>

                <ActionIcon
                  variant="subtle"
                  color="zinc"
                  size="lg"
                  onClick={() => onEditAjuste(record)}
                  className="hover:bg-zinc-800 transition-colors rounded-xl"
                  title="Corrección de Inventario"
                >
                  <PencilSquareIcon className="w-5 h-5 text-zinc-400" />
                </ActionIcon>
              </Group>
            </div>
          );
        },
      },
      {
        accessor: "costo_por_unidad",
        title: "Costo",
        textAlign: "center",
        width: 200,
        render: (record) => {
          const tieneCosto =
            record.costo_por_unidad !== null &&
            record.costo_por_unidad !== undefined;
          if (!tieneCosto) {
            return (
              <Text size="xs" className="text-zinc-500 italic">
                No reg.
              </Text>
            );
          }

          const costoUnitario = record.costo_por_unidad as number;
          const costoTotal = costoUnitario * record.stock_actual;

          return (
            <div className="flex flex-row items-center justify-center gap-3">
              <Text size="11px" fw={600} className="font-mono text-zinc-500">
                S/.{formatNumber(costoUnitario)} x {record.unidad_medida_abv}
              </Text>
              <Divider orientation="vertical" color="dark.4" />
              <Text size="xs" fw={800} className="font-mono" c="teal.4">
                S/.{formatNumber(costoTotal)}
              </Text>
            </div>
          );
        },
      },
      {
        accessor: "origen_compra",
        title: "Origen Compra",
        textAlign: "center",
        width: 180,
        render: (record) => {
          const tieneFactura =
            record.serie_factura_compra && record.numero_factura_compra;
          const tieneOC = record.id_orden_compra ? true : false;

          if (!tieneFactura && !tieneOC) {
            return (
              <Text size="xs" c="dimmed" fs="italic">
                Carga Manual
              </Text>
            );
          }

          return (
            <Group gap={6} wrap="nowrap" justify="center">
              <div className="p-1.5 bg-zinc-800/40 rounded-lg border border-zinc-700/30 flex items-center justify-center">
                <DocumentTextIcon className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                {tieneFactura ? (
                  <Badge
                    size="sm"
                    variant="light"
                    color="cyan"
                    radius="sm"
                    className="font-bold border border-cyan-500/10 px-1 py-0"
                  >
                    {record.serie_factura_compra}-{record.numero_factura_compra}
                  </Badge>
                ) : null}
                {tieneOC ? null : (
                  <Text
                    size="9px"
                    c="orange"
                    fw={700}
                    className="uppercase tracking-wider"
                  >
                    Sin O.C.
                  </Text>
                )}
              </div>
            </Group>
          );
        },
      },
      {
        accessor: "fecha_ingreso",
        title: "Ingreso",
        textAlign: "center",
        width: 140,
        render: (record) => (
          <Group gap={8} wrap="nowrap" justify="center">
            <div className="p-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/30">
              <CalendarDaysIcon className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <Text size="11px" fw={700} className="text-zinc-200">
                {dayjs(record.fecha_hora_ingreso).format("DD MMM YYYY")}
              </Text>
              <Text
                size="11px"
                c="dimmed"
                fw={700}
                className="uppercase tracking-tighter"
              >
                {dayjs(record.fecha_hora_ingreso).format("HH:mm")}
              </Text>
            </div>
          </Group>
        ),
      },
      {
        accessor: "fecha_vencimiento",
        title: "Vencimiento",
        textAlign: "center",
        width: 150,
        render: (record) => {
          if (!record.fecha_vencimiento) {
            return (
              <Text size="xs" c="dimmed" fs="italic">
                No aplica
              </Text>
            );
          }
          const isVencido = record.estado_vencimiento === "Vencido";
          return (
            <Group gap={8} wrap="nowrap" justify="center">
              <div
                className={`p-1.5 rounded-lg border ${isVencido ? "bg-red-500/10 border-red-500/30" : "bg-orange-500/10 border-orange-500/30"}`}
              >
                <ClockIcon
                  className={`w-4 h-4 ${isVencido ? "text-red-500" : "text-orange-400"}`}
                />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <Text
                  size="11px"
                  fw={800}
                  className={isVencido ? "text-red-500" : "text-orange-400"}
                >
                  {dayjs(record.fecha_vencimiento).format("DD/MM/YYYY")}
                </Text>
                <Text
                  size="9px"
                  fw={900}
                  className={`uppercase tracking-widest ${isVencido ? "text-red-700" : "text-orange-800"}`}
                >
                  {record.estado_vencimiento}
                </Text>
              </div>
            </Group>
          );
        },
      },
      {
        accessor: "plazo",
        title: "Plazo",
        textAlign: "center",
        width: 150,
        render: (record) => {
          if (!record.fecha_vencimiento || record.dias_para_vencer === null) {
            return (
              <Text size="xs" c="dimmed" fs="italic">
                ---
              </Text>
            );
          }
          return (
            <Stack gap={2} align="center">
              <Text
                size="10px"
                fw={900}
                className={
                  record.dias_para_vencer <= 0
                    ? "text-red-500"
                    : "text-zinc-300"
                }
              >
                {record.dias_para_vencer <= 0
                  ? "VENCIDO"
                  : `QUEDAN: ${record.dias_para_vencer} DÍAS`}
              </Text>
              {record.dias_espera_vencimiento && (
                <Text size="10px" c="dimmed" fw={700} className="uppercase">
                  Aviso: {record.dias_espera_vencimiento}d. antes
                </Text>
              )}
            </Stack>
          );
        },
      },
      {
        accessor: "estado",
        title: "Estado",
        textAlign: "center",
        width: 100,
        render: (record) => (
          <Badge
            color={record.estado == EstadoBase.Activo ? "teal.9" : "grow.9"}
            variant="filled"
            size="xs"
            radius="sm"
            className="font-black border border-zinc-800 shadow-md mx-auto"
          >
            {record.estado.toUpperCase()}
          </Badge>
        ),
      },
      {
        accessor: "actions",
        title: "",
        width: 70,
        textAlign: "right",
        render: (record) => (
          <Menu shadow="md" width={200} position="bottom-end" withArrow>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Abrir acciones del lote"
                title="Acciones"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown className="bg-zinc-900 border-zinc-800">
              <Menu.Label className="text-zinc-500">Acciones</Menu.Label>
              <Menu.Item
                leftSection={<PencilSquareIcon className="w-4 h-4" />}
                onClick={() => onEdit(record)}
                className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Editar
              </Menu.Item>
              <Menu.Item
                leftSection={<ClockIcon className="w-4 h-4" />}
                onClick={() => onHistory(record)}
                className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Ver historial
              </Menu.Item>
              <Menu.Divider className="border-zinc-800" />
              <Menu.Item
                leftSection={<TrashIcon className="w-4 h-4" />}
                color="red"
                onClick={() => onDelete(record)}
                disabled={deletingId === record.id_lote}
                className="hover:bg-red-900/20"
              >
                Eliminar
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ),
      },
    ];

    return columns;
  }, [onPrint, onEditAjuste, onEdit, onDelete, onHistory, deletingId, en_modo_auditable]);
};
