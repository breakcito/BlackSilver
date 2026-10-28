import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
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
  DocumentIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ScaleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import type { DataTableColumn } from "mantine-datatable";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { useNotify } from "../../../hooks/useNotify";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { colorCalidadCarbon } from "../../../shared/functions/calidad-carbon";
import { cn } from "../../../shared/functions/cn";
import { MESES } from "../../../shared/variables/meses";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import { ModalAjustarStock } from "./modal-ajustar-stock";
import { ModalRegistrarZarandeo } from "./modal-registrar-zarandeo";
import { ModalGastosZarandeo } from "./modal-gastos-zarandeo";
import { ModalEvidenciasZarandeo } from "./modal-evidencias-zarandeo";
import type {
  CargaZarandeoItem,
  StockCarbonItem,
  ZarandeoCarbonItem,
} from "../service/tamizaje-carbon.responses";
import type { RES_CambiosLog } from "../../../service/responses/_generic/cambios-log";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_CalidadCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { IArchivo } from "../../../shared/interfaces/archivo";

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
  useTitlePage("Zarandeo de Carbón");
  const { notifyError } = useNotify();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Filter state
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idTipoCarbon, setIdTipoCarbon] = useState<string | null>(null);
  const [calidad, setCalidad] = useState<string | null>(null);
  const [mes, setMes] = useState<string | null>(String(currentMonth));
  const [anio, setAnio] = useState<string | null>(String(currentYear));
  const [busqueda, setBusqueda] = useState<string>("");
  const [busquedaDebounced] = useDebouncedValue(busqueda, 350);

  // Data
  const [stocks, setStocks] = useState<StockCarbonItem[]>([]);
  const [tamizajes, setTamizajes] = useState<ZarandeoCarbonItem[]>([]);
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [tiposCarbon, setTiposCarbon] = useState<RES_TipoCarbon[]>([]);
  const [calidades, setCalidades] = useState<RES_CalidadCarbon[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingTamizajes, setLoadingTamizajes] = useState(false);

  // Modals state
  const [stockToEdit, setStockToEdit] = useState<StockCarbonItem | null>(null);
  const [openNuevoTamizaje, setOpenNuevoTamizaje] = useState(false);
  const [zarandeoGastos, setZarandeoGastos] =
    useState<ZarandeoCarbonItem | null>(null);
  const [historialStockModal, setHistorialStockModal] = useState<{
    titulo: string;
    logs: RES_CambiosLog[];
  } | null>(null);
  const [evidenciasModal, setEvidenciasModal] = useState<{
    idZarandeoCarbon: number;
    titulo: string;
    evidencias: IArchivo[];
  } | null>(null);
  const [cargasModal, setCargasModal] = useState<{
    titulo: string;
    cargas: CargaZarandeoItem[];
  } | null>(null);

  // Load masters
  useEffect(() => {
    const fetchMaestros = async () => {
      try {
        const [resAlm, resTipos, resCal] = await Promise.all([
          AuxService.get_almacenes({ para_carbon: true }),
          TipoCarbonService.getTipos(),
          TipoCarbonService.getCalidades(),
        ]);
        if (resAlm?.data) setAlmacenes(resAlm.data);
        if (resTipos?.data) setTiposCarbon(resTipos.data);
        if (resCal?.data) setCalidades(resCal.data);
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
        id_tipo_carbon: idTipoCarbon ? Number(idTipoCarbon) : undefined,
        calidad: calidad ?? undefined,
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
  }, [idAlmacen, idTipoCarbon, calidad, notifyError]);

  // Fetch tamizajes
  const cargarTamizajes = useCallback(async () => {
    setLoadingTamizajes(true);
    try {
      const resp = await TamizajeCarbonService.getZarandeos({
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
      notifyError("Error al cargar historial de zarandeos");
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

  const calidadesOptions = useMemo(
    () => calidades.map((c) => ({ value: c.nombre, label: c.nombre })),
    [calidades],
  );

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

  // Table columns for Zarandeos
  const tamizajeColumns: DataTableColumn<ZarandeoCarbonItem>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 50,
      },
      {
        accessor: "fecha_hora_zarandeo",
        title: "Fecha y Hora",
        width: 100,
        textAlign: "center",
        render: (r) => (
          <div className="flex flex-col gap-0 items-center justify-center">
            <Text size="xs" fw={600} className="text-zinc-100">
              {dayjs(r.fecha_hora_zarandeo).format("DD/MM/YYYY")}
            </Text>
            <Text size="xs" c="dimmed" fw={500}>
              {dayjs(r.fecha_hora_zarandeo).format("HH:mm A")}
            </Text>
          </div>
        ),
      },
      {
        accessor: "almacen_nombre",
        title: "Almacén",
        textAlign: "center",
        width: 120,
        render: (r) => (
          <Text size="xs" fw={600}>
            {r.almacen_nombre}
          </Text>
        ),
      },
      {
        accessor: "tipo_carbon_nombre",
        title: "Carbón Procesado",
        width: 120,
        textAlign: "center",
        render: (r) => (
          <Stack gap={6} justify="center" align="center">
            <Badge variant="light" color="indigo" radius="sm">
              {r.tipo_carbon_nombre}
            </Badge>
            {r.tipo_carbon_codigo && (
              <Text size="xs" c="gray" fw={500}>
                ({r.tipo_carbon_codigo})
              </Text>
            )}
          </Stack>
        ),
      },
      {
        accessor: "tipo_carboncito",
        title: "Cantidad",
        width: 120,
        textAlign: "center",
        render: (r) => (
          <Stack gap={6} justify="center" align="center">
            <Text size="sm" fw={700} c={"lime"}>
              {formatTN(r.cantidad_zarandeada)}
            </Text>
            <Badge
              variant="light"
              color={colorCalidadCarbon(r.calidad)}
              radius="xl"
              size="sm"
            >
              {r.calidad ?? "Sin calidad"}
            </Badge>
          </Stack>
        ),
      },
      {
        accessor: "variantes",
        title: "Variantes",
        textAlign: "center",
        width: 200,
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
                  key={v.id_variante_zarandeo_carbon}
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
        accessor: "origen",
        title: "Origen",
        width: 200,
        textAlign: "center",
        render: (r) => {
          if (r.es_rezarandeo) {
            return (
              <Badge variant="light" color="gray" radius="xl" size="sm">
                Rezarandeo (stock)
              </Badge>
            );
          }

          const cargas = r.cargas ?? [];
          if (cargas.length === 0) {
            return (
              <Text size="xs" c="dimmed">
                —
              </Text>
            );
          }

          const visibles = cargas.slice(0, 2);

          return (
            <Group gap={6} justify="center" wrap="nowrap">
              {visibles.map((c, i) => (
                <Tooltip
                  key={c.id_carga_compra_carbon ?? i}
                  label={`OC ${c.compra_correlativo ?? "—"} · ${formatNumber(c.cantidad)} TN · ${formatNumber(c.porcentaje_ceniza)}% ceniza`}
                  withArrow
                >
                  <Badge
                    variant="outline"
                    color="blue"
                    radius="sm"
                    size="sm"
                    className="font-mono"
                  >
                    {c.placa || "—"}
                    {c.codigo_ticket_balanza
                      ? ` · ${c.codigo_ticket_balanza}`
                      : ""}
                  </Badge>
                </Tooltip>
              ))}

              {cargas.length > 1 && (
                <Tooltip
                  label={`Ver las ${cargas.length} cargas de esta producción`}
                  withArrow
                >
                  <ActionIcon
                    variant="light"
                    color="blue"
                    size="md"
                    radius="md"
                    onClick={() =>
                      setCargasModal({
                        titulo: `${r.tipo_carbon_nombre} · ${r.almacen_nombre}`,
                        cargas,
                      })
                    }
                  >
                    <EyeIcon className="w-4 h-4" />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          );
        },
      },
      {
        accessor: "gastos",
        title: "Gastos",
        width: 120,
        textAlign: "center",
        render: (r) => (
          <Group gap={8} justify="center" wrap="nowrap">
            <Stack gap={0} align="end">
              <Text size="sm" c="red" fw={700} className="font-mono">
                S/ {formatNumber(r.gastos_total)}
              </Text>
              <Text size="11px" fw={600} c="gray">
                {r.gastos_cantidad} gasto{r.gastos_cantidad === 1 ? "" : "s"}
              </Text>
            </Stack>
            <Tooltip label="Ver detalle de gastos" withArrow>
              <ActionIcon
                variant="light"
                color="indigo"
                size="md"
                radius="md"
                onClick={() => setZarandeoGastos(r)}
              >
                <EyeIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
      {
        accessor: "evidencias",
        title: "Evidencias",
        width: 160,
        textAlign: "center",
        render: (r) => {
          const total = r.evidencias?.length ?? 0;
          return (
            <Group gap={6} justify="center" wrap="nowrap">
              <Badge
                variant="light"
                color={total > 0 ? "teal" : "gray"}
                radius="md"
                size="sm"
                leftSection={<DocumentIcon className="w-3.5 h-3.5" />}
              >
                {total} archivo(s)
              </Badge>
              <Tooltip label="Ver y gestionar evidencias" withArrow>
                <ActionIcon
                  variant="light"
                  color="teal"
                  size="md"
                  radius="md"
                  onClick={() =>
                    setEvidenciasModal({
                      idZarandeoCarbon: r.id_zarandeo_carbon,
                      titulo: `${r.tipo_carbon_nombre} · ${r.almacen_nombre}`,
                      evidencias: r.evidencias ?? [],
                    })
                  }
                >
                  <EyeIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        },
      },
      {
        accessor: "responsables",
        title: "Responsables",
        width: 180,
        textAlign: "center",
        render: (r) => (
          <Stack gap={1}>
            <div className="text-left">
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
            </div>
          </Stack>
        ),
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

        {/* Calidad */}
        <div className="w-full sm:w-40 md:w-36">
          <Select
            label="Calidad"
            placeholder="Todas"
            data={calidadesOptions}
            value={calidad}
            onChange={setCalidad}
            clearable
            size="xs"
            radius="lg"
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
            placeholder="Carbón, almacén, calidad..."
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

        {/* Acciones: Recargar + Nuevo Zarandeo */}
        <div className="flex items-center gap-2 shrink-0">
          <BotonRecargar
            onReload={recargarTodo}
            loading={loadingTamizajes || loadingStocks}
            tooltip="Recargar datos de stock y zarandeos"
          />
          <Button
            color="teal"
            radius="lg"
            size="xs"
            leftSection={<PlusIcon className="w-4 h-4" />}
            onClick={() => setOpenNuevoTamizaje(true)}
            className="font-semibold shadow-md shadow-teal-950/40"
          >
            Nuevo Zarandeo
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
              c={"gray"}
              className="uppercase tracking-wider"
            >
              Stock de Carbón
            </Text>
            <Divider orientation="vertical" />
            <Text size="xs" c="gray" fw={600}>
              TOTAL:{" "}
              <span className="text-teal-400 font-bold">
                {formatTN(stockTotalGeneral)}
              </span>
            </Text>
          </Group>
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
              // El desglose es por (almacen x calidad): si el tipo tiene stock
              // en mas de un almacen hay que dizer cual es cual.
              const cantidadAlmacenes = new Set(
                item.matchingStocks.map((s) => s.id_almacen),
              ).size;

              return (
                <Paper
                  key={item.id_tipo_carbon}
                  // onClick={() => {
                  //   setIdTipoCarbon((prev) =>
                  //     prev === String(item.id_tipo_carbon)
                  //       ? null
                  //       : String(item.id_tipo_carbon),
                  //   );
                  // }}
                  className={cn(
                    "group relative transition-all duration-200 select-none rounded-xl px-3 py-2 border shrink-0 min-w-52 max-w-72",
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
                      <Tooltip
                        label={`Código: ${item.codigo}`}
                        disabled={!item.codigo}
                        withArrow
                        position="top"
                      >
                        <Text
                          size="xs"
                          fw={700}
                          className={cn(
                            "truncate transition-colors",
                            isSelected
                              ? "text-teal-200"
                              : "text-zinc-200 group-hover:text-white",
                          )}
                        >
                          {item.nombre}
                        </Text>
                      </Tooltip>
                    </div>
                    <div className="flex items-baseline justify-between mt-1 mb-1.5">
                      <Text
                        size="sm"
                        fw={800}
                        className={
                          item.stockTotal > 0
                            ? "text-teal-400 font-mono tracking-tight"
                            : "text-zinc-400 font-mono"
                        }
                      >
                        {formatTN(item.stockTotal)}
                      </Text>
                    </div>
                  </div>

                  {/* Desglose por calidad: el stock se lleva por tipo + calidad */}
                  <div className="space-y-0.5">
                    {item.matchingStocks.length === 0 && (
                      <Text size="11px" c="gray" className="italic">
                        Sin stock registrado
                      </Text>
                    )}
                    {item.matchingStocks.map((s) => {
                      const logs = s.cambios_log ?? [];
                      return (
                        <div
                          key={s.id_stock_carbon}
                          className="flex items-center justify-between gap-1.5 rounded-md hover:bg-zinc-800/60 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Badge
                              size="xs"
                              variant="light"
                              color={colorCalidadCarbon(s.calidad)}
                              radius="sm"
                            >
                              {s.calidad ?? "Sin calidad"}
                            </Badge>
                            {cantidadAlmacenes > 1 && (
                              <Text
                                size="10px"
                                c="dimmed"
                                className="truncate max-w-24"
                              >
                                {s.almacen_nombre}
                              </Text>
                            )}
                            <Text
                              size="xs"
                              fw={600}
                              className="font-mono text-zinc-300"
                            >
                              {formatNumber(s.stock_actual)}
                            </Text>
                          </div>

                          <div className="flex items-center gap-0.5">
                            {logs.length > 0 && (
                              <Tooltip
                                label={`Ver historial (${logs.length} ajuste(s))`}
                                withArrow
                              >
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  radius="md"
                                  onClick={() =>
                                    setHistorialStockModal({
                                      titulo: `${s.almacen_nombre} · ${item.nombre} · ${s.calidad ?? "Sin calidad"}`,
                                      logs,
                                    })
                                  }
                                >
                                  <ClockIcon className="w-3.5 h-3.5" />
                                </ActionIcon>
                              </Tooltip>
                            )}

                            <Tooltip
                              label={`Ajustar stock de ${s.calidad ?? "esta calidad"}`}
                              withArrow
                            >
                              <ActionIcon
                                variant="subtle"
                                color="teal"
                                size="sm"
                                radius="md"
                                onClick={() => setStockToEdit(s)}
                              >
                                <ScaleIcon className="w-3.5 h-3.5" />
                              </ActionIcon>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Paper>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. DataTable con el historial de zarandeos */}
      <Paper className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <DataTableEstandar
          records={tamizajesFiltrados}
          columns={tamizajeColumns}
          idAccessor="id_zarandeo_carbon"
          loading={loadingTamizajes}
          noRecordsText="No se encontraron operaciones de zarandeo registradas."
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

      {/* Modal Registrar Zarandeo */}
      <ModalRegistrarZarandeo
        opened={openNuevoTamizaje}
        onClose={() => setOpenNuevoTamizaje(false)}
        onGuardado={(nuevoTamizaje) => {
          setTamizajes((prev) => [nuevoTamizaje, ...prev]);
          cargarStocks();
          // Se abre el detalle de gastos para cargarlo de inmediato, que es
          // cuando el usuario aun tiene el contexto fresco de la operacion.
          setZarandeoGastos(nuevoTamizaje);
        }}
      />

      {/* Modal Gastos de Producción */}
      {zarandeoGastos && (
        <ModalGastosZarandeo
          opened={Boolean(zarandeoGastos)}
          onClose={() => setZarandeoGastos(null)}
          idZarandeoCarbon={zarandeoGastos.id_zarandeo_carbon}
          tituloZarandeo={`${zarandeoGastos.tipo_carbon_nombre} · ${zarandeoGastos.calidad ?? "Sin calidad"} · ${formatTN(zarandeoGastos.cantidad_zarandeada)} · ${formatDateTime(zarandeoGastos.fecha_hora_zarandeo)}`}
        />
      )}

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
                    {formatDateTime(log.update_at)}
                  </Text>
                  <Text size="xs" className="text-zinc-400">
                    Por: {log.nombre_empleado || `Empleado #${log.id_empleado}`}
                  </Text>
                </Group>

                {log.cambios.map((cambio, j) => (
                  <Group key={j} gap="sm" mb={2}>
                    <Text size="xs" c="dimmed">
                      {cambio.campo ?? cambio.campo_bd}:
                    </Text>
                    <Text size="xs" c="zinc.400">
                      {formatNumber(Number(cambio.valor_anterior))}
                    </Text>
                    <Text size="xs" c="dimmed">
                      →
                    </Text>
                    <Text size="xs" fw={700} className="text-white">
                      {formatNumber(Number(cambio.valor_nuevo))}
                    </Text>
                  </Group>
                ))}

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
        <ModalEvidenciasZarandeo
          opened={Boolean(evidenciasModal)}
          onClose={() => setEvidenciasModal(null)}
          idZarandeoCarbon={evidenciasModal.idZarandeoCarbon}
          titulo={evidenciasModal.titulo}
          evidencias={evidenciasModal.evidencias}
          onUpdated={(nuevas) => {
            setEvidenciasModal((prev) =>
              prev ? { ...prev, evidencias: nuevas } : prev,
            );
            setTamizajes((prev) =>
              prev.map((t) =>
                t.id_zarandeo_carbon === evidenciasModal.idZarandeoCarbon
                  ? { ...t, evidencias: nuevas }
                  : t,
              ),
            );
          }}
        />
      )}

      {/* Modal Ver Cargas de la producción */}
      {cargasModal && (
        <Modal
          opened={Boolean(cargasModal)}
          onClose={() => setCargasModal(null)}
          title={
            <Text fw={700} size="sm" className="text-white">
              Cargas de la producción · {cargasModal.titulo}
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
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">
                {cargasModal.cargas.length} carga(s) tomadas en este zarandeo
              </Text>
              <Badge color="blue" variant="light" radius="xl">
                {formatTN(
                  cargasModal.cargas.reduce(
                    (acc, c) => acc + (Number(c.cantidad) || 0),
                    0,
                  ),
                )}{" "}
                TN
              </Badge>
            </Group>

            <Table
              highlightOnHover
              withTableBorder={false}
              verticalSpacing="xs"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    Placa
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    Ticket de balanza
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    OC
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    % Ceniza
                  </Table.Th>
                  <Table.Th
                    className="text-zinc-400 text-xs font-semibold"
                    align="right"
                  >
                    TN
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {cargasModal.cargas.map((c, i) => (
                  <Table.Tr key={c.id_carga_compra_carbon ?? i}>
                    <Table.Td>
                      <Text
                        size="xs"
                        fw={600}
                        c="zinc.200"
                        className="font-mono"
                      >
                        {c.placa || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="zinc.300" className="font-mono">
                        {c.codigo_ticket_balanza || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="blue.4">
                        {c.compra_correlativo || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="zinc.300">
                        {formatNumber(c.porcentaje_ceniza)}%
                      </Text>
                    </Table.Td>
                    <Table.Td align="right">
                      <Text size="xs" fw={700} c="zinc.100">
                        {formatNumber(c.cantidad)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Modal>
      )}
    </div>
  );
};
