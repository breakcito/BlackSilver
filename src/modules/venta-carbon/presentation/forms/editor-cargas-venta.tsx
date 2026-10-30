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
import { IconCheck, IconPencil, IconPlus, IconScale, IconTrash } from "@tabler/icons-react";

import { inputClasses } from "../components/input-classes";
import {
  esCargaVentaCompleta,
  nuevaCargaVenta,
  type CargaVentaFormState,
} from "./carga-venta-form-state";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import {
  esTipoCalidadCarbon,
  type TipoCalidadCarbon,
} from "../../../../shared/enums/carbon/tipo-calidad-carbon";
import type {
  RES_CalidadCarbon,
  RES_TipoCarbon,
} from "../../../tipo-carbon/service/tipo-carbon.responses";

interface Props {
  cargas: CargaVentaFormState[];
  onChange: (cargas: CargaVentaFormState[]) => void;
  tipos: RES_TipoCarbon[];
  calidades: RES_CalidadCarbon[];
  /** Stock despachable del almacen de salida: clave `"{idTipo}|{calidad}"`. */
  stockPorClave: Map<string, number>;
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
 */
export const EditorCargasVenta = ({
  cargas,
  onChange,
  tipos,
  calidades,
  stockPorClave,
  loadingCatalogos = false,
  saving = false,
}: Props) => {
  const [borrador, setBorrador] = useState<CargaVentaFormState>(nuevaCargaVenta);
  const [indiceEdicion, setIndiceEdicion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tiposVisibles = useMemo(
    () =>
      tipos.map((t) => ({
        value: String(t.id_tipo_carbon),
        label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
      })),
    [tipos],
  );

  const calidadesVisibles = useMemo(
    () => calidades.map((c) => ({ value: c.nombre, label: c.nombre })),
    [calidades],
  );

  /**
   * Stock que se puede asignar al borrador: el total del almacen menos lo
   * que ya repartieron las OTRAS cargas con la misma combinacion
   * tipo/calidad. La carga que se esta editando no cuenta.
   */
  const calcularDisponible = useCallback(
    (
      idTipo: number | null,
      calidad: TipoCalidadCarbon | null,
    ): number => {
      if (!idTipo || !calidad) return 0;

      const stock = stockPorClave.get(`${idTipo}|${calidad}`) ?? 0;

      let asignadoPorOtras = 0;
      cargas.forEach((otra, i) => {
        if (i === indiceEdicion) return;
        if (otra.id_tipo_carbon !== idTipo) return;
        if (otra.calidad !== calidad) return;
        asignadoPorOtras += Number(otra.cantidad_toneladas) || 0;
      });

      return Math.max(0, stock - asignadoPorOtras);
    },
    [cargas, indiceEdicion, stockPorClave],
  );

  /**
   * Al cambiar el tipo o la calidad se recalcula el stock de referencia y se
   * autocompleta la cantidad con todo lo disponible.
   */
  const recalcularCantidad = (
    idTipo: number | null,
    calidad: TipoCalidadCarbon | null,
  ) => {
    const disponible = calcularDisponible(idTipo, calidad);
    setBorrador((prev) => ({
      ...prev,
      id_tipo_carbon: idTipo,
      calidad,
      cantidad_toneladas:
        disponible > 0 ? Math.round(disponible * 10000) / 10000 : 0,
    }));
  };

  const disponible = calcularDisponible(borrador.id_tipo_carbon, borrador.calidad);

  const guardar = () => {
    setError(null);

    if (!esCargaVentaCompleta(borrador)) {
      setError(
        "Complete el tipo de carbon, la calidad, las toneladas y la fecha/hora de salida",
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

  const nombreTipo = (idTipo: number | null) =>
    tipos.find((t) => t.id_tipo_carbon === idTipo)?.nombre ?? "—";

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
            label="Tipo de carbon"
            placeholder={
              loadingCatalogos ? "Cargando..." : "Seleccione el tipo"
            }
            data={tiposVisibles}
            value={borrador.id_tipo_carbon ? String(borrador.id_tipo_carbon) : null}
            onChange={(val) =>
              recalcularCantidad(
                val ? Number(val) : null,
                borrador.calidad,
              )
            }
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
            nothingFoundMessage="Sin tipos de carbon"
            comboboxProps={{ withinPortal: true }}
          />

          <Select
            label="Calidad a despachar"
            placeholder="Seleccione la calidad"
            data={calidadesVisibles}
            value={borrador.calidad}
            onChange={(val) =>
              recalcularCantidad(
                borrador.id_tipo_carbon,
                esTipoCalidadCarbon(val) ? val : null,
              )
            }
            disabled={loadingCatalogos || saving}
            classNames={inputClasses}
            size="xs"
            radius="lg"
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
            {borrador.id_tipo_carbon && borrador.calidad && (
              <Group gap={6} mt={4} wrap="nowrap">
                <Tooltip
                  label="Stock que se puede despachar: ya descuenta las cargas que salieron y siguen en camino"
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
            {borrador.id_tipo_carbon &&
              borrador.calidad &&
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
                  Tipo de carbon
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Calidad
                </Table.Th>
                <Table.Th
                  ta={"center"}
                  className="text-zinc-400 text-xs font-semibold"
                >
                  Toneladas
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
                    <Text size="xs" fw={600} c="zinc.100">
                      {nombreTipo(carga.id_tipo_carbon)}
                    </Text>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <Badge size="xs" variant="light" color="gray" radius="sm">
                      {carga.calidad ?? "—"}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta={"center"}>
                    <Text size="xs" fw={700} c="zinc.100">
                      {formatNumber(carga.cantidad_toneladas)}
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
