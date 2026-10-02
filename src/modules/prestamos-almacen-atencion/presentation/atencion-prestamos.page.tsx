import { useState, useMemo } from "react";
import {
  Badge,
  Group,
  Stack,
  Text,
  TextInput,
  ActionIcon,
  Tooltip,
  Select,
  Loader,
} from "@mantine/core";
import {
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  PlayCircleIcon,
  ArchiveBoxArrowDownIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { type DataTableColumn } from "mantine-datatable";
import { useDisclosure } from "@mantine/hooks";
import { useAtencionPrestamos } from "../hooks/useAtencionPrestamos";
import type { RES_Prestamo } from "../../../service/responses/prestamos/prestamo";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { MESES } from "../../../shared/variables/meses";
import { DetallePrestamo } from "./detalle-prestamo";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

const ESTADO_COLORS: Record<string, string> = {
  Generado: "green",
  "En Proceso": "indigo",
  Completado: "teal",
  Finalizado: "emerald",
  Anulado: "red",
};

export const AtencionPrestamosPage = () => {
  useTitlePage("Atención de Préstamos entre Almacenes");

  const [openedDetalle, { open: openDetalle, close: closeDetalle }] =
    useDisclosure(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const {
    almacenes,
    loadingAlmacenes,
    idAlmacen,
    setIdAlmacen,
    mes,
    setMes,
    yearcito,
    setYearcito,
    busqueda,
    setBusqueda,
    filteredRecords,
    loading,
    cargarPrestamos,
  } = useAtencionPrestamos();

  const selectedPrestamo = useMemo(
    () => filteredRecords.find((p) => p.id_prestamo === selectedId) ?? null,
    [filteredRecords, selectedId],
  );

  const columns: DataTableColumn<RES_Prestamo>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 60,
        render: (_, index) => index + 1,
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
        title: "Almacén Solicitante",
        width: 200,
        render: (item) => (
          <Group gap="xs" wrap="nowrap">
            <BuildingOffice2Icon className="w-4 h-4 text-zinc-500 shrink-0" />
            <Text size="sm" fw={700} className="text-zinc-200">
              {item.almacen_solicitante}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "registrado_por",
        title: "Solicitante",
        width: 180,
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
        accessor: "fechas",
        title: "Fechas",
        width: 180,
        render: (item) => (
          <Stack gap={2}>
            <Group gap={6}>
              <CalendarDaysIcon className="w-4 h-4 text-zinc-500" />
              <Text size="xs" fw={800} className="text-zinc-200">
                Solicitado el:{" "}
                {dayjs(item.fecha_hora_prestamo).format("DD/MM/YYYY HH:mm")}
              </Text>
            </Group>
            {item.fecha_limite_devolucion && (
              <Text size="11px" fw={700} c="pink.5" ml={22} className="">
                Devolución:{" "}
                {dayjs(item.fecha_limite_devolucion).format("DD/MM/YYYY")}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        accessor: "estado",
        title: "Estado",
        width: 130,
        render: (item) => (
          <Badge
            color={ESTADO_COLORS[item.estado] ?? "gray"}
            variant="light"
            radius="md"
            className="font-black uppercase tracking-widest px-2"
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
          <Tooltip label="Atender Préstamo" position="top" withArrow>
            <ActionIcon
              variant="filled"
              color="indigo"
              radius="md"
              size="lg"
              onClick={() => {
                setSelectedId(item.id_prestamo);
                openDetalle();
              }}
              className="shadow-md hover:scale-105 transition-all"
            >
              <PlayCircleIcon className="w-5 h-5 text-white" />
            </ActionIcon>
          </Tooltip>
        ),
      },
    ],
    [openDetalle, setSelectedId],
  );

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      {/* Filtros de Atención */}
      <div className="flex flex-col lg:flex-row justify-between gap-3 items-end">
        <div className="flex flex-wrap gap-3 flex-1 w-full lg:w-auto">
          <div className="w-full sm:w-72">
            <Select
              label="Almacén de Atención"
              placeholder="Seleccionar almacén..."
              leftSection={
                loadingAlmacenes ? (
                  <Loader size="xs" />
                ) : (
                  <BuildingOffice2Icon className="w-4 h-4 text-zinc-400" />
                )
              }
              data={almacenes.map((a) => ({
                value: String(a.id_almacen),
                label: a.nombre,
              }))}
              value={idAlmacen}
              onChange={setIdAlmacen}
              radius="lg"
              size="sm"
              classNames={{
                input: "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
                dropdown: "bg-zinc-900 border-zinc-800",
                option: "text-zinc-300 hover:bg-zinc-800",
              }}
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              label="Mes"
              placeholder="Mes"
              leftSection={
                <CalendarDaysIcon className="w-4 h-4 text-zinc-400" />
              }
              data={MESES}
              value={mes}
              onChange={(val) => setMes(val || "")}
              radius="lg"
              size="sm"
              classNames={{
                input: "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white",
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
                dropdown: "bg-zinc-900 border-zinc-800",
                option: "text-zinc-300 hover:bg-zinc-800",
              }}
            />
          </div>

          <div className="w-full sm:w-32">
            <Select
              label="Año"
              placeholder="Año"
              data={Array.from({ length: 5 }, (_, i) => ({
                value: String(dayjs().year() - i),
                label: String(dayjs().year() - i),
              }))}
              value={yearcito}
              onChange={(val) => setYearcito(val || "")}
              radius="lg"
              size="sm"
              classNames={{
                input: "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white",
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
                dropdown: "bg-zinc-900 border-zinc-800",
                option: "text-zinc-300 hover:bg-zinc-800",
              }}
            />
          </div>

          <div className="flex-1 min-w-[200px] w-full flex items-end gap-2">
            <TextInput
              label="Búsqueda"
              placeholder="Buscar por código, solicitante..."
              leftSection={
                <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
              }
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.currentTarget.value);
              }}
              disabled={!idAlmacen}
              radius="lg"
              size="sm"
              className="flex-1"
              classNames={{
                input: "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              }}
            />
            <BotonRecargar onReload={cargarPrestamos} loading={loading} />
          </div>
        </div>
      </div>

      {/* Estado: sin almacén seleccionado */}
      {!idAlmacen ? (
        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
          <div className="p-4 rounded-full bg-zinc-900/50 mb-4">
            <ArchiveBoxArrowDownIcon className="w-12 h-12 text-zinc-600" />
          </div>
          <Text size="lg" fw={600} className="text-zinc-400">
            Panel de Atención de Préstamos
          </Text>
          <Text className="text-zinc-500 text-center max-w-sm mt-1">
            Seleccione el almacén para visualizar los préstamos pendientes de
            atención.
          </Text>
        </div>
      ) : (
        <DataTableEstandar
          idAccessor="id_prestamo"
          columns={columns}
          records={filteredRecords}
          loading={loading}
        />
      )}

      {/* Modal Detalle / Despacho */}
      <ModalEstandar
        opened={openedDetalle}
        close={() => {
          closeDetalle();
          setTimeout(() => setSelectedId(null), 300);
        }}
        title="Atención de Préstamos"
        validateClose
        size="80%"
      >
        {selectedId && selectedPrestamo && (
          <DetallePrestamo
            prestamo={selectedPrestamo}
            idAlmacenPrestamista={Number(idAlmacen)}
            onDespachoRegistrado={() => {
              // No cerramos el modal, solo refrescamos datos internos si es necesario
              // o cerramos si el usuario prefiere
              cargarPrestamos();
            }}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
