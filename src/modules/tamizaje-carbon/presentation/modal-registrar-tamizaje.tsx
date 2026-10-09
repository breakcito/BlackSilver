import {
  ActionIcon,
  Badge,
  Button,
  FileInput,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  CheckIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { useNotify } from "../../../hooks/useNotify";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import type {
  RES_TipoCarbon,
  RES_VarianteCarbon,
} from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { RES_Empleado } from "../../../service/responses/empleado";
import type {
  CargaCarbonPendienteItem,
  TamizajeCarbonItem,
} from "../service/tamizaje-carbon.responses";

interface VarianteFila {
  id_tipo_variante: string | null;
  cantidad_extraida: number | string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onGuardado: (item: TamizajeCarbonItem) => void;
}

const estilitos = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown: "bg-zinc-900 border-zinc-800",
  option: "text-zinc-300 hover:bg-zinc-800",
};

export const ModalRegistrarTamizaje = ({
  opened,
  onClose,
  onGuardado,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  // Masters
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [tiposCarbon, setTiposCarbon] = useState<RES_TipoCarbon[]>([]);
  const [supervisores, setSupervisores] = useState<RES_Empleado[]>([]);
  const [cargasPendientes, setCargasPendientes] = useState<
    CargaCarbonPendienteItem[]
  >([]);

  // Origen: 'carga' (recepción de carbón) | 'stock' (stock actual en almacén)
  const [origen, setOrigen] = useState<"carga" | "stock">("carga");
  const [idCarga, setIdCarga] = useState<string | null>(null);

  // Form state
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idTipoPadre, setIdTipoPadre] = useState<string | null>(null);
  const [idSupervisor, setIdSupervisor] = useState<string | null>(null);
  const [cantidadTamizada, setCantidadTamizada] = useState<number | string>("");
  const [fechaHora, setFechaHora] = useState(
    dayjs().format("YYYY-MM-DD HH:mm"),
  );
  const [archivos, setArchivos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Variantes específicas que salen del carbón padre seleccionado
  const [variantesPadre, setVariantesPadre] = useState<RES_VarianteCarbon[]>([]);
  const [loadingVariantes, setLoadingVariantes] = useState(false);

  // Dynamic variants rows
  const [variantes, setVariantes] = useState<VarianteFila[]>([
    { id_tipo_variante: null, cantidad_extraida: "" },
  ]);

  // Load masters when modal opens
  useEffect(() => {
    if (!opened) return;
    const fetchMaestros = async () => {
      try {
        const [resAlm, resTipos, resEmp, resCargas] = await Promise.all([
          AuxService.get_almacenes({ para_carbon: true }),
          TipoCarbonService.getTipos(),
          AuxService.get_empleados(),
          TamizajeCarbonService.getCargasPendientes(),
        ]);
        if (resAlm?.data) {
          const list = resAlm.data;
          setAlmacenes(list);
          if (list.length > 0 && !idAlmacen) {
            setIdAlmacen(String(list[0].id_almacen));
          }
        }
        if (resTipos?.data) setTiposCarbon(resTipos.data);
        if (resEmp?.data) setSupervisores(resEmp.data);
        if (resCargas?.data) setCargasPendientes(resCargas.data);
      } catch (err) {
        console.error("Error al cargar maestros para tamizaje", err);
      }
    };
    fetchMaestros();
  }, [opened, idAlmacen]);

  // Load specific variants when parent coal type changes
  useEffect(() => {
    if (!idTipoPadre) {
      setVariantesPadre([]);
      return;
    }
    const fetchVariantes = async () => {
      setLoadingVariantes(true);
      try {
        const resp = await TipoCarbonService.getVariantes(Number(idTipoPadre));
        if (resp.success && resp.data) {
          setVariantesPadre(resp.data);
        } else {
          setVariantesPadre([]);
        }
      } catch (err) {
        console.error("Error al cargar variantes del carbón", err);
        setVariantesPadre([]);
      } finally {
        setLoadingVariantes(false);
      }
    };
    fetchVariantes();
  }, [idTipoPadre]);

  // Reset form when modal closes
  useEffect(() => {
    if (!opened) {
      setOrigen("carga");
      setIdCarga(null);
      setIdTipoPadre(null);
      setIdSupervisor(null);
      setCantidadTamizada("");
      setFechaHora(dayjs().format("YYYY-MM-DD HH:mm"));
      setArchivos([]);
      setVariantesPadre([]);
      setVariantes([{ id_tipo_variante: null, cantidad_extraida: "" }]);
    }
  }, [opened]);

  // Handle adding / removing variant rows
  const handleAddVariante = () => {
    setVariantes((prev) => [
      ...prev,
      { id_tipo_variante: null, cantidad_extraida: "" },
    ]);
  };

  const handleRemoveVariante = (index: number) => {
    setVariantes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateVariante = (
    index: number,
    field: keyof VarianteFila,
    val: unknown,
  ) => {
    setVariantes((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row)),
    );
  };

  // Calculations
  const cantTamizadaNum = Number(cantidadTamizada) || 0;

  const totalExtraido = useMemo(() => {
    return variantes.reduce(
      (acc, v) => acc + (Number(v.cantidad_extraida) || 0),
      0,
    );
  }, [variantes]);

  const mermaDesecho = useMemo(() => {
    return Math.max(0, cantTamizadaNum - totalExtraido);
  }, [cantTamizadaNum, totalExtraido]);

  const rendimientoPorc = useMemo(() => {
    if (cantTamizadaNum <= 0) return 0;
    return Math.min(100, (totalExtraido / cantTamizadaNum) * 100);
  }, [cantTamizadaNum, totalExtraido]);

  // Submit
  const handleSubmit = async () => {
    if (!idAlmacen) {
      notifyError("Debe seleccionar el almacén");
      return;
    }
    if (!idTipoPadre) {
      notifyError("Debe seleccionar el tipo de carbón a tamizar");
      return;
    }
    if (cantTamizadaNum <= 0) {
      notifyError("La cantidad a tamizar debe ser mayor a cero");
      return;
    }

    const variantesValidas = variantes.filter(
      (v) => v.id_tipo_variante && Number(v.cantidad_extraida) > 0,
    );

    if (variantesValidas.length === 0) {
      notifyError(
        "Debe registrar al menos una variante extraída con cantidad válida",
      );
      return;
    }

    setSubmitting(true);
    try {
      const resp = await TamizajeCarbonService.registrarTamizaje({
        id_almacen: Number(idAlmacen),
        id_tipo_carbon: Number(idTipoPadre),
        id_empleado_supervisor: idSupervisor ? Number(idSupervisor) : undefined,
        id_carga_compra_carbon:
          origen === "carga" && idCarga ? Number(idCarga) : undefined,
        cantidad_tamizada: cantTamizadaNum,
        es_retamizaje: origen === "stock",
        fecha_hora_tamizaje: fechaHora,
        variantes: variantesValidas.map((v) => ({
          id_tipo_variante: Number(v.id_tipo_variante),
          cantidad_extraida: Number(v.cantidad_extraida),
        })),
        evidencias: archivos.length > 0 ? archivos : undefined,
      });

      if (resp.success && resp.data) {
        notifySuccess("Tamizaje registrado correctamente");
        onGuardado(resp.data);
        onClose();
      } else {
        notifyError(resp.message || "Error al registrar el tamizaje");
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al registrar el tamizaje");
    } finally {
      setSubmitting(false);
    }
  };

  const almacenesOptions = useMemo(
    () =>
      almacenes.map((a) => ({
        value: String(a.id_almacen),
        label: a.nombre,
      })),
    [almacenes],
  );

  const tiposCarbonOptions = useMemo(() => {
    const ordenados = [...tiposCarbon].sort((a, b) => {
      const aCompra = a.para_compra ? 1 : 0;
      const bCompra = b.para_compra ? 1 : 0;
      if (aCompra !== bCompra) return bCompra - aCompra;
      return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    });

    return ordenados.map((t) => ({
      value: String(t.id_tipo_carbon),
      label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}${t.para_compra ? "" : ""}`,
    }));
  }, [tiposCarbon]);

  const supervisoresOptions = useMemo(
    () =>
      supervisores.map((s) => ({
        value: String(s.id_empleado),
        label: s.dni ? `${s.nombre_completo} (${s.dni})` : s.nombre_completo,
      })),
    [supervisores],
  );

  const cargasOptions = useMemo(
    () =>
      cargasPendientes.map((c) => ({
        value: String(c.id_carga_compra_carbon),
        label: `${c.tipo_carbon_nombre} · ${formatNumber(c.cantidad)} TN · OC: ${c.compra_correlativo}${c.codigo_ticket_balanza ? ` · Ticket: ${c.codigo_ticket_balanza}` : ""}${c.placa ? ` · ${c.placa}` : ""}`,
      })),
    [cargasPendientes],
  );

  // Opciones de variantes estrictamente obtenidas del tipo de carbón padre
  const variantesDisponiblesOptions = useMemo(
    () =>
      variantesPadre.map((v) => ({
        value: String(v.id_tipo_variante),
        label: `${v.nombre}${v.codigo ? ` (${v.codigo})` : ""}`,
      })),
    [variantesPadre],
  );

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title="Registrar Tamizaje de Carbón"
      size="xl"
      validateClose
    >
      <Stack gap="md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Ocupa 1 columna */}
          <div className="col-span-1">
            <Select
              label="Origen del carbón"
              data={[
                { value: "carga", label: "Carga de carbón" },
                { value: "stock", label: "Stock actual" },
              ]}
              value={origen}
              onChange={(val) => {
                const next = (val as "carga" | "stock") || "carga";
                setOrigen(next);
                if (next === "stock") {
                  setIdCarga(null);
                }
              }}
              allowDeselect={false}
              radius="lg"
              size="xs"
              classNames={estilitos}
            />
          </div>

          {/* Ocupa 2 columnas */}
          <div className="col-span-1 md:col-span-2">
            <Select
              label="Carga de carbón a procesar"
              placeholder={
                origen === "carga"
                  ? cargasPendientes.length > 0
                    ? "Seleccione una carga no tamizada..."
                    : "No hay cargas pendientes de tamizaje"
                  : "No aplica (se toma del stock actual)"
              }
              data={cargasOptions}
              value={idCarga}
              onChange={(val) => {
                setIdCarga(val);
                if (val) {
                  const c = cargasPendientes.find(
                    (item) => String(item.id_carga_compra_carbon) === val,
                  );
                  if (c) {
                    if (c.id_almacen) setIdAlmacen(String(c.id_almacen));
                    if (c.id_tipo_carbon)
                      setIdTipoPadre(String(c.id_tipo_carbon));
                    setCantidadTamizada(c.cantidad);
                  }
                }
              }}
              disabled={origen === "stock"}
              clearable={origen === "carga"}
              searchable={origen === "carga"}
              comboboxProps={{ withinPortal: true }}
              nothingFoundMessage="No se encontraron cargas pendientes"
              radius="lg"
              size="xs"
              classNames={estilitos}
            />
          </div>
        </div>
        {/* Datos Principales */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {/* Almacén */}
          <Select
            label="Almacén de proceso"
            placeholder="Seleccione almacén"
            data={almacenesOptions}
            value={idAlmacen}
            onChange={setIdAlmacen}
            required
            searchable
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No se encontraron almacenes"
            leftSection={
              <BuildingStorefrontIcon className="w-4 h-4 text-zinc-500" />
            }
            radius="lg"
            size="xs"
            classNames={estilitos}
          />

          {/* Tipo de carbón padre a tamizar */}
          <Select
            label="Tipo de carbón"
            placeholder="Seleccione tipo de carbón"
            data={tiposCarbonOptions}
            value={idTipoPadre}
            onChange={(val) => {
              setIdTipoPadre(val);
              setVariantes([{ id_tipo_variante: null, cantidad_extraida: "" }]);
            }}
            required
            searchable
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No se encontraron tipos de carbón"
            radius="lg"
            size="xs"
            classNames={estilitos}
          />

          {/* Cantidad a tamizar */}
          <NumberInput
            label="Cantidad a tamizar (TN)"
            placeholder="0.00"
            value={cantidadTamizada}
            onChange={setCantidadTamizada}
            required
            radius="lg"
            size="xs"
            classNames={estilitos}
          />

          {/* Supervisor a cargo */}
          <Select
            label="Supervisor a cargo"
            placeholder="Opcional"
            data={supervisoresOptions}
            value={idSupervisor}
            onChange={setIdSupervisor}
            clearable
            searchable
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No se encontraron empleados"
            leftSection={<UserIcon className="w-4 h-4 text-zinc-500" />}
            radius="lg"
            size="xs"
            classNames={estilitos}
          />

          {/* Fecha y hora */}
          <TextInput
            label="Fecha y hora"
            placeholder="YYYY-MM-DD HH:mm"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.currentTarget.value)}
            leftSection={<CalendarDaysIcon className="w-4 h-4 text-zinc-500" />}
            required
            radius="lg"
            size="xs"
            classNames={estilitos}
          />
        </SimpleGrid>

        {/* Sección Variantes Extraídas */}
        <Paper className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
          <Group justify="space-between" align="center" mb="xs">
            <div>
              <Text size="sm" fw={700} className="text-white">
                Variantes Extraídas
              </Text>
              <Text size="xs" c="gray">
                Seleccione las variantes autorizadas para el tipo de carbón a
                procesar.
              </Text>
            </div>
            <Button
              variant="light"
              color="teal"
              size="xs"
              radius="lg"
              disabled={
                !idTipoPadre ||
                loadingVariantes ||
                variantesDisponiblesOptions.length === 0
              }
              leftSection={<PlusIcon className="w-3.5 h-3.5" />}
              onClick={handleAddVariante}
            >
              Agregar Variante
            </Button>
          </Group>

          {idTipoPadre &&
            !loadingVariantes &&
            variantesDisponiblesOptions.length === 0 && (
              <Paper className="bg-yellow-950/20 border border-yellow-800/40 p-2.5 rounded-lg mb-3">
                <Text size="xs" c="yellow.4" fw={500}>
                  Este tipo de carbón no tiene variantes configuradas en el
                  catálogo de tipos de carbón.
                </Text>
              </Paper>
            )}

          <Table highlightOnHover withTableBorder={false} verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th className="text-zinc-400 text-xs font-semibold">
                  Variante Resultante
                </Table.Th>
                <Table.Th className="text-zinc-400 text-xs font-semibold w-40">
                  Cantidad (TN)
                </Table.Th>
                <Table.Th className="text-zinc-400 text-xs font-semibold w-28 text-center">
                  Rendimiento
                </Table.Th>
                <Table.Th className="w-12 text-center" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {variantes.map((v, idx) => {
                const varTN = Number(v.cantidad_extraida) || 0;
                const pct =
                  cantTamizadaNum > 0
                    ? Math.round((varTN / cantTamizadaNum) * 100 * 10) / 10
                    : 0;

                return (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <Select
                        placeholder={
                          !idTipoPadre
                            ? "Primero seleccione el carbón padre..."
                            : loadingVariantes
                              ? "Cargando variantes..."
                              : "Seleccione variante"
                        }
                        data={variantesDisponiblesOptions}
                        value={v.id_tipo_variante}
                        onChange={(val) =>
                          handleUpdateVariante(idx, "id_tipo_variante", val)
                        }
                        searchable
                        comboboxProps={{ withinPortal: true }}
                        nothingFoundMessage="No hay variantes configuradas para este carbón"
                        disabled={
                          !idTipoPadre ||
                          loadingVariantes ||
                          variantesDisponiblesOptions.length === 0
                        }
                        size="xs"
                        radius="lg"
                        classNames={estilitos}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        placeholder="0.00"
                        value={v.cantidad_extraida}
                        onChange={(val) =>
                          handleUpdateVariante(idx, "cantidad_extraida", val)
                        }
                        min={0}
                        decimalScale={4}
                        size="xs"
                        radius="lg"
                        classNames={estilitos}
                      />
                    </Table.Td>
                    <Table.Td align="center">
                      <Badge variant="light" color="indigo" radius="sm">
                        {pct}%
                      </Badge>
                    </Table.Td>
                    <Table.Td align="center">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="md"
                        radius="lg"
                        disabled={variantes.length === 1}
                        onClick={() => handleRemoveVariante(idx)}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {/* Resumen de Balance */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs" mt="md">
            <Paper className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-lg text-center">
              <Text size="xs" c="dimmed">
                Total Extraído
              </Text>
              <Text size="sm" fw={800} className="text-teal-400 font-mono">
                {formatNumber(totalExtraido)} TN
              </Text>
            </Paper>
            <Paper className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-lg text-center">
              <Text size="xs" c="dimmed">
                Merma / Desecho
              </Text>
              <Text size="sm" fw={800} className="text-yellow-400 font-mono">
                {formatNumber(mermaDesecho)} TN
              </Text>
            </Paper>
            <Paper className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-lg text-center">
              <Text size="xs" c="dimmed">
                Rendimiento Total
              </Text>
              <Text size="sm" fw={800} className="text-indigo-400 font-mono">
                {formatNumber(rendimientoPorc)}%
              </Text>
            </Paper>
          </SimpleGrid>
        </Paper>

        {/* Evidencias */}
        <FileInput
          label="Evidencias / Fotos / Tickets de balanza"
          placeholder="Seleccionar archivos..."
          multiple
          value={archivos}
          onChange={setArchivos}
          clearable
          radius="lg"
          size="xs"
          classNames={estilitos}
        />

        {/* Footer Actions */}
        <Group justify="flex-end" gap="xs" mt="xs">
          <Button
            variant="default"
            onClick={onClose}
            disabled={submitting}
            leftSection={<XMarkIcon className="w-4 h-4" />}
            radius="lg"
            size="xs"
          >
            Cancelar
          </Button>
          <Button
            color="teal"
            onClick={handleSubmit}
            loading={submitting}
            leftSection={<CheckIcon className="w-4 h-4" />}
            radius="lg"
            size="xs"
            className="font-semibold shadow-md shadow-teal-950/40"
          >
            Registrar Tamizaje
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
