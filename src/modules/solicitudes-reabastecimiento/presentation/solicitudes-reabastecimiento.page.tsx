import {
  Badge,
  Button,
  Stack,
  Text,
  TextInput,
  Group,
  ActionIcon,
  Tooltip,
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  EyeIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { type DataTableColumn } from "mantine-datatable";
import { useSolicitudesPage } from "../hooks/useSolicitudesPage";
import { Premura } from "../../../shared/enums/_generic/premura";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistroSolicitud } from "./registro-solicitud";
import { DetalleSolicitud } from "./detalle-solicitud";
import { TrazabilidadSolicitud } from "./trazabilidad-solicitud";
import { MESES } from "../../../shared/variables/meses";
import { Estado_Solicitud } from "../../../shared/enums/solicitud-reabastecimiento/solicitud";
import type {
  RES_Solicitud,
  RES_SolicitudDetalle,
} from "../../../service/responses/solicitudes-reabastecimiento/solicitud";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

export const SolicitudesReabastecimientoPage = () => {
  useTitlePage("Solicitudes de Reabastecimiento");

  const {
    filteredRecords,
    loading,
    filters: { mes, setMes, yearcito, setYearcito, search, setSearch },
    actions: { listar, addRecord, verDetalles, verTrazabilidad },
    ui: {
      selectedReq,
      detalles,
      loadingDetalle,
      selectedDetalle,
      trazabilidad,
      loadingTrazabilidad,
      progresoGeneral,
    },
  } = useSolicitudesPage();

  const [openedRegistro, { open: openReg, close: closeReg }] =
    useDisclosure(false);
  const [openedDetalle, { open: openDet, close: closeDet }] =
    useDisclosure(false);
  const [openedTrace, { open: openTrace, close: closeTrace }] =
    useDisclosure(false);

  const columns: DataTableColumn<RES_Solicitud>[] = useMemo(
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
          <Badge variant="light" color="violet" radius="sm">
            {item.correlativo}
          </Badge>
        ),
      },
      {
        accessor: "premura",
        title: "Prioridad",
        width: 130,
        render: (item) => {
          const colors = {
            [Premura.Normal]: "cyan",
            [Premura.Urgente]: "orange",
            [Premura.Emergencia]: "red",
          };
          const color = colors[item.premura as Premura] || "gray";
          return (
            <Badge
              color={color}
              variant="light"
              radius="sm"
              size="sm"
              className="font-semibold uppercase tracking-wider"
            >
              {item.premura}
            </Badge>
          );
        },
      },
      {
        accessor: "almacen_solicitante",
        title: "Almacén Solicitante",
        width: 200,
        render: (item) => (
          <Group gap="xs" wrap="nowrap">
            <BuildingStorefrontIcon className="w-5 h-5 text-zinc-500 shrink-0" />
            <Text size="sm" className="text-zinc-200">
              {item.almacen_solicitante}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "solicitante",
        title: "Solicitante",
        width: 200,
        render: (item) => (
          <Text size="sm" className="text-zinc-400">
            {item.solicitado_por}
          </Text>
        ),
      },
      {
        accessor: "fecha_entrega_requerida",
        title: "Fechas",
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
        accessor: "estado",
        title: "Estado",
        width: 130,
        render: (item) => {
          const colorMap: Record<Estado_Solicitud, string> = {
            [Estado_Solicitud.Generada]: "green",
            [Estado_Solicitud.Cerrada]: "gray",
            [Estado_Solicitud.Anulada]: "red",
            [Estado_Solicitud.EnDespacho]: "blue",
            [Estado_Solicitud.Completada]: "teal",
          };
          return (
            <Badge
              color={colorMap[item.estado as Estado_Solicitud] || "gray"}
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
        width: 120,
        render: (item) => (
          <Group gap="xs" justify="center">
            <Tooltip label="Ver Detalle" position="top" withArrow>
              <ActionIcon
                variant="filled"
                color="violet"
                radius="md"
                onClick={() => {
                  verDetalles(item);
                  openDet();
                }}
                className="shadow-sm hover:scale-110 transition-transform"
              >
                <EyeIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [verDetalles, openDet],
  );

  return (
    <div className="space-y-8 animate-fade-in text-zinc-100">
      {/* Container de Filtros */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-end">
        <div className="flex flex-wrap gap-3 flex-1 w-full lg:w-auto">
          <div className="w-full sm:w-40">
            <Select
              label="Mes"
              placeholder="Elegir mes"
              data={MESES}
              value={mes}
              onChange={(val) => setMes(val || "1")}
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
          <div className="w-full sm:w-32">
            <Select
              label="Año"
              placeholder="Elegir año"
              data={YEARS}
              value={yearcito}
              onChange={(val) =>
                setYearcito(val || String(new Date().getFullYear()))
              }
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
          <div className="flex-1 min-w-50 w-full">
            <TextInput
              label="Búsqueda"
              placeholder="Código o solicitante..."
              leftSection={
                <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              radius="lg"
              size="sm"
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              }}
            />
          </div>
        </div>

        <div className="flex gap-2 items-center shrink-0 w-full lg:w-auto">
          <BotonRecargar onReload={listar} loading={loading} />
          <Button
            leftSection={<PlusIcon className="w-5 h-5" />}
            onClick={openReg}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 active:scale-95 transition-all w-full lg:w-auto px-8 font-semibold shrink-0 h-9.5"
          >
            Nueva Solicitud
          </Button>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="transition-all">
        {filteredRecords.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-zinc-500 gap-4">
            <div className="bg-zinc-900/50 p-6 rounded-full border border-zinc-800 animate-pulse">
              <CubeIcon className="w-12 h-12 text-zinc-700" />
            </div>
            <div className="text-center">
              <Text fw={600} size="lg" className="text-zinc-400">
                No se encontraron solicitudes
              </Text>
              <Text size="sm" className="text-zinc-600">
                Intenta cambiando el almacén, periodo o ajustando tu búsqueda
              </Text>
            </div>
          </div>
        ) : (
          <DataTableEstandar
            idAccessor="id_solicitud"
            columns={columns}
            records={filteredRecords}
            loading={loading}
          />
        )}
      </div>

      {/* Modales */}
      <ModalEstandar
        opened={openedRegistro}
        close={closeReg}
        title="Nueva Solicitud de Reabastecimiento"
        size="75rem"
      >
        <RegistroSolicitud
          onSuccess={(item) => {
            closeReg();
            addRecord(item);
          }}
          onCancel={closeReg}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedDetalle}
        close={closeDet}
        title="Detalle de Solicitud"
        size="90%"
      >
        {selectedReq && (
          <DetalleSolicitud
            headerData={selectedReq}
            detalles={detalles}
            loading={loadingDetalle}
            progresoGeneral={progresoGeneral}
            onOpenTrazabilidad={(det: RES_SolicitudDetalle) => {
              verTrazabilidad(det);
              openTrace();
            }}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedTrace}
        close={closeTrace}
        title="Seguimiento de Item"
        size="md"
      >
        {selectedDetalle && (
          <TrazabilidadSolicitud
            productoNombre={selectedDetalle.producto}
            eventos={trazabilidad}
            loading={loadingTrazabilidad}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
