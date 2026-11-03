import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ScaleIcon,
  CurrencyDollarIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import type { DataTableColumn } from "mantine-datatable";

import { useNotify } from "../../../../hooks/useNotify";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { BotonRecargar } from "../../../../presentation/utils/boton-recargar";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { formatNumber } from "../../../../shared/functions/formatNumber";
import { colorCalidadCarbon } from "../../../../shared/functions/calidad-carbon";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import { MESES } from "../../../../shared/variables/meses";
import { AuxService } from "../../../../service/auxiliar.service";
import { TipoCarbonService } from "../../../tipo-carbon/service/tipo-carbon.service";
import { TamizajeCarbonService } from "../../service/tamizaje-carbon.service";
import { ModalRegistrarBlending } from "../modal-registrar-blending";
import { ModalAgregarStockBlending } from "../modal-agregar-stock-blending";
import { ModalGastosProduccion } from "../modal-gastos-produccion";
import { ModalEvidenciasBlending } from "../modal-evidencias-blending";
import type { BlendingCarbonItem } from "../../service/tamizaje-carbon.responses";
import type { RES_Almacen } from "../../../../service/responses/almacen";
import type { RES_TipoCarbon } from "../../../tipo-carbon/service/tipo-carbon.responses";

const formatTN = (val: number | null | undefined) =>
  `${formatNumber(Number(val ?? 0))} TN`;

const estilitos = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown: "bg-zinc-900 border-zinc-800",
  option: "text-zinc-300 hover:bg-zinc-800",
};

/**
 * Panel de BLENDING de la produccion de carbon.
 *
 * Lista los blendings del periodo (mes y ano) con el stock que todavia
 * tienen disponible y las acciones para editarlo, agregarle mas stock o
 * cargarle gastos de produccion.
 */
export const PanelBlending = () => {
  const { notifyError } = useNotify();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [idAlmacen, setIdAlmacen] = useState<string | null>(null);
  const [idTipoCarbon, setIdTipoCarbon] = useState<string | null>(null);
  const [mes, setMes] = useState<string | null>(String(currentMonth));
  const [anio, setAnio] = useState<string | null>(String(currentYear));
  const [busqueda, setBusqueda] = useState<string>("");
  const [busquedaDebounced] = useDebouncedValue(busqueda, 350);

  const [blendings, setBlendings] = useState<BlendingCarbonItem[]>([]);
  const [almacenes, setAlmacenes] = useState<RES_Almacen[]>([]);
  const [tiposCarbon, setTiposCarbon] = useState<RES_TipoCarbon[]>([]);
  const [loading, setLoading] = useState(false);

  const [openNuevo, setOpenNuevo] = useState(false);
  const [blendingEditar, setBlendingEditar] =
    useState<BlendingCarbonItem | null>(null);
  const [blendingStock, setBlendingStock] =
    useState<BlendingCarbonItem | null>(null);
  const [blendingGastos, setBlendingGastos] =
    useState<BlendingCarbonItem | null>(null);
  const [detalleModal, setDetalleModal] = useState<BlendingCarbonItem | null>(
    null,
  );
  const [blendingEvidencias, setBlendingEvidencias] =
    useState<BlendingCarbonItem | null>(null);

  useEffect(() => {
    const fetchMaestros = async () => {
      try {
        const [resAlm, resTipos] = await Promise.all([
          AuxService.get_almacenes({ para_carbon: true }),
          TipoCarbonService.getTipos(),
        ]);
        if (resAlm?.data) setAlmacenes(resAlm.data);
        if (resTipos?.data) setTiposCarbon(resTipos.data);
      } catch (err) {
        console.error("Error al cargar maestros", err);
      }
    };
    fetchMaestros();
  }, []);

  const cargarBlendings = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await TamizajeCarbonService.getBlendings({
        id_almacen: idAlmacen ? Number(idAlmacen) : undefined,
        id_tipo_carbon: idTipoCarbon ? Number(idTipoCarbon) : undefined,
        mes: mes ? Number(mes) : undefined,
        anio: anio ? Number(anio) : undefined,
        filtros: busquedaDebounced.trim() || undefined,
      });
      if (resp.success && resp.data) {
        setBlendings(resp.data);
      } else {
        setBlendings([]);
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al cargar los blendings");
      setBlendings([]);
    } finally {
      setLoading(false);
    }
  }, [idAlmacen, idTipoCarbon, mes, anio, busquedaDebounced, notifyError]);

  useEffect(() => {
    cargarBlendings();
  }, [cargarBlendings]);

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

  const aniosOptions = useMemo(
    () => [
      { value: String(currentYear - 2), label: String(currentYear - 2) },
      { value: String(currentYear - 1), label: String(currentYear - 1) },
      { value: String(currentYear), label: String(currentYear) },
      { value: String(currentYear + 1), label: String(currentYear + 1) },
    ],
    [currentYear],
  );

  // Búsqueda tolerante sobre los catálogos (Fuse + FlexSearch).
  const [almacenBusqueda, setAlmacenBusqueda] = useState("");
  const [tipoBusqueda, setTipoBusqueda] = useState("");

  const almacenesVisibles = useMemo(() => {
    const q = almacenBusqueda.trim();
    if (!q) return almacenesOptions;
    return getCoincidencias(almacenesOptions, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [almacenesOptions, almacenBusqueda]);

  const tiposVisibles = useMemo(() => {
    const q = tipoBusqueda.trim();
    if (!q) return tiposCarbonOptions;
    return getCoincidencias(tiposCarbonOptions, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [tiposCarbonOptions, tipoBusqueda]);

  /**
   * Un blending recien registrado solo se anade a la lista si pertenece al
   * periodo y a los filtros que se estan viendo: si el usuario esta mirando
   * otro mes, no tiene por que aparecer de golpe una fila ajena.
   */
  const coincideConFiltros = useCallback(
    (blending: BlendingCarbonItem) => {
      if (idAlmacen && blending.id_almacen !== Number(idAlmacen)) return false;
      if (idTipoCarbon && blending.id_tipo_carbon !== Number(idTipoCarbon))
        return false;

      if (mes && anio) {
        const fecha = dayjs(blending.fecha_hora_blending);
        if (fecha.month() + 1 !== Number(mes)) return false;
        if (fecha.year() !== Number(anio)) return false;
      } else if (anio) {
        if (dayjs(blending.fecha_hora_blending).year() !== Number(anio))
          return false;
      }

      return true;
    },
    [idAlmacen, idTipoCarbon, mes, anio],
  );

  /**
   * Inserta o reemplaza un blending en la lista.
   *
   * Uno recien registrado se ANADE al principio; uno editado reemplaza su
   * fila. Asi el usuario ve de inmediato lo que acaba de registrar, sin
   * volver a listar el periodo.
   */
  const actualizarBlending = useCallback(
    (blending: BlendingCarbonItem) => {
      setBlendings((prev) => {
        const existe = prev.some(
          (b) => b.id_blending_carbon === blending.id_blending_carbon,
        );

        if (existe) {
          return prev.map((b) =>
            b.id_blending_carbon === blending.id_blending_carbon ? blending : b,
          );
        }

        if (!coincideConFiltros(blending)) {
          return prev;
        }

        // El listado viene ordenado por fecha descendente.
        return [blending, ...prev].sort((a, b) =>
          dayjs(b.fecha_hora_blending).valueOf() -
          dayjs(a.fecha_hora_blending).valueOf(),
        );
      });
    },
    [coincideConFiltros],
  );

  const columns: DataTableColumn<BlendingCarbonItem>[] = useMemo(
    () => [
      {
        accessor: "index",
        title: "#",
        textAlign: "center",
        width: 50,
      },
      {
        accessor: "fecha_hora_blending",
        title: "Fecha y Hora",
        width: 110,
        textAlign: "center",
        render: (r) => (
          <div className="flex flex-col gap-0 items-center justify-center">
            <Text size="xs" fw={600} className="text-zinc-100">
              {dayjs(r.fecha_hora_blending).format("DD/MM/YYYY")}
            </Text>
            <Text size="xs" c="dimmed" fw={500}>
              {dayjs(r.fecha_hora_blending).format("HH:mm A")}
            </Text>
          </div>
        ),
      },
      {
        accessor: "correlativo",
        title: "Blending",
        textAlign: "center",
        width: 150,
        render: (r) => (
          <Stack gap={4} justify="center" align="center">
            <Text size="xs" fw={800} className="text-white font-mono">
              {r.correlativo}
            </Text>
            <Badge variant="light" color="cyan" radius="sm" size="xs">
              {r.tipo_carbon_nombre ?? "—"}
            </Badge>
          </Stack>
        ),
      },
      {
        accessor: "porcentaje_ceniza",
        title: "% Ceniza",
        textAlign: "center",
        width: 100,
        render: (r) => (
          <Badge size="sm" variant="light" color="gray" radius="sm">
            {formatNumber(r.porcentaje_ceniza)}%
          </Badge>
        ),
      },
      {
        accessor: "stock_actual",
        title: "Stock",
        textAlign: "center",
        width: 120,
        render: (r) => (
          <Text
            size="sm"
            fw={800}
            className={
              Number(r.stock_actual) > 0
                ? "text-teal-400 font-mono tracking-tight"
                : "text-zinc.500 font-mono"
            }
          >
            {formatTN(r.stock_actual)}
          </Text>
        ),
      },
      {
        accessor: "detalles",
        title: "Mezcla",
        textAlign: "center",
        width: 150,
        render: (r) => {
          const detalles = r.detalles ?? [];
          if (detalles.length === 0)
            return (
              <Text size="xs" c="dimmed">
                —
              </Text>
            );
          return (
            <Group gap={4} justify="center" wrap="wrap">
              {detalles.map((d) => (
                <Tooltip
                  key={d.id_detalle_blending_carbon}
                  label={`${formatNumber(d.cantidad_tomada)} TN tomados`}
                  withArrow
                >
                  <Badge
                    size="xs"
                    variant="outline"
                    color={colorCalidadCarbon(d.calidad)}
                    radius="sm"
                  >
                    {d.calidad}
                  </Badge>
                </Tooltip>
              ))}
            </Group>
          );
        },
      },
      {
        accessor: "gastos",
        title: "Gastos",
        textAlign: "center",
        width: 120,
        render: (r) => (
          <Group gap={8} justify="center" wrap="nowrap">
            <Stack gap={0} align="end">
              <Text size="sm" c="red" fw={700} className="font-mono">
                S/ {formatNumber(r.gastos_total)}
              </Text>
              <Text size="11px" fw={600} c="gray">
                {r.gastos_cantidad} gasto{r.gastos_cantidad === 1 ? "" : "s"}
              </Text>
            </Stack>
            <Tooltip label="Ver detalle de gastos" withArrow>
              <ActionIcon
                variant="light"
                color="indigo"
                size="md"
                radius="md"
                onClick={(e) => {
                  e.stopPropagation();
                  setBlendingGastos(r);
                }}
              >
                <CurrencyDollarIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
      {
        accessor: "responsables",
        title: "Responsables",
        textAlign: "center",
        width: 170,
        render: (r) => (
          <div className="text-left">
            <Text size="xs" c={"white"} fw={600}>
              <span className="text-zinc-400">Reg: </span>
              {r.empleado_registro ?? "—"}
            </Text>
            <Text size="xs" c={"white"} fw={600}>
              <span className="text-zinc-400">Sup: </span>
              {r.empleado_supervisor ?? "—"}
            </Text>
          </div>
        ),
      },
      {
        accessor: "acciones",
        title: "Acciones",
        textAlign: "center",
        width: 190,
        render: (r) => (
          <Group gap={4} justify="center" wrap="nowrap">
            <Tooltip label="Ver evidencias" withArrow>
              <ActionIcon
                variant="light"
                color="teal"
                size="md"
                radius="md"
                onClick={(e) => {
                  e.stopPropagation();
                  setBlendingEvidencias(r);
                }}
              >
                <PaperClipIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
            {/* <Tooltip label="Ver detalle de la mezcla" withArrow>
              <ActionIcon
                variant="light"
                color="cyan"
                size="md"
                radius="md"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetalleModal(r);
                }}
              >
                <EyeIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Agregar más stock" withArrow>
              <ActionIcon
                variant="light"
                color="lime"
                size="md"
                radius="md"
                onClick={(e) => {
                  e.stopPropagation();
                  setBlendingStock(r);
                }}
              >
                <PlusIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip> */}
            <Tooltip label="Editar blending" withArrow>
              <ActionIcon
                variant="light"
                color="indigo"
                size="md"
                radius="md"
                onClick={(e) => {
                  e.stopPropagation();
                  setBlendingEditar(r);
                }}
              >
                <PencilSquareIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5 text-zinc-100">
      {/* Filtros + acciones */}
      <div className="flex flex-col md:flex-row items-end gap-3 w-full flex-wrap">
        <div className="w-full sm:w-56 md:w-52">
          <Select
            label="Almacén"
            placeholder="Todos los almacenes"
            data={almacenesVisibles}
            value={idAlmacen}
            onChange={(val) => {
              setIdAlmacen(val);
              setAlmacenBusqueda("");
            }}
            searchValue={almacenBusqueda}
            onSearchChange={setAlmacenBusqueda}
            clearable
            searchable
            size="xs"
            radius="lg"
            leftSection={
              <BuildingStorefrontIcon className="w-4 h-4 text-zinc-500" />
            }
            classNames={estilitos}
            comboboxProps={{ withinPortal: true }}
            filter={({ options }) => options}
            nothingFoundMessage="Sin almacenes de carbón"
          />
        </div>

        <div className="w-full sm:w-52 md:w-48">
          <Select
            label="Tipo de carbón"
            placeholder="Todos los tipos"
            data={tiposVisibles}
            value={idTipoCarbon}
            onChange={(val) => {
              setIdTipoCarbon(val);
              setTipoBusqueda("");
            }}
            searchValue={tipoBusqueda}
            onSearchChange={setTipoBusqueda}
            clearable
            searchable
            size="xs"
            radius="lg"
            leftSection={<ScaleIcon className="w-4 h-4 text-zinc-500" />}
            classNames={estilitos}
            comboboxProps={{ withinPortal: true }}
            filter={({ options }) => options}
            nothingFoundMessage="Sin tipos de carbón"
          />
        </div>

        <div className="w-full sm:w-36 md:w-36">
          <Select
            label="Mes"
            placeholder="Todo el año"
            data={MESES.map((m) => ({
              value: String(m.value),
              label: m.label,
            }))}
            value={mes}
            onChange={setMes}
            clearable
            size="xs"
            radius="lg"
            leftSection={<CalendarDaysIcon className="w-4 h-4 text-zinc-500" />}
            classNames={estilitos}
          />
        </div>

        <div className="w-full sm:w-28 md:w-28">
          <Select
            label="Año"
            data={aniosOptions}
            value={anio}
            onChange={setAnio}
            clearable
            size="xs"
            radius="lg"
            classNames={estilitos}
          />
        </div>

        <div className="flex-1 min-w-[200px] w-full">
          <TextInput
            label="Búsqueda"
            placeholder="Correlativo, carbón, almacén..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            leftSection={
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
            }
            size="xs"
            radius="lg"
            classNames={estilitos}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BotonRecargar
            onReload={cargarBlendings}
            loading={loading}
            tooltip="Recargar los blendings"
          />
          <Button
            color="cyan"
            radius="lg"
            size="xs"
            leftSection={<PlusIcon className="w-4 h-4" />}
            onClick={() => setOpenNuevo(true)}
            className="font-semibold shadow-md shadow-cyan-950/40"
          >
            Nuevo Blending
          </Button>
        </div>
      </div>

      {/* Listado */}
      <Paper className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <DataTableEstandar
          records={blendings}
          columns={columns}
          idAccessor="id_blending_carbon"
          loading={loading}
          noRecordsText="No se encontraron blendings en el periodo seleccionado."
        />
      </Paper>

      {/* Modal Nuevo / Editar Blending */}
      <ModalRegistrarBlending
        opened={openNuevo || Boolean(blendingEditar)}
        blending={blendingEditar}
        onClose={() => {
          setOpenNuevo(false);
          setBlendingEditar(null);
        }}
        onGuardado={(blending) => {
          actualizarBlending(blending);
          setOpenNuevo(false);
          setBlendingEditar(null);
        }}
      />

      {/* Modal Agregar stock */}
      {blendingStock && (
        <ModalAgregarStockBlending
          opened={Boolean(blendingStock)}
          blending={blendingStock}
          onClose={() => setBlendingStock(null)}
          onGuardado={(blending) => {
            actualizarBlending(blending);
            setBlendingStock(null);
          }}
        />
      )}

      {/* Modal Gastos de Producción */}
      {blendingGastos && (
        <ModalGastosProduccion
          opened={Boolean(blendingGastos)}
          onClose={() => setBlendingGastos(null)}
          destino={{
            tipo: "blending",
            id: blendingGastos.id_blending_carbon,
          }}
          tituloDestino={`${blendingGastos.correlativo} · ${blendingGastos.tipo_carbon_nombre ?? "—"} · ${formatTN(blendingGastos.stock_actual)}`}
          onGuardado={(gasto) => {
            // El contador de gastos de la fila se actualiza en local: no
            // hace falta volver a listar todo el periodo.
            setBlendings((prev) =>
              prev.map((b) =>
                b.id_blending_carbon === gasto.id_blending_carbon
                  ? {
                      ...b,
                      gastos_cantidad: (b.gastos_cantidad ?? 0) + 1,
                      gastos_total:
                        (Number(b.gastos_total) || 0) + (Number(gasto.total) || 0),
                    }
                  : b,
              ),
            );
          }}
        />
      )}

      {/* Modal Evidencias del blending */}
      {blendingEvidencias && (
        <ModalEvidenciasBlending
          opened={Boolean(blendingEvidencias)}
          onClose={() => setBlendingEvidencias(null)}
          idBlendingCarbon={blendingEvidencias.id_blending_carbon}
          titulo={`${blendingEvidencias.correlativo} · ${blendingEvidencias.tipo_carbon_nombre ?? "—"}`}
          evidencias={blendingEvidencias.evidencias ?? []}
          onUpdated={(evidencias) => {
            setBlendingEvidencias((prev) =>
              prev ? { ...prev, evidencias } : prev,
            );
            setBlendings((prev) =>
              prev.map((b) =>
                b.id_blending_carbon === blendingEvidencias.id_blending_carbon
                  ? { ...b, evidencias }
                  : b,
              ),
            );
          }}
        />
      )}

      {/* Modal Detalle de la mezcla */}
      <ModalEstandar
        opened={Boolean(detalleModal)}
        close={() => setDetalleModal(null)}
        title={
          detalleModal
            ? `Mezcla de ${detalleModal.correlativo} · ${detalleModal.tipo_carbon_nombre ?? "—"}`
            : "Detalle del blending"
        }
        size="28rem"
        rightSection={
          detalleModal && (
            <Badge variant="light" color="cyan" radius="xl" size="sm">
              {formatNumber(detalleModal.porcentaje_ceniza)}% ceniza
            </Badge>
          )
        }
      >
        {detalleModal && (
          <Stack gap="xs">
            {(detalleModal.detalles ?? []).map((d) => (
              <Paper
                key={d.id_detalle_blending_carbon}
                p="xs"
                radius="lg"
                className="bg-zinc-900/60 border border-zinc-800"
              >
                <Group justify="space-between">
                  <Badge
                    size="sm"
                    variant="light"
                    color={colorCalidadCarbon(d.calidad)}
                    radius="sm"
                  >
                    {d.calidad}
                  </Badge>
                  <Text size="xs" fw={700} c="zinc.100" className="font-mono">
                    {formatNumber(d.cantidad_tomada)} TN tomados
                  </Text>
                </Group>
              </Paper>
            ))}

            <Group justify="space-between" mt={4}>
              <Text size="xs" c="gray" fw={600}>
                Stock disponible del lote
              </Text>
              <Text size="sm" fw={800} c="teal.4" className="font-mono">
                {formatTN(detalleModal.stock_actual)}
              </Text>
            </Group>
          </Stack>
        )}
      </ModalEstandar>
    </div>
  );
};
