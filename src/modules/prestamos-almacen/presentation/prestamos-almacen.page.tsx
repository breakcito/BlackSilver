import { useState, useMemo } from "react";
import {
  Stack,
  Text,
  Select,
  Badge,
  Group,
  Tooltip,
  ActionIcon,
  TextInput,
  Skeleton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  EyeIcon,
  CubeIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { type DataTableColumn } from "mantine-datatable";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { usePrestamosAlmacen } from "../hooks/usePrestamosAlmacen";
import type { GrupoAlmacenPrestamos } from "../hooks/usePrestamosAlmacen";
import { useDetallePrestamo } from "../hooks/useDetallePrestamo";
import { useTrazabilidadPrestamo } from "../hooks/useTrazabilidadPrestamo";
import { DetallePrestamo } from "./detalle-prestamo";
import { TrazabilidadDetalle } from "./trazabilidad-detalle";
import { HistorialEntregasPrestamo } from "./components/HistorialEntregasPrestamo";
import { RegistroReposicion } from "./components/registro-reposicion/registro-reposicion";
import { HistorialReposiciones } from "./components/historial-reposiciones/historial-reposiciones";
import { MESES } from "../../../shared/variables/meses";
import { Estado_Prestamo } from "../../../shared/enums/prestamo-almacen/prestamo";
import { getEstadoPrestamoColor } from "./utils/prestamos-render";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";
import dayjs from "dayjs";
import type {
  RES_Prestamo,
  RES_PrestamoDetalle,
} from "../../../service/responses/prestamos/prestamo";

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

// ─── Cabecera de grupo por almacén ───────────────────────────────────────────
const AlmacenGroupHeader = ({
  grupo,
}: {
  grupo: GrupoAlmacenPrestamos;
}) => (
  <div className="px-5 py-3 bg-zinc-900/60 border-b border-zinc-800/60 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/20">
        <BuildingStorefrontIcon className="w-4 h-4 text-teal-400" />
      </div>
      <Stack gap={0}>
        <Text
          size="9px"
          fw={900}
          className="uppercase tracking-[0.25em] text-zinc-500"
        >
          Almacén Prestamista
        </Text>
        <Text size="sm" fw={800} className="text-white tracking-tight">
          {grupo.almacen_prestamista}
        </Text>
      </Stack>
    </div>
    <Badge
      variant="light"
      color="teal"
      radius="md"
      size="sm"
      className="shrink-0"
    >
      {grupo.prestamos.length}{" "}
      {grupo.prestamos.length === 1 ? "préstamo" : "préstamos"}
    </Badge>
  </div>
);

// ─── Skeletons de grupo ───────────────────────────────────────────────────────
const GroupSkeleton = () => (
  <div className="bg-zinc-900/65 border border-zinc-800 rounded-[20px] overflow-hidden">
    <div className="px-5 py-3 bg-zinc-900/60 border-b border-zinc-800/60 flex items-center gap-3">
      <Skeleton height={36} width={36} radius="xl" />
      <div className="space-y-1.5">
        <Skeleton height={8} width={100} radius="sm" />
        <Skeleton height={14} width={160} radius="sm" />
      </div>
    </div>
    <div className="p-4 space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} height={44} radius="sm" />
      ))}
    </div>
  </div>
);

export const PrestamosAlmacenPage = () => {
  useTitlePage("Préstamos Solicitados");
  const {
    groupedByAlmacen,
    loading,
    recargar,
    mes,
    setMes,
    yearcito,
    setYearcito,
  } = usePrestamosAlmacen();

  const [search, setSearch] = useState("");

  const {
    opened: openedDetail,
    detalles,
    loading: loadingDetail,
    fetchDetalles,
    closeDetail,
    selectedPrestamoId,
    openedRepo,
    selectedItemsRepo,
    openReposicion,
    closeReposicion,
    openedHistorialRepo,
    openHistorialRepo,
    closeHistorialRepo,
    reloadDetalles,
  } = useDetallePrestamo();

  const {
    logs,
    loading: loadingLogs,
    opened: openedTrace,
    fetchTrazabilidad,
    closeTrazabilidad,
  } = useTrazabilidadPrestamo();

  const [selectedDetalle, setSelectedDetalle] =
    useState<RES_PrestamoDetalle | null>(null);

  const [openedHistorial, { open: openHistorial, close: closeHistorial }] =
    useDisclosure(false);

  // Todos los prestamos aplanados para encontrar el seleccionado
  const allPrestamos = useMemo(
    () => groupedByAlmacen.flatMap((g) => g.prestamos),
    [groupedByAlmacen],
  );

  const selectedPrestamo = useMemo(() => {
    return allPrestamos.find((p) => p.id_prestamo === selectedPrestamoId);
  }, [allPrestamos, selectedPrestamoId]);

  const progresoGeneral = useMemo(() => {
    if (detalles.length === 0) return 0;
    const totalSolicitado = detalles.reduce(
      (acc, d) => acc + Number(d.cantidad_solicitada_base),
      0,
    );
    const totalPrestado = detalles.reduce(
      (acc, d) => acc + Number(d.cantidad_prestada_base),
      0,
    );
    return Math.round((totalPrestado / totalSolicitado) * 100) || 0;
  }, [detalles]);

  // Filtrado por búsqueda dentro de cada grupo
  const filteredGroups = useMemo(() => {
    if (!search) return groupedByAlmacen;
    const s = search.toLowerCase();
    return groupedByAlmacen
      .map((grupo) => ({
        ...grupo,
        prestamos: grupo.prestamos.filter(
          (p) =>
            p.correlativo.toLowerCase().includes(s) ||
            p.almacen_solicitante.toLowerCase().includes(s) ||
            p.solicitud_reabastecimiento?.toLowerCase().includes(s),
        ),
      }))
      .filter((g) => g.prestamos.length > 0);
  }, [groupedByAlmacen, search]);

  const columns: DataTableColumn<RES_Prestamo>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 60,
        render: (_record, index) => index + 1,
      },
      {
        accessor: "correlativo",
        title: "Código",
        width: 140,
        render: (item) => (
          <Badge variant="light" color="indigo" radius="sm">
            {item.correlativo}
          </Badge>
        ),
      },
      {
        accessor: "almacen_solicitante",
        title: "Almacén Destino",
        width: 250,
        render: (item) => (
          <Group gap="xs" wrap="nowrap">
            <BuildingStorefrontIcon className="w-5 h-5 text-zinc-500 shrink-0" />
            <Text size="sm" className="text-zinc-200" fw={500}>
              {item.almacen_solicitante}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "fecha_hora_prestamo",
        title: "Fechas",
        width: 220,
        render: (item) => (
          <Stack gap={2}>
            <Group gap={6}>
              <CalendarDaysIcon className="w-4 h-4 text-zinc-500" />
              <Text size="xs" fw={600} className="text-zinc-200">
                Préstamo: {dayjs(item.fecha_hora_prestamo).format("DD/MM/YYYY")}
              </Text>
            </Group>
            {item.fecha_limite_devolucion && (
              <Text size="11px" className="text-orange-500/80 ml-5.5" fw={500}>
                Devolución:{" "}
                {dayjs(item.fecha_limite_devolucion).format("DD/MM/YYYY")}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        accessor: "registrado_por",
        title: "Solicitante",
        width: 200,
        render: (item) => (
          <Group gap="xs" wrap="nowrap">
            <UserCircleIcon className="w-5 h-5 text-emerald-500" />
            <Text size="sm" className="text-zinc-200">
              {item.registrado_por}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "solicitud_reabastecimiento",
        title: "Solicitud Ref.",
        width: 200,
        render: (item) => (
          <Badge variant="light" color="blue" radius="sm">
            {item.solicitud_reabastecimiento}
          </Badge>
        ),
      },
      {
        accessor: "estado",
        title: "Estado",
        width: 150,
        render: (item) => (
          <Badge
            color={getEstadoPrestamoColor(item.estado as Estado_Prestamo)}
            variant="light"
            radius="sm"
            size="sm"
            className="font-semibold uppercase tracking-wider"
          >
            {item.estado}
          </Badge>
        ),
      },
      {
        accessor: "acciones",
        title: "Acciones",
        textAlign: "center",
        width: 100,
        render: (item) => (
          <Group gap="xs" justify="center">
            <Tooltip label="Ver Detalle" position="top" withArrow>
              <ActionIcon
                variant="filled"
                color="indigo"
                radius="md"
                onClick={() => fetchDetalles(item.id_prestamo)}
                className="shadow-sm hover:scale-110 transition-transform"
              >
                <EyeIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [fetchDetalles],
  );

  return (
    <div className="space-y-8 animate-fade-in text-zinc-100">
      {/* Filtros — solo mes y año */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-end">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1 w-full">
          <Select
            label="Mes"
            placeholder="Elegir mes"
            data={MESES}
            value={mes}
            onChange={setMes}
            leftSection={<CalendarDaysIcon className="w-4 h-4" />}
            radius="lg"
            size="sm"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />

          <Select
            label="Año"
            placeholder="Elegir año"
            data={YEARS}
            value={yearcito}
            onChange={setYearcito}
            leftSection={<CalendarDaysIcon className="w-4 h-4" />}
            radius="lg"
            size="sm"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />

          <TextInput
            label="Búsqueda"
            placeholder="Código, destino o solicitud..."
            leftSection={
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            radius="lg"
            size="sm"
            className="sm:col-span-2"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
            }}
          />
        </div>
        <BotonRecargar onReload={recargar} loading={loading} />
      </div>

      {/* Contenido agrupado */}
      {loading ? (
        <Stack gap="xl">
          <GroupSkeleton />
          <GroupSkeleton />
        </Stack>
      ) : filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 text-zinc-500 gap-4">
          <div className="bg-zinc-900/50 p-6 rounded-full border border-zinc-800 animate-pulse">
            <CubeIcon className="w-12 h-12 text-zinc-700" />
          </div>
          <div className="text-center">
            <Text fw={600} size="lg" className="text-zinc-400">
              No se encontraron préstamos
            </Text>
            <Text size="sm" className="text-zinc-600">
              Intenta cambiando el periodo o ajustando tu búsqueda
            </Text>
          </div>
        </div>
      ) : (
        <Stack gap="xl">
          {filteredGroups.map((grupo) => (
            <div
              key={grupo.id_almacen_prestamista}
              className="bg-zinc-900/65 border border-zinc-800 rounded-[20px] shadow-2xl overflow-hidden"
            >
              <AlmacenGroupHeader grupo={grupo} />
              <div className="relative shadow-inner">
                <DataTableEstandar
                  idAccessor="id_prestamo"
                  columns={columns}
                  records={grupo.prestamos}
                  loading={false}
                  initialPageSize={5}
                  minHeight={0}
                />
              </div>
            </div>
          ))}
        </Stack>
      )}

      <ModalEstandar
        opened={openedDetail}
        close={closeDetail}
        title="Detalle del Préstamo"
        size="95%"
      >
        {selectedPrestamo && (
          <DetallePrestamo
            headerData={selectedPrestamo}
            detalles={detalles}
            loading={loadingDetail}
            progresoGeneral={progresoGeneral}
            onOpenTrazabilidad={(det) => {
              setSelectedDetalle(det);
              fetchTrazabilidad(det.id_prestamo_detalle);
            }}
            onOpenHistorial={openHistorial}
            onOpenReposicion={openReposicion}
            onOpenHistorialReposiciones={openHistorialRepo}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedRepo}
        close={closeReposicion}
        title="Registro de Reposición"
        validateClose
        size="80%"
      >
        {selectedPrestamoId && (
          <RegistroReposicion
            idPrestamo={selectedPrestamoId}
            selectedDetalles={selectedItemsRepo}
            onSuccess={() => {
              closeReposicion();
              reloadDetalles();
            }}
            onCancel={closeReposicion}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedHistorialRepo}
        close={closeHistorialRepo}
        title="Historial de Reposiciones"
        size="70%"
      >
        {selectedPrestamoId && (
          <HistorialReposiciones idPrestamo={selectedPrestamoId} />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedHistorial}
        close={closeHistorial}
        title="Historial de Entregas del Préstamo"
        size="70%"
      >
        {selectedPrestamoId && (
          <HistorialEntregasPrestamo idPrestamo={selectedPrestamoId} />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedTrace}
        close={closeTrazabilidad}
        title="Seguimiento de tu préstamo"
        size="md"
      >
        {selectedDetalle && (
          <TrazabilidadDetalle
            productoNombre={selectedDetalle.producto}
            logs={logs}
            loading={loadingLogs}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
