import { useState } from "react";
import { Button, Group, Stack, TextInput } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";

import { ModalEstandar } from "../../../../../presentation/utils/modal-estandar";
import { CambistaService, type RES_Cambista } from "../../../../../service/cambista.service";
import { useNotify } from "../../../../../hooks/useNotify";

interface Props {
  opened: boolean;
  /**
   * Lo invoca el padre con el cambista recien creado, ya hidratado por
   * el backend con el mismo shape que devolveria `/cambistas`. El padre
   * lo agrega al select y lo deja auto-seleccionado.
   */
  onCreated: (cambista: RES_Cambista) => void;
  close: () => void;
}

/**
 * Formulario de alta rapida de cambista. Solo pide `nombre` (la columna
 * en BD es VARCHAR(128) NOT NULL; el back valida el largo).
 *
 * UX: unica pantalla, sin acciones adicionales. Al guardar exitosamente
 * emite `onCreated(...)` con la fila devuelta por el back y se cierra
 * solo. Si falla muestra un Alert con el mensaje del servidor.
 */
export const ModalNuevoCambista = ({ opened, onCreated, close }: Props) => {
  const { notifySuccess } = useNotify();
  const [nombre, setNombre] = useState("");
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const limpiar = () => {
    setNombre("");
    setErrorServidor(null);
  };

  const handleGuardar = async () => {
    const trimmed = nombre.trim();
    if (trimmed === "") {
      setErrorServidor("El nombre del cambista es obligatorio");
      return;
    }
    if (trimmed.length > 128) {
      setErrorServidor("El nombre no puede superar 128 caracteres");
      return;
    }

    setErrorServidor(null);
    setGuardando(true);
    try {
      const resp = await CambistaService.crear(trimmed);
      if (!resp.success || !resp.data) {
        setErrorServidor(
          resp.message || "No se pudo registrar el cambista",
        );
        return;
      }
      notifySuccess("Cambista registrado");
      // El padre remonta por `key`: agregamos a la lista de su select y
      // dejamos el nuevo auto-seleccionado.
      onCreated(resp.data);
      limpiar();
      close();
    } catch (err) {
      console.error(err);
      setErrorServidor(
        "No se pudo enviar el alta. Revisa tu conexion e intenta de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalEstandar
      opened={opened}
      close={() => {
        limpiar();
        close();
      }}
      title="Nuevo cambista"
      size="sm"
    >
      <Stack gap="md">
        <TextInput
          label="Nombre completo"
          placeholder="Ej. Juan Perez Garcia"
          radius="lg"
          size="xs"
          value={nombre}
          onChange={(e) => {
            setNombre(e.currentTarget.value.slice(0, 128));
            setErrorServidor(null);
          }}
          error={errorServidor ?? undefined}
          classNames={{
            input:
              "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
            label: "text-zinc-300 mb-1 font-medium text-xs",
          }}
          name="cambista_nombre"
          withAsterisk
        />
        <Group justify="flex-end">
          <Button
            variant="default"
            radius="xl"
            size="xs"
            onClick={() => {
              limpiar();
              close();
            }}
            disabled={guardando}
            className="bg-zinc-800! text-zinc-300! border-zinc-700!"
          >
            Cancelar
          </Button>
          <Button
            radius="xl"
            size="xs"
            loading={guardando}
            onClick={handleGuardar}
            leftSection={<IconUserPlus size={14} />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
          >
            Anadir cambista
          </Button>
        </Group>
      </Stack>
    </ModalEstandar>
  );
};
