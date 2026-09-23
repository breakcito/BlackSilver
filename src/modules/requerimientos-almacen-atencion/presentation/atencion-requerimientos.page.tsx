import { useState, useMemo } from "react";
import {
  Badge,
  Checkbox,
  Group,
  Stack,
  Text,
  TextInput,
  ActionIcon,
  Tooltip,
  Select,
  Loader,
  Button,
  Alert,
} from "@mantine/core";
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  MapPinIcon,
  CalendarDaysIcon,
  PlayCircleIcon,
  CheckBadgeIcon,
  PlusIcon,
  PaperClipIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { type DataTableColumn } from "mantine-datatable";
import { useEntregas } from "../hooks/useEntregas.ts";
import type { IArchivo } from "../../../shared/interfaces/archivo.ts";
import { Estado_Requerimiento } from "../../../shared/enums/requerimiento-almacen/requerimiento.ts";
import { TipoTurno } from "../../../shared/enums/_generic/tipo-turno";
import { Premura } from "../../../shared/enums/_generic/premura.ts";
import { useTitlePage } from "../../../hooks/useTitlePage.ts";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar.tsx";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar.tsx";
import { InfoRequerimiento } from "./info-requerimiento/info-requerimiento.tsx";
import { MESES } from "../../../shared/variables/meses.ts";
import { useDisclosure } from "@mantine/hooks";
import { RegistroRequerimiento } from "./registrar-requerimiento/registro-requerimiento.tsx";
import { ArchivoCard } from "../../../presentation/utils/archivo/archivo-card.tsx";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker.tsx";
import { useNotify } from "../../../hooks/useNotify.ts";
import { AtencionService } from "../service/atencion.service.ts";
import { useImprimirRequerimiento } from "../hooks/useImprimirRequerimiento.tsx";
import { usePrint } from "../../../hooks/usePrint.ts";
import { RequerimientoPDF } from "./requerimiento-pdf.tsx";
import type { RES_RequerimientoAlmacen } from "../../../service/responses/requerimientos-almacen/requerimiento-almacen.ts";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar.tsx";
import { useExcel } from "../../../hooks/useExcel.ts";
import { useRequerimientosExcel } from "./excel-requerimientos.ts";
import { useAuditoriaStore } from "../../../stores/auditoria.store.ts";

export const RequerimientosAlmacenAtencionPage = () => {
  useTitlePage("Atención de Requerimientos");
  const [errorLocal, setErrorLocal] = useState("");

  const [openedGestion, { open: openGestion, close: closeGestion }] =
    useDisclosure(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedRequerimiento, setSelectedRequerimiento] =
    useState<RES_RequerimientoAlmacen | null>(null);

  const [openedRegistro, { open: openReg, close: closeReg }] =
    useDisclosure(false);

  const [openedEvidencias, { open: openEvidencias, close: closeEvidencias }] =
    useDisclosure(false);
  const [evidenciasActuales, setEvidenciasActuales] = useState<IArchivo[]>([]);
  const { notifySuccess, notifyError } = useNotify();
  const [nuevasEvidencias, setNuevasEvidencias] = useState<File[]>([]);
  const [subiendoEvidencias, setSubiendoEvidencias] = useState(false);

  // Modal de confirmacion de anulacion de requerimiento.
  const [openedAnular, { open: openAnular, close: closeAnular }] =
    useDisclosure(false);
  const [anularId, setAnularId] = useState<number | null>(null);
  const [anularCorrelativo, setAnularCorrelativo] = useState<string>("");
  const [anulando, setAnulando] = useState(false);

  const {
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
    recargar,
    almacenes,
    loadingAlmacenes,
    updateRequirementLocal,
    addRequirementLocal,
  } = useEntregas({ setError: setErrorLocal });

  const { imprimir, imprimiendo } = useImprimirRequerimiento();
  const { print } = usePrint();

  const { generateExcel: enqueueExcel, isGeneratingExcel } = useExcel();
  const excelBuilder = useRequerimientosExcel();
  const { en_modo_auditable } = useAuditoriaStore();

  // --- Modal de filtro de Turno para Exportacion a Excel ---
  // El usuario elige que turnos incluir (Dia, Noche, sin turno) antes
  // de generar el archivo. Default: Dia + Noche marcados.
  const [openedFiltroTurno, { open: openFiltroTurno, close: closeFiltroTurno }] =
    useDisclosure(false);
  const [incluirDia, setIncluirDia] = useState(true);
  const [incluirNoche, setIncluirNoche] = useState(true);
  const [incluirSinTurno, setIncluirSinTurno] = useState(false);

  const handleOpenExcel = () => {
    if (filteredRecords.length === 0) return;
    openFiltroTurno();
  };

  const handleConfirmExportExcel = () => {
    if (incluirDia === false && incluirNoche === false && incluirSinTurno === false) {
      return; // guard: no hay nada que exportar
    }
    const filtrados = filteredRecords.filter((r) => {
      if (r.tipo_turno === TipoTurno.Dia) return incluirDia;
      if (r.tipo_turno === TipoTurno.Noche) return incluirNoche;
      // Sin turno (null o cualquier valor fuera del enum)
      return incluirSinTurno;
    });

    if (filtrados.length === 0) {
      notifyError(
        "Ningun requerimiento coincide con el filtro de turno seleccionado.",
      );
      return;
    }

    const almacenNombre =
      almacenes.find((a) => String(a.id_almacen) === idAlmacen)?.nombre || "—";
    const config = excelBuilder.generate({
      requerimientos: filtrados,
      mes,
      yearcito,
      almacenNombre,
      en_modo_auditable,
    });
    enqueueExcel(config);
    closeFiltroTurno();
  };

  // Cantidad filtrada en tiempo real para mostrar al usuario en el modal.
  const previewFiltrados = filteredRecords.filter((r) => {
    if (r.tipo_turno === TipoTurno.Dia) return incluirDia;
    if (r.tipo_turno === TipoTurno.Noche) return incluirNoche;
    return incluirSinTurno;
  }).length;
  const hayAlgunFiltroActivo =
    incluirDia || incluirNoche || incluirSinTurno;

  // Ya no manejamos 'page' localmente ni disclosures

  const columns: DataTableColumn<RES_RequerimientoAlmacen>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 60,
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
              {item.solicitante}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "Labor",
        title: "Labor",
        width: 180,
        textAlign: "left",
        render: (item) => (
          <Group gap="xs" wrap="nowrap">
            <MapPinIcon className="w-5 h-5 text-zinc-500 shrink-0" />
            {item.labor ? (
              <Text size="sm" className="text-zinc-200">
                {item.labor}
              </Text>
            ) : (
              <Text size="xs" className="italic" c="dimmed">
                No especificada
              </Text>
            )}
          </Group>
        ),
      },
      {
        accessor: "fechas",
        title: "Programación",
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

          // Badge de Turno: solo si el requerimiento tiene tipo_turno.
          // "Dia" -> badge amber (amanecer/atardecer); "Noche" -> indigo
          // (luna). Sin turno -> no se muestra nada (el campo es opcional).
          const turnoBadge =
            item.tipo_turno === "Dia" ? (
              <Badge
                color="orange"
                variant="light"
                size="sm"
                radius="xl"
                leftSection={
                  <span style={{ fontSize: 11, lineHeight: 1 }}>☀</span>
                }
              >
                Día
              </Badge>
            ) : item.tipo_turno === "Noche" ? (
              <Badge
                color="indigo"
                variant="light"
                size="sm"
                radius="xl"
                leftSection={
                  <span style={{ fontSize: 11, lineHeight: 1 }}>☾</span>
                }
              >
                Noche
              </Badge>
            ) : null;

          return (
            <Stack gap={2}>
              <Group gap={6}>
                <CalendarDaysIcon className="w-4 h-4 text-zinc-500" />
                <Text size="xs" fw={600} className="text-zinc-200">
                  Para: {fechaReq}
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
              {turnoBadge && (
                <Group ml={22} mt={2} gap={4}>
                  {turnoBadge}
                </Group>
              )}
            </Stack>
          );
        },
      },
      {
        accessor: "premura",
        title: "Prioridad",
        width: 120,
        render: (item) => {
          const getPremuraColor = (premura: string) => {
            switch (premura) {
              case Premura.Normal:
                return "blue";
              case Premura.Urgente:
                return "orange";
              case Premura.Emergencia:
                return "red";
              default:
                return "zinc";
            }
          };
          const color = getPremuraColor(item.premura);
          return (
            <Badge
              color={color}
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
            [Estado_Requerimiento.Generado]: "blue",
            [Estado_Requerimiento.EnDespacho]: "green",
            [Estado_Requerimiento.Anulado]: "red",
            [Estado_Requerimiento.Cerrado]: "gray",
            [Estado_Requerimiento.Completado]: "green",
          };
          const color =
            item.estado && colors[item.estado] ? colors[item.estado] : "gray";
          return (
            <Badge
              color={color}
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
        width: 175,
        render: (item) => (
          <Group gap="xs" justify="center">
            {item.evidencias && item.evidencias.length > 0 && (
              <Tooltip label="Ver Evidencias" position="top" withArrow>
                <ActionIcon
                  variant="light"
                  color="teal"
                  radius="md"
                  onClick={() => {
                    setSelectedId(item.id_requerimiento);
                    setEvidenciasActuales(item.evidencias!);
                    setNuevasEvidencias([]);
                    openEvidencias();
                  }}
                  className="shadow-sm hover:scale-105 transition-transform"
                >
                  <PaperClipIcon className="w-5 h-5 font-bold" />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label="Imprimir Documento" position="top" withArrow>
              <ActionIcon
                variant="light"
                color="cyan"
                radius="md"
                onClick={() => {
                  setSelectedId(item.id_requerimiento);
                  imprimir(item);
                }}
                loading={imprimiendo && selectedId === item.id_requerimiento}
                className="shadow-sm hover:scale-105 transition-transform"
              >
                <PrinterIcon className="w-5 h-5 font-bold" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Gestionar Atención" position="top" withArrow>
              <ActionIcon
                variant="filled"
                color="indigo"
                radius="md"
                onClick={() => {
                  setSelectedRequerimiento(item);
                  openGestion();
                }}
                className="shadow-md hover:scale-105 transition-transform"
              >
                <PlayCircleIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </Tooltip>
            {item.estado !== Estado_Requerimiento.Anulado && (
              <Tooltip label="Anular Requerimiento" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  radius="md"
                  onClick={() => {
                    setAnularId(item.id_requerimiento);
                    setAnularCorrelativo(item.correlativo);
                    openAnular();
                  }}
                  className="shadow-sm hover:scale-105 transition-transform"
                >
                  <NoSymbolIcon className="w-5 h-5" />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        ),
      },
    ],
    [
      openGestion,
      openEvidencias,
      setSelectedId,
      imprimir,
      imprimiendo,
      selectedId,
    ],
  );

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      <div className="flex flex-col lg:flex-row justify-between gap-3">
        <div className="flex flex-wrap gap-3 flex-1 w-full lg:w-auto items-end">
          {/* Almacén Selector */}
          <div className="w-full sm:w-72">
            <Select
              label="Almacén de atención"
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

          {/* Mes Selector */}
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

          {/* Año Selector */}
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
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white",
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
                dropdown: "bg-zinc-900 border-zinc-800",
                option: "text-zinc-300 hover:bg-zinc-800",
              }}
            />
          </div>

          {/* Búsqueda */}
          <div className="flex-1 min-w-50 w-full">
            <TextInput
              label="Búsqueda"
              placeholder="Buscar por código, solicitante o mina..."
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
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
                label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              }}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 items-center shrink-0 w-full lg:w-auto">
            <BotonRecargar onReload={recargar} loading={loading} />
            <Tooltip
              label="Exportar a Excel"
              position="top"
              withArrow
              disabled={!idAlmacen || filteredRecords.length === 0}
            >
              <Button
                leftSection={<DocumentArrowDownIcon className="w-5 h-5" />}
                onClick={handleOpenExcel}
                radius="lg"
                size="sm"
                variant="light"
                color="teal"
                disabled={!idAlmacen || filteredRecords.length === 0}
                loading={isGeneratingExcel}
                className="shadow-md active:scale-95 transition-all w-full lg:w-auto px-6 font-semibold shrink-0"
              >
                Excel
              </Button>
            </Tooltip>
            <Button
              leftSection={<PlusIcon className="w-5 h-5" />}
              onClick={openReg}
              radius="lg"
              size="sm"
              disabled={!idAlmacen}
              className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 active:scale-95 transition-all w-full lg:w-auto px-8 font-semibold shrink-0"
            >
              Nuevo Requerimiento
            </Button>
          </div>
        </div>
      </div>

      {!idAlmacen ? (
        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
          <div className="p-4 rounded-full bg-zinc-900/50 mb-4">
            <CheckBadgeIcon className="w-12 h-12 text-zinc-600" />
          </div>
          <Text size="lg" fw={600} className="text-zinc-400">
            Panel de Requerimientos de Almacén
          </Text>
          <Text className="text-zinc-500 text-center max-w-sm mt-1">
            Seleccione el almacén para visualizar los requerimientos pendientes
            de atención.
          </Text>
        </div>
      ) : (
        <DataTableEstandar
          idAccessor="id_requerimiento"
          columns={columns}
          records={filteredRecords}
          loading={loading}
        />
      )}

      <ModalEstandar
        opened={openedRegistro}
        close={closeReg}
        validateClose
        title={`${almacenes.find((a) => String(a.id_almacen) === idAlmacen)?.nombre} - Nuevo Requerimiento`}
        size="75rem"
      >
        <RegistroRequerimiento
          idAlmacenFijo={idAlmacen ? Number(idAlmacen) : undefined}
          onSuccess={(item, printTarget, printWin) => {
            closeReg();
            addRequirementLocal(item);
            setSelectedRequerimiento(item);
            openGestion();
            if (printTarget && printWin) {
              print(<RequerimientoPDF requerimiento={item} />, {
                documentTitle: `Requerimiento_${item.correlativo}`,
                target: printTarget,
              });
            }
          }}
          onCancel={closeReg}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedEvidencias}
        close={() => {
          closeEvidencias();
          setNuevasEvidencias([]);
        }}
        title="Evidencias del Requerimiento"
        size="lg"
      >
        <Stack gap="md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evidenciasActuales.map((archivo, index) => (
              <ArchivoCard key={index} archivo={archivo} />
            ))}
          </div>

          <div className="h-px bg-zinc-800 my-2" />

          <MultiFilePicker
            label="Subir más evidencias"
            files={nuevasEvidencias}
            onFilesChange={setNuevasEvidencias}
          />

          {nuevasEvidencias.length > 0 && (
            <Group justify="flex-end">
              <Button
                size="xs"
                radius="lg"
                color="indigo"
                loading={subiendoEvidencias}
                onClick={async () => {
                  if (!selectedId || nuevasEvidencias.length === 0) return;
                  setSubiendoEvidencias(true);
                  try {
                    const res = await AtencionService.subirEvidencias(
                      selectedId,
                      nuevasEvidencias,
                    );
                    if (res.success && res.data) {
                      notifySuccess("Evidencias agregadas correctamente");
                      setEvidenciasActuales(res.data);
                      setNuevasEvidencias([]);
                      updateRequirementLocal(selectedId, {
                        evidencias: res.data,
                      });
                    } else {
                      notifyError(res.message || "Error al subir evidencias");
                    }
                  } catch (err) {
                    console.error(err);
                    notifyError("Error al subir evidencias");
                  } finally {
                    setSubiendoEvidencias(false);
                  }
                }}
              >
                Guardar Nuevas Evidencias
              </Button>
            </Group>
          )}
        </Stack>
      </ModalEstandar>

      <ModalEstandar
        opened={openedGestion}
        close={() => {
          closeGestion();
          setSelectedRequerimiento(null);
        }}
        title={`Atender Requerimiento de Almacén`}
        size="80rem"
      >
        {selectedRequerimiento && (
          <InfoRequerimiento
            requerimiento={selectedRequerimiento}
            idAlmacen={Number(idAlmacen)}
            onSuccess={() => {
              // Actualizamos localmente el estado a 'En Proceso' para evitar re-fetch de la lista general
              updateRequirementLocal(selectedRequerimiento.id_requerimiento, {
                estado: Estado_Requerimiento.EnDespacho,
              });
            }}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedAnular}
        close={() => {
          if (anulando) return;
          closeAnular();
          setAnularId(null);
          setAnularCorrelativo("");
        }}
        title="Anular Requerimiento"
        size="md"
      >
        <Stack gap="md">
          <Alert
            variant="light"
            color="red"
            radius="lg"
            icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-400" />}
            className="bg-red-500/10 border border-red-500/30"
            classNames={{ message: "text-zinc-200 text-sm leading-relaxed" }}
          >
            Esta accion cambiara el estado del requerimiento a{" "}
            <strong>Anulado</strong>. Si ya tiene entregas iniciadas, el stock de
            lotes sera reingresado, los activos fijos seran devueltos al almacen
            de origen y los consumos asociados seran eliminados.
          </Alert>
          <Text size="sm" className="text-zinc-300">
            Requerimiento a anular:{" "}
            <Badge color="indigo" variant="light" radius="sm">
              {anularCorrelativo}
            </Badge>
          </Text>
          <Group justify="flex-end" mt="sm" gap="md">
            <Button
              variant="subtle"
              onClick={() => {
                if (anulando) return;
                closeAnular();
                setAnularId(null);
                setAnularCorrelativo("");
              }}
              disabled={anulando}
              radius="lg"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              color="red"
              loading={anulando}
              onClick={async () => {
                if (!anularId) return;
                setAnulando(true);
                try {
                  const res = await AtencionService.anularRequerimiento(anularId);
                  if (res.success) {
                    notifySuccess(
                      res.message ?? "Requerimiento anulado correctamente",
                    );
                    updateRequirementLocal(anularId, {
                      estado: Estado_Requerimiento.Anulado,
                    });
                    closeAnular();
                    setAnularId(null);
                    setAnularCorrelativo("");
                  } else {
                    notifyError(
                      res.message ?? "No se pudo anular el requerimiento",
                    );
                  }
                } catch (err) {
                  console.error(err);
                  notifyError("Error inesperado al anular el requerimiento");
                } finally {
                  setAnulando(false);
                }
              }}
              radius="lg"
              size="sm"
              leftSection={<NoSymbolIcon className="w-4 h-4" />}
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-950/20 px-6"
            >
              Anular Requerimiento
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      {/* Modal: Filtro de Turno para Exportacion a Excel */}
      <ModalEstandar
        opened={openedFiltroTurno}
        close={closeFiltroTurno}
        title="Filtro de Turno para Exportacion"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Elige que turnos incluir en el reporte de Excel. Por defecto se
            incluyen Dia y Noche (los requerimientos sin turno quedan fuera).
            Marca "Incluir sin turno" si tambien quieres exportarlos.
          </Text>

          <Stack gap="xs">
            <Checkbox
              label="Dia"
              checked={incluirDia}
              onChange={(e) => setIncluirDia(e.currentTarget.checked)}
              color="orange"
            />
            <Checkbox
              label="Noche"
              checked={incluirNoche}
              onChange={(e) => setIncluirNoche(e.currentTarget.checked)}
              color="indigo"
            />
            <Checkbox
              label="Incluir requerimientos sin turno asignado"
              checked={incluirSinTurno}
              onChange={(e) => setIncluirSinTurno(e.currentTarget.checked)}
            />
          </Stack>

          <Text
            size="xs"
            c="zinc.4"
            className="bg-zinc-900/40 border border-zinc-800 rounded-lg px-3 py-2"
          >
            Se exportaran{" "}
            <Text component="span" fw={700} c="zinc.100">
              {previewFiltrados}
            </Text>{" "}
            de {filteredRecords.length} requerimientos con el filtro actual.
          </Text>

          <Group justify="flex-end" mt="sm" gap="md">
            <Button
              variant="subtle"
              onClick={closeFiltroTurno}
              radius="lg"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              color="teal"
              onClick={handleConfirmExportExcel}
              disabled={!hayAlgunFiltroActivo || previewFiltrados === 0}
              loading={isGeneratingExcel}
              radius="lg"
              size="sm"
              leftSection={<DocumentArrowDownIcon className="w-4 h-4" />}
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-950/20 px-6"
            >
              Exportar Excel
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      {errorLocal && (
        <Text c="red" size="sm" mt="md">
          {errorLocal}
        </Text>
      )}
    </div>
  );
};
