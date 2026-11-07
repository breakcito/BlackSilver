import { Button, Modal, Stack, Text } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

interface Props {
  opened: boolean;
  close: () => void;
  titulo: string;
  descripcion: string;
  confirmarTexto?: string;
  onConfirmar: () => void;
  loading?: boolean;
}

/**
 * Confirmacion antes de una accion destructiva.
 */
export const ConfirmarEliminar = ({
  opened,
  close,
  titulo,
  descripcion,
  confirmarTexto = "Eliminar",
  onConfirmar,
  loading,
}: Props) => (
  <Modal
    opened={opened}
    onClose={close}
    title={titulo}
    centered
    radius="lg"
    overlayProps={{ backgroundOpacity: 0.6, blur: 3 }}
    styles={{
      content: { backgroundColor: "#18181b", border: "1px solid #27272a" },
      header: { backgroundColor: "#18181b" },
      title: { color: "#fafafa", fontWeight: 700 },
    }}
  >
    <Stack gap="lg">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0 mt-0.5">
          <IconExclamationCircle className="w-5 h-5 text-red-400" />
        </div>
        <Text size="sm" c="dimmed" className="leading-relaxed">
          {descripcion}
        </Text>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="light" onClick={close} radius="lg" disabled={loading}>
          Cancelar
        </Button>
        <Button
          color="red"
          onClick={onConfirmar}
          loading={loading}
          radius="lg"
        >
          {confirmarTexto}
        </Button>
      </div>
    </Stack>
  </Modal>
);
