import {
  TextInput,
  Textarea,
  Button,
  Stack,
  Text,
  Checkbox,
  Group,
  Accordion,
  Box,
} from "@mantine/core";
import {
  RectangleGroupIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import type {
  RES_MenuEstructura,
  RES_Modulo,
  RES_Submenu,
} from "../service/roles.responses";

interface RegistroRolProps {
  estructura: RES_MenuEstructura[];
  loadingEstructura: boolean;
  loadingPermisos: boolean;
  nombre: string;
  setNombre: (val: string) => void;
  descripcion: string;
  setDescripcion: (val: string) => void;
  isChecked: (tipo: string, id: number) => boolean;
  onTogglePermiso: (tipo: "menu" | "submenu" | "modulo", id: number) => void;
  onToggleSubmenu: (modulos: RES_Modulo[], checked: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit?: boolean;
}

export const RegistroRol = ({
  estructura,
  loadingEstructura,
  loadingPermisos,
  nombre,
  setNombre,
  descripcion,
  setDescripcion,
  isChecked,
  onTogglePermiso,
  onToggleSubmenu,
  onSave,
  onCancel,
  saving,
  isEdit = false,
}: RegistroRolProps) => {
  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  return (
    <Stack gap="md">
      <Group grow>
        <TextInput
          label="Nombre del Rol"
          placeholder="Ej: Administrador de Almacén"
          value={nombre}
          onChange={(e) => setNombre(e.currentTarget.value)}
          required
          withAsterisk
          radius="lg"
          disabled={isEdit}
          leftSection={<ShieldCheckIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
        />

        <Textarea
          label="Descripción (opcional)"
          placeholder="Breve descripción de las responsabilidades..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.currentTarget.value)}
          radius="lg"
          rows={2}
          disabled={isEdit}
          leftSection={<DocumentTextIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
        />
      </Group>
      <div className="mt-2 space-y-1 px-1">
        <Text fw={800} size="sm" className="text-white flex items-center gap-2">
          <CheckBadgeIcon className="w-5 h-5 text-indigo-500" />
          Configuración de Permisos
        </Text>
        <Text size="xs" c="gray">
          Selecciona los menús, submenús y módulos a los que este rol tendrá
          acceso.
        </Text>
      </div>
      <div className="relative">
        {loadingEstructura || loadingPermisos ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <Text size="xs" fw={500} color="dimmed">
              {loadingEstructura
                ? "Cargando estructura..."
                : "Cargando permisos del rol..."}
            </Text>
          </div>
        ) : (
          <Accordion
            variant="separated"
            defaultValue={
              estructura.find(
                (m) =>
                  m.nombre.toLowerCase().includes("logística") ||
                  m.nombre.toLowerCase().includes("logistica"),
              )?.nombre ?? estructura[0]?.nombre
            }
            classNames={{
              item: "border-zinc-800/50 bg-zinc-900/20 mb-3 rounded-xl overflow-hidden transition-all hover:border-zinc-700/50",
              control: "py-3 px-4 hover:bg-zinc-800/20",
              panel: "px-4 pb-4 pt-2",
              chevron: "text-zinc-500",
            }}
          >
            {estructura.map((menuItem) => {
              const menuChecked = isChecked("menu", menuItem.id);
              return (
                <Accordion.Item
                  key={menuItem.id}
                  value={menuItem.nombre}
                  className="group"
                >
                  <Accordion.Control
                    icon={
                      <RectangleGroupIcon className="w-5 h-5 text-indigo-400 group-data-active:text-indigo-300" />
                    }
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Text
                        size="sm"
                        fw={700}
                        className="text-zinc-300 group-data-active:text-white transition-colors"
                      >
                        {menuItem.nombre}
                      </Text>
                      <Group gap="xs">
                        {!menuItem.es_desplegable && (
                          <Checkbox
                            size="xs"
                            checked={menuChecked}
                            onChange={() =>
                              onTogglePermiso("menu", menuItem.id)
                            }
                            color="indigo"
                            styles={{
                              input: { cursor: "pointer" },
                            }}
                          />
                        )}
                      </Group>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="md">
                      {menuItem.submenus.map((submenu: RES_Submenu) => {
                        const idsModulos = submenu.modulos.map(
                          (m: RES_Modulo) => m.id,
                        );
                        const todosSeleccionados =
                          idsModulos.length > 0 &&
                          idsModulos.every((id: number) =>
                            isChecked("modulo", id),
                          );
                        const algunoSeleccionado = idsModulos.some(
                          (id: number) => isChecked("modulo", id),
                        );
                        const submenuChecked = isChecked("submenu", submenu.id);

                        return (
                          <Box
                            key={submenu.id}
                            className="bg-zinc-900/40 rounded-2xl border border-zinc-800/40 p-4 relative overflow-hidden group/sub"
                          >
                            <div
                              className={`absolute inset-0 bg-indigo-500/3 transition-opacity ${algunoSeleccionado || submenuChecked ? "opacity-100" : "opacity-0"}`}
                            />

                            <Group
                              justify="space-between"
                              mb="xs"
                              className="relative z-10"
                            >
                              <Group gap="xs">
                                <div
                                  className={`w-2 h-2 rounded-full transition-colors ${todosSeleccionados || submenuChecked ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : algunoSeleccionado ? "bg-indigo-500/50" : "bg-zinc-700"}`}
                                />
                                <Text
                                  size="xs"
                                  fw={800}
                                  className="text-zinc-400 uppercase tracking-tighter transition-colors group-hover/sub:text-zinc-200"
                                >
                                  {submenu.nombre}
                                </Text>
                              </Group>

                              <Group gap="sm">
                                {!submenu.es_desplegable && (
                                  <Checkbox
                                    size="xs"
                                    label="Acceso directo"
                                    checked={submenuChecked}
                                    onChange={() =>
                                      onTogglePermiso("submenu", submenu.id)
                                    }
                                    color="indigo"
                                    styles={{
                                      label: {
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                        color: "#71717a",
                                      },
                                      input: {
                                        cursor: "pointer",
                                        borderWidth: "1.5px",
                                      },
                                    }}
                                  />
                                )}
                                <Checkbox
                                  size="xs"
                                  label="Todos los módulos"
                                  checked={todosSeleccionados}
                                  indeterminate={
                                    algunoSeleccionado && !todosSeleccionados
                                  }
                                  onChange={(e) =>
                                    onToggleSubmenu(
                                      submenu.modulos,
                                      e.currentTarget.checked,
                                    )
                                  }
                                  color="indigo"
                                  styles={{
                                    label: {
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      textTransform: "uppercase",
                                      color: "#71717a",
                                    },
                                    input: {
                                      cursor: "pointer",
                                      borderWidth: "1.5px",
                                    },
                                    icon: {
                                      width: "80% !important",
                                      height: "80% !important",
                                    },
                                  }}
                                />
                              </Group>
                            </Group>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                              {submenu.modulos.map((modulo: RES_Modulo) => {
                                const checked = isChecked("modulo", modulo.id);
                                return (
                                  <div
                                    key={modulo.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                      checked
                                        ? "bg-indigo-500/10 border-indigo-500/20"
                                        : "bg-zinc-950/20 border-transparent hover:bg-zinc-800/30"
                                    }`}
                                    onClick={() =>
                                      onTogglePermiso("modulo", modulo.id)
                                    }
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onChange={() => {}}
                                      size="xs"
                                      color="indigo"
                                      styles={{
                                        input: { cursor: "pointer" },
                                      }}
                                    />
                                    <Text
                                      size="xs"
                                      fw={500}
                                      className={
                                        checked
                                          ? "text-indigo-200"
                                          : "text-zinc-400"
                                      }
                                    >
                                      {modulo.nombre}
                                    </Text>
                                  </div>
                                );
                              })}
                            </div>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}
      </div>
      <Group justify="flex-end" gap="md" mt="xl">
        <Button
          variant="subtle"
          onClick={onCancel}
          disabled={saving}
          radius="lg"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          Cancelar
        </Button>
        <Button
          onClick={onSave}
          loading={saving}
          radius="lg"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-8"
        >
          {isEdit ? "Guardar Cambios" : "Registrar Rol"}
        </Button>
      </Group>
    </Stack>
  );
};
