import {
  Stack,
  Group,
  TextInput,
  Select,
  Button,
  NumberInput,
  Popover,
  Tooltip,
  ActionIcon,
  Text,
  ScrollArea,
  Checkbox,
  Badge,
} from "@mantine/core";
import {
  PlusIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { LazyMotion, domAnimation, m, AnimatePresence } from "motion/react";
import { useRegistroProducto } from "../hooks/useRegistroProducto";
import type { RES_ProductoResumen } from "../service/productos.responses";
import { Periodo } from "../../../shared/enums/_generic/periodo";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import { Moneda } from "../../../shared/enums/_generic/moneda";
import { useDisclosure } from "@mantine/hooks";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { FormCategoria } from "../../../presentation/utils/form-categoria";
import { FormUnidadMedida } from "../../../presentation/utils/form-unidad-medida";
import { LabelForm } from "./components/label-form";
import { useMemo } from "react";
import { enPlural } from "../../../shared/functions/en-plural";
import { useAuditoriaStore } from "../../../stores/auditoria.store";

interface RegistroProductoProps {
  productosExistentes: RES_ProductoResumen[];
  onSuccess: (nuevo: RES_ProductoResumen) => void;
  onEditSuccess?: (editado: RES_ProductoResumen) => void;
  onCancel?: () => void;
  productoEdicion?: RES_ProductoResumen | null;
}

export const RegistroProducto = ({
  productosExistentes,
  onSuccess,
  onEditSuccess,
  onCancel,
  productoEdicion,
}: RegistroProductoProps) => {
  const { en_modo_auditable } = useAuditoriaStore();
  const {
    form,
    setField,
    categorias,
    unidades,
    coincidencias,
    loading,
    loadingCategorias,
    loadingUnidades,
    cargarCategorias,
    cargarUnidades,
    handleSubmit,
    isEdit,
  } = useRegistroProducto({
    productosExistentes,
    onSuccess,
    onEditSuccess,
    productoEdicion,
  });

  const isActivoFijo = useMemo(() => {
    const cat = categorias.find((c) => c.id_categoria === form.id_categoria);
    return cat?.clasificacion_bien === TipoBien.ActivoFijo;
  }, [form.id_categoria, categorias]);

  // Agrupar coincidencias por categoría para el diseño del dropdown
  const groupedCoincidencias = useMemo(() => {
    const groups: Record<string, typeof coincidencias> = {};
    coincidencias.forEach((res) => {
      const cat = res.item.categoria || "Sin Categoría";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(res);
    });
    return groups;
  }, [coincidencias]);

  const [focused, setFocused] = useDisclosure(false);

  const [openedAddCat, { open: openAddCat, close: closeAddCat }] =
    useDisclosure(false);

  const [openedAddUnidad, { open: openAddUnidad, close: closeAddUnidad }] =
    useDisclosure(false);

  return (
    <LazyMotion features={domAnimation}>
      <Stack gap="lg" mt="xs">
        {/* Fila 1: Categoría y Nombre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <LabelForm text="Categoría" required />
            <div className="flex gap-2 items-center">
              <Select
                placeholder={
                  loadingCategorias ? "Cargando..." : "Seleccione categoría"
                }
                data={categorias.map((c) => ({
                  value: c.id_categoria.toString(),
                  label: c.nombre,
                }))}
                value={
                  form.id_categoria === 0 ? null : form.id_categoria.toString()
                }
                onChange={(val) => setField("id_categoria", Number(val))}
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 h-10",
                }}
                radius="lg"
                searchable
                clearable
                comboboxProps={{
                  withinPortal: true,
                  transitionProps: { transition: "pop", duration: 200 },
                }}
                disabled={loadingCategorias}
                className="flex-1"
              />
              <ActionIcon
                size={"lg"}
                radius="lg"
                variant="filled"
                color="indigo"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors"
                onClick={openAddCat}
              >
                <PlusIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </div>
          </div>

          <Popover
            opened={coincidencias.length > 0 && !!focused}
            position="bottom"
            width="target"
            transitionProps={{ transition: "pop", duration: 200 }}
            shadow="xl"
            radius="lg"
            offset={2}
          >
            <Popover.Target>
              <TextInput
                label={<LabelForm text="Nombre" required />}
                placeholder="Ej: DINAMITA 7/8 FAMESA"
                value={form.nombre}
                onChange={(e) =>
                  setField("nombre", e.currentTarget.value.toUpperCase())
                }
                onFocus={() => setFocused.open()}
                onBlur={() => setFocused.close()}
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 h-10 uppercase",
                }}
                radius="lg"
                rightSection={
                  form.nombre.length >= 3 && (
                    <Tooltip
                      label={
                        coincidencias.length > 0
                          ? `${coincidencias.length} coincidencias encontradas`
                          : "Nombre disponible"
                      }
                      color={coincidencias.length > 0 ? "orange" : "teal"}
                      withArrow
                      position="top-end"
                    >
                      <div>
                        {coincidencias.length > 0 ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 animate-pulse" />
                        ) : (
                          <CheckCircleIcon className="w-5 h-5 text-teal-500" />
                        )}
                      </div>
                    </Tooltip>
                  )
                }
              />
            </Popover.Target>
            <Popover.Dropdown className="bg-zinc-950 border-zinc-800 p-2 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-2.5 py-2 border-b border-zinc-800/60 mb-2">
                <Text
                  size="10px"
                  fw={800}
                  className="text-zinc-500 uppercase tracking-widest"
                >
                  Productos Similares
                </Text>
              </div>

              <ScrollArea.Autosize mah={250} type="scroll" className="px-1">
                {Object.entries(groupedCoincidencias).map(
                  ([categoria, items]) => (
                    <div key={categoria} className="mb-4 last:mb-1">
                      <div className="flex items-center gap-2 px-1.5 mb-1.5">
                        <TagIcon className="w-3 h-3 text-indigo-400" />
                        <Text
                          size="10px"
                          fw={700}
                          className="text-zinc-600 uppercase tracking-tight"
                        >
                          {categoria}
                        </Text>
                      </div>

                      <Stack gap={3}>
                        {items.map((res) => (
                          <div
                            key={res.item.id_producto}
                            className="group flex items-center justify-between p-2.5 bg-zinc-900/30 hover:bg-zinc-800/40 border border-zinc-800/30 hover:border-zinc-700/50 rounded-xl transition-all duration-200 cursor-default"
                          >
                            <div className="flex flex-row items-center gap-2">
                              <Text
                                size="xs"
                                fw={600}
                                className="text-zinc-200 group-hover:text-white transition-colors"
                              >
                                {res.item.nombre}
                              </Text>
                              <div className="flex items-center gap-2">
                                <Badge
                                  color="teal.4"
                                  variant="outline"
                                  size="xs"
                                  className="font-medium"
                                >
                                  {enPlural(res.item.unidad_medida_base)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </Stack>
                    </div>
                  ),
                )}
              </ScrollArea.Autosize>
            </Popover.Dropdown>
          </Popover>
        </div>

        {/* Fila 2: Unidad y Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <LabelForm text="Unidad Medida" required />
            <div className="flex gap-2 items-center">
              <Select
                placeholder={
                  loadingUnidades ? "Cargando..." : "Seleccione unidad"
                }
                data={unidades.map((u) => ({
                  value: u.id_unidad_medida.toString(),
                  label: `${u.nombre} (${u.abreviatura})`,
                }))}
                value={
                  form.id_unidad_medida_base === 0
                    ? null
                    : form.id_unidad_medida_base.toString()
                }
                onChange={(val) =>
                  setField("id_unidad_medida_base", Number(val))
                }
                classNames={{
                  input:
                    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 h-10",
                }}
                radius="lg"
                searchable
                clearable
                comboboxProps={{
                  withinPortal: true,
                  transitionProps: { transition: "pop", duration: 200 },
                }}
                disabled={loadingUnidades || isActivoFijo}
                className="flex-1"
              />
              <ActionIcon
                size={"lg"}
                radius="lg"
                variant="filled"
                color="indigo"
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors"
                onClick={openAddUnidad}
                disabled={isActivoFijo}
              >
                <PlusIcon className="w-5 h-5 text-white" />
              </ActionIcon>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isActivoFijo ? (
              <m.div
                key="prefijo-field"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TextInput
                  label={<LabelForm text="Prefijo (Activo Fijo)" />}
                  placeholder="Ej: SCOO"
                  maxLength={100}
                  value={form.prefijo || ""}
                  onChange={(e) =>
                    setField("prefijo", e.currentTarget.value.toUpperCase())
                  }
                  classNames={{
                    input:
                      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 h-10",
                  }}
                  radius="lg"
                />
              </m.div>
            ) : (
              <m.div
                key="stock-field"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <NumberInput
                  label={<LabelForm text={`Stock Mínimo`} />}
                  placeholder="0"
                  value={form.stock_minimo_base}
                  onChange={(val) => setField("stock_minimo_base", Number(val))}
                  classNames={{
                    input:
                      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 h-10",
                  }}
                  radius="lg"
                  min={0}
                />
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={<LabelForm text="Moneda" required />}
            placeholder="Seleccione"
            data={[
              { value: Moneda.Soles, label: "Soles (S/.)" },
              { value: Moneda.Dolares, label: "Dólares ($)" },
            ]}
            value={form.moneda}
            onChange={(val) =>
              setField("moneda", (val ?? Moneda.Soles) as Moneda)
            }
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 h-10",
            }}
            radius="lg"
            allowDeselect={false}
            comboboxProps={{
              withinPortal: true,
              transitionProps: { transition: "pop", duration: 200 },
            }}
          />

          <NumberInput
            label={
              <LabelForm
                text={`Costo promedio x ${
                  unidades.find(
                    (u) => u.id_unidad_medida === form.id_unidad_medida_base,
                  )?.nombre || "---"
                }`}
              />
            }
            leftSection={
              <Text size="sm" fw={600} className="text-zinc-300">
                {form.moneda === Moneda.Soles ? "S/." : "$"}
              </Text>
            }
            placeholder="0.00"
            value={form.costo_promedio_base}
            onChange={(val) => setField("costo_promedio_base", Number(val))}
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 h-10",
            }}
            radius="lg"
            min={0}
            fixedDecimalScale
          />
        </div>

        <div className="border border-zinc-800/80 rounded-2xl p-5 space-y-6 mt-2 bg-zinc-950/20">
          <Text
            size="xs"
            fw={700}
            className="text-zinc-300 tracking-widest uppercase"
          >
            Indicadores del Producto
          </Text>

          <Group grow gap="xl" mt={"12px"}>
            {!en_modo_auditable && (
              <Checkbox
                label="Auditable"
                description="Ocultar en las auditorías."
                checked={!!form.es_auditable}
                onChange={(e) =>
                  setField("es_auditable", e.currentTarget.checked)
                }
                color="red"
                radius="sm"
                size="sm"
                classNames={{
                  label:
                    "text-zinc-300 text-[13px] font-medium leading-none mt-0.5",
                  description: "text-zinc-400 text-[11px] mt-0.5",
                }}
              />
            )}

            <Checkbox
              label="Perecible"
              description="Habilita campos de vencimiento"
              checked={!!form.es_perecible}
              onChange={(e) =>
                setField("es_perecible", e.currentTarget.checked)
              }
              color="orange"
              radius="sm"
              size="sm"
              classNames={{
                label:
                  "text-zinc-300 text-[13px] font-medium leading-none mt-0.5",
                description: "text-zinc-400 text-[11px] mt-0.5",
              }}
              disabled={isActivoFijo}
            />

            <Checkbox
              label="Mantenimiento"
              description="Usado para mantenimiento."
              checked={!!form.para_mantenimiento}
              onChange={(e) =>
                setField("para_mantenimiento", e.currentTarget.checked)
              }
              color="indigo"
              radius="sm"
              size="sm"
              classNames={{
                label:
                  "text-zinc-300 text-[13px] font-medium leading-none mt-0.5",
                description: "text-zinc-400 text-[11px] mt-0.5",
              }}
            />
          </Group>

          <AnimatePresence>
            {form.es_perecible && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-zinc-800/80 space-y-3">
                  <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-4 flex gap-3">
                    <InformationCircleIcon className="size-5 text-indigo-400 shrink-0 mt-0.5" />
                    <Text size="sm" className="text-indigo-100 font-medium">
                      Define con cuánta antelación deseas recibir avisos antes
                      del vencimiento real.
                    </Text>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="shrink-0">
                      <LabelForm text="Anticipar alerta por" required />
                    </div>
                    <div className="flex flex-1 max-w-[280px] gap-2.5">
                      <NumberInput
                        placeholder="Cant."
                        value={form.tiempo_espera_vencimiento || undefined}
                        onChange={(val) =>
                          setField("tiempo_espera_vencimiento", Number(val))
                        }
                        classNames={{
                          input:
                            "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 h-10 rounded-r-none border-r-0",
                        }}
                        radius="lg"
                        min={1}
                        className="flex-1"
                      />
                      <Select
                        placeholder="Periodo"
                        data={[
                          { value: Periodo.Diario, label: "Día(s)" },
                          { value: Periodo.Semanal, label: "Semana(s)" },
                          { value: Periodo.Mensual, label: "Mes(es)" },
                          { value: Periodo.Anual, label: "Año(s)" },
                        ]}
                        value={form.periodo_espera_vencimiento}
                        onChange={(val) =>
                          setField("periodo_espera_vencimiento", val)
                        }
                        classNames={{
                          input:
                            "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 h-10 rounded-l-none",
                        }}
                        radius="lg"
                        comboboxProps={{
                          withinPortal: true,
                          transitionProps: { transition: "pop", duration: 200 },
                        }}
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <Group justify="flex-end" gap="md" mt="xl">
          <Button
            variant="subtle"
            onClick={onCancel}
            disabled={loading}
            radius="lg"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            Cancelar
          </Button>
          <Button
            loading={loading}
            onClick={handleSubmit}
            radius="lg"
            size="sm"
            className="bg-linear-to-r from-zinc-100 to-zinc-300 text-zinc-900 font-semibold hover:from-white hover:to-zinc-200 shadow-lg border-0"
          >
            {isEdit ? "Guardar Cambios" : "Registrar Producto"}
          </Button>
        </Group>

        {/* MODAL CREAR CATEGORÍA */}
        <ModalEstandar
          opened={openedAddCat}
          close={closeAddCat}
          title="Nueva Categoría"
          size="md"
          validateClose
          zIndex={1001} // Para que se vea por encima del modal de producto
        >
          <FormCategoria
            onSuccess={(nueva) => {
              cargarCategorias();
              setField("id_categoria", nueva.id_categoria);
              closeAddCat();
            }}
            onCancel={closeAddCat}
          />
        </ModalEstandar>

        {/* MODAL CREAR UNIDAD DE MEDIDA */}
        <ModalEstandar
          opened={openedAddUnidad}
          close={closeAddUnidad}
          title="Nueva Unidad de Medida"
          validateClose
          size="sm"
          zIndex={1001}
        >
          <FormUnidadMedida
            onSuccess={(nueva) => {
              cargarUnidades();
              setField("id_unidad_medida_base", nueva.id_unidad_medida);
              closeAddUnidad();
            }}
            onCancel={closeAddUnidad}
          />
        </ModalEstandar>
      </Stack>
    </LazyMotion>
  );
};
