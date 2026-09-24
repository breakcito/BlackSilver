import { useState, useMemo, useEffect } from "react";
import {
  Group,
  Stack,
  Text,
  NumberInput,
  Select,
  TextInput,
  Popover,
  Tooltip,
  Button,
  ActionIcon,
  Indicator,
  Badge,
  SegmentedControl,
  Center,
  Box,
  Checkbox,
} from "@mantine/core";
import {
  TruckIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  MapPinIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import type { DataTableColumn } from "mantine-datatable";

import type {
  DTO_CotizacionRequest,
  DTO_ProductoComparativo,
  DTO_CotizacionDetalle,
} from "../../../service/cotizaciones.requests";
import type { RES_Almacen } from "../../../../../service/responses/almacen";
import type { RES_Mina } from "../../../../../service/responses/mina";
import type { RES_Proveedor } from "../../../../../service/responses/proveedor";
import { TipoDespachoCompra } from "../../../../../shared/enums/_generic/tipo-despacho-compra";
import { Periodo } from "../../../../../shared/enums/_generic/periodo";
import { TipoBien } from "../../../../../shared/enums/_generic/tipo-bien";
import { useNotify } from "../../../../../hooks/useNotify";
import { MONEDAS } from "../../../../../shared/variables/monedas";
import { enPlural } from "../../../../../shared/functions/en-plural";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import { DataTableEstandar } from "../../../../../presentation/utils/datatable-estandar";
import {
  calcularFactorConversion,
  type LoadingMaestrosState,
} from "../../../hooks/shared/utils";
import type { RES_UnidadMedida } from "../../../../../service/responses/unidad-medida";

interface EdicionCotizacionDetalleProps {
  productos: (
    | (DTO_ProductoComparativo & {
        nombre: string;
        id_unidad_medida_base: number;
        unidad_medida_base: string;
        unidad_medida_abreviatura: string;
        tipo_bien?: TipoBien;
      })
    | null
  )[];
  cotizacion: DTO_CotizacionRequest;
  unidadesMedida: { value: string; label: string; abreviatura: string }[];
  /**
   * Catálogo completo de unidades de medida CON `conversiones` cargadas.
   * Necesario para auto-calcular el factor de conversión y bloquear el input
   * cuando existe una conversión universal registrada entre la unidad base
   * del producto y la unidad de detalle elegida por el usuario.
   */
  unidadesCompletas: RES_UnidadMedida[];
  almacenes: RES_Almacen[];
  minas: RES_Mina[];
  proveedores: RES_Proveedor[];
  loadingMaestros?: LoadingMaestrosState;
  onUpdateDetail: <K extends keyof DTO_CotizacionDetalle>(
    cotIndex: number,
    rowIndex: number,
    field: K,
    value: DTO_CotizacionDetalle[K],
  ) => void;
  onToggleNoCotiza: (cotIndex: number, rowIndex: number) => void;
  onUpdateGlobalLogistica?: (
    cotIndex: number,
    data: {
      id_almacen_recepcionista: number | null;
      id_mina_destino?: number | null;
      tipo_despacho: TipoDespachoCompra;
      lugar_recojo?: string;
      tiempo_entrega: number;
      tiempo_entrega_periodo: Periodo;
    },
  ) => void;
}

const inputStyles = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-600 !font-normal transition-all",
  label: "text-zinc-300 mb-1.5 font-medium text-xs",
  description: "text-zinc-500 text-[10px] italic mt-1 leading-tight",
};

interface CotizacionDetalleRecord {
  id_producto: number;
  pIdx: number;
  prod: NonNullable<
    DTO_ProductoComparativo & {
      nombre: string;
      id_unidad_medida_base: number;
      unidad_medida_base: string;
      unidad_medida_abreviatura: string;
      tipo_bien?: TipoBien;
    }
  >;
  det: DTO_CotizacionDetalle;
}

interface FactorConversionInputProps {
  det: DTO_CotizacionDetalle;
  prod: CotizacionDetalleRecord["prod"];
  unidadesCompletas: RES_UnidadMedida[];
  pIdx: number;
  baseAbrev: string;
  unidadBrev: string;
  onUpdateDetail: <K extends keyof DTO_CotizacionDetalle>(
    cotIndex: number,
    rowIndex: number,
    field: K,
    value: DTO_CotizacionDetalle[K],
  ) => void;
}

const FactorConversionInput = ({
  det,
  prod,
  unidadesCompletas,
  pIdx,
  baseAbrev,
  unidadBrev,
  onUpdateDetail,
}: FactorConversionInputProps) => {
  const factorConversion = unidadesCompletas
    ? calcularFactorConversion(prod, det.id_unidad_medida, unidadesCompletas)
    : null;
  const factorBloqueado = factorConversion !== null;

  /**
   * Auto-completar `contenido_por_presentacion` cuando las conversiones
   * terminan de cargar. Solo aplica si el contenido está en el default
   * (1) y el factor difiere, para respetar valores tipeados manualmente
   * por el usuario en una unidad sin conversión registrada.
   *
   * Cubre el race condition entre la carga de unidades y la selección de
   * unidad por parte del usuario. Si el handler del padre ejecutó el
   * cambio de unidad antes de que las conversiones llegaran, este effect
   * aplica el factor conocido en cuanto están disponibles.
   */
  useEffect(() => {
    if (!unidadesCompletas) return;
    if (det.no_cotiza) return;
    if (det.contenido_por_presentacion !== 1) return;
    if (factorConversion === null || factorConversion === 1) return;

    onUpdateDetail(0, pIdx, "contenido_por_presentacion", factorConversion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadesCompletas, det.id_unidad_medida]);

  return (
    <NumberInput
      value={det.contenido_por_presentacion}
      onChange={(val) =>
        onUpdateDetail(0, pIdx, "contenido_por_presentacion", Number(val))
      }
      min={1}
      disabled={det.no_cotiza || factorBloqueado}
      size="xs"
      radius="lg"
      classNames={inputStyles}
      hideControls
      rightSection={
        <Text
          size="10px"
          fw={700}
          className="text-zinc-500 mr-2 uppercase font-mono"
        >
          {baseAbrev} <span className="lowercase">x</span> {unidadBrev}
        </Text>
      }
      rightSectionWidth={65}
    />
  );
};

export const EdicionCotizacionDetalle = ({
  productos,
  cotizacion,
  unidadesMedida,
  unidadesCompletas,
  almacenes,
  minas,
  proveedores,
  loadingMaestros,
  onUpdateDetail,
  onToggleNoCotiza,
  onUpdateGlobalLogistica,
}: EdicionCotizacionDetalleProps) => {
  const { notify } = useNotify();
  const [globalLogisticaOpened, setGlobalLogisticaOpened] = useState(false);

  // Estados locales para Configuración Logística Global
  const [globalAlmacen, setGlobalAlmacen] = useState<string | null>(null);
  const [globalMina, setGlobalMina] = useState<string | null>(null);
  const [globalDestinoTipo, setGlobalDestinoTipo] = useState<
    "almacen" | "mina"
  >("almacen");
  const [globalLugarRecojo, setGlobalLugarRecojo] = useState<string>("");
  const [globalDespacho, setGlobalDespacho] = useState<TipoDespachoCompra>(
    TipoDespachoCompra.Envio,
  );
  const [globalTiempo, setGlobalTiempo] = useState<number>(1);
  const [globalPeriodo, setGlobalPeriodo] = useState<Periodo>(Periodo.Semanal);

  const PERIODO_OPTIONS = [
    { value: Periodo.Diario, label: "Día(s)" },
    { value: Periodo.Semanal, label: "Semana(s)" },
    { value: Periodo.Mensual, label: "Mes(es)" },
    { value: Periodo.Anual, label: "Año(s)" },
  ];

  const hasActivosFijos = useMemo(
    () => productos.some((p) => p?.tipo_bien === TipoBien.ActivoFijo),
    [productos],
  );

  const handleApplyGlobalLogistica = () => {
    if (!onUpdateGlobalLogistica) return;
    if (globalDestinoTipo === "almacen" && !globalAlmacen) return;
    if (globalDestinoTipo === "mina" && !globalMina) return;

    onUpdateGlobalLogistica(0, {
      id_almacen_recepcionista:
        globalDestinoTipo === "almacen" ? Number(globalAlmacen) : null,
      id_mina_destino: globalDestinoTipo === "mina" ? Number(globalMina) : null,
      tipo_despacho: globalDespacho,
      lugar_recojo:
        globalDespacho === TipoDespachoCompra.Recojo
          ? globalLugarRecojo
          : undefined,
      tiempo_entrega: globalTiempo,
      tiempo_entrega_periodo: globalPeriodo,
    });
    setGlobalLogisticaOpened(false);
    notify({
      type: "success",
      content: "Configuración logística aplicada a todos los productos.",
    });
  };

  // Combinación de productos y detalles en registros unificados
  const records = useMemo(() => {
    return productos
      .map((prod, pIdx) => {
        const det = cotizacion.detalles[pIdx];
        if (!prod || !det) return null;
        return {
          id_producto: prod.id_producto,
          pIdx,
          prod,
          det,
        };
      })
      .filter(Boolean) as CotizacionDetalleRecord[];
  }, [productos, cotizacion.detalles]);

  // Configuración de las columnas para DataTableEstandar
  const columns: DataTableColumn<CotizacionDetalleRecord>[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
    },
    {
      accessor: "producto",
      title: "Producto",
      render: (record) => {
        const { prod, det, pIdx } = record;
        return (
          <Group gap="xs" wrap="nowrap" align="center">
            <Checkbox
              size="xs"
              color="red"
              checked={!det.no_cotiza}
              onChange={() => onToggleNoCotiza(0, pIdx)}
              classNames={{ label: "cursor-pointer" }}
              className="flex-none"
            />
            <Text
              size="xs"
              fw={700}
              className={`truncate max-w-60 ${det.no_cotiza ? "text-zinc-500 line-through" : "text-zinc-200"}`}
            >
              {prod.nombre}
            </Text>
          </Group>
        );
      },
    },
    {
      accessor: "unidad_medida",
      title: "Unidad Medida",
      textAlign: "center",
      width: 150,
      render: (record) => {
        const { det, pIdx } = record;
        return (
          <Select
            placeholder={
              loadingMaestros?.unidades ? "Cargando..." : "Seleccione..."
            }
            disabled={det.no_cotiza || loadingMaestros?.unidades}
            data={unidadesMedida}
            value={String(det.id_unidad_medida)}
            onChange={(val) =>
              onUpdateDetail(0, pIdx, "id_unidad_medida", Number(val))
            }
            size="xs"
            radius="lg"
            classNames={inputStyles}
            searchable
            comboboxProps={{ withinPortal: true, zIndex: 10001 }}
          />
        );
      },
    },
    {
      accessor: "cantidad",
      title: "Cantidad",
      textAlign: "center",
      width: 150,
      render: (record) => {
        const { prod, det, pIdx } = record;
        const baseAbrev = prod.unidad_medida_abreviatura || "UND";
        const selectedUM = unidadesMedida.find(
          (u) => u.value === String(det.id_unidad_medida),
        );
        const unidadBrev = selectedUM?.abreviatura || baseAbrev;
        const isDifferentUnit =
          det.id_unidad_medida !== prod.id_unidad_medida_base;

        return (
          <Stack gap="xs">
            <NumberInput
              value={det.cantidad}
              onChange={(val) =>
                onUpdateDetail(0, pIdx, "cantidad", Number(val))
              }
              min={0}
              disabled={det.no_cotiza}
              size="xs"
              radius="lg"
              classNames={inputStyles}
              hideControls
              rightSection={
                <Text
                  size="10px"
                  fw={700}
                  className="text-zinc-500 mr-2 uppercase"
                >
                  {unidadBrev}
                </Text>
              }
              rightSectionWidth={40}
            />

            {isDifferentUnit && (
              <FactorConversionInput
                det={det}
                prod={prod}
                unidadesCompletas={unidadesCompletas}
                pIdx={pIdx}
                baseAbrev={baseAbrev}
                unidadBrev={unidadBrev}
                onUpdateDetail={onUpdateDetail}
              />
            )}
          </Stack>
        );
      },
    },
    {
      accessor: "precio_unitario",
      title: "Precio Unit.",
      textAlign: "center",
      width: 130,
      render: (record) => {
        const { det, pIdx } = record;
        return (
          <NumberInput
            placeholder="0.00"
            value={det.precio_unitario ?? ""}
            onChange={(val) =>
              onUpdateDetail(
                0,
                pIdx,
                "precio_unitario",
                val === "" ? undefined : Number(val),
              )
            }
            min={0}
            decimalScale={2}
            disabled={det.no_cotiza}
            size="xs"
            radius="lg"
            classNames={inputStyles}
            hideControls
            leftSection={
              <Text size="10px" fw={700} className="text-zinc-500  uppercase">
                {cotizacion.moneda === MONEDAS.PEN.label ? "S/." : "$"}
              </Text>
            }
            leftSectionWidth={35}
          />
        );
      },
    },
    {
      accessor: "despacho",
      title: "Despacho",
      textAlign: "center",
      render: (record) => {
        const { prod, det, pIdx } = record;
        const esRecojo = det.tipo_despacho === TipoDespachoCompra.Recojo;
        return (
          <div className="flex items-center justify-center">
            <Popover width={320} position="bottom" withArrow shadow="md">
              <Popover.Target>
                <Tooltip label="Configurar Destino y Despacho" withArrow>
                  <Indicator
                    color="red"
                    size={8}
                    offset={2}
                    disabled={
                      det.no_cotiza || (!esRecojo && det.tiempo_entrega === 0)
                    }
                  >
                    <ActionIcon
                      variant="light"
                      color="cyan"
                      radius="md"
                      size="md"
                      disabled={det.no_cotiza}
                      className="border border-cyan-500/20"
                    >
                      <TruckIcon className="w-4 h-4" />
                    </ActionIcon>
                  </Indicator>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown className="bg-zinc-950 border-zinc-800 shadow-2xl p-4 z-10002">
                <Stack gap="sm">
                  <Text
                    size="xs"
                    fw={800}
                    className="text-white uppercase tracking-wider mb-1"
                  >
                    Logística por Ítem
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
                            onUpdateDetail(0, pIdx, "id_mina_destino", null);
                            if (det.id_almacen_recepcionista === null) {
                              onUpdateDetail(
                                0,
                                pIdx,
                                "id_almacen_recepcionista",
                                0,
                              );
                            }
                          } else {
                            onUpdateDetail(
                              0,
                              pIdx,
                              "id_almacen_recepcionista",
                              null,
                            );
                            if (det.id_mina_destino === null) {
                              onUpdateDetail(0, pIdx, "id_mina_destino", 0);
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
                          0,
                          pIdx,
                          "id_almacen_recepcionista",
                          Number(val),
                        );
                        onUpdateDetail(0, pIdx, "id_mina_destino", null);
                      }}
                      size="xs"
                      radius="lg"
                      classNames={inputStyles}
                      searchable
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
                        onUpdateDetail(0, pIdx, "id_mina_destino", Number(val));
                        onUpdateDetail(
                          0,
                          pIdx,
                          "id_almacen_recepcionista",
                          null,
                        );
                      }}
                      size="xs"
                      radius="lg"
                      classNames={inputStyles}
                      searchable
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
                        0,
                        pIdx,
                        "tipo_despacho",
                        val as TipoDespachoCompra,
                      )
                    }
                    size="xs"
                    radius="lg"
                    classNames={inputStyles}
                  />
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
                          0,
                          pIdx,
                          "lugar_recojo",
                          e.currentTarget.value,
                        )
                      }
                      size="xs"
                      radius="lg"
                      classNames={inputStyles}
                    />
                  )}
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
                          onUpdateDetail(0, pIdx, "tiempo_entrega", Number(val))
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
                            0,
                            pIdx,
                            "tiempo_entrega_periodo",
                            val as Periodo,
                          )
                        }
                        size="xs"
                        radius="lg"
                        classNames={inputStyles}
                      />
                    </Group>
                  </div>
                  {det.tiempo_entrega_dias > 0 && (
                    <Badge
                      variant="light"
                      color="cyan"
                      size="xs"
                      radius="sm"
                      className="font-bold border border-cyan-500/20 text-center w-full"
                    >
                      ≈ {det.tiempo_entrega_dias}{" "}
                      {enPlural("día", det.tiempo_entrega_dias)}
                    </Badge>
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </div>
        );
      },
    },
    {
      accessor: "comentario",
      title: "Comentario",
      textAlign: "center",
      render: (record) => {
        const { det, pIdx } = record;
        return (
          <Popover width={300} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Tooltip label="Comentario (Opcional)" withArrow>
                <Indicator
                  color="yellow"
                  size={8}
                  offset={2}
                  disabled={det.no_cotiza || !det.comentario}
                >
                  <ActionIcon
                    variant="light"
                    color="gray"
                    radius="md"
                    size="md"
                    disabled={det.no_cotiza}
                    className="border border-zinc-500/20"
                  >
                    <ChatBubbleBottomCenterTextIcon
                      className={`w-4 h-4 ${det.comentario ? "text-yellow-500" : "text-zinc-400"}`}
                    />
                  </ActionIcon>
                </Indicator>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown className="bg-zinc-950 border-zinc-800 shadow-2xl p-4 z-10002">
              <TextInput
                label="Comentario del Producto"
                placeholder="Marca, color, especificaciones..."
                size="xs"
                radius="lg"
                classNames={inputStyles}
                value={det.comentario || ""}
                onChange={(e) =>
                  onUpdateDetail(0, pIdx, "comentario", e.currentTarget.value)
                }
                leftSection={
                  <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-zinc-500" />
                }
              />
            </Popover.Dropdown>
          </Popover>
        );
      },
    },
    {
      accessor: "subtotal",
      title: "Subtotal",
      textAlign: "center",
      width: 150,
      render: (record) => {
        const { prod, det } = record;
        const baseAbrev = prod.unidad_medida_abreviatura || "UND";
        return (
          <Stack gap={3} align="center">
            <Text size="xs" fw={800} className="font-mono" c="teal.4">
              {cotizacion.moneda === MONEDAS.PEN.label ? "S/." : "$"}
              {formatNumber(det.cantidad * (det.precio_unitario || 0))}
            </Text>
            {det.id_unidad_medida !== prod.id_unidad_medida_base && (
              <Text size="11px" fw={600} className="font-mono text-zinc-500">
                {cotizacion.moneda === MONEDAS.PEN.label ? "S/." : "$"}
                {formatNumber(
                  (det.precio_unitario || 0) /
                    (det.precio_unitario ? det.contenido_por_presentacion : 0),
                )}
                {" x "}
                {baseAbrev}
              </Text>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <Group justify="space-between" align="center" className="px-1">
        <Group gap="xs" align="center">
          <Text
            size="sm"
            fw={800}
            className="text-white tracking-tight uppercase"
          >
            Items de la Cotización
          </Text>
          <Badge
            variant="light"
            color="indigo"
            size="xs"
            radius="sm"
            className="font-bold"
          >
            {productos.length}{" "}
            {productos.length === 1 ? "producto" : "productos"}
          </Badge>
        </Group>

        {/* Botón Logística Global Rápida */}
        <Popover
          width={320}
          position="bottom-end"
          withArrow
          shadow="md"
          opened={globalLogisticaOpened}
          onChange={setGlobalLogisticaOpened}
        >
          <Popover.Target>
            <Button
              variant="light"
              color="cyan"
              size="xs"
              radius="xl"
              leftSection={<TruckIcon className="w-4 h-4" />}
              className="border border-cyan-500/20 shadow-md"
              onClick={() => setGlobalLogisticaOpened((o) => !o)}
            >
              Despacho
            </Button>
          </Popover.Target>
          <Popover.Dropdown className="bg-zinc-950 border-zinc-800 shadow-2xl p-4 z-999">
            <Stack gap="sm">
              <Text
                size="xs"
                fw={800}
                className="text-white uppercase tracking-wider mb-1"
              >
                Afectar a Todos los Ítems
              </Text>
              {hasActivosFijos && (
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
                    value={globalDestinoTipo}
                    onChange={(val) =>
                      setGlobalDestinoTipo(val as "almacen" | "mina")
                    }
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
                      label: "text-zinc-400 data-[active]:text-white font-bold",
                    }}
                  />
                </Stack>
              )}
              {globalDestinoTipo === "almacen" ? (
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
                  value={globalAlmacen}
                  onChange={setGlobalAlmacen}
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                  searchable
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
                  leftSection={<MapPinIcon className="w-4 h-4 text-zinc-500" />}
                  data={minas.map((m) => ({
                    value: String(m.id_mina),
                    label: m.nombre,
                  }))}
                  value={globalMina}
                  onChange={setGlobalMina}
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                  searchable
                />
              )}
              <Select
                label="Tipo de Despacho"
                withAsterisk
                leftSection={<TruckIcon className="w-4 h-4 text-zinc-500" />}
                data={[
                  { value: TipoDespachoCompra.Envio, label: "Envío" },
                  { value: TipoDespachoCompra.Recojo, label: "Recojo" },
                ]}
                value={globalDespacho}
                onChange={(val) => {
                  const newDespacho = val as TipoDespachoCompra;
                  setGlobalDespacho(newDespacho);
                  if (
                    newDespacho === TipoDespachoCompra.Recojo &&
                    cotizacion.id_proveedor
                  ) {
                    const proveedor = proveedores.find(
                      (p) => p.id_proveedor === cotizacion.id_proveedor,
                    );
                    setGlobalLugarRecojo(proveedor?.direccion || "");
                  }
                }}
                size="xs"
                radius="lg"
                classNames={inputStyles}
              />
              {globalDespacho === TipoDespachoCompra.Recojo && (
                <TextInput
                  label="Lugar de Recojo"
                  withAsterisk
                  placeholder="Indique dirección o local..."
                  value={globalLugarRecojo}
                  onChange={(e) => setGlobalLugarRecojo(e.currentTarget.value)}
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                />
              )}
              <div>
                <Group gap={4} wrap="nowrap" mb={6}>
                  <ClockIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <Text
                    size="xs"
                    fw={700}
                    className="text-zinc-300 tracking-wider"
                  >
                    Entrega Estimada
                  </Text>
                </Group>
                <Group grow gap="xs">
                  <NumberInput
                    value={globalTiempo}
                    onChange={(val) => setGlobalTiempo(Number(val))}
                    min={1}
                    size="xs"
                    radius="lg"
                    classNames={inputStyles}
                  />
                  <Select
                    data={PERIODO_OPTIONS}
                    value={globalPeriodo}
                    onChange={(val) => setGlobalPeriodo(val as Periodo)}
                    size="xs"
                    radius="lg"
                    classNames={inputStyles}
                  />
                </Group>
              </div>
              <Button
                fullWidth
                mt="sm"
                variant="gradient"
                gradient={{ from: "cyan.6", to: "cyan.8" }}
                onClick={handleApplyGlobalLogistica}
                disabled={
                  globalDestinoTipo === "almacen" ? !globalAlmacen : !globalMina
                }
                radius="xl"
                size="xs"
                className="font-bold shadow-lg shadow-cyan-900/20"
              >
                Aplicar a todos
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>

      {/* Componente DataTableEstandar Reusable */}
      <DataTableEstandar
        idAccessor="id_producto"
        columns={columns}
        records={records}
        loading={false}
        minHeight={250}
      />
    </div>
  );
};
