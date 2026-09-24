import { useEffect } from "react";
import {
  Group,
  Stack,
  Text,
  NumberInput,
  Select,
  Switch,
  Tooltip,
  TextInput,
  Skeleton,
  Popover,
  ActionIcon,
  Indicator,
  Badge,
  SegmentedControl,
  Center,
  Box,
} from "@mantine/core";

import {
  ChatBubbleBottomCenterTextIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import type {
  DTO_CotizacionRequest,
  DTO_CotizacionDetalle,
  DTO_ProductoComparativo,
} from "../../../service/cotizaciones.requests";
import { TipoDespachoCompra } from "../../../../../shared/enums/_generic/tipo-despacho-compra";
import { Periodo } from "../../../../../shared/enums/_generic/periodo";
import type { RES_Almacen } from "../../../../../service/responses/almacen";
import type { RES_Mina } from "../../../../../service/responses/mina";
import { TipoBien } from "../../../../../shared/enums/_generic/tipo-bien";
import type { LoadingMaestrosState } from "../../../hooks/shared/utils";
import { calcularFactorConversion } from "../../../hooks/shared/utils";
import type { RES_UnidadMedida } from "../../../../../service/responses/unidad-medida";

interface CeldaDetalleProps {
  det?: DTO_CotizacionDetalle;
  prod?: DTO_ProductoComparativo & {
    nombre: string;
    codigo: string;
    id_unidad_medida_base: number;
    unidad_medida_base: string;
    unidad_medida_abreviatura: string;
    tipo_bien?: TipoBien;
  };
  cot?: DTO_CotizacionRequest;
  cotIdx: number;
  unidadesMedida: { value: string; label: string; abreviatura: string }[];
  /**
   * Catálogo completo de unidades de medida CON `conversiones` cargadas.
   * Necesario para auto-calcular el factor de conversión y bloquear el input
   * cuando existe una conversión universal registrada entre la unidad base
   * del producto y la unidad de detalle elegida por el usuario.
   */
  unidadesCompletas?: RES_UnidadMedida[];
  almacenes: RES_Almacen[];
  minas: RES_Mina[];
  onUpdateDetail: <K extends keyof DTO_CotizacionDetalle>(
    cotIndex: number,
    rowIndex: number,
    field: K,
    value: DTO_CotizacionDetalle[K],
  ) => void;
  onToggleNoCotiza: (cotIndex: number, rowIndex: number) => void;
  isSkeleton?: boolean;
  copySource?: {
    cotIndex: number;
    rowIndex: number;
    id_producto: number;
    data: Partial<DTO_CotizacionDetalle>;
  } | null;
  onIniciarCopia?: (
    cotIndex: number,
    rowIndex: number,
    id_producto: number,
  ) => void;
  onCancelarCopia?: () => void;
  isCheapest?: boolean;
  isReadOnlyNoCotiza?: boolean;
  loadingMaestros?: LoadingMaestrosState;
}

const inputStyles = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-600 !font-normal transition-all",
  label: "text-zinc-300 mb-1.5 font-medium text-xs",
  description: "text-zinc-500 text-[10px] italic mt-1 leading-tight",
};

export const CeldaDetalle = ({
  det,
  prod,
  cot,
  cotIdx,
  unidadesMedida,
  unidadesCompletas,
  almacenes,
  minas,
  onUpdateDetail,
  onToggleNoCotiza,
  isSkeleton = false,
  rowIndex,
  copySource,
  onIniciarCopia,
  onCancelarCopia,
  isCheapest,
  isReadOnlyNoCotiza = false,
  loadingMaestros,
}: CeldaDetalleProps & { rowIndex: number }) => {
  const PERIODO_OPTIONS = [
    { value: Periodo.Diario, label: "Día(s)" },
    { value: Periodo.Semanal, label: "Semana(s)" },
    { value: Periodo.Mensual, label: "Mes(es)" },
    { value: Periodo.Anual, label: "Año(s)" },
  ];

  if (isSkeleton) {
    return (
      <Stack gap={8} className="w-full pt-4">
        <Group grow align="flex-end" gap="xs">
          <Skeleton h={50} radius="lg" animate={false} className="opacity-20" />
          <Skeleton h={50} radius="lg" animate={false} className="opacity-20" />
        </Group>
        <Group grow align="flex-end" gap="xs">
          <Skeleton h={50} radius="lg" animate={false} className="opacity-20" />
          <Skeleton h={50} radius="lg" animate={false} className="opacity-20" />
        </Group>
        <Group grow wrap="nowrap" gap="xs" className="mt-0">
          <Skeleton h={40} radius="md" animate={false} className="opacity-20" />
          <Skeleton h={40} radius="md" animate={false} className="opacity-20" />
          <Skeleton h={40} radius="md" animate={false} className="opacity-20" />
        </Group>
      </Stack>
    );
  }

  if (!det || !prod || !cot) return null;

  const currentUnit = unidadesMedida.find(
    (u) => u.value === String(det.id_unidad_medida),
  );
  const abrev = currentUnit?.abreviatura || "---";
  const baseAbrev = prod.unidad_medida_abreviatura || "UND";
  const esRecojo = det.tipo_despacho === TipoDespachoCompra.Recojo;

  /**
   * Factor de conversión auto-completado desde la tabla de conversiones.
   * Si es `null`, significa que las unidades difieren y no hay conversión
   * registrada: el usuario debe tipear el factor manualmente.
   */
  const factorConversion = unidadesCompletas
    ? calcularFactorConversion(prod, det.id_unidad_medida, unidadesCompletas)
    : null;

  /**
   * El input de factor (contenido_por_presentacion) debe estar bloqueado
   * cuando el sistema ya conoce el factor: ya sea porque las unidades son
   * idénticas (factor = 1) o porque existe una conversión universal
   * registrada. En esos casos no debe permitirse al usuario manipular el
   * factor a mano. Cuando NO existe conversión, el usuario tipea.
   */
  const factorBloqueado = factorConversion !== null;

  /**
   * Auto-completar `contenido_por_presentacion` cuando el catálogo de
   * unidades (con conversiones) termina de cargar y existe un factor
   * conocido para la unidad de detalle seleccionada.
   *
   * Solo aplica si el contenido sigue en el valor por defecto (1) — así
   * respetamos cualquier factor tipeado manualmente por el usuario para
   * una unidad sin conversión registrada.
   *
   * Cubre el race condition entre la carga del catálogo de unidades y la
   * selección de unidad por parte del usuario: si el handler
   * `updateCotizacionDetail` se ejecutó antes de que llegaran las
   * conversiones, el contenido quedó en 1; este effect lo corrige en
   * cuanto las conversiones están disponibles.
   *
   * `onUpdateDetail` se omite intencionalmente de las deps para evitar
   * re-ejecuciones por cambios de referencia cuando solo cambia contenido.
   */
  useEffect(() => {
    if (!unidadesCompletas || !prod || !det) return;
    if (det.no_cotiza) return;
    if (det.contenido_por_presentacion !== 1) return;
    if (factorConversion === null || factorConversion === 1) return;

    onUpdateDetail(
      cotIdx,
      rowIndex,
      "contenido_por_presentacion",
      factorConversion,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadesCompletas, det?.id_unidad_medida]);

  const isCopyingThis =
    copySource?.cotIndex === cotIdx && copySource?.rowIndex === rowIndex;
  const canPasteHere =
    copySource && copySource.id_producto === prod.id_producto && !isCopyingThis;

  return (
    <Stack gap={8} className="w-full pt-4 relative group/celda">
      {/* Botón de Copiar Inteligente / Indicador de Pegar */}
      <div className="absolute top-1.5 left-2 z-20">
        {!det.no_cotiza && (
          <>
            {isCopyingThis ? (
              <Tooltip label="Cancelar copia">
                <ActionIcon
                  variant="filled"
                  color="indigo"
                  size="xs"
                  radius="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelarCopia?.();
                  }}
                  className="shadow-sm"
                >
                  <NoSymbolIcon className="w-3.5 h-3.5" />
                </ActionIcon>
              </Tooltip>
            ) : canPasteHere ? (
              <>
                <style>
                  {`
                    @keyframes subtlePulse {
                      0% { opacity: 1; transform: scale(1); }
                      50% { opacity: 0.85; transform: scale(0.98); }
                      100% { opacity: 1; transform: scale(1); }
                    }
                  `}
                </style>
                <Badge
                  color="indigo"
                  variant="filled"
                  size="xs"
                  h={20}
                  radius="sm"
                  style={{ animation: "subtlePulse 2s infinite ease-in-out" }}
                  className="shadow-lg shadow-indigo-500/40 border border-indigo-400/30"
                  styles={{
                    label: {
                      fontSize: "9px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    },
                  }}
                >
                  Pegar aquí
                </Badge>
              </>
            ) : !copySource ? (
              <Tooltip label="Copiar datos">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onIniciarCopia?.(cotIdx, rowIndex, prod.id_producto);
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md shadow-sm opacity-0 group-hover/celda:opacity-100 transition-opacity"
                >
                  <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </button>
              </Tooltip>
            ) : null}
          </>
        )}
      </div>

      {/* Switch de Inhabilitación (Ubicación Original) */}
      {!isReadOnlyNoCotiza && (
        <div className="absolute top-1.5 right-2 z-20 ">
          <Tooltip
            label={
              det.no_cotiza
                ? "Cotizar este producto"
                : "No cotizar este producto"
            }
            position="left"
          >
            <Group gap={6} align="center">
              <Switch
                size="xs"
                color="red"
                checked={!det.no_cotiza}
                onChange={() => onToggleNoCotiza(cotIdx, rowIndex)}
                className="cursor-pointer"
              />
            </Group>
          </Tooltip>
        </div>
      )}

      {/* Campos editables */}
      <Stack
        gap="sm"
        className={`w-full pt-6 transition-all duration-300 ${
          det.no_cotiza && !isReadOnlyNoCotiza
            ? "opacity-20 pointer-events-none grayscale blur-[0.5px]"
            : ""
        }`}
      >
        {/* Fila 1: Unidad y Cantidad */}
        <Group grow align="flex-end" gap="xs">
          <Select
            label="Und. de Medida"
            placeholder={
              loadingMaestros?.unidades ? "Cargando..." : "Seleccione unidad..."
            }
            disabled={loadingMaestros?.unidades}
            data={unidadesMedida}
            value={String(det.id_unidad_medida)}
            onChange={(val) =>
              onUpdateDetail(cotIdx, rowIndex, "id_unidad_medida", Number(val))
            }
            size="xs"
            radius="lg"
            classNames={inputStyles}
            searchable
            withAsterisk
            comboboxProps={{ withinPortal: true, zIndex: 9999 }}
          />
          <NumberInput
            label={`Cantidad de ${abrev}`}
            value={det.cantidad}
            onChange={(val) =>
              onUpdateDetail(cotIdx, rowIndex, "cantidad", Number(val))
            }
            min={0}
            size="xs"
            radius="lg"
            withAsterisk
            classNames={inputStyles}
          />
        </Group>

        {/* Fila 2: Factor y Precio */}
        <Group grow align="flex-end" gap="xs">
          <NumberInput
            label={`${baseAbrev} x ${abrev}`}
            value={det.contenido_por_presentacion}
            onChange={(val) =>
              onUpdateDetail(
                cotIdx,
                rowIndex,
                "contenido_por_presentacion",
                Number(val),
              )
            }
            disabled={factorBloqueado}
            // description={
            //   factorBloqueado
            //     ? factorConversion === 1
            //       ? "Misma unidad que la base"
            //       : "Conversión registrada"
            //     : undefined
            // }
            min={1}
            size="xs"
            radius="lg"
            classNames={inputStyles}
            withAsterisk
          />
          <NumberInput
            label={`Precio x ${abrev}`}
            value={det.precio_unitario ?? ""}
            onChange={(val) =>
              onUpdateDetail(
                cotIdx,
                rowIndex,
                "precio_unitario",
                val === "" ? undefined : Number(val),
              )
            }
            min={0}
            size="xs"
            radius="lg"
            classNames={inputStyles}
            placeholder="0.00"
            decimalScale={2}
            rightSection={
              isCheapest ? (
                <Badge
                  color="orange.6"
                  variant="filled"
                  size="xs"
                  className="mr-1 animate-pulse shadow-md font-black uppercase tracking-tighter"
                >
                  MEJOR
                </Badge>
              ) : null
            }
            rightSectionWidth={isCheapest ? 60 : 0}
          />
        </Group>

        {/* Totales y Botones de Popover */}
        <Group
          justify="space-between"
          align="center"
          className="mt-1"
          wrap="nowrap"
        >
          {/* Tarjetas de Resultados Financieros */}
          <Group grow wrap="nowrap" gap="xs" className="flex-1 overflow-hidden">
            <Stack
              gap={0}
              px="xs"
              py={4}
              className="bg-cyan-600 rounded-lg shadow-sm border border-cyan-400/20 min-w-0"
            >
              <Text
                size="9px"
                fw={800}
                className="text-white uppercase truncate opacity-90"
              >
                Total {baseAbrev}
              </Text>
              <Text size="xs" fw={800} className="text-white truncate">
                {det.cantidad * det.contenido_por_presentacion} {baseAbrev}
              </Text>
            </Stack>

            <Stack
              gap={0}
              px="xs"
              py={4}
              className="bg-teal-600 rounded-lg shadow-sm border border-teal-400/20 min-w-0"
            >
              <Text
                size="9px"
                fw={800}
                className="text-white uppercase truncate opacity-90"
              >
                Precio x {baseAbrev}
              </Text>
              <Text size="xs" fw={800} className="text-white truncate">
                {cot.moneda === "Soles" ? "S/. " : "$ "}
                {formatNumber(det.precio_unitario_base || 0)}
              </Text>
            </Stack>

            <Stack
              gap={0}
              px="xs"
              py={4}
              className="bg-emerald-700 rounded-lg shadow-md border border-emerald-500/20 min-w-0"
            >
              <Text
                size="9px"
                fw={800}
                className="text-white uppercase truncate opacity-90"
              >
                Subtotal
              </Text>
              <Text size="xs" fw={800} className="text-white truncate">
                {cot.moneda === "Soles" ? "S/. " : "$ "}
                {formatNumber(det.cantidad * (det.precio_unitario || 0))}
              </Text>
            </Stack>
          </Group>

          <Group gap="xs" className="flex-none">
            {/* Popover de Logística */}
            <Popover width={320} position="bottom" withArrow shadow="md">
              <Popover.Target>
                <Tooltip
                  label="Configurar (Almacén, Despacho, Entrega)"
                  withArrow
                >
                  <Indicator
                    color="red"
                    size={8}
                    offset={2}
                    zIndex={10}
                    disabled={!esRecojo && det.tiempo_entrega === 0}
                  >
                    <ActionIcon
                      variant="light"
                      color="cyan"
                      radius="md"
                      size="md"
                      className="border border-cyan-500/20"
                    >
                      <TruckIcon className="w-4 h-4" />
                    </ActionIcon>
                  </Indicator>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown className="bg-zinc-950 border-zinc-800 shadow-2xl p-4">
                <Stack gap="sm">
                  <Text size="sm" fw={800} className="text-white mb-1">
                    Despacho
                  </Text>

                  {prod.tipo_bien === TipoBien.ActivoFijo && (
                    <Stack gap={4}>
                      <Text
                        size="10px"
                        fw={700}
                        className="text-zinc-400 uppercase tracking-widest"
                      >
                        Tipo de Destino
                      </Text>
                      <SegmentedControl
                        size="xs"
                        radius="md"
                        fullWidth
                        value={
                          det.id_mina_destino !== null ? "mina" : "almacen"
                        }
                        onChange={(val) => {
                          if (val === "almacen") {
                            onUpdateDetail(
                              cotIdx,
                              rowIndex,
                              "id_mina_destino",
                              null,
                            );
                            if (det.id_almacen_recepcionista === null) {
                              onUpdateDetail(
                                cotIdx,
                                rowIndex,
                                "id_almacen_recepcionista",
                                0,
                              );
                            }
                          } else {
                            onUpdateDetail(
                              cotIdx,
                              rowIndex,
                              "id_almacen_recepcionista",
                              null,
                            );
                            if (det.id_mina_destino === null) {
                              onUpdateDetail(
                                cotIdx,
                                rowIndex,
                                "id_mina_destino",
                                0,
                              );
                            }
                          }
                        }}
                        data={[
                          {
                            label: (
                              <Center style={{ gap: 6 }}>
                                <BuildingStorefrontIcon className="w-3.5 h-3.5" />
                                <Box>Almacén</Box>
                              </Center>
                            ),
                            value: "almacen",
                          },
                          {
                            label: (
                              <Center style={{ gap: 6 }}>
                                <MapPinIcon className="w-3.5 h-3.5" />
                                <Box>Mina</Box>
                              </Center>
                            ),
                            value: "mina",
                          },
                        ]}
                        classNames={{
                          root: "bg-zinc-900 border border-zinc-800",
                          control: "border-none",
                          indicator: "bg-cyan-600",
                          label:
                            "text-zinc-400 data-[active]:text-white font-bold",
                        }}
                      />
                    </Stack>
                  )}

                  {det.id_mina_destino === null ? (
                    <Select
                      label="Almacén de Recepción"
                      placeholder={
                        loadingMaestros?.almacenes
                          ? "Cargando almacenes..."
                          : "Seleccione almacén..."
                      }
                      withAsterisk
                      disabled={loadingMaestros?.almacenes}
                      leftSection={
                        <BuildingStorefrontIcon className="w-4 h-4 text-zinc-500" />
                      }
                      data={almacenes.map((a) => ({
                        value: String(a.id_almacen),
                        label: a.es_principal ? `${a.nombre} ★` : a.nombre,
                      }))}
                      value={
                        det.id_almacen_recepcionista === 0 ||
                        !det.id_almacen_recepcionista
                          ? null
                          : String(det.id_almacen_recepcionista)
                      }
                      onChange={(val) => {
                        onUpdateDetail(
                          cotIdx,
                          rowIndex,
                          "id_almacen_recepcionista",
                          Number(val),
                        );
                        // Asegurar que mina sea null
                        onUpdateDetail(
                          cotIdx,
                          rowIndex,
                          "id_mina_destino",
                          null,
                        );
                      }}
                      size="xs"
                      radius="lg"
                      classNames={inputStyles}
                      searchable
                      comboboxProps={{ withinPortal: false }}
                    />
                  ) : (
                    <Select
                      label="Mina de Destino"
                      placeholder={
                        loadingMaestros?.minas
                          ? "Cargando minas..."
                          : "Seleccione mina..."
                      }
                      withAsterisk
                      disabled={loadingMaestros?.minas}
                      leftSection={
                        <MapPinIcon className="w-4 h-4 text-zinc-500" />
                      }
                      data={minas.map((m) => ({
                        value: String(m.id_mina),
                        label: m.nombre,
                      }))}
                      value={
                        det.id_mina_destino === 0 || !det.id_mina_destino
                          ? null
                          : String(det.id_mina_destino)
                      }
                      onChange={(val) => {
                        onUpdateDetail(
                          cotIdx,
                          rowIndex,
                          "id_mina_destino",
                          Number(val),
                        );
                        // Asegurar que almacen sea null
                        onUpdateDetail(
                          cotIdx,
                          rowIndex,
                          "id_almacen_recepcionista",
                          null,
                        );
                      }}
                      size="xs"
                      radius="lg"
                      classNames={inputStyles}
                      searchable
                      comboboxProps={{ withinPortal: false }}
                    />
                  )}

                  <Select
                    label="Tipo de Despacho"
                    withAsterisk
                    leftSection={
                      <TruckIcon className="w-4 h-4 text-zinc-500" />
                    }
                    data={[
                      { value: TipoDespachoCompra.Envio, label: "Envío" },
                      { value: TipoDespachoCompra.Recojo, label: "Recojo" },
                    ]}
                    value={det.tipo_despacho}
                    onChange={(val) =>
                      onUpdateDetail(
                        cotIdx,
                        rowIndex,
                        "tipo_despacho",
                        val as TipoDespachoCompra,
                      )
                    }
                    size="xs"
                    radius="lg"
                    classNames={inputStyles}
                    comboboxProps={{ withinPortal: false }}
                  />
                  <div>
                    <Group gap={4} wrap="nowrap" mb={6}>
                      <ClockIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <Text
                        size="xs"
                        fw={700}
                        className="text-zinc-300 tracking-wider"
                      >
                        Entrega
                      </Text>
                    </Group>
                    <Group grow gap="xs">
                      <NumberInput
                        value={det.tiempo_entrega}
                        onChange={(val) =>
                          onUpdateDetail(
                            cotIdx,
                            rowIndex,
                            "tiempo_entrega",
                            Number(val),
                          )
                        }
                        min={1}
                        size="xs"
                        radius="lg"
                        classNames={inputStyles}
                      />
                      <Select
                        data={PERIODO_OPTIONS}
                        value={det.tiempo_entrega_periodo}
                        onChange={(val) =>
                          onUpdateDetail(
                            cotIdx,
                            rowIndex,
                            "tiempo_entrega_periodo",
                            val as Periodo,
                          )
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputStyles}
                        comboboxProps={{ withinPortal: false }}
                      />
                    </Group>
                  </div>

                  {esRecojo && (
                    <TextInput
                      label="Lugar de Recojo"
                      placeholder="Dirección, local, etc..."
                      withAsterisk
                      leftSection={
                        <MapPinIcon className="w-4 h-4 text-zinc-500" />
                      }
                      value={det.lugar_recojo || ""}
                      onChange={(e) =>
                        onUpdateDetail(
                          cotIdx,
                          rowIndex,
                          "lugar_recojo",
                          e.currentTarget.value,
                        )
                      }
                      size="xs"
                      radius="lg"
                      classNames={inputStyles}
                    />
                  )}

                  {det.tiempo_entrega_dias > 0 && (
                    <div className="mt-2 flex justify-center">
                      <Badge
                        variant="light"
                        color="cyan"
                        size="xs"
                        radius="sm"
                        className="font-bold border border-cyan-500/20"
                      >
                        ≈ {det.tiempo_entrega_dias} día
                        {det.tiempo_entrega_dias !== 1 ? "s" : ""} estimados
                      </Badge>
                    </div>
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>

            {/* Popover de Comentario */}
            <Popover width={300} position="bottom" withArrow shadow="md">
              <Popover.Target>
                <Tooltip label="Comentario (Opcional)" withArrow>
                  <Indicator
                    color="yellow"
                    size={8}
                    offset={2}
                    zIndex={10}
                    disabled={!det.comentario}
                  >
                    <ActionIcon
                      variant="light"
                      color="gray"
                      radius="md"
                      size="md"
                      className="border border-zinc-500/20"
                    >
                      <ChatBubbleBottomCenterTextIcon
                        className={`w-4 h-4 ${det.comentario ? "text-yellow-500" : "text-zinc-400"}`}
                      />
                    </ActionIcon>
                  </Indicator>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown className="bg-zinc-950 border-zinc-800 shadow-2xl p-4">
                <TextInput
                  label="Comentario del Producto"
                  placeholder="Marca, color, especificaciones..."
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                  value={det.comentario || ""}
                  onChange={(e) =>
                    onUpdateDetail(
                      cotIdx,
                      rowIndex,
                      "comentario",
                      e.currentTarget.value,
                    )
                  }
                  leftSection={
                    <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-zinc-500" />
                  }
                />
              </Popover.Dropdown>
            </Popover>
          </Group>
        </Group>
      </Stack>
    </Stack>
  );
};
