import { useEffect, useState, useMemo } from "react";
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
  UserCircleIcon,
  MapPinIcon,
  CalendarDaysIcon,
  PlayCircleIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { type DataTableColumn } from "mantine-datatable";
import { useAtencionSolicitudes } from "../hooks/useAtencionSolicitudes.ts";
import type { RES_Solicitud } from "../../../service/responses/solicitudes-reabastecimiento/solicitud.ts";
import { useUIStore } from "../../../stores/ui.store.ts";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar.tsx";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar.tsx";
import { DetalleSolicitud } from "./detalle-solicitud.tsx";
import { MESES } from "../../../shared/variables/meses.ts";
import { useDisclosure } from "@mantine/hooks";
import { Premura } from "../../../shared/enums/_generic/premura.ts";
import { Estado_Solicitud } from "../../../shared/enums/solicitud-reabastecimiento/solicitud.ts";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar.tsx";

export const SolicitudesReabastecimientoAtencionPage = () => {
  const setTitle = useUIStore((state) => state.setTitle);

  const [openedDetalle, { open: openDetalle, close: closeDetalle }] =
    useDisclosure(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const {
    loading,
    loadingAlmacenes,
    almacenes,
    solicitudes,
    idAlmacen,
    setIdAlmacen,
    mes,
    setMes,
    yearcito,
    setYearcito,
    busqueda,
    setBusqueda,
    recargar,
    updateSolicitudLocal,
  } = useAtencionSolicitudes();

  useEffect(() => {
    setTitle("Atención de Solicitudes de Reabastecimiento");
  }, [setTitle]);

  const columns: DataTableColumn<RES_Solicitud>[] = useMemo(
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
        accessor: "solicitante",
        title: "Solicitante",
        width: 180,
        render: (item) => (
          <Group gap="xs" wrap="nowrap">
            <UserCircleIcon className="w-5 h-5 text-emerald-500" />
            <Text size="sm" className="text-zinc-200">
              {item.solicitado_por}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "almacen_solicitante",
        title: "Almacén",
        width: 180,
        render: (item) => (
          <Group gap="xs" wrap="nowrap">
            <MapPinIcon className="w-4 h-4 text-zinc-500 shrink-0" />
            <Text size="sm" className="text-zinc-200">
              {item.almacen_solicitante}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "fechas",
        title: "Cronograma",
        width: 200,
        render: (item) => {
          const fechaReq =
            item.fecha_entrega_requerida &&
            dayjs(item.fecha_entrega_requerida).isValid()
              ? dayjs(item.fecha_entrega_requerida).format("DD/MM/YYYY")
              : "No especificada";

          const fechaSol =
            item.fecha_solicitud && dayjs(item.fecha_solicitud).isValid()
              ? dayjs(item.fecha_solicitud).format("DD/MM/YYYY")
              : null;

          return (
            <Stack gap={2}>
              <Group gap={6}>
                <CalendarDaysIcon className="w-4 h-4 text-zinc-500" />
                <Text size="xs" fw={600} className="text-zinc-200">
                  Entrega: {fechaReq}
                </Text>
              </Group>
              {fechaSol && (
                <Text size="xs" c="blue.4" ml={22}>
                  Solicitada: {fechaSol}
                </Text>
              )}
              <Text size="xs" c="dimmed" ml={22}>
                Creado: {dayjs(item.created_at).format("DD/MM/YYYY HH:mm")}
              </Text>
            </Stack>
          );
        },
      },
      {
        accessor: "premura",
        title: "Prioridad",
        width: 120,
        render: (item) => {
          const colors = {
            [Premura.Normal]: "blue",
            [Premura.Urgente]: "orange",
            [Premura.Emergencia]: "red",
          };
          return (
            <Badge
              color={colors[item.premura]}
              variant="light"
              size="sm"
              className="uppercase"
            >
              {item.premura}
            </Badge>
          );
        },
      },
      {
        accessor: "estado",
        title: "Estado",
        width: 130,
        render: (item) => {
          const colors: Record<string, string> = {
            [Estado_Solicitud.Generada]: "green",
            [Estado_Solicitud.EnDespacho]: "blue",
            [Estado_Solicitud.Cerrada]: "gray",
            [Estado_Solicitud.Anulada]: "red",
          };
          return (
            <Badge
              color={colors[item.estado] || "gray"}
              variant="light"
              radius="sm"
              size="sm"
              className="font-semibold uppercase tracking-wider"
            >
              {item.estado}
            </Badge>
          );
        },
      },
      {
        accessor: "acciones",
        title: "Acciones",
        textAlign: "center",
        width: 80,
        render: (item) => (
          <Tooltip label="Gestionar Atención" position="top" withArrow>
            <ActionIcon
              variant="filled"
              color="indigo"
              radius="md"
              onClick={() => {
                setSelectedId(item.id_solicitud);
                openDetalle();
              }}
              className="shadow-md hover:scale-105 transition-transform"
            >
              <PlayCircleIcon className="w-5 h-5 text-white" />
            </ActionIcon>
          </Tooltip>
        ),
      },
    ],
    [openDetalle],
  );

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      <div className="flex flex-col lg:flex-row justify-between gap-3 items-end">
        <div className="flex flex-wrap gap-3 flex-1 w-full lg:w-auto">
          <div className="w-full sm:w-72">
            <Select
              label="Almacén Solicitante"
              placeholder="Seleccionar almacén..."
              leftSection={
                loadingAlmacenes ? (
                  <Loader size="xs" />
                ) : (
                  <MapPinIcon className="w-4 h-4 text-zinc-400" />
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
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
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
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white",
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
              data={Array.from({ length: 5 }, (_, i) => {
                const y = (dayjs().year() - i).toString();
                return { value: y, label: y };
              })}
              value={yearcito}
              onChange={(val) => setYearcito(val || "")}
              radius="lg"
              size="sm"
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white",
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
                dropdown: "bg-zinc-900 border-zinc-800",
                option: "text-zinc-300 hover:bg-zinc-800",
              }}
            />
          </div>

          <div className="flex-1 min-w-[200px] w-full flex items-end gap-2">
            <TextInput
              label="Búsqueda"
              placeholder="Buscar por código u observacion..."
              leftSection={
                <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
              }
              value={busqueda}
              onChange={(e) => setBusqueda(e.currentTarget.value)}
              radius="lg"
              size="sm"
              className="flex-1"
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              }}
            />
            <BotonRecargar onReload={recargar} loading={loading} />
          </div>
        </div>
      </div>

      {!idAlmacen ? (
        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
          <div className="p-4 rounded-full bg-zinc-900/50 mb-4">
            <CheckBadgeIcon className="w-12 h-12 text-zinc-600" />
          </div>
          <Text size="lg" fw={600} className="text-zinc-400">
            Panel de Atención de Solicitudes
          </Text>
          <Text className="text-zinc-500 text-center max-w-sm mt-1">
            Seleccione un almacén para visualizar las solicitudes de
            reabastecimiento.
          </Text>
        </div>
      ) : (
        <DataTableEstandar
          idAccessor="id_solicitud"
          columns={columns}
          records={solicitudes}
          loading={loading}
        />
      )}

      <ModalEstandar
        opened={openedDetalle}
        close={closeDetalle}
        title={`Detalle de Solicitud de Reabastecimiento`}
        size="75rem"
      >
        {selectedId && (
          <DetalleSolicitud
            solicitud={solicitudes.find((s) => s.id_solicitud === selectedId)!}
            onSuccess={() => {
              updateSolicitudLocal(selectedId, {
                estado: Estado_Solicitud.EnDespacho,
              });
            }}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
