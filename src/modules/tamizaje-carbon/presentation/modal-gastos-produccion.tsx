import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Divider,
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
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  CheckCircleIcon,
  ChevronDownIcon,
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
import { MedioPagoGastoProduccion } from "../../../shared/enums/carbon/medio-pago-gasto-produccion";
import { TipoOperacionGrupoGastos } from "../../../shared/enums/carbon/tipo-operacion-grupo-gastos";
import { AuxService } from "../../../service/auxiliar.service";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import { FormProveedor } from "../../../presentation/utils/form-proveedor";
import type { RES_Proveedor } from "../../../service/responses/proveedor";
import type { GastoZarandeoItem } from "../service/tamizaje-carbon.responses";

interface Props {
  opened: boolean;
  onClose: () => void;
  /**
   * Tipo de operacion: los gastos de zarandear y los de mezclar son
   * operaciones distintas e independientes.
   */
  tipo: TipoOperacionGrupoGastos;
  /** Operacion ya agrupada (opcional): se cargan sus gastos. */
  idGrupoInicial?: number | null;
  /**
   * Operaciones elegidas en el listado para esta operacion (opcional). Se
   * agrupan solas en el momento de registrar el primer gasto.
   */
  idsMiembrosIniciales?: number[];
  /**
   * Se llama cuando se registra un gasto. Recibe el gasto ya persistido para
   * que el panel actualice sus contadores sin volver a consultar la lista.
   */
  onGuardado?: (gasto: GastoZarandeoItem) => void;
  /**
   * Se llama al cerrar el modal: el panel recarga el listado y limpia la
   * seleccion.
   */
  onCerrar?: () => void;
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

/**
 * Gastos de produccion de carbon.
 *
 * El usuario llega aqui desde el listado: marca varias operaciones (zarandeos
 * o blendings) de una misma operacion y registra los gastos de esa operacion
 * completa: pala, lanza, agua, escogedores.
 *
 * El agrupamiento es un detalle interno: el usuario nunca crea un "grupo",
 * solo agrupa operaciones para registrar sus gastos juntos.
 */
export const ModalGastosProduccion = ({
  opened,
  onClose,
  tipo,
  idGrupoInicial = null,
  idsMiembrosIniciales = [],
  onGuardado,
  onCerrar,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  /**
   * Operacion agrupada. Es null mientras el usuario no ha registrado ningun
   * gasto: en ese momento las operaciones elegidas todavia no se agruparon.
   */
  const [idGrupo, setIdGrupo] = useState<number | null>(idGrupoInicial);
  /** Operaciones elegidas que aun no forman parte de una operacion agrupada. */
  const [idsMiembros, setIdsMiembros] = useState<string[]>(
    idsMiembrosIniciales.map(String),
  );
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
  const [cantidad, setCantidad] = useState<number | string>(0);
  const [precioUnitario, setPrecioUnitario] = useState<number | string>(0);
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  /** El formulario de alta se despliega bajo demanda (accordion). */
  const [formAbierto, setFormAbierto] = useState(false);

  // Crear proveedor desde el formulario de gasto.
  const [openNuevoProveedor, setOpenNuevoProveedor] = useState(false);

  // Confirmacion del pago de un gasto: se despliega bajo la fila que se
  // esta pagando.
  const [gastoAPagar, setGastoAPagar] = useState<number | null>(null);
  const [fechaPago, setFechaPago] = useState<Date | null>(null);
  const [medioPago, setMedioPago] = useState<MedioPagoGastoProduccion>(
    MedioPagoGastoProduccion.Efectivo,
  );
  const [guardandoPago, setGuardandoPago] = useState(false);

  const cargarGastos = useCallback(async () => {
    if (!idGrupo) {
      setGastos([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await TamizajeCarbonService.getGastosGrupo(idGrupo);
      setGastos(resp.success && resp.data ? resp.data : []);
    } catch (err) {
      console.error(err);
      setGastos([]);
    } finally {
      setLoading(false);
    }
  }, [idGrupo]);

  // Estado inicial del formulario al abrir el modal.
  const resetFormulario = useCallback(() => {
    setGasto(TipoGastoZarandeo.Pala);
    setOtroGasto("");
    setIdProveedor(null);
    setDescripcion("");
    setNumeroReporte("");
    setFecha(new Date());
    setCantidad(0);
    setPrecioUnitario(0);
  }, []);

  useEffect(() => {
    if (!opened) return;
    setIdGrupo(idGrupoInicial);
    setIdsMiembros(idsMiembrosIniciales.map(String));
    setGastos([]);
    resetFormulario();
    // Al llegar desde el agrupamiento, el formulario viene desplegado: el
    // usuario ya eligio las operaciones y solo falta registrar el gasto.
    // Al abrir una operacion existente, arranca cerrado.
    setFormAbierto(idsMiembrosIniciales.length > 0);
    setGastoAPagar(null);
    setFechaPago(null);
    setMedioPago(MedioPagoGastoProduccion.Efectivo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  useEffect(() => {
    if (!opened) return;
    cargarGastos();
  }, [opened, cargarGastos]);

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

  const total = useMemo(
    () =>
      Math.round(
        (Number(cantidad) || 0) * (Number(precioUnitario) || 0) * 100,
      ) / 100,
    [cantidad, precioUnitario],
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
    return getCoincidencias(proveedoresOptions, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [proveedoresOptions, proveedorBusqueda]);

  /** El gasto ya esta pagado: no se puede volver a confirmar. */
  const estaPagado = (g: GastoZarandeoItem): boolean =>
    Boolean(Number(g.esta_pagado) === 1);

  /**
   * Abre el formulario de pago del gasto. La fecha por defecto es hoy, pero
   * se puede cambiar por una anterior: el pago puede ser retroactivo.
   */
  const handleAbrirPago = (idGasto: number) => {
    setGastoAPagar(idGasto);
    setFechaPago(dayjs().toDate());
  };

  const handleCancelarPago = () => {
    setGastoAPagar(null);
    setFechaPago(null);
  };

  /** Confirma el pago del gasto con la fecha y el medio indicados. */
  const handleGuardarPago = async () => {
    if (gastoAPagar === null) return;
    if (!fechaPago) {
      notifyError("Indique la fecha de pago");
      return;
    }

    setGuardandoPago(true);
    try {
      const resp = await TamizajeCarbonService.confirmarPagoGasto(
        gastoAPagar,
        dayjs(fechaPago).format("YYYY-MM-DD"),
        medioPago,
      );

      if (resp.success && resp.data) {
        notifySuccess("Pago del gasto registrado");
        setGastos((prev) =>
          prev.map((g) =>
            g.id_gasto_produccion_carbon === gastoAPagar
              ? {
                  ...g,
                  esta_pagado: 1,
                  fecha_pago: dayjs(fechaPago).format("YYYY-MM-DD"),
                  medio_pago: medioPago,
                }
              : g,
          ),
        );
        handleCancelarPago();
      } else {
        notifyError(resp.message || "No se pudo registrar el pago");
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al registrar el pago");
    } finally {
      setGuardandoPago(false);
    }
  };

  const handleSubmit = async () => {
    // Sin operacion agrupada todavia: se toman las operaciones que el
    // usuario eligio en el listado.
    if (!idGrupo && idsMiembros.length === 0) {
      notifyError(
        "Selecciona al menos una operación para registrar sus gastos",
      );
      return;
    }
    if (gasto === TipoGastoZarandeo.Otro && !otroGasto.trim()) {
      notifyError("Describa el concepto");
      return;
    }
    if (!fecha) {
      notifyError("Indique la fecha del gasto");
      return;
    }
    if ((Number(cantidad) || 0) <= 0) {
      notifyError(
        esPorHoras
          ? "Indique cuántas horas se trabajaron"
          : "La cantidad debe ser mayor a cero",
      );
      return;
    }

    setSubmitting(true);
    try {
      // La primera vez, las operaciones elegidas se agrupan solas: el usuario
      // nunca ve ni tiene que crear un "grupo".
      let idGrupoGastos = idGrupo;
      if (!idGrupoGastos) {
        const creado = await TamizajeCarbonService.crearGrupoGastos({
          tipo,
          ids_miembros: idsMiembros.map(Number).filter((n) => n > 0),
        });
        if (!creado.success || !creado.data) {
          notifyError(
            creado.message || "No se pudo registrar el gasto de la operación",
          );
          return;
        }
        idGrupoGastos = Number(creado.data);
        setIdGrupo(idGrupoGastos);
      }

      const resp = await TamizajeCarbonService.registrarGasto({
        id_grupo_gastos: idGrupoGastos,
        gasto,
        otro_gasto: gasto === TipoGastoZarandeo.Otro ? otroGasto.trim() : null,
        id_proveedor: idProveedor ? Number(idProveedor) : null,
        descripcion: descripcion.trim() || null,
        fecha: dayjs(fecha).format("YYYY-MM-DD"),
        numero_reporte: numeroReporte.trim() || null,
        cantidad: Number(cantidad) || 0,
        precio_unitario: Number(precioUnitario) || 0,
      });

      if (resp.success && resp.data) {
        notifySuccess("Gasto de producción registrado");
        setGastos((prev) => [...prev, resp.data]);
        onGuardado?.(resp.data);
        resetFormulario();
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

  /** Cierra el modal y avisa al panel para que recargue el listado. */
  const handleCerrar = () => {
    onClose();
    onCerrar?.();
  };

  return (
    <ModalEstandar
      opened={opened}
      close={handleCerrar}
      title="Gastos de Producción"
      size="55rem"
      validateClose
      rightSection={
        <Group gap={6}>
          <Badge
            variant="light"
            color={tipo === TipoOperacionGrupoGastos.Blending ? "cyan" : "teal"}
            radius="xl"
            size="sm"
          >
            {tipo === TipoOperacionGrupoGastos.Blending
              ? "Blending"
              : "Zarandeo"}
          </Badge>
        </Group>
      }
    >
      <Stack gap="md">
        {/* ── ALTA DE GASTO ───────────────────────────────────────────── */}
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
                  onChange={(val) =>
                    setGasto(
                      (val as TipoGastoZarandeo) || TipoGastoZarandeo.Pala,
                    )
                  }
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
              <div className="flex items-end gap-1">
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
                  filter={({ options }) => options}
                  comboboxProps={{ withinPortal: true }}
                  nothingFoundMessage="No se encontraron proveedores"
                  radius="lg"
                  size="xs"
                  classNames={estilitos}
                  style={{ flex: 1 }}
                />
                <Tooltip label="Registrar un nuevo proveedor" withArrow>
                  <ActionIcon
                    variant="light"
                    color="indigo"
                    onClick={() => setOpenNuevoProveedor(true)}
                    disabled={submitting}
                  >
                    <PlusIcon className="w-4 h-4" />
                  </ActionIcon>
                </Tooltip>
              </div>
              <TextInput
                label="Número de reporte (opcional)"
                placeholder="Ej: REP-0042"
                value={numeroReporte}
                onChange={(e) =>
                  setNumeroReporte(e.currentTarget.value.toUpperCase())
                }
                radius="lg"
                size="xs"
                classNames={estilitos}
              />
            </SimpleGrid>

            <Textarea
              label="Descripción (opcional)"
              placeholder="Detalle del gasto realizado..."
              value={descripcion}
              onChange={(e) =>
                setDescripcion(e.currentTarget.value.toUpperCase())
              }
              minRows={2}
              mt="sm"
              radius="lg"
              size="xs"
              classNames={estilitos}
            />

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mt="sm">
              <NumberInput
                label={esPorHoras ? "Horas trabajadas" : "Cantidad"}
                placeholder="0.00"
                value={cantidad}
                onChange={setCantidad}
                hideControls
                radius="lg"
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
              <div className="flex items-end justify-end pb-1">
                <Text size="xs" fw={600} c="dimmed">
                  Total:{" "}
                  <span className="text-indigo-300 font-mono">
                    S/ {formatNumber(total)}
                  </span>
                </Text>
              </div>
            </SimpleGrid>

            <Group justify="flex-end" mt={24}>
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
          </Collapse>
        </Paper>

        {/* ── LISTADO DE GASTOS ───────────────────────────────────────── */}
        {idGrupo && (
          <Paper className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={700} className="text-white">
                Gastos de la operación
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
                Todavía no se han registrado gastos en esta operación.
              </Text>
            ) : (
              <Table
                highlightOnHover
                withTableBorder={false}
                verticalSpacing="xs"
                layout="fixed"
                horizontalSpacing="xs"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th
                      ta="center"
                      className="text-zinc-400 text-xs font-semibold"
                      w={105}
                    >
                      Fecha
                    </Table.Th>
                    <Table.Th
                      ta="center"
                      className="text-zinc-400 text-xs font-semibold text-center"
                      w={100}
                    >
                      Gasto
                    </Table.Th>
                    <Table.Th
                      ta="center"
                      className="text-zinc-400 text-xs font-semibold"
                      miw={180}
                    >
                      Proveedor
                    </Table.Th>
                    <Table.Th
                      ta="center"
                      className="text-zinc-400 text-xs font-semibold"
                      w={95}
                    >
                      Reporte
                    </Table.Th>
                    <Table.Th
                      ta="center"
                      className="text-zinc-400 text-xs font-semibold"
                      w={85}
                    >
                      Cantidad
                    </Table.Th>
                    <Table.Th
                      ta="center"
                      className="text-zinc-400 text-xs font-semibold"
                      w={115}
                    >
                      Total
                    </Table.Th>
                    <Table.Th
                      ta="center"
                      className="text-zinc-400 text-xs font-semibold"
                      w={155}
                    >
                      Condición
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {gastos.map((g) => (
                    <Table.Tr key={g.id_gasto_produccion_carbon}>
                      <Table.Td ta={"center"}>
                        <Text size="xs" c="gray">
                          {g.fecha}
                        </Text>
                      </Table.Td>
                      <Table.Td ta={"center"} w={150}>
                        <Stack gap={5} justify="center" align="center">
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
                          <Tooltip
                            label={g.descripcion || ""}
                            multiline
                            w={280}
                            withArrow
                            position="top"
                          >
                            <Text
                              size="xs"
                              lineClamp={3}
                              style={{ width: "100%", cursor: "help" }}
                            >
                              {g.descripcion || ""}
                            </Text>
                          </Tooltip>
                        </Stack>
                      </Table.Td>
                      <Table.Td ta={"center"}>
                        <Text size="xs" c="zinc.300">
                          {g.proveedor_razon_social || "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td ta={"center"}>
                        <Text size="xs" c="zinc.300">
                          {g.numero_reporte || "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td ta={"center"}>
                        <Text size="xs" c="zinc.300">
                          {formatNumber(g.cantidad)}
                        </Text>
                      </Table.Td>
                      <Table.Td ta={"center"}>
                        <Text size="xs" fw={700} c="red">
                          S/ {formatNumber(g.total)}
                        </Text>
                      </Table.Td>
                      <Table.Td ta={"center"} w={170}>
                        <Stack gap={4} justify="center" align="center" w={170}>
                          {estaPagado(g) ? (
                            <>
                              <Badge
                                size="sm"
                                color="green"
                                variant="light"
                                radius="xl"
                              >
                                PAGADO
                              </Badge>
                              <Text size="xs" c="gray" fw={600}>
                                {g.fecha_pago
                                  ? dayjs(g.fecha_pago).format("DD/MM/YYYY")
                                  : ""}
                              </Text>
                              {g.medio_pago && (
                                <Badge
                                  size="sm"
                                  color="grape"
                                  variant="light"
                                  radius="xl"
                                >
                                  {g.medio_pago}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <Group gap={8} justify="center" wrap="nowrap">
                              <Badge
                                size="sm"
                                color="yellow"
                                variant="light"
                                radius="xl"
                              >
                                PENDIENTE
                              </Badge>
                              <Tooltip
                                label="Confirmar el pago de este gasto"
                                withArrow
                              >
                                <ActionIcon
                                  variant="filled"
                                  color="green"
                                  onClick={() =>
                                    handleAbrirPago(
                                      g.id_gasto_produccion_carbon,
                                    )
                                  }
                                  disabled={guardandoPago}
                                >
                                  <CheckCircleIcon className="size-5 text-white" />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          )}
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        )}
      </Stack>

      {/* Modal: confirmar el pago de un gasto */}
      <Modal
        opened={gastoAPagar !== null}
        onClose={handleCancelarPago}
        title={
          <Text fw={700} size="sm" className="text-white">
            Confirmar pago del gasto
          </Text>
        }
        centered
        size="sm"
        classNames={{
          content: "bg-zinc-950 border border-zinc-800",
          header: "bg-zinc-950 border-b border-zinc-800 text-white",
        }}
      >
        <Stack gap="sm" mt={16}>
          <Text size="xs" c="gray">
            {gastoAPagar
              ? `${gastos.find((g) => g.id_gasto_produccion_carbon === gastoAPagar)?.gasto ?? ""} · S/ ${formatNumber(
                  Number(
                    gastos.find(
                      (g) => g.id_gasto_produccion_carbon === gastoAPagar,
                    )?.total ?? 0,
                  ),
                )}`
              : ""}
          </Text>

          <Group gap={"xs"} grow>
            <CustomDatePicker
              label="Fecha de pago"
              value={fechaPago}
              onChange={setFechaPago}
              radius="lg"
              size="xs"
              required
            />

            <Select
              label="Medio de pago"
              data={Object.values(MedioPagoGastoProduccion)}
              value={medioPago}
              onChange={(val) =>
                setMedioPago(
                  (val as MedioPagoGastoProduccion) ||
                    MedioPagoGastoProduccion.Efectivo,
                )
              }
              allowDeselect={false}
              radius="lg"
              size="xs"
            />
          </Group>
          <Group justify="flex-end" mt="xs">
            <Button
              variant="default"
              radius="lg"
              size="xs"
              onClick={handleCancelarPago}
              disabled={guardandoPago}
            >
              Cancelar
            </Button>
            <Button
              color="green"
              radius="lg"
              size="xs"
              onClick={handleGuardarPago}
              loading={guardandoPago}
              disabled={!fechaPago}
            >
              Pagar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: registrar un nuevo proveedor desde el formulario de gasto */}
      <ModalEstandar
        opened={openNuevoProveedor}
        close={() => setOpenNuevoProveedor(false)}
        title="Nuevo Proveedor"
        size="md"
        validateClose
      >
        <FormProveedor
          onSuccess={(prov) => {
            setOpenNuevoProveedor(false);
            setProveedores((prev) => [...prev, prov]);
            setIdProveedor(String(prov.id_proveedor));
          }}
          onCancel={() => setOpenNuevoProveedor(false)}
        />
      </ModalEstandar>
    </ModalEstandar>
  );
};
