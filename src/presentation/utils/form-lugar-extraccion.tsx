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
import { AuxService } from "../../service/auxiliar.service";
import type {
  RES_Departamento,
  RES_Distrito,
  RES_Provincia,
} from "../../service/responses/ubicacion";
import type { RES_LugarExtraccionCarbon } from "../../service/responses/lugar-extraccion-carbon";
import { useNotify } from "../../hooks/useNotify";

export interface FormLugarExtraccionProps {
  onSuccess: (nuevo: RES_LugarExtraccionCarbon) => void;
  onCancel?: () => void;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all",
  label: "text-zinc-300 mb-1 font-medium text-xs",
};

/**
 * Formulario del CATALOGO de lugares de extraccion de carbon (global, sin
 * proveedor asociado). Direccion obligatoria; departamento/provincia/distrito
 * opcionales pero con busqueda tolerante (Fuse + FlexSearch via
 * getCoincidencias en el padre consumidor si fuera necesario).
 */
export const FormLugarExtraccion = ({
  onSuccess,
  onCancel,
}: FormLugarExtraccionProps) => {
  const { notifySuccess, notifyError } = useNotify();
  const [departamentos, setDepartamentos] = useState<RES_Departamento[]>([]);
  const [provincias, setProvincias] = useState<RES_Provincia[]>([]);
  const [distritos, setDistritos] = useState<RES_Distrito[]>([]);
  const [loadingUbigeo, setLoadingUbigeo] = useState(false);

  const [idDepartamento, setIdDepartamento] = useState<string | null>(null);
  const [idProvincia, setIdProvincia] = useState<string | null>(null);
  const [idDistrito, setIdDistrito] = useState<string | null>(null);
  const [direccion, setDireccion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Carga inicial: departamentos + todas las provincias + todos los distritos.
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
    () => direccion.trim().length >= 3,
    [direccion],
  );

  const onSubmit = async () => {
    setError(null);
    const dirTrim = direccion.trim();
    if (!dirTrim) {
      setError("La direccion es obligatoria");
      return;
    }

    setLoading(true);
    try {
      const res = await AuxService.crear_lugar_extraccion_carbon({
        id_departamento: idDepartamento ? Number(idDepartamento) : null,
        id_provincia: idProvincia ? Number(idProvincia) : null,
        id_distrito: idDistrito ? Number(idDistrito) : null,
        direccion: dirTrim,
      });

      if (res.success && res.data) {
        notifySuccess("Lugar de extraccion registrado correctamente");
        onSuccess(res.data);
      } else {
        const msg = res.message || "No se pudo registrar el lugar";
        setError(msg);
        notifyError(msg);
      }
    } catch (err) {
      console.error(err);
      const msg = "Error al registrar el lugar de extraccion";
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
            label="Direccion"
            placeholder="Ej. Av. Principal 123, zona industrial"
            withAsterisk
            radius="xl"
            value={direccion}
            onChange={(e) => {
              setDireccion(e.target.value);
              if (error) setError(null);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <Select
            label="Departamento (opc)"
            placeholder={loadingUbigeo ? "Cargando..." : "Seleccione"}
            radius="xl"
            clearable
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
            searchable
            classNames={inputClasses}
            nothingFoundMessage="Sin departamentos"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Provincia (opc)"
            placeholder={
              !idDepartamento
                ? "Seleccione un departamento"
                : loadingUbigeo
                  ? "Cargando..."
                  : "Seleccione"
            }
            radius="xl"
            clearable
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
            searchable
            classNames={inputClasses}
            nothingFoundMessage="Sin provincias"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Distrito (opc)"
            placeholder={
              !idProvincia
                ? "Seleccione una provincia"
                : loadingUbigeo
                  ? "Cargando..."
                  : "Seleccione"
            }
            radius="xl"
            clearable
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
            searchable
            classNames={inputClasses}
            nothingFoundMessage="Sin distritos"
          />
        </Grid.Col>
      </Grid>

      <Text size="xs" c="dimmed">
        El lugar se agrega al catalogo global y queda disponible para asociarlo
        a uno o varios proveedores desde el formulario del proveedor.
      </Text>

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
          Guardar Lugar
        </Button>
      </div>
    </Stack>
  );
};
