import { useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Stack,
  Select,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { type DataTableColumn } from "mantine-datatable";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { DataTableEstandar } from "../../../presentation/utils/datatable-estandar";
import { parseCambiosLog } from "../../../presentation/utils/parse-cambios-log";
import { RegistroCategoria } from "./registro-categoria";
import { useCategoriasPage } from "../hooks/useCategoriasPage";
import { useCategoriasColumns } from "../hooks/useCategoriasColumns";
import { CategoriaGroupCard } from "./components/categoria-group-card";
import { TipoBien } from "../../../shared/enums/_generic/tipo-bien";
import { TipoProducto } from "../../../shared/enums/_generic/tipo-producto";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

dayjs.locale("es");

interface CambioCategoriaGlobal {
  id: string;
  id_categoria: number;
  categoria: string;
  fecha: string;
  id_empleado: number | null;
  nombre_empleado: string;
  campo: string;
  valor_anterior: unknown;
  valor_nuevo: unknown;
}

/**
 * Los flags booleanos se guardan como 0/1 en MySQL, así que se muestran
 * como Sí/No en lugar del número crudo.
 */
const formatValorCambio = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (v === 0 || v === "0") return "No";
  if (v === 1 || v === "1") return "Sí";
  return String(v);
};

// Styling configuration for inputs
const INPUT_CLASSES = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
};

export const CategoriasPage = () => {
  const {
    loading,
    busqueda,
    setBusqueda,
    filtroClasificacion,
    setFiltroClasificacion,
    // filtroDestino,
    // setFiltroDestino,
    categoriasFiltradas,
    openedCreate,
    openCreate,
    closeCreate,
    openedEdit,
    openedCambios,
    openCambios,
    closeCambios,
    categoriaEnEdicion,
    abrirModalEdicion,
    cerrarModalEdicion,
    eliminarCategoria,
    eliminandoId,
    categorias,
    registro,
    edicion,
    recargar,
  } = useCategoriasPage();

  // Dynamic columns generator hook
  const { getColumns } = useCategoriasColumns({
    onEditar: abrirModalEdicion,
    onEliminar: (cat) => {
      void eliminarCategoria(cat.id_categoria);
    },
    eliminandoId,
  });

  const cambiosGlobal = useMemo<CambioCategoriaGlobal[]>(() => {
    const lista: CambioCategoriaGlobal[] = [];
    categorias.forEach((cat) => {
      const logs = parseCambiosLog(cat.cambios_log);
      logs.forEach((log) => {
        const nombreEmpleado = log.nombre_empleado?.trim() || "—";
        log.cambios.forEach((cambio) => {
          lista.push({
            id: `${cat.id_categoria}-${log.update_at}-${cambio.campo_bd ?? cambio.campo ?? Math.random()}`,
            id_categoria: cat.id_categoria,
            categoria: cat.nombre,
            fecha: log.update_at,
            id_empleado: log.id_empleado ?? null,
            nombre_empleado: nombreEmpleado,
            campo: cambio.campo ?? cambio.campo_bd ?? "—",
            valor_anterior: cambio.valor_anterior,
            valor_nuevo: cambio.valor_nuevo,
          });
        });
      });
    });
    // Más recientes primero
    lista.sort((a, b) => dayjs(b.fecha).valueOf() - dayjs(a.fecha).valueOf());
    return lista;
  }, [categorias]);

  const cambiosColumns: DataTableColumn<CambioCategoriaGlobal>[] = [
    {
      accessor: "index",
      title: "#",
      textAlign: "center",
      width: 50,
    },
    {
      accessor: "categoria",
      title: "Categoría",
      width: 220,
      render: (r) => (
        <Text size="sm" className="text-zinc-200 font-medium">
          {r.categoria}
        </Text>
      ),
    },
    {
      accessor: "campo",
      title: "Campo",
      width: 180,
      render: (r) => (
        <Badge color="indigo" variant="light" size="sm" radius="sm">
          {r.campo}
        </Badge>
      ),
    },
    {
      accessor: "valor_anterior",
      title: "Valor Anterior",
      width: 160,
      render: (r) => (
        <Text size="xs" className="text-zinc-400 line-through">
          {formatValorCambio(r.valor_anterior)}
        </Text>
      ),
    },
    {
      accessor: "valor_nuevo",
      title: "Valor Nuevo",
      width: 160,
      render: (r) => (
        <Text size="xs" className="text-emerald-300 font-semibold">
          {formatValorCambio(r.valor_nuevo)}
        </Text>
      ),
    },
    {
      accessor: "nombre_empleado",
      title: "Modificado por",
      width: 200,
      render: (r) => (
        <Text size="xs" className="text-zinc-300">
          {r.nombre_empleado}
        </Text>
      ),
    },
    {
      accessor: "fecha",
      title: "Fecha",
      width: 170,
      render: (r) => (
        <Text size="xs" className="text-zinc-400">
          {dayjs(r.fecha).format("DD MMM YYYY, HH:mm:ss")}
        </Text>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header — Buscador y Filtros en fila única horizontal */}
      <div className="flex flex-col md:flex-row items-end gap-3 w-full animate-fade-in">
        <div className="flex-1 min-w-[240px] w-full">
          <TextInput
            label="Buscar Categoría"
            placeholder="Buscar por nombre, descripción..."
            leftSection={
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
            }
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            radius="lg"
            size="sm"
            classNames={INPUT_CLASSES}
          />
        </div>

        <div className="w-full md:w-52">
          <Select
            label="Clasificación"
            placeholder="Todas..."
            data={[
              { value: "all", label: "Todas" },
              { value: TipoBien.ActivoFijo, label: "Activos Fijos" },
              { value: TipoBien.Herramienta, label: "Herramientas" },
              { value: TipoBien.Suministro, label: "Suministros" },
              { value: TipoBien.Repuesto, label: "Repuestos" },
              { value: TipoBien.EPP, label: "EPPs" },
              { value: TipoBien.Otros, label: "Otros" },
              { value: "Servicio", label: "Servicios" },
            ]}
            value={filtroClasificacion || "all"}
            onChange={(val) =>
              setFiltroClasificacion(val === "all" ? null : val)
            }
            radius="lg"
            size="sm"
            classNames={INPUT_CLASSES}
          />
        </div>



        <div className="shrink-0 w-full md:w-auto flex items-center gap-2">
          <BotonRecargar onReload={recargar} loading={loading} />
          <Tooltip label="Ver historial de cambios" position="bottom" withArrow>
            <ActionIcon
              variant="default"
              color="zinc.4"
              radius="lg"
              size={36}
              onClick={openCambios}
              className="border border-zinc-700/50"
              aria-label="Ver historial de cambios"
            >
              <EyeIcon className="w-4 h-4" />
            </ActionIcon>
          </Tooltip>
          <Button
            leftSection={<PlusIcon className="w-5 h-5" />}
            onClick={openCreate}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-6 font-semibold h-[38px] w-full md:w-auto transition-all"
          >
            Nueva Categoría
          </Button>
        </div>
      </div>

      {loading && categorias.length === 0 ? (
        <Stack align="center" gap="md" py={100}>
          <div className="relative">
            <div className="size-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <TagIcon className="size-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 block">
            Cargando Categorías...
          </span>
        </Stack>
      ) : categoriasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border border-dashed border-zinc-800 rounded-[32px] bg-zinc-900/10 backdrop-blur-sm animate-fade-in">
          <TagIcon className="size-12 text-zinc-700 mb-4 animate-pulse" />
          <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest block">
            Sin resultados
          </span>
          <span className="text-xs text-zinc-500 mt-1 block">
            No se encontraron categorías para los filtros aplicados.
          </span>
        </div>
      ) : (
        <Stack gap="xl">
          {[
            TipoBien.ActivoFijo,
            TipoBien.Herramienta,
            TipoBien.Suministro,
            TipoBien.Repuesto,
            TipoBien.EPP,
            TipoBien.Otros,
            TipoProducto.Servicio,
          ].map((clasif) => {
            const grupo = categoriasFiltradas.filter((c) => {
              if (clasif === TipoProducto.Servicio) {
                return c.tipo_producto === TipoProducto.Servicio;
              }
              return (
                c.clasificacion_bien === clasif &&
                c.tipo_producto === TipoProducto.Bien
              );
            });
            if (grupo.length === 0) return null;

            return (
              <CategoriaGroupCard
                key={clasif}
                clasif={clasif}
                grupo={grupo}
                loading={loading}
                columns={getColumns()}
              />
            );
          })}
        </Stack>
      )}

      {/* MODAL CREAR CATEGORÍA */}
      <ModalEstandar
        opened={openedCreate}
        close={closeCreate}
        title="Nueva Categoría"
        size="md"
      >
        <RegistroCategoria
          {...registro}
          onSave={registro.handleGuardar}
          onCancel={() => {
            closeCreate();
            registro.reset();
          }}
        />
      </ModalEstandar>

      {/* MODAL EDITAR CATEGORÍA */}
      <ModalEstandar
        opened={openedEdit}
        close={cerrarModalEdicion}
        title={
          categoriaEnEdicion
            ? `Editar: ${categoriaEnEdicion.nombre}`
            : "Editar Categoría"
        }
        size="md"
      >
        {categoriaEnEdicion && (
          <RegistroCategoria
            {...edicion}
            onSave={edicion.handleGuardar}
            onCancel={cerrarModalEdicion}
          />
        )}
      </ModalEstandar>

      {/* MODAL HISTORIAL DE CAMBIOS */}
      <ModalEstandar
        opened={openedCambios}
        close={closeCambios}
        title="Historial de Cambios de Categorías"
        size="min(1250px, 95vw)"
      >
        {cambiosGlobal.length === 0 ? (
          <Stack align="center" gap="md" py={60}>
            <EyeIcon className="w-10 h-10 text-zinc-700" />
            <Text
              size="sm"
              fw={700}
              className="text-zinc-400 uppercase tracking-widest"
            >
              Sin cambios registrados
            </Text>
            <Text size="xs" c="dimmed">
              Aún no se han registrado modificaciones en las categorías.
            </Text>
          </Stack>
        ) : (
          <div className="mt-2">
            <DataTableEstandar
              idAccessor="id"
              columns={cambiosColumns}
              records={cambiosGlobal}
              loading={false}
            />
          </div>
        )}
      </ModalEstandar>
    </div>
  );
};
