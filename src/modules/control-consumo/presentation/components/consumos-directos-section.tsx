import { useState } from "react";
import {
  Card,
  Group,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Menu,
} from "@mantine/core";
import {
  WrenchScrewdriverIcon,
  SunIcon,
  MoonIcon,
  BuildingStorefrontIcon,
  TagIcon,
  CalendarDaysIcon,
  UserIcon,
  PencilSquareIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { TipoTurno } from "../../../../shared/enums/_generic/tipo-turno";
import type { DataTableColumn } from "mantine-datatable";
import type { RES_ConsumoDirecto } from "../../service/control-consumo.responses";

interface ConsumosDirectosSectionProps {
  consumos: RES_ConsumoDirecto[];
  onActualizarTurno: (
    idConsumo: number,
    nuevoTurno: TipoTurno,
  ) => Promise<void>;
  loading?: boolean;
}

export const ConsumosDirectosSection = ({
  consumos,
  onActualizarTurno,
  loading = false,
}: ConsumosDirectosSectionProps) => {
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleCambiarTurno = async (idConsumo: number, turno: TipoTurno) => {
    setUpdatingId(idConsumo);
    try {
      await onActualizarTurno(idConsumo, turno);
    } finally {
      setUpdatingId(null);
    }
  };

  const totalCosto = consumos.reduce(
    (acc, c) => acc + Number(c.costo_total_consumo || 0),
    0,
  );

  const columns: DataTableColumn<RES_ConsumoDirecto>[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
    },
    {
      accessor: "fecha_hora_consumo",
      title: "Fecha / Hora",
      textAlign: "center",
      width: 130,
      render: (r) => (
        <Group gap={4} justify="center">
          <CalendarDaysIcon className="w-3.5 h-3.5 text-zinc-400" />
          <Text size="xs" fw={700} className="text-zinc-200">
            {dayjs(r.fecha_hora_consumo).format("DD/MM/YYYY")}
          </Text>
          <Text size="11px" c="gray.3">
            {dayjs(r.fecha_hora_consumo).format("HH:mm")}
          </Text>
        </Group>
      ),
    },
    {
      accessor: "almacen",
      title: "Almacén Salida",
      textAlign: "center",
      width: 120,
      render: (r) => (
        <Group gap={4} justify="center">
          <BuildingStorefrontIcon className="w-3.5 h-3.5 text-cyan-400" />
          <Badge
            size="sm"
            color="cyan"
            variant="light"
            className="font-semibold border border-cyan-500/20"
          >
            {r.almacen}
          </Badge>
        </Group>
      ),
    },
    {
      accessor: "producto",
      title: "Producto",
      width: 160,
      textAlign: "center",
      render: (r) => (
        <Stack gap={2} justify="center">
          <Text size="xs" fw={700} className="text-zinc-100">
            {r.producto}
          </Text>
          {r.categoria && (
            <Text size="11px" c="gray.5" fw={600}>
              <TagIcon className="w-3 h-3 inline mr-0.5 text-zinc-500" />
              {r.categoria}
            </Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: "activo_fijo",
      title: "Destino",
      textAlign: "center",
      width: 200,
      render: (r) => (
        <Stack gap={2} className="py-1" justify="center">
          <Group gap={6} wrap="wrap">
            <CogIcon className="w-3.5 h-3.5 text-pink-400 inline" />
            <Text size="xs" fw={800} className="text-white">
              {r.producto_activo_fijo_consumidor ||
                r.correlativo_activo_fijo_consumidor ||
                "Activo S/N"}
            </Text>
            {r.correlativo_activo_fijo_consumidor && (
              <Badge
                size="sm"
                color="pink"
                variant="light"
                className="font-bold border border-pink-500/20"
              >
                {r.correlativo_activo_fijo_consumidor}
              </Badge>
            )}
          </Group>
          {(r.marca_activo_fijo_consumidor ||
            r.modelo_activo_fijo_consumidor) && (
            <Text size="9px" c="zinc.5" fw={600}>
              {r.marca_activo_fijo_consumidor}{" "}
              {r.modelo_activo_fijo_consumidor &&
                `(${r.modelo_activo_fijo_consumidor})`}
            </Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: "cantidad_base_consumida",
      title: "Cantidad",
      width: 90,
      textAlign: "center",
      render: (r) => (
        <Text size="xs" fw={800} className="text-white">
          {formatNumber(r.cantidad_base_consumida)}{" "}
          <span className="text-zinc-400 text-[10px] font-semibold">
            {r.unidad_medida_base_abv || r.unidad_medida_abv}
          </span>
        </Text>
      ),
    },
    {
      accessor: "costo_total_consumo",
      title: "Costo Total",
      width: 120,
      textAlign: "center",
      render: (r) => {
        const total = Number(r.costo_total_consumo || 0);
        const unit = Number(r.costo_unitario_base || 0);
        return (
          <Stack gap={1} align="flex-center">
            <Text size="xs" fw={900} className="text-emerald-400">
              S/. {formatNumber(total, 2)}
            </Text>
            {unit > 0 && (
              <Text size="10px" c="gray.4" fw={500}>
                S/. {formatNumber(unit, 2)} x{" "}
                {r.unidad_medida_base_abv || r.unidad_medida_abv}
              </Text>
            )}
          </Stack>
        );
      },
    },
    {
      accessor: "tipo_turno",
      title: "Turno",
      width: 90,
      textAlign: "center",
      render: (r) => {
        const turnoActual = r.tipo_turno;
        const esDia = turnoActual === TipoTurno.Dia;
        const isUpdating = updatingId === r.id_consumo;

        return (
          <Group gap={4} justify="center">
            {turnoActual ? (
              <Badge
                size="sm"
                variant="light"
                color={esDia ? "yellow" : "indigo"}
                className="font-extrabold uppercase border border-current/20 flex items-center gap-1"
              >
                {esDia ? (
                  <SunIcon className="w-3 h-3 inline mr-1 text-yellow-400" />
                ) : (
                  <MoonIcon className="w-3 h-3 inline mr-1 text-indigo-400" />
                )}
                {turnoActual}
              </Badge>
            ) : (
              <Badge
                size="sm"
                variant="outline"
                color="gray"
                className="font-medium"
              >
                Sin turno
              </Badge>
            )}

            <Menu shadow="md" width={140} position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  loading={isUpdating}
                  className="hover:text-white"
                  title="Cambiar turno"
                >
                  <PencilSquareIcon className="w-3.5 h-3.5" />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown className="bg-zinc-950 border border-zinc-800">
                <Menu.Label className="text-zinc-400 text-[10px] uppercase font-bold">
                  Asignar Turno
                </Menu.Label>
                <Menu.Item
                  leftSection={
                    <SunIcon className="w-3.5 h-3.5 text-yellow-400" />
                  }
                  onClick={() =>
                    handleCambiarTurno(r.id_consumo, TipoTurno.Dia)
                  }
                  disabled={turnoActual === TipoTurno.Dia}
                  className="text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  Turno Día
                </Menu.Item>
                <Menu.Item
                  leftSection={
                    <MoonIcon className="w-3.5 h-3.5 text-indigo-400" />
                  }
                  onClick={() =>
                    handleCambiarTurno(r.id_consumo, TipoTurno.Noche)
                  }
                  disabled={turnoActual === TipoTurno.Noche}
                  className="text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  Turno Noche
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        );
      },
    },
    {
      accessor: "empleado_registro",
      title: "Registrado por",
      width: 150,
      textAlign: "center",
      render: (r) => (
        <Group gap={4} justify="center">
          <UserIcon className="w-3 h-3 text-zinc-500" />
          <Text
            size="xs"
            className="text-zinc-300 font-medium truncate"
            title={r.empleado_registro}
          >
            {r.empleado_registro}
          </Text>
        </Group>
      ),
    },
  ];

  if (consumos.length === 0) {
    return null; // Don't show empty block if there are no direct consumptions in this period
  }

  return (
    <Card
      withBorder
      p="md"
      radius="24px"
      className="bg-zinc-900/60 border-zinc-800/80 shadow-md backdrop-blur-md"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <Group gap="xs" wrap="wrap">
          <div className="p-1.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
            <WrenchScrewdriverIcon className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <Text
              size="xs"
              fw={800}
              className="text-zinc-100 uppercase tracking-wider"
            >
              Consumos Directos
            </Text>
          </div>
          <Badge
            color="orange"
            variant="light"
            size="sm"
            className="font-bold border border-orange-500/20"
          >
            {consumos.length} {consumos.length === 1 ? "registro" : "registros"}
          </Badge>
          <Badge
            color="emerald"
            variant="light"
            size="sm"
            className="font-extrabold border border-emerald-500/20"
          >
            Costo: S/. {formatNumber(totalCosto, 2)}
          </Badge>
        </Group>
      </div>

      <DataTableEstandar
        idAccessor="id_consumo"
        columns={columns}
        records={consumos}
        loading={loading}
        minHeight={0}
      />
    </Card>
  );
};
