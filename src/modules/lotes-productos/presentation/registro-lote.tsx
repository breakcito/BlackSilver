import {
  Button,
  Group,
  NumberInput,
  Select,
  Text,
  Textarea,
  Paper,
  Divider,
  TextInput,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  ArchiveBoxIcon,
  ScaleIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useDisclosure } from "@mantine/hooks";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistroProducto } from "../../productos/presentation/registro-producto";
import { enPlural } from "../../../shared/functions/en-plural";
import { useRegistroLote } from "../hooks/useRegistroLote";
import type { RES_Lote } from "../service/lotes.responses";
import type { RES_Almacen } from "../../../service/responses/almacen";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";

import { EstadoBase } from "../../../shared/enums/_generic/estado-base";

interface RegistroLoteProps {
  onSuccess: (lotes: RES_Lote[]) => void;
  onCancel: () => void;
  initialAlmacenId?: number | null;
  almacenes: RES_Almacen[];
}

export const RegistroLote = ({
  onSuccess,
  onCancel,
  initialAlmacenId,
  almacenes,
}: RegistroLoteProps) => {
  const [
    openedAddProducto,
    { open: openAddProducto, close: closeAddProducto },
  ] = useDisclosure(false);

  const {
    idAlmacen,
    setIdAlmacen,
    filas,
    anadirFila,
    eliminarFila,
    actualizarFila,
    loadingProductos,
    loadingUnidades,
    submitting,
    error,
    catalogs,
    derivadosPorFila,
    handleSubmit,
    recargarProductos,
  } = useRegistroLote({ initialAlmacenId, almacenes, onSuccess });

  const inputClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500",
    dropdown:
      "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
    option:
      "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
    label: "text-zinc-300 mb-1 font-medium",
    description: "text-zinc-500 text-[11px] mt-1",
  };

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4 p-1">
      {/* ============ CABECERA: solo almacen ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Almacén de Destino"
          placeholder="Seleccione almacén de destino..."
          withAsterisk
          className="md:col-span-2"
          data={almacenes.map((a) => ({
            value: String(a.id_almacen),
            label: a.nombre,
          }))}
          searchable
          value={idAlmacen ? String(idAlmacen) : null}
          onChange={(val) => setIdAlmacen(Number(val))}
          classNames={inputClasses}
          radius="lg"
          size="xs"
          comboboxProps={{
            withinPortal: true,
            zIndex: 9999,
            transitionProps: { transition: "pop", duration: 200 },
          }}
        />
      </div>

      <Divider className="border-zinc-800/40" />

      {/* ============ FILAS: un lote por cada item del array ============ */}
      <div className="space-y-6">
        {filas.map((fila, index) => {
          const derivados = derivadosPorFila[index];
          const esUltima = filas.length > 1;
          return (
            <Paper
              key={index}
              withBorder
              radius="lg"
              p="md"
              className="bg-zinc-900/30 border-zinc-800/60 shadow-sm space-y-3 relative"
            >
              {/* Encabezado de la fila */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="light"
                    color="indigo"
                    radius="lg"
                    size="compact-xs"
                    leftSection={<PlusIcon className="w-3.5 h-3.5" />}
                    onClick={anadirFila}
                    disabled={submitting}
                    className="font-bold"
                  >
                    Añadir lote
                  </Button>
                  <Text
                    size="10px"
                    fw={800}
                    c="indigo.4"
                    className="uppercase tracking-[0.2em] leading-none"
                  >
                    Lote #{index + 1}
                  </Text>
                </div>
                {esUltima && (
                  <Tooltip label="Eliminar este lote" position="left">
                    <ActionIcon
                      size="md"
                      radius="lg"
                      variant="subtle"
                      color="red"
                      onClick={() => eliminarFila(index)}
                      disabled={submitting}
                      className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                      aria-label={`Eliminar lote ${index + 1}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </ActionIcon>
                  </Tooltip>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Producto */}
                <div className="flex flex-col gap-1">
                  <Text size="xs" className={inputClasses.label}>
                    Producto a ingresar{" "}
                    <span className="text-red-500">*</span>
                  </Text>
                  <div className="flex gap-2 items-center">
                    <Select
                      placeholder="Buscar producto..."
                      data={catalogs.productos.map((p) => ({
                        value: String(p.id_producto),
                        label: p.nombre,
                      }))}
                      searchable
                      disabled={loadingProductos}
                      value={
                        fila.id_producto ? String(fila.id_producto) : null
                      }
                      onChange={(val) =>
                        actualizarFila(index, {
                          id_producto: Number(val),
                        })
                      }
                      classNames={inputClasses}
                      radius="lg"
                      size="xs"
                      comboboxProps={{
                        withinPortal: true,
                        zIndex: 9999,
                        transitionProps: { transition: "pop", duration: 200 },
                      }}
                      className="flex-1"
                    />
                    <ActionIcon
                      size="lg"
                      radius="lg"
                      variant="filled"
                      color="indigo"
                      className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors h-9"
                      onClick={openAddProducto}
                      title="Registrar nuevo producto"
                    >
                      <PlusIcon className="w-5 h-5 text-white" />
                    </ActionIcon>
                  </div>
                </div>

                {/* Unidad de Medida */}
                <Select
                  label="Unidad de Medida"
                  placeholder="Ej: Caja, Bolsa, Saco..."
                  data={catalogs.unidades.map((u) => ({
                    value: String(u.id_unidad_medida),
                    label: `${u.nombre} (${u.abreviatura})`,
                  }))}
                  searchable
                  withAsterisk
                  disabled={loadingUnidades}
                  value={
                    fila.id_unidad_medida
                      ? String(fila.id_unidad_medida)
                      : null
                  }
                  onChange={(val) =>
                    actualizarFila(index, {
                      id_unidad_medida: Number(val),
                    })
                  }
                  classNames={inputClasses}
                  radius="lg"
                  size="xs"
                  comboboxProps={{
                    withinPortal: true,
                    zIndex: 9999,
                    transitionProps: { transition: "pop", duration: 200 },
                  }}
                />

                {/* Cantidad */}
                <NumberInput
                  label={`Cantidad de ${enPlural(derivados?.unidadSeleccionada?.nombre) || "unidades"}`}
                  min={0}
                  placeholder="0"
                  fixedDecimalScale
                  withAsterisk
                  value={fila.stock_inicial}
                  onChange={(val) =>
                    actualizarFila(index, {
                      stock_inicial: Number(val),
                    })
                  }
                  classNames={inputClasses}
                  radius="lg"
                  size="xs"
                  leftSection={<ArchiveBoxIcon className="w-4 h-4 text-zinc-500" />}
                />

                {/* Contenido */}
                <NumberInput
                  label="Contenido"
                  placeholder={
                    derivados?.sonIdenticas
                      ? "1"
                      : derivados?.conversionAutomatica !== null &&
                          derivados?.conversionAutomatica !== undefined
                        ? "Auto-completado"
                        : "Ingrese el factor"
                  }
                  min={0.1}
                  fixedDecimalScale
                  withAsterisk
                  disabled={derivados?.contenidoBloqueado}
                  value={fila.contenido_por_presentacion}
                  onChange={(val) =>
                    actualizarFila(index, {
                      contenido_por_presentacion: Number(val),
                    })
                  }
                  classNames={inputClasses}
                  radius="lg"
                  size="xs"
                  leftSection={<ScaleIcon className="w-4 h-4 text-zinc-500" />}
                />

                {/* Resumen Conversion */}
                <div className="md:col-span-2 self-end">
                  <Paper
                    withBorder
                    p="sm"
                    radius="lg"
                    className="bg-zinc-900/40 border-zinc-800/60 shadow-sm space-y-2"
                  >
                    <Text
                      size="10px"
                      fw={800}
                      c="zinc.5"
                      className="uppercase tracking-[0.2em] leading-none text-zinc-500"
                    >
                      Resumen de Conversión
                    </Text>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Text
                          size="xs"
                          c="indigo.4"
                          fw={700}
                          className="uppercase tracking-tight"
                        >
                          Ingreso en lote
                        </Text>
                        <Text fw={800} size="xl" className="text-white leading-none">
                          {fila.stock_inicial || 0}{" "}
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">
                            {derivados?.unidadSeleccionada?.abreviatura || "---"}
                          </span>
                        </Text>
                      </div>
                      <div className="space-y-1">
                        <Text
                          size="xs"
                          c="pink.5"
                          fw={700}
                          className="uppercase tracking-tight"
                        >
                          Total base
                        </Text>
                        <Text fw={800} size="xl" className="text-pink-500 leading-none">
                          {derivados?.stockTotalBase ?? 0}{" "}
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">
                            {derivados?.unidadBase?.abreviatura || "---"}
                          </span>
                        </Text>
                      </div>
                    </div>
                  </Paper>
                </div>

                <Divider className="md:col-span-2 border-zinc-800/40 my-2" />

                {/* Fecha ingreso */}
                <CustomDatePicker
                  label="Fecha de ingreso"
                  placeholder="Seleccione fecha de entrada"
                  withAsterisk
                  size="xs"
                  value={fila.fecha_hora_ingreso}
                  onChange={(date) =>
                    actualizarFila(index, {
                      fecha_hora_ingreso: date as Date | null,
                    })
                  }
                />

                {/* Fecha vencimiento (solo si perecible) */}
                {derivados?.productoSeleccionado?.es_perecible ? (
                  <CustomDatePicker
                    label="Fecha de vencimiento"
                    placeholder="Seleccione fecha expiración"
                    minDate={fila.fecha_hora_ingreso || undefined}
                    size="xs"
                    value={fila.fecha_vencimiento}
                    onChange={(date) =>
                      actualizarFila(index, {
                        fecha_vencimiento: date as Date | null,
                      })
                    }
                  />
                ) : (
                  <div className="flex flex-col justify-center gap-2 p-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <InformationCircleIcon className="w-4 h-4 text-zinc-600" />
                      <Text size="xs" c="dimmed" className="italic font-medium">
                        Información de producto
                      </Text>
                    </div>
                    <Text size="xs" c="zinc.5" className="text-zinc-500 leading-snug">
                      Este producto ha sido configurado como{" "}
                      <span className="text-zinc-300 font-bold">No Perecible</span>,
                      por lo que no requiere fecha de vencimiento.
                    </Text>
                  </div>
                )}

                <Divider className="md:col-span-2 border-zinc-800/40 my-2" />

                {/* Costo */}
                <NumberInput
                  label={`Costo x ${derivados?.unidadSeleccionada?.abreviatura || "---"} (S/.)`}
                  placeholder="Ej: 15.50"
                  min={0}
                  decimalScale={2}
                  value={
                    fila.costo_por_unidad !== null &&
                    fila.costo_por_unidad !== undefined
                      ? fila.costo_por_unidad
                      : ""
                  }
                  onChange={(val) =>
                    actualizarFila(index, {
                      costo_por_unidad: val ? Number(val) : null,
                    })
                  }
                  classNames={inputClasses}
                  radius="lg"
                  size="xs"
                />

                {/* Factura */}
                <div className="grid grid-cols-2 gap-2">
                  <TextInput
                    label="Serie Factura"
                    placeholder="Ej. F001"
                    value={fila.serie_factura_compra}
                    onChange={(e) =>
                      actualizarFila(index, {
                        serie_factura_compra: e.currentTarget.value.toUpperCase(),
                      })
                    }
                    classNames={inputClasses}
                    radius="lg"
                    size="xs"
                  />
                  <TextInput
                    label="Número Factura"
                    placeholder="Ej. 000123"
                    value={fila.numero_factura_compra}
                    onChange={(e) =>
                      actualizarFila(index, {
                        numero_factura_compra: e.currentTarget.value.toUpperCase(),
                      })
                    }
                    classNames={inputClasses}
                    radius="lg"
                    size="xs"
                  />
                </div>

                <Divider className="md:col-span-2 border-zinc-800/40 my-2" />

                {/* Descripcion */}
                <Textarea
                  label="Descripción o referencia (Opcional)"
                  placeholder="Ej: Factura F-504, Guía de Remisión, Notas adicionales..."
                  className="md:col-span-2"
                  minRows={2}
                  value={fila.descripcion}
                  onChange={(e) =>
                    actualizarFila(index, {
                      descripcion: e.currentTarget.value,
                    })
                  }
                  classNames={inputClasses}
                  radius="lg"
                  size="xs"
                />
              </div>
            </Paper>
          );
        })}
      </div>

      {/* Boton Anadir Lote movido al encabezado de la primera fila */}

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl">
          <Text c="red.5" size="xs" ta="center" fw={700}>
            {error}
          </Text>
        </div>
      )}

      <Group
        justify="flex-end"
        mt="xl"
        className="pt-6 border-t border-zinc-800/40"
      >
        <Button
          variant="subtle"
          onClick={onCancel}
          disabled={submitting}
          radius="lg"
          size="xs"
          className="text-zinc-500 hover:text-white font-bold"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={submitting}
          radius="lg"
          size="xs"
          className="bg-linear-to-r from-zinc-100 to-zinc-300 text-zinc-900 font-bold hover:from-white hover:to-zinc-200 shadow-lg border-0 px-8"
        >
          {filas.length === 1
            ? "Confirmar Registro"
            : `Confirmar ${filas.length} registros`}
        </Button>
      </Group>

      {/* MODAL CREAR PRODUCTO */}
      <ModalEstandar
        opened={openedAddProducto}
        close={closeAddProducto}
        title="Nuevo Producto"
        size="lg"
        validateClose
      >
        <RegistroProducto
          productosExistentes={catalogs.productos.map((p) => ({
            id_producto: p.id_producto,
            nombre: p.nombre,
            prefijo: p.prefijo,
            id_categoria: p.id_categoria,
            categoria: p.categoria,
            clasificacion_bien: p.tipo_bien,
            id_unidad_medida_base: p.id_unidad_medida_base,
            unidad_medida_base: p.unidad_medida_base,
            unidad_medida_base_abreviatura: p.unidad_medida_base_abv,
            es_auditable: p.es_auditable,
            es_perecible: p.es_perecible,
            para_mantenimiento: p.para_mantenimiento,
            stock_minimo_base: p.stock_minimo_base,
            moneda: p.moneda,
            costo_promedio_base: p.costo_promedio_base,
            costo_promedio_base_log: null,
            tiempo_espera_vencimiento: null,
            periodo_espera_vencimiento: null,
            dias_espera_vencimiento: p.dias_espera_vencimiento,
            estado: EstadoBase.Activo,
            cambios_log: null,
          }))}
          onSuccess={(nuevo) => {
            recargarProductos();
            // Asignar el nuevo producto a la primera fila sin producto seleccionado.
            const primeraSinProducto = filas.findIndex(
              (f) => !f.id_producto,
            );
            if (primeraSinProducto !== -1) {
              actualizarFila(primeraSinProducto, {
                id_producto: nuevo.id_producto,
              });
            }
            closeAddProducto();
          }}
          onCancel={closeAddProducto}
        />
      </ModalEstandar>
    </form>
  );
};
