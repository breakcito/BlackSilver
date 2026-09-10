import {
  Badge,
  Button,
  Grid,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconBuilding,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { useClienteEdicion } from "../../hooks/useClienteEdicion";
import type { ClienteResponse } from "../../service/clientes.responses";
import { TipoEntidad } from "../../../../shared/enums/_generic/tipo-entidad";

interface EditarClienteModalProps {
  cliente: ClienteResponse;
  onSuccess: (cliente: ClienteResponse) => void;
  onCancel: () => void;
}

export const EditarClienteModal = ({
  cliente,
  onSuccess,
  onCancel,
}: EditarClienteModalProps) => {
  const {
    tipoEntidad,
    setTipoEntidad,
    dni,
    setDni,
    ruc,
    setRuc,
    razonSocial,
    setRazonSocial,
    direccion,
    setDireccion,
    telefono,
    setTelefono,
    correo,
    setCorreo,
    submitting,
    error,
    handleSubmit,
  } = useClienteEdicion({ cliente, onSuccess });

  const inputClasses = {
    input:
      "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500",
    label: "text-zinc-400 font-medium text-xs",
    description: "text-zinc-500 text-[11px] mt-1",
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-1">
      {/* Header con info del cliente */}
      <Paper
        withBorder
        p="md"
        radius="lg"
        className="bg-zinc-900/20 border-zinc-800"
      >
        <Group justify="space-between">
          <Group gap="sm">
            <Badge
              variant="light"
              color={tipoEntidad === TipoEntidad.Natural ? "cyan" : "indigo"}
              radius="xl"
              size="lg"
            >
              <IconBuilding className="w-5 h-5" />
            </Badge>
            <Stack gap={0}>
              <Text
                size="10px"
                fw={800}
                className="uppercase tracking-[0.2em] leading-none mb-1 text-zinc-500"
              >
                Editando cliente
              </Text>
              <Text fw={800} size="md" className="text-zinc-100">
                {cliente.razon_social}
              </Text>
            </Stack>
          </Group>
          <Badge variant="default" color="zinc" radius="md" size="sm">
            #{cliente.id_cliente}
          </Badge>
        </Group>
      </Paper>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Tipo de Entidad"
            placeholder="Seleccione"
            withAsterisk
            searchable
            radius="xl"
            data={Object.values(TipoEntidad)}
            value={tipoEntidad}
            onChange={setTipoEntidad}
            classNames={{
              input:
                "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-300 transition-all",
              label: "text-zinc-400 font-medium text-xs",
            }}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            withAsterisk
            label="RUC"
            placeholder={
              tipoEntidad === TipoEntidad.Natural
                ? "10xxxxxxxxx (persona natural)"
                : "20xxxxxxxxx (persona jurídica)"
            }
            radius="xl"
            maxLength={11}
            value={ruc}
            onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="DNI (opcional)"
            placeholder="12345678"
            radius="xl"
            maxLength={8}
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label="Razón Social"
            placeholder="Ej. Minera Los Andes S.A.C."
            radius="xl"
            withAsterisk
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12 }}>
          <TextInput
            label="Dirección Principal"
            placeholder="Ej. Av. Los Incas 123, Arequipa"
            radius="xl"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Teléfono"
            placeholder="Ej. 987654321"
            radius="xl"
            value={telefono}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setTelefono(val);
            }}
            classNames={inputClasses}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Correo Electrónico"
            placeholder="Ej. contacto@empresa.com"
            radius="xl"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            classNames={inputClasses}
          />
        </Grid.Col>
      </Grid>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl">
          <Text c="red.5" size="xs" ta="center" fw={700}>
            {error}
          </Text>
        </div>
      )}

      {/* Footer */}
      <Group
        justify="flex-end"
        mt="md"
        gap="md"
        className="pt-6 border-t border-zinc-800/40"
      >
        <Button
          variant="subtle"
          onClick={onCancel}
          disabled={submitting}
          radius="xl"
          classNames={{ root: "text-zinc-400 hover:bg-zinc-800" }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={submitting}
          radius="xl"
          leftSection={<IconDeviceFloppy size={18} />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
        >
          Guardar Cambios
        </Button>
      </Group>
    </form>
  );
};
