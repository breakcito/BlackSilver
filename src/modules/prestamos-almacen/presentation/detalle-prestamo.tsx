import {
  Badge,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  ActionIcon,
  Tooltip,
  Button,
} from "@mantine/core";
import {
  ClockIcon,
  CubeIcon,
  ListBulletIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  UserIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { Estado_PrestamoDetalle } from "../../../shared/enums/prestamo-almacen/prestamo";
import { getEstadoDetalleColor } from "./utils/prestamos-render";
import type {
  RES_Prestamo,
  RES_PrestamoDetalle,
} from "../../../service/responses/prestamos/prestamo";

interface DetallePrestamoProps {
  headerData: RES_Prestamo;
  detalles: RES_PrestamoDetalle[];
  loading: boolean;
  progresoGeneral: number;
  onOpenTrazabilidad: (detalle: RES_PrestamoDetalle) => void;
  onOpenHistorial: () => void;
  onOpenReposicion: (detalles: RES_PrestamoDetalle[]) => void;
  onOpenHistorialReposiciones: () => void;
}

export const DetallePrestamo = ({
  headerData,
  detalles,
  loading,
  progresoGeneral,
  onOpenTrazabilidad,
  onOpenHistorial,
  onOpenReposicion,
  onOpenHistorialReposiciones,
}: DetallePrestamoProps) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader color="indigo" size="lg" />
      </div>
    );
  }

  return (
    <Stack gap="xl" className="animate-fade-in">
      {/* Header: Datos Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <Paper
          p="md"
          radius="lg"
          className="bg-violet-500/6 border border-violet-500/20 relative overflow-hidden group hover:bg-violet-500/10 transition-all"
        >
          <CheckBadgeIcon className="absolute -right-2 -bottom-2 w-16 h-16 text-violet-400/10 rotate-12 group-hover:scale-110 transition-transform" />
          <Stack gap={2} className="relative z-10">
            <Group gap={6}>
              <CheckBadgeIcon className="w-4 h-4 text-violet-400" />
              <Text
                size="xs"
                c="violet.3"
                fw={800}
                className="uppercase tracking-widest"
              >
                Correlativo
              </Text>
            </Group>
            <Text
              size="md"
              fw={900}
              className="text-zinc-100 tracking-tight leading-tight"
            >
              {headerData.correlativo}
            </Text>
          </Stack>
        </Paper>

        <Paper
          p="md"
          radius="lg"
          className="bg-amber-500/6 border border-amber-500/20 relative overflow-hidden group hover:bg-amber-500/10 transition-all"
        >
          <UserIcon className="absolute -right-2 -bottom-2 w-16 h-16 text-amber-400/10 rotate-12 group-hover:scale-110 transition-transform" />
          <Stack gap={2} className="relative z-10">
            <Group gap={6}>
              <UserIcon className="w-4 h-4 text-amber-500" />
              <Text
                size="xs"
                c="amber.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Registrado por
              </Text>
            </Group>
            <Text
              size="md"
              fw={800}
              className="text-zinc-100 tracking-tight leading-tight"
            >
              {headerData.registrado_por}
            </Text>
          </Stack>
        </Paper>

        <Paper
          p="md"
          radius="lg"
          className="bg-emerald-500/6 border border-emerald-500/20 relative overflow-hidden group hover:bg-emerald-500/10 transition-all"
        >
          <BuildingStorefrontIcon className="absolute -right-2 -bottom-2 w-16 h-16 text-emerald-400/10 rotate-12 group-hover:scale-110 transition-transform" />
          <Stack gap={2} className="relative z-10">
            <Group gap={6}>
              <BuildingStorefrontIcon className="w-4 h-4 text-emerald-500" />
              <Text
                size="xs"
                c="emerald.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Almacén Destino
              </Text>
            </Group>
            <Text
              size="md"
              fw={800}
              className="text-zinc-100 tracking-tight leading-tight italic"
            >
              {headerData.almacen_solicitante}
            </Text>
          </Stack>
        </Paper>

        <Paper
          p="md"
          radius="lg"
          className="bg-zinc-500/6 border border-zinc-500/20 relative overflow-hidden group hover:bg-zinc-500/10 transition-all"
        >
          <ClockIcon className="absolute -right-2 -bottom-2 w-16 h-16 text-zinc-400/10 rotate-12 group-hover:scale-110 transition-transform" />
          <Stack gap={2} className="relative z-10">
            <Group gap={6}>
              <ClockIcon className="w-4 h-4 text-zinc-500" />
              <Text
                size="xs"
                c="zinc.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Devolución Límite
              </Text>
            </Group>
            <Text
              size="md"
              fw={800}
              className="text-zinc-100 tracking-tight leading-tight font-mono"
            >
              {headerData.fecha_limite_devolucion
                ? dayjs(headerData.fecha_limite_devolucion).format("DD/MM/YYYY")
                : "No especificada"}
            </Text>
          </Stack>
        </Paper>
      </div>

      {/* Sub-header: Estados, Fechas y Solicitud Ref */}
      <Paper
        p="md"
        radius="lg"
        bg="transparent"
        className="border border-zinc-800/50 mx-2"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Stack gap={4}>
            <Text
              size="xs"
              c="zinc.5"
              fw={800}
              className="uppercase tracking-widest"
            >
              Estado General
            </Text>
            <Badge
              color="indigo"
              variant="light"
              size="sm"
              radius="sm"
              className="border border-indigo-900/30 font-bold"
            >
              {headerData.estado}
            </Badge>
          </Stack>

          <Stack gap={4}>
            <div className="flex items-center gap-1.5 font-bold">
              <CalendarDaysIcon className="w-3.5 h-3.5 text-rose-500" />
              <Text
                size="xs"
                c="zinc.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Fecha Registro
              </Text>
            </div>
            <Text size="sm" fw={800} className="text-zinc-100 italic">
              {dayjs(headerData.created_at).format("DD/MM/YYYY")}
            </Text>
          </Stack>

          <Stack gap={4}>
            <div className="flex items-center gap-1.5 font-bold">
              <CalendarDaysIcon className="w-3.5 h-3.5 text-cyan-500" />
              <Text
                size="xs"
                c="zinc.5"
                fw={800}
                className="uppercase tracking-widest"
              >
                Fecha Préstamo
              </Text>
            </div>
            <Text size="sm" fw={800} className="text-zinc-100 italic">
              {dayjs(headerData.fecha_hora_prestamo).format("DD/MM/YYYY")}
            </Text>
          </Stack>

          <Stack gap={4}>
            <Text
              size="xs"
              c="zinc.5"
              fw={800}
              className="uppercase tracking-widest"
            >
              Solicitud Ref.
            </Text>
            <Badge variant="light" color="blue" radius="sm">
              {headerData.solicitud_reabastecimiento}
            </Badge>
          </Stack>
        </div>
      </Paper>

      {/* Barra de Progreso */}
      <Paper
        p="md"
        radius="xl"
        className="bg-zinc-900/50 border border-zinc-800 mx-2"
      >
        <Group justify="space-between" mb={8} px={4}>
          <Text
            size="xs"
            fw={800}
            className="text-zinc-400 tracking-tighter uppercase"
          >
            Progreso General de Atención
          </Text>
          <Text size="sm" fw={900} c="indigo.4">
            {progresoGeneral}%
          </Text>
        </Group>
        <div className="relative h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-linear-to-r from-indigo-500 to-indigo-400 transition-all duration-1000"
            style={{ width: `${progresoGeneral}%` }}
          />
        </div>
      </Paper>

      {/* Tabla de Items */}
      <div className="space-y-4 px-2">
        <Group justify="space-between" align="center" px={4}>
          <Group gap="lg">
            <Group gap="xs">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg shadow-sm border border-indigo-500/10">
                <ListBulletIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <Text
                fw={800}
                className="text-zinc-100 italic tracking-tight text-lg"
              >
                Productos en Préstamo
              </Text>
            </Group>

            <Button
              size="xs"
              radius="xl"
              variant="light"
              color="indigo"
              leftSection={<TruckIcon className="w-4 h-4" />}
              onClick={onOpenHistorial}
              className="font-bold border border-indigo-500/20 shadow-xs"
            >
              Historial de Entregas
            </Button>

            <Button
              size="xs"
              radius="xl"
              variant="light"
              color="teal"
              leftSection={<ClockIcon className="w-4 h-4" />}
              onClick={onOpenHistorialReposiciones}
              className="font-bold border border-teal-500/20 shadow-xs"
            >
              Historial de Reposiciones
            </Button>

            <Button
              size="xs"
              radius="xl"
              color="indigo"
              leftSection={<TruckIcon className="w-4 h-4" />}
              onClick={() =>
                onOpenReposicion(
                  detalles.filter(
                    (d) =>
                      // Solo productos que tengan algo pendiente de reponer
                      Number(d.cantidad_repuesta_base) <
                      Number(d.cantidad_prestada_base),
                  ),
                )
              }
              className="font-bold shadow-xs"
            >
              Nueva Reposición
            </Button>
          </Group>
          <Badge
            variant="light"
            color="indigo"
            radius="md"
            size="sm"
            className="font-bold py-3 px-4 uppercase tracking-widest"
          >
            {detalles.length} {detalles.length === 1 ? "Producto" : "Productos"}
          </Badge>
        </Group>

        <div className="overflow-hidden border border-zinc-800 rounded-2xl shadow-2xl bg-zinc-950/20">
          <Table verticalSpacing="md" horizontalSpacing="xl">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 text-center w-12">#</th>
                <th className="px-6 py-4 text-left">Producto</th>
                <th className="px-6 py-4 text-center">Cantidad Solicitada</th>
                <th className="px-6 py-4 text-center w-44">Progreso</th>
                <th className="px-6 py-4 text-left">Comentario</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {detalles.map((item, index) => {
                const solicitadoBase = Number(
                  item.cantidad_solicitada_base || 1,
                );
                const atendidoBase = Number(item.cantidad_prestada_base || 0);
                const progresoItem = Math.min(
                  100,
                  Math.round((atendidoBase / solicitadoBase) * 100),
                );

                return (
                  <tr
                    key={item.id_prestamo_detalle}
                    className="hover:bg-zinc-900/40 transition-colors group"
                  >
                    <td className="px-6 py-4 text-center text-zinc-500 text-xs font-mono">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td className="px-6 py-4">
                      <Group gap="sm">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-sm group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5 transition-all duration-300">
                          <CubeIcon className="w-4.5 h-4.5 text-zinc-400 group-hover:text-indigo-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <Text
                          size="sm"
                          fw={800}
                          className="text-zinc-100 group-hover:text-white transition-colors tracking-tight"
                        >
                          {item.producto}
                        </Text>
                      </Group>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Group justify="center" gap="sm">
                        <Badge
                          variant="filled"
                          color="indigo"
                          radius="sm"
                          className="font-bold shadow-xs whitespace-nowrap"
                        >
                          {formatNumber(item.cantidad_solicitada)}{" "}
                          {item.unidad_medida_pr_abv}
                        </Badge>
                      </Group>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex justify-between items-center px-1 gap-2">
                          <Text
                            size="11px"
                            fw={800}
                            c="zinc.5"
                            className="flex flex-row gap-0.5"
                          >
                            <span>Prestado: </span>
                            <span>
                              {formatNumber(item.cantidad_prestada_base)}
                            </span>
                            <span>{item.unidad_medida_base_abv}</span>
                          </Text>
                          <Text size="11px" fw={900} c="indigo.4">
                            {progresoItem}%
                          </Text>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/30">
                          <div
                            className="h-full bg-linear-to-r from-indigo-600 to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all duration-700"
                            style={{ width: `${progresoItem}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Text
                        size="xs"
                        c="zinc.5"
                        className="italic leading-tight whitespace-pre-wrap"
                      >
                        {item.comentario || (
                          <span className="text-zinc-500">Sin comentarios</span>
                        )}
                      </Text>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        color={getEstadoDetalleColor(
                          item.estado as Estado_PrestamoDetalle,
                        )}
                        variant="light"
                        size="sm"
                        radius="md"
                        className="font-bold px-3 py-2.5"
                      >
                        {item.estado}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Group gap="xs" justify="center">
                        <Tooltip
                          label="Ver seguimiento"
                          position="top"
                          withArrow
                          radius="md"
                        >
                          <ActionIcon
                            variant="filled"
                            color="indigo"
                            radius="md"
                            onClick={() => onOpenTrazabilidad(item)}
                            className="shadow-md hover:scale-105 transition-transform"
                          >
                            <ClockIcon className="w-4 h-4 text-white" />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </div>
    </Stack>
  );
};
