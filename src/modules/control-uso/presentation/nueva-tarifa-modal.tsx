import {
  Button,
  Group,
  NumberInput,
  Stack,
  TextInput,
  Select,
  ActionIcon,
  Tooltip,
  Modal,
} from "@mantine/core";
import { useState, useEffect } from "react";
import { useNotify } from "../../../hooks/useNotify";
import { ControlUsoService } from "../service/control-uso.service";
import type { RES_ActivoFijoDisponible } from "../../../service/responses/activo-fijo";
import type { RES_Tarifa, RES_TipoMaterial } from "../service/control-uso.responses";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Props {
  asset: RES_ActivoFijoDisponible;
  initialTipoControl?: string;
  onSuccess: (nuevaTarifa: RES_Tarifa) => void;
  onCancel: () => void;
}

export const NuevaTarifaModal = ({ asset, initialTipoControl, onSuccess, onCancel }: Props) => {
  const { notifyError } = useNotify();

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  const [saving, setSaving] = useState(false);
  const [tipoControl, setTipoControl] = useState<string>(initialTipoControl || "horometro");
  const [precioUnitario, setPrecioUnitario] = useState<number | "">("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [distanciaMetros, setDistanciaMetros] = useState<number | "">("");

  const [materiales, setMateriales] = useState<RES_TipoMaterial[]>([]);
  const [idTipoMaterial, setIdTipoMaterial] = useState<string | null>(null);

  // Detecta si el material seleccionado es "Saco" (sin precio)
  const esMaterialSaco = idTipoMaterial
    ? (materiales.find(m => m.id.toString() === idTipoMaterial)?.nombre || "").toLowerCase().includes("saco")
    : false;

  // Mini modal para crear material
  const [modalMaterialOpened, setModalMaterialOpened] = useState(false);
  const [nuevoMaterialNombre, setNuevoMaterialNombre] = useState("");
  const [savingMaterial, setSavingMaterial] = useState(false);

  useEffect(() => {
    ControlUsoService.getMateriales().then((res) => {
      if (res.success) {
        setMateriales(res.data);
      }
    });
  }, []);

  const handleCrearMaterial = async () => {
    const nombre = nuevoMaterialNombre.trim();
    if (!nombre) {
      notifyError("Ingrese un nombre para el material.");
      return;
    }
    setSavingMaterial(true);
    try {
      const res = await ControlUsoService.crearMaterial({ nombre });
      if (res.success) {
        setMateriales((prev) => [...prev, res.data]);
        setIdTipoMaterial(res.data.id.toString());
        setNuevoMaterialNombre("");
        setModalMaterialOpened(false);
      } else {
        notifyError(res.message || "Error al crear el material.");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error de conexión al crear el material.");
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleSubmit = async () => {
    // Si NO es saco, el precio es requerido
    if (!esMaterialSaco && (!precioUnitario || precioUnitario <= 0)) {
      notifyError("El precio unitario debe ser mayor a cero.");
      return;
    }

    setSaving(true);
    try {
      const resp = await ControlUsoService.crearTarifa({
        id_activo_fijo: asset.id_activo,
        tipo_control: tipoControl,
        precio_unitario: esMaterialSaco ? 0 : Number(precioUnitario),
        descripcion: descripcion ? descripcion.trim() : "",
        id_tipo_material: tipoControl === "vueltas" && idTipoMaterial ? Number(idTipoMaterial) : undefined,
        distancia_metros: tipoControl === "vueltas" && distanciaMetros !== "" ? Number(distanciaMetros) : undefined,
      });

      if (resp.success) {
        onSuccess(resp.data);
      } else {
        notifyError(resp.message || "Error al crear la tarifa");
      }
    } catch (err) {
      notifyError("Error de conexión al guardar la tarifa.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack gap="md" className="p-1">
        <Select
          label="Tipo de Control"
          data={[
            { value: "horometro", label: "Horómetro" },
            { value: "vueltas", label: "Vueltas" },
          ]}
          value={tipoControl}
          onChange={(val) => setTipoControl(val || "horometro")}
          required
          classNames={fieldClasses}
          radius="lg"
        />

        {tipoControl === "vueltas" && (
          <Group align="flex-end" wrap="nowrap">
            <Select
              label="Tipo de Material"
              placeholder="Seleccione material"
              data={materiales.map((m) => ({ value: m.id.toString(), label: m.nombre }))}
              value={idTipoMaterial}
              onChange={setIdTipoMaterial}
              searchable
              clearable
              classNames={fieldClasses}
              radius="lg"
              className="flex-1"
            />
            <Tooltip label="Nuevo Material">
              <ActionIcon
                onClick={() => setModalMaterialOpened(true)}
                variant="filled"
                color="indigo.6"
                size={36}
                radius="lg"
                className="mb-[3px]"
              >
                <PlusIcon className="w-4 h-4" />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}

        {tipoControl === "vueltas" && (
          <NumberInput
            label="Distancia hasta (metros)"
            placeholder="Ej: 100, 200, 300"
            value={distanciaMetros}
            onChange={(val) => setDistanciaMetros(val as number | "")}
            min={1}
            allowDecimal={false}
            classNames={fieldClasses}
            radius="lg"
            description="Opcional: límite de distancia para esta tarifa"
          />
        )}

        <NumberInput
          label={esMaterialSaco ? "Precio Unitario (S/.) — No aplica para Sacos" : "Precio Unitario (S/.)"}
          placeholder={esMaterialSaco ? "No aplica" : "0.00"}
          value={esMaterialSaco ? "" : precioUnitario}
          onChange={(val) => setPrecioUnitario(val as number | "")}
          min={0}
          decimalScale={2}
          fixedDecimalScale={!esMaterialSaco}
          required={!esMaterialSaco}
          disabled={esMaterialSaco}
          classNames={fieldClasses}
          radius="lg"
        />

        <TextInput
          label="Descripción (Opcional)"
          placeholder="Ej. Tarifa Regular, Tarifa Nocturna, etc."
          value={descripcion}
          onChange={(e) => setDescripcion(e.currentTarget.value)}
          classNames={fieldClasses}
          radius="lg"
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" color="gray" onClick={onCancel} disabled={saving} radius="lg">
            Cancelar
          </Button>
          <Button color="blue" onClick={handleSubmit} loading={saving} radius="lg">
            Crear Tarifa
          </Button>
        </Group>
      </Stack>

      {/* Mini modal para crear tipo de material */}
      <Modal
        opened={modalMaterialOpened}
        onClose={() => setModalMaterialOpened(false)}
        title="Nuevo Tipo de Material"
        centered
        size="xs"
        radius="lg"
        styles={{
          content: { background: "#18181b", border: "1px solid #3f3f46" },
          header: { background: "#18181b" },
          title: { color: "#f4f4f5", fontWeight: 700, fontSize: 14 },
          close: { color: "#71717a" },
        }}
      >
        <Stack gap="md" p={4}>
          <TextInput
            label="Nombre del Material"
            placeholder="Ej. Mineral, Desmonte, Sacos..."
            value={nuevoMaterialNombre}
            onChange={(e) => setNuevoMaterialNombre(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCrearMaterial();
              }
            }}
            classNames={fieldClasses}
            radius="lg"
            size="sm"
            autoFocus
          />
          <Group justify="flex-end" mt="xs">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setModalMaterialOpened(false)}
              disabled={savingMaterial}
              size="xs"
              radius="lg"
            >
              Cancelar
            </Button>
            <Button
              color="indigo"
              onClick={handleCrearMaterial}
              loading={savingMaterial}
              size="xs"
              radius="lg"
            >
              Crear Material
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
