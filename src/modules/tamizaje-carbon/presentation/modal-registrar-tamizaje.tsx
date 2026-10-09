import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  FileInput,
  Group,
  Modal,
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
  FunnelIcon,
} from "@heroicons/react/24/outline";

import { useNotify } from "../../../hooks/useNotify";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_Almacen } from "../../../service/responses/almacen";

interface EmpleadoItem {
  id: number;
  nombre: string;
  apellido: string;
}

interface VarianteFila {
  id_tipo_variante: string | null;
  cantidad_extraida: number | string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onGuardado: () => void;
}

export const ModalRegistrarTamizaje = ({
  opened,
  onClose,
  onGuardado,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  // Masters
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [tiposCarbon, setTiposCarbon] = useState<RES_TipoCarbon[]>([]);
  const [supervisores, setSupervisores] = useState<EmpleadoItem[]>([]);

  // Form state
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idTipoPadre, setIdTipoPadre] = useState<string | null>(null);
  const [idSupervisor, setIdSupervisor] = useState<string | null>(null);
  const [cantidadTamizada, setCantidadTamizada] = useState<number | string>("");
  const [esRetamizaje, setEsRetamizaje] = useState(false);
  const [fechaHora, setFechaHora] = useState(dayjs().format("YYYY-MM-DD HH:mm"));
  const [archivos, setArchivos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic variants
  const [variantes, setVariantes] = useState<VarianteFila[]>([
    { id_tipo_variante: null, cantidad_extraida: "" },
  ]);

  // Load masters on mount
  useEffect(() => {
    if (!opened) return;
    const fetchMaestros = async () => {
      try {
        const [resAlm, resTipos, resEmp] = await Promise.all([
          AuxService.get_almacenes({ para_carbon: true }),
          TipoCarbonService.getTipos(),
          AuxService.get_empleados(),
        ]);
        if (resAlm?.data) {
          const list = resAlm.data;
          setAlmacenes(list);
          if (list.length > 0 && !idAlmacen) {
            setIdAlmacen(String(list[0].id_almacen));
          }
        }
        if (resTipos?.data) setTiposCarbon(resTipos.data);
        if (resEmp?.data) setSupervisores(resEmp.data as unknown as EmpleadoItem[]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMaestros();
  }, [opened, idAlmacen]);

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
      notifyError("Debe registrar al menos una variante extraída con cantidad válida");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await TamizajeCarbonService.registrarTamizaje({
        id_almacen: Number(idAlmacen),
        id_tipo_carbon: Number(idTipoPadre),
        id_empleado_supervisor: idSupervisor ? Number(idSupervisor) : undefined,
        cantidad_tamizada: cantTamizadaNum,
        es_retamizaje: esRetamizaje,
        fecha_hora_tamizaje: fechaHora,
        variantes: variantesValidas.map((v) => ({
          id_tipo_variante: Number(v.id_tipo_variante),
          cantidad_extraida: Number(v.cantidad_extraida),
        })),
        evidencias: archivos.length > 0 ? archivos : undefined,
      });

      if (resp.success) {
        notifySuccess("Tamizaje registrado correctamente");
        onGuardado();
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

  const tiposCarbonOptions = useMemo(
    () =>
      tiposCarbon.map((t) => ({
        value: String(t.id_tipo_carbon),
        label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
      })),
    [tiposCarbon],
  );

  const supervisoresOptions = useMemo(
    () =>
      supervisores.map((s) => ({
        value: String(s.id),
        label: `${s.nombre} ${s.apellido}`,
      })),
    [supervisores],
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <FunnelIcon className="w-5 h-5 text-teal-400" />
          <Text fw={700} size="md" className="text-white">
            Registrar Tamizaje de Carbón
          </Text>
        </Group>
      }
      centered
      size="xl"
      classNames={{
        content: "bg-zinc-950 border border-zinc-800",
        header: "bg-zinc-950 border-b border-zinc-800 text-white",
      }}
    >
      <Stack gap="md" pt="xs">
        {/* Datos Principales */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select
            label="Almacén de procesamiento"
            placeholder="Seleccione almacén"
            data={almacenesOptions}
            value={idAlmacen}
            onChange={setIdAlmacen}
            required
            searchable
            radius="md"
            size="xs"
          />

          <Select
            label="Tipo de carbón a tamizar (Padre)"
            placeholder="Seleccione tipo de carbón"
            data={tiposCarbonOptions}
            value={idTipoPadre}
            onChange={setIdTipoPadre}
            required
            searchable
            radius="md"
            size="xs"
          />

          <NumberInput
            label="Cantidad a tamizar (TN)"
            placeholder="0.00"
            value={cantidadTamizada}
            onChange={setCantidadTamizada}
            min={0}
            decimalScale={4}
            required
            radius="md"
            size="xs"
          />

          <Select
            label="Supervisor a cargo"
            placeholder="Opcional"
            data={supervisoresOptions}
            value={idSupervisor}
            onChange={setIdSupervisor}
            clearable
            searchable
            radius="md"
            size="xs"
          />

          <TextInput
            label="Fecha y hora de tamizaje"
            placeholder="YYYY-MM-DD HH:mm"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.currentTarget.value)}
            required
            radius="md"
            size="xs"
          />

          <div className="flex items-end pb-1">
            <Checkbox
              label="¿Es un proceso de Re-tamizaje?"
              checked={esRetamizaje}
              onChange={(e) => setEsRetamizaje(e.currentTarget.checked)}
              size="xs"
              color="teal"
            />
          </div>
        </SimpleGrid>

        {/* Sección Variantes */}
        <Paper className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
          <Group justify="space-between" align="center" mb="xs">
            <div>
              <Text size="sm" fw={700} className="text-white">
                Variantes Extraídas (Resultados)
              </Text>
              <Text size="xs" c="dimmed">
                Agregue los tipos y tonelajes de carbón obtenidos del tamizado.
              </Text>
            </div>
            <Button
              variant="light"
              color="teal"
              size="xs"
              radius="md"
              leftSection={<PlusIcon className="w-3.5 h-3.5" />}
              onClick={handleAddVariante}
            >
              Agregar Variante
            </Button>
          </Group>

          <Table highlightOnHover withTableBorder={false} verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th className="text-zinc-400 text-xs font-semibold">
                  Tipo de Carbón Resultante
                </Table.Th>
                <Table.Th className="text-zinc-400 text-xs font-semibold w-40">
                  Cantidad (TN)
                </Table.Th>
                <Table.Th className="text-zinc-400 text-xs font-semibold w-28 text-right">
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
                        placeholder="Seleccione variante"
                        data={tiposCarbonOptions.filter(
                          (o) => o.value !== idTipoPadre,
                        )}
                        value={v.id_tipo_variante}
                        onChange={(val) =>
                          handleUpdateVariante(idx, "id_tipo_variante", val)
                        }
                        searchable
                        size="xs"
                        radius="md"
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
                        radius="md"
                      />
                    </Table.Td>
                    <Table.Td align="right">
                      <Badge variant="light" color="indigo" radius="sm">
                        {pct}%
                      </Badge>
                    </Table.Td>
                    <Table.Td align="center">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
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
              <Text size="sm" fw={800} className="text-teal-400">
                {formatNumber(totalExtraido)} TN
              </Text>
            </Paper>
            <Paper className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-lg text-center">
              <Text size="xs" c="dimmed">
                Merma / Desecho
              </Text>
              <Text size="sm" fw={800} className="text-amber-400">
                {formatNumber(mermaDesecho)} TN
              </Text>
            </Paper>
            <Paper className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-lg text-center">
              <Text size="xs" c="dimmed">
                Rendimiento Total
              </Text>
              <Text size="sm" fw={800} className="text-indigo-400">
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
          radius="md"
          size="xs"
        />

        {/* Footer Actions */}
        <Group justify="flex-end" gap="xs" mt="xs">
          <Button
            variant="default"
            onClick={onClose}
            disabled={submitting}
            leftSection={<XMarkIcon className="w-4 h-4" />}
            radius="md"
            size="xs"
          >
            Cancelar
          </Button>
          <Button
            color="teal"
            onClick={handleSubmit}
            loading={submitting}
            leftSection={<CheckIcon className="w-4 h-4" />}
            radius="md"
            size="xs"
          >
            Registrar Tamizaje
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
