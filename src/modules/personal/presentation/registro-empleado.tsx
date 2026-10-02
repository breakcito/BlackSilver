import { useMemo, useState } from "react";
import {
  Stack,
  Group,
  TextInput,
  Select,
  Switch,
  Button,
  Avatar,
  FileButton,
  Text,
  Tooltip,
  Alert,
  ActionIcon,
} from "@mantine/core";
import {
  UserIcon,
  IdentificationIcon,
  BriefcaseIcon,
  PencilIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserCircleIcon,
  DocumentTextIcon,
  PlusIcon,
  CheckBadgeIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { useRegistroEmpleado } from "../hooks/useRegistroEmpleado";
import type { RES_EmpleadoResumen } from "../service/empleados.responses";
import { CustomDatePicker } from "../../../presentation/utils/date-picker-input";
import { Genero } from "../../../shared/enums/_generic/genero";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { FormularioContratoEmpleado } from "../../contratos-empleado/presentation/formulario-contrato";
import type { DTO_CrearContratoEmpleado } from "../../contratos-empleado/service/contratos-empleado.requests";
import { TipoContrato } from "../../../shared/enums/tipo-contrato";
import { RegistroArea } from "../../organigrama/presentation/registro-area";
import { RegistroCargo } from "../../organigrama/presentation/registro-cargo";
import { useRegistroArea } from "../../organigrama/hooks/useRegistroArea";
import { useRegistroCargo } from "../../organigrama/hooks/useRegistroCargo";

interface RegistroEmpleadoProps {
  onSuccess: (nuevo: RES_EmpleadoResumen) => void;
  onCancel: () => void;
}

const GENERO_OPTIONS = [
  { value: Genero.Femenino, label: "Femenino" },
  { value: Genero.Masculino, label: "Masculino" },
];

export const RegistroEmpleado = ({
  onSuccess,
  onCancel,
}: RegistroEmpleadoProps) => {
  const {
    form,
    setField,
    idArea,
    setIdArea,
    setConContrato,
    abrirModalContrato,
    cerrarModalContrato,
    modalContratoAbierto,
    areas,
    setAreas,
    cargos,
    setTodosCargos,
    empresas,
    loading,
    loadingAreas,
    loadingCargos,
    loadingEmpresas,
    submitEmpleadoSinContrato,
  } = useRegistroEmpleado(onSuccess);

  const [openedAddArea, setOpenedAddArea] = useState(false);
  const [openedAddCargo, setOpenedAddCargo] = useState(false);

  const regArea = useRegistroArea(
    (nuevaArea) => {
      setAreas((prev) => [...prev, nuevaArea]);
      setIdArea(nuevaArea.id_area);
      setOpenedAddArea(false);
    },
    () => setOpenedAddArea(false)
  );

  const regCargo = useRegistroCargo(
    (nuevoCargo) => {
      setTodosCargos((prev) => [...prev, nuevoCargo]);
      setField("id_cargo", nuevoCargo.id_cargo);
      if (nuevoCargo.id_area) {
        setIdArea(nuevoCargo.id_area, true);
      }
      setOpenedAddCargo(false);
    },
    () => setOpenedAddCargo(false),
    idArea
  );

  const photoPreview =
    form.foto instanceof File ? URL.createObjectURL(form.foto) : null;
  const tieneContrato = form.con_contrato === true;

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
      result.push({
        group: groupName,
        items,
      });
    });

    return result;
  }, [cargos, areas]);

  const fieldClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
    label: "text-zinc-300 mb-1 font-medium",
  };

  const fotoEmpleado = form.foto instanceof File ? form.foto : null;

  return (
    <>
      <Stack gap="md">
        {/* Selector de Foto Circular */}
        <div className="flex flex-col items-center justify-center py-2">
          <FileButton
            onChange={(file) => setField("foto", file)}
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
                    {form.foto ? "Cambiar imagen" : "Subir imagen"}
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
            value={form.dni || ""}
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

        {/* Dirección completa */}
        <TextInput
          label="Dirección"
          placeholder="Ej. Av. Principal 123, Lima"
          value={form.direccion || ""}
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
            value={form.telefono || ""}
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
            value={form.email || ""}
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

        {/* Switch: ¿Tiene contrato? */}
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
            tieneContrato
              ? "bg-teal-500/10 border-teal-500/40"
              : "bg-zinc-900/50 border-zinc-800"
          }`}
        >
          <div className="flex flex-col">
            <Text
              size="sm"
              fw={700}
              className="text-zinc-200 flex items-center gap-2"
            >
              <DocumentTextIcon className="w-4 h-4 text-teal-400" />
              ¿Tiene contrato?
            </Text>
            <Text size="11px" c="dimmed" className="leading-snug">
              {tieneContrato
                ? "El cargo se asignará al crear el contrato."
                : "Dueños, gerentes o accionistas suelen no tener contrato."}
            </Text>
          </div>
          <Switch
            checked={tieneContrato}
            onChange={(e) => setConContrato(e.currentTarget.checked)}
            color="teal"
            size="md"
            disabled={loading}
          />
        </div>

        {/* Sección condicional: si tiene contrato, mostrar botón "Añadir Contrato" */}
        {tieneContrato ? (
          <div className="p-4 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 flex flex-col gap-3">
            <Alert
              variant="light"
              color="teal"
              radius="md"
              icon={<CheckBadgeIcon className="w-4 h-4" />}
              styles={{ message: { fontSize: "12px" } }}
            >
              Marque este paso como <strong>opcional</strong>: el empleado se
              puede registrar con este switch activo y luego asignarle el
              contrato desde el listado. O bien, complete el contrato ahora
              mismo en un solo paso.
            </Alert>
            <Tooltip
              label="Completa primero los datos del empleado"
              disabled={!!(form.nombre && form.apellido)}
              withArrow
            >
              <Button
                variant="filled"
                color="teal"
                radius="lg"
                size="sm"
                leftSection={<DocumentTextIcon className="w-4 h-4" />}
                rightSection={<PlusIcon className="w-4 h-4" />}
                onClick={abrirModalContrato}
                disabled={loading || !form.nombre || !form.apellido}
                className="shadow-lg shadow-teal-900/30"
              >
                Añadir Contrato
              </Button>
            </Tooltip>
          </div>
        ) : (
          <Stack gap="md">
            <Group grow align="flex-start" gap="md">
              <div className="flex gap-2 items-end">
                <Select
                  label="Área"
                  placeholder={
                    loadingAreas ? "Cargando áreas..." : "Seleccione área"
                  }
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
                  disabled={loadingAreas || loading}
                  comboboxProps={{ withinPortal: true }}
                  className="flex-1"
                />
                <ActionIcon
                  size="lg"
                  radius="xl"
                  variant="filled"
                  color="indigo"
                  className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors mb-px h-[38px] w-[38px]"
                  onClick={() => setOpenedAddArea(true)}
                  disabled={loading}
                >
                  <PlusIcon className="w-5 h-5 text-white" />
                </ActionIcon>
              </div>
              <div className="flex gap-2 items-end">
                <Select
                  label="Cargo"
                  placeholder={
                    loadingCargos ? "Cargando cargos..." : "Seleccione cargo"
                  }
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
                  disabled={loadingCargos || loading}
                  searchable
                  comboboxProps={{ withinPortal: true }}
                  className="flex-1"
                />
                <ActionIcon
                  size="lg"
                  radius="xl"
                  variant="filled"
                  color="indigo"
                  className="shrink-0 bg-indigo-600 hover:bg-indigo-700 transition-colors mb-px h-[38px] w-[38px]"
                  onClick={() => setOpenedAddCargo(true)}
                  disabled={loading}
                >
                  <PlusIcon className="w-5 h-5 text-white" />
                </ActionIcon>
              </div>
            </Group>
            <Select
              label="Empresa"
              placeholder={
                loadingEmpresas ? "Cargando empresas..." : "Seleccione empresa"
              }
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
              disabled={loadingEmpresas || loading}
              searchable
              comboboxProps={{ withinPortal: true }}
            />
          </Stack>
        )}

        {/* Acciones — siempre se muestra el botón Guardar */}
        <Group justify="flex-end" gap="md" mt="xl">
          <Button
            variant="subtle"
            onClick={onCancel}
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
              void submitEmpleadoSinContrato();
            }}
            radius="lg"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-8"
          >
            Guardar
          </Button>
        </Group>
      </Stack>

      {/* SUB-MODAL: Añadir Contrato de Trabajo (modo embebido: formEmpleado + foto) */}
      <ModalEstandar
        opened={modalContratoAbierto}
        close={cerrarModalContrato}
        title="Añadir Contrato de Trabajo"
        size="xl"
        validateClose
      >
        <FormularioContratoEmpleado
          idEmpleado={0}
          onSuccess={(payload) => {
            cerrarModalContrato();
            const data = payload as { empleado?: RES_EmpleadoResumen };
            if (data?.empleado) {
              onSuccess(data.empleado);
            }
          }}
          onCancel={cerrarModalContrato}
          embedded
          formEmpleado={form}
          fotoEmpleado={fotoEmpleado}
        />
      </ModalEstandar>

      {/* Sub-modal: Registrar Área al vuelo */}
      <ModalEstandar
        opened={openedAddArea}
        close={() => setOpenedAddArea(false)}
        title="Registrar Nueva Área"
        validateClose
        size="md"
      >
        <RegistroArea
          nombre={regArea.nombre}
          setNombre={regArea.setNombre}
          cargos={regArea.cargos}
          addCargo={regArea.addCargo}
          removeCargo={regArea.removeCargo}
          updateCargo={regArea.updateCargo}
          loading={regArea.loading}
          error={regArea.error}
          onSave={regArea.handleGuardar}
          onCancel={() => setOpenedAddArea(false)}
        />
      </ModalEstandar>

      {/* Sub-modal: Registrar Cargo al vuelo */}
      <ModalEstandar
        opened={openedAddCargo}
        close={() => setOpenedAddCargo(false)}
        title="Registrar Nuevo Cargo"
        validateClose
        size="md"
      >
        <RegistroCargo
          nombre={regCargo.nombre}
          setNombre={regCargo.setNombre}
          loading={regCargo.loading}
          error={regCargo.error}
          onSave={regCargo.handleGuardar}
          onCancel={() => setOpenedAddCargo(false)}
          contextLabel={
            idArea
              ? `Área asociada: ${areas.find((a) => a.id_area === idArea)?.nombre || ""}`
              : "Sin área asociada"
          }
        />
      </ModalEstandar>
    </>
  );
};

// Re-export de tipo auxiliar
export type { TipoContrato, DTO_CrearContratoEmpleado };
