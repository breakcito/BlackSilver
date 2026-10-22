import {
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconAlertCircle, IconUpload } from "@tabler/icons-react";

import { useNotify } from "../../../hooks/useNotify";
import { ModalEstandar } from "../../../presentation/utils/modal-estandar";
import { ArchivoCard } from "../../../presentation/utils/archivo/archivo-card";
import { MultiFilePicker } from "../../../presentation/utils/archivo/multifile-picker";
import { TamizajeCarbonService } from "../service/tamizaje-carbon.service";
import type { IArchivo } from "../../../shared/interfaces/archivo";

interface Props {
  opened: boolean;
  onClose: () => void;
  idZarandeoCarbon: number;
  /** Contexto del zarandeo (tipo de carbón, almacén, etc). */
  titulo?: string;
  evidencias: IArchivo[];
  /** Se dispara con la lista completa de evidencias tras cada cambio. */
  onUpdated: (evidencias: IArchivo[]) => void;
}

export const ModalEvidenciasZarandeo = ({
  opened,
  onClose,
  idZarandeoCarbon,
  titulo,
  evidencias,
  onUpdated,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  const [pendientes, setPendientes] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<IArchivo | null>(null);

  useEffect(() => {
    if (!opened) {
      setPendientes([]);
      setPorEliminar(null);
    }
  }, [opened]);

  // Normaliza las evidencias: registros antiguos pueden no traer path_relativo,
  // en cuyo caso se usa la URL pública (el backend la acepta como ruta).
  const archivos = useMemo(
    () =>
      evidencias.map((ev) => ({
        ...ev,
        path_relativo: ev.path_relativo || ev.url || "",
        nombre_original: ev.nombre_original ?? null,
        extension: ev.extension ?? null,
      })),
    [evidencias],
  );

  const handleSubir = async () => {
    if (pendientes.length === 0) return;

    setSubiendo(true);
    try {
      const resp = await TamizajeCarbonService.subirEvidencias(
        idZarandeoCarbon,
        pendientes,
      );
      if (resp.success && resp.data) {
        onUpdated(resp.data);
        setPendientes([]);
        notifySuccess("Evidencias agregadas correctamente");
      } else {
        notifyError(resp.message || "No se pudieron subir las evidencias");
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al subir las evidencias");
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = useCallback(async () => {
    if (!porEliminar?.path_relativo) return;

    const pathRelativo = porEliminar.path_relativo;
    setPorEliminar(null);
    setEliminando(pathRelativo);
    try {
      const resp = await TamizajeCarbonService.eliminarEvidencia(
        idZarandeoCarbon,
        pathRelativo,
      );
      if (resp.success) {
        onUpdated(resp.data ?? []);
        notifySuccess("Evidencia eliminada");
      } else {
        notifyError(resp.message || "No se pudo eliminar la evidencia");
      }
    } catch (err) {
      console.error(err);
      notifyError("Ocurrió un error al eliminar la evidencia");
    } finally {
      setEliminando(null);
    }
  }, [idZarandeoCarbon, notifyError, notifySuccess, onUpdated, porEliminar]);

  return (
    <>
      <ModalEstandar
        opened={opened}
        close={onClose}
        title={titulo ? `Evidencias · ${titulo}` : "Evidencias"}
        size="xl"
        validateClose={pendientes.length > 0}
        closeConfirmationTitle="¿Cerrar sin subir los archivos?"
        closeConfirmationMessage={`Tienes ${pendientes.length} archivo(s) sin subir. Si cierras el modal, se descartarán.`}
      >
        <Stack gap="md">
          <Paper className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <MultiFilePicker
              files={pendientes}
              onFilesChange={setPendientes}
              label="Agregar evidencias"
              description="Imágenes o documentos: PDF, JPG, PNG, etc."
            />

            <Group justify="space-between" mt="sm">
              <Group justify="space-between">
                <Badge color="green" variant="light" radius="xl" size="sm">
                  {archivos.length} archivo(s)
                </Badge>
                <Text size="xs" c="dimmed">
                  registrado(s) en este zarandeo
                </Text>
              </Group>
              <Button
                color="indigo"
                onClick={handleSubir}
                loading={subiendo}
                disabled={pendientes.length === 0}
                leftSection={<IconUpload size={16} />}
                radius="lg"
                size="xs"
              >
                Subir {pendientes.length > 0 ? `(${pendientes.length})` : ""}
              </Button>
            </Group>
          </Paper>

          {archivos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {archivos.map((ev, i) => (
                <ArchivoCard
                  key={ev.path_relativo || `ev-${i}`}
                  archivo={ev}
                  onRemove={() => setPorEliminar(ev)}
                />
              ))}
            </div>
          ) : (
            <Paper className="bg-zinc-900/20 border border-dashed border-zinc-800 py-6 rounded-lg">
              <Text size="xs" c="dimmed" ta="center" fs="italic">
                Este zarandeo todavía no tiene evidencias adjuntas.
              </Text>
            </Paper>
          )}
        </Stack>
      </ModalEstandar>

      {/* Confirmación de eliminación */}
      <ModalEstandar
        opened={Boolean(porEliminar)}
        close={() => setPorEliminar(null)}
        title="Eliminar evidencia"
        size="sm"
        zIndex={1200}
      >
        <Stack align="center" gap="md">
          <ThemeIcon
            size={48}
            radius={100}
            variant="gradient"
            gradient={{ from: "red.6", to: "orange.6" }}
          >
            <IconAlertCircle size={28} stroke={1.5} />
          </ThemeIcon>

          <Title order={3} className="text-white text-center">
            ¿Eliminar la evidencia?
          </Title>

          <Text c="zinc.4" ta="center" size="sm">
            Se eliminará el archivo{" "}
            <span className="font-semibold text-zinc-200">
              {porEliminar?.nombre_original || "sin nombre"}
            </span>{" "}
            del servidor. Esta acción no se puede deshacer.
          </Text>

          <Group gap="sm" mt="sm" justify="center" w="100%">
            <Button
              variant="default"
              size="xs"
              radius="lg"
              onClick={() => setPorEliminar(null)}
              className="bg-zinc-800! text-zinc-300! border-zinc-700!"
            >
              Cancelar
            </Button>
            <Button
              color="red"
              size="xs"
              radius="lg"
              loading={eliminando !== null}
              onClick={handleEliminar}
            >
              Sí, eliminar
            </Button>
          </Group>
        </Stack>
      </ModalEstandar>
    </>
  );
};
