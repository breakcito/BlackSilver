import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  PlusIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import type { DataTableColumn } from "mantine-datatable";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { useNotify } from "../../../hooks/useNotify";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { cn } from "../../../shared/functions/cn";
import { MESES } from "../../../shared/variables/meses";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import { ModalAjustarStock } from "./modal-ajustar-stock";
import { ModalRegistrarTamizaje } from "./modal-registrar-tamizaje";
import type {
  StockCarbonItem,
  StockCarbonLogEntry,
  TamizajeCarbonItem,
} from "../service/tamizaje-carbon.responses";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_Almacen } from "../../../service/responses/almacen";

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dayjs(d).format("DD/MM/YYYY HH:mm");
};

const formatTN = (val: number | null | undefined) =>
  `${formatNumber(Number(val ?? 0))} TN`;

const estilitos = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown: "bg-zinc-900 border-zinc-800",
  option: "text-zinc-300 hover:bg-zinc-800",
};

export const TamizajeCarbonPage = () => {
  useTitlePage("Tamizaje de Carbón");
  const { notifyError } = useNotify();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Filter state
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idTipoCarbon, setIdTipoCarbon] = useState<string | null>(null);
  const [mes, setMes] = useState<string | null>(String(currentMonth));
  const [anio, setAnio] = useState<string | null>(String(currentYear));
  const [busqueda, setBusqueda] = useState<string>("");
  const [busquedaDebounced] = useDebouncedValue(busqueda, 350);

  // Data
  const [stocks, setStocks] = useState<StockCarbonItem[]>([]);
  const [tamizajes, setTamizajes] = useState<TamizajeCarbonItem[]>([]);
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [tiposCarbon, setTiposCarbon] = useState<RES_TipoCarbon[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingTamizajes, setLoadingTamizajes] = useState(false);

  // Modals state
  const [stockToEdit, setStockToEdit] = useState<StockCarbonItem | null>(null);
  const [openNuevoTamizaje, setOpenNuevoTamizaje] = useState(false);
  const [historialStockModal, setHistorialStockModal] = useState<{
    titulo: string;
    logs: StockCarbonLogEntry[];
  } | null>(null);
  const [evidenciasModal, setEvidenciasModal] = useState<{
    titulo: string;
    items: Array<{ url: string; nombre_original?: string; extension?: string }>;
  } | null>(null);

  // Load masters
  useEffect(() => {
    const fetchMaestros = async () => {
      try {
        const [resAlm, resTipos] = await Promise.all([
          AuxService.get_almacenes({ para_carbon: true }),
          TipoCarbonService.getTipos(),
        ]);
        if (resAlm?.data) setAlmacenes(resAlm.data);
        if (resTipos?.data) setTiposCarbon(resTipos.data);
      } catch (err) {
        console.error("Error al cargar maestros", err);
      }
    };
    fetchMaestros();
  }, []);

  // Fetch stocks
  const cargarStocks = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const resp = await TamizajeCarbonService.getStocks({
        id_almacen: idAlmacen ? Number(idAlmacen) : undefined,
      });
      if (resp.success && resp.data) {
        setStocks(resp.data);
      } else {
        setStocks([]);
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al cargar stock de carbón");
      setStocks([]);
    } finally {
      setLoadingStocks(false);
    }
  }, [idAlmacen, notifyError]);

  // Fetch tamizajes
  const cargarTamizajes = useCallback(async () => {
    setLoadingTamizajes(true);
    try {
      const resp = await TamizajeCarbonService.getTamizajes({
        id_almacen: idAlmacen ? Number(idAlmacen) : undefined,
        mes: mes ? Number(mes) : undefined,
        anio: anio ? Number(anio) : undefined,
        filtros: busquedaDebounced.trim() || undefined,
      });
      if (resp.success && resp.data) {
        setTamizajes(resp.data);
      } else {
        setTamizajes([]);
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al cargar historial de tamizajes");
      setTamizajes([]);
    } finally {
      setLoadingTamizajes(false);
    }
  }, [idAlmacen, mes, anio, busquedaDebounced, notifyError]);

  // Trigger loads on filter change
  useEffect(() => {
    cargarStocks();
  }, [cargarStocks]);

  useEffect(() => {
    cargarTamizajes();
  }, [cargarTamizajes]);

  // Reload everything
  const recargarTodo = useCallback(async () => {
    await Promise.all([cargarStocks(), cargarTamizajes()]);
  }, [cargarStocks, cargarTamizajes]);

  // Options for selects
  const almacenesOptions = useMemo(
    () =>
      almacenes.map((a) => ({
        value: String(a.id_almacen),
        label: a.nombre,
      })),
    [almacenes],
  );

  const tiposCarbonOptions = useMemo(() => {
    const ordenados = [...tiposCarbon].sort((a, b) => {
      const aCompra = a.para_compra ? 1 : 0;
      const bCompra = b.para_compra ? 1 : 0;
      if (aCompra !== bCompra) {
        return bCompra - aCompra;
      }
      return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    });

    return ordenados.map((t) => ({
      value: String(t.id_tipo_carbon),
      label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}${t.para_compra ? " · Para Compra" : ""}`,
    }));
  }, [tiposCarbon]);

  const aniosOptions = useMemo(
    () => [
      { value: String(currentYear - 2), label: String(currentYear - 2) },
      { value: String(currentYear - 1), label: String(currentYear - 1) },
      { value: String(currentYear), label: String(currentYear) },
      { value: String(currentYear + 1), label: String(currentYear + 1) },
    ],
    [currentYear],
  );

  // Group stocks by tipo_carbon: los de compra a la izquierda y ordenados alfabéticamente
  const stockPorTipo = useMemo(() => {
    const result: Array<{
      id_tipo_carbon: number;
      nombre: string;
      codigo?: string | null;
      para_compra: boolean;
      stockTotal: number;
      matchingStocks: StockCarbonItem[];
      stockItemUnico: StockCarbonItem | null;
    }> = [];

    const processedIds = new Set<number>();

    for (const tipo of tiposCarbon) {
      processedIds.add(tipo.id_tipo_carbon);
      const matching = stocks.filter(
        (s) => s.id_tipo_carbon === tipo.id_tipo_carbon,
      );
      const stockTotal = matching.reduce(
        (acc, s) => acc + (Number(s.stock_actual) || 0),
        0,
      );
      result.push({
        id_tipo_carbon: tipo.id_tipo_carbon,
        nombre: tipo.nombre,
        codigo: tipo.codigo,
        para_compra: Boolean(tipo.para_compra),
        stockTotal,
        matchingStocks: matching,
        stockItemUnico: matching.length === 1 ? matching[0] : null,
      });
    }

    for (const s of stocks) {
      if (!processedIds.has(s.id_tipo_carbon)) {
        processedIds.add(s.id_tipo_carbon);
        const matching = stocks.filter(
          (x) => x.id_tipo_carbon === s.id_tipo_carbon,
        );
        const stockTotal = matching.reduce(
          (acc, x) => acc + (Number(x.stock_actual) || 0),
          0,
        );
        result.push({
          id_tipo_carbon: s.id_tipo_carbon,
          nombre: s.tipo_carbon_nombre,
          codigo: s.tipo_carbon_codigo,
          para_compra: Boolean(s.tipo_carbon_para_compra),
          stockTotal,
          matchingStocks: matching,
          stockItemUnico: matching.length === 1 ? matching[0] : null,
        });
      }
    }

    // Ordenar: tipos para compra primero (a la izquierda), y luego alfabéticamente
    result.sort((a, b) => {
      const aCompra = a.para_compra ? 1 : 0;
      const bCompra = b.para_compra ? 1 : 0;
      if (aCompra !== bCompra) {
        return bCompra - aCompra;
      }
      return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    });

    return result;
  }, [tiposCarbon, stocks]);

  const stockTotalGeneral = useMemo(
    () => stockPorTipo.reduce((acc, curr) => acc + curr.stockTotal, 0),
    [stockPorTipo],
  );

  // Client-side filtering by tipo_carbon if selected
  const tamizajesFiltrados = useMemo(() => {
    if (!idTipoCarbon) return tamizajes;
    return tamizajes.filter((t) => t.id_tipo_carbon === Number(idTipoCarbon));
  }, [tamizajes, idTipoCarbon]);

  // Table columns for Tamizajes
  const tamizajeColumns: DataTableColumn<TamizajeCarbonItem>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 50,
      },
      {
        accessor: "fecha_hora_tamizaje",
        title: "Fecha y Hora",
        width: 150,
        textAlign: "center",
        render: (r) => (
          <div className="flex flex-col gap-0 items-center justify-center">
            <Text size="xs" fw={600} className="text-zinc-100">
              {dayjs(r.fecha_hora_tamizaje).format("DD/MM/YYYY")}
            </Text>
            <Text size="xs" c="dimmed" fw={500}>
              {dayjs(r.fecha_hora_tamizaje).format("HH:mm A")}
            </Text>
          </div>
        ),
      },
      {
        accessor: "almacen_nombre",
        title: "Almacén",
        textAlign: "center",
        width: 200,
        render: (r) => (
          <Text size="xs" fw={600}>
            {r.almacen_nombre}
          </Text>
        ),
      },
      {
        accessor: "tipo_carbon_nombre",
        title: "Carbón Procesado",
        width: 200,
        textAlign: "center",
        render: (r) => (
          <div className="flex flex-col items-center gap-2">
            <Group gap={6} wrap="nowrap">
              <Badge variant="light" color="indigo" radius="sm">
                {r.tipo_carbon_nombre}
              </Badge>
              {r.tipo_carbon_codigo && (
                <Text size="xs" c="gray" fw={500}>
                  ({r.tipo_carbon_codigo})
                </Text>
              )}
            </Group>
            <Text size="sm" fw={700} c={"lime"}>
              {formatTN(r.cantidad_tamizada)}
            </Text>
          </div>
        ),
      },
      {
        accessor: "variantes",
        title: "Variantes",
        textAlign: "center",
        width: 300,
        render: (r) => {
          const vars = r.variantes ?? [];
          if (vars.length === 0)
            return (
              <Text size="xs" c="dimmed">
                —
              </Text>
            );
          return (
            <Group gap={6} wrap="wrap" justify="center">
              {vars.map((v) => (
                <Badge
                  key={v.id_variante_tamizaje_carbon}
                  variant="outline"
                  color="teal"
                  radius="sm"
                  size="sm"
                >
                  {v.tipo_variante_nombre}: {formatTN(v.cantidad_extraida)}
                </Badge>
              ))}
            </Group>
          );
        },
      },
      {
        accessor: "rendimiento",
        title: "Rendimiento",
        width: 170,
        textAlign: "center",
        render: (r) => {
          const tamizada = Number(r.cantidad_tamizada) || 0;
          const extraida = Number(r.cantidad_extraida) || 0;
          const merma = Math.max(0, tamizada - extraida);
          const pct =
            tamizada > 0
              ? Math.round((extraida / tamizada) * 100 * 10) / 10
              : 0;

          return (
            <Stack gap={2} align="center">
              <Text size="xs" fw={700} className="text-teal-400">
                Extr: {formatTN(extraida)} ({pct}%)
              </Text>
              <Text size="xs" c="gray">
                Restante: {formatTN(merma)}
              </Text>
            </Stack>
          );
        },
      },
      {
        accessor: "referencia",
        title: "Referencia / Carga",
        width: 180,
        textAlign: "center",
        render: (r) => {
          if (
            !r.carga_ticket_balanza &&
            !r.compra_correlativo &&
            !r.carga_placa
          ) {
            return (
              <Text size="xs" c="dimmed">
                —
              </Text>
            );
          }
          return (
            <Stack gap={1}>
              {r.compra_correlativo && (
                <Text size="xs" fw={600} className="text-blue-400">
                  OC: {r.compra_correlativo}
                </Text>
              )}
              {r.carga_ticket_balanza && (
                <Text size="xs" fw={500} className="text-zinc-300">
                  Ticket: {r.carga_ticket_balanza}
                </Text>
              )}
              {r.carga_placa && (
                <Text size="xs" c="gray">
                  Placa: {r.carga_placa}
                </Text>
              )}
            </Stack>
          );
        },
      },
      {
        accessor: "responsables",
        title: "Responsables",
        width: 170,
        textAlign: "center",
        render: (r) => (
          <Stack gap={1}>
            <Text size="xs" c={"white"} fw={600}>
              <span className="text-zinc-400">Reg: </span>
              {r.empleado_registro}
            </Text>
            {r.empleado_supervisor && (
              <Text size="xs" c={"white"} fw={600}>
                <span className="text-zinc-400">Sup: </span>
                {r.empleado_supervisor}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        accessor: "evidencias",
        title: "Adjuntos",
        width: 90,
        textAlign: "center",
        render: (r) => {
          const total = r.evidencias?.length ?? 0;
          if (total === 0)
            return (
              <Text size="xs" c="dimmed">
                —
              </Text>
            );
          return (
            <Tooltip label={`Ver ${total} evidencia(s)`} withArrow>
              <ActionIcon
                variant="light"
                color="indigo"
                size="sm"
                radius="md"
                onClick={() =>
                  setEvidenciasModal({
                    titulo: `${r.tipo_carbon_nombre} · ${r.almacen_nombre}`,
                    items: r.evidencias ?? [],
                  })
                }
              >
                <PaperClipIcon className="w-3.5 h-3.5" />
              </ActionIcon>
            </Tooltip>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-5 animate-fade-in text-zinc-100">
      {/* 1. Barra de Filtros + Botón Recargar + Botón de Registro */}
      <div className="flex flex-col md:flex-row items-end gap-3 w-full flex-wrap">
        {/* Almacén */}
        <div className="w-full sm:w-56 md:w-52">
          <Select
            label="Almacén"
            placeholder="Todos los almacenes"
            data={almacenesOptions}
            value={idAlmacen}
            onChange={setIdAlmacen}
            clearable
            searchable
            size="xs"
            radius="lg"
            leftSection={
              <BuildingStorefrontIcon className="w-4 h-4 text-zinc-500" />
            }
            classNames={estilitos}
          />
        </div>

        {/* Tipo de carbón */}
        <div className="w-full sm:w-52 md:w-48">
          <Select
            label="Tipo de carbón"
            placeholder="Todos los tipos"
            data={tiposCarbonOptions}
            value={idTipoCarbon}
            onChange={setIdTipoCarbon}
            clearable
            searchable
            size="xs"
            radius="lg"
            leftSection={<ScaleIcon className="w-4 h-4 text-zinc-500" />}
            classNames={estilitos}
          />
        </div>

        {/* Mes */}
        <div className="w-full sm:w-36 md:w-36">
          <Select
            label="Mes"
            placeholder="Todo el año"
            data={MESES.map((m) => ({
              value: String(m.value),
              label: m.label,
            }))}
            value={mes}
            onChange={setMes}
            clearable
            size="xs"
            radius="lg"
            leftSection={<CalendarDaysIcon className="w-4 h-4 text-zinc-500" />}
            classNames={estilitos}
          />
        </div>

        {/* Año */}
        <div className="w-full sm:w-28 md:w-28">
          <Select
            label="Año"
            data={aniosOptions}
            value={anio}
            onChange={setAnio}
            clearable
            size="xs"
            radius="lg"
            classNames={estilitos}
          />
        </div>

        {/* Buscador */}
        <div className="flex-1 min-w-[200px] w-full">
          <TextInput
            label="Búsqueda"
            placeholder="Ticket, placa, responsable..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            leftSection={
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
            }
            size="xs"
            radius="lg"
            classNames={estilitos}
          />
        </div>

        {/* Acciones: Recargar + Nuevo Tamizaje */}
        <div className="flex items-center gap-2 shrink-0">
          <BotonRecargar
            onReload={recargarTodo}
            loading={loadingTamizajes || loadingStocks}
            tooltip="Recargar datos de stock y tamizajes"
          />
          <Button
            color="teal"
            radius="lg"
            size="xs"
            leftSection={<PlusIcon className="w-4 h-4" />}
            onClick={() => setOpenNuevoTamizaje(true)}
            className="font-semibold shadow-md shadow-teal-950/40"
          >
            Nuevo Tamizaje
          </Button>
        </div>
      </div>

      {/* 2. Stock de cada tipo de carbón en cards en horizontal pequeños */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <Group gap="xs">
            <Text
              size="xs"
              fw={700}
              className="text-zinc-400 uppercase tracking-wider"
            >
              Stock de Carbón{" "}
              {idAlmacen
                ? `· ${almacenes.find((a) => String(a.id_almacen) === idAlmacen)?.nombre || ""}`
                : "· Consolidado"}
            </Text>
            {idTipoCarbon && (
              <Badge
                size="xs"
                variant="light"
                color="teal"
                className="cursor-pointer"
                onClick={() => setIdTipoCarbon(null)}
                rightSection={<span className="text-xs ml-1">×</span>}
              >
                Filtrado por:{" "}
                {tiposCarbon.find(
                  (t) => String(t.id_tipo_carbon) === idTipoCarbon,
                )?.nombre || idTipoCarbon}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="gray" fw={600}>
            Total:{" "}
            <span className="text-teal-400 font-bold">
              {formatTN(stockTotalGeneral)}
            </span>
          </Text>
        </div>

        {loadingStocks ? (
          <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                height={60}
                width={220}
                radius="xl"
                className="shrink-0"
              />
            ))}
          </div>
        ) : (
          <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
            {stockPorTipo.map((item) => {
              const isSelected = idTipoCarbon === String(item.id_tipo_carbon);
              const hasSingleItem = item.stockItemUnico !== null;
              const logs = item.stockItemUnico?.cambios_log ?? [];

              return (
                <Paper
                  key={item.id_tipo_carbon}
                  onClick={() => {
                    setIdTipoCarbon((prev) =>
                      prev === String(item.id_tipo_carbon)
                        ? null
                        : String(item.id_tipo_carbon),
                    );
                  }}
                  className={cn(
                    "group relative cursor-pointer transition-all duration-200 select-none rounded-xl px-3 py-2 border shrink-0 min-w-44 flex-1 max-w-64",
                    isSelected
                      ? "bg-teal-950/30 border-teal-500/60 shadow-lg shadow-teal-950/40 ring-1 ring-teal-500/40"
                      : "bg-zinc-900/50 border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900/80",
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors",
                          isSelected
                            ? "bg-teal-500/20 border-teal-500/30 text-teal-400"
                            : "bg-zinc-800/80 border-zinc-700/60 text-zinc-400 group-hover:text-zinc-200",
                        )}
                      >
                        <ScaleIcon className="w-3.5 h-3.5" />
                      </div>
                      <Text
                        size="xs"
                        fw={700}
                        className={cn(
                          "truncate transition-colors",
                          isSelected
                            ? "text-teal-200"
                            : "text-zinc-200 group-hover:text-white",
                        )}
                        title={item.nombre}
                      >
                        {item.nombre}
                      </Text>
                    </div>
                    {item.codigo && (
                      <Badge
                        size="xs"
                        variant={isSelected ? "filled" : "light"}
                        color={isSelected ? "teal" : "indigo"}
                        radius="sm"
                      >
                        {item.codigo}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <div className="flex items-baseline gap-1.5">
                      <Text
                        size="sm"
                        fw={800}
                        className={
                          item.stockTotal > 0
                            ? "text-teal-400 font-mono tracking-tight"
                            : "text-zinc-500 font-mono"
                        }
                      >
                        {formatTN(item.stockTotal)}
                      </Text>
                      {item.matchingStocks.length > 1 && !idAlmacen && (
                        <Text size="9px" c="dimmed" fw={500}>
                          ({item.matchingStocks.length} alm.)
                        </Text>
                      )}
                    </div>

                    {/* Acciones de Ajuste / Historial */}
                    <div
                      className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasSingleItem && logs.length > 0 && (
                        <Tooltip
                          label={`Ver historial (${logs.length} ajustes)`}
                          withArrow
                        >
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            radius="md"
                            onClick={() =>
                              setHistorialStockModal({
                                titulo: `${item.stockItemUnico?.almacen_nombre} · ${item.nombre}`,
                                logs,
                              })
                            }
                          >
                            <ClockIcon className="w-3.5 h-3.5" />
                          </ActionIcon>
                        </Tooltip>
                      )}

                      {hasSingleItem && (
                        <Tooltip label="Ajustar stock manualmente" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="teal"
                            size="sm"
                            radius="md"
                            onClick={() => setStockToEdit(item.stockItemUnico)}
                          >
                            <ScaleIcon className="w-3.5 h-3.5" />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </Paper>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. DataTable con el historial de registros de tamizajes */}
      <Paper className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <DataTableEstandar
          records={tamizajesFiltrados}
          columns={tamizajeColumns}
          idAccessor="id_tamizaje_carbon"
          loading={loadingTamizajes}
          noRecordsText="No se encontraron operaciones de tamizaje registradas."
        />
      </Paper>

      {/* Modal Ajustar Stock */}
      {stockToEdit && (
        <ModalAjustarStock
          opened={Boolean(stockToEdit)}
          onClose={() => setStockToEdit(null)}
          stockItem={stockToEdit}
          onGuardado={recargarTodo}
        />
      )}

      {/* Modal Registrar Tamizaje */}
      <ModalRegistrarTamizaje
        opened={openNuevoTamizaje}
        onClose={() => setOpenNuevoTamizaje(false)}
        onGuardado={(nuevoTamizaje) => {
          setTamizajes((prev) => [nuevoTamizaje, ...prev]);
          cargarStocks();
        }}
      />

      {/* Modal Historial de Ajustes */}
      {historialStockModal && (
        <Modal
          opened={Boolean(historialStockModal)}
          onClose={() => setHistorialStockModal(null)}
          title={
            <Text fw={700} size="sm" className="text-white">
              Historial de Ajustes · {historialStockModal.titulo}
            </Text>
          }
          centered
          size="lg"
          classNames={{
            content: "bg-zinc-950 border border-zinc-800",
            header: "bg-zinc-950 border-b border-zinc-800 text-white",
          }}
        >
          <Stack gap="xs">
            {historialStockModal.logs.map((log, i) => (
              <Paper
                key={i}
                className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-lg"
              >
                <Group justify="space-between" mb={4}>
                  <Text size="xs" fw={600} className="text-indigo-400">
                    {formatDateTime(log.fecha_hora)}
                  </Text>
                  <Text size="xs" className="text-zinc-400">
                    Por: {log.empleado}
                  </Text>
                </Group>
                <Group gap="sm" mb={4}>
                  <Text size="xs" c="dimmed">
                    Stock anterior: {formatTN(log.stock_anterior)}
                  </Text>
                  <Text size="xs" fw={700} className="text-white">
                    → Nuevo stock: {formatTN(log.stock_nuevo)}
                  </Text>
                </Group>
                {log.motivo && (
                  <Text size="xs" className="italic text-zinc-300">
                    Motivo: {log.motivo}
                  </Text>
                )}
              </Paper>
            ))}
          </Stack>
        </Modal>
      )}

      {/* Modal Ver Evidencias */}
      {evidenciasModal && (
        <Modal
          opened={Boolean(evidenciasModal)}
          onClose={() => setEvidenciasModal(null)}
          title={
            <Text fw={700} size="sm" className="text-white">
              Evidencias / Adjuntos · {evidenciasModal.titulo}
            </Text>
          }
          centered
          size="lg"
          classNames={{
            content: "bg-zinc-950 border border-zinc-800",
            header: "bg-zinc-950 border-b border-zinc-800 text-white",
          }}
        >
          <Stack gap="sm">
            {evidenciasModal.items.map((ev, i) => (
              <Paper
                key={i}
                className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-lg flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PaperClipIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <Text size="xs" className="text-zinc-200 truncate">
                    {ev.nombre_original || `Adjunto #${i + 1}`}
                  </Text>
                </div>
                {ev.url && (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-teal-400 hover:text-teal-300 hover:underline shrink-0"
                  >
                    Ver archivo ↗
                  </a>
                )}
              </Paper>
            ))}
          </Stack>
        </Modal>
      )}
    </div>
  );
};
