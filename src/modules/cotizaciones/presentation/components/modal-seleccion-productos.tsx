import { useEffect, useState, useMemo } from "react";
import {
  Stack,
  TextInput,
  Checkbox,
  Button,
  Group,
  Text,
  Badge,
  Select,
  Tooltip,
  Switch,
} from "@mantine/core";
import {
  MagnifyingGlassIcon,
  CubeIcon,
  Squares2X2Icon,
  PlusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { RegistroProducto } from "../../../productos/presentation/registro-producto";
import type { RES_Producto } from "../../../../service/responses/producto";
import type { RES_ProductoResumen } from "../../../productos/service/productos.responses";
import { EstadoBase } from "../../../../shared/enums/_generic/estado-base";
import { TipoBien } from "../../../../shared/enums/_generic/tipo-bien";
import { Moneda } from "../../../../shared/enums/_generic/moneda";

interface ModalSeleccionProductosProps {
  opened: boolean;
  onClose: () => void;
  onToggle: (id_producto: number) => void;
  seleccionadosActuales: number[];
  catalogoProductos: RES_Producto[];
  loading?: boolean;
  soloAuditables?: boolean;
  monedaFiltrar?: Moneda | null;
  onClearSeleccion?: () => void;
  onChangeMoneda?: (newMoneda: Moneda) => void;
  onProductoCreado?: (producto: RES_Producto) => void;
}

export const ModalSeleccionProductos = ({
  opened,
  onClose,
  onToggle,
  seleccionadosActuales,
  catalogoProductos,
  loading = false,
  soloAuditables = false,
  monedaFiltrar = null,
  onClearSeleccion,
  onChangeMoneda,
  onProductoCreado,
}: ModalSeleccionProductosProps) => {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [openedAddProducto, setOpenedAddProducto] = useState(false);
  const [monedaInterna, setMonedaInterna] = useState<Moneda | null>(monedaFiltrar);
  const [monedaPendiente, setMonedaPendiente] = useState<Moneda | null>(null);
  const [openedConfirm, setOpenedConfirm] = useState(false);

  // Sincroniza el estado interno con el prop (cuando el padre cambia la moneda)
  useEffect(() => {
    setMonedaInterna(monedaFiltrar);
  }, [monedaFiltrar]);

  // Extraemos categorías únicas del catálogo cargado
  const categoriasDisponibles = useMemo(() => {
    const list = catalogoProductos.map((p) => p.categoria);
    const unique = Array.from(new Set(list)).sort();
    return unique.map((c) => ({ value: c, label: c }));
  }, [catalogoProductos]);

  const filtrados = useMemo(() => {
    return catalogoProductos.filter((p) => {
      const matchTexto =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.id_producto.toString().toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !categoriaId || p.categoria === categoriaId;

      const isAuditable = Boolean(p.es_auditable);
      const matchAuditable = soloAuditables ? isAuditable : !isAuditable;

      const matchMoneda = !monedaInterna || p.moneda === monedaInterna;

      return matchTexto && matchCategoria && matchAuditable && matchMoneda;
    });
  }, [catalogoProductos, busqueda, categoriaId, soloAuditables, monedaInterna]);

  // Agrupa los productos filtrados por categoría (ordenadas alfabéticamente)
  const productosAgrupados = useMemo(() => {
    const grupos = new Map<string, RES_Producto[]>();
    filtrados.forEach((p) => {
      const arr = grupos.get(p.categoria) ?? [];
      arr.push(p);
      grupos.set(p.categoria, arr);
    });
    return Array.from(grupos.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([categoria, productos]) => ({ categoria, productos }));
  }, [filtrados]);

  const handleToggle = (id: number) => {
    onToggle(id);
  };

  const handleToggleMoneda = (checked: boolean) => {
    const nuevaMoneda: Moneda = checked ? Moneda.Dolares : Moneda.Soles;
    if (nuevaMoneda === monedaInterna) return;
    if (seleccionadosActuales.length > 0) {
      setMonedaPendiente(nuevaMoneda);
      setOpenedConfirm(true);
      return;
    }
    setMonedaInterna(nuevaMoneda);
    onChangeMoneda?.(nuevaMoneda);
  };

  const confirmarToggleMoneda = () => {
    if (monedaPendiente) {
      setMonedaInterna(monedaPendiente);
      onClearSeleccion?.();
      onChangeMoneda?.(monedaPendiente);
    }
    setMonedaPendiente(null);
    setOpenedConfirm(false);
  };

  const handleProductoCreadoSuccess = (nuevoResumen: RES_ProductoResumen) => {
    setOpenedAddProducto(false);

    // Mapear al tipo de producto completo RES_Producto que espera el catálogo de cotizaciones
    const nuevoProducto: RES_Producto = {
      id_producto: nuevoResumen.id_producto,
      nombre: nuevoResumen.nombre,
      prefijo: nuevoResumen.prefijo,
      id_categoria: nuevoResumen.id_categoria,
      categoria: nuevoResumen.categoria,
      es_consumible: true,
      tipo_bien: nuevoResumen.clasificacion_bien,
      id_unidad_medida_base: nuevoResumen.id_unidad_medida_base,
      unidad_medida_base: nuevoResumen.unidad_medida_base,
      unidad_medida_base_abv: nuevoResumen.unidad_medida_base_abreviatura,
      es_auditable: nuevoResumen.es_auditable,
      es_perecible: nuevoResumen.es_perecible,
      para_mantenimiento: nuevoResumen.para_mantenimiento,
      stock_minimo_base: nuevoResumen.stock_minimo_base,
      costo_promedio_base: nuevoResumen.costo_promedio_base,
      moneda: nuevoResumen.moneda,
      dias_espera_vencimiento: nuevoResumen.dias_espera_vencimiento,
    };

    if (onProductoCreado) {
      onProductoCreado(nuevoProducto);
    }

    // Auto-seleccionar el producto si cumple con los filtros activos (auditable + moneda)
    const isAuditable = Boolean(nuevoProducto.es_auditable);
    const cumpleAuditable = soloAuditables ? isAuditable : !isAuditable;
    const cumpleMoneda =
      !monedaFiltrar || nuevoProducto.moneda === monedaFiltrar;
    if (
      cumpleAuditable &&
      cumpleMoneda &&
      !seleccionadosActuales.includes(nuevoProducto.id_producto)
    ) {
      onToggle(nuevoProducto.id_producto);
    }
  };

  // Convertir catálogo de cotizaciones a lista compatible con RES_ProductoResumen
  const productosExistentesParaModal: RES_ProductoResumen[] = useMemo(() => {
    return catalogoProductos.map((p) => ({
      id_producto: p.id_producto,
      nombre: p.nombre,
      prefijo: p.prefijo,
      id_categoria: p.id_categoria || 0,
      categoria: p.categoria,
      clasificacion_bien: p.tipo_bien || TipoBien.Otros,
      id_unidad_medida_base: p.id_unidad_medida_base || 0,
      unidad_medida_base: p.unidad_medida_base || "",
      unidad_medida_base_abreviatura: p.unidad_medida_base_abv || "",
      es_auditable: Boolean(p.es_auditable),
      es_perecible: Boolean(p.es_perecible),
      para_mantenimiento: Boolean(p.para_mantenimiento),
      stock_minimo_base: Number(p.stock_minimo_base) || 0,
      costo_promedio_base: Number(p.costo_promedio_base) || 0,
      costo_promedio_base_log: null,
      moneda: p.moneda,
      tiempo_espera_vencimiento: null,
      periodo_espera_vencimiento: null,
      dias_espera_vencimiento: p.dias_espera_vencimiento ?? null,
      estado: EstadoBase.Activo,
      cambios_log: null,
    }));
  }, [catalogoProductos]);

  const renderFilaProducto = (p: RES_Producto) => {
    const isChecked = seleccionadosActuales.includes(p.id_producto);
    return (
      <div
        key={p.id_producto}
        onClick={() => handleToggle(p.id_producto)}
        className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-200 border-b border-zinc-800/40 last:border-b-0 ${
          isChecked
            ? "bg-indigo-500/10 hover:bg-indigo-500/15"
            : "hover:bg-zinc-800/40"
        }`}
      >
        <Checkbox
          checked={isChecked}
          onChange={() => handleToggle(p.id_producto)}
          onClick={(e) => e.stopPropagation()}
          color="indigo"
          radius="sm"
          size="xs"
        />
        <div
          className={`p-1 rounded-md border transition-all shrink-0 ${
            isChecked
              ? "bg-indigo-500/20 border-indigo-400/50"
              : "bg-zinc-800/40 border-zinc-700/50 group-hover:border-zinc-600"
          }`}
        >
          <CubeIcon
            className={`w-3 h-3 ${
              isChecked ? "text-indigo-400" : "text-zinc-500"
            }`}
          />
        </div>
        <Text
          size="xs"
          fw={isChecked ? 700 : 600}
          className={`flex-1 truncate ${
            isChecked ? "text-indigo-200" : "text-zinc-200"
          }`}
          title={p.nombre}
        >
          {p.nombre}
        </Text>
      </div>
    );
  };

  return (
    <>
      <ModalEstandar
        opened={opened}
        close={onClose}
        title="Añadir Productos"
        size="xl"
        rightSection={
          <Group gap="xs">
            {seleccionadosActuales.length > 0 && (
              <Badge
                variant="light"
                color="indigo"
                radius="md"
                size="sm"
                className="font-bold flex items-center gap-1.5 px-3 py-1 shadow-inner bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              >
                {seleccionadosActuales.length}{" "}
                {seleccionadosActuales.length === 1
                  ? "seleccionado"
                  : "seleccionados"}
              </Badge>
            )}
            <div
              className="group flex items-center gap-2 h-8 px-3 rounded-full bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80 shadow-inner shadow-black/20"
              title="Cambiar moneda de la cotización"
            >
              <span
                className={`text-[11px] font-extrabold tracking-wider transition-all duration-300 ${
                  monedaInterna === Moneda.Soles
                    ? "text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                    : "text-zinc-600 group-hover:text-zinc-500"
                }`}
              >
                S/. PEN
              </span>
              <Switch
                size="xs"
                checked={monedaInterna === Moneda.Dolares}
                onChange={(event) =>
                  handleToggleMoneda(event.currentTarget.checked)
                }
                styles={{
                  root: { cursor: "pointer" },
                  track: {
                    backgroundColor:
                      monedaInterna === Moneda.Dolares
                        ? "rgba(99, 102, 241, 0.45)"
                        : "rgba(20, 184, 166, 0.3)",
                    borderColor:
                      monedaInterna === Moneda.Dolares
                        ? "rgba(99, 102, 241, 0.6)"
                        : "rgba(20, 184, 166, 0.5)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    boxShadow:
                      monedaInterna === Moneda.Dolares
                        ? "inset 0 0 8px rgba(99, 102, 241, 0.35)"
                        : "inset 0 0 8px rgba(20, 184, 166, 0.3)",
                  },
                  thumb: {
                    backgroundColor:
                      monedaInterna === Moneda.Dolares
                        ? "#a5b4fc"
                        : "#5eead4",
                    boxShadow:
                      monedaInterna === Moneda.Dolares
                        ? "0 0 10px rgba(165, 180, 252, 0.75)"
                        : "0 0 10px rgba(94, 234, 212, 0.75)",
                  },
                }}
              />
              <span
                className={`text-[11px] font-extrabold tracking-wider transition-all duration-300 ${
                  monedaInterna === Moneda.Dolares
                    ? "text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]"
                    : "text-zinc-600 group-hover:text-zinc-500"
                }`}
              >
                $ USD
              </span>
            </div>
            <Tooltip
              label="Registrar nuevo producto en catálogo"
              position="bottom"
              withArrow
            >
              <Button
                variant="light"
                color="indigo"
                size="xs"
                radius="lg"
                leftSection={<PlusIcon className="w-4 h-4" />}
                onClick={() => setOpenedAddProducto(true)}
                className="font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
              >
                Nuevo Producto
              </Button>
            </Tooltip>
          </Group>
        }
      >
        <Stack gap="md" className="relative">
          <Group grow gap="sm">
            <TextInput
              placeholder="Buscar producto por nombre..."
              leftSection={
                <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
              }
              value={busqueda}
              onChange={(e) => setBusqueda(e.currentTarget.value)}
              radius="lg"
              variant="filled"
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-600 transition-all h-10",
              }}
            />
            <Select
              placeholder="Todas las categorías"
              leftSection={<Squares2X2Icon className="w-4 h-4 text-zinc-400" />}
              data={categoriasDisponibles}
              value={categoriaId}
              onChange={setCategoriaId}
              clearable
              searchable
              radius="lg"
              variant="filled"
              classNames={{
                input:
                  "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-600 h-10",
                dropdown: "bg-zinc-900 border-zinc-800 shadow-2xl rounded-xl",
                option:
                  "hover:bg-zinc-800 text-zinc-300 data-[selected]:bg-indigo-600 data-[selected]:text-white rounded-lg my-1 transition-colors mx-2",
              }}
            />
          </Group>

          {/* Listado agrupado por categoría */}
          <div className="max-h-105 overflow-y-auto pr-1 space-y-3">
            {loading ? (
              <Stack align="center" gap="md" py={60}>
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <CubeIcon className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <Text
                  size="xs"
                  fw={900}
                  className="uppercase tracking-[0.3em] text-zinc-500"
                >
                  Cargando catálogo...
                </Text>
              </Stack>
            ) : productosAgrupados.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                <CubeIcon className="w-10 h-10 text-zinc-700 mb-2" />
                <Text
                  size="sm"
                  fw={700}
                  className="text-zinc-500 uppercase tracking-widest"
                >
                  Sin resultados
                </Text>
                <Text size="xs" c="dimmed" className="mt-1">
                  Ajusta los filtros o cambia la moneda de la cotización.
                </Text>
              </div>
            ) : (
              productosAgrupados.map(({ categoria, productos }) => (
                <div
                  key={categoria}
                  className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl overflow-hidden backdrop-blur-sm shadow-lg shadow-black/20"
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-2 bg-zinc-900/70 border-b border-zinc-800">
                    <Group gap={8} align="center">
                      <div className="w-1 h-4 bg-linear-to-b from-violet-500 to-violet-700 rounded-full shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
                      <Text
                        size="xs"
                        fw={800}
                        className="uppercase tracking-wider text-zinc-300"
                      >
                        {categoria}
                      </Text>
                      <Badge
                        variant="filled"
                        color="violet.7"
                        size="xs"
                        radius="md"
                        className="font-extrabold px-2 shadow-md"
                        style={{ color: "white" }}
                      >
                        {productos.length}
                      </Badge>
                    </Group>
                  </div>
                  <Stack gap={0}>
                    <div className="grid grid-cols-2 gap-px bg-zinc-800/40">
                      {productos.map(renderFilaProducto)}
                    </div>
                  </Stack>
                </div>
              ))
            )}
          </div>

          <Group justify="flex-end" mt="xs">
            <Button
              variant="gradient"
              gradient={{ from: "indigo.6", to: "indigo.8" }}
              onClick={onClose}
              radius="xl"
              size="sm"
              className="px-6 font-bold shadow-lg shadow-indigo-900/20"
            >
              Finalizar Selección
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>

      {/* Modal para Crear Producto desde la Cotización (Idéntico a Productos) */}
      <ModalEstandar
        opened={openedAddProducto}
        close={() => setOpenedAddProducto(false)}
        title="Registrar Producto"
        size="lg"
      >
        <RegistroProducto
          productosExistentes={productosExistentesParaModal}
          onSuccess={handleProductoCreadoSuccess}
          onCancel={() => setOpenedAddProducto(false)}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedConfirm}
        close={() => setOpenedConfirm(false)}
        title="Advertencia"
        size="md"
      >
        <Stack gap="md" align="center" className="p-4 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
          <Text size="sm" fw={800} className="text-zinc-100">
            Al cambiar el tipo de cotización, se limpiará la grilla actual de
            productos. ¿Deseas continuar?
          </Text>
          <Group justify="center" gap="sm" mt="md">
            <Button
              variant="subtle"
              color="zinc"
              onClick={() => setOpenedConfirm(false)}
              radius="xl"
            >
              Cancelar
            </Button>
            <Button
              variant="filled"
              color="red"
              onClick={confirmarToggleMoneda}
              radius="xl"
              className="shadow-lg shadow-red-900/20"
            >
              Continuar y Limpiar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>
    </>
  );
};
