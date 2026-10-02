import { useState } from "react";
import { Button, TextInput } from "@mantine/core";
import { PlusIcon } from "@heroicons/react/24/outline";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { useNotify } from "../../../../hooks/useNotify";
import { useUnidadesMedidaSystem } from "../../hooks/useUnidadesMedidaSystem";
import { Schema_UnidadMedida } from "../../service/unidades-medida.requests";
import type { RES_UnidadMedida } from "../../service/unidades-medida.responses";

type ModalMode = "create" | "edit" | null;

export const UnidadesMedidaTab = () => {
  const { notify } = useNotify();
  const { items, loading, cargar, crear, editar, eliminar } =
    useUnidadesMedidaSystem();
  const [modal, setModal] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<RES_UnidadMedida | null>(null);
  const [nombre, setNombre] = useState("");
  const [abreviatura, setAbreviatura] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setNombre("");
    setAbreviatura("");
    setModal("create");
  };

  const openEdit = (item: RES_UnidadMedida) => {
    setEditTarget(item);
    setNombre(item.nombre);
    setAbreviatura(item.abreviatura);
    setModal("edit");
  };

  const close = () => {
    setModal(null);
    setEditTarget(null);
    setNombre("");
    setAbreviatura("");
  };

  const handleSave = async () => {
    const validation = Schema_UnidadMedida.safeParse({ nombre, abreviatura });
    if (!validation.success) {
      notify({ type: "error", content: validation.error.issues[0].message });
      return;
    }
    setSaving(true);
    try {
      const r =
        modal === "edit" && editTarget
          ? await editar(editTarget.id, validation.data)
          : await crear(validation.data);
      if (r.success) {
        notify({ type: "success", content: r.message });
        close();
        cargar();
      } else {
        notify({ type: "error", content: r.message });
      }
    } catch {
      notify({ type: "error", content: "Error al guardar la unidad." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: RES_UnidadMedida) => {
    if (!confirm(`¿Eliminar la unidad "${item.nombre}"?`)) return;
    const r = await eliminar(item.id);
    notify({ type: r.success ? "success" : "error", content: r.message });
    if (r.success) cargar();
  };

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white placeholder:text-zinc-500",
    label: "text-zinc-300 mb-1 font-medium text-xs",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Unidades de Medida</h2>
          <p className="text-xs text-zinc-500">
            Catálogo base para registrar conversiones entre unidades.
          </p>
        </div>
        <Button
          leftSection={<PlusIcon className="w-4 h-4" />}
          onClick={openCreate}
          radius="lg"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Nueva Unidad
        </Button>
      </div>

      <DataTableEstandar
        records={items}
        loading={loading}
        columns={[
          { accessor: "nombre", title: "Nombre", sortable: true },
          { accessor: "abreviatura", title: "Abreviatura", sortable: true },
          {
            accessor: "actions",
            title: "Acciones",
            render: (item: RES_UnidadMedida) => (
              <div className="flex gap-2">
                <Button
                  size="xs"
                  variant="subtle"
                  color="indigo"
                  onClick={() => openEdit(item)}
                >
                  Editar
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={() => handleDelete(item)}
                >
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
      />

      <ModalEstandar
        opened={modal !== null}
        close={close}
        validateClose
        title={modal === "edit" ? "Editar Unidad" : "Nueva Unidad"}
        size="sm"
      >
        <div className="space-y-3">
          <TextInput
            label="Nombre"
            placeholder="Ej: Metro"
            value={nombre}
            onChange={(e) => setNombre(e.currentTarget.value)}
            required
            classNames={fieldClasses}
            radius="lg"
          />
          <TextInput
            label="Abreviatura"
            placeholder="Ej: MT"
            value={abreviatura}
            onChange={(e) =>
              setAbreviatura(e.currentTarget.value.toUpperCase())
            }
            required
            classNames={fieldClasses}
            radius="lg"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="subtle" onClick={close} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Guardar
            </Button>
          </div>
        </div>
      </ModalEstandar>
    </div>
  );
};
