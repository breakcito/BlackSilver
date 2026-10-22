import {
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  ChevronDownIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { useNotify } from "../../../hooks/useNotify";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";
import {
  TipoGastoZarandeo,
  esGastoPorHoras,
} from "../../../shared/enums/carbon/tipo-gasto-zarandeo";
import { AuxService } from "../../../service/auxiliar.service";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import type { RES_Proveedor } from "../../../service/responses/proveedor";
import type { GastoZarandeoItem } from "../service/tamizaje-carbon.responses";

interface Props {
  opened: boolean;
  onClose: () => void;
  idZarandeoCarbon: number;
  /** Titulo del zarandeo, para contextualizar el modal. */
  tituloZarandeo?: string;
  onGuardado?: () => void;
}

const estilitos = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown: "bg-zinc-900 border-zinc-800",
  option: "text-zinc-300 hover:bg-zinc-800",
};

const COLOR_POR_GASTO: Record<string, string> = {
  [TipoGastoZarandeo.Pala]: "indigo",
  [TipoGastoZarandeo.Lanza]: "violet",
  [TipoGastoZarandeo.Agua]: "cyan",
  [TipoGastoZarandeo.Escogedores]: "grape",
  [TipoGastoZarandeo.Otro]: "gray",
};

export const ModalGastosZarandeo = ({
  opened,
  onClose,
  idZarandeoCarbon,
  tituloZarandeo,
  onGuardado,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  const [gastos, setGastos] = useState<GastoZarandeoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proveedores, setProveedores] = useState<RES_Proveedor[]>([]);

  // Form state
  const [gasto, setGasto] = useState<TipoGastoZarandeo>(TipoGastoZarandeo.Pala);
  const [otroGasto, setOtroGasto] = useState("");
  const [idProveedor, setIdProveedor] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [numeroReporte, setNumeroReporte] = useState("");
  const [fecha, setFecha] = useState<Date | null>(new Date());
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [cantidad, setCantidad] = useState<number | string>(0);
  const [precioUnitario, setPrecioUnitario] = useState<number | string>(0);
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  // El formulario de alta se despliega bajo demanda (accordion).
  const [formAbierto, setFormAbierto] = useState(false);

  const cargarGastos = useCallback(async () => {
    if (!idZarandeoCarbon) return;
    setLoading(true);
    try {
      const resp = await TamizajeCarbonService.getGastos(idZarandeoCarbon);
      setGastos(resp.success && resp.data ? resp.data : []);
    } catch (err) {
      console.error(err);
      setGastos([]);
    } finally {
      setLoading(false);
    }
  }, [idZarandeoCarbon]);

  // Estado inicial del formulario al abrir el modal.
  const resetFormulario = useCallback(() => {
    setGasto(TipoGastoZarandeo.Pala);
    setOtroGasto("");
    setIdProveedor(null);
    setDescripcion("");
    setNumeroReporte("");
    setFecha(new Date());
    setHoraInicio("");
    setHoraFin("");
    setCantidad(0);
    setPrecioUnitario(0);
  }, []);

  // Mantiene el mismo criterio de orden que el backend (fecha ASC, id ASC)
  // para que la lista local coincida con la que devuelve el listado.
  const ordenarGastos = (lista: GastoZarandeoItem[]) =>
    [...lista].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
      return a.id_gasto_produccion_carbon - b.id_gasto_produccion_carbon;
    });

  useEffect(() => {
    if (!opened) return;
    cargarGastos();
    resetFormulario();
    setFormAbierto(false);
  }, [opened, cargarGastos, resetFormulario]);

  useEffect(() => {
    if (!opened) return;
    (async () => {
      try {
        const resp = await AuxService.get_proveedores();
        if (resp?.data) setProveedores(resp.data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [opened]);

  const esPorHoras = esGastoPorHoras(gasto);

  // Cantidad y total: para pala/lanza la cantidad sale de las horas.
  const cantidadCalculada = useMemo(() => {
    if (!esPorHoras) return Number(cantidad) || 0;
    if (!horaInicio || !horaFin) return 0;
    const [hi, mi] = horaInicio.split(":").map(Number);
    const [hf, mf] = horaFin.split(":").map(Number);
    if ([hi, mi, hf, mf].some((n) => Number.isNaN(n))) return 0;
    const minutos = Math.abs(hf * 60 + mf - (hi * 60 + mi));
    return Math.round((minutos / 60) * 10000) / 10000;
  }, [esPorHoras, cantidad, horaInicio, horaFin]);

  const total = useMemo(
    () =>
      Math.round(cantidadCalculada * (Number(precioUnitario) || 0) * 100) / 100,
    [cantidadCalculada, precioUnitario],
  );

  const totalGastos = useMemo(
    () => gastos.reduce((acc, g) => acc + (Number(g.total) || 0), 0),
    [gastos],
  );

  const gastosOptions = useMemo(
    () =>
      Object.values(TipoGastoZarandeo).map((g) => ({
        value: g,
        label: g,
      })),
    [],
  );

  const proveedoresOptions = useMemo(
    () =>
      proveedores.map((p) => ({
        value: String(p.id_proveedor),
        label: p.razon_social,
      })),
    [proveedores],
  );

  // Búsqueda tolerante sobre el catálogo de proveedores (Fuse + FlexSearch).
  const proveedoresVisibles = useMemo(() => {
    const q = proveedorBusqueda.trim();
    if (!q) return proveedoresOptions;
    return getCoincidencias(proveedoresOptions, q, { fuseThreshold: 0.4 }).map(
      (r) => r.item,
    );
  }, [proveedoresOptions, proveedorBusqueda]);

  const handleGastoChange = (value: string | null) => {
    const next = (value as TipoGastoZarandeo) || TipoGastoZarandeo.Pala;
    setGasto(next);
    if (!esGastoPorHoras(next)) {
      setHoraInicio("");
      setHoraFin("");
    }
  };

  const handleSubmit = async () => {
    if (gasto === TipoGastoZarandeo.Otro && !otroGasto.trim()) {
      notifyError("Describa el concepto");
      return;
    }
    if (esPorHoras && (!horaInicio || !horaFin)) {
      notifyError("Indique la hora de inicio y la hora de fin");
      return;
    }
    if (!fecha) {
      notifyError("Indique la fecha del gasto");
      return;
    }
    if (cantidadCalculada <= 0) {
      notifyError("La cantidad debe ser mayor a cero");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await TamizajeCarbonService.registrarGasto({
        id_zarandeo_carbon: idZarandeoCarbon,
        gasto,
        otro_gasto: gasto === TipoGastoZarandeo.Otro ? otroGasto.trim() : null,
        id_proveedor: idProveedor ? Number(idProveedor) : null,
        descripcion: descripcion.trim() || null,
        fecha: dayjs(fecha).format("YYYY-MM-DD"),
        numero_reporte: numeroReporte.trim() || null,
        hora_inicio: esPorHoras ? horaInicio : null,
        hora_fin: esPorHoras ? horaFin : null,
        cantidad: cantidadCalculada,
        precio_unitario: Number(precioUnitario) || 0,
      });

      if (resp.success && resp.data) {
        notifySuccess("Gasto de producción registrado");
        // El backend devuelve el gasto ya persistido con la misma forma que
        // el listado: se inserta en la lista local, sin volver a consultar.
        setGastos((prev) => ordenarGastos([...prev, resp.data]));
        onGuardado?.();
        resetFormulario();
        setFormAbierto(false);
      } else {
        notifyError(resp.message || "No se pudo registrar el gasto");
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al registrar el gasto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title="Gastos de Producción"
      size="xl"
      validateClose
      rightSection={
        tituloZarandeo && (
          <Text size="xs" c="gray" fw={600}>
            {tituloZarandeo}
          </Text>
        )
      }
    >
      <Stack gap="md">
        {/* Alta de gasto */}
        <Paper className="bg-zinc-900/60 border border-zinc-800 p-2.5 rounded-xl">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Button
              variant="light"
              color="indigo"
              onClick={() => setFormAbierto((v) => !v)}
              leftSection={<PlusIcon className="w-4 h-4" />}
              rightSection={
                <ChevronDownIcon
                  className="w-4 h-4 transition-transform duration-200"
                  style={{
                    transform: formAbierto ? "rotate(180deg)" : undefined,
                  }}
                />
              }
              radius="lg"
              size="xs"
              className="font-semibold"
            >
              {formAbierto ? "Ocultar formulario" : "Registrar gasto"}
            </Button>

            <Text size="xs" c="dimmed">
              {gastos.length} gasto{gastos.length === 1 ? "" : "s"} registrado
              {gastos.length === 1 ? "" : "s"}
            </Text>
          </Group>

          <Collapse in={formAbierto} transitionDuration={220}>
            <Divider my="sm" />

            <Group align="center" mb="xs" ml={4}>
              <Group gap={4}>
                <Text size="xs">Fecha:</Text>
                <CustomDatePicker
                  value={fecha}
                  onChange={setFecha}
                  required
                  radius="lg"
                  size="xs"
                  classNames={estilitos}
                />
              </Group>
              <Divider orientation="vertical" />
              <Group gap={4}>
                <Text size="xs">Tipo de gasto:</Text>
                <Select
                  data={gastosOptions}
                  value={gasto}
                  onChange={handleGastoChange}
                  allowDeselect={false}
                  radius="lg"
                  size="xs"
                  classNames={estilitos}
                />
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              {gasto === TipoGastoZarandeo.Otro && (
                <TextInput
                  label="Concepto del gasto"
                  placeholder="Ej: Mantenimiento de zaranda"
                  value={otroGasto}
                  onChange={(e) => setOtroGasto(e.currentTarget.value)}
                  required
                  radius="lg"
                  size="xs"
                  classNames={estilitos}
                />
              )}
              <Select
                label="Proveedor (opcional)"
                placeholder="Seleccione proveedor"
                data={proveedoresVisibles}
                value={idProveedor}
                onChange={(val) => {
                  setIdProveedor(val);
                  setProveedorBusqueda("");
                }}
                clearable
                searchable
                searchValue={proveedorBusqueda}
                onSearchChange={setProveedorBusqueda}
                comboboxProps={{ withinPortal: true }}
                nothingFoundMessage="No se encontraron proveedores"
                radius="lg"
                size="xs"
                classNames={estilitos}
              />
              <TextInput
                label="Número de reporte (opcional)"
                placeholder="Ej: REP-0042"
                value={numeroReporte}
                onChange={(e) => setNumeroReporte(e.currentTarget.value.toUpperCase())}
                radius="lg"
                size="xs"
                classNames={estilitos}
              />
            </SimpleGrid>

            <Textarea
              label="Descripción (opcional)"
              placeholder="Detalle del gasto realizado..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.currentTarget.value.toUpperCase())}
              minRows={2}
              mt="sm"
              radius="lg"
              size="xs"
              classNames={estilitos}
            />

            <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="sm" mt="sm">
              <TimeInput
                label="Hora de inicio"
                placeholder="08:00"
                leftSection={<ClockIcon className="w-4 h-4 text-zinc-500" />}
                value={horaInicio || undefined}
                onChange={(e) =>
                  setHoraInicio(
                    /^(\d{2}):(\d{2})/.test(e.currentTarget.value)
                      ? e.currentTarget.value.slice(0, 5)
                      : "",
                  )
                }
                radius="lg"
                size="xs"
                disabled={!esPorHoras}
                classNames={estilitos}
              />
              <TimeInput
                label="Hora de fin"
                placeholder="17:00"
                leftSection={<ClockIcon className="w-4 h-4 text-zinc-500" />}
                value={horaFin || undefined}
                onChange={(e) =>
                  setHoraFin(
                    /^(\d{2}):(\d{2})/.test(e.currentTarget.value)
                      ? e.currentTarget.value.slice(0, 5)
                      : "",
                  )
                }
                radius="lg"
                size="xs"
                disabled={!esPorHoras}
                classNames={estilitos}
              />
              <NumberInput
                label={"Cantidad"}
                placeholder="0.00"
                value={esPorHoras ? cantidadCalculada : cantidad}
                onChange={setCantidad}
                hideControls
                radius="lg"
                readOnly={esPorHoras}
                size="xs"
                classNames={estilitos}
              />
              <NumberInput
                label="Precio unitario (S/)"
                placeholder="0.00"
                value={precioUnitario}
                onChange={setPrecioUnitario}
                hideControls
                fixedDecimalScale
                radius="lg"
                size="xs"
                classNames={estilitos}
              />
            </SimpleGrid>

            <Group justify="space-between" mt={24}>
              <Group ml={4} gap={"xs"}>
                <Text size="xs" fw={600}>Total:</Text>
                <TextInput
                  value={formatNumber(total)}
                  readOnly
                  classNames={{
                    ...estilitos,
                    input: `${estilitos.input} font-semibold text-indigo-300`,
                  }}
                  radius="lg"
                  size="xs"
                />
              </Group>
              <Group justify="flex-end" gap="xs">
                <Button
                  variant="default"
                  onClick={() => {
                    resetFormulario();
                    setFormAbierto(false);
                  }}
                  disabled={submitting}
                  leftSection={<XMarkIcon className="w-4 h-4" />}
                  radius="lg"
                  size="xs"
                >
                  Cancelar
                </Button>
                <Button
                  color="indigo"
                  onClick={handleSubmit}
                  loading={submitting}
                  leftSection={<PlusIcon className="w-4 h-4" />}
                  radius="lg"
                  size="xs"
                >
                  Registrar gasto
                </Button>
              </Group>
            </Group>
          </Collapse>
        </Paper>

        {/* Listado de gastos */}
        <Paper className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={700} className="text-white">
              Gastos registrados
            </Text>
            <Badge color="indigo" variant="light" radius="xl">
              Total: S/ {formatNumber(totalGastos)}
            </Badge>
          </Group>

          {loading ? (
            <Text size="xs" c="dimmed">
              Cargando gastos...
            </Text>
          ) : gastos.length === 0 ? (
            <Text size="xs" c="dimmed" className="italic">
              Todavía no se han registrado gastos.
            </Text>
          ) : (
            <Table
              highlightOnHover
              withTableBorder={false}
              verticalSpacing="xs"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    Gasto
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    Fecha
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    Proveedor
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    Reporte
                  </Table.Th>
                  <Table.Th
                    className="text-zinc-400 text-xs font-semibold"
                    align="right"
                  >
                    Cantidad
                  </Table.Th>
                  <Table.Th
                    className="text-zinc-400 text-xs font-semibold"
                    align="right"
                  >
                    Total
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {gastos.map((g) => (
                  <Table.Tr key={g.id_gasto_produccion_carbon}>
                    <Table.Td>
                      <Badge
                        color={COLOR_POR_GASTO[g.gasto] ?? "gray"}
                        variant="light"
                        radius="xl"
                        size="sm"
                      >
                        {g.gasto === TipoGastoZarandeo.Otro
                          ? (g.otro_gasto ?? "Otro")
                          : g.gasto}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="zinc.300">
                        {g.fecha}
                        {g.hora_inicio && g.hora_fin
                          ? ` · ${g.hora_inicio}-${g.hora_fin}`
                          : ""}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="zinc.300">
                        {g.proveedor_razon_social || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="zinc.300">
                        {g.numero_reporte || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td align="right">
                      <Text size="xs" c="zinc.300">
                        {formatNumber(g.cantidad)}
                      </Text>
                    </Table.Td>
                    <Table.Td align="right">
                      <Text size="xs" fw={700} c="indigo.3">
                        S/ {formatNumber(g.total)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>
    </ModalEstandar>
  );
};
