import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ScaleIcon,
  BuildingStorefrontIcon,
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

export const TamizajeCarbonPage = () => {
  useTitlePage("Tamizaje de Carbón");
  const { notifyError } = useNotify();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Active tab: 'stock' | 'tamizajes'
  const [activeTab, setActiveTab] = useState<string | null>("stock");

  // Filter state for Stock tab
  const [idAlmacenStock, setIdAlmacenStock] = useState<string | null>(null);
  const [idTipoCarbonStock, setIdTipoCarbonStock] = useState<string | null>(null);
  const [busquedaStock, setBusquedaStock] = useState("");

  // Filter state for Tamizajes tab
  const [idAlmacenTz, setIdAlmacenTz] = useState<string | null>(null);
  const [mesTz, setMesTz] = useState<string | null>(String(currentMonth));
  const [anioTz, setAnioTz] = useState<string | null>(String(currentYear));
  const [busquedaTz, setBusquedaTz] = useState("");

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
        console.error(err);
      }
    };
    fetchMaestros();
  }, []);

  // Fetch stocks
  const cargarStocks = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const resp = await TamizajeCarbonService.getStocks({
        id_almacen: idAlmacenStock ? Number(idAlmacenStock) : undefined,
        id_tipo_carbon: idTipoCarbonStock ? Number(idTipoCarbonStock) : undefined,
        filtros: busquedaStock.trim() || undefined,
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
  }, [idAlmacenStock, idTipoCarbonStock, busquedaStock, notifyError]);

  // Fetch tamizajes
  const cargarTamizajes = useCallback(async () => {
    setLoadingTamizajes(true);
    try {
      const resp = await TamizajeCarbonService.getTamizajes({
        id_almacen: idAlmacenTz ? Number(idAlmacenTz) : undefined,
        mes: mesTz ? Number(mesTz) : undefined,
        anio: anioTz ? Number(anioTz) : undefined,
        filtros: busquedaTz.trim() || undefined,
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
  }, [idAlmacenTz, mesTz, anioTz, busquedaTz, notifyError]);

  useEffect(() => {
    if (activeTab === "stock") {
      cargarStocks();
    } else {
      cargarTamizajes();
    }
  }, [activeTab, cargarStocks, cargarTamizajes]);

  // Options
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

  // Table columns for Stock
  const stockColumns: DataTableColumn<StockCarbonItem>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 50,
      },
      {
        accessor: "almacen_nombre",
        title: "Almacén",
        width: 200,
        render: (r) => (
          <Group gap={6} wrap="nowrap">
            <BuildingStorefrontIcon className="w-4 h-4 text-zinc-500 shrink-0" />
            <Text size="xs" fw={600} className="text-white">
              {r.almacen_nombre}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "tipo_carbon_nombre",
        title: "Tipo de Carbón",
        width: 220,
        render: (r) => (
          <Badge variant="light" color="indigo" radius="sm">
            {r.tipo_carbon_nombre} {r.tipo_carbon_codigo ? `(${r.tipo_carbon_codigo})` : ""}
          </Badge>
        ),
      },
      {
        accessor: "stock_actual",
        title: "Stock Disponible (TN)",
        width: 180,
        textAlign: "right",
        render: (r) => {
          const val = Number(r.stock_actual) || 0;
          return (
            <Text
              size="sm"
              fw={800}
              className={val > 0 ? "text-teal-400" : "text-zinc-500"}
            >
              {formatTN(val)}
            </Text>
          );
        },
      },
      {
        accessor: "historial",
        title: "Ajustes Manuales",
        width: 140,
        textAlign: "center",
        render: (r) => {
          const logs = Array.isArray(r.cambios_log) ? r.cambios_log : [];
          if (logs.length === 0) {
            return <Text size="xs" c="dimmed">Sin ajustes</Text>;
          }
          return (
            <Tooltip label={`Ver historial (${logs.length} ajustes)`} withArrow>
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                radius="xl"
                onClick={() =>
                  setHistorialStockModal({
                    titulo: `${r.almacen_nombre} · ${r.tipo_carbon_nombre}`,
                    logs,
                  })
                }
              >
                <ClockIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          );
        },
      },
      {
        accessor: "acciones",
        title: "Acciones",
        width: 120,
        textAlign: "center",
        render: (r) => (
          <Tooltip label="Ajustar peso / stock manualmente" withArrow>
            <ActionIcon
              variant="filled"
              color="indigo"
              size="md"
              radius="xl"
              onClick={() => setStockToEdit(r)}
            >
              <ScaleIcon className="w-4 h-4 text-white" />
            </ActionIcon>
          </Tooltip>
        ),
      },
    ],
    [],
  );

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
        title: "Fecha",
        width: 130,
        render: (r) => (
          <Text size="xs" fw={500} className="text-zinc-300">
            {formatDateTime(r.fecha_hora_tamizaje)}
          </Text>
        ),
      },
      {
        accessor: "almacen_nombre",
        title: "Almacén",
        width: 140,
        render: (r) => (
          <Text size="xs" fw={600} className="text-white truncate">
            {r.almacen_nombre}
          </Text>
        ),
      },
      {
        accessor: "tipo_carbon_nombre",
        title: "Carbón Padre (Procesado)",
        width: 190,
        render: (r) => (
          <Stack gap={2}>
            <Badge variant="light" color="indigo" radius="sm">
              {r.tipo_carbon_nombre}
            </Badge>
            <Text size="xs" fw={700} className="text-zinc-300">
              {formatTN(r.cantidad_tamizada)}
            </Text>
          </Stack>
        ),
      },
      {
        accessor: "variantes",
        title: "Variantes Extraídas",
        render: (r) => {
          const vars = r.variantes ?? [];
          if (vars.length === 0) return <Text size="xs" c="dimmed">—</Text>;
          return (
            <Group gap={6} wrap="wrap">
              {vars.map((v) => (
                <Badge
                  key={v.id_variante_tamizaje_carbon}
                  variant="outline"
                  color="teal"
                  radius="sm"
                  size="xs"
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
        title: "Extracción / Rendimiento",
        width: 170,
        textAlign: "right",
        render: (r) => {
          const tamizada = Number(r.cantidad_tamizada) || 0;
          const extraida = Number(r.cantidad_extraida) || 0;
          const merma = Math.max(0, tamizada - extraida);
          const pct =
            tamizada > 0
              ? Math.round((extraida / tamizada) * 100 * 10) / 10
              : 0;

          return (
            <Stack gap={2} align="flex-end">
              <Text size="xs" fw={700} className="text-teal-400">
                Extr: {formatTN(extraida)} ({pct}%)
              </Text>
              <Text size="xs" c="dimmed">
                Merma: {formatTN(merma)}
              </Text>
            </Stack>
          );
        },
      },
      {
        accessor: "es_retamizaje",
        title: "Tipo Proceso",
        width: 120,
        textAlign: "center",
        render: (r) => (
          <Badge
            variant="filled"
            color={r.es_retamizaje ? "orange" : "blue"}
            radius="sm"
            size="xs"
          >
            {r.es_retamizaje ? "Re-tamizaje" : "Normal"}
          </Badge>
        ),
      },
      {
        accessor: "responsables",
        title: "Responsables",
        width: 160,
        render: (r) => (
          <Stack gap={2}>
            <Text size="xs" className="text-zinc-300">
              Reg: {r.empleado_registro}
            </Text>
            {r.empleado_supervisor && (
              <Text size="xs" c="dimmed">
                Sup: {r.empleado_supervisor}
              </Text>
            )}
          </Stack>
        ),
      },
    ],
    [],
  );

  return (
    <Stack gap="md" className="p-4 md:p-6">
      {/* Header */}
      <Group justify="space-between" align="center" wrap="wrap">
        <div>
          <Text size="xl" fw={800} className="text-white tracking-tight">
            Tamizaje y Stock de Carbón
          </Text>
          <Text size="xs" c="dimmed">
            Control de inventario físico y procesamiento de clasificación granulométrica.
          </Text>
        </div>
        <Group gap="xs">
          {activeTab === "tamizajes" && (
            <Button
              color="teal"
              radius="md"
              size="xs"
              leftSection={<PlusIcon className="w-4 h-4" />}
              onClick={() => setOpenNuevoTamizaje(true)}
            >
              Nuevo Tamizaje
            </Button>
          )}
          <BotonRecargar
            onReload={activeTab === "stock" ? cargarStocks : cargarTamizajes}
            loading={activeTab === "stock" ? loadingStocks : loadingTamizajes}
          />
        </Group>
      </Group>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} color="teal">
        <Tabs.List className="border-b border-zinc-800">
          <Tabs.Tab value="stock" leftSection={<ScaleIcon className="w-4 h-4" />}>
            Stock por Almacén
          </Tabs.Tab>
          <Tabs.Tab value="tamizajes" leftSection={<FunnelIcon className="w-4 h-4" />}>
            Historial de Tamizajes
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Stock */}
        <Tabs.Panel value="stock" pt="md">
          <Stack gap="md">
            {/* Filter Bar */}
            <Paper className="bg-zinc-900/50 border border-zinc-800 p-3.5 rounded-xl">
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
                <Select
                  label="Almacén"
                  placeholder="Todos los almacenes"
                  data={almacenesOptions}
                  value={idAlmacenStock}
                  onChange={setIdAlmacenStock}
                  clearable
                  searchable
                  size="xs"
                  radius="md"
                />

                <Select
                  label="Tipo de carbón"
                  placeholder="Todos los tipos"
                  data={tiposCarbonOptions}
                  value={idTipoCarbonStock}
                  onChange={setIdTipoCarbonStock}
                  clearable
                  searchable
                  size="xs"
                  radius="md"
                />

                <TextInput
                  label="Buscar"
                  placeholder="Filtrar por nombre o código..."
                  value={busquedaStock}
                  onChange={(e) => setBusquedaStock(e.currentTarget.value)}
                  leftSection={<MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />}
                  size="xs"
                  radius="md"
                />
              </SimpleGrid>
            </Paper>

            {/* Table */}
            <Paper className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <DataTableEstandar
                records={stocks}
                columns={stockColumns}
                idAccessor="id_stock_carbon"
                loading={loadingStocks}
                noRecordsText="No se encontraron registros de stock de carbón."
              />
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* Tab 2: Tamizajes */}
        <Tabs.Panel value="tamizajes" pt="md">
          <Stack gap="md">
            {/* Filter Bar */}
            <Paper className="bg-zinc-900/50 border border-zinc-800 p-3.5 rounded-xl">
              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xs">
                <Select
                  label="Almacén"
                  placeholder="Todos los almacenes"
                  data={almacenesOptions}
                  value={idAlmacenTz}
                  onChange={setIdAlmacenTz}
                  clearable
                  searchable
                  size="xs"
                  radius="md"
                />

                <Select
                  label="Mes"
                  placeholder="Todo el año"
                  data={MESES.map((m) => ({ value: String(m.value), label: m.label }))}
                  value={mesTz}
                  onChange={setMesTz}
                  clearable
                  size="xs"
                  radius="md"
                />

                <Select
                  label="Año"
                  data={aniosOptions}
                  value={anioTz}
                  onChange={setAnioTz}
                  clearable
                  size="xs"
                  radius="md"
                />

                <TextInput
                  label="Buscar"
                  placeholder="Ticket balanza, tipo, placa..."
                  value={busquedaTz}
                  onChange={(e) => setBusquedaTz(e.currentTarget.value)}
                  leftSection={<MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />}
                  size="xs"
                  radius="md"
                />
              </SimpleGrid>
            </Paper>

            {/* Table */}
            <Paper className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <DataTableEstandar
                records={tamizajes}
                columns={tamizajeColumns}
                idAccessor="id_tamizaje_carbon"
                loading={loadingTamizajes}
                noRecordsText="No se encontraron operaciones de tamizaje registradas."
              />
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modal Ajustar Stock */}
      {stockToEdit && (
        <ModalAjustarStock
          opened={Boolean(stockToEdit)}
          onClose={() => setStockToEdit(null)}
          stockItem={stockToEdit}
          onGuardado={cargarStocks}
        />
      )}

      {/* Modal Registrar Tamizaje */}
      <ModalRegistrarTamizaje
        opened={openNuevoTamizaje}
        onClose={() => setOpenNuevoTamizaje(false)}
        onGuardado={() => {
          cargarTamizajes();
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
    </Stack>
  );
};
