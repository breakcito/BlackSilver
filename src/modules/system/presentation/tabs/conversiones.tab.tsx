import { useEffect, useMemo, useState } from "react";
import { Button, NumberInput, Select } from "@mantine/core";
import { PlusIcon } from "@heroicons/react/24/outline";
import { DataTableEstandar } from "../../../../presentation/utils/datatable-estandar";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { useNotify } from "../../../../hooks/useNotify";
import { AuxService } from "../../../../service/auxiliar.service";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import { useConversionesSystem } from "../../hooks/useConversionesSystem";
import { Schema_Conversion } from "../../service/conversiones.requests";
import type { RES_Conversion } from "../../service/conversiones.responses";
import type { RES_UnidadMedida } from "../../../../service/responses/unidad-medida";
import { formatNumber } from "../../../../shared/functions/formatNumber";

type ModalMode = "create" | "edit" | null;

export const ConversionesTab = () => {
  const { notify } = useNotify();
  const { items, loading, cargar, crear, editar, eliminar } =
    useConversionesSystem();
  const [unidades, setUnidades] = useState<RES_UnidadMedida[]>([]);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<RES_Conversion | null>(null);
  const [idA, setIdA] = useState<string | null>(null);
  const [idB, setIdB] = useState<string | null>(null);
  const [factor, setFactor] = useState<number | string>(1);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AuxService.get_unidades_medida().then((r) => {
      if (r.success) setUnidades(r.data as RES_UnidadMedida[]);
    });
  }, []);

  const unidadesOptions = useMemo(() => {
    const all = unidades.map((u) => ({
      value: String(u.id_unidad_medida),
      label: `${u.nombre} (${u.abreviatura})`,
    }));
    if (!searchA.trim()) return all;
    return getCoincidencias(all, searchA, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [unidades, searchA]);

  const unidadesOptionsB = useMemo(() => {
    const all = unidades.map((u) => ({
      value: String(u.id_unidad_medida),
      label: `${u.nombre} (${u.abreviatura})`,
    }));
    if (!searchB.trim()) return all;
    return getCoincidencias(all, searchB, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [unidades, searchB]);

  const openCreate = () => {
    setEditTarget(null);
    setIdA(null);
    setIdB(null);
    setFactor(1);
    setSearchA("");
    setSearchB("");
    setModal("create");
  };

  const openEdit = (item: RES_Conversion) => {
    setEditTarget(item);
    setIdA(String(item.id_unidad_medida_a));
    setIdB(String(item.id_unidad_medida_b));
    setFactor(item.factor_conversion);
    setSearchA("");
    setSearchB("");
    setModal("edit");
  };

  const close = () => {
    setModal(null);
    setEditTarget(null);
  };

  const handleSave = async () => {
    if (!idA || !idB) {
      notify({ type: "error", content: "Selecciona ambas unidades." });
      return;
    }
    const dto = {
      id_unidad_medida_a: Number(idA),
      id_unidad_medida_b: Number(idB),
      factor_conversion: Number(factor),
    };
    const validation = Schema_Conversion.safeParse(dto);
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
      notify({ type: "error", content: "Error al guardar la conversión." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: RES_Conversion) => {
    if (!confirm("¿Eliminar esta conversión?")) return;
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
          <h2 className="text-lg font-bold text-white">Conversiones</h2>
          <p className="text-xs text-zinc-500">
            Registra cuántas unidades A hay en 1 unidad B. Ej: 100 cm en 1 m.
          </p>
        </div>
        <Button
          leftSection={<PlusIcon className="w-4 h-4" />}
          onClick={openCreate}
          radius="lg"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Nueva Conversión
        </Button>
      </div>

      <DataTableEstandar
        records={items}
        loading={loading}
        columns={[
          {
            accessor: "a",
            title: "Unidad A",
            render: (item: RES_Conversion) =>
              `${item.nombre_a} (${item.abreviatura_a})`,
          },
          {
            accessor: "b",
            title: "Unidad B",
            render: (item: RES_Conversion) =>
              `${item.nombre_b} (${item.abreviatura_b})`,
          },
          {
            accessor: "factor",
            title: "Factor",
            render: (item: RES_Conversion) =>
              formatNumber(item.factor_conversion),
          },
          {
            accessor: "actions",
            title: "Acciones",
            render: (item: RES_Conversion) => (
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
        title={modal === "edit" ? "Editar Conversión" : "Nueva Conversión"}
        size="sm"
      >
        <div className="space-y-3">
          <Select
            label="Unidad A"
            placeholder="Buscar unidad A..."
            value={idA}
            onChange={setIdA}
            searchable
            searchValue={searchA}
            onSearchChange={setSearchA}
            data={unidadesOptions}
            required
            classNames={fieldClasses}
            radius="lg"
          />
          <Select
            label="Unidad B"
            placeholder="Buscar unidad B..."
            value={idB}
            onChange={setIdB}
            searchable
            searchValue={searchB}
            onSearchChange={setSearchB}
            data={unidadesOptionsB}
            required
            classNames={fieldClasses}
            radius="lg"
          />
          <NumberInput
            label="Factor de conversión (cuántas A en 1 B)"
            value={factor}
            onChange={setFactor}
            fixedDecimalScale
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
