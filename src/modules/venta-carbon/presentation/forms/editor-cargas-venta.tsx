import { useCallback, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  FileInput,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconScale,
  IconTrash,
  IconTruck,
} from "@tabler/icons-react";

import { inputClasses } from "../components/input-classes";
import {
  esCargaVentaCompleta,
  nuevaCargaVenta,
  type CargaVentaFormState,
} from "./carga-venta-form-state";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import type { BlendingDespachable } from "../../service/venta-carbon.responses";
import type { RES_VehiculoCarbon } from "../../../../service/responses/vehiculo-carbon";

interface Props {
  cargas: CargaVentaFormState[];
  onChange: (cargas: CargaVentaFormState[]) => void;
  /** Blendings despachables del almacen de salida. */
  blendings: BlendingDespachable[];
  /** Vehiculos de carbon. */
  vehiculos: RES_VehiculoCarbon[];
  loadingCatalogos?: boolean;
  saving?: boolean;
}

/**
 * Editor de cargas a despachar.
 *
 * Se muestra **una sola carga a la vez**: el usuario la llena, le da
 * "Agregar" y cae en una tabla de abajo. Si quiere corregirla, la edita
 * desde la tabla y los campos vuelven a traerse al formulario. Asi el
 * formulario no crece con cada carga y no genera un scroll interminable.
 *
 * La carga sale de un BLENDING: al elegirlo se autocompletan el porcentaje
 * de ceniza y las toneladas, que el usuario puede ajustar.
 */
export const EditorCargasVenta = ({
  cargas,
  onChange,
  blendings,
  vehiculos,
  loadingCatalogos = false,
  saving = false,
}: Props) => {
  const [borrador, setBorrador] = useState<CargaVentaFormState>(nuevaCargaVenta);
  const [indiceEdicion, setIndiceEdicion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vehiculoBusqueda, setVehiculoBusqueda] = useState("");
  const [blendingBusqueda, setBlendingBusqueda] = useState("");

  const blendingsVisibles = useMemo(() => {
    const q = blendingBusqueda.trim();
    if (!q) return blendings;
    return getCoincidencias(blendings, q, {
      keys: ["correlativo", "tipo_carbon_nombre", "tipo_carbon_codigo"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [blendings, blendingBusqueda]);

  const blendingsOptions = useMemo(
    () =>
      blendingsVisibles.map((b) => ({
        value: String(b.id_blending_carbon),
        label: `${b.correlativo} · ${b.tipo_carbon_nombre ?? "Sin tipo"}`,
      })),
    [blendingsVisibles],
  );

  const vehiculosVisibles = useMemo(() => {
    const q = vehiculoBusqueda.trim();
    if (!q) return vehiculos;
    return getCoincidencias(vehiculos, q, {
      keys: ["placa", "marca", "tipo_vehiculo"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [vehiculos, vehiculoBusqueda]);

  const vehiculoSeleccionado = useMemo(
    () =>
      vehiculos.find((v) => String(v.id_vehiculo_carbon) === borrador.id_vehiculo_carbon),
    [vehiculos, borrador.id_vehiculo_carbon],
  );

  /**
   * Stock que se puede asignar al borrador: lo que queda del blending menos
   * lo que ya repartieron las OTRAS cargas con el mismo blending. La carga
   * que se esta editando no cuenta.
   */
  const calcularDisponible = useCallback(
    (idBlending: number | null): number => {
      if (!idBlending) return 0;

      const blending = blendings.find(
        (b) => b.id_blending_carbon === idBlending,
      );
      const stock = blending?.disponible ?? 0;

      let asignadoPorOtras = 0;
      cargas.forEach((otra, i) => {
        if (i === indiceEdicion) return;
        if (otra.id_blending_carbon !== idBlending) return;
        asignadoPorOtras += Number(otra.cantidad_toneladas) || 0;
      });

      return Math.max(0, stock - asignadoPorOtras);
    },
    [blendings, cargas, indiceEdicion],
  );

  /**
   * Al elegir el blending se autocompletan el % de ceniza y las toneladas
   * con lo que hay del lote.
   */
  const seleccionarBlending = (idBlending: number | null) => {
    if (!idBlending) {
      setBorrador((prev) => ({
        ...prev,
        id_blending_carbon: null,
        porcentaje_ceniza: 0,
        cantidad_toneladas: 0,
      }));
      return;
    }

    const blending = blendings.find((b) => b.id_blending_carbon === idBlending);
    const disponible = calcularDisponible(idBlending);

    setBorrador((prev) => ({
      ...prev,
      id_blending_carbon: idBlending,
      porcentaje_ceniza: Number(blending?.porcentaje_ceniza) || 0,
      cantidad_toneladas:
        disponible > 0 ? Math.round(disponible * 10000) / 10000 : 0,
    }));
  };

  const disponible = calcularDisponible(borrador.id_blending_carbon);

  const guardar = () => {
    setError(null);

    if (!esCargaVentaCompleta(borrador)) {
      setError(
        "Complete el blending, las toneladas y la fecha/hora de salida",
      );
      return;
    }

    if (indiceEdicion !== null) {
      onChange(
        cargas.map((c, i) => (i === indiceEdicion ? borrador : c)),
      );
    } else {
      onChange([...cargas, borrador]);
    }

    setBorrador(nuevaCargaVenta());
    setIndiceEdicion(null);
  };

  const editar = (index: number) => {
    const carga = cargas[index];
    if (!carga) return;
    setBorrador({ ...carga, archivos: [] });
    setIndiceEdicion(index);
    setError(null);
  };

  const cancelarEdicion = () => {
    setBorrador(nuevaCargaVenta());
    setIndiceEdicion(null);
    setError(null);
  };

  const eliminar = (index: number) => {
    onChange(cargas.filter((_, i) => i !== index));
    if (indiceEdicion === index) cancelarEdicion();
  };

  const correlativoBlending = (idBlending: number | null) =>
    blendings.find((b) => b.id_blending_carbon === idBlending)?.correlativo ??
    "—";

  const tipoBlending = (idBlending: number | null) =>
    blendings.find((b) => b.id_blending_carbon === idBlending)
      ?.tipo_carbon_nombre ?? "—";

  const placaVehiculo = (idVehiculo: string | null) =>
    vehiculos.find((v) => String(v.id_vehiculo_carbon) === idVehiculo)?.placa ??
    "—";

  return (
    <Stack gap="md">
      {/* Formulario de una sola carga */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Group justify="space-between" mb="xs">
          <Text size="xs" fw={700} c="gray" tt="uppercase">
            {indiceEdicion !== null
              ? `Editando carga #${indiceEdicion + 1}`
              : "Nueva carga"}
          </Text>
          {indiceEdicion !== null && (
            <Button
              size="xs"
              radius="lg"
              variant="subtle"
              color="gray"
              onClick={cancelarEdicion}
              disabled={saving}
            >
              Cancelar edicion
            </Button>
          )}
        </Group>

        <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
          <Select
            label="Blending a despachar"
            placeholder={
              loadingCatalogos ? "Cargando..." : "Seleccione el blending"
            }
            data={blendingsOptions}
            value={
              borrador.id_blending_carbon
                ? String(borrador.id_blending_carbon)
                : null
            }
            onChange={(val) => {
              setBlendingBusqueda("");
              seleccionarBlending(val ? Number(val) : null);
            }}
            searchValue={blendingBusqueda}
            onSearchChange={setBlendingBusqueda}
            rightSection={
              loadingCatalogos ? (
                <Loader size={14} color="indigo" />
              ) : undefined
            }
            disabled={loadingCatalogos || saving}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            nothingFoundMessage="Sin blendings disponibles"
            comboboxProps={{ withinPortal: true }}
            filter={({ options }) => options}
          />

          <NumberInput
            label="% de ceniza"
            placeholder="0.00"
            value={borrador.porcentaje_ceniza}
            onChange={(val) =>
              setBorrador((prev) => ({
                ...prev,
                porcentaje_ceniza: Number(val) || 0,
              }))
            }
            min={0}
            max={100}
            decimalScale={2}
            hideControls
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <div>
            <NumberInput
              label="Cantidad a despachar (TN)"
              placeholder="0.00"
              value={borrador.cantidad_toneladas}
              onChange={(val) =>
                setBorrador((prev) => ({
                  ...prev,
                  cantidad_toneladas: Number(val) || 0,
                }))
              }
              leftSection={<IconScale size={16} />}
              classNames={inputClasses}
              size="xs"
              radius="lg"
              disabled={saving}
              hideControls
            />
            {borrador.id_blending_carbon && (
              <Group gap={6} mt={4} wrap="nowrap">
                <Tooltip
                  label="Stock del lote que se puede despachar: ya descuenta las cargas que salieron y siguen en camino"
                  withArrow
                >
                  <Badge
                    size="xs"
                    variant="light"
                    radius="xl"
                    color={disponible > 0 ? "teal" : "red"}
                  >
                    Disponible: {formatNumber(disponible)} TN
                  </Badge>
                </Tooltip>
                {disponible > 0 && (
                  <Tooltip label="Usar todo el stock disponible" withArrow>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="teal"
                      onClick={() =>
                        setBorrador((prev) => ({
                          ...prev,
                          cantidad_toneladas:
                            Math.round(disponible * 10000) / 10000,
                        }))
                      }
                      disabled={saving}
                    >
                      <IconCheck size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            )}
            {borrador.id_blending_carbon &&
              borrador.cantidad_toneladas > disponible && (
                <Text size="10px" c="red.4" mt={4} fw={600}>
                  La cantidad supera el stock disponible
                </Text>
              )}
          </div>

          <TextInput
            label="Fecha y hora de salida"
            type="datetime-local"
            value={borrador.fecha_hora_salida}
            onChange={(e) =>
              setBorrador((prev) => ({
                ...prev,
                fecha_hora_salida: e.currentTarget.value,
              }))
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm" mt="sm">
          <Select
            label="Vehículo (opcional)"
            placeholder={
              vehiculos.length === 0 ? "Sin vehículos" : "Seleccione vehículo"
            }
            data={vehiculosVisibles.map((v) => ({
              value: String(v.id_vehiculo_carbon),
              label: `${v.placa}${v.marca ? ` · ${v.marca}` : ""} (${v.tipo_vehiculo})`,
            }))}
            value={borrador.id_vehiculo_carbon}
            onChange={(val) => {
              setBorrador((prev) => ({ ...prev, id_vehiculo_carbon: val }));
              setVehiculoBusqueda("");
            }}
            searchValue={vehiculoBusqueda}
            onSearchChange={setVehiculoBusqueda}
            leftSection={<IconTruck size={16} />}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            clearable
            nothingFoundMessage="Sin vehículos registrados"
            comboboxProps={{ withinPortal: true }}
            filter={({ options }) => options}
            disabled={saving}
          />

          <TextInput
            label="Segunda placa (opcional)"
            placeholder="Ej. A1B-234"
            value={borrador.segunda_placa}
            onChange={(e) =>
              setBorrador((prev) => ({
                ...prev,
                segunda_placa: e.currentTarget.value.toUpperCase(),
              }))
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <div>
            <Text size="xs" c="gray" fw={600} mb={4}>
              Lote seleccionado
            </Text>
            <Paper
              p="xs"
              radius="lg"
              className="bg-zinc-900/80 border border-zinc-800"
            >
              {borrador.id_blending_carbon ? (
                <Group gap={6} wrap="nowrap">
                  <Badge
                    size="sm"
                    variant="light"
                    color="cyan"
                    radius="sm"
                    className="font-mono"
                  >
                    {correlativoBlending(borrador.id_blending_carbon)}
                  </Badge>
                  <Text size="xs" c="zinc.300" truncate>
                    {tipoBlending(borrador.id_blending_carbon)}
                  </Text>
                </Group>
              ) : (
                <Text size="xs" c="dimmed" fs="italic">
                  Elija un blending
                </Text>
              )}
            </Paper>
            {vehiculoSeleccionado && (
              <Text size="10px" c="dimmed" mt={4}>
                Tipo: {vehiculoSeleccionado.tipo_vehiculo}
              </Text>
            )}
          </div>
        </SimpleGrid>

        <FileInput
          label="Evidencias del despacho"
          placeholder="Imágenes o documentos..."
          multiple
          value={borrador.archivos}
          onChange={(files) =>
            setBorrador((prev) => ({ ...prev, archivos: files }))
          }
          classNames={inputClasses}
          size="xs"
          radius="lg"
          clearable
          disabled={saving}
          mt="sm"
        />

        {error && (
          <Text size="xs" c="red.4" fw={600} mt="xs">
            {error}
          </Text>
        )}

        <Group justify="flex-end" mt="sm">
          <Button
            size="xs"
            radius="lg"
            color="indigo"
            onClick={guardar}
            disabled={saving}
            leftSection={
              indiceEdicion !== null ? (
                <IconCheck size={16} />
              ) : (
                <IconPlus size={16} />
              )
            }
          >
            {indiceEdicion !== null ? "Guardar cambios" : "Agregar carga"}
          </Button>
        </Group>
      </Paper>

      {/* Tabla de cargas agregadas */}
      {cargas.length > 0 && (
        <Paper
          p="md"
          radius="lg"
          className="bg-zinc-900/60 border border-zinc-800"
        >
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={700} c="gray" tt="uppercase">
              Cargas agregadas ({cargas.length})
            </Text>
            <Badge variant="light" color="indigo" radius="xl" size="sm">
              {formatNumber(
                cargas.reduce(
                  (acc, c) => acc + (Number(c.cantidad_toneladas) || 0),
                  0,
                ),
              )}{" "}
              TN en total
            </Badge>
          </Group>

          <Table
            highlightOnHover
            withTableBorder={false}
            verticalSpacing="xs"
            horizontalSpacing="sm"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th
                  ta={"center"}
                  w={60}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  #
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Blending
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  w={90}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  % Ceniza
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Toneladas
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  w={130}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Vehículo
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Salida
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  w={110}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Accion
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {cargas.map((carga, i) => (
                <Table.Tr key={i}>
                  <Table.Td ta={"center"}>
                    <Badge size="xs" variant="light" color="indigo" radius="sm">
                      {i + 1}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <div className="flex flex-col gap-1 items-center">
                      <Badge
                        size="xs"
                        variant="light"
                        color="cyan"
                        radius="sm"
                        className="font-mono"
                      >
                        {correlativoBlending(carga.id_blending_carbon)}
                      </Badge>
                      <Text size="10px" c="dimmed">
                        {tipoBlending(carga.id_blending_carbon)}
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <Text size="xs" c="zinc.300">
                      {formatNumber(carga.porcentaje_ceniza)}%
                    </Text>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <Text size="xs" fw={700} c="zinc.100">
                      {formatNumber(carga.cantidad_toneladas)}
                    </Text>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <Text size="xs" c="zinc.300" className="font-mono">
                      {placaVehiculo(carga.id_vehiculo_carbon)}
                      {carga.segunda_placa
                        ? ` · ${carga.segunda_placa}`
                        : ""}
                    </Text>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <Text size="xs" c="zinc.400">
                      {carga.fecha_hora_salida
                        ? new Date(carga.fecha_hora_salida).toLocaleString(
                            "es-PE",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <Group gap={4} justify="center" wrap="nowrap">
                      <Tooltip label="Editar esta carga" withArrow>
                        <ActionIcon
                          variant="light"
                          color="indigo"
                          size="md"
                          radius="md"
                          onClick={() => editar(i)}
                          disabled={saving}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Quitar del despacho" withArrow>
                        <ActionIcon
                          variant="light"
                          color="red"
                          size="md"
                          radius="md"
                          onClick={() => eliminar(i)}
                          disabled={saving}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
};
