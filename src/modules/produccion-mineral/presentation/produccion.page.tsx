import { useState, useMemo } from "react";
import {
  Button,
  Stack,
  Text,
  Card,
  Badge,
  TextInput,
  Group,
  ActionIcon,
  Loader,
  Divider,
} from "@mantine/core";
import {
  FolderOpenIcon,
  MapPinIcon,
  InboxStackIcon,
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ChevronDownIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { type DataTableColumn } from "mantine-datatable";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { useProduccion } from "../hooks/_useProduccion";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { IniciarProduccion } from "./iniciar-produccion";
import { RegistroLoteMineral } from "../../lote-mineral/presentation/registro-lote-mineral";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { HistorialConsumosProduccion } from "./components/historial-consumos-produccion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import type { RES_LoteMineralProduccion } from "../service/produccion.responses";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

dayjs.extend(relativeTime);
dayjs.locale("es");

export const ProduccionMineralPage = () => {
  useTitlePage("Producción de Mineral");
  const {
    state: { lotes, lotesPendientes },
    status: { loading, loadingPendientes, submitting, error },
    actions: {
      iniciarProduccion,
      finalizarProduccion,
      fetchResumen,
      fetchLotesPendientes,
    },
  } = useProduccion();

  const [modalOpen, setModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [expandedRecordIds, setExpandedRecordIds] = useState<
    (string | number)[]
  >([]);
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false);
  const [loteAFinalizar, setLoteAFinalizar] =
    useState<RES_LoteMineralProduccion | null>(null);

  const handleIniciar = async (idLote: number) => {
    const success = await iniciarProduccion(idLote);
    if (success) {
      setModalOpen(false);
    }
  };

  const handleConfirmarFinalizar = async () => {
    if (!loteAFinalizar) return;
    const success = await finalizarProduccion(loteAFinalizar.id_lote_mineral);
    if (success) {
      setFinalizarModalOpen(false);
      setLoteAFinalizar(null);
    }
  };

  const columns: DataTableColumn<RES_LoteMineralProduccion>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 50,
      },
      {
        accessor: "correlativo",
        title: "Cod. Lote",
        width: 220,
        textAlign: "left",
        render: (record) => (
          <Stack gap={2} justify="flex-start" align="flex-start">
            <Badge
              color="pink"
              variant="light"
              size="sm"
              fw={800}
              className="font-mono text-white"
            >
              {record.codigo}
            </Badge>
            {record.descripcion && (
              <Text
                size="xs"
                className="text-zinc-400 italic max-w-xs truncate"
              >
                "{record.descripcion}"
              </Text>
            )}
          </Stack>
        ),
      },
      {
        accessor: "contratista",
        title: "Contratista",
        width: 160,
        textAlign: "center",
        render: (record) => (
          <Text size="sm" fw={600} className="text-zinc-200">
            {record.contratista}
          </Text>
        ),
      },
      {
        accessor: "mina",
        title: "Mina",
        width: 180,
        textAlign: "center",
        render: (record) => (
          <Group gap="xs" wrap="nowrap" align="center" justify="center">
            <div className="flex items-center justify-center size-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs">
              <BuildingOffice2Icon className="size-3" />
            </div>
            <Text size="sm" fw={700} className="text-emerald-400 truncate">
              {record.mina}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "labor",
        title: "Labor",
        width: 160,
        textAlign: "center",
        render: (record) =>
          record.labor ? (
            <Group gap="xs" wrap="nowrap" justify="center" align="center">
              <div className="flex items-center justify-center size-7 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-xs">
                <MapPinIcon className="w-3 h-3" />
              </div>
              <Text size="sm" fw={600} className="text-violet-300 truncate">
                {record.labor}
              </Text>
            </Group>
          ) : (
            <Text size="xs" className="text-zinc-500 italic">
              No se asignó
            </Text>
          ),
      },
      {
        accessor: "created_at",
        title: "Tiempo",
        width: 140,
        textAlign: "center",
        render: (record) => {
          const baseDate = record.fecha_inicio_produccion;
          const diasDiferencia = dayjs().diff(dayjs(baseDate), "day");
          return (
            <Group gap={4} wrap="nowrap" justify="center" align="center">
              <div className="flex items-center justify-center size-6 rounded-full bg-blue-500/10 border border-blue-500/20">
                <CalendarIcon className="w-3 h-3 text-blue-400" />
              </div>
              <div className="flex flex-col gap-0">
                <Text size="xs" fw={600} className="text-zinc-300">
                  {diasDiferencia === 0 ? "Hoy" : `${diasDiferencia}d`}
                </Text>
                <Text size="9px" c="dimmed">
                  {dayjs(baseDate).format("DD/MM/YYYY")}
                </Text>
              </div>
            </Group>
          );
        },
      },
      {
        accessor: "consumos",
        title: "Consumos",
        width: 160,
        textAlign: "center",
        render: (record) => {
          return (
            <Badge
              color={record.consumos.length > 0 ? "indigo" : "gray"}
              variant="filled"
              size="sm"
              className={`font-bold uppercase tracking-wider py-1.5 px-2 ${
                record.consumos.length > 0
                  ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white border border-indigo-400/20 shadow-md shadow-indigo-950/40"
                  : "text-zinc-500 border border-zinc-800 bg-zinc-900/40"
              }`}
            >
              {record.consumos.length} Registro
              {record.consumos.length !== 1 ? "s" : ""}
            </Badge>
          );
        },
      },
      {
        accessor: "acciones",
        title: "Acciones",
        width: 160,
        textAlign: "center",
        render: (record) => {
          const isExpanded = expandedRecordIds.includes(record.id_lote_mineral);
          const toggleExpand = (e: React.MouseEvent) => {
            e.stopPropagation();
            setExpandedRecordIds((prev) =>
              isExpanded
                ? prev.filter((id) => id !== record.id_lote_mineral)
                : [...prev, record.id_lote_mineral],
            );
          };
          const isEnProduccion = record.estado === "En Producción";
          const isFinalized = record.estado === "Finalizado";
          return (
            <Group gap="xs" justify="center" wrap="nowrap">
              {isEnProduccion && (
                <Button
                  size="xs"
                  variant="light"
                  color="green"
                  radius="md"
                  className="font-semibold h-7 px-3 border border-green-500/20 hover:bg-green-500/20"
                  leftSection={<CheckCircleIcon className="w-3.5 h-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLoteAFinalizar(record);
                    setFinalizarModalOpen(true);
                  }}
                >
                  Finalizar
                </Button>
              )}
              {isFinalized && (
                <Badge
                  size="sm"
                  variant="filled"
                  color="gray"
                  radius="md"
                  className="font-semibold bg-zinc-700 text-zinc-100"
                >
                  Finalizado
                </Badge>
              )}
              {record.consumos.length > 0 && (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="indigo"
                  className="text-zinc-400 hover:text-white"
                  onClick={toggleExpand}
                  title={isExpanded ? "Ocultar historial" : "Ver historial"}
                >
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </ActionIcon>
              )}
            </Group>
          );
        },
      },
    ],
    [expandedRecordIds],
  );

  const lotesFiltrados = useMemo(() => {
    const lotesData = lotes || [];

    // Filtrar por búsqueda
    if (!busqueda) return lotesData;
    const term = busqueda.toLowerCase();
    return lotesData.filter(
      (l) =>
        l.codigo.toLowerCase().includes(term) ||
        l.contratista.toLowerCase().includes(term) ||
        l.mina.toLowerCase().includes(term) ||
        (l.labor && l.labor.toLowerCase().includes(term)),
    );
  }, [lotes, busqueda]);

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      {/* Header — Buscador y Iniciar Producción */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <TextInput
          label="Buscar Lote"
          placeholder="Correlativo, código, contratista..."
          leftSection={<MagnifyingGlassIcon className="size-4 text-zinc-400" />}
          value={busqueda}
          onChange={(e) => setBusqueda(e.currentTarget.value)}
          className="flex-1 min-w-64"
          radius="lg"
          size="sm"
          classNames={{
            label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
            input:
              "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
          }}
        />
        <Group gap="xs" align="end" className="shrink-0">
          <BotonRecargar onReload={fetchResumen} loading={loading} />
          <Button
            onClick={() => setRegisterModalOpen(true)}
            radius="lg"
            size="sm"
            variant="light"
            color="indigo"
            className="font-bold h-[38px] transition-all"
          >
            Registrar Lote
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 font-bold h-[38px] transition-all"
          >
            Iniciar Producción
          </Button>
        </Group>
      </div>

      {error && (
        <Card
          radius="md"
          className="bg-red-950/20 border border-red-500/30 p-4"
        >
          <Text size="sm" c="red.4" fw={700}>
            {error}
          </Text>
        </Card>
      )}

      {loading ? (
        <Stack align="center" gap="md" py={100}>
          <div className="relative">
            <div className="size-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <InboxStackIcon className="size-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <Text
            size="xs"
            fw={900}
            className="uppercase tracking-[0.3em] text-zinc-500"
          >
            Consultando Producción...
          </Text>
        </Stack>
      ) : lotesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-4xl border border-dashed border-zinc-800 backdrop-blur-sm animate-fade-in">
          <FolderOpenIcon className="size-12 text-zinc-700 mb-4 animate-pulse" />
          <Text
            size="sm"
            fw={800}
            className="text-zinc-400 uppercase tracking-widest"
          >
            Sin resultados
          </Text>
          <Text size="xs" c="dimmed" className="mt-1 max-w-xs text-center">
            {busqueda
              ? "No se encontraron lotes que coincidan con la búsqueda."
              : "No hay lotes. ¡Inicia uno nuevo!"}
          </Text>
        </div>
      ) : (
        <DataTableEstandar
          idAccessor="id_lote_mineral"
          columns={columns}
          records={lotesFiltrados}
          loading={loading}
          rowExpansion={{
            expanded: {
              recordIds: expandedRecordIds,
              onRecordIdsChange: setExpandedRecordIds,
            },
            content: ({ record }: { record: RES_LoteMineralProduccion }) => (
              <div className="p-4 bg-zinc-950/40 rounded-lg border border-zinc-800/60 m-2 animate-fade-in">
                <Text
                  size="xs"
                  fw={900}
                  className="text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"
                >
                  <InboxStackIcon className="w-4 h-4 text-indigo-400" />
                  Historial de Consumo ({record.consumos.length})
                </Text>
                {record.consumos.length === 0 ? (
                  <Text
                    size="xs"
                    c="dimmed"
                    className="italic text-center py-2"
                  >
                    Sin consumos asociados aún.
                  </Text>
                ) : (
                  <HistorialConsumosProduccion consumos={record.consumos} />
                )}
              </div>
            ),
          }}
        />
      )}

      {/* Modal: Iniciar Producción */}
      <ModalEstandar
        opened={modalOpen}
        close={() => setModalOpen(false)}
        title="Iniciar Proceso de Producción"
        size="md"
      >
        <IniciarProduccion
          lotesPendientes={lotesPendientes}
          loadingPendientes={loadingPendientes}
          submitting={submitting}
          onIniciar={handleIniciar}
          onCancel={() => setModalOpen(false)}
        />
      </ModalEstandar>

      {/* Modal: Registrar Lote */}
      <ModalEstandar
        opened={registerModalOpen}
        close={() => setRegisterModalOpen(false)}
        title="Nuevo Lote de Mineral"
        size="lg"
        validateClose
      >
        <RegistroLoteMineral
          isFromProduccion={true}
          onSuccess={() => {
            setRegisterModalOpen(false);
            fetchResumen();
            fetchLotesPendientes();
          }}
          onCancel={() => setRegisterModalOpen(false)}
        />
      </ModalEstandar>

      {/* Modal: Confirmar Finalizar */}
      <ModalEstandar
        opened={finalizarModalOpen}
        close={() => !submitting && setFinalizarModalOpen(false)}
        title="Confirmar Finalización de Producción"
        size="md"
      >
        <Stack gap="lg">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0 mt-0.5">
                <CheckCircleIcon className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <Text size="sm" fw={700} className="text-white mb-1">
                  ¿Finalizar este lote?
                </Text>
                <Text size="xs" c="dimmed" className="leading-relaxed">
                  Esta acción marcará el lote como finalizado. Podrás verlo en
                  el historial.
                </Text>
              </div>
            </div>

            <Divider className="my-2 border-zinc-800" />

            {loteAFinalizar && (
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <Text
                    size="xs"
                    c="dimmed"
                    className="font-semibold uppercase"
                  >
                    Código
                  </Text>
                  <Badge color="indigo" variant="light" size="sm">
                    {loteAFinalizar.codigo}
                  </Badge>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <Text
                    size="xs"
                    c="dimmed"
                    className="font-semibold uppercase"
                  >
                    Contratista
                  </Text>
                  <Text size="xs" fw={600} className="text-zinc-200">
                    {loteAFinalizar.contratista}
                  </Text>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <Text
                    size="xs"
                    c="dimmed"
                    className="font-semibold uppercase"
                  >
                    Mina
                  </Text>
                  <Text size="xs" fw={600} className="text-emerald-400">
                    {loteAFinalizar.mina}
                  </Text>
                </div>
                {loteAFinalizar.labor && (
                  <div className="flex justify-between items-start gap-2">
                    <Text
                      size="xs"
                      c="dimmed"
                      className="font-semibold uppercase"
                    >
                      Labor
                    </Text>
                    <Text size="xs" fw={600} className="text-violet-300">
                      {loteAFinalizar.labor}
                    </Text>
                  </div>
                )}
                <div className="flex justify-between items-start gap-2">
                  <Text
                    size="xs"
                    c="dimmed"
                    className="font-semibold uppercase"
                  >
                    Consumos
                  </Text>
                  <Badge size="sm" variant="light" color="indigo">
                    {
                      new Set(loteAFinalizar.consumos.map((c) => c.id_producto))
                        .size
                    }{" "}
                    productos
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <Group grow>
            <Button
              variant="light"
              onClick={() => setFinalizarModalOpen(false)}
              disabled={submitting}
              radius="lg"
            >
              Cancelar
            </Button>
            <Button
              color="green"
              onClick={handleConfirmarFinalizar}
              loading={submitting}
              leftSection={
                submitting ? (
                  <Loader size="xs" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )
              }
              radius="lg"
            >
              Finalizar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>
    </div>
  );
};
