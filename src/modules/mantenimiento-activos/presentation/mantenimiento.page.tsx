import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Button,
  Stack,
  Text,
  Select,
  Badge,
  Table,
  Group,
  TextInput,
  Alert,
  Paper,
} from "@mantine/core";
import {
  WrenchScrewdriverIcon,
  MapPinIcon,
  CalendarDaysIcon,
  PlusIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { type DataTableColumn, type DataTableSortStatus } from "mantine-datatable";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { useMantenimiento } from "../hooks/_useMantenimiento";
import { RegistroMantenimiento } from "./registro-mantenimiento";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";
import { parseJsonSeguroArray } from "../../../shared/functions/parse-json-seguro";
import dayjs from "dayjs";
import { MESES } from "../../../shared/variables/meses";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import type { RES_MantenimientoFila } from "../service/mantenimiento.responses";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import { ArchivoCard } from "../../../presentation/utils/archivo/archivo-card";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

type Gasto = { concepto: string; costo: number };

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
};

/** Arma "F001-000123" o null si no hay factura. */
const formatFactura = (
  serie: string | null,
  numero: string | null,
): string | null => {
  const s = serie?.trim();
  const n = numero?.trim();
  if (!s && !n) return null;
  if (s && n) return `${s}-${n}`;
  return s || n || null;
};

/** Normaliza un string de evidencia (URL suelta) al contrato IArchivo. */
const toArchivo = (ev: string | IArchivo): IArchivo => {
  if (typeof ev !== "string") {
    return {
      url: ev?.url || "",
      path_relativo: ev?.path_relativo || "",
      nombre_original: ev?.nombre_original || "Archivo",
      extension: ev?.extension || "bin",
    };
  }
  return {
    url: ev,
    path_relativo: ev.replace(/^.*\/storage\//, ""),
    nombre_original: ev.substring(ev.lastIndexOf("/") + 1),
    extension: ev.substring(ev.lastIndexOf(".") + 1) || "bin",
  };
};

export const MantenimientoPage = () => {
  useTitlePage("Mantenimiento de Activos");
  const location = useLocation();
  const redirectActivoId = location.state?.id_activo
    ? Number(location.state.id_activo)
    : null;

  const [isRegistrando, setIsRegistrando] = useState(!!redirectActivoId);
  const [expandedRecordIds, setExpandedRecordIds] = useState<
    (string | number)[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEjecutor, setFiltroEjecutor] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: "fecha_hora_mantenimiento",
    direction: "desc",
  });

  const {
    state: {
      mes,
      setMes,
      yearcito,
      setYearcito,
      idActivoFijo,
      setIdActivoFijo,
      mantenimientos,
      activos,
    },
    status: { loading, loadingActivos, error },
    actions: { fetchMantenimientos },
  } = useMantenimiento();

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const y = currentYear - i;
        return { value: String(y), label: String(y) };
      }),
    [currentYear],
  );

  const activosVisibles = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return activos;
    return getCoincidencias(activos, q, {
      keys: ["producto", "correlativo", "categoria"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [activos, busqueda]);

  // Deriva los costos en el cliente: `costo_total` pasa a ser un accessor real
  // para que mantine-datatable v8 pueda ordenarlo (no soporta accessor de calculo).
  const filas: RES_MantenimientoFila[] = useMemo(
    () =>
      mantenimientos.map((m) => {
        const gastos = parseJsonSeguroArray<Gasto>(m.otros_gastos);
        const otros = gastos.reduce((sum, g) => sum + Number(g.costo || 0), 0);
        const manoObra = Number(m.costo_mano_obra || 0);
        return { ...m, costo_otros_gastos: otros, costo_total: otros + manoObra };
      }),
    [mantenimientos],
  );

  const filasFiltradas = useMemo(() => {
    const porEjecutor = filas.filter((m) => {
      if (!filtroEjecutor) return true;
      const esExterno = !!m.id_proveedor;
      return filtroEjecutor === "externo" ? esExterno : !esExterno;
    });
    const q = busqueda.trim();
    if (!q) return porEjecutor;
    return getCoincidencias(porEjecutor, q, {
      keys: [
        "producto_activo_fijo",
        "correlativo_activo_fijo",
        "codigo_activo_fijo",
        "lugar_trabajo",
        "ejecutor_nombre",
        "personal_externo_nombre",
        "proveedor_razon_social",
        "supervisor_nombre",
        "observacion",
      ],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [filas, busqueda, filtroEjecutor]);

  const columns: DataTableColumn<RES_MantenimientoFila>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 40,
      },
      {
        accessor: "fecha_hora_mantenimiento",
        title: "Fecha / Hora",
        width: 120,
        textAlign: "center",
        render: (record) => (
          <Text size="xs" fw={700} className="font-mono text-zinc-300">
            {dayjs(record.fecha_hora_mantenimiento).format("DD/MM/YYYY HH:mm")}
          </Text>
        ),
      },
      {
        accessor: "producto_activo_fijo",
        title: "Activo Fijo",
        width: 200,
        render: (record) => (
          <Stack gap={1}>
            <Text size="xs" fw={700} className="text-zinc-200">
              {record.producto_activo_fijo}
            </Text>
            <Text size="10px" className="font-mono text-zinc-500">
              {record.correlativo_activo_fijo}{" "}
              {record.codigo_activo_fijo ? `[${record.codigo_activo_fijo}]` : ""}
            </Text>
          </Stack>
        ),
      },
      {
        accessor: "lugar_trabajo",
        title: "Lugar",
        width: 130,
        render: (record) => (
          <Group gap="xs" wrap="nowrap" align="center">
            <MapPinIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <Text size="xs" className="text-zinc-300 truncate">
              {record.lugar_trabajo || "-"}
            </Text>
          </Group>
        ),
      },
      {
        accessor: "ejecutor_nombre",
        title: "Ejecutor",
        width: 190,
        render: (record) => {
          const esExterno = !!record.id_proveedor;
          const nombre = esExterno
            ? record.proveedor_razon_social || "-"
            : record.ejecutor_nombre || "-";
          const detalle = esExterno ? record.personal_externo_nombre : null;
          return (
            <Group gap="xs" wrap="nowrap" align="center">
              <Badge
                color={esExterno ? "orange" : "teal"}
                variant="light"
                size="xs"
                className="font-bold shrink-0"
              >
                {esExterno ? "Ext" : "Int"}
              </Badge>
              <Stack gap={0} className="min-w-0">
                <Text size="xs" fw={600} className="text-zinc-300 truncate">
                  {nombre}
                </Text>
                {detalle && (
                  <Text size="10px" className="text-zinc-500 truncate">
                    {detalle}
                  </Text>
                )}
              </Stack>
            </Group>
          );
        },
      },
      {
        accessor: "supervisor_nombre",
        title: "Supervisor",
        width: 130,
        render: (record) => (
          <Text size="xs" className="text-zinc-400 truncate">
            {record.supervisor_nombre || "-"}
          </Text>
        ),
      },
      {
        accessor: "costo_mano_obra",
        title: "Mano Obra",
        width: 95,
        textAlign: "right",
        render: (record) => (
          <Text size="xs" fw={700} className="font-mono text-zinc-400">
            {record.costo_mano_obra !== null
              ? `S/.${formatNumber(Number(record.costo_mano_obra))}`
              : "-"}
          </Text>
        ),
      },
      {
        accessor: "costo_otros_gastos",
        title: "Otros Gastos",
        width: 150,
        textAlign: "right",
        render: (record) => {
          const gastos = parseJsonSeguroArray<Gasto>(record.otros_gastos);
          return (
            <Stack gap={1} align="end">
              <Text size="xs" fw={700} className="font-mono text-zinc-400">
                {record.costo_otros_gastos > 0
                  ? `S/.${formatNumber(record.costo_otros_gastos)}`
                  : "-"}
              </Text>
              {gastos.length > 0 && (
                <Text
                  size="xs"
                  className="text-zinc-500 truncate max-w-[130px] font-medium"
                  title={gastos.map((g) => `${g.concepto}: ${g.costo}`).join(", ")}
                >
                  {gastos.map((g) => g.concepto).join(", ")}
                </Text>
              )}
            </Stack>
          );
        },
      },
      {
        accessor: "costo_total",
        title: "Costo Total",
        width: 110,
        textAlign: "right",
        render: (record) => (
          <Text size="xs" fw={900} className="font-mono text-emerald-400">
            {record.costo_total > 0
              ? `S/.${formatNumber(record.costo_total)}`
              : "-"}
          </Text>
        ),
      },
      {
        accessor: "acciones",
        title: "Acciones",
        width: 90,
        textAlign: "center",
        render: (record) => {
          const isExpanded = expandedRecordIds.includes(record.id_mantenimiento);
          return (
            <Button
              size="xs"
              variant="subtle"
              color="indigo"
              rightSection={
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              }
              onClick={(e) => {
                e.stopPropagation();
                setExpandedRecordIds((prev) =>
                  isExpanded
                    ? prev.filter((id) => id !== record.id_mantenimiento)
                    : [...prev, record.id_mantenimiento],
                );
              }}
              className="font-bold text-xs h-7 px-2"
            >
              {isExpanded ? "Ocultar" : "Detalles"}
            </Button>
          );
        },
      },
    ],
    [expandedRecordIds],
  );

  const renderDetalle = (record: RES_MantenimientoFila) => {
    const gastos = parseJsonSeguroArray<Gasto>(record.otros_gastos);
    const evids = parseJsonSeguroArray<string | IArchivo>(record.evidencias);
    const factura = formatFactura(record.serie_factura, record.numero_factura);

    const groupedConsumos = (() => {
      const grouped: Record<
        string,
        { producto: string; cantidad: number; unidad: string }
      > = {};
      (record.consumos || []).forEach((c) => {
        const key = `${c.producto}-${c.unidad}`;
        if (!grouped[key]) {
          grouped[key] = {
            producto: c.producto,
            cantidad: 0,
            unidad: c.unidad,
          };
        }
        grouped[key].cantidad += Number(c.cantidad);
      });
      return Object.values(grouped);
    })();

    const subtituloColumna = (children: React.ReactNode) => (
      <Text
        size="xs"
        fw={900}
        className="text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800/40 pb-2"
      >
        {children}
      </Text>
    );

    return (
      <div className="p-5 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 m-3 animate-fade-in text-xs shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Insumos Consumidos */}
          <div className="space-y-3">
            {subtituloColumna(
              <>
                <WrenchScrewdriverIcon className="w-4 h-4 text-indigo-400" />
                Insumos Consumidos ({groupedConsumos.length})
              </>,
            )}
            {groupedConsumos.length === 0 ? (
              <Text size="xs" c="dimmed" className="italic pl-1">
                Sin insumos asociados a este mantenimiento.
              </Text>
            ) : (
              <div className="border border-zinc-800/50 rounded-lg overflow-hidden bg-zinc-950/25">
                <Table
                  variant="unstyled"
                  className="w-full text-zinc-300 text-xs"
                >
                  <thead className="bg-zinc-950 font-bold text-zinc-400 border-b border-zinc-800/50 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left">Insumo</th>
                      <th className="px-3 py-2 text-right w-24">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 bg-zinc-900/10">
                    {groupedConsumos.map((c, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium">{c.producto}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-teal-400">
                          {formatNumber(c.cantidad)} {c.unidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>

          {/* Gastos Adicionales */}
          <div className="space-y-3">
            {subtituloColumna(
              <>
                <BanknotesIcon className="w-4 h-4 text-emerald-400" />
                Gastos Adicionales ({gastos.length})
              </>,
            )}
            {gastos.length === 0 ? (
              <Text size="xs" c="dimmed" className="italic pl-1">
                Sin gastos adicionales.
              </Text>
            ) : (
              <div className="border border-zinc-800/50 rounded-lg overflow-hidden bg-zinc-950/25">
                <Table variant="unstyled" className="w-full text-zinc-300 text-xs">
                  <thead className="bg-zinc-950 font-bold border-b border-zinc-800/50 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-right w-24">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 bg-zinc-900/10">
                    {gastos.map((g, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium">{g.concepto}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-white">
                          S/.{formatNumber(Number(g.costo))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>

          {/* Factura, Diagnostico & Evidencias */}
          <div className="space-y-4">
            {/* Factura */}
            <div className="space-y-2">
              {subtituloColumna(
                <>
                  <DocumentTextIcon className="w-4 h-4 text-zinc-400" />
                  Factura
                </>,
              )}
              {factura ? (
                <div className="bg-zinc-950/30 p-3 rounded-lg border border-zinc-800/30">
                  <Text
                    size="xs"
                    fw={800}
                    className="font-mono text-zinc-200 tracking-wide"
                  >
                    {factura}
                  </Text>
                </div>
              ) : (
                <Text size="xs" c="dimmed" className="italic pl-1">
                  Sin factura asociada.
                </Text>
              )}
            </div>

            {/* Diagnostico */}
            {record.observacion && (
              <div className="space-y-2">
                {subtituloColumna("Observaciones / Diagnóstico")}
                <div className="bg-zinc-950/30 p-3 rounded-lg border border-zinc-800/30">
                  <p className="text-xs text-zinc-300 italic m-0 font-medium leading-relaxed">
                    "{record.observacion}"
                  </p>
                </div>
              </div>
            )}

            {/* Evidencias */}
            <div className="space-y-3">
              {subtituloColumna(`Documentos y Evidencias (${evids.length})`)}
              {evids.length === 0 ? (
                <Text size="xs" c="dimmed" className="italic pl-1">
                  Sin archivos adjuntos.
                </Text>
              ) : (
                <div className="flex flex-col gap-2">
                  {evids.map((ev, idx) => (
                    <ArchivoCard key={idx} archivo={toArchivo(ev)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      {/* Filtros Principales y Buscador */}
      <div className="flex flex-col md:flex-row items-end gap-3 w-full">
        {/* Mes */}
        <div className="w-full md:w-40">
          <Select
            label="Mes"
            placeholder="Mes..."
            data={MESES}
            value={String(mes)}
            onChange={(val) => setMes(Number(val))}
            classNames={inputClasses}
            radius="lg"
            size="xs"
            leftSection={<CalendarDaysIcon className="w-4 h-4 text-zinc-400" />}
          />
        </div>

        {/* Año */}
        <div className="w-full md:w-32">
          <Select
            label="Año"
            placeholder="Año..."
            data={years}
            value={String(yearcito)}
            onChange={(val) => setYearcito(Number(val))}
            classNames={inputClasses}
            radius="lg"
            size="xs"
            leftSection={<CalendarDaysIcon className="w-4 h-4 text-zinc-400" />}
          />
        </div>

        {/* Activo Fijo */}
        <div className="flex-1 min-w-[220px] w-full">
          <Select
            label="Activo Fijo"
            placeholder={
              loadingActivos ? "Cargando activos..." : "Filtrar por activo..."
            }
            data={activosVisibles.map((a) => ({
              value: String(a.id_activo),
              label: `${a.correlativo} - ${a.producto}`,
            }))}
            value={idActivoFijo ? String(idActivoFijo) : null}
            onChange={(val) => setIdActivoFijo(val ? Number(val) : null)}
            searchable
            clearable
            radius="lg"
            size="xs"
            classNames={inputClasses}
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="Sin coincidencias"
            leftSection={
              <WrenchScrewdriverIcon className="w-4 h-4 text-zinc-400" />
            }
          />
        </div>

        {/* Tipo de Ejecutor */}
        <div className="w-full md:w-44">
          <Select
            label="Tipo Ejecutor"
            placeholder="Todos"
            data={[
              { value: "interno", label: "Interno" },
              { value: "externo", label: "Externo" },
            ]}
            value={filtroEjecutor}
            onChange={setFiltroEjecutor}
            clearable
            radius="lg"
            size="xs"
            classNames={inputClasses}
          />
        </div>

        {/* Buscador */}
        <div className="flex-1 min-w-[200px] w-full">
          <TextInput
            label="Buscar"
            placeholder="Activo, lugar, ejecutor, supervisor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            size="xs"
            radius="lg"
            classNames={inputClasses}
            leftSection={
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
            }
          />
        </div>

        {/* Botones */}
        <div className="shrink-0 flex items-center gap-2">
          <BotonRecargar onReload={fetchMantenimientos} loading={loading} />
          <Button
            leftSection={<PlusIcon className="w-5 h-5" />}
            onClick={() => setIsRegistrando(true)}
            radius="lg"
            size="xs"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-6 font-semibold h-[30px] transition-all"
          >
            Registrar Mantenimiento
          </Button>
        </div>
      </div>

      {/* Error de carga */}
      {error && (
        <Alert
          variant="light"
          color="red"
          radius="lg"
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          title="No se pudieron cargar los mantenimientos"
          className="bg-red-500/10 border-red-500/20"
        >
          <Text size="xs" className="text-red-200">
            {error}
          </Text>
        </Alert>
      )}

      {/* Content list */}
      {mantenimientos.length === 0 && !loading ? (
        <Paper
          radius="xl"
          className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 border border-dashed border-zinc-800 backdrop-blur-sm animate-fade-in"
        >
          <WrenchScrewdriverIcon className="size-12 text-zinc-700 mb-4 animate-pulse" />
          <Text
            size="sm"
            fw={800}
            className="text-zinc-400 uppercase tracking-widest"
          >
            Sin mantenimientos registrados
          </Text>
          <Text size="xs" c="dimmed" className="mt-1 max-w-xs text-center">
            No se encontraron mantenimientos para el periodo seleccionado.
            ¡Declare uno nuevo usando el botón superior!
          </Text>
        </Paper>
      ) : filasFiltradas.length === 0 ? (
        <Paper
          radius="xl"
          className="flex flex-col items-center justify-center py-16 bg-zinc-900/20 border border-dashed border-zinc-800 backdrop-blur-sm animate-fade-in"
        >
          <MagnifyingGlassIcon className="size-10 text-zinc-700 mb-3" />
          <Text size="xs" fw={800} className="text-zinc-400 uppercase tracking-widest">
            Sin resultados
          </Text>
          <Text size="xs" c="dimmed" className="mt-1 max-w-xs text-center">
            Ningún mantenimiento coincide con los filtros aplicados.
          </Text>
          <Button
            variant="light"
            color="indigo"
            size="xs"
            radius="lg"
            mt="md"
            onClick={() => {
              setBusqueda("");
              setFiltroEjecutor(null);
              setIdActivoFijo(null);
            }}
          >
            Limpiar filtros
          </Button>
        </Paper>
      ) : (
        <DataTableEstandar
          idAccessor="id_mantenimiento"
          columns={columns}
          records={filasFiltradas}
          loading={loading}
          minHeight={400}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          rowExpansion={{
            expanded: {
              recordIds: expandedRecordIds,
              onRecordIdsChange: setExpandedRecordIds,
            },
            content: ({ record }: { record: RES_MantenimientoFila }) =>
              renderDetalle(record),
          }}
        />
      )}

      {/* Modal de Registro de Mantenimiento */}
      <ModalEstandar
        opened={isRegistrando}
        close={() => setIsRegistrando(false)}
        title="Registrar Mantenimiento"
        size="60rem"
        validateClose
        closeConfirmationTitle="¿Cerrar sin guardar?"
        closeConfirmationMessage="Se perderá todo lo registrado en este mantenimiento."
      >
        <RegistroMantenimiento
          initialActivoId={redirectActivoId}
          activos={activos}
          onSuccess={() => {
            setIsRegistrando(false);
            fetchMantenimientos();
          }}
          onCancel={() => setIsRegistrando(false)}
        />
      </ModalEstandar>
    </div>
  );
};
