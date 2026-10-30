import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
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
  IconDeviceFloppy,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../../hooks/useNotify";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import { useCatalogosDespacho } from "../../hooks/useCatalogosDespacho";
import { EstadoCargaVentaCarbon } from "../../../../shared/enums/venta-carbon/estado-carga-venta-carbon";
import { VentaCarbonService } from "../../service/venta-carbon.service";
import { inputClasses } from "../components/input-classes";
import {
  calcularImportesCarga,
  sumarImportes,
  type ImportesCarga,
} from "./liquidacion-calculos";
import type {
  CargaVentaCarbonItem,
  LiquidacionVentaCarbonItem,
  VentaCarbonResumen,
} from "../../service/venta-carbon.responses";

interface Props {
  venta: VentaCarbonResumen;
  /** Liquidacion a editar. `null` significa registrar una nueva. */
  liquidacion: LiquidacionVentaCarbonItem | null;
  /**
   * Tipo de carbon preseleccionado. Se usa al liquidar un grupo de cargas:
   * el tipo queda fijo porque una liquidacion solo admite cargas de un
   * mismo tipo.
   */
  tipoInicial?: number | null;
  /** Cargas que vienen preseleccionadas (grupo a liquidar). */
  cargasIniciales?: number[];
  onClose: () => void;
  onSaved: () => void;
}

/** Precio de una carga dentro del formulario de liquidacion. */
interface PrecioCarga {
  id_carga_venta_carbon: number;
  precio_base: number;
  descuento: number;
  bono: number;
}

export const ModalLiquidacion = ({
  venta,
  liquidacion,
  tipoInicial = null,
  cargasIniciales = [],
  onClose,
  onSaved,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();
  const { tipos } = useCatalogosDespacho();

  const editando = liquidacion !== null;

  const [idTipoCarbon, setIdTipoCarbon] = useState<string | null>(
    liquidacion
      ? String(liquidacion.id_tipo_carbon)
      : tipoInicial
        ? String(tipoInicial)
        : null,
  );
  const [codigoOrdenCompra, setCodigoOrdenCompra] = useState(
    liquidacion?.codigo_orden_compra ?? "",
  );
  const [numeroReporte, setNumeroReporte] = useState(
    liquidacion?.numero_reporte ?? "",
  );
  const [fechaAprobacion, setFechaAprobacion] = useState(
    liquidacion?.fecha_aprobacion
      ? dayjs(liquidacion.fecha_aprobacion).format("YYYY-MM-DD")
      : "",
  );
  const [version, setVersion] = useState(liquidacion?.version ?? "");
  const [archivos, setArchivos] = useState<File[]>([]);

  const [precios, setPrecios] = useState<PrecioCarga[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir una liquidacion existente se precargan los precios de sus cargas.
  // Al abrir un grupo, se preseleccionan todas las cargas del grupo.
  useEffect(() => {
    if (liquidacion) {
      setPrecios(
        liquidacion.cargas.map((c) => ({
          id_carga_venta_carbon: c.id_carga_venta_carbon,
          precio_base: Number(c.precio_base) || 0,
          descuento: Number(c.descuento) || 0,
          bono: Number(c.bono) || 0,
        })),
      );
      return;
    }

    setPrecios(
      cargasIniciales.map((idCarga) => ({
        id_carga_venta_carbon: idCarga,
        precio_base: 0,
        descuento: 0,
        bono: 0,
      })),
    );
  }, [liquidacion, cargasIniciales]);

  /**
   * Cargas que se pueden liquidar: llegada confirmada, del tipo elegido y sin
   * liquidacion asignada. Las que ya pertenecen a esta liquidacion siguen
   * disponibles para poder editarlas.
   */
  const cargasDisponibles = useMemo(() => {
    return venta.cargas.filter((c) => {
      const estadoValido =
        c.estado === EstadoCargaVentaCarbon.LlegadaConfirmada ||
        c.estado === EstadoCargaVentaCarbon.EnLiquidacion;
      if (!estadoValido) return false;

      const liquidacionActual = c.id_liquidacion_venta_carbon;
      if (liquidacionActual) {
        return (
          liquidacion !== null &&
          liquidacionActual === liquidacion.id_liquidacion_venta_carbon
        );
      }

      return true;
    });
  }, [venta.cargas, liquidacion]);

  /** Tipos de carbon que tienen cargas liquidables. */
  const tiposDisponibles = useMemo(() => {
    const ids = new Set(cargasDisponibles.map((c) => c.id_tipo_carbon));
    return tipos.filter((t) => ids.has(t.id_tipo_carbon));
  }, [tipos, cargasDisponibles]);

  /** Cargas del tipo seleccionado. */
  const cargasDelTipo = useMemo(
    () =>
      cargasDisponibles.filter(
        (c) => c.id_tipo_carbon === Number(idTipoCarbon),
      ),
    [cargasDisponibles, idTipoCarbon],
  );

  const preciosPorId = useMemo(() => {
    const mapa = new Map<number, PrecioCarga>();
    precios.forEach((p) => mapa.set(p.id_carga_venta_carbon, p));
    return mapa;
  }, [precios]);

  const importesPorCarga = useMemo(() => {
    const mapa = new Map<number, ImportesCarga>();
    cargasDelTipo.forEach((c) => {
      const precio = preciosPorId.get(c.id_carga_venta_carbon);
      if (!precio) return;
      mapa.set(
        c.id_carga_venta_carbon,
        calcularImportesCarga(
          precio.precio_base,
          precio.descuento,
          precio.bono,
          Number(c.cantidad_toneladas) || 0,
          Number(venta.porcentaje_igv) || 0,
          Number(venta.porcentaje_detraccion) || 0,
        ),
      );
    });
    return mapa;
  }, [
    cargasDelTipo,
    preciosPorId,
    venta.porcentaje_igv,
    venta.porcentaje_detraccion,
  ]);

  const totales = useMemo(
    () =>
      sumarImportes(
        cargasDelTipo
          .map((c) => importesPorCarga.get(c.id_carga_venta_carbon))
          .filter((i): i is ImportesCarga => Boolean(i)),
      ),
    [cargasDelTipo, importesPorCarga],
  );

  const alternarCarga = (idCarga: number, marcada: boolean) => {
    setPrecios((prev) => {
      if (!marcada)
        return prev.filter((p) => p.id_carga_venta_carbon !== idCarga);

      if (prev.some((p) => p.id_carga_venta_carbon === idCarga)) return prev;

      return [
        ...prev,
        {
          id_carga_venta_carbon: idCarga,
          precio_base: 0,
          descuento: 0,
          bono: 0,
        },
      ];
    });
  };

  const actualizarPrecio = (
    idCarga: number,
    cambios: Partial<Omit<PrecioCarga, "id_carga_venta_carbon">>,
  ) => {
    setPrecios((prev) =>
      prev.map((p) =>
        p.id_carga_venta_carbon === idCarga ? { ...p, ...cambios } : p,
      ),
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!idTipoCarbon) {
      setError("Debe indicar el tipo de carbon de la liquidacion");
      return;
    }
    if (precios.length === 0) {
      setError("Debe seleccionar al menos una carga para liquidar");
      return;
    }

    const sinPrecio = precios.filter((p) => p.precio_base <= 0);
    if (sinPrecio.length > 0) {
      setError("Todas las cargas seleccionadas deben tener precio base");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id_tipo_carbon: Number(idTipoCarbon),
        codigo_orden_compra: codigoOrdenCompra.trim() || null,
        numero_reporte: numeroReporte.trim() || null,
        fecha_aprobacion: fechaAprobacion || null,
        version: version.trim() || null,
        cargas: precios.map((p) => ({
          id_carga_venta_carbon: p.id_carga_venta_carbon,
          precio_base: p.precio_base,
          descuento: p.descuento,
          bono: p.bono,
        })),
        evidencias: archivos.length > 0 ? archivos : undefined,
      };

      const res = editando
        ? await VentaCarbonService.actualizarLiquidacion(
            venta.id_venta_carbon,
            liquidacion.id_liquidacion_venta_carbon,
            payload,
          )
        : await VentaCarbonService.registrarLiquidacion(
            venta.id_venta_carbon,
            payload,
          );

      if (res.success) {
        notifySuccess(
          editando
            ? "Liquidacion actualizada correctamente"
            : "Liquidacion registrada correctamente",
        );
        onSaved();
      } else {
        const msg = res.message || "Error al registrar la liquidacion";
        setError(msg);
        notifyError(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md">
      {error && (
        <Alert color="red" variant="light" title="Atencion" radius="md">
          {error}
        </Alert>
      )}

      {/* Cabecera de la liquidacion */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        {/* <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
          Cabecera de la liquidacion
        </Text> */}
        <SimpleGrid cols={{ base: 1, md: 5 }} spacing="sm">
          <Select
            label="Tipo de carbon"
            placeholder={
              tiposDisponibles.length === 0
                ? "No hay cargas por liquidar"
                : "Seleccione el tipo"
            }
            data={tiposDisponibles.map((t) => ({
              value: String(t.id_tipo_carbon),
              label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
            }))}
            value={idTipoCarbon}
            onChange={(val) => {
              setIdTipoCarbon(val);
              // Cambiar de tipo reinicia la seleccion: las cargas de otro
              // tipo no pueden convivir en la misma liquidacion.
              setPrecios([]);
            }}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            searchable
            nothingFoundMessage="Sin tipos con cargas disponibles"
            comboboxProps={{ withinPortal: true }}
            disabled={saving || editando || tipoInicial !== null}
          />

          <TextInput
            label="Codigo de orden de compra"
            placeholder="Ej. OC-2026-0001"
            value={codigoOrdenCompra}
            onChange={(e) =>
              setCodigoOrdenCompra(e.currentTarget.value.toUpperCase())
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <TextInput
            label="Numero de reporte"
            placeholder="Ej. REP-0001"
            value={numeroReporte}
            onChange={(e) =>
              setNumeroReporte(e.currentTarget.value.toUpperCase())
            }
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <TextInput
            label="Fecha de aprobacion"
            type="date"
            value={fechaAprobacion}
            onChange={(e) => setFechaAprobacion(e.currentTarget.value)}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />

          <TextInput
            label="Version"
            placeholder="Ej. V2"
            value={version}
            onChange={(e) => setVersion(e.currentTarget.value.toUpperCase())}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            disabled={saving}
          />
        </SimpleGrid>

        <div className="mt-4">
          <MultiFilePicker
            label="Evidencias de la liquidacion"
            files={archivos}
            onFilesChange={setArchivos}
          />
        </div>
      </Paper>

      {/* Cargas de la liquidacion */}
      <Paper
        p="md"
        radius="lg"
        className="bg-zinc-900/60 border border-zinc-800"
      >
        <Group justify="space-between" mb="xs">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            Cargas de la liquidacion
          </Text>
          <Badge variant="light" color="indigo" radius="xl" size="sm">
            {precios.length} de {cargasDelTipo.length} seleccionadas
          </Badge>
        </Group>

        {!idTipoCarbon ? (
          <Text size="xs" c="dimmed" ta="center" py="md">
            Seleccione el tipo de carbon para ver las cargas disponibles.
          </Text>
        ) : cargasDelTipo.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="md">
            No hay cargas con llegada confirmada de este tipo de carbon.
          </Text>
        ) : (
          <Stack gap="xs">
            {cargasDelTipo.map((carga: CargaVentaCarbonItem) => {
              const precio = preciosPorId.get(carga.id_carga_venta_carbon);
              const importes = importesPorCarga.get(
                carga.id_carga_venta_carbon,
              );
              const seleccionada = Boolean(precio);

              return (
                <Paper
                  key={carga.id_carga_venta_carbon}
                  p="sm"
                  radius="md"
                  className={
                    seleccionada
                      ? "bg-zinc-800/60 border border-indigo-500/40"
                      : "bg-zinc-950/40 border border-zinc-800"
                  }
                >
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    align="flex-start"
                  >
                    <Checkbox
                      checked={seleccionada}
                      onChange={(e) =>
                        alternarCarga(
                          carga.id_carga_venta_carbon,
                          e.currentTarget.checked,
                        )
                      }
                      disabled={saving}
                      size="sm"
                    />

                    <div className="flex flex-1 relative gap-2.5 ">
                      <Badge size="sm" color="blue">
                        <span className="font-bold">Placa:</span>{" "}
                        {carga.vehiculo_placa}
                      </Badge>
                      <Badge size="sm" color="yellow">
                        <span className="font-bold">Ticket:</span>{" "}
                        {carga.codigo_ticket_balanza}
                      </Badge>
                      <Badge size="sm" color="teal">
                        <span className="font-bold">Calidad:</span>{" "}
                        {carga.calidad ?? "—"}
                      </Badge>
                      <Badge size="sm" color="grape">
                        {formatNumber(carga.cantidad_toneladas)} TN
                      </Badge>
                      <Badge size="sm" color="cyan">
                        Ingreso:{" "}
                        {carga.fecha_hora_ingreso
                          ? dayjs(carga.fecha_hora_ingreso).format(
                              "DD/MM/YYYY HH:mm",
                            )
                          : "—"}
                      </Badge>
                    </div>

                    <Tooltip label="Quitar de la liquidacion" withArrow>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="sm"
                        onClick={() =>
                          alternarCarga(carga.id_carga_venta_carbon, false)
                        }
                        disabled={saving || !seleccionada}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>

                  {seleccionada && precio && (
                    <SimpleGrid cols={{ base: 2, md: 6 }} spacing="xs" mt="sm">
                      <NumberInput
                        label="Precio base"
                        value={precio.precio_base}
                        onChange={(val) =>
                          actualizarPrecio(carga.id_carga_venta_carbon, {
                            precio_base: Number(val) || 0,
                          })
                        }
                        fixedDecimalScale
                        hideControls
                        classNames={inputClasses}
                        size="xs"
                        radius="lg"
                        disabled={saving}
                      />
                      <NumberInput
                        label="Descuento"
                        value={precio.descuento}
                        onChange={(val) =>
                          actualizarPrecio(carga.id_carga_venta_carbon, {
                            descuento: Number(val) || 0,
                          })
                        }
                        fixedDecimalScale
                        hideControls
                        classNames={inputClasses}
                        size="xs"
                        radius="lg"
                        disabled={saving}
                      />
                      <NumberInput
                        label="Bono"
                        value={precio.bono}
                        onChange={(val) =>
                          actualizarPrecio(carga.id_carga_venta_carbon, {
                            bono: Number(val) || 0,
                          })
                        }
                        fixedDecimalScale
                        hideControls
                        classNames={inputClasses}
                        size="xs"
                        radius="lg"
                        disabled={saving}
                      />

                      <Text size="xs" c="gray" className="relative top-1.5">
                        P. materia prima
                        <Text
                          size="sm"
                          fw={700}
                          c="zinc.200"
                          className="relative top-2"
                        >
                          S/ {formatNumber(importes?.precio_materia_prima ?? 0)}
                        </Text>
                      </Text>
                      <Text size="xs" c="gray" className="relative top-1.5">
                        Subtotal
                        <Text
                          size="sm"
                          fw={700}
                          c="teal.3"
                          className="relative top-2"
                        >
                          S/ {formatNumber(importes?.subtotal ?? 0)}
                        </Text>
                      </Text>
                      <Text size="xs" c="gray" className="relative top-1.5">
                        Neto a pagar
                        <Text
                          size="sm"
                          fw={700}
                          c="lime.3"
                          className="relative top-2"
                        >
                          S/ {formatNumber(importes?.neto_a_pagar ?? 0)}
                        </Text>
                      </Text>
                    </SimpleGrid>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Totales */}
      <div className="ml-4">
        <SimpleGrid cols={{ base: 2, md: 5 }} spacing="sm">
          <Text size="xs" c="gray">
            Subtotal
            <Text size="sm" fw={700} c="zinc.200">
              S/ {formatNumber(totales.subtotal)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            IGV ({formatNumber(venta.porcentaje_igv)}%)
            <Text size="sm" fw={700} c="zinc.200">
              S/ {formatNumber(totales.monto_igv)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Total
            <Text size="sm" fw={700} c="indigo.3">
              S/ {formatNumber(totales.total)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Detraccion ({formatNumber(venta.porcentaje_detraccion)}%)
            <Text size="sm" fw={700} c="orange.3">
              S/ {formatNumber(totales.monto_detraccion)}
            </Text>
          </Text>
          <Text size="xs" c="gray">
            Neto a pagar
            <Text size="sm" fw={700} c="lime.3">
              S/ {formatNumber(totales.neto_a_pagar)}
            </Text>
          </Text>
        </SimpleGrid>
      </div>

      <Group justify="flex-end" gap="sm" mt={"sm"}>
        <Button
          variant="default"
          onClick={onClose}
          disabled={saving}
          size="xs"
          radius="lg"
        >
          Cancelar
        </Button>
        <Button
          color="indigo"
          onClick={handleSubmit}
          loading={saving}
          size="xs"
          radius="lg"
          leftSection={
            editando ? <IconDeviceFloppy size={16} /> : <IconCheck size={16} />
          }
        >
          {editando ? "Guardar cambios" : "Registrar liquidacion"}
        </Button>
      </Group>

      {/* {!editando && (
        <Group gap="xs" justify="center">
          <IconPlus size={14} className="text-zinc-600" />
          <Text size="10px" c="dimmed">
            La liquidacion agrupa las cargas por tipo de carbon. Las cargas
            selectas quedan bloqueadas para la liquidacion.
          </Text>
        </Group>
      )} */}
    </Stack>
  );
};
