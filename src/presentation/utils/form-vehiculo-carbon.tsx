import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  type ComboboxData,
  type ComboboxItemGroup,
} from "@mantine/core";
import {
  ExclamationCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { AuxService } from "../../service/auxiliar.service";
import { useNotify } from "../../hooks/useNotify";
import { getCoincidencias } from "../../shared/functions/get-coincidencias";
import type { RES_VehiculoCarbon } from "../../service/responses/vehiculo-carbon";
import type { RES_Marca } from "../../service/responses/marca";

export interface FormVehiculoCarbonProps {
  marcas: RES_Marca[];
  onSuccess: (nuevo: RES_VehiculoCarbon) => void;
  /** Avisa que se registro una marca nueva, para refrescar el catalogo. */
  onMarcaRegistrada?: (marca: RES_Marca) => void;
  onCancel?: () => void;
}

const TIPOS_VEHICULO = ["Tolva", "Burrita"];

/** Valor reservado del selector de marca: dispara el alta de una marca nueva. */
const NUEVA_MARCA = "__nueva_marca__";

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  label: "text-zinc-300 mb-1.5 font-semibold tracking-tight",
};

/**
 * Alta rapida de vehiculo de carbon. Se usa desde el boton "+" del selector
 * de vehiculo del despacho de una venta.
 */
export const FormVehiculoCarbon = ({
  marcas,
  onSuccess,
  onMarcaRegistrada,
  onCancel,
}: FormVehiculoCarbonProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idMarca, setIdMarca] = useState<string | null>(null);
  const [tipoVehiculo, setTipoVehiculo] = useState<string>("Tolva");
  const [placa, setPlaca] = useState("");

  const [marcaBusqueda, setMarcaBusqueda] = useState("");
  const [registrandoMarca, setRegistrandoMarca] = useState(false);
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState("");
  const [registrandoNuevaMarca, setRegistrandoNuevaMarca] = useState(false);

  /** Marcas que coinciden con lo que se escribe en el selector. */
  const marcasFiltradas = useMemo(() => {
    const q = marcaBusqueda.trim();
    if (!q) return marcas;
    return getCoincidencias(marcas, q, {
      keys: ["nombre"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [marcas, marcaBusqueda]);

  /**
   * Las marcas de vehiculos se listan primero y el resto, abajo. Al final
   * queda la opcion de registrar una marca nueva.
   */
  const marcasData: ComboboxData = useMemo(() => {
    const deVehiculos = marcasFiltradas.filter((m) => m.de_vehiculos);
    const otras = marcasFiltradas.filter((m) => !m.de_vehiculos);

    const aItems = (lista: RES_Marca[]) =>
      lista.map((m) => ({ value: String(m.id_marca), label: m.nombre }));

    const grupos: ComboboxItemGroup[] = [];

    if (deVehiculos.length > 0) {
      grupos.push({
        group: "Marcas de vehiculos",
        items: aItems(deVehiculos),
      });
    }
    if (otras.length > 0) {
      grupos.push({ group: "Otras marcas", items: aItems(otras) });
    }

    return [...grupos, { value: NUEVA_MARCA, label: "+ Registrar nueva marca" }];
  }, [marcasFiltradas]);

  /**
   * Registra la marca nueva. Se guarda ya habilitada para vehiculos: quien la
   * crea desde el formulario de vehiculos la necesita para vehiculos.
   */
  const registrarMarca = async () => {
    const nombre = nuevaMarcaNombre.trim();
    if (!nombre) {
      setError("El nombre de la marca es obligatorio");
      return;
    }

    setRegistrandoNuevaMarca(true);
    setError(null);
    try {
      const res = await AuxService.crear_marca({
        nombre,
        de_vehiculos: true,
      });

      if (res.success && res.data) {
        notifySuccess("Marca registrada correctamente");
        onMarcaRegistrada?.(res.data);
        setIdMarca(String(res.data.id_marca));
        setRegistrandoMarca(false);
        setNuevaMarcaNombre("");
      } else {
        const msg = res.message || "No se pudo registrar la marca";
        setError(msg);
        notifyError(msg);
      }
    } catch (err) {
      console.error(err);
      const msg = "Error al registrar la marca";
      setError(msg);
      notifyError(msg);
    } finally {
      setRegistrandoNuevaMarca(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const placaNormalizada = placa.trim().toUpperCase();

    if (!placaNormalizada) {
      setError("La placa es obligatoria");
      return;
    }
    if (placaNormalizada.length < 3) {
      setError("La placa debe tener al menos 3 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await AuxService.crear_vehiculo_carbon({
        id_marca: idMarca ? Number(idMarca) : null,
        tipo_vehiculo: tipoVehiculo,
        placa: placaNormalizada,
      });

      if (res.success && res.data) {
        notifySuccess("Vehiculo registrado correctamente");
        onSuccess(res.data);
      } else {
        const msg = res.message || "No se pudo registrar el vehiculo";
        setError(msg);
        notifyError(msg);
      }
    } catch (err) {
      console.error(err);
      const msg = "Error al registrar el vehiculo";
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="md">
      {error && (
        <Alert
          icon={<ExclamationCircleIcon className="w-5 h-5" />}
          color="red"
          variant="light"
          radius="lg"
        >
          {error}
        </Alert>
      )}

      {registrandoMarca ? (
        <Stack gap="xs">
          <TextInput
            label="Nombre de la nueva marca"
            placeholder="Ej. Volvo, Scania, Sinotruk..."
            value={nuevaMarcaNombre}
            onChange={(e) => {
              setNuevaMarcaNombre(e.currentTarget.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") registrarMarca();
            }}
            classNames={inputClasses}
            size="xs"
            radius="lg"
            data-autofocus
          />
          <Group gap="xs" justify="flex-end">
            <Button
              variant="default"
              size="xs"
              radius="lg"
              onClick={() => {
                setRegistrandoMarca(false);
                setNuevaMarcaNombre("");
                setMarcaBusqueda("");
              }}
              disabled={registrandoNuevaMarca}
            >
              Volver
            </Button>
            <Button
              color="indigo"
              size="xs"
              radius="lg"
              leftSection={<PlusIcon className="w-4 h-4" />}
              onClick={registrarMarca}
              loading={registrandoNuevaMarca}
              disabled={!nuevaMarcaNombre.trim()}
            >
              Registrar marca
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            La marca queda registrada como marca de vehiculos.
          </Text>
        </Stack>
      ) : (
        <Select
          label="Marca"
          placeholder="Seleccione marca (opcional)"
          data={marcasData}
          value={idMarca}
          onChange={(val) => {
            if (val === NUEVA_MARCA) {
              setRegistrandoMarca(true);
              setNuevaMarcaNombre("");
              setError(null);
              return;
            }
            setIdMarca(val);
          }}
          searchValue={marcaBusqueda}
          onSearchChange={setMarcaBusqueda}
          searchable
          clearable
          nothingFoundMessage="Sin marcas registradas"
          comboboxProps={{ withinPortal: true }}
          // El filtrado lo hace `getCoincidencias` (Fuse + FlexSearch). Sin esto
          // Mantine aplica su filtro por subcadena encima y descarta las
          // coincidencias difusas y la opcion de registrar una marca nueva.
          filter={({ options }) => options}
          classNames={inputClasses}
          size="xs"
          radius="lg"
        />
      )}

      <Select
        label="Tipo de vehiculo"
        data={TIPOS_VEHICULO.map((t) => ({ value: t, label: t }))}
        value={tipoVehiculo}
        onChange={(val) => setTipoVehiculo(val ?? "Tolva")}
        allowDeselect={false}
        classNames={inputClasses}
        size="xs"
        radius="lg"
      />

      <TextInput
        label="Placa"
        placeholder="Ej. T3T-809"
        value={placa}
        onChange={(e) => {
          setPlaca(e.currentTarget.value.toUpperCase());
          if (error) setError(null);
        }}
        classNames={inputClasses}
        size="xs"
        radius="lg"
        data-autofocus={!registrandoMarca}
      />

      <Text size="xs" c="dimmed">
        El vehiculo quedara disponible inmediatamente para asignarlo a una
        carga. En el tipo Tolva se solicitara la segunda placa de la carga.
      </Text>

      <Group justify="flex-end" gap="sm" mt="xs">
        {onCancel && (
          <Button
            variant="default"
            size="xs"
            radius="lg"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
        )}
        <Button
          color="indigo"
          size="xs"
          radius="lg"
          onClick={handleSubmit}
          loading={loading}
          disabled={!placa.trim()}
        >
          Registrar vehiculo
        </Button>
      </Group>
    </Stack>
  );
};
