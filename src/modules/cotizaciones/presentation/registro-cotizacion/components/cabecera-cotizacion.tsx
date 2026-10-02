import { useState, useEffect } from "react";
import {
  Group,
  Stack,
  Text,
  NumberInput,
  Select,
  MultiSelect,
  ActionIcon,
  TextInput,
  Checkbox,
  Skeleton,
  Popover,
  Tooltip,
  Button,
  Badge,
  Menu,
  Tabs,
} from "@mantine/core";
import {
  XMarkIcon,
  ClipboardDocumentCheckIcon,
  IdentificationIcon,
  TruckIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { CustomDatePicker } from "../../../../../presentation/utils/date-picker-input";
import { formatNumber } from "../../../../../shared/functions/formatNumber";
import { ModalEstandar } from "../../../../../presentation/utils/modal-estandar";
import { FormProveedor } from "../../../../../presentation/utils/form-proveedor";
import type { DTO_CotizacionRequest } from "../../../service/cotizaciones.requests";
import { MetodoPago } from "../../../../../shared/enums/_generic/metodo-pago";
import { Estado_Cotizacion } from "../../../../../shared/enums/cotizacion/cotizacion";
import type { RES_Almacen } from "../../../../../service/responses/almacen";
import type { RES_Mina } from "../../../../../service/responses/mina";
import { TipoDespachoCompra } from "../../../../../shared/enums/_generic/tipo-despacho-compra";
import { Periodo } from "../../../../../shared/enums/_generic/periodo";
import { useNotify } from "../../../../../hooks/useNotify";
import { MONEDAS } from "../../../../../shared/variables/monedas";
import { Moneda } from "../../../../../shared/enums/_generic/moneda";
import { getDuracionPeriodo } from "../../../../../shared/functions/get-duracion-periodo";
import { enPlural } from "../../../../../shared/functions/en-plural";
import type { RES_Proveedor } from "../../../../../service/responses/proveedor";
import type { CopiedCotizacion } from "../../../hooks/shared/useCotizacionHandlers";
import type { LoadingMaestrosState } from "../../../hooks/shared/utils";

interface CabeceraCotizacionProps {
  cot?: DTO_CotizacionRequest;
  idx: number;

  proveedores: RES_Proveedor[];
  onAgregarProveedorLocal?: (nuevo: RES_Proveedor) => void;
  empresas: { id_empresa: number; razon_social: string }[];
  copiedCotizacion?: CopiedCotizacion | null;
  onIniciarCopiaCotizacion?: (
    sourceIndex: number,
    type: "all" | "general" | "delivery",
  ) => void;
  onPegarCotizacion?: (targetIndex: number) => void;
  onCancelarCopiaCotizacion?: () => void;

  loadingMaestros?: LoadingMaestrosState;
  unidadesMedida: { value: string; label: string; abreviatura: string }[];
  onUpdateHeader: <K extends keyof DTO_CotizacionRequest>(
    index: number,
    field: K,
    value: DTO_CotizacionRequest[K],
  ) => void;
  onRemoveCotizacion: (index: number) => void;
  isSkeleton?: boolean;
  almacenes?: RES_Almacen[];
  minas?: RES_Mina[];
  hasActivosFijos?: boolean;
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
  monedaFiltro?: Moneda | null;
}

const inputStyles = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-600 !font-normal transition-all",
  label: "text-zinc-300 mb-1.5 font-medium text-xs",
  description: "text-zinc-500 text-[10px] italic mt-1 leading-tight",
};

export const CabeceraCotizacion = ({
  cot,
  idx,
  proveedores,
  onAgregarProveedorLocal,
  empresas,
  copiedCotizacion,
  onIniciarCopiaCotizacion,
  onPegarCotizacion,
  loadingMaestros,
  onUpdateHeader,
  onRemoveCotizacion,
  isSkeleton = false,
  almacenes = [],
  minas = [],
  hasActivosFijos = false,
  onUpdateGlobalLogistica,
  monedaFiltro = null,
}: CabeceraCotizacionProps) => {
  const PERIODO_OPTIONS = [
    { value: Periodo.Diario, label: "Día(s)" },
    { value: Periodo.Semanal, label: "Semana(s)" },
    { value: Periodo.Mensual, label: "Mes(es)" },
    { value: Periodo.Anual, label: "Año(s)" },
  ];

  const { notify } = useNotify();
  const [openedAddProveedor, setOpenedAddProveedor] = useState(false);
  const [popoverOpened, setPopoverOpened] = useState(false);

  const handleNuevoProveedorExitoso = (nuevo: RES_Proveedor) => {
    if (onAgregarProveedorLocal) {
      onAgregarProveedorLocal(nuevo);
    }
    onUpdateHeader(idx, "id_proveedor", nuevo.id_proveedor);
    setOpenedAddProveedor(false);
  };
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

  useEffect(() => {
    const firstDetail = cot?.detalles?.[0];
    if (firstDetail) {
      const timer = setTimeout(() => {
        if (firstDetail.id_almacen_recepcionista) {
          setGlobalAlmacen(String(firstDetail.id_almacen_recepcionista));
          setGlobalDestinoTipo("almacen");
        } else if (firstDetail.id_mina_destino) {
          setGlobalMina(String(firstDetail.id_mina_destino));
          setGlobalDestinoTipo("mina");
        }
        setGlobalDespacho(
          firstDetail.tipo_despacho || TipoDespachoCompra.Envio,
        );
        setGlobalLugarRecojo(firstDetail.lugar_recojo || "");
        setGlobalTiempo(firstDetail.tiempo_entrega ?? 1);
        setGlobalPeriodo(firstDetail.tiempo_entrega_periodo || Periodo.Semanal);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [cot?.detalles]);

  const handleApplyGlobalLogistica = () => {
    if (!onUpdateGlobalLogistica) return;
    if (globalDestinoTipo === "almacen" && !globalAlmacen) return;
    if (globalDestinoTipo === "mina" && !globalMina) return;

    onUpdateGlobalLogistica(idx, {
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
    setPopoverOpened(false);
    notify({
      type: "success",
      content: `Configuración aplicada a todos los productos en Cotización #${idx + 1}`,
    });
  };

  if (isSkeleton) {
    return (
      <Stack gap={4} className="p-3 relative">
        <Stack gap="sm">
          <Skeleton h={32} radius="lg" animate={false} />
          <Group grow gap="md">
            <Skeleton h={32} radius="lg" animate={false} />
            <Skeleton h={32} radius="lg" animate={false} />
          </Group>
          <Skeleton h={32} radius="lg" animate={false} />
          <Group grow gap="xs" mt="md">
            <Skeleton h={40} radius="md" animate={false} />
            <Skeleton h={40} radius="md" animate={false} />
            <Skeleton h={40} radius="md" animate={false} />
          </Group>
        </Stack>
      </Stack>
    );
  }

  if (!cot) return null;

  return (
    <Stack gap={4} className="p-4 relative group-header">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" align="center" wrap="nowrap">
          <Text
            size="sm"
            fw={800}
            className="text-white tracking-tight uppercase"
          >
            Cotización #{idx + 1}
          </Text>

          {cot && (
            <Menu
              shadow="md"
              width={240}
              trigger="click"
              position="bottom-start"
              zIndex={10001}
            >
              <Menu.Target>
                <Tooltip label="Copiar datos" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    className="hover:bg-zinc-800/50 rounded-md"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4 text-zinc-400" />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown className="bg-zinc-950 border-zinc-800 text-zinc-300">
                <Menu.Label className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] px-2 py-1.5">
                  Opciones
                </Menu.Label>
                <Menu.Item
                  leftSection={
                    <DocumentDuplicateIcon className="w-3.5 h-3.5 text-pink-400" />
                  }
                  className="hover:bg-zinc-900 rounded-lg text-zinc-200 transition-colors py-1"
                  style={{ fontSize: "11px" }}
                  onClick={() => onIniciarCopiaCotizacion?.(idx, "all")}
                >
                  Copiar cotización completa
                </Menu.Item>
                <Menu.Item
                  leftSection={
                    <ClipboardDocumentCheckIcon className="w-3.5 h-3.5 text-pink-400" />
                  }
                  className="hover:bg-zinc-900 rounded-lg text-zinc-200 transition-colors py-1"
                  style={{ fontSize: "11px" }}
                  onClick={() => onIniciarCopiaCotizacion?.(idx, "general")}
                >
                  Copiar solo gastos
                </Menu.Item>
                <Menu.Item
                  leftSection={
                    <TruckIcon className="w-3.5 h-3.5 text-pink-400" />
                  }
                  className="hover:bg-zinc-900 rounded-lg text-zinc-200 transition-colors py-1"
                  style={{ fontSize: "11px" }}
                  onClick={() => onIniciarCopiaCotizacion?.(idx, "delivery")}
                >
                  Copiar destinos de entrega
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}

          {copiedCotizacion && copiedCotizacion.sourceIndex !== idx && (
            <Tooltip label="Pegar datos aquí" withArrow>
              <Button
                variant="filled"
                color="teal"
                size="xs"
                radius="md"
                h={22}
                onClick={() => onPegarCotizacion?.(idx)}
                className="animate-pulse px-2.5 font-bold uppercase shadow-lg shadow-teal-900/20 text-[9px] border-0"
              >
                Pegar aquí
              </Button>
            </Tooltip>
          )}
        </Group>
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemoveCotizacion(idx)}
        >
          <XMarkIcon className="w-4 h-4" />
        </ActionIcon>
      </Group>

      <Stack gap="sm">
        <Group align="flex-end" gap="xs">
          <Select
            placeholder={
              loadingMaestros?.proveedores
                ? "Buscando proveedores..."
                : "Seleccione proveedor..."
            }
            data={proveedores.map((p) => ({
              value: String(p.id_proveedor),
              label: p.razon_social,
            }))}
            label="Proveedor"
            withAsterisk
            disabled={loadingMaestros?.proveedores}
            leftSection={
              <IdentificationIcon className="w-4 h-4 text-zinc-500" />
            }
            value={cot.id_proveedor === 0 ? null : String(cot.id_proveedor)}
            onChange={(val) => {
              const newProvId = Number(val);
              onUpdateHeader(idx, "id_proveedor", newProvId);
              if (globalDespacho === TipoDespachoCompra.Recojo) {
                const proveedor = proveedores.find(
                  (p) => p.id_proveedor === newProvId,
                );
                setGlobalLugarRecojo(proveedor?.direccion || "");
              }
            }}
            searchable
            size="xs"
            radius="lg"
            classNames={inputStyles}
            className="flex-1"
            comboboxProps={{
              withinPortal: true,
              zIndex: 9999,
              transitionProps: { transition: "pop", duration: 200 },
            }}
          />
          <Tooltip label="Añadir proveedor" withArrow zIndex={10000}>
            <ActionIcon
              variant="light"
              color="indigo"
              radius="lg"
              size="32px"
              className="border border-indigo-500/20 hover:border-indigo-500/40"
              onClick={() => setOpenedAddProveedor(true)}
            >
              <PlusIcon className="w-4 h-4" />
            </ActionIcon>
          </Tooltip>
          <div
            className="bg-zinc-900/40 border border-zinc-800 rounded-xl px-4 h-8 flex items-center justify-center transition-all hover:bg-zinc-900/60 hover:border-green-500/40 group/check cursor-pointer"
            onClick={() =>
              onUpdateHeader(
                idx,
                "estado",
                cot.estado === Estado_Cotizacion.Aprobada
                  ? Estado_Cotizacion.Generada
                  : Estado_Cotizacion.Aprobada,
              )
            }
          >
            <Group gap="xs" wrap="nowrap" align="center">
              <Text
                size="10px"
                fw={900}
                className="uppercase tracking-widest text-zinc-400 group-hover/check:text-green-400 transition-colors select-none"
              >
                Aprobar
              </Text>
              <Checkbox
                size="xs"
                color="green"
                checked={cot.estado === Estado_Cotizacion.Aprobada}
                styles={{
                  input: { cursor: "pointer", pointerEvents: "none" },
                }}
              />
            </Group>
          </div>
        </Group>

        <MultiSelect
          placeholder={
            loadingMaestros?.empresas
              ? "Cargando empresas..."
              : "Seleccione empresas compradoras..."
          }
          data={empresas.map((e) => ({
            value: String(e.id_empresa),
            label: e.razon_social,
          }))}
          label="Empresas Asociadas"
          withAsterisk
          disabled={loadingMaestros?.empresas}
          value={cot.empresas_ids.map(String)}
          onChange={(vals) =>
            onUpdateHeader(idx, "empresas_ids", vals.map(Number))
          }
          searchable
          clearable
          size="xs"
          radius="lg"
          classNames={inputStyles}
          className="w-full"
          hidePickedOptions
          maxDropdownHeight={200}
        />
      </Stack>

      <Group
        justify="space-between"
        align="center"
        className="mt-2"
        wrap="nowrap"
      >
        <Group grow wrap="nowrap" gap="xs" className="flex-1 overflow-hidden">
          <Stack
            gap={0}
            px="xs"
            py={4}
            className="bg-pink-700 rounded-lg shadow-sm border border-pink-500/20 min-w-0"
          >
            <Text
              size="9px"
              fw={800}
              className="text-white uppercase truncate opacity-90"
            >
              Subtotal
            </Text>
            <Text size="xs" fw={800} className="text-white truncate">
              {cot.moneda === MONEDAS.PEN.label ? "S/. " : "$ "}
              {formatNumber(cot.total_antes_igv)}
            </Text>
          </Stack>

          <Stack
            gap={0}
            px="xs"
            py={4}
            className="bg-purple-700 rounded-lg shadow-sm border border-purple-500/20 min-w-0"
          >
            <Text
              size="9px"
              fw={800}
              className="text-white uppercase truncate opacity-90"
            >
              IGV
            </Text>
            <Text size="xs" fw={800} className="text-white truncate">
              {cot.moneda === MONEDAS.PEN.label ? "S/. " : "$ "}
              {formatNumber(cot.monto_igv)}
            </Text>
          </Stack>

          <Stack
            gap={0}
            px="xs"
            py={4}
            className="bg-cyan-600 rounded-lg shadow-md border border-cyan-400/20 min-w-0"
          >
            <Text
              size="9px"
              fw={800}
              className="text-white uppercase truncate opacity-90"
            >
              Total
            </Text>
            <Text size="xs" fw={800} className="text-white truncate">
              {cot.moneda === MONEDAS.PEN.label ? "S/. " : "$ "}
              {formatNumber(cot.total_despues_igv)}
            </Text>
          </Stack>
        </Group>

        <Group gap="xs" className="flex-none">
          <Popover
            width={320}
            position="bottom"
            withArrow
            shadow="md"
            opened={popoverOpened}
            onChange={setPopoverOpened}
          >
            <Popover.Target>
              <Tooltip label="Configuración Global (afecta a todos)" withArrow>
                <ActionIcon
                  variant="light"
                  color="cyan"
                  radius="md"
                  size="md"
                  className="border border-cyan-500/20"
                  onClick={() => setPopoverOpened((o) => !o)}
                >
                  <TruckIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown className="bg-zinc-950 border-zinc-800 shadow-2xl p-4">
              <Stack gap="sm">
                <Text
                  size="sm"
                  fw={800}
                  className="text-white mb-1 tracking-wider"
                >
                  Cambios Globales
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

                    <Tabs
                      value={globalDestinoTipo}
                      onChange={(val) => {
                        if (val)
                          setGlobalDestinoTipo(val as "almacen" | "mina");
                      }}
                      variant="pills"
                      radius="md"
                      classNames={{
                        root: "w-full",
                        list: "bg-zinc-900 border border-zinc-800 p-1 rounded-md",
                        tab: "text-zinc-400 font-bold text-xs py-1 data-[active]:bg-cyan-600 data-[active]:text-white transition-colors border-none",
                      }}
                    >
                      <Tabs.List grow>
                        <Tabs.Tab
                          value="almacen"
                          leftSection={
                            <BuildingStorefrontIcon className="w-3.5 h-3.5" />
                          }
                        >
                          Almacén
                        </Tabs.Tab>
                        <Tabs.Tab
                          value="mina"
                          leftSection={<MapPinIcon className="w-3.5 h-3.5" />}
                        >
                          Mina
                        </Tabs.Tab>
                      </Tabs.List>
                    </Tabs>

                    {globalDestinoTipo === "mina" && (
                      <Text
                        size="11px"
                        className="text-amber-400 text-center px-2"
                      >
                        * La mina se aplicará solo a los Activos Fijos.
                      </Text>
                    )}
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
                    value={globalMina}
                    onChange={setGlobalMina}
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
                      cot?.id_proveedor
                    ) {
                      const proveedor = proveedores.find(
                        (p) => p.id_proveedor === cot.id_proveedor,
                      );
                      setGlobalLugarRecojo(proveedor?.direccion || "");
                    }
                  }}
                  size="xs"
                  radius="lg"
                  classNames={inputStyles}
                  comboboxProps={{ withinPortal: false }}
                />

                {globalDespacho === TipoDespachoCompra.Recojo && (
                  <TextInput
                    label="Lugar de Recojo"
                    withAsterisk
                    placeholder="Indique dirección o local..."
                    value={globalLugarRecojo}
                    onChange={(e) =>
                      setGlobalLugarRecojo(e.currentTarget.value)
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
                      comboboxProps={{ withinPortal: false }}
                    />
                  </Group>
                  <div className="mt-2 flex justify-center">
                    <Badge
                      variant="light"
                      color="cyan"
                      size="xs"
                      radius="sm"
                      className="font-bold border border-cyan-500/20"
                    >
                      ≈ {getDuracionPeriodo(globalTiempo, globalPeriodo)}{" "}
                      {enPlural(
                        "día",
                        getDuracionPeriodo(globalTiempo, globalPeriodo),
                      )}
                    </Badge>
                  </div>
                </div>

                <Button
                  fullWidth
                  mt="sm"
                  variant="gradient"
                  gradient={{ from: "cyan.6", to: "cyan.8" }}
                  onClick={handleApplyGlobalLogistica}
                  disabled={
                    globalDestinoTipo === "almacen"
                      ? !globalAlmacen
                      : !globalMina
                  }
                  radius="xl"
                  size="xs"
                  className="font-bold shadow-lg shadow-cyan-900/20"
                >
                  Aplicar Cambios
                </Button>
              </Stack>
            </Popover.Dropdown>
          </Popover>

          <Popover width={350} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <Tooltip label="Configuración y Gastos" withArrow>
                <ActionIcon
                  variant="light"
                  color="indigo"
                  radius="md"
                  size="md"
                  className="border border-indigo-500/20"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown className="bg-zinc-950 border-zinc-800 shadow-2xl">
              <Stack gap="sm">
                <Text size="sm" fw={800} className="text-white mb-2">
                  Configuración y Gastos Adicionales
                </Text>

                <Group grow gap="md">
                  <Tooltip
                    label={
                      monedaFiltro
                        ? `Bloqueado: el modo "${monedaFiltro === Moneda.Soles ? "Solo Soles" : "Solo Dólares"}" está activo`
                        : ""
                    }
                    position="top"
                    withArrow
                    disabled={!monedaFiltro}
                  >
                    <Select
                      label="Moneda"
                      data={Object.values(MONEDAS).map((m) => m.label)}
                      value={cot.moneda}
                      onChange={(val) => {
                        onUpdateHeader(idx, "moneda", val ?? MONEDAS.PEN.label);
                        if (val === MONEDAS.PEN.label) {
                          onUpdateHeader(
                            idx,
                            "tipo_cambio_venta_referencial",
                            1,
                          );
                        } else {
                          onUpdateHeader(
                            idx,
                            "tipo_cambio_venta_referencial",
                            undefined,
                          );
                        }
                      }}
                      classNames={inputStyles}
                      size="xs"
                      radius="lg"
                      comboboxProps={{ withinPortal: false }}
                      disabled={Boolean(monedaFiltro)}
                    />
                  </Tooltip>
                  <Select
                    label="Método de Pago"
                    data={[
                      { value: MetodoPago.Contado, label: "Contado" },
                      { value: MetodoPago.Credito, label: "Crédito" },
                    ]}
                    value={cot.metodo_pago}
                    onChange={(val) =>
                      onUpdateHeader(
                        idx,
                        "metodo_pago",
                        (val as MetodoPago) ?? MetodoPago.Contado,
                      )
                    }
                    classNames={inputStyles}
                    size="xs"
                    radius="lg"
                    comboboxProps={{ withinPortal: false }}
                  />
                </Group>

                {cot.metodo_pago === MetodoPago.Credito && (
                  <CustomDatePicker
                    label="Fecha de Vencimiento"
                    withAsterisk
                    placeholder="Seleccione fecha..."
                    value={cot.fecha_vencimiento_pago as unknown as Date | null}
                    onChange={(val) =>
                      onUpdateHeader(
                        idx,
                        "fecha_vencimiento_pago",
                        val as unknown as string,
                      )
                    }
                    size="xs"
                    radius="lg"
                  />
                )}

                <Group grow align="flex-end" gap="md">
                  <NumberInput
                    label="TC Venta (Ref.)"
                    placeholder="Ej. 3.85"
                    value={
                      cot.moneda === MONEDAS.PEN.label
                        ? 1
                        : (cot.tipo_cambio_venta_referencial ?? "")
                    }
                    onChange={(val) =>
                      onUpdateHeader(
                        idx,
                        "tipo_cambio_venta_referencial",
                        val === "" ? undefined : Number(val),
                      )
                    }
                    disabled={cot.moneda === MONEDAS.PEN.label}
                    min={0}
                    decimalScale={4}
                    size="xs"
                    radius="lg"
                    classNames={inputStyles}
                  />
                  <Stack gap={3}>
                    <Text size="xs" fw={500} className="font-medium">
                      Incluye IGV
                    </Text>
                    <Tabs
                      value={String(cot.incluye_igv)}
                      onChange={(val) => {
                        if (val !== null) {
                          onUpdateHeader(idx, "incluye_igv", val === "true");
                        }
                      }}
                      variant="pills"
                      color="teal"
                      radius="xl"
                      classNames={{
                        list: "bg-zinc-900 border border-zinc-800 p-0.5 rounded-full",
                        tab: "text-xs font-semibold text-zinc-400 py-1 px-3 border-none rounded-full data-[active]:text-white transition-colors",
                      }}
                    >
                      <Tabs.List grow>
                        <Tabs.Tab value="true">SÍ</Tabs.Tab>
                        <Tabs.Tab value="false">NO</Tabs.Tab>
                      </Tabs.List>
                    </Tabs>
                  </Stack>

                  <Stack gap={2}>
                    <NumberInput
                      label="% IGV"
                      value={cot.porcentaje_igv}
                      onChange={(val) =>
                        onUpdateHeader(idx, "porcentaje_igv", Number(val))
                      }
                      disabled
                      size="xs"
                      radius="lg"
                      classNames={inputStyles}
                      suffix="%"
                    />
                  </Stack>
                </Group>

                <Group grow gap="md">
                  <NumberInput
                    label="Flete (opc.)"
                    placeholder="0.00"
                    leftSection={
                      <TruckIcon className="w-4 h-4 text-zinc-500" />
                    }
                    value={cot.costo_flete ?? 0}
                    onChange={(val) =>
                      onUpdateHeader(idx, "costo_flete", Number(val))
                    }
                    min={0}
                    decimalScale={2}
                    size="xs"
                    radius="lg"
                    classNames={inputStyles}
                  />
                  <NumberInput
                    label="Otros Gastos"
                    placeholder="0.00"
                    leftSection={
                      <CurrencyDollarIcon className="w-4 h-4 text-zinc-500" />
                    }
                    value={cot.otros_gastos ?? 0}
                    onChange={(val) =>
                      onUpdateHeader(idx, "otros_gastos", Number(val))
                    }
                    min={0}
                    decimalScale={2}
                    size="xs"
                    radius="lg"
                    classNames={inputStyles}
                  />
                </Group>

                <TextInput
                  label="Observación (opc.)"
                  placeholder="Escriba alguna observación..."
                  leftSection={
                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-zinc-500" />
                  }
                  value={cot.observacion || ""}
                  onChange={(e) =>
                    onUpdateHeader(idx, "observacion", e.currentTarget.value)
                  }
                  classNames={inputStyles}
                  size="xs"
                  radius="lg"
                />
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      </Group>

      <ModalEstandar
        opened={openedAddProveedor}
        close={() => setOpenedAddProveedor(false)}
        validateClose
        title="Nuevo Proveedor"
        size="lg"
      >
        <FormProveedor
          onCancel={() => setOpenedAddProveedor(false)}
          onSuccess={handleNuevoProveedorExitoso}
        />
      </ModalEstandar>
    </Stack>
  );
};
