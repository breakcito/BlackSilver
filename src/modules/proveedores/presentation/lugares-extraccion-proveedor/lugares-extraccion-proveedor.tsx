import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  MultiSelect,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconCheck,
  IconExclamationCircle,
  IconPlus,
} from "@tabler/icons-react";

import { useNotify } from "../../../../hooks/useNotify";
import { AuxService } from "../../../../service/auxiliar.service";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import type { RES_LugarExtraccionCarbon } from "../../../../service/responses/lugar-extraccion-carbon";
import { ProveedoresService } from "../../service/proveedores.service";
import type {
  LugarExtraccionResponse,
  ProveedorResponse,
} from "../../service/proveedores.responses";
import { FormLugarExtraccion } from "../../../../presentation/utils/form-lugar-extraccion";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";

interface Props {
  proveedor: ProveedorResponse;
  onGuardados?: (lugares: LugarExtraccionResponse[]) => void;
}

/**
 * Gestion de lugares de extraccion de un proveedor.
 *
 * Patron: un Select `searchable` con el catalogo global de
 * `lugar_extraccion_carbon` como fuente. Cada option se renderiza en dos
 * lineas: arriba el path geografico (si existe), abajo la direccion.
 * Un boton "+" abre el modal de catalogo (FormLugarExtraccion) para agregar
 * un nuevo sitio sin salir del flujo.
 *
 * Al dar Guardar, persiste con setLugaresExtraccionPorProveedor (PUT, reemplaza
 * el set completo por ids del catalogo).
 */
export const LugaresExtraccionProveedor = ({
  proveedor,
  onGuardados,
}: Props) => {
  const { notifyError, notifySuccess } = useNotify();

  const [catalogo, setCatalogo] = useState<RES_LugarExtraccionCarbon[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);

  const [idsSeleccionados, setIdsSeleccionados] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalCatalogoAbierto, setModalCatalogoAbierto] = useState(false);
  const [search, setSearch] = useState("");

  // Carga inicial: catalogo global + lugares ya asociados al proveedor.
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingCatalogo(true);
      try {
        const [catalogoRes, lugaresRes] = await Promise.all([
          AuxService.get_lugar_extraccion_carbon_catalogo(),
          ProveedoresService.getLugaresExtraccionPorProveedor(
            proveedor.id_proveedor,
          ),
        ]);
        if (cancel) return;
        if (catalogoRes.success) {
          setCatalogo(catalogoRes.data ?? []);
        }
        if (lugaresRes.success && lugaresRes.data) {
          setIdsSeleccionados(
            lugaresRes.data.map((l) => l.id_lugar_extraccion),
          );
        }
      } catch (e) {
        console.error(e);
        notifyError("No se pudieron cargar los lugares de extraccion");
      } finally {
        if (!cancel) setLoadingCatalogo(false);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedor.id_proveedor]);

  const opcionesFiltradas = useMemo(() => {
    const q = search.trim();
    if (!q) return catalogo;
    return getCoincidencias(catalogo, q, {
      keys: ["direccion", "departamento_nombre", "provincia_nombre", "distrito_nombre"],
    }).map((r) => r.item);
  }, [catalogo, search]);

  const dataSelect = useMemo(
    () =>
      opcionesFiltradas.map((c) => ({
        value: String(c.id_lugar_extraccion),
        label: c.direccion,
        // Campos extra para renderOption
        departamento_nombre: c.departamento_nombre,
        provincia_nombre: c.provincia_nombre,
        distrito_nombre: c.distrito_nombre,
        direccion: c.direccion,
      })),
    [opcionesFiltradas],
  );

  const handleSelectChange = (values: string[]) => {
    setError(null);
    setIdsSeleccionados(values.map((v) => Number(v)).filter(Number.isFinite));
  };

  const handleGuardar = async () => {
    setSaving(true);
    setError(null);
    try {
      const resp = await ProveedoresService.setLugaresExtraccionPorProveedor(
        proveedor.id_proveedor,
        { lugares: idsSeleccionados },
      );
      if (resp.success) {
        notifySuccess(resp.message || "Lugares de extraccion actualizados");
        onGuardados?.(resp.data);
      } else {
        setError(resp.message || "No se pudieron guardar los lugares");
      }
    } catch (e) {
      console.error(e);
      setError("Error al guardar los lugares de extraccion");
    } finally {
      setSaving(false);
    }
  };

  const handleNuevoLugarCreado = (nuevo: RES_LugarExtraccionCarbon) => {
    setCatalogo((prev) => [...prev, nuevo]);
    setIdsSeleccionados((prev) =>
      prev.includes(nuevo.id_lugar_extraccion)
        ? prev
        : [...prev, nuevo.id_lugar_extraccion],
    );
    setModalCatalogoAbierto(false);
  };

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={600} className="text-zinc-200">
          {proveedor.razon_social}
        </Text>
        <Text size="xs" className="text-zinc-400">
          Selecciona las zonas de extraccion de donde este proveedor saca
          carbon. Cada lugar vive en el catalogo global.
        </Text>
      </div>

      <Group gap="xs" align="flex-end" wrap="nowrap">
        <div className="flex-1">
          <MultiSelect
            label="Lugares de extraccion"
            placeholder={
              loadingCatalogo
                ? "Cargando catalogo..."
                : "Selecciona uno o mas sitios"
            }
            radius="xl"
            searchable
            clearable
            data={dataSelect}
            value={idsSeleccionados.map(String)}
            onChange={handleSelectChange}
            searchValue={search}
            onSearchChange={setSearch}
            nothingFoundMessage="Sin coincidencias"
            disabled={loadingCatalogo && catalogo.length === 0}
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white placeholder:text-zinc-500",
              label: "text-zinc-300 mb-1 font-medium text-xs",
              pill: "bg-indigo-500/20 text-indigo-200",
            }}
            renderOption={({ option }) => {
              const o = option as unknown as {
                departamento_nombre?: string | null;
                provincia_nombre?: string | null;
                distrito_nombre?: string | null;
                direccion: string;
              };
              const geo = [
                o.departamento_nombre,
                o.provincia_nombre,
                o.distrito_nombre,
              ]
                .filter(Boolean)
                .join(" / ");
              return (
                <div className="flex flex-col py-1">
                  <Text size="xs" c="dimmed" className="leading-tight">
                    {geo || "—"}
                  </Text>
                  <Text size="sm" fw={500} className="text-zinc-100 leading-tight">
                    {o.direccion}
                  </Text>
                </div>
              );
            }}
          />
        </div>
        <Button
          leftSection={<IconPlus size={14} />}
          radius="xl"
          size="sm"
          variant="filled"
          color="indigo"
          onClick={() => setModalCatalogoAbierto(true)}
          className="font-semibold shadow-md shadow-indigo-900/30"
        >
          Nuevo
        </Button>
      </Group>

      {error && (
        <Alert
          icon={<IconExclamationCircle size={16} />}
          color="red"
          variant="light"
        >
          {error}
        </Alert>
      )}

      <Text size="xs" className="text-zinc-500">
        Actualmente {idsSeleccionados.length} lugar(es) seleccionado(s).
      </Text>

      <Group justify="flex-end" mt="sm">
        <Button
          leftSection={<IconCheck size={16} />}
          radius="xl"
          loading={saving}
          onClick={handleGuardar}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
        >
          Guardar lugares
        </Button>
      </Group>

      <ModalEstandar
        opened={modalCatalogoAbierto}
        close={() => setModalCatalogoAbierto(false)}
        title="Nuevo lugar de extraccion"
        size="lg"
      >
        <FormLugarExtraccion
          onSuccess={handleNuevoLugarCreado}
          onCancel={() => setModalCatalogoAbierto(false)}
        />
      </ModalEstandar>
    </Stack>
  );
};
