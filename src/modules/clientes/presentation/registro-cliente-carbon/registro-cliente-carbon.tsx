import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Grid,
  Group,
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
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import {
  useRegistroClienteCarbon,
  type AlmacenCarbonClienteTemporal,
} from "../../hooks/useRegistroClienteCarbon";
import { TipoEntidad } from "../../../../shared/enums/_generic/tipo-entidad";
import { FormAlmacenCarbon } from "../../../../presentation/utils/form-almacen-carbon";
import {
  Schema_AlmacenCarbonCliente,
  type CrearAlmacenCarbonClienteRequest,
} from "../../service/clientes.requests";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import type { ClienteResponse } from "../../service/clientes.responses";
import { useUbicacionCompleta } from "../../../../hooks/useUbicacionCompleta";

interface Props {
  onCancel: () => void;
  onSuccess: (c: ClienteResponse) => void;
}

const fieldClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
  label: "text-zinc-400 font-medium text-xs",
};

export const RegistroClienteCarbon = ({ onCancel, onSuccess }: Props) => {
  const {
    payload,
    documento,
    setDocumento,
    almacenesCarbon,
    addAlmacenCarbon,
    removeAlmacenCarbon,
    updateAlmacenCarbon,
    loading,
    error,
    handleChange,
    handleSelectChange,
    submit,
  } = useRegistroClienteCarbon((c) => onSuccess(c));

  const [modalAlmacenAbierto, setModalAlmacenAbierto] = useState(false);
  const [almacenEnEdicionTempId, setAlmacenEnEdicionTempId] = useState<
    string | null
  >(null);

  // Ubigeo completo para resolver nombres de los almacenes que el usuario
  // agrega antes de guardar el cliente (aun no tienen id_cliente ni
  // hidratacion desde el backend, solo lo que el usuario tipeo).
  const { departamentos, provincias, distritos } = useUbicacionCompleta();

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
    payload: CrearAlmacenCarbonClienteRequest,
  ) => {
    if (almacenEnEdicionTempId === null) {
      addAlmacenCarbon(payload);
    } else {
      updateAlmacenCarbon(almacenEnEdicionTempId, payload);
    }
    cerrarModalAlmacen();
  };

  const almacenEnEdicion: AlmacenCarbonClienteTemporal | null =
    almacenEnEdicionTempId === null
      ? null
      : almacenesCarbon.find((a) => a.tempId === almacenEnEdicionTempId) ??
        null;

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
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="RUC o DNI (opc)"
            placeholder={
              payload.tipo_entidad === TipoEntidad.Natural
                ? "RUC 10xxxxxxxxx o DNI 8 dígitos"
                : "RUC 20xxxxxxxxx o DNI 8 dígitos"
            }
            radius="xl"
            maxLength={11}
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label={
              payload.tipo_entidad === TipoEntidad.Natural
                ? "Nombre Completo"
                : "Razón Social"
            }
            placeholder={
              payload.tipo_entidad === TipoEntidad.Natural
                ? "Ej. Juan Perez"
                : "Ej. Minera Los Andes S.A.C."
            }
            radius="xl"
            withAsterisk
            value={payload.razon_social || ""}
            onChange={(e) => handleChange("razon_social", e.target.value)}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label="Dirección Principal (opcional)"
            placeholder="Ej. Av. Los Incas 123, Arequipa"
            radius="xl"
            value={payload.direccion || ""}
            onChange={(e) => handleChange("direccion", e.target.value)}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Teléfono (opcional)"
            placeholder="Ej. 987654321"
            radius="xl"
            value={payload.telefono || ""}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              handleChange("telefono", val);
            }}
            classNames={fieldClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Correo Electrónico (opcional)"
            placeholder="Ej. contacto@empresa.com"
            radius="xl"
            value={payload.correo || ""}
            onChange={(e) => handleChange("correo", e.target.value)}
            classNames={fieldClasses}
          />
        </Grid.Col>
      </Grid>

      {/* Almacenes de Carbon */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <Text size="sm" fw={600} className="text-zinc-300">
              Almacenes de Carbón
            </Text>
            <Text size="xs" className="text-zinc-500">
              Añadir almacenes del cliente
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
            Sin almacenes. Si el cliente no tiene almacenes, puedes dejar
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
          confirmar el cliente.
        </Text>
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
          Guardar Cliente de Carbón
        </Button>
      </div>

      <ModalEstandar
        opened={modalAlmacenAbierto}
        close={cerrarModalAlmacen}
        title={almacenEnEdicion ? "Editar almacén" : "Añadir almacén"}
        size="md"
      >
        <FormAlmacenCarbon<CrearAlmacenCarbonClienteRequest>
          schema={Schema_AlmacenCarbonCliente}
          initialData={almacenEnEdicion ?? undefined}
          onSave={handleAlmacenGuardado}
          onCancel={cerrarModalAlmacen}
        />
      </ModalEstandar>
    </form>
  );
};