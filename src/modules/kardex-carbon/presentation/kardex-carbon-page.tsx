import {
  Badge,
  Text,
  TextInput,
  Select,
  Group,
  Paper,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
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
  const [movimientos, setMovimientos] = useState<MovimientoKardexCarbonItem[]>(
    [],
  );
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
        textAlign: "center",
        render: (r) => (
          <Text size="xs" fw={500} className="text-zinc-300">
            {formatDateTime(r.fecha_hora_movimiento)}
          </Text>
        ),
      },
      {
        accessor: "almacen_nombre",
        title: "Almacén",
        width: 280,
        textAlign: "center",
        render: (r) => (
          <Group gap={6} justify="center">
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
        width: 140,
        textAlign: "center",
        render: (r) => (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <Text size="xs" fw={800}>
              {r.tipo_carbon_nombre}
            </Text>
            <Badge variant="light" color="cyan" radius="sm">
              {r.tipo_carbon_codigo}
            </Badge>
          </div>
        ),
      },
      {
        accessor: "tipo_movimiento",
        title: "Movimiento",
        width: 150,
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
        accessor: "stock_anterior",
        title: "Stock Anterior",
        width: 130,
        textAlign: "center",
        render: (r) => (
          <Text size="xs" className="text-zinc-400">
            {formatTN(r.stock_anterior)}
          </Text>
        ),
      },
      {
        accessor: "cantidad_movimiento",
        title: "Cantidad",
        width: 130,
        textAlign: "center",
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
        accessor: "stock_resultante",
        title: "Stock Res.",
        width: 130,
        textAlign: "center",
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
        textAlign: "center",
        render: (r) => (
          <Text size="xs" fw={800} c={"lime"}>
            {formatPEN(r.costo_total)}
          </Text>
        ),
      },
      {
        accessor: "referencia",
        title: "Referencia / Carga",
        textAlign: "center",
        width: 200,
        render: (r) => {
          if (!r.id_carga_compra_carbon && !r.compra_correlativo) {
            return (
              <Text size="xs" c="dimmed">
                —
              </Text>
            );
          }
          return (
            <div className="flex justify-center items-center">
              <div className="flex flex-col justify-center items-start gap-1.5">
                {r.compra_correlativo && (
                  <Text size="xs" fw={600} c={"blue"}>
                    OC: {r.compra_correlativo}
                  </Text>
                )}
                {r.proveedor_razon_social && (
                  <Text size="xs" c="gray" fw={600}>
                    Prov: {r.proveedor_razon_social}
                  </Text>
                )}
                {r.codigo_ticket_balanza && (
                  <Text size="xs" fw={600}>
                    Ticket: {r.codigo_ticket_balanza}{" "}
                    {r.placa ? `(${r.placa})` : ""}
                  </Text>
                )}
              </div>
            </div>
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

  const estilitos = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
    label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
    dropdown: "bg-zinc-900 border-zinc-800",
    option: "text-zinc-300 hover:bg-zinc-800",
  };
  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      {/* Filtros Bar */}
      <div className="flex flex-col md:flex-row items-end gap-3 w-full">
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
          classNames={estilitos}
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
          classNames={estilitos}
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
          classNames={estilitos}
        />

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
          radius="md"
          classNames={estilitos}
        />

        <Select
          label="Año"
          data={aniosOptions}
          value={anio}
          onChange={setAnio}
          clearable
          size="xs"
          radius="md"
          classNames={estilitos}
        />

        <TextInput
          label="Buscar referencia"
          placeholder="Ticket, placa, orden..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.currentTarget.value)}
          leftSection={
            <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
          }
          size="xs"
          radius="md"
          classNames={estilitos}
        />
        <BotonRecargar onReload={cargarMovimientos} loading={loading} />
      </div>

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
    </div>
  );
};
