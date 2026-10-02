import {
  Button,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  TagsInput,
  TextInput,
  Textarea,
  Divider,
  ActionIcon,
  Tooltip,
  Loader,
  Box,
  MultiSelect,
  Switch,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useState, useMemo } from "react";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";

import type { REQ_CrearActivo } from "../../service/activos.requests";
import type { RES_ActivoFijoResumen } from "../../service/activos.responses";
import { TipoBien } from "../../../../shared/enums/_generic/tipo-bien";
import { useRegistrarActivo } from "../../hooks/useRegistrarActivo";
import { EstadoActivoFijo } from "../../../../shared/enums/activo-fijo";
import { useNotify } from "../../../../hooks/useNotify";
import { FormMarca } from "../../../../presentation/utils/form-marca";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";

type LocationType = "almacen" | "mina" | "labor";

const OPCIONES_TIPO_UBICACION: { value: LocationType; label: string }[] = [
  { value: "labor", label: "Labor" },
  { value: "mina", label: "Mina" },
  { value: "almacen", label: "Almacén" },
];

interface Props {
  onSuccess: (activo: RES_ActivoFijoResumen) => void;
  onCancel: () => void;
}

/**
 * Componente de formulario para el registro de un nuevo Activo Fijo.
 * Permite seleccionar el producto base, definir la ubicación inicial (Almacén / Mina / Labor),
 * asociar una marca, ingresar modelo, serie, código interno, especificaciones y fecha de ingreso.
 *
 * Reglas:
 * - Si la ubicación es Almacén, el estado inicial por defecto es "En Almacén".
 * - Si la ubicación es Mina, se permite seleccionar las labores a las que abastece
 *   (por defecto, todas las de esa mina).
 * - Si la ubicación es Labor Minera, se selecciona una sola labor específica.
 * - El costo de compra se autocompleta con el costo promedio del producto seleccionado.
 */
export const RegistroActivo = ({ onSuccess, onCancel }: Props) => {
  const {
    productos,
    almacenes,
    minas,
    labores,
    marcas,
    empleados,
    loadingProductos,
    loadingAlmacenes,
    loadingMinas,
    loadingLabores,
    loadingMarcas,
    loadingEmpleados,
    addMarca,
    crearActivo,
    getLaboresPorMina,
  } = useRegistrarActivo();

  const { notifyError } = useNotify();

  // Modal de Marca
  const [openedMarca, { open: openMarca, close: closeMarca }] =
    useDisclosure(false);
  const [nombreMarca, setNombreMarca] = useState("");

  // Tipo de ubicación seleccionada (Almacén / Mina / Labor)
  const [locationType, setLocationType] = useState<LocationType>("labor");

  const [saving, setSaving] = useState(false);

  /**
   * Cambia el tipo de ubicación inicial y limpia la ubicación contraria para evitar duplicados.
   * NO toca el MultiSelect de "Labores que abastece": es un campo independiente
   * que puede tener valor aunque el activo no esté físicamente en una mina.
   * @param type Tipo de ubicación seleccionada.
   */
  const handleLocationTypeChange = (type: LocationType) => {
    setLocationType(type);
    setForm((prev) => {
      // Limpiar todas las ubicaciones para que solo quede la del tipo activo
      const next = { ...prev, id_almacen: null, id_mina: null, id_labor: null };
      if (type === "almacen") {
        next.estado = EstadoActivoFijo.EnAlmacen;
      } else {
        next.estado = EstadoActivoFijo.EnUso;
      }
      return next;
    });
  };

  // Filtrar solo productos que son activos fijos
  const productosAF = useMemo(
    () => productos.filter((p) => p.tipo_bien === TipoBien.ActivoFijo),
    [productos],
  );

  const [fechaIngreso, setFechaIngreso] = useState<Date | null>(new Date());

  const [form, setForm] = useState<REQ_CrearActivo>({
    id_producto: 0,
    id_almacen: null,
    id_mina: null,
    id_labor: null,
    ids_labores_abastecidas: [],
    id_marca: null,
    codigo: "",
    numero_serie: "",
    modelo: "",
    serie_placa: "",
    numero_placa: "",
    yearcito_modelo: null,
    descripcion: "",
    especificaciones: [],
    fecha_hora_ingreso: null,
    estado: EstadoActivoFijo.EnAlmacen,
    id_empleado_responsable: null,
    serie_factura_compra: "",
    numero_factura_compra: "",
    costo_compra: null,
    evidencias: null,
  });

  const [especificaciones, setEspecificaciones] = useState<string[]>([]);

  // Labores abastecidas (solo aplica cuando locationType === "mina")
  const [idsLaboresAbastecidas, setIdsLaboresAbastecidas] = useState<number[]>(
    [],
  );
  // Bandera para saber si ya auto-seleccionamos las labores de la mina actual
  const [autoSelectMina, setAutoSelectMina] = useState(false);

  // Archivos de evidencia a subir
  const [evidenciasFiles, setEvidenciasFiles] = useState<File[]>([]);

  const selectedProd = useMemo(
    () => productosAF.find((p) => p.id_producto === form.id_producto),
    [productosAF, form.id_producto],
  );

  const isTransport = useMemo(
    () =>
      selectedProd?.para_transporte === true ||
      selectedProd?.para_transporte === 1,
    [selectedProd],
  );

  // Labores visibles en el MultiSelect de "Labores que abastece".
  // Prioridad de filtrado:
  //   1) Si la ubicación inicial es una Mina → solo labors de esa mina.
  //   2) Si la ubicación inicial es una Labor → labors de la misma mina que esa labor.
  //   3) Si no hay ubicación inicial → todas las labors (el usuario puede elegir libremente).
  const laboresAbastecidasCatalogo = useMemo(() => {
    if (form.id_mina) {
      return getLaboresPorMina(form.id_mina);
    }
    if (form.id_labor) {
      const laborActual = labores.find((l) => l.id_labor === form.id_labor);
      if (laborActual) {
        return getLaboresPorMina(laborActual.id_mina);
      }
    }
    return [...labores].sort(
      (a, b) =>
        a.mina.localeCompare(b.mina) || a.nombre.localeCompare(b.nombre),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id_mina, form.id_labor, labores]);

  // Labores visibles en el SingleSelect cuando locationType === "labor"
  const todasLasLabores = useMemo(() => {
    return [...labores].sort(
      (a, b) =>
        a.mina.localeCompare(b.mina) || a.nombre.localeCompare(b.nombre),
    );
  }, [labores]);

  // Búsqueda tolerante para el MultiSelect de labores abastecidas
  const [busquedaLaboresAbastecidas, setBusquedaLaboresAbastecidas] =
    useState("");

  const opcionesLaboresAbastecidas = useMemo(() => {
    const q = busquedaLaboresAbastecidas.trim();
    if (!q) return laboresAbastecidasCatalogo;
    return getCoincidencias(laboresAbastecidasCatalogo, q, {
      keys: ["nombre", "mina"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [laboresAbastecidasCatalogo, busquedaLaboresAbastecidas]);

  const [busquedaLabor, setBusquedaLabor] = useState("");

  const opcionesLabor = useMemo(() => {
    const q = busquedaLabor.trim();
    if (!q) return todasLasLabores;
    return getCoincidencias(todasLasLabores, q, {
      keys: ["nombre", "mina"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [todasLasLabores, busquedaLabor]);

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
    description: "text-[12px] text-zinc-400",
  };

  /**
   * Handlers legacy de clave-valor eliminados: ahora las especificaciones
   * son tags libres (string[]) gestionados por el TagsInput de Mantine.
   */

  /**
   * Maneja el cambio de producto base. Autocompleta el costo de compra con el
   * costo promedio del producto SI el usuario aún no había tipeado un costo.
   */
  const handleProductChange = (val: string | null) => {
    const idProd = val ? Number(val) : 0;
    setForm((prev) => {
      const next = { ...prev, id_producto: idProd };
      const nuevoProd = productosAF.find((p) => p.id_producto === idProd);
      // Autocompletar costo_compra con costo_promedio_base SOLO si el usuario
      // aún no había tipeado un valor manual.
      if (
        nuevoProd &&
        (prev.costo_compra === null || prev.costo_compra === undefined)
      ) {
        next.costo_compra = Number(nuevoProd.costo_promedio_base ?? 0);
      }
      return next;
    });
  };

  /**
   * Maneja el cambio de mina. Cuando el usuario selecciona una mina y el modo
   * es "abastece varias labores", preseleccionamos TODAS las labores de esa
   * mina como abastecidas (caso típico: generador que abastece múltiples labores).
   */
  const handleMinaChange = (val: string | null) => {
    const idMina = val ? Number(val) : null;
    setForm((prev) => ({
      ...prev,
      id_mina: idMina,
      id_labor: null,
      // Reset de abastecidas para forzar auto-selección de las de la nueva mina
      ids_labores_abastecidas: [],
    }));
    setIdsLaboresAbastecidas([]);
    setAutoSelectMina(false);

    if (idMina) {
      const laborsMina = getLaboresPorMina(idMina);
      const ids = laborsMina.map((l) => l.id_labor);
      setIdsLaboresAbastecidas(ids);
      setAutoSelectMina(true);
    }
  };

  /**
   * Procesa y envía los datos del activo fijo al servicio para registrarlo.
   */
  const handleSubmit = async () => {
    if (isTransport) {
      if (!form.serie_placa?.trim() || !form.numero_placa?.trim()) {
        notifyError(
          "La serie y el número de placa son obligatorios para activos de transporte.",
        );
        return;
      }
    }

    // Sincronizar ids_labores_abastecidas al payload antes de enviar
    const payload: REQ_CrearActivo = {
      ...form,
      ids_labores_abastecidas:
        locationType === "mina" ? idsLaboresAbastecidas : [],
      fecha_hora_ingreso:
        fechaIngreso && !isNaN(fechaIngreso.getTime())
          ? dayjs(fechaIngreso).format("YYYY-MM-DD HH:mm:ss")
          : null,
      // Limpiar tags vacíos antes de enviar.
      especificaciones:
        especificaciones.map((t) => t.trim()).filter((t) => t !== "").length > 0
          ? especificaciones.map((t) => t.trim()).filter((t) => t !== "")
          : null,
    };

    setSaving(true);
    try {
      const nuevoActivo = await crearActivo(payload, evidenciasFiles);
      if (nuevoActivo) {
        onSuccess(nuevoActivo);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack gap="md">
        <Grid gutter="md">
          <Grid.Col span={12}>
            <Select
              label="Producto Base"
              placeholder={
                loadingProductos
                  ? "Cargando productos..."
                  : "Seleccione el tipo de activo..."
              }
              data={productosAF.map((p) => ({
                value: String(p.id_producto),
                label: p.nombre,
              }))}
              value={form.id_producto ? String(form.id_producto) : null}
              onChange={handleProductChange}
              searchable
              required
              disabled={loadingProductos}
              rightSection={
                loadingProductos ? (
                  <Loader size="xs" color="indigo" />
                ) : undefined
              }
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={4}>
            <Select
              label="Tipo de Ubicación"
              placeholder="Seleccione..."
              data={OPCIONES_TIPO_UBICACION}
              value={locationType}
              onChange={(val) =>
                val && handleLocationTypeChange(val as LocationType)
              }
              allowDeselect={false}
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={8}>
            {locationType === "almacen" ? (
              <Select
                label="Ubicación Inicial (Almacén)"
                placeholder={
                  loadingAlmacenes ? "Cargando almacenes..." : "Opcional..."
                }
                data={almacenes.map((a) => ({
                  value: String(a.id_almacen),
                  label: a.nombre,
                }))}
                value={form.id_almacen ? String(form.id_almacen) : null}
                onChange={(val) =>
                  setForm({
                    ...form,
                    id_almacen: val ? Number(val) : null,
                    id_mina: null,
                    id_labor: null,
                    estado: val ? EstadoActivoFijo.EnAlmacen : form.estado,
                  })
                }
                clearable
                disabled={loadingAlmacenes}
                rightSection={
                  loadingAlmacenes ? (
                    <Loader size="xs" color="indigo" />
                  ) : undefined
                }
                size="xs"
                radius="lg"
                classNames={fieldClasses}
              />
            ) : locationType === "mina" ? (
              <Select
                label="Ubicación Inicial (Mina)"
                placeholder={loadingMinas ? "Cargando minas..." : "Opcional..."}
                data={minas.map((m) => ({
                  value: String(m.id_mina),
                  label: m.nombre,
                }))}
                value={form.id_mina ? String(form.id_mina) : null}
                onChange={handleMinaChange}
                clearable
                disabled={loadingMinas}
                rightSection={
                  loadingMinas ? <Loader size="xs" color="indigo" /> : undefined
                }
                size="xs"
                radius="lg"
                classNames={fieldClasses}
              />
            ) : (
              <Select
                label="Ubicación Inicial (Labor Minera)"
                placeholder={
                  loadingLabores ? "Cargando labores..." : "Opcional..."
                }
                data={opcionesLabor.map((l) => ({
                  value: String(l.id_labor),
                  label: `${l.nombre} — ${l.mina}`,
                }))}
                value={form.id_labor ? String(form.id_labor) : null}
                onChange={(val) =>
                  setForm({
                    ...form,
                    id_labor: val ? Number(val) : null,
                    id_almacen: null,
                    id_mina: null,
                    estado: val ? EstadoActivoFijo.EnUso : form.estado,
                  })
                }
                onSearchChange={setBusquedaLabor}
                searchValue={busquedaLabor}
                clearable
                searchable
                disabled={loadingLabores}
                rightSection={
                  loadingLabores ? (
                    <Loader size="xs" color="indigo" />
                  ) : undefined
                }
                nothingFoundMessage="Sin coincidencias"
                size="xs"
                radius="lg"
                classNames={fieldClasses}
              />
            )}
          </Grid.Col>

          {/* Labores que abastece este activo - independiente de la ubicación inicial */}
          <Grid.Col span={12}>
            <MultiSelect
              label={
                <Group gap={6} align="center">
                  <Box>Labores que abastece este activo</Box>
                  {autoSelectMina && (
                    <Tooltip label="Se preseleccionaron todas las labores de la mina. Puedes desmarcar las que no apliquen.">
                      <Switch
                        checked
                        onChange={(e) => {
                          if (!e.currentTarget.checked) {
                            setIdsLaboresAbastecidas([]);
                            setAutoSelectMina(false);
                          }
                        }}
                        size="xs"
                        color="indigo"
                        label="Todas"
                        classNames={{
                          label:
                            "text-[10px] text-indigo-300 font-bold uppercase tracking-widest",
                        }}
                      />
                    </Tooltip>
                  )}
                </Group>
              }
              placeholder={
                loadingLabores
                  ? "Cargando labores..."
                  : "Selecciona las labores..."
              }
              data={opcionesLaboresAbastecidas.map((l) => ({
                value: String(l.id_labor),
                label: l.nombre,
              }))}
              value={idsLaboresAbastecidas.map(String)}
              onChange={(vals) => setIdsLaboresAbastecidas(vals.map(Number))}
              onSearchChange={setBusquedaLaboresAbastecidas}
              searchValue={busquedaLaboresAbastecidas}
              searchable
              clearable
              disabled={loadingLabores}
              nothingFoundMessage="Sin coincidencias"
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Group gap={6} align="flex-end" wrap="nowrap">
              <Select
                className="flex-1"
                label="Marca"
                placeholder={
                  loadingMarcas ? "Cargando marcas..." : "Seleccione o cree..."
                }
                data={marcas.map((m) => ({
                  value: String(m.id_marca),
                  label: m.nombre,
                }))}
                value={form.id_marca ? String(form.id_marca) : null}
                onChange={(val) =>
                  setForm({ ...form, id_marca: val ? Number(val) : null })
                }
                searchable
                disabled={loadingMarcas}
                rightSection={
                  loadingMarcas ? (
                    <Loader size="xs" color="indigo" />
                  ) : undefined
                }
                size="xs"
                radius="lg"
                classNames={fieldClasses}
              />
              <Tooltip label="Nueva Marca">
                <ActionIcon
                  onClick={openMarca}
                  variant="filled"
                  color="indigo.6"
                  size={32}
                  radius="lg"
                  className="mb-0.75"
                >
                  <PlusIcon className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Modelo"
              placeholder="Ej. Hilux 4x4"
              value={form.modelo || ""}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Código Interno"
              placeholder="Ej: AF-001"
              value={form.codigo || ""}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Número de Serie"
              placeholder="S/N del fabricante"
              value={form.numero_serie || ""}
              onChange={(e) =>
                setForm({ ...form, numero_serie: e.target.value })
              }
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={4}>
            <NumberInput
              label="Año del Modelo"
              value={form.yearcito_modelo || undefined}
              onChange={(val) =>
                setForm({ ...form, yearcito_modelo: Number(val) })
              }
              hideControls
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={4}>
            <TextInput
              label="Serie de Placa"
              placeholder="Ej. AAA"
              value={form.serie_placa || ""}
              onChange={(e) =>
                setForm({ ...form, serie_placa: e.target.value.toUpperCase() })
              }
              maxLength={3}
              required={isTransport}
              disabled={!isTransport}
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={4}>
            <TextInput
              label="Número de Placa"
              placeholder="Ej. 123"
              value={form.numero_placa || ""}
              onChange={(e) =>
                setForm({ ...form, numero_placa: e.target.value.toUpperCase() })
              }
              maxLength={3}
              required={isTransport}
              disabled={!isTransport}
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <DateTimePicker
              label="Fecha de Ingreso"
              value={fechaIngreso}
              onChange={(val) => setFechaIngreso(val ? new Date(val) : null)}
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Select
              label="Estado Inicial"
              placeholder="Seleccione el estado..."
              data={[
                { value: EstadoActivoFijo.EnUso, label: "En Uso" },
                {
                  value: EstadoActivoFijo.EnMantenimiento,
                  label: "En Mantenimiento",
                },
                { value: EstadoActivoFijo.EnAlmacen, label: "En Almacén" },
                { value: EstadoActivoFijo.DadoDeBaja, label: "Dado de Baja" },
              ]}
              value={form.estado || EstadoActivoFijo.EnAlmacen}
              onChange={(val) =>
                setForm({ ...form, estado: val as EstadoActivoFijo })
              }
              required
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Select
              label="Empleado Responsable"
              placeholder={
                loadingEmpleados
                  ? "Cargando empleados..."
                  : "Seleccione un responsable..."
              }
              data={empleados.map((e) => ({
                value: String(e.id_empleado),
                label: e.nombre_completo,
              }))}
              value={
                form.id_empleado_responsable
                  ? String(form.id_empleado_responsable)
                  : null
              }
              onChange={(val) =>
                setForm({
                  ...form,
                  id_empleado_responsable: val ? Number(val) : null,
                })
              }
              clearable
              searchable
              disabled={loadingEmpleados}
              rightSection={
                loadingEmpleados ? (
                  <Loader size="xs" color="indigo" />
                ) : undefined
              }
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <NumberInput
              label="Costo de Compra"
              placeholder="Costo en Soles"
              // description={
              //   selectedProd?.costo_promedio_base
              //     ? "Autocompletado con el costo promedio del producto"
              //     : undefined
              // }
              value={
                form.costo_compra !== null && form.costo_compra !== undefined
                  ? form.costo_compra
                  : ""
              }
              onChange={(val) =>
                setForm({ ...form, costo_compra: val ? Number(val) : null })
              }
              hideControls
              decimalScale={2}
              min={0}
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Serie Factura"
              placeholder="Ej. F001"
              value={form.serie_factura_compra || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  serie_factura_compra: e.target.value.toUpperCase(),
                })
              }
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Número Factura"
              placeholder="Ej. 000123"
              value={form.numero_factura_compra || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  numero_factura_compra: e.target.value.toUpperCase(),
                })
              }
              size="xs"
              radius="lg"
              classNames={fieldClasses}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Textarea
              label="Descripción / Notas"
              placeholder="Detalles adicionales del activo..."
              value={form.descripcion || ""}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              size="xs"
              radius="lg"
              minRows={2}
              classNames={fieldClasses}
            />
          </Grid.Col>
        </Grid>

        {/* Evidencias: fotos, facturas, documentos */}
        <Divider label="Evidencias" labelPosition="center" color="zinc.8" />
        <MultiFilePicker
          files={evidenciasFiles}
          onFilesChange={setEvidenciasFiles}
          label="Adjuntar evidencias"
          description="Fotos, facturas u otros documentos relacionados al activo"
        />

        <Divider
          label="Especificaciones / Etiquetas"
          labelPosition="center"
          color="zinc.8"
        />

        <TagsInput
          label="Especificaciones del Activo"
          description="Escribe cada etiqueta y sepáralas con coma o Enter."
          placeholder={
            especificaciones.length === 0
              ? "Ej: motor 2.8L, diesel, 4x4"
              : "Añadir otra etiqueta..."
          }
          value={especificaciones}
          onChange={setEspecificaciones}
          acceptValueOnBlur
          clearable
          size="sm"
          radius="lg"
          classNames={fieldClasses}
        />

        <Group justify="flex-end" mt="xl">
          <Button
            variant="subtle"
            color="zinc.5"
            onClick={onCancel}
            disabled={saving}
            size="xs"
            radius="lg"
          >
            Cancelar
          </Button>
          <Button
            color="indigo.6"
            onClick={handleSubmit}
            disabled={!form.id_producto}
            loading={saving}
            size="xs"
            radius="lg"
          >
            Guardar Activo
          </Button>
        </Group>
      </Stack>

      {/* Modal para Crear Marca */}
      <ModalEstandar
        validateClose
        opened={openedMarca}
        close={closeMarca}
        title="Registrar Nueva Marca"
        size="sm"
      >
        <FormMarca
          nombre={nombreMarca}
          setNombre={setNombreMarca}
          marcasExistentes={marcas}
          onSuccess={(nuevaMarca) => {
            addMarca(nuevaMarca);
            setForm((prev) => ({ ...prev, id_marca: nuevaMarca.id_marca }));
            closeMarca();
            setNombreMarca("");
          }}
        />
      </ModalEstandar>
    </>
  );
};
