import { useState } from "react";
import { Button, NumberInput, Switch, TextInput, ActionIcon, Group } from "@mantine/core";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowRightEndOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { useNotify } from "../../../../hooks/useNotify";
import { useMenuSystem } from "../../hooks/useMenuSystem";
import type { RES_MenuArbol, RES_SubmenuMenu, RES_ModuloMenu } from "../../service/menu.responses";

type EditTarget =
  | { tipo: "menu"; id: number; nombre: string; path: string; numero_orden: number; es_desplegable: boolean }
  | { tipo: "submenu"; id: number; id_menu: number; nombre: string; path: string; numero_orden: number; es_desplegable: boolean }
  | { tipo: "modulo"; id: number; id_submenu: number; nombre: string; path: string; numero_orden: number }
  | null;

type CreateTarget =
  | { tipo: "menu" }
  | { tipo: "submenu"; id_menu: number }
  | { tipo: "modulo"; id_submenu: number }
  | null;

const fieldClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white placeholder:text-zinc-500",
  label: "text-zinc-300 mb-1 font-medium text-xs",
};

const NodoForm = ({
  initialNombre,
  initialPath,
  initialNumero,
  initialDesplegable,
  showDesplegable,
  onSubmit,
  onCancel,
  saving,
  title,
}: {
  initialNombre?: string;
  initialPath?: string;
  initialNumero?: number;
  initialDesplegable?: boolean;
  showDesplegable?: boolean;
  onSubmit: (data: { nombre: string; path: string | null; numero_orden: number; es_desplegable?: boolean }) => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) => {
  const [nombre, setNombre] = useState(initialNombre ?? "");
  const [path, setPath] = useState(initialPath ?? "");
  const [numero, setNumero] = useState<number | string>(initialNumero ?? 10);
  const [esDesplegable, setEsDesplegable] = useState(initialDesplegable ?? true);

  // Cuando es desplegable, el path es irrelevante: lo limpiamos automaticamente.
  const effectivePath = esDesplegable ? "" : path;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <TextInput label="Nombre" value={nombre} onChange={(e) => setNombre(e.currentTarget.value)} required classNames={fieldClasses} radius="lg" />
      <TextInput
        label="Path (sin /)"
        value={effectivePath}
        onChange={(e) => setPath(e.currentTarget.value)}
        required={!esDesplegable}
        disabled={esDesplegable}
        description={esDesplegable ? "No requiere path porque es un contenedor." : undefined}
        classNames={fieldClasses}
        radius="lg"
        placeholder="ej: trabajadores"
      />
      <NumberInput label="Número de orden" value={numero} onChange={setNumero} min={0} classNames={fieldClasses} radius="lg" />
      {showDesplegable && (
        <Switch
          checked={esDesplegable}
          onChange={(e) => setEsDesplegable(e.currentTarget.checked)}
          label="Es desplegable (tiene hijos)"
          color="indigo"
        />
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="subtle" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button
          loading={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() =>
            onSubmit({
              nombre,
              // Si es desplegable, enviamos null. Si no, enviamos el path.
              path: esDesplegable ? null : path,
              numero_orden: Number(numero),
              es_desplegable: esDesplegable,
            })
          }
        >
          Guardar
        </Button>
      </div>
    </div>
  );
};

export const NavegacionTab = () => {
  const { notify } = useNotify();
  const {
    items,
    crearMenu, editarMenu, eliminarMenu,
    crearSubmenu, editarSubmenu, eliminarSubmenu,
    crearModulo, editarModulo, eliminarModulo,
  } = useMenuSystem();

  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleCreate = async (data: { nombre: string; path: string | null; numero_orden: number; es_desplegable?: boolean }) => {
    if (!createTarget) return;
    setSaving(true);
    try {
      let r;
      if (createTarget.tipo === "menu") r = await crearMenu(data);
      else if (createTarget.tipo === "submenu") r = await crearSubmenu({ ...data, id_menu: createTarget.id_menu });
      else if (createTarget.tipo === "modulo") r = await crearModulo({ nombre: data.nombre, path: data.path, numero_orden: data.numero_orden, id_submenu: createTarget.id_submenu });
      if (r) {
        notify({ type: r.success ? "success" : "error", content: r.message });
        if (r.success) setCreateTarget(null);
      }
    } catch {
      notify({ type: "error", content: "Error al crear." });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: { nombre: string; path: string | null; numero_orden: number; es_desplegable?: boolean }) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      let r;
      if (editTarget.tipo === "menu") r = await editarMenu(editTarget.id, data);
      else if (editTarget.tipo === "submenu") r = await editarSubmenu(editTarget.id, data);
      else if (editTarget.tipo === "modulo") r = await editarModulo(editTarget.id, { nombre: data.nombre, path: data.path, numero_orden: data.numero_orden, id_submenu: editTarget.id_submenu });
      if (r) {
        notify({ type: r.success ? "success" : "error", content: r.message });
        if (r.success) setEditTarget(null);
      }
    } catch {
      notify({ type: "error", content: "Error al editar." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tipo: "menu" | "submenu" | "modulo", id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    let r;
    if (tipo === "menu") r = await eliminarMenu(id);
    else if (tipo === "submenu") r = await eliminarSubmenu(id);
    else r = await eliminarModulo(id);
    notify({ type: r.success ? "success" : "error", content: r.message });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Navegación</h2>
          <p className="text-xs text-zinc-500">
            Árbol de menús, submenús y módulos. Cada nodo es una vista o un
            contenedor.
          </p>
        </div>
        <Button
          leftSection={<PlusIcon className="w-4 h-4" />}
          onClick={() => setCreateTarget({ tipo: "menu" })}
          radius="lg"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Nuevo Menú
        </Button>
      </div>

      <div className="space-y-1 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl p-3">
        {items.map((menu: RES_MenuArbol) => {
          const key = `m-${menu.id}`;
          const isOpen = expanded[key];
          return (
            <div key={key}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-800/30 transition-all group">
                <ActionIcon variant="subtle" color="zinc" onClick={() => toggle(key)}>
                  {isOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                </ActionIcon>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{menu.nombre}</span>
                    <span className="text-xs text-zinc-500">/{menu.path}</span>
                    {menu.es_desplegable ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">CONT</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">VISTA</span>
                    )}
                  </div>
                </div>
                <Group gap={4}>
                  <ActionIcon variant="subtle" color="indigo" onClick={() => setEditTarget({ tipo: "menu", id: menu.id, nombre: menu.nombre, path: menu.path, numero_orden: menu.numero_orden, es_desplegable: menu.es_desplegable })}>
                    <PencilSquareIcon className="w-4 h-4" />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="indigo" onClick={() => setCreateTarget({ tipo: "submenu", id_menu: menu.id })}>
                    <PlusIcon className="w-4 h-4" />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete("menu", menu.id, menu.nombre)}>
                    <TrashIcon className="w-4 h-4" />
                  </ActionIcon>
                </Group>
              </div>
              {isOpen && menu.submenus.map((sub: RES_SubmenuMenu) => {
                const skey = `s-${sub.id}`;
                const sOpen = expanded[skey];
                const esDirecto = !sub.es_desplegable && !!sub.path;
                return (
                  <div key={skey} className="ml-6 mt-1">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-800/30 transition-all group">
                      <ActionIcon
                        variant="subtle"
                        color="zinc"
                        size="sm"
                        onClick={esDirecto ? undefined : () => toggle(skey)}
                        style={esDirecto ? { cursor: "default" } : undefined}
                      >
                        {esDirecto ? (
                          <ArrowRightEndOnRectangleIcon className="w-3 h-3" />
                        ) : sOpen ? (
                          <ChevronDownIcon className="w-3 h-3" />
                        ) : (
                          <ChevronRightIcon className="w-3 h-3" />
                        )}
                      </ActionIcon>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-200">{sub.nombre}</span>
                          <span className="text-xs text-zinc-500">/{sub.path}</span>
                          {sub.es_desplegable ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">CONT</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">VISTA</span>
                          )}
                        </div>
                      </div>
                      <Group gap={4}>
                        <ActionIcon variant="subtle" color="indigo" size="sm" onClick={() => setEditTarget({ tipo: "submenu", id: sub.id, id_menu: sub.id_menu, nombre: sub.nombre, path: sub.path, numero_orden: sub.numero_orden, es_desplegable: sub.es_desplegable })}>
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="indigo" size="sm" onClick={() => setCreateTarget({ tipo: "modulo", id_submenu: sub.id })}>
                          <PlusIcon className="w-3.5 h-3.5" />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete("submenu", sub.id, sub.nombre)}>
                          <TrashIcon className="w-3.5 h-3.5" />
                        </ActionIcon>
                      </Group>
                    </div>
                    {sOpen && sub.modulos.map((mod: RES_ModuloMenu) => (
                      <div key={`md-${mod.id}`} className="ml-8 mt-1">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-800/30 transition-all">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-300">{mod.nombre}</span>
                              <span className="text-xs text-zinc-500">/{mod.path}</span>
                            </div>
                          </div>
                          <Group gap={4}>
                            <ActionIcon variant="subtle" color="indigo" size="sm" onClick={() => setEditTarget({ tipo: "modulo", id: mod.id, id_submenu: mod.id_submenu, nombre: mod.nombre, path: mod.path, numero_orden: mod.numero_orden })}>
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete("modulo", mod.id, mod.nombre)}>
                              <TrashIcon className="w-3.5 h-3.5" />
                            </ActionIcon>
                          </Group>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <ModalEstandar
        opened={createTarget !== null}
        close={() => setCreateTarget(null)}
        title={
          createTarget?.tipo === "menu" ? "Nuevo Menú"
            : createTarget?.tipo === "submenu" ? "Nuevo Submenú"
            : "Nuevo Módulo"
        }
        size="sm"
      >
        {createTarget && (
          <NodoForm
            title=""
            showDesplegable={createTarget.tipo !== "modulo"}
            onSubmit={handleCreate}
            onCancel={() => setCreateTarget(null)}
            saving={saving}
          />
        )}
      </ModalEstandar>

      <ModalEstandar
        opened={editTarget !== null}
        close={() => setEditTarget(null)}
        title={
          editTarget?.tipo === "menu" ? "Editar Menú"
            : editTarget?.tipo === "submenu" ? "Editar Submenú"
            : "Editar Módulo"
        }
        size="sm"
      >
        {editTarget && (
          <NodoForm
            title=""
            initialNombre={editTarget.nombre}
            initialPath={editTarget.path}
            initialNumero={editTarget.numero_orden}
            initialDesplegable={"es_desplegable" in editTarget ? editTarget.es_desplegable : true}
            showDesplegable={editTarget.tipo !== "modulo"}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            saving={saving}
          />
        )}
      </ModalEstandar>
    </div>
  );
};
