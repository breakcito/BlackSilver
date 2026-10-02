import { useState, useEffect } from "react";
import {
  TextInput,
  Button,
  Select,
  Switch,
  Grid,
  Alert,
  NumberInput,
  Loader,
  Group,
  ActionIcon,
} from "@mantine/core";
import { IconDeviceFloppy, IconExclamationCircle } from "@tabler/icons-react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { ModalEstandar } from "./modal-estandar";
import { FormCategoria } from "./form-categoria";
import { FormUnidadMedida } from "./form-unidad-medida";
import { AuxService } from "../../service/auxiliar.service";
import type { RES_Producto } from "../../service/responses/producto";
import type { RES_UnidadMedida } from "../../service/responses/unidad-medida";
import { useNotify } from "../../hooks/useNotify";
import type { RES_Categoria } from "../../service/responses/categoria";

export interface FormProductoProps {
  onSuccess: (producto: RES_Producto) => void;
  onCancel?: () => void;
}

export const FormProducto = ({ onSuccess, onCancel }: FormProductoProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const [loading, setLoading] = useState(false);
  const [loadingMaestros, setLoadingMaestros] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openedAddCat, setOpenedAddCat] = useState(false);
  const [openedAddUnidad, setOpenedAddUnidad] = useState(false);

  // Maestros
  const [categorias, setCategorias] = useState<RES_Categoria[]>([]);

  const fetchCategorias = async () => {
    try {
      const resCat = await AuxService.get_categorias();
      if (resCat.success) {
        setCategorias(resCat.data);
      }
    } catch (err) {
      console.error("Error al refrescar categorias", err);
    }
  };
  const [unidades, setUnidades] = useState<RES_UnidadMedida[]>([]);

  const fetchUnidades = async () => {
    try {
      const resUni = await AuxService.get_unidades_medida();
      if (resUni.success) {
        setUnidades(resUni.data);
      }
    } catch (err) {
      console.error("Error al refrescar unidades de medida", err);
    }
  };

  // Form Fields
  const [idCategoria, setIdCategoria] = useState<string | null>(null);
  const [idUnidadMedidaBase, setIdUnidadMedidaBase] = useState<string | null>(
    null,
  );
  const [nombre, setNombre] = useState("");
  const [prefijo, setPrefijo] = useState("");
  const [esAuditable, setEsAuditable] = useState(false);
  const [paraMantenimiento, setParaMantenimiento] = useState(false);
  const [esPerecible, setEsPerecible] = useState(false);

  // Condicionales por perecibilidad
  const [tiempoEsperaVencimiento, setTiempoEsperaVencimiento] = useState<
    number | string
  >("");
  const [periodoEsperaVencimiento, setPeriodoEsperaVencimiento] = useState<
    string | null
  >(null);

  // Opcionales
  const [stockMinimoBase, setStockMinimoBase] = useState<number | string>("");
  const [costoPromedioBase, setCostoPromedioBase] = useState<number | string>(
    "",
  );

  useEffect(() => {
    const fetchMaestros = async () => {
      try {
        setLoadingMaestros(true);
        await Promise.all([fetchCategorias(), fetchUnidades()]);
      } catch (err) {
        console.error(
          "Error al cargar maestros para el formulario de producto",
          err,
        );
        setError("Error al cargar categorías y unidades de medida.");
      } finally {
        setLoadingMaestros(false);
      }
    };
    fetchMaestros();
  }, []);

  const validate = () => {
    if (!idCategoria) return "La categoría es requerida";
    if (!idUnidadMedidaBase) return "La unidad de medida es requerida";
    if (!nombre.trim()) return "El nombre es requerido";
    if (nombre.trim().length < 3) return "El nombre del producto es muy corto";
    if (prefijo && prefijo.length > 100)
      return "El prefijo no puede tener más de 100 caracteres";
    if (esPerecible) {
      if (!tiempoEsperaVencimiento || Number(tiempoEsperaVencimiento) <= 0) {
        return "Debe indicar un tiempo de espera válido para productos perecibles";
      }
      if (!periodoEsperaVencimiento) {
        return "Debe seleccionar un periodo de espera para productos perecibles";
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await AuxService.crear_producto({
        id_categoria: Number(idCategoria),
        id_unidad_medida_base: Number(idUnidadMedidaBase),
        nombre: nombre.trim(),
        prefijo: prefijo.trim() || undefined,
        es_auditable: esAuditable,
        es_perecible: esPerecible,
        para_mantenimiento: paraMantenimiento,
        stock_minimo_base:
          stockMinimoBase !== "" ? Number(stockMinimoBase) : undefined,
        costo_promedio_base:
          costoPromedioBase !== "" ? Number(costoPromedioBase) : undefined,
        tiempo_espera_vencimiento:
          esPerecible && tiempoEsperaVencimiento !== ""
            ? Number(tiempoEsperaVencimiento)
            : undefined,
        periodo_espera_vencimiento:
          esPerecible && periodoEsperaVencimiento
            ? periodoEsperaVencimiento
            : undefined,
      });

      if (res.success && res.data) {
        notifySuccess("Producto registrado correctamente");
        onSuccess(res.data);
      } else {
        setError(res.message || "Error al registrar producto");
        notifyError(res.message || "Error al registrar producto");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red al registrar producto");
      notifyError("Error de red al registrar producto");
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
    label: "text-zinc-400 font-medium text-xs mb-1",
  };

  if (loadingMaestros) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" color="indigo" />
        <span className="text-zinc-400 text-xs font-medium">
          Cargando categorías y unidades...
        </span>
      </Group>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <Alert
          icon={<IconExclamationCircle size={16} />}
          color="red"
          variant="filled"
        >
          {error}
        </Alert>
      )}

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <div className="flex gap-2 items-end">
            <Select
              label="Categoría"
              placeholder="Seleccione"
              searchable
              withAsterisk
              radius="xl"
              data={categorias.map((c) => ({
                value: String(c.id_categoria),
                label: c.nombre,
              }))}
              value={idCategoria}
              onChange={(val) => {
                setIdCategoria(val);
                if (error) setError(null);
              }}
              classNames={inputClasses}
              className="flex-1"
            />
            <ActionIcon
              size={"lg"}
              radius="xl"
              variant="filled"
              color="indigo"
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors mb-px h-9.5 w-9.5"
              onClick={() => setOpenedAddCat(true)}
            >
              <PlusIcon className="w-5 h-5 text-white" />
            </ActionIcon>
          </div>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <div className="flex gap-2 items-end">
            <Select
              label="Unidad de Medida Base"
              placeholder="Seleccione"
              searchable
              withAsterisk
              radius="xl"
              data={unidades.map((u) => ({
                value: String(u.id_unidad_medida),
                label: `${u.nombre} (${u.abreviatura})`,
              }))}
              value={idUnidadMedidaBase}
              onChange={(val) => {
                setIdUnidadMedidaBase(val);
                if (error) setError(null);
              }}
              classNames={inputClasses}
              className="flex-1"
            />
            <ActionIcon
              size={"lg"}
              radius="xl"
              variant="filled"
              color="indigo"
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors mb-px h-9.5 w-9.5"
              onClick={() => setOpenedAddUnidad(true)}
            >
              <PlusIcon className="w-5 h-5 text-white" />
            </ActionIcon>
          </div>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <TextInput
            label="Nombre del Producto"
            placeholder="Ej. Grasa Multipropósito NLGI 2"
            radius="xl"
            withAsterisk
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <TextInput
            label="Prefijo (opc)"
            placeholder="Ej. GRA"
            radius="xl"
            maxLength={100}
            value={prefijo}
            onChange={(e) => {
              setPrefijo(
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              );
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <NumberInput
            label="Stock Mínimo Base (opc)"
            placeholder="0"
            radius="xl"
            min={0}
            decimalScale={2}
            allowNegative={false}
            value={stockMinimoBase}
            onChange={(val) => setStockMinimoBase(val)}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <NumberInput
            label="Costo Promedio Inicial (opc)"
            placeholder="0.00"
            radius="xl"
            min={0}
            decimalScale={4}
            allowNegative={false}
            value={costoPromedioBase}
            onChange={(val) => setCostoPromedioBase(val)}
            classNames={inputClasses}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12 }}>
          <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-300 font-medium text-sm">
                ¿Es perecible?
              </span>
              <span className="text-zinc-500 text-xs">
                Activar si el producto tiene fecha de caducidad.
              </span>
            </div>
            <Switch
              checked={esPerecible}
              onChange={(e) => {
                setEsPerecible(e.currentTarget.checked);
                if (!e.currentTarget.checked) {
                  setTiempoEsperaVencimiento("");
                  setPeriodoEsperaVencimiento(null);
                }
                if (error) setError(null);
              }}
              color="indigo"
              size="md"
              className="cursor-pointer"
            />
          </div>
        </Grid.Col>

        {esPerecible && (
          <>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Tiempo de Alerta Vencimiento"
                placeholder="Ej. 3"
                withAsterisk
                radius="xl"
                min={1}
                allowDecimal={false}
                allowNegative={false}
                value={tiempoEsperaVencimiento}
                onChange={(val) => {
                  setTiempoEsperaVencimiento(val);
                  if (error) setError(null);
                }}
                classNames={inputClasses}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Periodo de Alerta"
                placeholder="Seleccione"
                withAsterisk
                radius="xl"
                data={[
                  { value: "diario", label: "Día(s)" },
                  { value: "semanal", label: "Semana(s)" },
                  { value: "mensual", label: "Mes(es)" },
                  { value: "anual", label: "Año(s)" },
                ]}
                value={periodoEsperaVencimiento}
                onChange={(val) => {
                  setPeriodoEsperaVencimiento(val);
                  if (error) setError(null);
                }}
                classNames={inputClasses}
              />
            </Grid.Col>
          </>
        )}

        <Grid.Col span={{ base: 12, md: 6 }}>
          <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-300 font-medium text-sm">
                ¿Es auditable?
              </span>
              <span className="text-zinc-500 text-xs">
                Indica si se somete a inventarios rutinarios.
              </span>
            </div>
            <Switch
              checked={esAuditable}
              onChange={(e) => setEsAuditable(e.currentTarget.checked)}
              color="indigo"
              size="md"
              className="cursor-pointer"
            />
          </div>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-300 font-medium text-sm">
                ¿Es para mantenimiento?
              </span>
              <span className="text-zinc-500 text-xs">
                Indica si se usa en trabajos de mantenimiento.
              </span>
            </div>
            <Switch
              checked={paraMantenimiento}
              onChange={(e) => setParaMantenimiento(e.currentTarget.checked)}
              color="indigo"
              size="md"
              className="cursor-pointer"
            />
          </div>
        </Grid.Col>
      </Grid>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
        {onCancel && (
          <Button
            variant="subtle"
            color="gray"
            radius="xl"
            onClick={onCancel}
            classNames={{ root: "text-zinc-400 hover:bg-zinc-800" }}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          loading={loading}
          radius="xl"
          leftSection={<IconDeviceFloppy size={18} />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
        >
          Guardar Producto
        </Button>
      </div>

      <ModalEstandar
        opened={openedAddCat}
        close={() => setOpenedAddCat(false)}
        title="Nueva Categoría"
        size="md"
        validateClose
        zIndex={1001}
      >
        <FormCategoria
          onSuccess={async (nuevaCat) => {
            setOpenedAddCat(false);
            await fetchCategorias();
            setIdCategoria(String(nuevaCat.id_categoria));
          }}
          onCancel={() => setOpenedAddCat(false)}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={openedAddUnidad}
        close={() => setOpenedAddUnidad(false)}
        title="Nueva Unidad de Medida"
        size="sm"
        zIndex={1001}
        validateClose
      >
        <FormUnidadMedida
          onSuccess={async (nuevaUnidad) => {
            setOpenedAddUnidad(false);
            await fetchUnidades();
            setIdUnidadMedidaBase(String(nuevaUnidad.id_unidad_medida));
          }}
          onCancel={() => setOpenedAddUnidad(false)}
        />
      </ModalEstandar>
    </form>
  );
};
