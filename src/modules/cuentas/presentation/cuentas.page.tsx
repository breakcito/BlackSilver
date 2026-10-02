import {
  ActionIcon,
  Badge,
  Button,
  Group,
  TextInput,
  Tooltip,
  Avatar,
  Text,
  Stack,
  Skeleton,
  Loader,
  FileButton,
} from "@mantine/core";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  KeyIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { useCuentas } from "../hooks/useCuentas";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { RegistroCuenta } from "./registro-cuenta";
import { BotonRecargar } from "../../../presentation/utils/boton-recargar";

export const CuentasPage = () => {
  useTitlePage("Usuarios y Cuentas");

  const {
    cuentasFiltradas,
    loading,
    loadingRoles,
    loadingEmpleados,
    busqueda,
    setBusqueda,
    openedCreate,
    openCreate,
    closeCreate,
    selectedCuenta,
    setSelectedCuenta,
    handleOpenEdit,
    handleUpdatePhoto,
    updatingPhoto,
    pushNuevaCuenta,
    refresh,
    roles,
    empleadosSinCuenta,
  } = useCuentas();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <TextInput
          label="Buscar Cuenta"
          placeholder="Buscar por usuario, empleado o rol..."
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
          <BotonRecargar onReload={refresh} loading={loading} />
          <Button
            leftSection={<PlusIcon className="w-5 h-5" />}
            onClick={() => {
              setSelectedCuenta(null);
              openCreate();
            }}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 shrink-0 px-6 font-semibold"
          >
            Nueva Cuenta
          </Button>
        </div>
      </div>

      {/* Grid de Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-5 gap-4"
            >
              <div className="flex justify-between items-center">
                <Skeleton height={16} width={100} radius="sm" />
                <Skeleton height={16} width={60} radius="md" />
              </div>

              <div className="flex items-center gap-4">
                <Skeleton height={56} width={56} circle />
                <div className="space-y-2 flex-1">
                  <Skeleton height={14} width="80%" radius="sm" />
                  <Skeleton height={16} width="40%" radius="sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950/40 rounded-2xl p-3 border border-zinc-800/40 space-y-2">
                  <Skeleton height={8} width="40%" radius="xs" />
                  <Skeleton height={12} width="100%" radius="xs" />
                </div>
                <div className="bg-zinc-950/40 rounded-2xl p-3 border border-zinc-800/40 space-y-2">
                  <Skeleton height={8} width="40%" radius="xs" />
                  <Skeleton height={12} width="100%" radius="xs" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : cuentasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
          <Squares2X2Icon className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm font-medium">
            No se encontraron cuentas registradas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cuentasFiltradas.map((cuenta) => {
            const isActive = cuenta.estado === "Activo";
            return (
              <div
                key={cuenta.id_usuario}
                className="group flex flex-col bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-5 gap-4 hover:border-indigo-500/30 hover:bg-zinc-900/60 transition-all duration-300 relative overflow-hidden"
              >
                {/* Decorative Gradient */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 blur-3xl group-hover:bg-indigo-500/10 transition-colors" />

                {/* Row 1: Badges superiores (Empresa y Estado) */}
                <div className="flex items-center justify-between mb-1">
                  {cuenta.empresa_pertenece ? (
                    <Badge
                      size="xs"
                      variant="filled"
                      color="pink"
                      radius="sm"
                      className="text-white font-bold border-none"
                    >
                      {cuenta.empresa_pertenece}
                    </Badge>
                  ) : (
                    <div />
                  )}
                  <Badge
                    color={isActive ? "green" : "gray"}
                    variant="light"
                    radius="md"
                    size="sm"
                  >
                    {cuenta.estado}
                  </Badge>
                </div>

                {/* Row 2: Employee Avatar & Identity */}
                <div className="flex items-center gap-4">
                  <div className="relative group/avatar">
                    <FileButton
                      onChange={(file) =>
                        file && handleUpdatePhoto(cuenta.id_empleado, file)
                      }
                      accept="image/png,image/jpeg,image/jpg"
                      disabled={updatingPhoto === cuenta.id_empleado}
                    >
                      {(props) => (
                        <div
                          {...props}
                          className={`relative cursor-pointer rounded-full transition-transform active:scale-95 ${updatingPhoto === cuenta.id_empleado ? "pointer-events-none" : ""}`}
                        >
                          <Avatar
                            src={cuenta.url_foto}
                            size={56}
                            radius="xl"
                            className="border-2 border-zinc-800 group-hover/avatar:border-indigo-500/50 transition-all shadow-xl"
                            imageProps={{ style: { objectFit: "cover" } }}
                          >
                            <UserIcon className="w-6 h-6 text-zinc-700" />
                          </Avatar>

                          {/* Overlay de Carga o Cámara */}
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                            {updatingPhoto === cuenta.id_empleado ? (
                              <Loader size="xs" color="indigo" />
                            ) : (
                              <CameraIcon className="w-5 h-5 text-white" />
                            )}
                          </div>

                          {/* Spinner persistente si está cargando */}
                          {updatingPhoto === cuenta.id_empleado && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 z-10">
                              <Loader size="xs" color="indigo" />
                            </div>
                          )}
                        </div>
                      )}
                    </FileButton>
                  </div>
                  <Stack gap={2}>
                    <Text
                      size="sm"
                      fw={800}
                      className="text-white line-clamp-1 group-hover:text-indigo-200 transition-colors"
                    >
                      {cuenta.apellido_empleado}, {cuenta.nombre_empleado}
                    </Text>
                    <Badge
                      size="xs"
                      variant="filled"
                      color="grape"
                      radius="sm"
                      className="text-white font-bold border-none w-fit"
                    >
                      {cuenta.nombre_rol}
                    </Badge>
                  </Stack>
                </div>

                {/* Row 2.5: Datos de Acceso */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-950/40 rounded-2xl p-3 border border-zinc-800/40">
                    <Text
                      size="10px"
                      fw={800}
                      color="dimmed"
                      className="uppercase tracking-widest mb-2.5 italic"
                    >
                      Usuario
                    </Text>
                    <Group gap="xs">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <Text size="xs" fw={700} className="text-white truncate">
                        {cuenta.username}
                      </Text>
                    </Group>
                  </div>
                  <div className="bg-zinc-950/40 rounded-2xl p-3 border border-zinc-800/40">
                    <Text
                      size="10px"
                      fw={800}
                      color="dimmed"
                      className="uppercase tracking-widest mb-2.5 italic"
                    >
                      Contraseña
                    </Text>
                    <div className="flex items-center justify-between">
                      <Group gap="xs">
                        <KeyIcon className="w-3.5 h-3.5 text-amber-400" />
                        <Text
                          size="xs"
                          fw={700}
                          className="text-zinc-200 italic"
                        >
                          ••••••••
                        </Text>
                      </Group>
                      <Tooltip
                        label="Cambiar Contraseña"
                        position="top"
                        withArrow
                        radius="md"
                      >
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          color="zinc"
                          onClick={() => handleOpenEdit(cuenta)}
                          className="hover:bg-zinc-800"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </ActionIcon>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <ModalEstandar
        opened={openedCreate}
        close={closeCreate}
        title={selectedCuenta ? "Cambiar Contraseña" : "Registrar Nueva Cuenta"}
        validateClose
        size="lg"
      >
        <RegistroCuenta
          cuentaEdit={selectedCuenta}
          onClose={closeCreate}
          onSuccess={pushNuevaCuenta}
          refresh={refresh}
          roles={roles}
          empleadosSinCuenta={empleadosSinCuenta}
          loadingRoles={loadingRoles}
          loadingEmpleados={loadingEmpleados}
        />
      </ModalEstandar>
    </div>
  );
};
