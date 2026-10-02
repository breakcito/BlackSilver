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
} from "@mantine/core";
import {
  WrenchScrewdriverIcon,
  MapPinIcon,
  CalendarDaysIcon,
  PlusIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { type DataTableColumn } from "mantine-datatable";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { useMantenimiento } from "../hooks/_useMantenimiento";
import { RegistroMantenimiento } from "./registro-mantenimiento";
import { formatNumber } from "../../../shared/functions/formatNumber";
import dayjs from "dayjs";
import { MESES } from "../../../shared/variables/meses";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import type { RES_Mantenimiento } from "../service/mantenimiento.responses";
import type { IArchivo } from "../../../shared/interfaces/archivo";
import { ArchivoCard } from "../../../presentation/utils/archivo/archivo-card";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

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
    status: { loading, loadingActivos },
    actions: { fetchMantenimientos },
  } = useMantenimiento();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => {
    const y = currentYear - i;
    return { value: String(y), label: String(y) };
  });

  const inputClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
    dropdown:
      "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
    option:
      "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  };

  const columns: DataTableColumn<RES_Mantenimiento>[] = useMemo(
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
              {record.codigo_activo_fijo
                ? `[${record.codigo_activo_fijo}]`
                : ""}
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
        accessor: "ejecutor",
        title: "Ejecutor",
        width: 180,
        render: (record) => {
          const typeLabel = record.id_proveedor ? "Externo" : "Interno";
          const name =
            record.ejecutor_nombre || record.proveedor_razon_social || "-";
          return (
            <Group gap="xs" wrap="nowrap" align="center">
              <Badge
                color={record.id_proveedor ? "orange" : "teal"}
                variant="light"
                size="xs"
                className="font-bold shrink-0"
              >
                {typeLabel}
              </Badge>
              <Text size="xs" fw={600} className="text-zinc-300 truncate">
                {name}
              </Text>
            </Group>
          );
        },
      },
      {
        accessor: "supervisor",
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
        width: 90,
        textAlign: "right",
        render: (record) => (
          <Text size="xs" fw={700} className="font-mono text-zinc-300">
            {record.costo_mano_obra !== null
              ? `S/.${formatNumber(Number(record.costo_mano_obra))}`
              : "-"}
          </Text>
        ),
      },
      {
        accessor: "otros_gastos",
        title: "Otros Gastos",
        width: 110,
        textAlign: "right",
        render: (record) => {
          const gastos: Array<{ concepto: string; costo: number }> =
            typeof record.otros_gastos === "string"
              ? JSON.parse(record.otros_gastos)
              : Array.isArray(record.otros_gastos)
                ? (record.otros_gastos as Array<{
                    concepto: string;
                    costo: number;
                  }>)
                : [];
          const total = gastos.reduce(
            (sum: number, g) => sum + Number(g.costo || 0),
            0,
          );
          return (
            <Stack gap={1} align="end">
              <Text size="xs" fw={700} className="font-mono text-zinc-300">
                {total > 0 ? `S/.${formatNumber(total)}` : "-"}
              </Text>
              {gastos.length > 0 && (
                <Text
                  size="xs"
                  className="text-zinc-500 truncate max-w-[100px] font-medium"
                  title={gastos
                    .map((g) => `${g.concepto}: $${g.costo}`)
                    .join(", ")}
                >
                  {gastos.map((g) => g.concepto).join(", ")}
                </Text>
              )}
            </Stack>
          );
        },
      },
      {
        accessor: "acciones",
        title: "Acciones",
        width: 90,
        textAlign: "center",
        render: (record) => {
          const isExpanded = expandedRecordIds.includes(
            record.id_mantenimiento,
          );
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
            size="sm"
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
            size="sm"
            leftSection={<CalendarDaysIcon className="w-4 h-4 text-zinc-400" />}
          />
        </div>

        {/* Activo Fijo */}
        <div className="flex-1 min-w-[240px] w-full">
          <Select
            label="Activo Fijo"
            placeholder={
              loadingActivos ? "Cargando activos..." : "Filtrar por activo..."
            }
            data={activos.map((a) => ({
              value: String(a.id_activo),
              label: `${a.correlativo} - ${a.producto}`,
            }))}
            value={idActivoFijo ? String(idActivoFijo) : null}
            onChange={(val) => setIdActivoFijo(val ? Number(val) : null)}
            searchable
            clearable
            radius="lg"
            size="sm"
            classNames={inputClasses}
            leftSection={
              <WrenchScrewdriverIcon className="w-4 h-4 text-zinc-400" />
            }
          />
        </div>

        {/* Botón Registrar */}
        <div className="shrink-0 flex items-center gap-2">
          <BotonRecargar onReload={fetchMantenimientos} loading={loading} />
          <Button
            leftSection={<PlusIcon className="w-5 h-5" />}
            onClick={() => setIsRegistrando(true)}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-6 font-semibold h-[38px] transition-all"
          >
            Registrar Mantenimiento
          </Button>
        </div>
      </div>

      {/* Content list */}
      {loading ? (
        <Stack align="center" gap="md" py={100}>
          <div className="relative">
            <div className="size-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <WrenchScrewdriverIcon className="size-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <Text
            size="xs"
            fw={900}
            className="uppercase tracking-[0.3em] text-zinc-500"
          >
            Buscando Mantenimientos...
          </Text>
        </Stack>
      ) : mantenimientos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-4xl border border-dashed border-zinc-800 backdrop-blur-sm animate-fade-in">
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
        </div>
      ) : (
        <DataTableEstandar
          idAccessor="id_mantenimiento"
          columns={columns}
          records={mantenimientos}
          loading={loading}
          rowExpansion={{
            expanded: {
              recordIds: expandedRecordIds,
              onRecordIdsChange: setExpandedRecordIds,
            },
            content: ({ record }: { record: RES_Mantenimiento }) => {
              const gastos: Array<{ concepto: string; costo: number }> =
                typeof record.otros_gastos === "string"
                  ? JSON.parse(record.otros_gastos)
                  : Array.isArray(record.otros_gastos)
                    ? (record.otros_gastos as Array<{
                        concepto: string;
                        costo: number;
                      }>)
                    : [];
              const evids: (string | IArchivo)[] =
                typeof record.evidencias === "string"
                  ? JSON.parse(record.evidencias)
                  : (record.evidencias as (string | IArchivo)[] | null) || [];

              const groupedConsumos = (() => {
                const grouped: { [key: string]: { producto: string; cantidad: number; unidad: string } } = {};
                (record.consumos || []).forEach((c) => {
                  const key = `${c.producto}-${c.unidad}`;
                  if (!grouped[key]) {
                    grouped[key] = { producto: c.producto, cantidad: 0, unidad: c.unidad };
                  }
                  grouped[key].cantidad += Number(c.cantidad);
                });
                return Object.values(grouped);
              })();

              return (
                <div className="p-5 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 m-3 animate-fade-in text-xs shadow-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Insumos Consumidos */}
                    <div className="space-y-3">
                      <Text
                        size="xs"
                        fw={900}
                        className="text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800/40 pb-2"
                      >
                        <WrenchScrewdriverIcon className="w-4 h-4 text-indigo-400" />
                        Insumos Consumidos ({groupedConsumos.length})
                      </Text>
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
                                <th className="px-3 py-2 text-right w-24">
                                  Cantidad
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900 bg-zinc-900/10">
                              {groupedConsumos.map((c, idx) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-white/5 transition-colors"
                                >
                                  <td className="px-3 py-2 font-medium">
                                    {c.producto}
                                  </td>
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
                      <Text
                        size="xs"
                        fw={900}
                        className="text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800/40 pb-2"
                      >
                        Gastos Adicionales ({gastos.length})
                      </Text>
                      {gastos.length === 0 ? (
                        <Text size="xs" c="dimmed" className="italic pl-1">
                          Sin gastos adicionales.
                        </Text>
                      ) : (
                        <div className="border border-zinc-800/50 rounded-lg overflow-hidden bg-zinc-950/25">
                          <Table
                            variant="unstyled"
                            className="w-full text-zinc-300 text-xs"
                          >
                            <thead className="bg-zinc-950 font-bold border-b border-zinc-800/50 text-[10px] uppercase tracking-wider">
                              <tr>
                                <th className="px-3 py-2 text-left">
                                  Concepto
                                </th>
                                <th className="px-3 py-2 text-right w-24">
                                  Costo
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900 bg-zinc-900/10">
                              {gastos.map((g, idx) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-white/5 transition-colors"
                                >
                                  <td className="px-3 py-2 font-medium">
                                    {g.concepto}
                                  </td>
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

                    {/* Diagnóstico & Evidencias */}
                    <div className="space-y-4">
                      {/* Diagnóstico */}
                      {record.observacion && (
                        <div className="space-y-2">
                          <Text
                            size="xs"
                            fw={900}
                            className="text-zinc-400 uppercase tracking-widest border-b border-zinc-800/40 pb-2"
                          >
                            Observaciones / Diagnóstico
                          </Text>
                          <div className="bg-zinc-950/30 p-3 rounded-lg border border-zinc-800/30">
                            <p className="text-xs text-zinc-300 italic m-0 font-medium leading-relaxed">
                              "{record.observacion}"
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Evidencias */}
                      <div className="space-y-3">
                        <Text
                          size="xs"
                          fw={900}
                          className="text-zinc-400 uppercase tracking-widest border-b border-zinc-800/40 pb-2"
                        >
                          Documentos y Evidencias ({evids.length})
                        </Text>
                        {evids.length === 0 ? (
                          <Text size="xs" c="dimmed" className="italic pl-1">
                            Sin archivos adjuntos.
                          </Text>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {evids.map((ev, idx) => {
                              const url =
                                typeof ev === "string" ? ev : ev?.url || "";
                              const parsedEv: IArchivo =
                                typeof ev === "string"
                                  ? {
                                      url: ev,
                                      path_relativo: ev.replace(
                                        /^.*\/storage\//,
                                        "",
                                      ),
                                      nombre_original: ev.substring(
                                        ev.lastIndexOf("/") + 1,
                                      ),
                                      extension:
                                        ev.substring(
                                          ev.lastIndexOf(".") + 1,
                                        ) || "bin",
                                    }
                                  : {
                                      url: ev?.url || "",
                                      path_relativo: ev?.path_relativo || "",
                                      nombre_original:
                                        ev?.nombre_original ||
                                        (url
                                          ? url.substring(
                                              url.lastIndexOf("/") + 1,
                                            )
                                          : "Archivo"),
                                      extension:
                                        ev?.extension ||
                                        (url
                                          ? url.substring(
                                              url.lastIndexOf(".") + 1,
                                            )
                                          : "bin"),
                                    };
                              return (
                                <ArchivoCard key={idx} archivo={parsedEv} />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            },
          }}
        />
      )}

      {/* Modal de Registro de Mantenimiento */}
      <ModalEstandar
        opened={isRegistrando}
        close={() => setIsRegistrando(false)}
        title="Registrar Mantenimiento"
        size="60rem"
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
