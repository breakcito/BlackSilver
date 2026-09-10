import { useMemo } from "react";
import {
  Stack,
  Group,
  TextInput,
  Select,
  Button,
  Avatar,
  FileButton,
  Text,
  Alert,
} from "@mantine/core";
import {
  UserIcon,
  IdentificationIcon,
  PencilIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserCircleIcon,
  CheckBadgeIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { useEdicionEmpleado } from "../hooks/useEdicionEmpleado";
import type { RES_EmpleadoResumen } from "../service/empleados.responses";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { Genero } from "../../../shared/enums/_generic/genero";

interface ModalEditarEmpleadoProps {
  empleado: RES_EmpleadoResumen;
  opened: boolean;
  onSuccess: (editado: RES_EmpleadoResumen) => void;
  close: () => void;
}

const GENERO_OPTIONS = [
  { value: Genero.Femenino, label: "Femenino" },
  { value: Genero.Masculino, label: "Masculino" },
];

export const ModalEditarEmpleado = ({
  empleado,
  opened,
  onSuccess,
  close,
}: ModalEditarEmpleadoProps) => {
  const {
    form,
    setField,
    idArea,
    setIdArea,
    areas,
    cargos,
    empresas,
    loading,
    loadingCatalogos,
    tieneContratoVigente,
    fotoFile,
    handleFoto,
    submit,
  } = useEdicionEmpleado(empleado, onSuccess);

  // Preview: foto nueva elegida > foto actual del empleado
  const photoPreview = useMemo(
    () =>
      fotoFile
        ? URL.createObjectURL(fotoFile)
        : (empleado.url_foto ?? null),
    [fotoFile, empleado.url_foto],
  );

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  const cargosSelectData = useMemo(() => {
    const grouped = new Map<string, { value: string; label: string }[]>();

    cargos.forEach((c) => {
      const area = areas.find((a) => a.id_area === c.id_area);
      const groupName = area ? area.nombre : "Sin área asignada";

      if (!grouped.has(groupName)) {
        grouped.set(groupName, []);
      }
      grouped.get(groupName)!.push({
        value: c.id_cargo.toString(),
        label: c.nombre,
      });
    });

    const result: {
      group: string;
      items: { value: string; label: string }[];
    }[] = [];
    grouped.forEach((items, groupName) => {
      result.push({ group: groupName, items });
    });

    return result;
  }, [cargos, areas]);

  return (
    <ModalEstandar
      opened={opened}
      close={close}
      title={`Editar empleado: ${empleado.nombre} ${empleado.apellido}`}
      size="lg"
      validateClose={loading}
    >
      <Stack gap="md">
      {/* Foto (editable siempre) */}
      <div className="flex flex-col items-center justify-center py-2">
        <FileButton
          onChange={(file) => handleFoto(file)}
          accept="image/png,image/jpeg,image/jpg"
        >
          {(props) => (
            <div
              {...props}
              className="relative cursor-pointer group rounded-full overflow-hidden border-2 border-indigo-500/30 bg-indigo-600/10 transition-all duration-300 hover:border-indigo-400 hover:bg-indigo-600/20"
              style={{ width: 100, height: 100 }}
            >
              <Avatar
                src={photoPreview}
                size={100}
                radius={100}
                className="bg-transparent"
              >
                <UserIcon className="w-10 h-10 text-indigo-400/40" />
              </Avatar>
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 text-center">
                <PencilIcon className="w-5 h-5 text-white mb-1 drop-shadow-md" />
                <Text size="10px" fw={700} className="text-white leading-tight">
                  {fotoFile ? "Cambiar imagen" : "Cambiar imagen"}
                </Text>
              </div>
            </div>
          )}
        </FileButton>
      </div>

      {/* Nombres y Apellidos */}
      <Group grow align="flex-start" gap="md">
        <TextInput
          label="Nombres"
          placeholder="Ej. Juan"
          value={form.nombre}
          onChange={(e) => setField("nombre", e.currentTarget.value)}
          leftSection={<UserIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          required
          withAsterisk
          disabled={loading}
        />
        <TextInput
          label="Apellidos"
          placeholder="Ej. Pérez"
          value={form.apellido}
          onChange={(e) => setField("apellido", e.currentTarget.value)}
          leftSection={<UserIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          required
          withAsterisk
          disabled={loading}
        />
      </Group>

      {/* DNI, Fecha de Nacimiento y Género */}
      <Group grow align="flex-start" gap="md">
        <TextInput
          label="DNI"
          placeholder="12345678"
          value={form.dni ?? ""}
          onChange={(e) =>
            setField("dni", e.currentTarget.value.replace(/\D/g, ""))
          }
          leftSection={<IdentificationIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          maxLength={8}
          disabled={loading}
        />
        <CustomDatePicker
          label="Fecha de Nacimiento"
          placeholder="Seleccione fecha"
          value={form.fecha_nacimiento || null}
          onChange={(val: unknown) =>
            setField("fecha_nacimiento", val as string | null)
          }
          size="xs"
          disabled={loading}
        />
        <Select
          label="Género"
          placeholder="Seleccione"
          data={GENERO_OPTIONS}
          value={form.genero ?? null}
          onChange={(val) =>
            setField("genero", val ? (val as Genero) : null)
          }
          leftSection={<UserCircleIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          clearable
          disabled={loading}
          comboboxProps={{ withinPortal: true }}
        />
      </Group>

      {/* Dirección */}
      <TextInput
        label="Dirección"
        placeholder="Ej. Av. Principal 123, Lima"
        value={form.direccion ?? ""}
        onChange={(e) => setField("direccion", e.currentTarget.value)}
        leftSection={<MapPinIcon className="w-4 h-4 text-zinc-500" />}
        classNames={fieldClasses}
        radius="lg"
        size="xs"
        maxLength={255}
        disabled={loading}
      />

      {/* Teléfono y Email */}
      <Group grow align="flex-start" gap="md">
        <TextInput
          label="Teléfono"
          placeholder="987654321"
          value={form.telefono ?? ""}
          onChange={(e) =>
            setField(
              "telefono",
              e.currentTarget.value.replace(/[^\d+\s]/g, ""),
            )
          }
          leftSection={<PhoneIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          maxLength={32}
          disabled={loading}
        />
        <TextInput
          label="Email"
          placeholder="ejemplo@correo.com"
          value={form.email ?? ""}
          onChange={(e) => setField("email", e.currentTarget.value)}
          leftSection={<EnvelopeIcon className="w-4 h-4 text-zinc-500" />}
          classNames={fieldClasses}
          radius="lg"
          size="xs"
          maxLength={128}
          type="email"
          disabled={loading}
        />
      </Group>

      {/* Sección condicional: cargo/empresa/área solo si NO tiene contrato vigente */}
      {tieneContratoVigente ? (
        <Alert
          variant="light"
          color="teal"
          radius="md"
          icon={<CheckBadgeIcon className="w-4 h-4" />}
          styles={{ message: { fontSize: "12px" } }}
        >
          Este empleado tiene <strong>contrato vigente</strong>. La edición
          de empresa, área y cargo se hace desde el módulo{" "}
          <strong>Contratos de Empleado</strong>.
        </Alert>
      ) : (
        <>
          {loadingCatalogos ? (
            <Text size="xs" c="dimmed" ta="center">
              Cargando catálogos de área/cargo/empresa...
            </Text>
          ) : null}
          <Group grow align="flex-start" gap="md">
            <Select
              label="Área"
              placeholder="Seleccione área"
              data={areas.map((a) => ({
                value: a.id_area.toString(),
                label: a.nombre,
              }))}
              value={idArea?.toString() || null}
              onChange={(val) => setIdArea(val ? Number(val) : null)}
              leftSection={<BriefcaseIcon className="w-4 h-4 text-zinc-500" />}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              searchable
              disabled={loadingCatalogos || loading}
              comboboxProps={{ withinPortal: true }}
              className="flex-1"
              key={`area-${areas.length}-${idArea ?? "x"}`}
            />
            <Select
              label="Cargo"
              placeholder="Seleccione cargo"
              data={cargosSelectData}
              value={
                form.id_cargo && form.id_cargo > 0
                  ? form.id_cargo.toString()
                  : null
              }
              onChange={(val) => {
                const cargoId = val ? Number(val) : null;
                setField("id_cargo", cargoId);
                if (cargoId) {
                  const cargo = cargos.find((c) => c.id_cargo === cargoId);
                  if (cargo && cargo.id_area) {
                    setIdArea(cargo.id_area, true);
                  }
                }
              }}
              leftSection={<BriefcaseIcon className="w-4 h-4 text-zinc-500" />}
              classNames={fieldClasses}
              radius="lg"
              size="xs"
              required
              withAsterisk
              disabled={loadingCatalogos || loading}
              searchable
              comboboxProps={{ withinPortal: true }}
              className="flex-1"
              key={`cargo-${cargosSelectData.length}-${form.id_cargo ?? "x"}`}
            />
          </Group>
          <Select
            label="Empresa"
            placeholder="Seleccione empresa"
            data={empresas.map((e) => ({
              value: e.id_empresa.toString(),
              label: e.razon_social,
            }))}
            value={form.id_empresa?.toString() || null}
            onChange={(val) =>
              setField("id_empresa", val ? Number(val) : null)
            }
            leftSection={<BuildingOfficeIcon className="w-4 h-4 text-zinc-500" />}
            classNames={fieldClasses}
            radius="lg"
            size="xs"
            required
            withAsterisk
            disabled={loadingCatalogos || loading}
            searchable
            comboboxProps={{ withinPortal: true }}
            key={`empresa-${empresas.length}-${form.id_empresa ?? "x"}`}
          />
        </>
      )}

      <Group justify="flex-end" gap="md" mt="xl">
        <Button
          variant="subtle"
          onClick={close}
          disabled={loading}
          radius="lg"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          Cancelar
        </Button>
        <Button
          loading={loading}
          onClick={() => {
            void submit();
          }}
          radius="lg"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-8"
        >
          Guardar Cambios
        </Button>
      </Group>
      </Stack>
    </ModalEstandar>
  );
};
