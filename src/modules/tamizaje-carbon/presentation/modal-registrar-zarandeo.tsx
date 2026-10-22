import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Skeleton,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { IconAlertTriangle } from "@tabler/icons-react";

import { useNotify } from "../../../hooks/useNotify";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { getCoincidencias } from "../../../shared/functions/get-coincidencias";
import { colorCalidadCarbon } from "../../../shared/functions/calidad-carbon";
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
  GrupoCargasItem,
  StockCarbonItem,
  ZarandeoCarbonItem,
} from "../service/tamizaje-carbon.responses";

interface VarianteFila {
  id_tipo_variante: string | null;
  porcentaje_extraccion: number | string;
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onGuardado: (item: ZarandeoCarbonItem) => void;
}

const estilitos = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown: "bg-zinc-900 border-zinc-800",
  option: "text-zinc-300 hover:bg-zinc-800",
};

export const ModalRegistrarZarandeo = ({
  opened,
  onClose,
  onGuardado,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  // Masters
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [tiposCarbon, setTiposCarbon] = useState<RES_TipoCarbon[]>([]);
  const [supervisores, setSupervisores] = useState<RES_Empleado[]>([]);
  const [grupos, setGrupos] = useState<GrupoCargasItem[]>([]);
  const [stockPorCalidad, setStockPorCalidad] = useState<StockCarbonItem[]>([]);

  // Origen: 'carga' (grupo de cargas) | 'stock' (rezarandeo sobre el stock)
  const [origen, setOrigen] = useState<"carga" | "stock">("carga");
  const [idGrupo, setIdGrupo] = useState<string | null>(null);

  // Form state
  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idTipoPadre, setIdTipoPadre] = useState<string | null>(null);
  const [idSupervisor, setIdSupervisor] = useState<string | null>(null);
  const [calidad, setCalidad] = useState<string | null>(null);
  const [cantidadTamizada, setCantidadTamizada] = useState<number | string>("");
  const [fechaHora, setFechaHora] = useState(
    dayjs().format("YYYY-MM-DD HH:mm"),
  );
  const [archivos, setArchivos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Búsquedas controladas de los selects sobre catálogo
  const [almacenBusqueda, setAlmacenBusqueda] = useState("");
  const [tipoBusqueda, setTipoBusqueda] = useState("");
  const [supervisorBusqueda, setSupervisorBusqueda] = useState("");

  // Variantes registradas en el catálogo para el tipo padre
  const [catalogoVariantes, setCatalogoVariantes] = useState<
    RES_VarianteCarbon[]
  >([]);
  const [loadingVariantes, setLoadingVariantes] = useState(false);
  const [variantes, setVariantes] = useState<VarianteFila[]>([]);
  // Tipo padre al que pertenece el catálogo cargado: permite saber si los
  // datos en pantalla son del tipo actual o están obsoletos (tipo anterior).
  const [tipoCatalogoCargado, setTipoCatalogoCargado] = useState<string | null>(
    null,
  );

  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);

  // Contadores de petición: cada carga incrementa el suyo y solo la respuesta
  // con el número vigente puede escribir en el estado. Así una respuesta lenta
  // (p. ej. el listado sin filtro) no pisa a la del filtro actual, ni una
  // petición en vuelo repuebla el modal tras cerrarlo.
  const reqGrupos = useRef(0);
  const reqStock = useRef(0);
  const reqVariantes = useRef(0);

  // Carga de catálogos necesarios
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
        if (resEmp?.data) setSupervisores(resEmp.data);
      } catch (err) {
        console.error("Error al cargar maestros para zarandeo", err);
      }
    };
    fetchMaestros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // Solo se pueden zarandear tipos que tienen variantes configuradas
  const tiposConVariantes = useMemo(
    () => tiposCarbon.filter((t) => (t.cantidad_variantes ?? 0) > 0),
    [tiposCarbon],
  );

  // Grupos de cargas del almacén y tipo seleccionados.
  // Sin tipo seleccionado no se consulta: el endpoint acepta filtros
  // opcionales, así que sin ellos devuelve los grupos de TODOS los almacenes
  // y tipos, que no corresponden a la selección y se muestran en el selector.
  const cargarGrupos = useCallback(async () => {
    if (!idAlmacen || !idTipoPadre) {
      setGrupos([]);
      setLoadingGrupos(false);
      return;
    }
    const req = ++reqGrupos.current;
    setLoadingGrupos(true);
    try {
      const resp = await TamizajeCarbonService.getGruposCargas({
        id_almacen: Number(idAlmacen),
        id_tipo_carbon: Number(idTipoPadre),
      });
      if (req !== reqGrupos.current) return;
      setGrupos(resp.success && resp.data ? resp.data : []);
    } catch (err) {
      if (req !== reqGrupos.current) return;
      console.error(err);
      setGrupos([]);
    } finally {
      if (req === reqGrupos.current) setLoadingGrupos(false);
    }
  }, [idAlmacen, idTipoPadre]);

  useEffect(() => {
    if (!opened) return;
    cargarGrupos();
  }, [opened, cargarGrupos]);

  // Stock disponible del tipo seleccionado (para el rezarandeo)
  const cargarStock = useCallback(async () => {
    if (!idAlmacen || !idTipoPadre) {
      setStockPorCalidad([]);
      setLoadingStock(false);
      return;
    }
    const req = ++reqStock.current;
    setLoadingStock(true);
    try {
      const resp = await TamizajeCarbonService.getStocks({
        id_almacen: Number(idAlmacen),
        id_tipo_carbon: Number(idTipoPadre),
      });
      if (req !== reqStock.current) return;
      setStockPorCalidad(resp.success && resp.data ? resp.data : []);
    } catch (err) {
      if (req !== reqStock.current) return;
      console.error(err);
      setStockPorCalidad([]);
    } finally {
      if (req === reqStock.current) setLoadingStock(false);
    }
  }, [idAlmacen, idTipoPadre]);

  useEffect(() => {
    if (!opened) return;
    cargarStock();
  }, [opened, cargarStock]);

  // Variantes configuradas del tipo padre: se autocompletan con su % de extracción
  useEffect(() => {
    if (!idTipoPadre) {
      setCatalogoVariantes([]);
      setVariantes([]);
      setTipoCatalogoCargado(null);
      setLoadingVariantes(false);
      return;
    }
    const fetchVariantes = async () => {
      const req = ++reqVariantes.current;
      setLoadingVariantes(true);
      try {
        const resp = await TipoCarbonService.getVariantes(Number(idTipoPadre));
        if (req !== reqVariantes.current) return;
        const lista = resp.success && resp.data ? resp.data : [];
        setCatalogoVariantes(lista);
        setVariantes(
          lista.map((v) => ({
            id_tipo_variante: String(v.id_tipo_variante),
            porcentaje_extraccion: Number(v.porcentaje_extraccion) || 0,
          })),
        );
        setTipoCatalogoCargado(idTipoPadre);
      } catch (err) {
        if (req !== reqVariantes.current) return;
        console.error("Error al cargar variantes del carbón", err);
        setCatalogoVariantes([]);
        setVariantes([]);
        setTipoCatalogoCargado(idTipoPadre);
      } finally {
        if (req === reqVariantes.current) setLoadingVariantes(false);
      }
    };
    fetchVariantes();
  }, [idTipoPadre]);

  // Carga en curso real o catálogo desactualizado respecto al tipo elegido
  const cargandoVariantes =
    loadingVariantes ||
    (idTipoPadre !== null && tipoCatalogoCargado !== idTipoPadre);

  // Reset del formulario al cerrar
  useEffect(() => {
    if (!opened) {
      // Invalida las peticiones en vuelo: si responden después del cierre no
      // deben repoblar el modal (era la info anterior que aparecía al abrir).
      reqGrupos.current += 1;
      reqStock.current += 1;
      reqVariantes.current += 1;
      setLoadingGrupos(false);
      setLoadingStock(false);
      setLoadingVariantes(false);
      setOrigen("carga");
      setIdGrupo(null);
      setIdTipoPadre(null);
      setIdSupervisor(null);
      setCalidad(null);
      setCantidadTamizada("");
      setFechaHora(dayjs().format("YYYY-MM-DD HH:mm"));
      setArchivos([]);
      setCatalogoVariantes([]);
      setVariantes([]);
      setTipoCatalogoCargado(null);
      setGrupos([]);
      setStockPorCalidad([]);
    }
  }, [opened]);

  const grupoSeleccionado = useMemo(
    () => (idGrupo === null ? null : (grupos[Number(idGrupo)] ?? null)),
    [grupos, idGrupo],
  );

  // Calidades con stock disponible para el tipo y almacén (modo rezarandeo)
  const calidadesConStock = useMemo(
    () =>
      stockPorCalidad
        .filter((s) => Number(s.stock_actual) > 0 && s.calidad)
        .map((s) => ({
          valor: s.calidad as string,
          stock: Number(s.stock_actual),
        })),
    [stockPorCalidad],
  );

  const handleAgregarVariante = (value: string | null) => {
    if (!value) return;
    const id = Number(value);
    if (variantes.some((v) => Number(v.id_tipo_variante) === id)) return;
    const catalogo = catalogoVariantes.find((v) => v.id_tipo_variante === id);
    setVariantes((prev) => [
      ...prev,
      {
        id_tipo_variante: String(id),
        porcentaje_extraccion: Number(catalogo?.porcentaje_extraccion) || 0,
      },
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

  // Cálculos
  const cantTamizadaNum = Number(cantidadTamizada) || 0;

  const totalExtraido = useMemo(
    () =>
      variantes.reduce(
        (acc, v) =>
          acc +
          (cantTamizadaNum * (Number(v.porcentaje_extraccion) || 0)) / 100,
        0,
      ),
    [variantes, cantTamizadaNum],
  );

  const sumaPorcentajes = useMemo(
    () =>
      variantes.reduce(
        (acc, v) => acc + (Number(v.porcentaje_extraccion) || 0),
        0,
      ),
    [variantes],
  );

  // Opciones de variantes: las del catálogo del tipo padre menos las ya elegidas
  const variantesDisponiblesOptions = useMemo(
    () =>
      catalogoVariantes
        .filter(
          (v) =>
            !variantes.some(
              (f) => Number(f.id_tipo_variante) === v.id_tipo_variante,
            ),
        )
        .map((v) => ({
          value: String(v.id_tipo_variante),
          label: `${v.nombre}${v.codigo ? ` (${v.codigo})` : ""}`,
        })),
    [catalogoVariantes, variantes],
  );

  const gruposOptions = useMemo(
    () =>
      grupos.map((g, i) => ({
        value: String(i),
        label: `${g.calidad ?? "Sin calidad"} · ${g.cantidad_cargas} carga(s) · ${formatNumber(g.cantidad_total)} TN`,
      })),
    [grupos],
  );

  const calidadesOptions = useMemo(
    () =>
      calidadesConStock.map((c) => ({
        value: c.valor,
        label: `${c.valor} · ${formatNumber(c.stock)} TN disponibles`,
      })),
    [calidadesConStock],
  );

  const handleGrupoChange = (value: string | null) => {
    setIdGrupo(value);
    if (value === null) {
      setCalidad(null);
      setCantidadTamizada("");
      return;
    }
    const g = grupos[Number(value)];
    if (g) {
      setCalidad(g.calidad);
      setCantidadTamizada(g.cantidad_total);
    }
  };

  const handleTipoChange = (value: string | null) => {
    setIdTipoPadre(value);
    setIdGrupo(null);
    setCalidad(null);
    setCantidadTamizada("");
    // Las listas dependientes se vacían de inmediato: dejar el listado del
    // tipo anterior en pantalla mientras llega el nuevo confunde.
    setGrupos([]);
    setStockPorCalidad([]);
    setLoadingGrupos(value !== null && idAlmacen !== null);
    setLoadingStock(value !== null && idAlmacen !== null);
  };

  const handleAlmacenChange = (value: string | null) => {
    setIdAlmacen(value);
    setIdGrupo(null);
    setCalidad(null);
    setCantidadTamizada("");
    setGrupos([]);
    setStockPorCalidad([]);
    setLoadingGrupos(value !== null && idTipoPadre !== null);
    setLoadingStock(value !== null && idTipoPadre !== null);
  };

  const handleOrigenChange = (value: string | null) => {
    const next = (value as "carga" | "stock") || "carga";
    setOrigen(next);
    setIdGrupo(null);
    setCalidad(null);
    setCantidadTamizada("");
  };

  const handleSubmit = async () => {
    if (!idAlmacen) {
      notifyError("Debe seleccionar el almacén");
      return;
    }
    if (!idTipoPadre) {
      notifyError("Debe seleccionar el tipo de carbón a zarandear");
      return;
    }
    if (!calidad) {
      notifyError(
        origen === "carga"
          ? "Debe seleccionar el grupo de cargas a zarandear"
          : "Debe seleccionar la calidad del stock a zarandear",
      );
      return;
    }
    if (cantTamizadaNum <= 0) {
      notifyError("La cantidad a zarandear debe ser mayor a cero");
      return;
    }

    const variantesValidas = variantes.filter(
      (v) => v.id_tipo_variante && Number(v.porcentaje_extraccion) > 0,
    );
    if (variantesValidas.length === 0) {
      notifyError(
        "Debe registrar al menos una variante con porcentaje de extracción",
      );
      return;
    }
    if (sumaPorcentajes > 100.0001) {
      notifyError(
        `La suma de los porcentajes de extracción no puede superar el 100% (actual: ${sumaPorcentajes.toFixed(2)}%)`,
      );
      return;
    }

    const idCargas =
      origen === "carga" && grupoSeleccionado
        ? grupoSeleccionado.cargas.map((c) => c.id_carga_compra_carbon)
        : [];

    setSubmitting(true);
    try {
      const resp = await TamizajeCarbonService.registrarZarandeo({
        id_almacen: Number(idAlmacen),
        id_tipo_carbon: Number(idTipoPadre),
        calidad,
        id_empleado_supervisor: idSupervisor ? Number(idSupervisor) : undefined,
        id_cargas: idCargas,
        cantidad_zarandeada: cantTamizadaNum,
        es_rezarandeo: origen === "stock",
        fecha_hora_zarandeo: fechaHora,
        variantes: variantesValidas.map((v) => ({
          id_tipo_variante: Number(v.id_tipo_variante),
          porcentaje_extraccion: Number(v.porcentaje_extraccion) || 0,
        })),
        evidencias: archivos.length > 0 ? archivos : undefined,
      });

      if (resp.success && resp.data) {
        notifySuccess("Zarandeo registrado correctamente");
        onGuardado(resp.data);
        onClose();
      } else {
        notifyError(resp.message || "Error al registrar el zarandeo");
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al registrar el zarandeo");
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
      tiposConVariantes.map((t) => ({
        value: String(t.id_tipo_carbon),
        label: `${t.nombre}${t.codigo ? ` (${t.codigo})` : ""}`,
      })),
    [tiposConVariantes],
  );

  const supervisoresOptions = useMemo(
    () =>
      supervisores.map((s) => ({
        value: String(s.id_empleado),
        label: s.dni ? `${s.nombre_completo} (${s.dni})` : s.nombre_completo,
      })),
    [supervisores],
  );

  // Búsqueda tolerante sobre catálogos (Fuse + FlexSearch).
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
    if (!q) return tiposCarbonOptions;
    return getCoincidencias(tiposCarbonOptions, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [tiposCarbonOptions, tipoBusqueda]);

  const almacenesVisibles = useMemo(() => {
    const q = almacenBusqueda.trim();
    if (!q) return almacenesOptions;
    return getCoincidencias(almacenesOptions, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [almacenesOptions, almacenBusqueda]);

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title="Registrar Zarandeo"
      size="xl"
      rightSection={
        <Group gap={12}>
          <Select
            label="Almacén"
            placeholder="Seleccione almacén"
            data={almacenesVisibles}
            value={idAlmacen}
            onChange={(val) => {
              handleAlmacenChange(val);
              setAlmacenBusqueda("");
            }}
            required
            searchable
            searchValue={almacenBusqueda}
            onSearchChange={setAlmacenBusqueda}
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No se encontraron almacenes"
            leftSection={
              <BuildingStorefrontIcon className="w-4 h-4 text-zinc-500" />
            }
            radius="lg"
            size="xs"
            classNames={estilitos}
          />

          <Select
            label="Origen"
            data={[
              { value: "carga", label: "Cargas de carbón" },
              { value: "stock", label: "Stock actual" },
            ]}
            value={origen}
            onChange={handleOrigenChange}
            allowDeselect={false}
            radius="lg"
            size="xs"
            classNames={estilitos}
          />
        </Group>
      }
      validateClose
    >
      <Stack gap="md">
        {/* {tiposConVariantes.length === 0 && (
          <Alert color="yellow" variant="light" radius="md">
            No hay tipos de carbón con variantes configuradas. Registra las
            variantes (y su % de extracción) en System → Tipos de Carbon.
          </Alert>
        )} */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-1">
            <Select
              label="Tipo de carbón"
              placeholder="Seleccione tipo de carbón"
              data={tiposVisibles}
              value={idTipoPadre}
              onChange={(val) => {
                handleTipoChange(val);
                setTipoBusqueda("");
              }}
              required
              searchable
              clearable
              searchValue={tipoBusqueda}
              onSearchChange={setTipoBusqueda}
              comboboxProps={{ withinPortal: true }}
              nothingFoundMessage="No hay tipos con variantes configuradas"
              radius="lg"
              size="xs"
              classNames={estilitos}
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            {origen === "carga" ? (
              <Select
                label="Grupo de cargas a zarandear"
                placeholder={
                  !idTipoPadre
                    ? "Primero seleccione el carbón padre..."
                    : loadingGrupos
                      ? "Cargando cargas pendientes..."
                      : grupos.length > 0
                        ? "Seleccione el grupo completo a zarandear..."
                        : "No hay cargas pendientes para este tipo"
                }
                data={gruposOptions}
                value={idGrupo}
                onChange={handleGrupoChange}
                disabled={!idTipoPadre || loadingGrupos || grupos.length === 0}
                searchable
                comboboxProps={{ withinPortal: true }}
                nothingFoundMessage="No hay cargas pendientes de zarandeo"
                rightSection={
                  loadingGrupos ? <Loader size="xs" color="teal" /> : undefined
                }
                radius="lg"
                size="xs"
                classNames={estilitos}
              />
            ) : (
              <Select
                label="Calidad del stock a zarandear"
                placeholder={
                  !idTipoPadre
                    ? "Primero seleccione el carbón padre..."
                    : loadingStock
                      ? "Cargando stock disponible..."
                      : calidadesConStock.length > 0
                        ? "Seleccione la calidad con stock..."
                        : "No hay stock disponible para este tipo"
                }
                data={calidadesOptions}
                value={calidad}
                onChange={(val) => {
                  setCalidad(val);
                  setCantidadTamizada("");
                }}
                disabled={
                  !idTipoPadre || loadingStock || calidadesConStock.length === 0
                }
                searchable
                comboboxProps={{ withinPortal: true }}
                nothingFoundMessage="Sin stock disponible"
                rightSection={
                  loadingStock ? <Loader size="xs" color="teal" /> : undefined
                }
                radius="lg"
                size="xs"
                classNames={estilitos}
              />
            )}
          </div>
        </div>

        {/* Detalle del grupo de cargas elegido */}
        {origen === "carga" && grupoSeleccionado && (
          <Paper className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            {grupoSeleccionado.calidad ? (
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={700} className="text-zinc-200">
                  Cargas incluidas en el grupo
                </Text>
                <Group gap="xs">
                  <Badge
                    color={colorCalidadCarbon(grupoSeleccionado.calidad)}
                    variant="light"
                    radius="xl"
                  >
                    {grupoSeleccionado.calidad}
                  </Badge>
                  <Badge color="indigo" variant="light" radius="xl">
                    {grupoSeleccionado.cantidad_cargas} carga(s) ·{" "}
                    {formatNumber(grupoSeleccionado.cantidad_total)} TN
                  </Badge>
                </Group>
              </Group>
            ) : (
              <Alert
                color="yellow"
                variant="light"
                radius="md"
                mb="xs"
                icon={<IconAlertTriangle size={16} />}
              >
                Las cargas de este grupo no tienen calidad asignada. Revisa el %
                de ceniza registrado en cada carga y ejecuta el script de
                calidad de carbón.
              </Alert>
            )}
            <Table highlightOnHover withTableBorder={false} verticalSpacing={2}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    Ticket
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    Placa
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    OC
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    % Ceniza
                  </Table.Th>
                  <Table.Th className="text-zinc-400 text-xs font-semibold">
                    TN
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {grupoSeleccionado.cargas.map((c) => (
                  <Table.Tr key={c.id_carga_compra_carbon}>
                    <Table.Td>
                      <Text size="xs" c="zinc.300">
                        {c.codigo_ticket_balanza || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="zinc.300">
                        {c.placa || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="blue.4">
                        {c.compra_correlativo || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="zinc.300">
                        {formatNumber(c.porcentaje_ceniza)}%
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" fw={700} c="zinc.100">
                        {formatNumber(c.cantidad)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        {/* Datos Principales */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <NumberInput
            label="Cantidad a zarandear (TN)"
            placeholder="0.00"
            value={cantidadTamizada}
            onChange={setCantidadTamizada}
            required
            radius="lg"
            size="xs"
            classNames={estilitos}
          />

          <Select
            label="Supervisor a cargo"
            placeholder="Opcional"
            data={supervisoresVisibles}
            value={idSupervisor}
            onChange={(val) => {
              setIdSupervisor(val);
              setSupervisorBusqueda("");
            }}
            clearable
            searchable
            searchValue={supervisorBusqueda}
            onSearchChange={setSupervisorBusqueda}
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No se encontraron empleados"
            leftSection={<UserIcon className="w-4 h-4 text-zinc-500" />}
            radius="lg"
            size="xs"
            classNames={estilitos}
          />

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
            <Group gap="xs" align="center">
              <Text size="sm" fw={700} className="text-white">
                Variantes Extraídas
              </Text>
              {cargandoVariantes && (
                <Group gap={6} align="center">
                  <Loader size="xs" color="teal" />
                  <Text size="xs" c="zinc.500">
                    Cargando...
                  </Text>
                </Group>
              )}
            </Group>
            <Group gap="xs">
              <Select
                placeholder="Agregar variante..."
                data={variantesDisponiblesOptions}
                value={null}
                onChange={handleAgregarVariante}
                disabled={
                  !idTipoPadre ||
                  cargandoVariantes ||
                  variantesDisponiblesOptions.length === 0
                }
                searchable
                comboboxProps={{ withinPortal: true }}
                nothingFoundMessage="No hay variantes disponibles"
                leftSection={<PlusIcon className="w-3.5 h-3.5" />}
                radius="lg"
                size="xs"
                w={210}
                classNames={estilitos}
              />
            </Group>
          </Group>

          {idTipoPadre &&
            !cargandoVariantes &&
            catalogoVariantes.length === 0 && (
              <Paper className="bg-yellow-950/20 border border-yellow-800/40 p-2.5 rounded-lg mb-3">
                <Text size="xs" c="yellow.4" fw={500}>
                  Este tipo de carbón no tiene variantes configuradas.
                </Text>
              </Paper>
            )}

          <Table highlightOnHover withTableBorder={false} verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th
                  className="text-zinc-400 text-xs font-semibold"
                  pl={24}
                >
                  Variante Resultante
                </Table.Th>
                <Table.Th className="text-zinc-400 text-xs font-semibold w-36">
                  % Extracción
                </Table.Th>
                <Table.Th
                  className="text-zinc-400 text-xs font-semibold w-32"
                  ta="center"
                >
                  Cantidad (TN)
                </Table.Th>
                <Table.Th className="w-12 text-center" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {cargandoVariantes ? (
                Array.from({ length: 1 }).map((_, i) => (
                  <Table.Tr key={`skeleton-variante-${i}`}>
                    <Table.Td pl={24}>
                      <Skeleton
                        height={12}
                        width={["62%", "48%", "56%"][i]}
                        radius="sm"
                      />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={28} width={88} radius="lg" />
                    </Table.Td>
                    <Table.Td ta="center">
                      <Skeleton height={14} width={56} radius="sm" />
                    </Table.Td>
                    <Table.Td ta="center" pr={24}>
                      <Skeleton height={28} width={28} radius="lg" circle />
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : !idTipoPadre ? (
                <Table.Tr>
                  <Table.Td colSpan={4} ta="center" py="lg">
                    <Text size="xs" c="zinc.500">
                      Selecciona un tipo de carbón para cargar sus variantes.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                variantes.map((v, idx) => {
                  const pct = Number(v.porcentaje_extraccion) || 0;
                  const cantidad = (cantTamizadaNum * pct) / 100;

                  return (
                    <Table.Tr key={idx}>
                      <Table.Td pl={24}>
                        <Text size="xs" fw={600} c="zinc.200">
                          {catalogoVariantes.find(
                            (c) =>
                              c.id_tipo_variante === Number(v.id_tipo_variante),
                          )?.nombre ?? "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={v.porcentaje_extraccion}
                          onChange={(val) =>
                            handleUpdateVariante(
                              idx,
                              "porcentaje_extraccion",
                              val,
                            )
                          }
                          max={100}
                          suffix=" %"
                          hideControls
                          size="xs"
                          radius="lg"
                          classNames={estilitos}
                        />
                      </Table.Td>
                      <Table.Td ta="center">
                        <Text
                          size="sm"
                          fw={700}
                          c="teal.4"
                          className="font-mono"
                        >
                          {formatNumber(cantidad)}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center" pr={24}>
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
                })
              )}
            </Table.Tbody>
          </Table>

          {/* Resumen de Balance */}
          <Paper className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-lg">
            <Group grow>
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
              <div className="text-right">
                <Text size="xs" c="dimmed">
                  Total Extraído
                </Text>
                <Text size="sm" fw={800} className="text-teal-400 font-mono">
                  {formatNumber(totalExtraido)} TN
                </Text>
              </div>
            </Group>
          </Paper>
        </Paper>

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
            Registrar Zarandeo
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
