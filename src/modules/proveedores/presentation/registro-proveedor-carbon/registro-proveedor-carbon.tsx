import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Grid,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconBuildingWarehouse,
  IconDeviceFloppy,
  IconExclamationCircle,
  IconPencil,
  IconTrash,
  IconUser,
  IconPlus,
} from "@tabler/icons-react";

import { useRegistroProveedorCarbon } from "../../hooks/useRegistroProveedorCarbon";
import type {
  AlmacenCarbonTemporal,
  LugarExtraccionTemporal,
} from "../../hooks/useRegistroProveedorCarbon";
import { TipoEntidad } from "../../../../shared/enums/_generic/tipo-entidad";
import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import {
  ModalPersonalExterno,
  type PersonalLocal,
} from "../../../../presentation/utils/modal-personal-externo";
import { FormLugarExtraccion } from "../../../../presentation/utils/form-lugar-extraccion";
import { FormAlmacenCarbon } from "../../../../presentation/utils/form-almacen-carbon";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { MultiFilePicker } from "../../../../presentation/utils/archivo/multifile-picker";
import type { RES_LugarExtraccionCarbon } from "../../../../service/responses/lugar-extraccion-carbon";
import type { ProveedorResponse } from "../../service/proveedores.responses";
import { AuxService } from "../../../../service/auxiliar.service";
import { TipoCarbonService } from "../../../tipo-carbon/service/tipo-carbon.service";
import type { RES_TipoCarbon } from "../../../tipo-carbon/service/tipo-carbon.responses";
import { useUbicacionCompleta } from "../../../../hooks/useUbicacionCompleta";

interface Props {
  onCancel: () => void;
  onSuccess: (p: ProveedorResponse) => void;
}

const fieldClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
  label: "text-zinc-400 font-medium text-xs",
};

const selectClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
  label: "text-zinc-400 font-medium text-xs",
};

export const RegistroProveedorCarbon = ({ onCancel, onSuccess }: Props) => {
  const {
    payload,
    personal,
    tiposCarbon,
    lugaresExtraccion,
    setLugaresExtraccion,
    almacenesCarbon,
    addAlmacenCarbon,
    removeAlmacenCarbon,
    updateAlmacenCarbon,
    contratosNuevos,
    setContratosFiles,
    loading,
    error,
    handleChange,
    handleSelectChange,
    addpersonal,
    removepersonal,
    setTiposCarbonSeleccionados,
    submit,
  } = useRegistroProveedorCarbon((p) => onSuccess(p));

  const [openRepresentante, setOpenRepresentante] = useState(false);
  const [modalNuevoLugarAbierto, setModalNuevoLugarAbierto] = useState(false);
  const [modalAlmacenAbierto, setModalAlmacenAbierto] = useState(false);
  const [almacenEnEdicionTempId, setAlmacenEnEdicionTempId] = useState<
    string | null
  >(null);

  const [todosTipos, setTodosTipos] = useState<RES_TipoCarbon[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [searchTipo, setSearchTipo] = useState("");

  // Catalogo GLOBAL de lugares de extraccion + busqueda del MultiSelect.
  const [catalogoLugares, setCatalogoLugares] = useState<
    RES_LugarExtraccionCarbon[]
  >([]);
  const [loadingLugares, setLoadingLugares] = useState(false);
  const [searchLugar, setSearchLugar] = useState("");

  // Ubigeo completo para resolver nombres de los almacenes que el usuario
  // agrega antes de guardar el proveedor (aun no tienen id_proveedor ni
  // hidratacion desde el backend, solo lo que el usuario tipeo).
  const { departamentos, provincias, distritos } = useUbicacionCompleta();

  // Carga unica al montar: tipos de carbon + catalogo global de lugares.
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingTipos(true);
      setLoadingLugares(true);
      const [tiposRes, lugaresRes] = await Promise.all([
        TipoCarbonService.getTipos({ para_compra: true }),
        AuxService.get_lugar_extraccion_carbon_catalogo(),
      ]);
      if (cancel) return;
      if (tiposRes.success) setTodosTipos(tiposRes.data);
      if (lugaresRes.success) {
        setCatalogoLugares(lugaresRes.data ?? []);
      }
      setLoadingTipos(false);
      setLoadingLugares(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const tiposData = useMemo(
    () =>
      todosTipos.map((t) => ({
        value: String(t.id_tipo_carbon),
        label: t.codigo ? `${t.nombre} (${t.codigo})` : t.nombre,
      })),
    [todosTipos],
  );

  const tiposFiltrados = useMemo(() => {
    const q = searchTipo.trim();
    if (!q) return tiposData;
    return getCoincidencias(todosTipos, q, {
      keys: ["nombre", "codigo"],
    }).map((r) => ({
      value: String(r.item.id_tipo_carbon),
      label: r.item.codigo ? `${r.item.nombre} (${r.item.codigo})` : r.item.nombre,
    }));
  }, [tiposData, todosTipos, searchTipo]);

  const lugaresFiltrados = useMemo(() => {
    const q = searchLugar.trim();
    if (!q) {
      return catalogoLugares.map((c) => ({
        value: String(c.id_lugar_extraccion),
        label: c.direccion,
        departamento_nombre: c.departamento_nombre,
        provincia_nombre: c.provincia_nombre,
        distrito_nombre: c.distrito_nombre,
        direccion: c.direccion,
      }));
    }
    return getCoincidencias(catalogoLugares, q, {
      keys: ["direccion", "departamento_nombre", "provincia_nombre", "distrito_nombre"],
    }).map((r) => ({
      value: String(r.item.id_lugar_extraccion),
      label: r.item.direccion,
      departamento_nombre: r.item.departamento_nombre,
      provincia_nombre: r.item.provincia_nombre,
      distrito_nombre: r.item.distrito_nombre,
      direccion: r.item.direccion,
    }));
  }, [catalogoLugares, searchLugar]);

  const handleRepresentanteCreado = (p: PersonalLocal) => {
    addpersonal(p);
  };

  const handleTiposChange = (values: string[]) => {
    const ids = values.map((v) => Number(v));
    setTiposCarbonSeleccionados(ids, todosTipos);
  };

  const handleLugaresChange = (values: string[]) => {
    const nuevos: LugarExtraccionTemporal[] = [];
    for (const v of values) {
      const id = Number(v);
      if (!Number.isFinite(id)) continue;
      const c = catalogoLugares.find((x) => x.id_lugar_extraccion === id);
      if (!c) continue;
      nuevos.push({
        id_lugar_extraccion_carbon: c.id_lugar_extraccion,
        id_departamento: c.id_departamento,
        departamento_nombre: c.departamento_nombre,
        id_provincia: c.id_provincia,
        provincia_nombre: c.provincia_nombre,
        id_distrito: c.id_distrito,
        distrito_nombre: c.distrito_nombre,
        direccion: c.direccion,
      });
    }
    // Reemplaza el set completo (set semantico del PUT).
    setLugaresExtraccion(nuevos);
  };

  const handleNuevoLugarCreado = (nuevo: RES_LugarExtraccionCarbon) => {
    setCatalogoLugares((prev: RES_LugarExtraccionCarbon[]) => [...prev, nuevo]);
    setLugaresExtraccion((prev: LugarExtraccionTemporal[]) =>
      prev.some((x: LugarExtraccionTemporal) => x.id_lugar_extraccion_carbon === nuevo.id_lugar_extraccion)
        ? prev
        : [
            ...prev,
            {
              id_lugar_extraccion_carbon: nuevo.id_lugar_extraccion,
              id_departamento: nuevo.id_departamento,
              departamento_nombre: nuevo.departamento_nombre,
              id_provincia: nuevo.id_provincia,
              provincia_nombre: nuevo.provincia_nombre,
              id_distrito: nuevo.id_distrito,
              distrito_nombre: nuevo.distrito_nombre,
              direccion: nuevo.direccion,
            },
          ],
    );
    setModalNuevoLugarAbierto(false);
  };

  // Helpers de ubigeo: resuelven id -> nombre para mostrar el path geografico
  // del almacen dentro del card de la lista local.
  const nombreUbigeo = (
    idDpto: number | null | undefined,
    idProv: number | null | undefined,
    idDist: number | null | undefined,
  ): string => {
    const parts: string[] = [];
    if (idDpto) {
      parts.push(departamentos.find((d) => d.id === idDpto)?.nombre ?? "");
    }
    if (idProv) {
      parts.push(provincias.find((p) => p.id === idProv)?.nombre ?? "");
    }
    if (idDist) {
      parts.push(distritos.find((d) => d.id === idDist)?.nombre ?? "");
    }
    return parts.filter(Boolean).join(" / ");
  };

  const abrirNuevoAlmacen = () => {
    setAlmacenEnEdicionTempId(null);
    setModalAlmacenAbierto(true);
  };

  const abrirEdicionAlmacen = (tempId: string) => {
    setAlmacenEnEdicionTempId(tempId);
    setModalAlmacenAbierto(true);
  };

  const cerrarModalAlmacen = () => {
    setModalAlmacenAbierto(false);
    setAlmacenEnEdicionTempId(null);
  };

  const handleAlmacenGuardado = (
    payload: import("../../service/proveedores.requests").CrearAlmacenCarbonRequest,
  ) => {
    if (almacenEnEdicionTempId === null) {
      addAlmacenCarbon(payload);
    } else {
      updateAlmacenCarbon(almacenEnEdicionTempId, payload);
    }
    cerrarModalAlmacen();
  };

  const almacenEnEdicion: AlmacenCarbonTemporal | null =
    almacenEnEdicionTempId === null
      ? null
      : almacenesCarbon.find((a) => a.tempId === almacenEnEdicionTempId) ?? null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
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
          <Select
            label="Tipo de Entidad"
            placeholder="Seleccione"
            searchable
            withAsterisk
            radius="xl"
            data={Object.values(TipoEntidad)}
            value={payload.tipo_entidad}
            onChange={handleSelectChange}
            classNames={selectClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="RUC (opc)"
            placeholder={
              payload.tipo_entidad === TipoEntidad.Natural
                ? "10xxxxxxxxx (persona natural)"
                : "20xxxxxxxxx (persona jurídica)"
            }
            radius="xl"
            maxLength={11}
            value={payload.ruc || ""}
            onChange={(e) => {
              const val = e.currentTarget.value.replace(/\D/g, "");
              handleChange("ruc", val);
            }}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="DNI (opc)"
            placeholder="12345678"
            radius="xl"
            maxLength={8}
            value={payload.dni || ""}
            onChange={(e) => {
              const val = e.currentTarget.value.replace(/\D/g, "");
              handleChange("dni", val);
            }}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label={
              payload.tipo_entidad === TipoEntidad.Natural
                ? "Nombre Completo"
                : "Razón Social"
            }
            placeholder={
              payload.tipo_entidad === TipoEntidad.Natural
                ? "Ej. Juan Perez"
                : "Ej. Comercializadora XYZ S.A.C."
            }
            radius="xl"
            withAsterisk
            value={payload.razon_social || ""}
            onChange={(e) => handleChange("razon_social", e.currentTarget.value)}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label="Dirección Principal (opc)"
            placeholder="Ej. Av. Principal 123, Ciudad"
            radius="xl"
            value={payload.direccion || ""}
            onChange={(e) => handleChange("direccion", e.currentTarget.value)}
            classNames={fieldClasses}
          />
        </Grid.Col>
      </Grid>

      {/* Telefono y correo */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Teléfono (opc)"
            placeholder="Ej. 987654321"
            radius="xl"
            value={payload.telefono || ""}
            onChange={(e) => {
              const val = e.currentTarget.value.replace(/\D/g, "");
              handleChange("telefono", val);
            }}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Correo Electrónico (opc)"
            placeholder="Ej. contacto@empresa.com"
            radius="xl"
            value={payload.correo || ""}
            onChange={(e) => handleChange("correo", e.currentTarget.value)}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <TextInput
            label="Codigo REINFO (opcional)"
            placeholder="Ej. REINFO-XXXX-YYYY"
            radius="xl"
            size="xs"
            maxLength={64}
            value={payload.codigo_reinfo ?? ""}
            onChange={(e) =>
              handleChange(
                "codigo_reinfo",
                e.currentTarget.value.toUpperCase(),
              )
            }
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 text-white uppercase placeholder:text-zinc-500 placeholder:normal-case focus:border-zinc-300 transition-all",
              label: "text-zinc-400 font-medium text-xs",
            }}
          />
        </Grid.Col>
      </Grid>

      <MultiFilePicker
        label="Archivos del contrato (opcional)"
        description="PDF, JPG, PNG, etc. Se subiran al guardar."
        files={contratosNuevos}
        onFilesChange={setContratosFiles}
      />

      {/* Tipos de Carbon (opcional) */}
      <div className="flex flex-col gap-3">
        <div>
          <Text size="sm" fw={600} className="text-zinc-300">
            Tipos de Carbón que ofrece
          </Text>
          <Text size="xs" className="text-zinc-500">
            Selecciona los tipos que este proveedor puede suministrar.
          </Text>
        </div>

        <MultiSelect
          label="Tipos de carbón"
          placeholder={
            loadingTipos
              ? "Cargando tipos..."
              : "Selecciona uno o varios tipos"
          }
          radius="xl"
          searchable
          clearable
          data={tiposFiltrados}
          value={tiposCarbon.map((t) => String(t.id_tipo_carbon))}
          onChange={handleTiposChange}
          searchValue={searchTipo}
          onSearchChange={setSearchTipo}
          nothingFoundMessage="Sin tipos disponibles"
          disabled={loadingTipos && todosTipos.length === 0}
          classNames={{
            input:
              "bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white placeholder:text-zinc-500",
            label: "text-zinc-300 mb-1 font-medium text-xs",
            pill: "bg-indigo-500/20 text-indigo-200",
          }}
        />
      </div>

      {/* Lugares de Extraccion */}
      <div className="flex flex-col gap-3">
        <div>
          <Text size="sm" fw={600} className="text-zinc-300">
            Lugares de extracción
          </Text>
          <Text size="xs" className="text-zinc-500">
            Selecciona los sitios de donde este proveedor extrae carbón. Usa el botón "+" para agregar uno
            nuevo.
          </Text>
        </div>

        <Group gap="xs" align="flex-end" wrap="nowrap">
          <div className="flex-1">
            <MultiSelect
              label="Lugares de extracción"
              placeholder={
                loadingLugares
                  ? "Cargando catálogo..."
                  : "Selecciona uno o más sitios"
              }
              radius="xl"
              searchable
              clearable
              data={lugaresFiltrados}
              value={lugaresExtraccion.map((l) =>
                String(l.id_lugar_extraccion_carbon),
              )}
              onChange={handleLugaresChange}
              searchValue={searchLugar}
              onSearchChange={setSearchLugar}
              nothingFoundMessage="Sin coincidencias"
              disabled={loadingLugares && catalogoLugares.length === 0}
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
                    <Text
                      size="sm"
                      fw={500}
                      className="text-zinc-100 leading-tight"
                    >
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
            onClick={() => setModalNuevoLugarAbierto(true)}
            className="font-semibold shadow-md shadow-indigo-900/30"
          >
            Nuevo
          </Button>
        </Group>

        <Text size="xs" className="text-zinc-500">
          {lugaresExtraccion.length} lugar(es) seleccionado(s).
        </Text>
      </div>

      {/* Almacenes de Carbon */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <Text size="sm" fw={600} className="text-zinc-300">
              Almacenes de Carbón
            </Text>
            <Text size="xs" className="text-zinc-500">
              Añadir almacenes del proveedor
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={14} />}
            radius="xl"
            size="xs"
            variant="filled"
            color="teal"
            onClick={abrirNuevoAlmacen}
            className="font-semibold shadow-md shadow-teal-900/30"
          >
            Añadir almacén
          </Button>
        </div>

        {almacenesCarbon.length === 0 ? (
          <div className="text-zinc-500 text-xs italic px-3 py-2 border border-dashed border-zinc-800 rounded-lg">
            Sin almacenes. Si el proveedor no tiene almacenes, puedes dejar
            esta sección vacía y agregarlos después desde la lista.
          </div>
        ) : (
          <Stack gap="xs">
            {almacenesCarbon.map((a) => {
              const geo = nombreUbigeo(
                a.id_departamento ?? null,
                a.id_provincia ?? null,
                a.id_distrito ?? null,
              );
              return (
                <div
                  key={a.tempId}
                  className="flex items-center justify-between gap-3 p-3 bg-linear-to-r from-zinc-900/60 to-zinc-900/30 border border-zinc-800 rounded-xl hover:border-teal-700/60 transition-colors"
                >
                  <Group gap="sm" wrap="nowrap">
                    <Badge
                      variant="filled"
                      color="teal"
                      radius="xl"
                      size="lg"
                      className="shrink-0"
                    >
                      <IconBuildingWarehouse size={14} stroke={1.8} />
                    </Badge>
                    <div className="flex flex-col min-w-0">
                      <Text size="xs" c="dimmed" className="leading-tight">
                        {geo || "—"}
                      </Text>
                      <Text
                        size="sm"
                        fw={500}
                        className="text-zinc-100 leading-tight truncate"
                      >
                        {a.direccion}
                      </Text>
                    </div>
                  </Group>
                  <Group gap={4} className="shrink-0">
                    <Button
                      variant="subtle"
                      color="indigo"
                      size="xs"
                      radius="xl"
                      leftSection={<IconPencil size={14} />}
                      onClick={() => abrirEdicionAlmacen(a.tempId)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      radius="xl"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => removeAlmacenCarbon(a.tempId)}
                    >
                      Quitar
                    </Button>
                  </Group>
                </div>
              );
            })}
          </Stack>
        )}

        <Text size="xs" className="text-zinc-500">
          {almacenesCarbon.length} almacén(es) agregado(s) — se guardarán al
          confirmar el proveedor.
        </Text>
      </div>

      {/* personal (opcional, antes de guardar) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Text size="sm" fw={600} className="text-zinc-300">
            Personal/Contactos
          </Text>
          <Button
            leftSection={<IconUser size={14} />}
            radius="xl"
            size="xs"
            variant="filled"
            color="pink"
            onClick={() => setOpenRepresentante(true)}
            className="font-semibold shadow-md shadow-pink-900/30"
          >
            Añadir representante
          </Button>
        </div>

        {personal.length === 0 ? (
          <div className="text-zinc-500 text-xs italic px-3 py-2 border border-dashed border-zinc-800 rounded-lg">
            Sin personal.
          </div>
        ) : (
          <Stack gap="xs">
            {personal.map((r, idx) => (
              <div
                key={`${r.nombre}-${idx}`}
                className="flex items-center justify-between gap-3 p-3 bg-linear-to-r from-zinc-900/60 to-zinc-900/30 border border-zinc-800 rounded-xl hover:border-indigo-700/60 transition-colors"
              >
                <Group gap="sm" wrap="nowrap">
                  <Badge
                    variant="filled"
                    color="pink"
                    radius="xl"
                    size="lg"
                    className="shrink-0"
                  >
                    <IconUser size={14} stroke={1.8} />
                  </Badge>
                  <div className="flex flex-col min-w-0">
                    <Text size="sm" fw={500} className="text-zinc-100 truncate">
                      {[r.nombre, r.apellido].filter(Boolean).join(" ")}
                    </Text>
                    <Text size="xs" className="text-zinc-500">
                      DNI: {r.dni || "—"}
                    </Text>
                  </div>
                </Group>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  radius="xl"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => removepersonal(idx)}
                  className="shrink-0"
                >
                  Quitar
                </Button>
              </div>
            ))}
          </Stack>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
        <Button
          variant="subtle"
          color="gray"
          radius="xl"
          onClick={onCancel}
          classNames={{ root: "text-zinc-400 hover:bg-zinc-800" }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={loading}
          radius="xl"
          leftSection={<IconDeviceFloppy size={18} />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
        >
          Guardar Proveedor
        </Button>
      </div>

      <ModalPersonalExterno
        opened={openRepresentante}
        close={() => setOpenRepresentante(false)}
        title="Añadir representante"
        initialEsRepresentante={true}
        onCreateLocal={handleRepresentanteCreado}
      />

      <ModalEstandar
        opened={modalNuevoLugarAbierto}
        close={() => setModalNuevoLugarAbierto(false)}
        title="Nuevo lugar de extracción"
        size="lg"
      >
        <FormLugarExtraccion
          onSuccess={handleNuevoLugarCreado}
          onCancel={() => setModalNuevoLugarAbierto(false)}
        />
      </ModalEstandar>

      <ModalEstandar
        opened={modalAlmacenAbierto}
        close={cerrarModalAlmacen}
        title={almacenEnEdicion ? "Editar almacén" : "Añadir almacén"}
        size="md"
      >
        <FormAlmacenCarbon
          initialData={almacenEnEdicion ?? undefined}
          onSave={handleAlmacenGuardado}
          onCancel={cerrarModalAlmacen}
        />
      </ModalEstandar>
    </form>
  );
};