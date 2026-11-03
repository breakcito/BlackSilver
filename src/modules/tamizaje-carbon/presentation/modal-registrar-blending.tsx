import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  IconInfoCircle,
  IconScale,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { useNotify } from "../../../hooks/useNotify";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { colorCalidadCarbon } from "../../../shared/functions/calidad-carbon";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";
import { TipoCalidadCarbon } from "../../../shared/enums/carbon/tipo-calidad-carbon";
import { AuxService } from "../../../service/auxiliar.service";
import { TipoCarbonService } from "../../tipo-carbon/service/tipo-carbon.service";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import type {
  BlendingCarbonItem,
  StockCarbonItem,
} from "../service/tamizaje-carbon.responses";
import type { RES_Empleado } from "../../../service/responses/empleado";
import type { RES_Almacen } from "../../../service/responses/almacen";
import type { RES_TipoCarbon } from "../../tipo-carbon/service/tipo-carbon.responses";

interface Props {
  opened: boolean;
  onClose: () => void;
  /** Blending a editar. Si es `null`, se registra uno nuevo. */
  blending?: BlendingCarbonItem | null;
  onGuardado: (blending: BlendingCarbonItem) => void;
}

/**
 * Calidades que entran al blending.
 *
 * La cuarta calidad del catalogo ("Calidad", para el carbon con mas de 30% de
 * ceniza) NO se mezcla: es material que ya no se procesa.
 */
const CALIDADES_BLENDING: TipoCalidadCarbon[] = [
  TipoCalidadCarbon.Baja,
  TipoCalidadCarbon.Intermedia,
  TipoCalidadCarbon.Alta,
];

/** Porcentaje de ceniza a partir del cual se avisa (sin bloquear). */
const AVISO_CENIZA = 15;

/**
 * Supervisor de planta del blending.
 *
 * El reporte de planta lo firma siempre el mismo empleado (el mismo que
 * firma el zarandeo): el sistema lo elige solo y el usuario no lo cambia.
 */
const ID_SUPERVISOR = 8;

/** Fila del formulario: que calidad se toma y cuanto. */
interface FilaDetalle {
  id_stock_carbon: number;
  calidad: TipoCalidadCarbon;
  stock_disponible: number;
  cantidad_tomada: number;
  /**
   * Cantidad que el blending YA TOMO de esa calidad.
   *
   * El stock que se muestra es el que queda HOY en el almacen (ya descontado
   * por este blending), asi que para saber si lo que se pide es demasiado
   * hay que compararlo contra `stock_disponible + cantidad_previa`.
   */
  cantidad_previa: number;
}

const estilitos = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown: "bg-zinc-900 border-zinc-800",
  option: "text-zinc-300 hover:bg-zinc-800",
};

/**
 * Registro (o edicion) de un blending de carbon.
 *
 * El blending mezcla varias calidades del mismo tipo de carbon: el stock de
 * cada una se autocompleta con lo que hay y el usuario puede ajustarlo (no
 * es bloqueante: si pide mas de lo que hay, el stock queda en 0).
 */
export const ModalRegistrarBlending = ({
  opened,
  onClose,
  blending = null,
  onGuardado,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  const editando = Boolean(blending);

  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [tipos, setTipos] = useState<RES_TipoCarbon[]>([]);
  const [empleados, setEmpleados] = useState<RES_Empleado[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idSupervisor, setIdSupervisor] = useState<string | null>(null);
  const [idTipoCarbon, setIdTipoCarbon] = useState<string | null>(null);
  const [porcentajeCeniza, setPorcentajeCeniza] = useState<number>(0);
  const [fechaHora, setFechaHora] = useState(
    dayjs().format("YYYY-MM-DDTHH:mm"),
  );
  const [archivos, setArchivos] = useState<File[]>([]);

  const [stocks, setStocks] = useState<StockCarbonItem[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [detalles, setDetalles] = useState<FilaDetalle[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Catalogos ---
  useEffect(() => {
    if (!opened) return;
    let cancel = false;

    (async () => {
      setLoadingCatalogos(true);
      try {
        const [resAlm, resTipos, resEmp] = await Promise.all([
          AuxService.get_almacenes({ para_carbon: true }),
          TipoCarbonService.getTipos(),
          AuxService.get_empleados(),
        ]);
        if (cancel) return;
        if (resAlm?.data) setAlmacenes(resAlm.data);
        if (resTipos?.data) setTipos(resTipos.data);
        if (resEmp?.data) setEmpleados(resEmp.data);
      } catch (err) {
        console.error(err);
        notifyError("Error al cargar los catálogos de producción");
      } finally {
        if (!cancel) setLoadingCatalogos(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [opened, notifyError]);

  // Almacen: si se edita se respeta el del blending; si es nuevo se elige el
  // primer almacen de carbon.
  useEffect(() => {
    if (!opened) return;
    if (blending?.id_almacen) {
      setIdAlmacen(String(blending.id_almacen));
      return;
    }
    if (almacenes.length > 0) {
      setIdAlmacen((prev) => prev ?? String(almacenes[0].id_almacen));
    }
  }, [opened, blending, almacenes]);

  // Estado inicial del formulario.
  useEffect(() => {
    if (!opened) return;

    // El supervisor se autoelige (el de planta), pero el usuario puede
    // cambiarlo si hace falta.
    setIdSupervisor(
      blending?.id_empleado_supervisor
        ? String(blending.id_empleado_supervisor)
        : String(ID_SUPERVISOR),
    );
    setIdTipoCarbon(
      blending?.id_tipo_carbon ? String(blending.id_tipo_carbon) : null,
    );
    setPorcentajeCeniza(Number(blending?.porcentaje_ceniza) || 0);
    setFechaHora(
      blending?.fecha_hora_blending
        ? dayjs(blending.fecha_hora_blending).format("YYYY-MM-DDTHH:mm")
        : dayjs().format("YYYY-MM-DDTHH:mm"),
    );
    setArchivos([]);
    setError(null);

    // Al editar se parte de las cantidades que el blending ya tiene
    // registradas: no se vuelven a autocompletar con el stock actual.
    if (blending) {
      setDetalles(
        (blending.detalles ?? []).map((d) => ({
          id_stock_carbon: d.id_stock_carbon,
          calidad: d.calidad as TipoCalidadCarbon,
          stock_disponible: Number(d.stock_actual) || 0,
          cantidad_tomada: Number(d.cantidad_tomada) || 0,
          cantidad_previa: Number(d.cantidad_tomada) || 0,
        })),
      );
    } else {
      setDetalles([]);
    }
  }, [opened, blending]);

  /**
   * Stock de las calidades del tipo de carbon elegido.
   *
   * Se autocompleta con lo que hay: el usuario puede tomar menos o mas (no
   * es bloqueante), pero se le avisa cuando pide mas de lo disponible.
   */
  const cargarStocks = useCallback(async () => {
    if (!idAlmacen || !idTipoCarbon) {
      setStocks([]);
      setDetalles([]);
      return;
    }

    setLoadingStocks(true);
    // Se limpia el stock anterior: mientras carga, el detalle se queda como
    // esta para no mezclar filas de tipos distintos.
    setStocks([]);
    try {
      const resp = await TamizajeCarbonService.getStocks({
        id_almacen: Number(idAlmacen),
        id_tipo_carbon: Number(idTipoCarbon),
      });
      const filas = resp.success && resp.data ? resp.data : [];
      setStocks(filas);
    } catch (err) {
      console.error(err);
      setStocks([]);
    } finally {
      setLoadingStocks(false);
    }
  }, [idAlmacen, idTipoCarbon]);

  useEffect(() => {
    if (!opened) return;
    void cargarStocks();
  }, [opened, cargarStocks]);

  /**
   * Al cambiar de tipo de carbon se rehacen las filas con el stock nuevo.
   *
   * Si la fila ya existia (edicion) se conserva la cantidad que el usuario
   * habia puesto: solo se actualiza el stock de referencia.
   */
  useEffect(() => {
    if (!opened) return;
    if (!idAlmacen || !idTipoCarbon) return;
    if (loadingStocks) return;
    if (stocks.length === 0) return;

    setDetalles((prev) => {
      const porCalidad = new Map(prev.map((f) => [f.calidad, f]));

      return CALIDADES_BLENDING.map((calidad) => {
        const filaStock = stocks.find((s) => s.calidad === calidad);
        const idStock = filaStock?.id_stock_carbon ?? 0;
        const disponible = Number(filaStock?.stock_actual) || 0;
        const previa = porCalidad.get(calidad);

        if (previa && previa.id_stock_carbon === idStock) {
          return { ...previa, stock_disponible: disponible };
        }

        return {
          id_stock_carbon: idStock,
          calidad,
          stock_disponible: disponible,
          cantidad_tomada: disponible,
          cantidad_previa: 0,
        };
      });
    });
  }, [opened, idAlmacen, idTipoCarbon, stocks, loadingStocks]);

  const almacenOptions = useMemo(
    () =>
      almacenes.map((a) => ({
        value: String(a.id_almacen),
        label: a.nombre,
      })),
    [almacenes],
  );

  const tiposOptions = useMemo(
    () =>
      tipos.map((t) => ({
        value: String(t.id_tipo_carbon),
        label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
      })),
    [tipos],
  );

  const supervisoresOptions = useMemo(
    () =>
      empleados.map((e) => ({
        value: String(e.id_empleado),
        label: e.nombre_completo,
      })),
    [empleados],
  );

  // Búsqueda tolerante sobre los catálogos (Fuse + FlexSearch).
  const [almacenBusqueda, setAlmacenBusqueda] = useState("");
  const [supervisorBusqueda, setSupervisorBusqueda] = useState("");
  const [tipoBusqueda, setTipoBusqueda] = useState("");

  const almacenesVisibles = useMemo(() => {
    const q = almacenBusqueda.trim();
    if (!q) return almacenOptions;
    return getCoincidencias(almacenOptions, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [almacenOptions, almacenBusqueda]);

  const supervisoresVisibles = useMemo(() => {
    const q = supervisorBusqueda.trim();
    if (!q) return supervisoresOptions;
    return getCoincidencias(supervisoresOptions, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [supervisoresOptions, supervisorBusqueda]);

  const tiposVisibles = useMemo(() => {
    const q = tipoBusqueda.trim();
    if (!q) return tiposOptions;
    return getCoincidencias(tiposOptions, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [tiposOptions, tipoBusqueda]);

  const totalTomado = useMemo(
    () =>
      detalles.reduce((acc, f) => acc + (Number(f.cantidad_tomada) || 0), 0),
    [detalles],
  );

  /** Toneladas disponibles de mas para esa calidad (contando lo ya tomado). */
  const disponiblesDeFila = (fila: FilaDetalle) =>
    fila.stock_disponible + fila.cantidad_previa;

  const hayExceso = detalles.some(
    (f) => (Number(f.cantidad_tomada) || 0) > disponiblesDeFila(f),
  );

  const actualizarCantidad = (calidad: TipoCalidadCarbon, valor: number) => {
    setDetalles((prev) =>
      prev.map((f) =>
        f.calidad === calidad
          ? { ...f, cantidad_tomada: Number(valor) || 0 }
          : f,
      ),
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!idAlmacen) {
      setError("Debe seleccionar el almacén del blending");
      return;
    }
    if (!idSupervisor) {
      setError("Debe seleccionar el supervisor del blending");
      return;
    }
    if (!idTipoCarbon) {
      setError("Debe seleccionar el tipo de carbón");
      return;
    }
    if (porcentajeCeniza <= 0) {
      setError("Debe indicar el porcentaje de ceniza");
      return;
    }
    if (totalTomado <= 0) {
      setError("Debe indicar la cantidad a tomar de al menos una calidad");
      return;
    }

    const payloadDetalles = detalles
      .filter(
        (f) => (Number(f.cantidad_tomada) || 0) > 0 && f.id_stock_carbon > 0,
      )
      .map((f) => ({
        id_stock_carbon: f.id_stock_carbon,
        cantidad_tomada: Number(f.cantidad_tomada) || 0,
      }));

    if (payloadDetalles.length === 0) {
      setError("Debe indicar la cantidad a tomar de al menos una calidad");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id_almacen: Number(idAlmacen),
        id_empleado_supervisor: Number(idSupervisor),
        id_tipo_carbon: Number(idTipoCarbon),
        porcentaje_ceniza: Number(porcentajeCeniza),
        fecha_hora_blending: fechaHora,
        detalles: payloadDetalles,
        evidencias: archivos.length > 0 ? archivos : undefined,
      };

      const resp = blending
        ? await TamizajeCarbonService.actualizarBlending(
            blending.id_blending_carbon,
            payload,
          )
        : await TamizajeCarbonService.registrarBlending(payload);

      if (resp.success && resp.data) {
        notifySuccess(
          blending
            ? "Blending actualizado correctamente"
            : "Blending registrado correctamente",
        );
        onGuardado(resp.data);
      } else {
        const msg = resp.message || "Error al registrar el blending";
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
    <ModalEstandar
      opened={opened}
      close={onClose}
      title={editando ? "Editar Blending" : "Nuevo Blending"}
      size="62rem"
      validateClose={saving}
      rightSection={
        <Group gap={6}>
          {blending && (
            <Badge
              variant="light"
              color="cyan"
              radius="xl"
              size="sm"
              className="font-mono"
            >
              {blending.correlativo}
            </Badge>
          )}
          <Group gap={4}>
            <Text size="xs" fw={500}>
              Almacén:
            </Text>
            <Select
              placeholder={
                loadingCatalogos ? "Cargando..." : "Seleccione el almacén"
              }
              data={almacenesVisibles}
              value={idAlmacen}
              onChange={(val) => {
                setIdAlmacen(val);
                setAlmacenBusqueda("");
              }}
              searchValue={almacenBusqueda}
              onSearchChange={setAlmacenBusqueda}
              classNames={estilitos}
              size="xs"
              radius="lg"
              searchable
              nothingFoundMessage="Sin almacenes de carbón"
              comboboxProps={{ withinPortal: true }}
              filter={({ options }) => options}
              disabled={saving}
            />
          </Group>
        </Group>
      }
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" variant="light" title="Atención" radius="md">
            {error}
          </Alert>
        )}

        {/* Cabecera */}
        <Paper
          p="md"
          radius="lg"
          className="bg-zinc-900/60 border border-zinc-800"
        >
          <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
            <Select
              label="Supervisor"
              placeholder={
                loadingCatalogos ? "Cargando..." : "Seleccione el supervisor"
              }
              data={supervisoresVisibles}
              value={idSupervisor}
              onChange={(val) => {
                setIdSupervisor(val);
                setSupervisorBusqueda("");
              }}
              searchValue={supervisorBusqueda}
              onSearchChange={setSupervisorBusqueda}
              leftSection={<IconScale size={16} />}
              classNames={estilitos}
              size="xs"
              radius="lg"
              searchable
              nothingFoundMessage="Sin empleados registrados"
              comboboxProps={{ withinPortal: true }}
              filter={({ options }) => options}
              disabled={saving}
            />

            <Select
              label="Tipo de carbón"
              placeholder={
                loadingCatalogos ? "Cargando..." : "Seleccione el tipo"
              }
              data={tiposVisibles}
              value={idTipoCarbon}
              onChange={(val) => {
                setIdTipoCarbon(val);
                setTipoBusqueda("");
              }}
              searchValue={tipoBusqueda}
              onSearchChange={setTipoBusqueda}
              classNames={estilitos}
              size="xs"
              radius="lg"
              searchable
              nothingFoundMessage="Sin tipos de carbón"
              comboboxProps={{ withinPortal: true }}
              filter={({ options }) => options}
              disabled={saving || editando}
            />

            <NumberInput
              label="% de ceniza"
              placeholder="0.00"
              value={porcentajeCeniza}
              onChange={(val) => setPorcentajeCeniza(Number(val) || 0)}
              max={100}
              hideControls
              classNames={estilitos}
              size="xs"
              radius="lg"
              disabled={saving}
            />

            <TextInput
              label="Fecha y hora"
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.currentTarget.value)}
              classNames={estilitos}
              size="xs"
              radius="lg"
              disabled={saving}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm" mt="sm">
            <FileInput
              label="Evidencias"
              placeholder="Imágenes o documentos..."
              multiple
              value={archivos}
              onChange={setArchivos}
              classNames={estilitos}
              size="xs"
              radius="lg"
              clearable
              disabled={saving}
            />
            {porcentajeCeniza > AVISO_CENIZA && (
              <Alert
                color="yellow"
                variant="light"
                radius="md"
                icon={<IconInfoCircle size={16} />}
              >
                El lote tiene {formatNumber(porcentajeCeniza)}% de ceniza, por
                encima del máximo {AVISO_CENIZA}% permitido.
              </Alert>
            )}
          </SimpleGrid>
        </Paper>

        {/* Detalle: stock tomado por calidad — una columna por calidad */}
        <Paper
          p="md"
          radius="lg"
          className="bg-zinc-900/60 border border-zinc-800"
        >
          <Group justify="space-between" mb="xs">
            <Badge variant="light" color="indigo" radius="xl" size="sm">
              {formatNumber(totalTomado)} TN en total
            </Badge>
          </Group>

          {loadingStocks ? (
            <Group gap="xs" py="md" justify="center">
              <Loader size={14} color="indigo" />
              <Text size="xs" c="dimmed">
                Consultando stock...
              </Text>
            </Group>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              {detalles.map((fila) => (
                <Paper
                  key={fila.calidad}
                  p="sm"
                  radius="lg"
                  className="bg-zinc-900/80 border border-zinc-800"
                >
                  <Group justify="space-between" mb={8}>
                    <Badge
                      size="sm"
                      variant="light"
                      color={colorCalidadCarbon(fila.calidad)}
                      radius="sm"
                    >
                      {fila.calidad}
                    </Badge>
                    <Text size="10px" c="dimmed" fw={600}>
                      Stock: {formatNumber(fila.stock_disponible)} TN
                    </Text>
                  </Group>

                  <NumberInput
                    aria-label={`Cantidad a mezclar de ${fila.calidad}`}
                    placeholder="0.00"
                    value={fila.cantidad_tomada}
                    onChange={(val) =>
                      actualizarCantidad(fila.calidad, Number(val) || 0)
                    }
                    min={0}
                    decimalScale={4}
                    hideControls
                    classNames={estilitos}
                    size="xs"
                    radius="lg"
                    disabled={saving}
                  />

                  {(Number(fila.cantidad_tomada) || 0) >
                    disponiblesDeFila(fila) && (
                    <Tooltip
                      label="Se pedirá más de lo que hay: el stock de esa calidad quedará en 0"
                      withArrow
                    >
                      <Text size="10px" c="yellow.4" fw={600} mt={4}>
                        Supera el stock disponible
                      </Text>
                    </Tooltip>
                  )}
                </Paper>
              ))}
            </SimpleGrid>
          )}

          {hayExceso && (
            <Alert
              color="yellow"
              variant="light"
              radius="md"
              mt="sm"
              icon={<IconInfoCircle size={16} />}
            >
              Hay calidades donde se pidió más carbon del que hay en stock. Se
              registra igual y esas calidades quedan en cero.
            </Alert>
          )}
        </Paper>

        <Group justify="flex-end" gap="sm">
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
          >
            {editando ? "Guardar cambios" : "Registrar blending"}
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
