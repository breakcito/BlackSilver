import {
  Button,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Badge,
  Checkbox,
  NumberInput,
  Tooltip,
  Paper,
  ActionIcon,
  SimpleGrid,
  Loader,
} from "@mantine/core";
import {
  BuildingOffice2Icon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { useRegistrarPrestamo } from "../hooks/useRegistrarPrestamo";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import { Estado_SolicitudDetalle } from "../../../shared/enums/solicitud-reabastecimiento/solicitud";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { useEffect, useMemo, useState } from "react";
import type {
  RES_Solicitud,
  RES_SolicitudDetalle,
} from "../../../service/responses/solicitudes-reabastecimiento/solicitud";
import type { RES_Prestamo } from "../../../service/responses/prestamos/prestamo";
import type { RES_AlmacenVecino } from "../service/solicitudes-atencion.responses";

interface RegistrarPrestamoAlmacenProps {
  solicitud: RES_Solicitud;
  detalles: RES_SolicitudDetalle[];
  onSuccess: (nuevoPrestamo: RES_Prestamo) => void;
  onCancel: () => void;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  dropdown: "bg-zinc-900 border-zinc-800 shadow-2xl ",
  option: "hover:bg-zinc-800 text-zinc-300 rounded-md my-1",
  label: "text-zinc-300 mb-1.5 font-semibold tracking-tight",
};

const SectionHeader = ({
  icon: Icon,
  title,
  color = "amber",
  rightSection,
}: {
  icon: React.ElementType;
  title: string;
  color?: string;
  rightSection?: React.ReactNode;
}) => {
  const colors: Record<string, { text: string; line: string }> = {
    amber: { text: "text-amber-500", line: "from-amber-500/50" },
    indigo: { text: "text-indigo-500", line: "from-indigo-500/50" },
    emerald: { text: "text-emerald-500", line: "from-emerald-500/50" },
    teal: { text: "text-teal-500", line: "from-teal-500/50" },
  };

  const activeColor = colors[color as keyof typeof colors] || colors.amber;

  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${activeColor.text}`} />
          <Text fw={700} size="sm" c="white" className="tracking-tight uppercase">
            {title}
          </Text>
        </div>
        {rightSection}
      </div>
      <div
        className={`h-0.5 w-full bg-linear-to-r ${activeColor.line} to-transparent rounded-full`}
      />
    </div>
  );
};

export const RegistrarPrestamoAlmacen = ({
  solicitud,
  detalles,
  onSuccess,
  onCancel,
}: RegistrarPrestamoAlmacenProps) => {
  const { state, actions } = useRegistrarPrestamo({
    solicitud,
    detalles,
    onSuccess,
  });
  const {
    submitting,
    idAlmacenPrestamista,
    fechaLimiteDevolucion,
    selectedItemIds,
    cantidades,
    comentarios,
    almacenesAliados,
    loadingAlmacenes,
    loadingStocks,
    stocksAlmacen,
  } = state;
  const {
    setIdAlmacenPrestamista,
    setFechaLimiteDevolucion,
    toggleSelection,
    setCantidad,
    setComentario,
    handleRegistrar,
    cargarStockPrestamista,
  } = actions;

  const [mostrarTodos, setMostrarTodos] = useState(false);

  const almacenesFiltrados = useMemo(() => {
    if (mostrarTodos) return almacenesAliados;
    return almacenesAliados.filter((aliado) => !!aliado.es_vecino);
  }, [almacenesAliados, mostrarTodos]);

  useEffect(() => {
    if (idAlmacenPrestamista) {
      cargarStockPrestamista(parseInt(idAlmacenPrestamista));
    }
  }, [idAlmacenPrestamista, selectedItemIds.length, cargarStockPrestamista]);

  // Cálculo consolidado de cantidades por producto (en unidad base)
  const totalesPedidosBasePorProducto = useMemo(() => {
    const map: Record<number, number> = {};
    selectedItemIds.forEach((id) => {
      const item = detalles.find((d) => d.id_solicitud_detalle === id);
      if (item) {
        const qty = cantidades[id] || 0;
        const baseQty = qty * Number(item.contenido_por_presentacion || 1);
        map[item.id_producto] = (map[item.id_producto] || 0) + baseQty;
      }
    });
    return map;
  }, [cantidades, selectedItemIds, detalles]);

  const hayExcesosStock = selectedItemIds.some((id) => {
    const item = detalles.find((d) => d.id_solicitud_detalle === id);
    if (!item) return false;
    const stockInfo = stocksAlmacen[id];
    const totalStockExBase = stockInfo?.stock_total_base || 0;
    const pedidoTotalBase =
      totalesPedidosBasePorProducto[item.id_producto] || 0;
    return pedidoTotalBase > totalStockExBase;
  });

  return (
    <Stack gap={24} p="md">
      <section>
        <SectionHeader
          icon={ArchiveBoxIcon}
          title="1. Seleccione los ítems a pedir prestados"
          color="amber"
        />
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/20">
          <Table variant="unstyled" className="w-full text-zinc-300">
            <thead className="bg-zinc-900 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-center w-12">Seleccionar</th>
                <th className="px-4 py-2 text-left">Producto</th>
                <th className="px-4 py-2 text-center">Cantidad Solicitada</th>
                <th className="px-4 py-2 text-center">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {detalles
                .filter((item) => {
                  const cantidadPrestadaSol =
                    Number(item.cantidad_prestada_total_base || 0) /
                    Number(item.contenido_por_presentacion || 1);
                  const pendiente =
                    Number(item.cantidad_solicitada) -
                    Number(item.cantidad_entregada || 0) -
                    cantidadPrestadaSol;

                  return (
                    item.estado !== Estado_SolicitudDetalle.Rechazado &&
                    item.estado !== Estado_SolicitudDetalle.Completado &&
                    item.estado !== Estado_SolicitudDetalle.Cerrado &&
                    pendiente > 0
                  );
                })
                .map((item) => {
                  const isSelected = selectedItemIds.includes(
                    item.id_solicitud_detalle,
                  );
                  const cantidadPrestadaSol =
                    Number(item.cantidad_prestada_total_base || 0) /
                    Number(item.contenido_por_presentacion || 1);
                  const pendiente =
                    Number(item.cantidad_solicitada) -
                    Number(item.cantidad_entregada || 0) -
                    cantidadPrestadaSol;

                  return (
                    <tr
                      key={item.id_solicitud_detalle}
                      className={`${isSelected ? "bg-amber-500/5" : "opacity-50"} transition-all`}
                    >
                      <td className="px-4 py-2 text-center">
                        <Checkbox
                          size="xs"
                          checked={isSelected}
                          onChange={() =>
                            toggleSelection(item.id_solicitud_detalle)
                          }
                          color="amber"
                        />
                      </td>
                      <td className="px-4 py-2 font-semibold text-sm">
                        {item.producto}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Stack gap={0} align="center">
                          <Text size="xs" fw={700}>
                            {formatNumber(item.cantidad_solicitada)}{" "}
                            {item.unidad_medida_sol_abv}
                          </Text>
                          <Text size="10px" c="dimmed" className="italic">
                            ({formatNumber(item.cantidad_solicitada_base)}{" "}
                            {item.unidad_medida_base_abv})
                          </Text>
                        </Stack>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Stack gap={2} align="center">
                          <Badge
                            variant="light"
                            color={pendiente > 0 ? "amber" : "gray"}
                            size="sm"
                          >
                            {formatNumber(Math.max(0, pendiente))}{" "}
                            {item.unidad_medida_sol_abv}
                          </Badge>
                          <Text size="10px" c="zinc.5" fw={700}>
                            {formatNumber(
                              Math.max(
                                0,
                                pendiente *
                                  Number(item.contenido_por_presentacion),
                              ),
                            )}{" "}
                            {item.unidad_medida_base_abv}
                          </Text>
                        </Stack>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </Table>
        </div>
      </section>

      {selectedItemIds.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <SectionHeader
            icon={BuildingOffice2Icon}
            title="2. Almacenes con Disponibilidad"
            color="indigo"
            rightSection={
              almacenesAliados.length > 0 && (
                <Tooltip label={mostrarTodos ? "Ver solo vecinos" : "Ver todos los almacenes"}>
                  <ActionIcon
                    variant="light"
                    color="indigo"
                    onClick={() => setMostrarTodos((prev) => !prev)}
                    size="sm"
                    radius="md"
                  >
                    {mostrarTodos ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </ActionIcon>
                </Tooltip>
              )
            }
          />
          {loadingAlmacenes ? (
            <Text size="xs" c="dimmed" fs="italic">
              Buscando almacenes que puedan ayudarte...
            </Text>
          ) : almacenesAliados.length > 0 ? (
            almacenesFiltrados.length > 0 ? (
              <Stack gap="md">
                <div className="flex items-start gap-2 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl mb-1">
                  <InformationCircleIcon className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <Text size="xs" c="indigo.4" className="leading-relaxed">
                    Solo se muestran almacenes que cuentan con disponibilidad para{" "}
                    <b>todos</b> los productos que has seleccionado previamente.
                    Esto asegura que el préstamo se realice de forma íntegra.
                  </Text>
                </div>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
                  {almacenesFiltrados.map((aliado: RES_AlmacenVecino) => {
                    const isPicked =
                      idAlmacenPrestamista === String(aliado.id_almacen);
                    return (
                      <Paper
                        key={aliado.id_almacen}
                        onClick={() =>
                          setIdAlmacenPrestamista((prev) =>
                            prev === String(aliado.id_almacen)
                              ? null
                              : String(aliado.id_almacen),
                          )
                        }
                        p="md"
                        radius="lg"
                        className={`cursor-pointer border-2 transition-all group relative
                          ${
                            isPicked
                              ? "bg-indigo-500/20 border-indigo-400 shadow-md shadow-indigo-500/10"
                              : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                          }
                        `}
                      >
                        <Group
                          justify="space-between"
                          wrap="nowrap"
                          align="center"
                        >
                          <Group
                            gap="sm"
                            wrap="nowrap"
                            className="min-w-0 flex-1"
                          >
                            <div
                              className={`p-2 rounded-xl shrink-0 ${
                                isPicked
                                  ? "bg-indigo-400 text-zinc-950"
                                  : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-200"
                              }`}
                            >
                              <BuildingOffice2Icon className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Text
                                  size="sm"
                                  fw={800}
                                  truncate="end"
                                  className="tracking-tight text-white m-0 flex-1"
                                >
                                  {aliado.nombre}
                                </Text>
                                {!!aliado.es_vecino && (
                                  <Badge size="xs" variant="light" color="teal" radius="sm" className="shrink-0 font-bold">
                                    Vecino
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Group>

                          <Group
                            gap={6}
                            wrap="nowrap"
                            className="shrink-0 flex-none"
                          >
                            <Tooltip label="Ver Lotes" withArrow position="top">
                              <ActionIcon
                                variant="subtle"
                                color="indigo"
                                radius="md"
                                size="md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(
                                    `/lotes?idAlmacen=${aliado.id_almacen}`,
                                    "_blank",
                                  );
                                }}
                                className="hover:bg-indigo-500/20"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </ActionIcon>
                            </Tooltip>
                            {isPicked && (
                              <CheckCircleIcon className="w-6 h-6 text-indigo-400" />
                            )}
                          </Group>
                        </Group>
                      </Paper>
                    );
                  })}
                </SimpleGrid>
              </Stack>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/10">
                <BuildingOffice2Icon className="w-8 h-8 text-zinc-700 mb-2 animate-pulse" />
                <Text size="xs" c="zinc.5" className="text-center font-medium">
                  No hay almacenes vecinos con disponibilidad de todos los productos seleccionados.
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  color="indigo"
                  className="mt-2"
                  onClick={() => setMostrarTodos(true)}
                >
                  Ver otros almacenes disponibles
                </Button>
              </div>
            )
          ) : (
            <Text size="xs" c="red" fw={700}>
              Ningún otro almacén tiene stock de lo solicitado.
            </Text>
          )}
        </section>
      )}

      {idAlmacenPrestamista && selectedItemIds.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <SectionHeader
            icon={ClipboardDocumentListIcon}
            title="3. Configurar Cantidades para el Préstamo"
            color="emerald"
          />
          <CustomDatePicker
            label="Fecha Límite de Devolución"
            value={fechaLimiteDevolucion}
            onChange={(val) => setFechaLimiteDevolucion(val as Date | null)}
            radius="lg"
            minDate={new Date()}
            className="max-w-62.5 mb-4"
            placeholder="Seleccionar fecha"
          />

          <div className="overflow-x-auto rounded-xl border border-zinc-800 shadow-sm bg-zinc-950/10">
            <Table variant="unstyled" className="w-full text-zinc-300">
              <thead className="bg-zinc-900/50 text-zinc-500 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-4 py-3 text-left min-w-60">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-center min-w-30">
                    Cantidad a Pedir
                  </th>
                  <th className="px-4 py-3 text-center min-w-37.5">
                    Stock Disponible
                  </th>
                  <th className="px-4 py-3 text-center font-semibold min-w-75">
                    Comentario
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/40">
                {detalles
                  .filter((d) =>
                    selectedItemIds.includes(d.id_solicitud_detalle),
                  )
                  .map((item) => {
                    const stockInfo = stocksAlmacen[item.id_solicitud_detalle];
                    const totalStockExternoBase =
                      stockInfo?.stock_total_base || 0;
                    const divisor =
                      Number(item.contenido_por_presentacion) || 1;

                    const pedidoTotalBase =
                      totalesPedidosBasePorProducto[item.id_producto] || 0;

                    const cantidadPedida =
                      cantidades[item.id_solicitud_detalle] || 0;

                    const cantidadPrestadaSol =
                      Number(item.cantidad_prestada_total_base || 0) /
                      Number(item.contenido_por_presentacion || 1);
                    const pendienteReal =
                      Number(item.cantidad_solicitada) -
                      Number(item.cantidad_entregada || 0) -
                      cantidadPrestadaSol;

                    // Lógica de Stock Mínimo (advertencia)
                    const stockMinimoBase = Number(
                      stockInfo?.stock_minimo_base || 0,
                    );
                    const stockResultanteBase =
                      totalStockExternoBase - pedidoTotalBase;
                    const stockMinimoEnSol = stockMinimoBase / divisor;

                    const superaStockDisponible =
                      pedidoTotalBase > totalStockExternoBase;
                    const dejaSinStock =
                      pedidoTotalBase === totalStockExternoBase &&
                      totalStockExternoBase > 0;
                    const dejaDebajoDelMinimo =
                      stockResultanteBase < stockMinimoBase &&
                      stockResultanteBase > 0;
                    const superaPendiente = cantidadPedida > pendienteReal;

                    const colorBorde = superaStockDisponible
                      ? "border-red-500 shadow-sm shadow-red-500/20"
                      : dejaSinStock || dejaDebajoDelMinimo
                        ? "border-amber-500 shadow-sm shadow-amber-500/20"
                        : superaPendiente
                          ? "border-orange-500"
                          : "border-emerald-500/30";

                    return (
                      <tr
                        key={item.id_solicitud_detalle}
                        className="hover:bg-white/2 transition-colors"
                      >
                        <td className="px-4 py-3 text-left">
                          <div className="flex items-center justify-between gap-4 py-1">
                            {/* Nombre del Producto + Equivalencia */}
                            <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
                              <Text
                                size="xs"
                                fw={700}
                                c="white"
                                className="tracking-tight truncate"
                              >
                                {item.producto}
                              </Text>
                              {item.unidad_medida_base_abv !==
                                item.unidad_medida_sol_abv && (
                                <Badge
                                  color="pink"
                                  variant="light"
                                  size="xs"
                                  className="px-1.5 font-bold border border-pink-500/20 w-fit"
                                >
                                  1 {item.unidad_medida_sol_abv} ={" "}
                                  {item.contenido_por_presentacion}{" "}
                                  {item.unidad_medida_base_abv}
                                </Badge>
                              )}
                            </div>

                            {/* Solicitado y Pendiente con puntitos sutiles a la derecha */}
                            <div className="flex flex-col justify-center gap-1 text-[11px] shrink-0 border-l border-zinc-800/80 pl-3">
                              <div className="flex items-center gap-1.5 text-zinc-400 font-normal">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/80 inline-block shrink-0" />
                                <span>
                                  solicitado: <b className="text-zinc-200 font-medium">{formatNumber(item.cantidad_solicitada)}</b> {item.unidad_medida_sol_abv}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-zinc-400 font-normal">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 inline-block shrink-0" />
                                <span>
                                  pendiente: <b className="text-zinc-200 font-medium">{formatNumber(Math.max(0, pendienteReal - cantidadPedida))}</b> {item.unidad_medida_sol_abv}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Group
                              gap={4}
                              justify="center"
                              wrap="nowrap"
                              className="w-full"
                            >
                              {/* Entrada Principal (Presentación) */}
                              <div
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border bg-zinc-950/40 transition-all ${colorBorde}`}
                              >
                                <NumberInput
                                  variant="unstyled"
                                  decimalScale={2}
                                  fixedDecimalScale={false}
                                  value={
                                    cantidades[item.id_solicitud_detalle] ?? ""
                                  }
                                  onChange={(val) =>
                                    setCantidad(
                                      item.id_solicitud_detalle,
                                      typeof val === "number" ? val : Number(val) || 0,
                                    )
                                  }
                                  size="xs"
                                  hideControls
                                  placeholder="0"
                                  classNames={{
                                    input: `w-[50px] text-center font-black text-[11px] h-5 bg-transparent 
                                    ${
                                      superaStockDisponible
                                        ? "text-red-400"
                                        : dejaDebajoDelMinimo || dejaSinStock
                                          ? "text-amber-400"
                                          : superaPendiente
                                            ? "text-orange-400"
                                            : "text-emerald-400"
                                    }`,
                                  }}
                                />
                                <Text
                                  size="10px"
                                  fw={800}
                                  className="uppercase whitespace-nowrap text-zinc-400/80 font-mono tracking-tighter"
                                >
                                  {item.unidad_medida_sol_abv}
                                </Text>
                              </div>

                              {/* Entrada Alternativa (Unidad Base) - Sincronizada Bidireccional */}
                              {item.unidad_medida_base_abv !==
                                item.unidad_medida_sol_abv && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800/20 border border-zinc-800/40 hover:border-emerald-500/30 transition-all group/base">
                                  <NumberInput
                                    variant="unstyled"
                                    decimalScale={2}
                                    fixedDecimalScale={false}
                                    value={
                                      cantidades[item.id_solicitud_detalle]
                                        ? Number(
                                            (
                                              cantidades[item.id_solicitud_detalle] *
                                              Number(item.contenido_por_presentacion || 1)
                                            ).toFixed(2)
                                          )
                                        : ""
                                    }
                                    onChange={(val) => {
                                      const baseVal = typeof val === "number" ? val : Number(val) || 0;
                                      const divisor =
                                        Number(
                                          item.contenido_por_presentacion,
                                        ) || 1;
                                      setCantidad(
                                        item.id_solicitud_detalle,
                                        Number((baseVal / divisor).toFixed(4)),
                                      );
                                    }}
                                    size="xs"
                                    hideControls
                                    placeholder="0"
                                    classNames={{
                                      input:
                                        "w-[45px] text-center font-bold text-[10px] h-5 bg-transparent text-zinc-400 group-hover/base:text-emerald-400",
                                    }}
                                  />
                                  <Text
                                    size="9px"
                                    fw={800}
                                    c="zinc.5"
                                    className="uppercase group-hover/base:text-emerald-600/70"
                                  >
                                    {item.unidad_medida_base_abv}
                                  </Text>
                                </div>
                              )}
                            </Group>

                            {/* Contenedor de Alertas dinámicas */}
                            <div className="flex flex-col items-center gap-0.5 mt-0.5">
                              {superaStockDisponible && (
                                <Tooltip
                                  label="No hay suficiente stock en el almacén de origen para cubrir esta cantidad"
                                  withArrow
                                  position="bottom"
                                >
                                  <div className="flex items-center gap-1 text-[9px] text-red-500 font-bold uppercase animate-pulse">
                                    <NoSymbolIcon className="w-3 h-3" />
                                    Excede disponible
                                  </div>
                                </Tooltip>
                              )}

                              {!superaStockDisponible && dejaSinStock && (
                                <Tooltip
                                  label="El almacén de origen se quedará completamente sin existencias de este producto"
                                  withArrow
                                  position="bottom"
                                >
                                  <div className="flex items-center gap-1 text-[9px] text-amber-500 font-bold uppercase animate-pulse">
                                    <ExclamationTriangleIcon className="w-3 h-3" />
                                    Sin stock origen
                                  </div>
                                </Tooltip>
                              )}

                              {!superaStockDisponible &&
                                dejaDebajoDelMinimo && (
                                  <Tooltip
                                    label={`Almacén de origen quedará por debajo de su Stock Mínimo (${formatNumber(stockMinimoEnSol)} ${item.unidad_medida_sol_abv})`}
                                    withArrow
                                    position="bottom"
                                  >
                                    <div className="flex items-center gap-1 text-[9px] text-amber-500 font-bold uppercase animate-pulse">
                                      <InformationCircleIcon className="w-3 h-3" />
                                      Stock crítico origen
                                    </div>
                                  </Tooltip>
                                )}

                              {!superaStockDisponible && superaPendiente && (
                                <Tooltip
                                  label="Esta cantidad excede lo pendiente de la solicitud original"
                                  withArrow
                                  position="bottom"
                                >
                                  <div className="flex items-center gap-1 text-[9px] text-orange-400 font-bold uppercase animate-pulse">
                                    <ExclamationTriangleIcon className="w-3 h-3" />
                                    Exceso detectado
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {loadingStocks ? (
                            <div className="flex justify-center items-center py-1">
                              <Loader size="sm" color="indigo" type="dots" />
                            </div>
                          ) : (
                            <Stack gap={4} align="center">
                              <Badge
                                variant="light"
                                color={
                                  totalStockExternoBase > 0
                                    ? "indigo"
                                    : "red"
                                }
                                size="sm"
                                radius="sm"
                                className="font-bold px-1.5 py-1.5 border border-indigo-500/10"
                              >
                                {formatNumber(totalStockExternoBase / divisor)}{" "}
                                {item.unidad_medida_sol_abv}
                              </Badge>

                              {item.unidad_medida_base_abv !==
                                item.unidad_medida_sol_abv && (
                                <Badge
                                  variant="light"
                                  color="pink"
                                  size="sm"
                                  radius="sm"
                                  className="font-bold px-1.5 py-1.5 border border-pink-500/10 opacity-80"
                                >
                                  {formatNumber(totalStockExternoBase)}{" "}
                                  {item.unidad_medida_base_abv}
                                </Badge>
                              )}
                            </Stack>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <TextInput
                            placeholder="Nota opcional..."
                            size="xs"
                            radius="md"
                            value={comentarios[item.id_solicitud_detalle] || ""}
                            onChange={(e) =>
                              setComentario(
                                item.id_solicitud_detalle,
                                e.target.value,
                              )
                            }
                            classNames={inputClasses}
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </div>
        </section>
      )}

      <Group justify="flex-end" mt="xl">
        <Button
          variant="subtle"
          onClick={onCancel}
          radius="lg"
          className="text-zinc-500 hover:text-white"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleRegistrar}
          loading={submitting}
          disabled={
            !idAlmacenPrestamista ||
            selectedItemIds.length === 0 ||
            hayExcesosStock
          }
          radius="xl"
          size="sm"
          className="bg-zinc-100 text-zinc-900 font-black hover:bg-white px-10 shadow-indigo-500/20 shadow-xl transition-all active:scale-95"
        >
          Registrar Préstamo
        </Button>
      </Group>
    </Stack>
  );
};
