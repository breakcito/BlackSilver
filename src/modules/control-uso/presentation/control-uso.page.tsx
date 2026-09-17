import { useDisclosure } from "@mantine/hooks";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { useControlUso } from "../hooks/useControlUso";
import { useState } from "react";
import dayjs from "dayjs";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { RegistroUso } from "./registro-uso";
import { EdicionControlUsoModal } from "./EdicionControlUsoModal";
import { useExcel } from "../../../hooks/useExcel";
import { useNotify } from "../../../hooks/useNotify";
import { ControlUsoService } from "../service/control-uso.service";
import { buildControlHorasExcel } from "./excel-control-horas";
import { buildControlVueltasExcel } from "./excel-control-vueltas";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";
import {
  Button,
  Group,
  Stack,
  Text,
  Badge,
  TextInput,
  Select,
  Tooltip,
  Loader,
  ActionIcon,
  Menu,
} from "@mantine/core";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  InboxStackIcon,
  Cog8ToothIcon,
  TruckIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  NoSymbolIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { type DataTableColumn } from "mantine-datatable";
import type { RES_ControlUsoLog } from "../service/control-uso.responses";
import { MESES } from "../../../shared/variables/meses";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { Estado_ControlUso } from "../../../shared/enums/control-uso/estadoControlUso";

export const ControlUsoPage = () => {
  useTitlePage("Control de Uso");

  // Load custom hook states
  const {
    logs,
    loading,
    busqueda,
    setBusqueda,
    tipoControl,
    setTipoControl,
    mes,
    setMes,
    anio,
    setAnio,
    activos,
    idActivoFijo,
    setIdActivoFijo,
    loadingActivos,
    pushNuevoLog,
    recargar,
  } = useControlUso();

  const [opened, { open, close }] = useDisclosure(false);

  // Estado del modal de anulacion de control de uso
  const [anularOpened, { open: openAnular, close: closeAnular }] =
    useDisclosure(false);
  const [anularTarget, setAnularTarget] = useState<RES_ControlUsoLog | null>(
    null,
  );
  const [anulando, setAnulando] = useState(false);

  // Estado del modal de edicion de control de uso
  const [editarOpened, { open: openEditar, close: closeEditar }] =
    useDisclosure(false);
  const [editarTarget, setEditarTarget] = useState<RES_ControlUsoLog | null>(
    null,
  );

  const abrirModalAnular = (log: RES_ControlUsoLog) => {
    setAnularTarget(log);
    openAnular();
  };

  const abrirModalEditar = (log: RES_ControlUsoLog) => {
    setEditarTarget(log);
    openEditar();
  };

  const confirmarAnular = async () => {
    if (!anularTarget) return;
    setAnulando(true);
    try {
      const resp = await ControlUsoService.anularControlUso(
        Number(anularTarget.id_log),
      );
      if (resp.success) {
        // El backend decide si reingresa stock o no segun cuantos items
        // del mismo `uuid_grupo` quedan activos. Mostramos el mensaje tal
        // cual lo devuelve el service para no mentir sobre el reingreso.
        const msg =
          resp.message ||
          "Control de uso anulado.";
        notifySuccess?.(msg);
        closeAnular();
        setAnularTarget(null);
        await recargar();
      } else {
        notifyError(resp.message || "No se pudo anular el control de uso");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error inesperado al anular el control de uso");
    } finally {
      setAnulando(false);
    }
  };

  const { generateExcel, isGeneratingExcel } = useExcel();
  const { notifyError, notifySuccess } = useNotify();

  const handleExportExcel = () => {
    const mesNombre = MESES.find((m) => m.value === String(mes))?.label || String(mes);
    const prefix = tipoControl === "horometro" ? "Control_Horas" : tipoControl === "vueltas" ? "Control_Vueltas" : "Control_Odometro";
    const filename = `${prefix}_${mesNombre}_${anio}.xlsx`;

    generateExcel({
      filename,
      builder: async (workbook) => {
        try {
          const resp = await ControlUsoService.getReporteMensual(Number(mes), Number(anio));
          if (resp.success) {
            if (tipoControl === "horometro") {
              await buildControlHorasExcel(
                workbook,
                resp.data.logs,
                Number(mes),
                Number(anio),
                resp.data.consumos_combustible_por_uuid ?? {},
              );
            } else {
              await buildControlVueltasExcel(workbook, resp.data.logs, Number(mes), Number(anio));
            }
          } else {
            notifyError(resp.message || "Error al obtener datos para el reporte");
            throw new Error(resp.message);
          }
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
    });
  };

  // Generate years list
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 6 }, (_, i) => {
    const y = currentYear - 4 + i;
    return { value: String(y), label: String(y) };
  });

  // Agrupar activos por producto para el Select con secciones
  const activosAgrupados = Object.entries(
    activos.reduce<Record<string, { value: string; label: string }[]>>((acc, a) => {
      (acc[a.producto] ??= []).push({
        value: String(a.id_activo),
        label: a.correlativo,
      });
      return acc;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, items]) => ({ group, items }));

  // Agrupa registros por `uuid_grupo` conservando el orden de llegada
  // (que ya viene ordenado por fecha DESC desde el backend). Los registros
  // sin uuid (null/undefined) caen en un solo grupo "Sin grupo" al final.
  const agruparPorUuidGrupo = (
    items: RES_ControlUsoLog[],
  ): { uuid: string | null; registros: RES_ControlUsoLog[] }[] => {
    const map = new Map<string | null, RES_ControlUsoLog[]>();
    for (const it of items) {
      const key = it.uuid_grupo ?? null;
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    // Map conserva orden de insercion, asi que los grupos quedan en el
    // mismo orden en que aparecieron en `logs` (DESC por fecha).
    return Array.from(map.entries()).map(([uuid, registros]) => ({
      uuid,
      registros,
    }));
  };

  // Table columns definition (inspired by Lotes layout and styling patterns)
  const columns: DataTableColumn<RES_ControlUsoLog>[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
    },
    {
      accessor: "periodo",
      title: "Periodo de Uso",
      textAlign: "center",
      width: 280,
      render: (r) => {
        const inicioDate = dayjs(r.fecha_hora_inicio_control);

        const finDate = r.fecha_hora_fin_control
          ? dayjs(r.fecha_hora_fin_control)
          : null;

        return (
          <Group
            gap={8}
            wrap="nowrap"
            justify="center"
            className="mx-auto w-fit"
          >
            {/* Single Calendar Icon at the left */}
            <div className="p-1.5 bg-zinc-850/60 rounded-xl border border-zinc-800/80 shrink-0 shadow-sm flex items-center justify-center">
              <CalendarDaysIcon className="w-4 h-4 text-zinc-400" />
            </div>

            {/* Turno (opcional) — al costadito del icono, verticalmente centrado */}
            {r.tipo_turno && (
              <Badge
                size="sm"
                color={r.tipo_turno === "Noche" ? "violet" : "yellow"}
                variant="light"
                radius="sm"
                className="font-bold uppercase shrink-0 border border-zinc-700/40 px-1.5"
              >
                {r.tipo_turno}
              </Badge>
            )}

            {/* Inner Content holding Inicio & Fin */}
            <Group gap="xs" wrap="nowrap" className="shrink-0">
              {/* Inicio Block */}
              <div className="flex flex-col items-start gap-0.5 min-w-[75px]">
                <Text
                  size="8px"
                  fw={900}
                  className="text-zinc-500 uppercase tracking-widest leading-none"
                >
                  Inicio
                </Text>
                <Text size="11px" fw={800} className="text-zinc-200">
                  {inicioDate.format("DD MMM YYYY")}
                </Text>
                <Text
                  size="10px"
                  c="dimmed"
                  fw={700}
                  className="tracking-tighter"
                >
                  {inicioDate.format("HH:mm")}
                </Text>
              </div>

              {finDate && (
                <>
                  <div className="h-6 w-px bg-zinc-800 shrink-0" />
                  {/* Fin Block */}
                  <div className="flex flex-col items-start gap-0.5 min-w-[75px]">
                    <Text
                      size="8px"
                      fw={900}
                      className="text-zinc-500 uppercase tracking-widest leading-none"
                    >
                      Fin
                    </Text>
                    <Text size="11px" fw={800} className="text-zinc-200">
                      {finDate.format("DD MMM YYYY")}
                    </Text>
                    <Text
                      size="10px"
                      c="dimmed"
                      fw={700}
                      className="tracking-tighter"
                    >
                      {finDate.format("HH:mm")}
                    </Text>
                  </div>
                </>
              )}
            </Group>
          </Group>
        );
      },
    },
    {
      accessor: "lecturas",
      title: tipoControl === "horometro" ? "Horómetro" : tipoControl === "odometro" ? "Odómetro" : "Vueltas",
      width: 160,
      render: (r) => (
        <div className="flex flex-col items-start gap-0.5 ml-2">
          {tipoControl === "vueltas" ? (
            <div className="flex flex-col gap-1 mt-0.5 mb-0.5">
              <Text size="11px" fw={700} className="text-zinc-200">
                <span className="text-zinc-500 font-extrabold uppercase tracking-wider text-[9px] mr-1">
                  Vueltas:
                </span>
                {formatNumber(r.cantidad_vueltas ?? 0)}
              </Text>
              {(r.horometro_inicio !== null || r.horometro_fin !== null) && (
                <Text size="10px" c="dimmed" fw={600}>
                  Horóm: {formatNumber(r.horometro_inicio ?? 0)} - {formatNumber(r.horometro_fin ?? 0)}
                </Text>
              )}
              {(r.tarifa_material || r.tarifa_distancia_metros || r.cantidad_sacos) && (
                <Group gap={4} wrap="wrap">
                  {r.tarifa_distancia_metros && (
                    <Badge size="xs" color="blue" variant="filled">
                      {r.tarifa_distancia_metros} m.
                    </Badge>
                  )}
                  {r.tarifa_material && (
                    <Badge size="xs" color="pink" variant="filled">
                      {r.tarifa_material}
                    </Badge>
                  )}
                  {r.cantidad_sacos ? (
                    <Badge size="xs" color="orange" variant="filled">
                      {r.cantidad_sacos} sacos
                    </Badge>
                  ) : null}
                </Group>
              )}
            </div>
          ) : (
            <>
              <Text size="11px" fw={700} className="text-zinc-200">
                <span className="text-zinc-500 font-extrabold uppercase tracking-wider text-[9px] mr-1">
                  Inicio:
                </span>
                {formatNumber(tipoControl === "horometro" ? (r.horometro_inicio ?? 0) : (r.odometro_inicio ?? 0))}
              </Text>
              <Text size="11px" fw={700} className="text-zinc-200">
                <span className="text-zinc-500 font-extrabold uppercase tracking-wider text-[9px] mr-1">
                  Fin:
                </span>
                {formatNumber(tipoControl === "horometro" ? (r.horometro_fin ?? 0) : (r.odometro_fin ?? 0))}
              </Text>
            </>
          )}
        </div>
      ),
    },
    {
      accessor: "total_horas",
      title: tipoControl === "horometro" ? "Total Horas" : tipoControl === "odometro" ? "Total Km" : "Total Vueltas",
      hidden: tipoControl === "vueltas",
      textAlign: "center",
      width: 140,
      render: (r) => {
        const value = formatNumber(
          tipoControl === "vueltas"
            ? (r.cantidad_vueltas ?? 0)
            : tipoControl === "odometro"
              ? (r.total_km ?? 0)
              : (r.total_horas ?? 0)
        );
        const unit = tipoControl === "horometro" ? "hrs" : tipoControl === "odometro" ? "Km" : "vlts";
        return (
          <Badge
            variant="light"
            color="violet"
            radius="md"
            className="font-bold border border-violet-500/20 py-2.5 h-7 shadow-sm mx-auto shrink-0"
          >
            {value} {unit}
          </Badge>
        );
      },
    },
    {
      accessor: "destino",
      title: "Destino / Trabajo",
      width: 250,
      hidden: tipoControl === "odometro",
      render: (r) => (
        <Stack gap={2} className="py-1">
          {r.es_para_mina ? (
            <>
              {r.mina && (
                <Text size="11px" c="zinc.300">
                  <span className="font-extrabold uppercase tracking-wider text-[9px] text-zinc-500 mr-1">Mina:</span>
                  {r.mina}
                </Text>
              )}
              {r.labor && (
                <Text size="11px" c="zinc.400">
                  <span className="font-extrabold uppercase tracking-wider text-[9px] text-zinc-500 mr-1">Labor:</span>
                  {r.labor}
                </Text>
              )}
              {r.lote_mineral && (
                <Text size="11px" c="amber.4">
                  <span className="font-extrabold uppercase tracking-wider text-[9px] text-zinc-500 mr-1">Lote:</span>
                  {r.lote_mineral}
                </Text>
              )}
            </>
          ) : (
            <>
              {r.cliente && (
                <Text size="11px" c="zinc.300">
                  <span className="font-extrabold uppercase tracking-wider text-[9px] text-zinc-500 mr-1">Cliente:</span>
                  {r.cliente}
                </Text>
              )}
            </>
          )}
          {r.tipo_carga && (
            <Text size="11px" c="zinc.400" mt={2}>
              <span className="font-extrabold uppercase tracking-wider text-[9px] text-zinc-500 mr-1">Carga / Servicio:</span>
              {r.tipo_carga}
            </Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: "costo",
      title: "Costo Operativo",
      textAlign: "center",
      width: 270,
      render: (r) => (
        <Group gap={8} wrap="nowrap" justify="center" className="mx-auto w-fit">
          {/* Single Banknotes Icon at the left */}
          <div className="p-1.5 bg-zinc-850/60 rounded-xl border border-zinc-800/80 shrink-0 shadow-sm flex items-center justify-center">
            <BanknotesIcon className="w-4 h-4 text-zinc-400" />
          </div>

          {/* Inner Content holding Unitario | Total */}
          <Group gap="xs" wrap="nowrap" className="shrink-0">
            {/* Unitario Block */}
            <div className="flex flex-col items-start gap-0.5 min-w-[95px]">
              <Text
                size="8px"
                fw={900}
                className="text-zinc-500 uppercase tracking-widest leading-none"
              >
                Precio Unit.
              </Text>
              <Badge
                variant="light"
                color="indigo"
                radius="sm"
                size="sm"
                className="font-bold border border-indigo-500/10 px-1.5 mt-0.5"
              >
                S/. {formatNumber(r.precio_unitario ?? 0)}
              </Badge>
              {r.tarifa_desc && (
                <Text size="8px" c="zinc.500" fw={600} className="mt-1 truncate max-w-[95px]" title={r.tarifa_desc}>
                  {r.tarifa_desc}
                </Text>
              )}
            </div>

            {/* Separator Divider */}
            <div className="w-px h-8 bg-zinc-800/80 self-center shrink-0" />

            {/* Total Block */}
            <div className="flex flex-col items-start gap-0.5 min-w-[95px]">
              <Text
                size="8px"
                fw={900}
                className="text-zinc-500 uppercase tracking-widest leading-none"
              >
                Costo Total
              </Text>
              <Badge
                variant="light"
                color="pink"
                radius="sm"
                size="sm"
                className="font-bold border border-pink-500/10 px-1.5 mt-0.5"
              >
                S/. {formatNumber(r.costo_total ?? 0)}
              </Badge>
            </div>
          </Group>
        </Group>
      ),
    },
    {
      accessor: "observacion",
      title: "Observaciones",
      width: 280,
      render: (r) =>
        r.observacion ? (
          <Tooltip label={r.observacion} multiline w={245} withArrow>
            <Text
              size="xs"
              className="text-zinc-400 truncate max-w-[250px] cursor-help"
            >
              {r.observacion}
            </Text>
          </Tooltip>
        ) : (
          <Text size="xs" c="zinc.5" fs="italic">
            Sin observaciones
          </Text>
        ),
    },
    {
      accessor: "estado",
      title: "Estado",
      width: 130,
      render: (r) => {
        // Mismo patron visual que Requerimientos (variant="light", color
        // segun estado): Activo en verde (green), Anulado en rojo (red).
        const estado = (r.estado ?? Estado_ControlUso.Activo).toString();
        const esAnulado =
          estado.toLowerCase() === Estado_ControlUso.Anulado.toLowerCase();
        const color = esAnulado ? "red" : "green";
        return (
          <Group gap={6} wrap="nowrap" justify="space-between">
            <Badge
              color={color}
              variant="light"
              radius="sm"
              size="sm"
              className="font-semibold uppercase tracking-wider"
            >
              {estado}
            </Badge>
            <Menu position="bottom-end" withinPortal shadow="md" radius="md">
              <Menu.Target>
                <ActionIcon
                  size="sm"
                  radius="md"
                  variant="subtle"
                  color="zinc.4"
                  aria-label="Acciones"
                >
                  <EllipsisVerticalIcon className="w-4 h-4" />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {!esAnulado && (
                  <Menu.Item
                    leftSection={
                      <PencilSquareIcon className="w-4 h-4 text-indigo-400" />
                    }
                    onClick={() => abrirModalEditar(r)}
                  >
                    Editar Control de Uso
                  </Menu.Item>
                )}
                {!esAnulado ? (
                  <Menu.Item
                    leftSection={
                      <NoSymbolIcon className="w-4 h-4 text-red-400" />
                    }
                    color="red"
                    onClick={() => abrirModalAnular(r)}
                  >
                    Anular Control de Uso
                  </Menu.Item>
                ) : (
                  <Menu.Item disabled color="zinc.5">
                    Sin acciones disponibles
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        );
      },
    },
  ];

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  };

  // Find the selected asset object to build a friendly label in the modal
  const selectedAssetObj = activos.find(
    (a) => String(a.id_activo) === idActivoFijo,
  );

  return (
    <Stack gap="lg" className="animate-fade-in text-zinc-100">
      {/* Filter Horizontal Box */}
      <div className="flex flex-col md:flex-row items-end gap-3 w-full">
        {/* Tipo de control */}
        <div className="w-full md:w-44">
          <Select
            label="Tipo de control"
            data={[
              { value: "horometro", label: "Horómetro" },
              { value: "vueltas", label: "Vueltas" },
            ]}
            value={tipoControl}
            onChange={(val) =>
              setTipoControl((val as "horometro" | "odometro" | "vueltas") || "horometro")
            }
            radius="lg"
            size="sm"
            classNames={{
              ...fieldClasses,
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />
        </div>

        {/* Seleccionar Activo Fijo */}
        <div className="w-full md:w-64">
          <Select
            label="Activo Fijo"
            placeholder={
              loadingActivos ? "Cargando activos..." : "Seleccione un activo..."
            }
            data={activosAgrupados}
            value={idActivoFijo}
            onChange={setIdActivoFijo}
            searchable
            disabled={loadingActivos}
            rightSection={
              loadingActivos ? <Loader size={12} color="indigo" /> : null
            }
            radius="lg"
            size="sm"
            classNames={{
              ...fieldClasses,
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />
        </div>

        {/* Mes */}
        <div className="w-full md:w-36">
          <Select
            label="Mes"
            data={MESES}
            value={String(mes)}
            onChange={(val) => setMes(val ? Number(val) : 1)}
            radius="lg"
            size="sm"
            classNames={{
              ...fieldClasses,
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />
        </div>

        {/* Año */}
        <div className="w-full md:w-28">
          <Select
            label="Año"
            data={yearsList}
            value={String(anio)}
            onChange={(val) => setAnio(val ? Number(val) : currentYear)}
            radius="lg"
            size="sm"
            classNames={{
              ...fieldClasses,
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />
        </div>

        {/* Buscador (flex-1 para que sea el más grande) */}
        <div className="flex-1 min-w-[200px] w-full">
          <TextInput
            label="Buscar Registro"
            placeholder="Buscar correlativo, fecha..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            leftSection={
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
            }
            radius="lg"
            size="sm"
            classNames={fieldClasses}
          />
        </div>

        {/* Botones de acción */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <BotonRecargar onReload={recargar} loading={loading} />
          <Button
            color="green.7"
            onClick={handleExportExcel}
            loading={isGeneratingExcel}
            disabled={logs.length === 0 || isGeneratingExcel}
            radius="lg"
            className="h-9 transition-all px-4 disabled:opacity-50"
            leftSection={!isGeneratingExcel && <IconFileSpreadsheet size={18} />}
          >
            Exportar
          </Button>
          <Button
            color="blue.6"
            leftSection={<PlusIcon className="w-4 h-4" />}
            onClick={open}
            radius="lg"
            disabled={!idActivoFijo}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 shadow-lg shadow-blue-900/20 transition-all px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Registrar Uso
          </Button>
        </div>
      </div>

      {/* Unified Table Card Container (Matches Lotes, Activos Fijos, and Ordenes de Compra) */}
      <div className="bg-zinc-900/65 border border-zinc-800 rounded-[24px] shadow-2xl overflow-hidden flex flex-col backdrop-blur-md">
        {/* Header Block (Unified header layout) */}
        {selectedAssetObj && (
          <div className="p-4 bg-zinc-900/20 border-b border-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                {tipoControl === "horometro" ? (
                  <Cog8ToothIcon className="w-5 h-5 text-indigo-400" />
                ) : (
                  <TruckIcon className="w-5 h-5 text-indigo-400" />
                )}
              </div>
              <Stack gap={2}>
                <div className="flex items-center gap-2.5">
                  <Text
                    fw={800}
                    className="uppercase tracking-widest text-zinc-500 text-[10px]!"
                  >
                    {tipoControl === "horometro"
                      ? "Control por Horómetro"
                      : "Control por Odómetro"}
                  </Text>
                  <Badge
                    size="xs"
                    color="pink"
                    variant="light"
                    className="font-extrabold border border-pink-500/10"
                  >
                    {selectedAssetObj.correlativo}
                  </Badge>
                </div>
                <Text size="md" fw={900} className="text-white tracking-tight">
                  {selectedAssetObj.producto}
                </Text>
              </Stack>
            </div>

            <div className="flex items-center gap-6">
              {(selectedAssetObj.almacen || selectedAssetObj.mina) && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-wider">
                    Ubicación
                  </span>
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {selectedAssetObj.almacen || selectedAssetObj.mina}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-zinc-500 uppercase font-extrabold tracking-wider">
                  Registros del Mes
                </span>
                <Badge
                  size="sm"
                  color="indigo"
                  variant="light"
                  className="font-extrabold"
                >
                  {logs.length} {logs.length === 1 ? "registro" : "registros"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Table area: grupos UUID */}
        <div className="relative shadow-inner">
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
                Consultando registros...
              </Text>
            </Stack>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20">
              <InboxStackIcon className="size-12 text-zinc-700 mb-4" />
              <Text
                size="sm"
                fw={700}
                className="text-zinc-400 uppercase tracking-widest"
              >
                Sin resultados
              </Text>
              <Text size="xs" c="dimmed" className="mt-1">
                No se encontraron registros de uso para los filtros aplicados.
              </Text>
            </div>
          ) : (
            <Stack gap="md" p="md">
              {agruparPorUuidGrupo(logs).map((grupo) => {
                const uuid = grupo.uuid;
                const registros = grupo.registros;
                return (
                  <div
                    key={uuid ?? "sin-grupo"}
                    className="rounded-2xl border border-zinc-800/80 bg-zinc-950/30 overflow-hidden"
                  >
                    {/* Cabecera del grupo: UUID + conteo */}
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80">
                      <Group gap="xs" wrap="nowrap">
                        <TagIcon className="w-4 h-4 text-grape-400 shrink-0" />
                        <Text
                          size="10px"
                          fw={900}
                          className="uppercase tracking-widest text-zinc-500"
                        >
                          Grupo UUID
                        </Text>
                        {uuid ? (
                          <Badge
                            variant="light"
                            color="grape"
                            radius="sm"
                            size="md"
                            className="font-mono font-bold tracking-tight"
                          >
                            {uuid}
                          </Badge>
                        ) : (
                          <Badge
                            variant="light"
                            color="zinc"
                            radius="sm"
                            size="sm"
                            className="font-bold uppercase tracking-wider"
                          >
                            Sin grupo
                          </Badge>
                        )}
                      </Group>
                      <Badge
                        size="sm"
                        variant="light"
                        color="zinc"
                        radius="sm"
                        className="font-bold uppercase tracking-wider"
                      >
                        {registros.length}{" "}
                        {registros.length === 1 ? "registro" : "registros"}
                      </Badge>
                    </div>

                    {/* Mini-tabla del grupo */}
                    <DataTableEstandar
                      idAccessor="id_log"
                      columns={columns}
                      records={registros}
                      loading={loading}
                      minHeight={0}
                      // Bordes mas sutiles para que se vea como sub-tabla.
                      rowClassName={() =>
                        "bg-zinc-950/20 hover:bg-zinc-900/40"
                      }
                    />
                  </div>
                );
              })}
            </Stack>
          )}
        </div>
      </div>

      {/* Register Use Modal */}
      <ModalEstandar
        opened={opened}
        close={close}
        title={`Registrar Control por ${tipoControl === "horometro" ? "Horómetro" : tipoControl === "odometro" ? "Odómetro" : "Vueltas"}`}
        size="xl"
      >
        {selectedAssetObj && (
          <RegistroUso
            asset={selectedAssetObj}
            tipoControl={tipoControl}
            onSuccess={(nuevosLogs) => {
              pushNuevoLog(nuevosLogs);
              close();
            }}
            onCancel={close}
          />
        )}
      </ModalEstandar>

      {/* Anular Control de Uso Modal */}
      <ModalEstandar
        opened={anularOpened}
        close={() => {
          if (!anulando) {
            closeAnular();
            setAnularTarget(null);
          }
        }}
        title="Anular Control de Uso"
        size="md"
      >
        {anularTarget && (
          <Stack gap="sm">
            <div className="rounded-lg border border-red-500/30 bg-red-950/10 p-3">
              <Group gap={8} align="center">
                <NoSymbolIcon className="w-5 h-5 text-red-400" />
                <Text size="sm" fw={800} className="text-red-300 uppercase tracking-wider">
                  Esta accion no se puede deshacer
                </Text>
              </Group>
              <Text size="xs" c="zinc.300" mt={6}>
                Al anular este control de uso:
              </Text>
              <Stack gap={3} mt={4} className="text-xs text-zinc-400">
                <Text size="xs">
                  - El registro de uso cambiara a estado{" "}
                  <span className="text-red-400 font-bold">Anulado</span> y no se
                  contara en calculos, listados principales ni en el Excel.
                </Text>
                <Text size="xs">
                  - <span className="text-amber-300 font-bold">Stock y consumo:</span>{" "}
                  los consumos se asocian al GRUPO UUID, no a este item
                  puntual. El stock se reingresa al lote y el consumo se
                  elimina fisicamente SOLO cuando este sea el ULTIMO item
                  activo del grupo (los demas bloques horometrados ya
                  esten anulados). Si quedan mas bloques activos del
                  mismo grupo, no se toca stock ni Kardex.
                </Text>
                <Text size="xs">
                  - Se registra un movimiento en Kardex (Ingreso / Reingreso)
                  solo cuando se cierra el grupo completo.
                </Text>
              </Stack>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3">
              <Text size="10px" c="zinc.500" fw={900} tt="uppercase" lts="0.08em" mb={4}>
                Registro a anular
              </Text>
              <Text size="sm" fw={700} className="text-zinc-100">
                {anularTarget.producto} - {anularTarget.correlativo}
              </Text>
              <Text size="xs" c="zinc.400" mt={2}>
                {anularTarget.fecha_hora_inicio_control} -{" "}
                {anularTarget.fecha_hora_fin_control || "(sin fin)"}
              </Text>
            </div>

            <Group justify="flex-end" gap="sm" mt="sm">
              <Button
                variant="default"
                size="xs"
                radius="lg"
                disabled={anulando}
                onClick={() => {
                  closeAnular();
                  setAnularTarget(null);
                }}
                className="bg-zinc-800! text-zinc-300! border-zinc-700!"
              >
                Cancelar
              </Button>
              <Button
                color="red.6"
                size="xs"
                radius="lg"
                loading={anulando}
                onClick={confirmarAnular}
                leftSection={<NoSymbolIcon className="w-4 h-4" />}
                className="bg-red-600! hover:bg-red-700! text-white! font-bold"
              >
                Anular Control de Uso
              </Button>
            </Group>
          </Stack>
        )}
      </ModalEstandar>

      {/* Editar Control de Uso Modal */}
      <EdicionControlUsoModal
        opened={editarOpened}
        close={closeEditar}
        target={editarTarget}
        onSuccess={recargar}
      />
    </Stack>
  );
};

export default ControlUsoPage;
