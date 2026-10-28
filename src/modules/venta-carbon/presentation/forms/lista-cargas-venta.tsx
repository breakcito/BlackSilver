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
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconPlus,
  IconScale,
  IconTrash,
  IconTruck,
} from "@tabler/icons-react";

import { inputClasses } from "../components/input-classes";
import {
  nuevaCargaVenta,
  type CargaVentaFormState,
} from "./carga-venta-form-state";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { FormVehiculoCarbon } from "../../../../presentation/utils/form-vehiculo-carbon";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import {
  exigeSegundaPlaca,
  type TipoVehiculoCarbon,
} from "../../../../shared/enums/venta-carbon/tipo-vehiculo-carbon";
import {
  esTipoCalidadCarbon,
  type TipoCalidadCarbon,
} from "../../../../shared/enums/carbon/tipo-calidad-carbon";
import type { RES_TipoCarbon } from "../../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_CalidadCarbon } from "../../../tipo-carbon/service/tipo-carbon.responses";
import type { RES_VehiculoCarbon } from "../../../../service/responses/vehiculo-carbon";
import type { RES_Marca } from "../../../../service/responses/marca";

interface Props {
  cargas: CargaVentaFormState[];
  onChange: (cargas: CargaVentaFormState[]) => void;
  tipos: RES_TipoCarbon[];
  calidades: RES_CalidadCarbon[];
  vehiculos: RES_VehiculoCarbon[];
  marcas: RES_Marca[];
  /** Stock disponible del almacen de salida: clave `"{idTipo}|{calidad}"`. */
  stockPorClave: Map<string, number>;
  onVehiculoRegistrado: (vehiculo: RES_VehiculoCarbon) => void;
  /** Notifica que se registro una marca nueva para refrescar el catalogo. */
  onMarcaRegistrada?: (marca: RES_Marca) => void;
  loadingCatalogos?: boolean;
  saving?: boolean;
}

/**
 * Editor de la lista de cargas a despachar. Cada carga descuenta stock del
 * almacen de salida al registrarse, por eso la cantidad estimada se
 * autocompleta con el stock disponible del (tipo, calidad) elegido.
 */
export const ListaCargasVenta = ({
  cargas,
  onChange,
  tipos,
  calidades,
  vehiculos,
  marcas,
  stockPorClave,
  onVehiculoRegistrado,
  onMarcaRegistrada,
  loadingCatalogos = false,
  saving = false,
}: Props) => {
  const [openNuevoVehiculo, setOpenNuevoVehiculo] = useState(false);
  const [targetVehiculoIdx, setTargetVehiculoIdx] = useState<number | null>(
    null,
  );
  const [vehiculoBusqueda, setVehiculoBusqueda] = useState("");

  const vehiculosVisibles = useMemo(() => {
    const q = vehiculoBusqueda.trim();
    if (!q) return vehiculos;
    return getCoincidencias(vehiculos, q, {
      keys: ["placa", "marca", "tipo_vehiculo"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [vehiculos, vehiculoBusqueda]);

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

  const vehiculosOptions = useMemo(
    () =>
      vehiculosVisibles.map((v) => ({
        value: String(v.id_vehiculo_carbon),
        label: `${v.placa}${v.marca ? ` · ${v.marca}` : ""} (${v.tipo_vehiculo})`,
      })),
    [vehiculosVisibles],
  );

  const actualizar = (index: number, cambios: Partial<CargaVentaFormState>) => {
    onChange(cargas.map((c, i) => (i === index ? { ...c, ...cambios } : c)));
  };

  const agregar = () => onChange([...cargas, nuevaCargaVenta()]);

  const eliminar = (index: number) => {
    if (cargas.length === 1) return;
    onChange(cargas.filter((_, i) => i !== index));
  };

  /**
   * Stock que todavia se puede asignar a una fila: el total del almacen menos
   * lo que ya repartieron las OTRAS filas con la misma combinacion
   * tipo/calidad. Sin este descuento dos cargas del mismo tipo ofrecerian el
   * stock completo y la segunda pasaria por encima del disponible.
   */
  const calcularDisponible = useCallback(
    (
      index: number,
      idTipo: number | null,
      calidad: TipoCalidadCarbon | null,
    ): number => {
      if (!idTipo || !calidad) return 0;

      const stock = stockPorClave.get(`${idTipo}|${calidad}`) ?? 0;

      let asignadoPorOtras = 0;
      cargas.forEach((otra, i) => {
        if (i === index) return;
        if (otra.id_tipo_carbon !== idTipo) return;
        if (otra.calidad !== calidad) return;
        asignadoPorOtras += Number(otra.cantidad_toneladas) || 0;
      });

      return Math.max(0, stock - asignadoPorOtras);
    },
    [cargas, stockPorClave],
  );

  /**
   * Al cambiar el tipo o la calidad se recalcula el stock de referencia y se
   * autocompleta la cantidad estimada con todo lo disponible.
   */
  const recalcularCantidad = (
    index: number,
    idTipo: number | null,
    calidad: TipoCalidadCarbon | null,
  ) => {
    const carga = cargas[index];
    if (!carga) return;

    const disponible = calcularDisponible(index, idTipo, calidad);

    actualizar(index, {
      id_tipo_carbon: idTipo,
      calidad,
      cantidad_toneladas:
        disponible > 0 ? Math.round(disponible * 10000) / 10000 : 0,
    });
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Text size="xs" fw={700} c="gray" tt="uppercase">
          Cargas a despachar
        </Text>
        <Button
          size="xs"
          radius="lg"
          variant="light"
          color="indigo"
          leftSection={<IconPlus size={16} />}
          onClick={agregar}
          disabled={saving}
        >
          Añadir carga
        </Button>
      </Group>

      {cargas.map((carga, index) => {
        const disponible = calcularDisponible(
          index,
          carga.id_tipo_carbon,
          carga.calidad,
        );
        const vehiculo = vehiculos.find(
          (v) => v.id_vehiculo_carbon === carga.id_vehiculo_carbon,
        );
        const esTolva = exigeSegundaPlaca(carga.tipo_vehiculo);

        return (
          <Paper
            key={index}
            p="md"
            radius="lg"
            className="bg-zinc-900/60 border border-zinc-800"
          >
            <Group justify="space-between" mb="xs">
              <Badge color="indigo" variant="light" size="sm">
                Carga #{index + 1}
              </Badge>
              {cargas.length > 1 && (
                <ActionIcon
                  color="red"
                  variant="subtle"
                  size="sm"
                  onClick={() => eliminar(index)}
                  disabled={saving}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>

            <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
              <Select
                label="Tipo de carbon"
                placeholder={
                  loadingCatalogos ? "Cargando..." : "Seleccione el tipo"
                }
                data={tiposVisibles}
                value={
                  carga.id_tipo_carbon ? String(carga.id_tipo_carbon) : null
                }
                onChange={(val) =>
                  recalcularCantidad(
                    index,
                    val ? Number(val) : null,
                    carga.calidad,
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
                value={carga.calidad}
                onChange={(val) =>
                  recalcularCantidad(
                    index,
                    carga.id_tipo_carbon,
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
                  label="Cantidad estimada (TN)"
                  placeholder="0.00"
                  value={carga.cantidad_toneladas}
                  onChange={(val) =>
                    actualizar(index, { cantidad_toneladas: Number(val) || 0 })
                  }
                  leftSection={<IconScale size={16} />}
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                  disabled={saving}
                  hideControls
                />
                {carga.id_tipo_carbon && carga.calidad && (
                  <Group gap={6} mt={4} wrap="nowrap">
                    <Tooltip
                      label="Stock restante en el almacen de salida, descontando lo asignado a las demas cargas de este despacho"
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
                            actualizar(index, {
                              cantidad_toneladas:
                                Math.round(disponible * 10000) / 10000,
                            })
                          }
                          disabled={saving}
                        >
                          <IconCheck size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                )}
                {carga.id_tipo_carbon &&
                  carga.calidad &&
                  carga.cantidad_toneladas > disponible && (
                    <Text size="10px" c="red.4" mt={4} fw={600}>
                      La cantidad supera el stock disponible
                    </Text>
                  )}
              </div>

              <TextInput
                label="Fecha y hora de salida"
                type="datetime-local"
                value={carga.fecha_hora_salida}
                onChange={(e) =>
                  actualizar(index, {
                    fecha_hora_salida: e.currentTarget.value,
                  })
                }
                classNames={inputClasses}
                size="xs"
                radius="lg"
                disabled={saving}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm" mt="md">
              <div className="md:col-span-1">
                <Group gap="xs" align="flex-end" wrap="nowrap">
                  <Select
                    label="Vehiculo de la carga"
                    className="flex-1"
                    placeholder={
                      loadingCatalogos ? "Cargando..." : "Seleccione vehiculo"
                    }
                    data={vehiculosOptions}
                    value={
                      carga.id_vehiculo_carbon
                        ? String(carga.id_vehiculo_carbon)
                        : null
                    }
                    onChange={(val) => {
                      const encontrado = vehiculos.find(
                        (v) => String(v.id_vehiculo_carbon) === val,
                      );
                      const tipo = encontrado?.tipo_vehiculo as
                        | TipoVehiculoCarbon
                        | undefined;
                      actualizar(index, {
                        id_vehiculo_carbon: val ? Number(val) : null,
                        tipo_vehiculo: tipo ?? null,
                        segunda_placa: exigeSegundaPlaca(tipo)
                          ? carga.segunda_placa
                          : "",
                      });
                    }}
                    searchValue={vehiculoBusqueda}
                    onSearchChange={setVehiculoBusqueda}
                    leftSection={<IconTruck size={16} />}
                    classNames={inputClasses}
                    size="xs"
                    radius="lg"
                    searchable
                    clearable
                    nothingFoundMessage="Sin vehiculos registrados"
                    comboboxProps={{ withinPortal: true }}
                    // El filtrado lo hace `getCoincidencias` (Fuse + FlexSearch):
                    // el filtro por subcadena de Mantine descartaria las
                    // coincidencias difusas (placa mal escrita, marca parcial).
                    filter={({ options }) => options}
                    disabled={loadingCatalogos || saving}
                  />
                  <Tooltip label="Registrar nuevo vehiculo" withArrow>
                    <ActionIcon
                      size={32}
                      variant="filled"
                      color="indigo.6"
                      radius="lg"
                      onClick={() => {
                        setTargetVehiculoIdx(index);
                        setOpenNuevoVehiculo(true);
                      }}
                      disabled={saving}
                      className="mb-0.75"
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                {vehiculo && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Tipo: {vehiculo.tipo_vehiculo}
                    {vehiculo.marca ? ` · Marca: ${vehiculo.marca}` : ""}
                  </Text>
                )}
              </div>

              <div className="md:col-span-1">
                <TextInput
                  label={`Segunda placa ${esTolva ? "" : "(solo Tolva)"}`}
                  placeholder="Ej. A1B-234"
                  value={carga.segunda_placa}
                  onChange={(e) =>
                    actualizar(index, {
                      segunda_placa: e.currentTarget.value.toUpperCase(),
                    })
                  }
                  disabled={!esTolva || saving}
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                />
              </div>

              <div className="md:col-span-2">
                <FileInput
                  label="Evidencias del despacho"
                  placeholder="Imágenes o documentos..."
                  multiple
                  value={carga.archivos}
                  onChange={(files) => actualizar(index, { archivos: files })}
                  classNames={inputClasses}
                  size="xs"
                  radius="lg"
                  clearable
                  disabled={saving}
                />
              </div>
            </SimpleGrid>
          </Paper>
        );
      })}

      <ModalEstandar
        opened={openNuevoVehiculo}
        close={() => {
          setOpenNuevoVehiculo(false);
          setTargetVehiculoIdx(null);
        }}
        validateClose
        title="Nuevo Vehiculo"
        size="md"
      >
        <FormVehiculoCarbon
          marcas={marcas}
          onSuccess={(nuevo) => {
            onVehiculoRegistrado(nuevo);
            if (targetVehiculoIdx !== null) {
              const tipo = nuevo.tipo_vehiculo as TipoVehiculoCarbon;
              actualizar(targetVehiculoIdx, {
                id_vehiculo_carbon: nuevo.id_vehiculo_carbon,
                tipo_vehiculo: tipo,
                segunda_placa: exigeSegundaPlaca(tipo)
                  ? (cargas[targetVehiculoIdx]?.segunda_placa ?? "")
                  : "",
              });
            }
            setOpenNuevoVehiculo(false);
            setTargetVehiculoIdx(null);
          }}
          onMarcaRegistrada={(marca) => onMarcaRegistrada?.(marca)}
          onCancel={() => {
            setOpenNuevoVehiculo(false);
            setTargetVehiculoIdx(null);
          }}
        />
      </ModalEstandar>
    </Stack>
  );
};
