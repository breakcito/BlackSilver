import {
  Badge,
  Text,
  TextInput,
  Select,
  Group,
  Stack,
  Paper,
  SimpleGrid,
  ThemeIcon,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  CircleStackIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import type { DataTableColumn } from "mantine-datatable";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { useNotify } from "../../../hooks/useNotify";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { MESES } from "../../../shared/variables/meses";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { KardexCarbonService } from "../service/kardex-carbon.service";
import type { MovimientoKardexCarbonItem } from "../service/kardex-carbon.responses";
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

const formatPEN = (val: number | null | undefined) =>
  `S/ ${formatNumber(Number(val ?? 0))}`;

export const KardexCarbonPage = () => {
  useTitlePage("Kardex de Carbón");
  const { notifyError } = useNotify();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Filters state
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idTipoCarbon, setIdTipoCarbon] = useState<string | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<string>("TODOS");
  const [mes, setMes] = useState<string | null>(String(currentMonth));
  const [anio, setAnio] = useState<string | null>(String(currentYear));
  const [busqueda, setBusqueda] = useState<string>("");

  // Data state
  const [movimientos, setMovimientos] = useState<MovimientoKardexCarbonItem[]>([]);
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [tiposCarbon, setTiposCarbon] = useState<RES_TipoCarbon[]>([]);
  const [loading, setLoading] = useState(false);

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
        console.error("Error al cargar almacenes o tipos de carbón", err);
      }
    };
    fetchMaestros();
  }, []);

  // Fetch kardex movements
  const cargarMovimientos = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await KardexCarbonService.getMovimientos({
        id_almacen: idAlmacen ? Number(idAlmacen) : undefined,
        id_tipo_carbon: idTipoCarbon ? Number(idTipoCarbon) : undefined,
        mes: mes ? Number(mes) : undefined,
        anio: anio ? Number(anio) : undefined,
        filtros: busqueda.trim() || undefined,
      });
      if (resp.success && resp.data) {
        setMovimientos(resp.data);
      } else {
        setMovimientos([]);
        if (!resp.success) {
          notifyError(resp.message || "Error al listar movimientos de kardex");
        }
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al obtener movimientos del kardex");
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }, [idAlmacen, idTipoCarbon, mes, anio, busqueda, notifyError]);

  useEffect(() => {
    cargarMovimientos();
  }, [cargarMovimientos]);

  // Client-side filtering for movement type if selected
  const movimientosFiltrados = useMemo(() => {
    if (tipoMovimiento === "TODOS") return movimientos;
    return movimientos.filter(
      (m) => m.tipo_movimiento.toLowerCase() === tipoMovimiento.toLowerCase(),
    );
  }, [movimientos, tipoMovimiento]);

  // KPIs
  const stats = useMemo(() => {
    let ingresosTN = 0;
    let salidasTN = 0;
    let totalCostoIngresos = 0;

    for (const m of movimientosFiltrados) {
      const cant = Number(m.cantidad_movimiento) || 0;
      if (m.tipo_movimiento.toLowerCase() === "ingreso") {
        ingresosTN += cant;
        totalCostoIngresos += Number(m.costo_total) || 0;
      } else if (m.tipo_movimiento.toLowerCase() === "salida") {
        salidasTN += cant;
      }
    }

    return {
      ingresosTN,
      salidasTN,
      totalCostoIngresos,
      totalRegistros: movimientosFiltrados.length,
    };
  }, [movimientosFiltrados]);

  // Table Columns
  const columns: DataTableColumn<MovimientoKardexCarbonItem>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 50,
      },
      {
        accessor: "fecha_hora_movimiento",
        title: "Fecha y Hora",
        width: 140,
        render: (r) => (
          <Text size="xs" fw={500} className="text-zinc-300">
            {formatDateTime(r.fecha_hora_movimiento)}
          </Text>
        ),
      },
      {
        accessor: "almacen_nombre",
        title: "Almacén",
        width: 150,
        render: (r) => (
          <Group gap={6} wrap="nowrap">
            <BuildingStorefrontIcon className="w-4 h-4 text-zinc-500 shrink-0" />
            <Text size="xs" fw={600} className="text-white truncate">
              {r.almacen_nombre}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "tipo_carbon_nombre",
        title: "Tipo de Carbón",
        width: 160,
        render: (r) => (
          <Badge variant="light" color="indigo" radius="sm">
            {r.tipo_carbon_nombre}
          </Badge>
        ),
      },
      {
        accessor: "tipo_movimiento",
        title: "Movimiento",
        width: 120,
        textAlign: "center",
        render: (r) => {
          const esIngreso = r.tipo_movimiento.toLowerCase() === "ingreso";
          return (
            <Badge
              variant="filled"
              color={esIngreso ? "teal" : "red"}
              radius="sm"
              leftSection={
                esIngreso ? (
                  <ArrowDownTrayIcon className="w-3 h-3" />
                ) : (
                  <ArrowUpTrayIcon className="w-3 h-3" />
                )
              }
            >
              {r.tipo_movimiento}
            </Badge>
          );
        },
      },
      {
        accessor: "cantidad_movimiento",
        title: "Cantidad",
        width: 110,
        textAlign: "right",
        render: (r) => {
          const esIngreso = r.tipo_movimiento.toLowerCase() === "ingreso";
          return (
            <Text
              size="xs"
              fw={700}
              className={esIngreso ? "text-teal-400" : "text-red-400"}
            >
              {esIngreso ? "+" : "-"}
              {formatTN(r.cantidad_movimiento)}
            </Text>
          );
        },
      },
      {
        accessor: "stock_anterior",
        title: "Stock Ant.",
        width: 105,
        textAlign: "right",
        render: (r) => (
          <Text size="xs" className="text-zinc-400">
            {formatTN(r.stock_anterior)}
          </Text>
        ),
      },
      {
        accessor: "stock_resultante",
        title: "Stock Res.",
        width: 110,
        textAlign: "right",
        render: (r) => (
          <Text size="xs" fw={600} className="text-white">
            {formatTN(r.stock_resultante)}
          </Text>
        ),
      },
      {
        accessor: "costo_total",
        title: "Costo Total",
        width: 120,
        textAlign: "right",
        render: (r) => (
          <Text size="xs" fw={600} className="text-zinc-200">
            {formatPEN(r.costo_total)}
          </Text>
        ),
      },
      {
        accessor: "referencia",
        title: "Referencia / Carga",
        render: (r) => {
          if (!r.id_carga_compra_carbon && !r.compra_correlativo) {
            return <Text size="xs" c="dimmed">—</Text>;
          }
          return (
            <Stack gap={2}>
              {r.compra_correlativo && (
                <Text size="xs" fw={600} className="text-indigo-400">
                  Orden: {r.compra_correlativo}
                </Text>
              )}
              {r.codigo_ticket_balanza && (
                <Group gap={4} wrap="nowrap">
                  <TruckIcon className="w-3.5 h-3.5 text-zinc-500" />
                  <Text size="xs" className="text-zinc-300">
                    Ticket: {r.codigo_ticket_balanza} {r.placa ? `(${r.placa})` : ""}
                  </Text>
                </Group>
              )}
              {r.proveedor_razon_social && (
                <Text size="xs" c="dimmed" truncate>
                  {r.proveedor_razon_social}
                </Text>
              )}
            </Stack>
          );
        },
      },
    ],
    [],
  );

  const almacenesOptions = useMemo(
    () =>
      almacenes.map((a) => ({
        value: String(a.id_almacen),
        label: a.nombre,
      })),
    [almacenes],
  );

  const tiposCarbonOptions = useMemo(
    () =>
      tiposCarbon.map((t) => ({
        value: String(t.id_tipo_carbon),
        label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
      })),
    [tiposCarbon],
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

  return (
    <Stack gap="md" className="p-4 md:p-6">
      {/* Header */}
      <Group justify="space-between" align="center" wrap="wrap">
        <div>
          <Text size="xl" fw={800} className="text-white tracking-tight">
            Kardex de Carbón
          </Text>
          <Text size="xs" c="dimmed">
            Registro cronológico de ingresos y salidas físicas de carbón por almacén.
          </Text>
        </div>
        <BotonRecargar onReload={cargarMovimientos} loading={loading} />
      </Group>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
        <Paper className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Total Ingresos
              </Text>
              <Text size="lg" fw={800} className="text-teal-400 mt-0.5">
                {formatTN(stats.ingresosTN)}
              </Text>
            </div>
            <ThemeIcon color="teal" variant="light" size="lg" radius="xl">
              <ArrowDownTrayIcon className="w-5 h-5" />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Total Salidas
              </Text>
              <Text size="lg" fw={800} className="text-red-400 mt-0.5">
                {formatTN(stats.salidasTN)}
              </Text>
            </div>
            <ThemeIcon color="red" variant="light" size="lg" radius="xl">
              <ArrowUpTrayIcon className="w-5 h-5" />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Valor Ingresos
              </Text>
              <Text size="lg" fw={800} className="text-indigo-400 mt-0.5">
                {formatPEN(stats.totalCostoIngresos)}
              </Text>
            </div>
            <ThemeIcon color="indigo" variant="light" size="lg" radius="xl">
              <CircleStackIcon className="w-5 h-5" />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                Movimientos
              </Text>
              <Text size="lg" fw={800} className="text-white mt-0.5">
                {stats.totalRegistros}
              </Text>
            </div>
            <ThemeIcon color="gray" variant="light" size="lg" radius="xl">
              <CalendarDaysIcon className="w-5 h-5" />
            </ThemeIcon>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Filtros Bar */}
      <Paper className="bg-zinc-900/50 border border-zinc-800 p-3.5 rounded-xl">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 6 }} spacing="xs">
          <Select
            label="Almacén"
            placeholder="Todos los almacenes"
            data={almacenesOptions}
            value={idAlmacen}
            onChange={setIdAlmacen}
            clearable
            searchable
            size="xs"
            radius="md"
          />

          <Select
            label="Tipo de carbón"
            placeholder="Todos los tipos"
            data={tiposCarbonOptions}
            value={idTipoCarbon}
            onChange={setIdTipoCarbon}
            clearable
            searchable
            size="xs"
            radius="md"
          />

          <Select
            label="Tipo movimiento"
            data={[
              { value: "TODOS", label: "Todos" },
              { value: "Ingreso", label: "Solo Ingresos" },
              { value: "Salida", label: "Solo Salidas" },
            ]}
            value={tipoMovimiento}
            onChange={(v) => setTipoMovimiento(v ?? "TODOS")}
            size="xs"
            radius="md"
          />

          <Select
            label="Mes"
            placeholder="Todo el año"
            data={MESES.map((m) => ({ value: String(m.value), label: m.label }))}
            value={mes}
            onChange={setMes}
            clearable
            size="xs"
            radius="md"
          />

          <Select
            label="Año"
            data={aniosOptions}
            value={anio}
            onChange={setAnio}
            clearable
            size="xs"
            radius="md"
          />

          <TextInput
            label="Buscar referencia"
            placeholder="Ticket, placa, orden..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            leftSection={<MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />}
            size="xs"
            radius="md"
          />
        </SimpleGrid>
      </Paper>

      {/* Table */}
      <Paper className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <DataTableEstandar
          records={movimientosFiltrados}
          columns={columns}
          idAccessor="id_kardex_carbon"
          loading={loading}
          noRecordsText="No se encontraron movimientos de kardex de carbón."
        />
      </Paper>
    </Stack>
  );
};
