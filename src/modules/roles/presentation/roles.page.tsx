import {
  Button,
  TextInput,
  Badge,
  Group,
  Tooltip,
  Skeleton,
} from "@mantine/core";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { useRoles } from "../hooks/useRoles";
import { useRegistroRol } from "../hooks/useRegistroRol";
import { RegistroRol } from "./registro-rol";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

export const RolesPage = () => {
  useTitlePage("Roles y Permisos");

  const {
    rolesFiltrados,
    loading,
    busqueda,
    setBusqueda,
    recargar,
    openedCreate,
    openCreate,
    closeCreate,
    selectedRol,
    handleOpenEdit,
    onRolCreado,
  } = useRoles();

  const registro = useRegistroRol({
    onSuccess: onRolCreado,
    onUpdateSuccess: () => {},
    onClose: closeCreate,
    rolEdicion: selectedRol,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Action Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <TextInput
          label="Buscar Rol"
          placeholder="Buscar rol por nombre o descripción..."
          leftSection={
            <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
          }
          value={busqueda}
          onChange={(e) => setBusqueda(e.currentTarget.value)}
          className="flex-1 min-w-64"
          radius="lg"
          size="sm"
          classNames={{
            label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
            input:
              "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
          }}
        />
        <div className="flex gap-2 items-center shrink-0">
          <BotonRecargar onReload={recargar} loading={loading} />
          <Button
            leftSection={<PlusIcon className="w-5 h-5" />}
            onClick={openCreate}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 shrink-0 px-6 font-semibold"
          >
            Nuevo Rol
          </Button>
        </div>
      </div>

      {/* Roles Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-5 gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton height={40} width={40} radius="xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton height={14} width="50%" radius="sm" />
                    <Skeleton height={10} width="80%" radius="sm" />
                  </div>
                </div>
                <Skeleton height={16} width={45} radius="sm" />
              </div>

              <div className="mt-2 pt-3 border-t border-zinc-800/50 flex justify-start">
                <Skeleton height={24} width={100} radius="sm" />
              </div>
            </div>
          ))}
        </div>
      ) : rolesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
          <UserGroupIcon className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm font-medium">
            No se encontraron roles registrados
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rolesFiltrados.map((rol) => {
            const isActive = rol.estado === "Activo";
            return (
              <div
                key={rol.id}
                className="group relative flex flex-col bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-5 gap-3 hover:border-indigo-500/30 hover:bg-zinc-900/50 transition-all duration-300 shadow-sm"
              >
                {/* Status and Actions Button */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <Badge
                    size="xs"
                    variant="light"
                    color={isActive ? "green" : "gray"}
                    radius="sm"
                  >
                    {rol.estado}
                  </Badge>
                </div>

                {/* Rol Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                    <ShieldCheckIcon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 pr-8">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors uppercase tracking-tight">
                      {rol.nombre}
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">
                      {rol.descripcion || "Sin descripción proporcionada"}
                    </p>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="mt-2 pt-3 border-t border-zinc-800/50 flex justify-between items-center">
                  <Group gap={6}>
                    <Tooltip label="Editar Permisos">
                      <Button
                        variant="subtle"
                        color="indigo"
                        size="xs"
                        leftSection={<PencilSquareIcon className="w-4 h-4" />}
                        className="hover:bg-indigo-500/10"
                        onClick={() => handleOpenEdit(rol)}
                      >
                        Editar Permisos
                      </Button>
                    </Tooltip>
                  </Group>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation/Edition Modal */}
      <ModalEstandar
        opened={openedCreate}
        close={closeCreate}
        validateClose
        title={
          selectedRol ? `Editar Permisos: ${selectedRol.nombre}` : "Crear Rol"
        }
        size="md"
      >
        <RegistroRol
          estructura={registro.estructura}
          loadingEstructura={registro.loadingEstructura}
          loadingPermisos={registro.loadingPermisos}
          nombre={registro.nombre}
          setNombre={registro.setNombre}
          descripcion={registro.descripcion}
          setDescripcion={registro.setDescripcion}
          isChecked={registro.isChecked}
          onTogglePermiso={registro.handleTogglePermiso}
          onToggleSubmenu={registro.handleToggleSubmenu}
          onSave={registro.handleGuardar}
          onCancel={closeCreate}
          saving={registro.saving}
          isEdit={!!selectedRol}
        />
      </ModalEstandar>
    </div>
  );
};

export default RolesPage;
