import {
  Text,
  TextInput,
  Select,
  Stack,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  InboxStackIcon,
} from "@heroicons/react/24/outline";

import { useActivosMain } from "../hooks/useActivosFijosMain";
import type { RES_ActivoFijoResumen } from "../service/activos.responses";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

// Components
import { RegistroActivo } from "./registro-activo/registro-activo";
import { EditarActivo } from "./editar-activo/editar-activo";
import { HistorialUbicacionActivo } from "./historial-ubicacion/historial-ubicacion";
import { HistorialActivoModal } from "./components/historial-activo-modal";
import {
  ProductGroupCard,
  type GroupedActivoProducto,
} from "./components/product-group-card";
import { ActivoConfigAlertasModal } from "./components/config-alertas-modal";
import { ActivoMantenimientoModal } from "./components/resolver-mantenimiento-modal";

export const ActivosFijosPage = () => {
  useTitlePage("Activos Fijos");

  const {
    activos,
    loading,
    almacenesFiltro,
    minasFiltro,
    busqueda,
    setBusqueda,
    idAlmacen,
    setIdAlmacen,
    idMina,
    setIdMina,
    refresh,
    recargar,
    addActivo,
    updateActivo,
    eliminarActivo,
    deletingId,
  } = useActivosMain();

  // Modals
  const [openedCreate, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);
  const [openedEdit, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);
  const [selectedActivo, setSelectedActivo] =
    useState<RES_ActivoFijoResumen | null>(null);
  const [openedUbicacion, { open: openUbicacion, close: closeUbicacion }] =
    useDisclosure(false);
  const [openedAlertas, { open: openAlertas, close: closeAlertas }] =
    useDisclosure(false);
  const [openedMantenimiento, { open: openMantenimiento, close: closeMantenimiento }] =
    useDisclosure(false);
  const [openedHistorial, { open: openHistorial, close: closeHistorial }] =
    useDisclosure(false);
  const [tipoMantenimiento, setTipoMantenimiento] = useState<"horometro" | "odometro" | "vueltas">("horometro");

  const handleOpenHistory = (record: RES_ActivoFijoResumen) => {
    setSelectedActivo(record);
    openHistorial();
  };
  const handleCloseHistory = () => {
    setSelectedActivo(null);
    closeHistorial();
  };

  const groupedProducts = useMemo<GroupedActivoProducto[]>(() => {
    const groups: Record<number, GroupedActivoProducto> = {};

    activos.forEach((a) => {
      if (!groups[a.id_producto]) {
        groups[a.id_producto] = {
          id_producto: a.id_producto,
          producto: a.producto,
          categoria: a.categoria,
          es_auditable: !!a.es_auditable,
          para_transporte: !!a.para_transporte,
          control_por_odometro: !!a.control_por_odometro,
          control_por_horometro: !!a.control_por_horometro,
          control_por_vueltas: !!a.control_por_vueltas,
          activos: [],
        };
      }
      groups[a.id_producto].activos.push(a);
    });

    return Object.values(groups);
  }, [activos]);


  return (
    <div className="space-y-6 animate-fade-in text-zinc-100">
      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row items-end gap-3 w-full">
        {/* Buscador */}
        <div className="flex-1 min-w-75 w-full">
          <TextInput
            label="Buscar Activo"
            placeholder="Producto, correlativo, serie, código..."
            leftSection={
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
            }
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            radius="lg"
            size="sm"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white placeholder:text-zinc-500",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
            }}
          />
        </div>

        {/* Filtros Ubicación */}
        <div className="w-full md:w-48">
          <Select
            label="Almacén"
            placeholder="Todos..."
            data={almacenesFiltro.map((a) => ({
              value: String(a.id_almacen),
              label: a.nombre,
            }))}
            value={idAlmacen}
            onChange={setIdAlmacen}
            clearable
            radius="lg"
            size="sm"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />
        </div>

        <div className="w-full md:w-48">
          <Select
            label="Mina"
            placeholder="Todas..."
            data={minasFiltro.map((m) => ({
              value: String(m.id_mina),
              label: m.nombre,
            }))}
            value={idMina}
            onChange={setIdMina}
            clearable
            radius="lg"
            size="sm"
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 text-white",
              label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
              dropdown: "bg-zinc-900 border-zinc-800",
              option: "text-zinc-300 hover:bg-zinc-800",
            }}
          />
        </div>

        {/* Botón Recargar y Nuevo */}
        <div className="flex gap-2 items-center shrink-0">
          <BotonRecargar onReload={recargar} loading={loading} />
          <Tooltip label="Registrar Nuevo Activo">
            <ActionIcon
              onClick={openCreate}
              variant="filled"
              color="indigo.6"
              size={38}
              radius="lg"
              className="shadow-lg shadow-indigo-900/20"
            >
              <PlusIcon className="w-5 h-5" />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <Stack align="center" gap="md" py={100}>
          <div className="relative">
            <div className="size-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <InboxStackIcon className="size-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <Text
            size="xs"
            fw={900}
            className="uppercase tracking-[0.3em] text-zinc-500"
          >
            Consultando Activos Fijos...
          </Text>
        </Stack>
      ) : groupedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border border-dashed border-zinc-800 rounded-4xl bg-zinc-900/10 backdrop-blur-sm">
          <InboxStackIcon className="size-12 text-zinc-700 mb-4" />
          <Text
            size="sm"
            fw={700}
            className="text-zinc-400 uppercase tracking-widest"
          >
            Sin resultados
          </Text>
          <Text size="xs" c="dimmed" className="mt-1">
            No se encontraron activos para los filtros aplicados.
          </Text>
        </div>
      ) : (
        <Stack gap="xl">
          {groupedProducts.map((p) => (
            <ProductGroupCard
              key={p.id_producto}
              product={p}
              loading={loading}
              onMoverActivo={(record) => {
                setSelectedActivo(record);
                openUbicacion();
              }}
              onVerHistorial={handleOpenHistory}
              onConfigurarAlertas={(record) => {
                setSelectedActivo(record);
                openAlertas();
              }}
              onResolverMantenimiento={(record, tipo) => {
                setSelectedActivo(record);
                setTipoMantenimiento(tipo);
                openMantenimiento();
              }}
              onEditarActivo={(record) => {
                setSelectedActivo(record);
                openEdit();
              }}
              onEliminarActivo={(record) => void eliminarActivo(record.id_activo)}
              deletingId={deletingId}
            />
          ))}
        </Stack>
      )}

      {/* Modales */}
      <ModalEstandar
        opened={openedCreate}
        close={closeCreate}
        title="Nuevo Activo"
        size="lg"
      >
        <RegistroActivo
          onSuccess={(nuevoActivo) => {
            closeCreate();
            addActivo(nuevoActivo);
          }}
          onCancel={closeCreate}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedEdit}
        close={() => {
          closeEdit();
          setSelectedActivo(null);
        }}
        title="Editar Activo"
        size="lg"
      >
        {selectedActivo && (
          <EditarActivo
            activo={selectedActivo}
            onSuccess={(editado) => {
              updateActivo(editado);
              closeEdit();
              setSelectedActivo(null);
            }}
            onCancel={() => {
              closeEdit();
              setSelectedActivo(null);
            }}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={openedUbicacion}
        close={() => {
          closeUbicacion();
          setSelectedActivo(null);
        }}
        title={`Mover Activo: ${selectedActivo?.producto}`}
        size="md"
      >
        {selectedActivo && (
          <HistorialUbicacionActivo
            activo={selectedActivo}
            onSuccess={() => {
              closeUbicacion();
              setSelectedActivo(null);
              refresh();
            }}
            onCancel={() => {
              closeUbicacion();
              setSelectedActivo(null);
            }}
          />
        )}
      </ModalEstandar>

      {selectedActivo && (
        <>
          <ActivoConfigAlertasModal
            opened={openedAlertas}
            close={closeAlertas}
            activo={selectedActivo}
            onSuccess={() => refresh(false)}
          />
          <ActivoMantenimientoModal
            opened={openedMantenimiento}
            close={closeMantenimiento}
            activo={selectedActivo}
            tipoControl={tipoMantenimiento}
            onSuccess={() => refresh(false)}
          />
        </>
      )}

      {/* Modal: Historial de Cambios */}
      <ModalEstandar
        opened={openedHistorial}
        close={handleCloseHistory}
        title={
          selectedActivo
            ? `Historial: ${selectedActivo.producto} — ${selectedActivo.correlativo}`
            : "Historial de Cambios"
        }
        size="xl"
      >
        {selectedActivo && (
          <HistorialActivoModal activo={selectedActivo} />
        )}
      </ModalEstandar>
    </div>
  );
};
