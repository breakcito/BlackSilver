import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Grid,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy, IconExclamationCircle } from "@tabler/icons-react";
import type { z } from "zod";
import type {
  RES_Departamento,
  RES_Distrito,
  RES_Provincia,
} from "../../service/responses/ubicacion";
import { AuxService } from "../../service/auxiliar.service";

/**
 * Datos iniciales para modo edicion. Si NO se pasa, el form abre en modo
 * crear. El id del padre (id_proveedor / id_cliente) NO es parte del
 * payload: lo resuelve el caller.
 */
export interface FormAlmacenCarbonInitial {
  id_departamento?: number | null;
  id_provincia?: number | null;
  id_distrito?: number | null;
  direccion: string;
}

/**
 * Tipo del payload que el form emite. Garantiza que `direccion` es string
 * obligatorio y que los ids de ubigeo son `number | null | undefined`.
 * Cada modulo (proveedores / clientes) pasa su propio schema concreto
 * con el tipo del payload.
 */
export type FormAlmacenCarbonPayload = {
  id_departamento?: number | null;
  id_provincia?: number | null;
  id_distrito?: number | null;
  direccion: string;
};

export interface FormAlmacenCarbonProps<T extends FormAlmacenCarbonPayload> {
  initialData?: FormAlmacenCarbonInitial;
  /**
   * Schema Zod que valida el payload antes de emitir `onSave`. Cada modulo
   * pasa su schema concreto (Schema_AlmacenCarbon para proveedores,
   * Schema_AlmacenCarbonCliente para clientes) — la forma es la misma,
   * se mantiene separada para preservar la autodocumentacion del modulo.
   */
  schema: z.ZodType<T>;
  onSave: (payload: T) => void;
  onCancel?: () => void;
  /**
   * Bandera externa de "guardando". Mientras es `true`, el boton principal
   * muestra el spinner de Mantine y queda disabled para evitar doble
   * submit. El caller (standalone modal) controla este estado cuando
   * hace la llamada al backend; en el flujo inline (registro) queda en
   * `false` porque no hay request en curso.
   */
  loading?: boolean;
  /**
   * Texto de ayuda debajo del formulario. Personaliza el recordatorio
   * segun el modulo donde se usa (proveedor / cliente).
   */
  helpText?: string;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all",
  label: "text-zinc-300 mb-1 font-medium text-xs",
};

/**
 * Form de un almacen de carbon (modulo carbon).
 *
 * Solo emite el payload validado por `onSave` — no hace la llamada al
 * backend. Eso permite reusarlo en dos contextos:
 *   - Inline en `RegistroProveedorCarbon` / `RegistroClienteCarbon`: el
 *     caller guarda los datos en estado local (aun no existe el id del
 *     padre).
 *   - Standalone en el modal del list view: el caller llama al service
 *     correspondiente.
 *
 * Se parametriza con un schema Zod generico para que cada modulo
 * (proveedores / clientes) aporte su schema concreto y mantenga la
 * autodocumentacion, sin duplicar 300 lineas de UI.
 */
export const FormAlmacenCarbon = <T extends FormAlmacenCarbonPayload>({
  initialData,
  schema,
  onSave,
  onCancel,
  loading = false,
  helpText,
}: FormAlmacenCarbonProps<T>) => {
  const [departamentos, setDepartamentos] = useState<RES_Departamento[]>([]);
  const [provincias, setProvincias] = useState<RES_Provincia[]>([]);
  const [distritos, setDistritos] = useState<RES_Distrito[]>([]);
  const [loadingUbigeo, setLoadingUbigeo] = useState(false);

  const [idDepartamento, setIdDepartamento] = useState<string | null>(
    initialData?.id_departamento ? String(initialData.id_departamento) : null,
  );
  const [idProvincia, setIdProvincia] = useState<string | null>(
    initialData?.id_provincia ? String(initialData.id_provincia) : null,
  );
  const [idDistrito, setIdDistrito] = useState<string | null>(
    initialData?.id_distrito ? String(initialData.id_distrito) : null,
  );
  const [direccion, setDireccion] = useState(initialData?.direccion ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingUbigeo(true);
      try {
        const [dptos, provs, dists] = await Promise.all([
          AuxService.get_departamentos(),
          AuxService.get_provincias(),
          AuxService.get_distritos(),
        ]);
        if (cancel) return;
        if (dptos.success && Array.isArray(dptos.data)) {
          setDepartamentos(dptos.data);
        }
        if (provs.success && Array.isArray(provs.data)) {
          setProvincias(provs.data);
        }
        if (dists.success && Array.isArray(dists.data)) {
          setDistritos(dists.data);
        }
      } catch (e) {
        console.error("No se pudo cargar el ubigeo", e);
      } finally {
        if (!cancel) setLoadingUbigeo(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const provinciasFiltradas = useMemo(
    () =>
      idDepartamento
        ? provincias.filter((p) => p.id_departamento === Number(idDepartamento))
        : provincias,
    [provincias, idDepartamento],
  );

  const distritosFiltrados = useMemo(
    () =>
      idProvincia
        ? distritos.filter((d) => d.id_provincia === Number(idProvincia))
        : distritos,
    [distritos, idProvincia],
  );

  const submitValido = useMemo(
    () => direccion.trim().length >= 1,
    [direccion],
  );

  const onSubmit = () => {
    setError(null);
    const payload: FormAlmacenCarbonPayload = {
      id_departamento: idDepartamento ? Number(idDepartamento) : null,
      id_provincia: idProvincia ? Number(idProvincia) : null,
      id_distrito: idDistrito ? Number(idDistrito) : null,
      direccion: direccion.trim(),
    };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos invalidos";
      setError(msg);
      return;
    }
    onSave(parsed.data as T);
  };

  return (
    <Stack gap="md">
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
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label="Dirección"
            placeholder="Ej. Av. Principal 123, zona industrial"
            withAsterisk
            radius="xl"
            maxLength={256}
            value={direccion}
            onChange={(e) => {
              setDireccion(e.currentTarget.value);
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <Select
            label="Departamento (opcional)"
            placeholder={loadingUbigeo ? "Cargando..." : "Seleccione"}
            radius="xl"
            clearable
            searchable
            comboboxProps={{ withinPortal: true }}
            data={departamentos.map((d) => ({
              value: String(d.id),
              label: d.nombre,
            }))}
            value={idDepartamento}
            onChange={(v) => {
              setIdDepartamento(v);
              setIdProvincia(null);
              setIdDistrito(null);
              if (error) setError(null);
            }}
            classNames={inputClasses}
            nothingFoundMessage="Sin departamentos"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Provincia (opcional)"
            placeholder={
              !idDepartamento
                ? "Seleccione un departamento"
                : loadingUbigeo
                  ? "Cargando..."
                  : "Seleccione"
            }
            radius="xl"
            clearable
            searchable
            comboboxProps={{ withinPortal: true }}
            data={provinciasFiltradas.map((p) => ({
              value: String(p.id),
              label: p.nombre,
            }))}
            value={idProvincia}
            onChange={(v) => {
              setIdProvincia(v);
              setIdDistrito(null);
              if (error) setError(null);
            }}
            disabled={!idDepartamento}
            classNames={inputClasses}
            nothingFoundMessage="Sin provincias"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Distrito (opcional)"
            placeholder={
              !idProvincia
                ? "Seleccione una provincia"
                : loadingUbigeo
                  ? "Cargando..."
                  : "Seleccione"
            }
            radius="xl"
            clearable
            searchable
            comboboxProps={{ withinPortal: true }}
            data={distritosFiltrados.map((d) => ({
              value: String(d.id),
              label: d.nombre,
            }))}
            value={idDistrito}
            onChange={(v) => {
              setIdDistrito(v);
              if (error) setError(null);
            }}
            disabled={!idProvincia}
            classNames={inputClasses}
            nothingFoundMessage="Sin distritos"
          />
        </Grid.Col>
      </Grid>

      {initialData && helpText && (
        <Text size="xs" c="dimmed">
          {helpText}
        </Text>
      )}

      <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-zinc-800">
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
          onClick={onSubmit}
          loading={loading}
          disabled={!submitValido || loading}
          radius="xl"
          leftSection={<IconDeviceFloppy size={18} />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
        >
          {initialData ? "Actualizar Almacén" : "Añadir Almacén"}
        </Button>
      </div>
    </Stack>
  );
};