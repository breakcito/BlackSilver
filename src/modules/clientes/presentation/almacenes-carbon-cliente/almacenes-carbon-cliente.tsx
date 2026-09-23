import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconBuildingWarehouse,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { ClientesService } from "../../service/clientes.service";
import type {
  AlmacenCarbonClienteResponse,
  ClienteResponse,
} from "../../service/clientes.responses";
import {
  Schema_AlmacenCarbonCliente,
  type CrearAlmacenCarbonClienteRequest,
} from "../../service/clientes.requests";
import { useNotify } from "../../../../hooks/useNotify";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { FormAlmacenCarbon } from "../../../../presentation/utils/form-almacen-carbon";

interface Props {
  cliente: ClienteResponse;
  /**
   * Se dispara despues de cualquier cambio (crear/editar/eliminar) para
   * que el padre actualice la fila del cliente en su estado global con
   * la lista + count refrescados.
   */
  onAlmacenGuardado?: (almacenes: AlmacenCarbonClienteResponse[]) => void;
}

/**
 * Gestion de almacenes de carbon de un cliente (modulo carbon).
 *
 * Carga inicial via GET, CRUD via service. A diferencia de LugaresExtraccion
 * (que reemplaza el set completo via PUT), aca cada almacen es una fila
 * independiente en `almacen_carbon_cliente`, asi que se hace create /
 * update / delete granulares.
 *
 * Reusa el mismo `FormAlmacenCarbon` (generico parametrizado con
 * `Schema_AlmacenCarbonCliente`) que el form del modulo gemelo de
 * proveedores.
 */
export const AlmacenesCarbonCliente = ({
  cliente,
  onAlmacenGuardado,
}: Props) => {
  const { notifySuccess, notifyError } = useNotify();

  const [almacenes, setAlmacenes] = useState<AlmacenCarbonClienteResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enEdicion, setEnEdicion] =
    useState<AlmacenCarbonClienteResponse | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const resp = await ClientesService.getAlmacenesCarbonPorCliente(
        cliente.id_cliente,
      );
      if (resp.success && Array.isArray(resp.data)) {
        setAlmacenes(resp.data);
        onAlmacenGuardado?.(resp.data);
      } else {
        notifyError(resp.message || "No se pudieron cargar los almacenes");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al cargar los almacenes de carbon");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id_cliente]);

  const abrirNuevo = () => {
    setEnEdicion(null);
    setModalAbierto(true);
  };

  const abrirEditar = (a: AlmacenCarbonClienteResponse) => {
    setEnEdicion(a);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEnEdicion(null);
  };

  const handleGuardar = async (
    payload: CrearAlmacenCarbonClienteRequest,
  ) => {
    setGuardando(true);
    try {
      const resp = enEdicion
        ? await ClientesService.actualizarAlmacenCarbonPorCliente(
            cliente.id_cliente,
            enEdicion.id_almacen,
            payload,
          )
        : await ClientesService.crearAlmacenCarbonPorCliente(
            cliente.id_cliente,
            payload,
          );

      if (resp.success && resp.data) {
        notifySuccess(
          enEdicion
            ? "Almacen actualizado correctamente"
            : "Almacen registrado correctamente",
        );
        cerrarModal();
        await cargar();
      } else {
        notifyError(resp.message || "No se pudo guardar el almacen");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al guardar el almacen de carbon");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (a: AlmacenCarbonClienteResponse) => {
    setEliminandoId(a.id_almacen);
    try {
      const resp = await ClientesService.eliminarAlmacenCarbonPorCliente(
        cliente.id_cliente,
        a.id_almacen,
      );
      if (resp.success) {
        notifySuccess("Almacen eliminado correctamente");
        await cargar();
      } else {
        notifyError(resp.message || "No se pudo eliminar el almacen");
      }
    } catch (err) {
      console.error(err);
      notifyError("Error al eliminar el almacen de carbon");
    } finally {
      setEliminandoId(null);
    }
  };

  const initialData = useMemo(
    () =>
      enEdicion
        ? {
            id_departamento: enEdicion.id_departamento,
            id_provincia: enEdicion.id_provincia,
            id_distrito: enEdicion.id_distrito,
            direccion: enEdicion.direccion,
          }
        : undefined,
    [enEdicion],
  );

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={600} className="text-zinc-200">
          {cliente.razon_social}
        </Text>
        <Text size="xs" className="text-zinc-400">
          Almacenes propios donde este cliente guarda carbon. Cada registro
          vive bajo este cliente.
        </Text>
      </div>

      <Group justify="flex-end">
        <Button
          leftSection={<IconPlus size={14} />}
          radius="xl"
          size="xs"
          variant="filled"
          color="teal"
          onClick={abrirNuevo}
          disabled={guardando}
          className="font-semibold shadow-md shadow-teal-900/30"
        >
          Añadir almacén
        </Button>
      </Group>

      {loading && almacenes.length === 0 ? (
        <div className="text-zinc-500 text-xs italic px-3 py-2 border border-dashed border-zinc-800 rounded-lg">
          Cargando almacenes...
        </div>
      ) : almacenes.length === 0 ? (
        <div className="text-zinc-500 text-xs italic px-3 py-2 border border-dashed border-zinc-800 rounded-lg">
          Este cliente no tiene almacenes registrados.
        </div>
      ) : (
        <Stack gap="xs">
          {almacenes.map((a) => {
            const geo = [
              a.departamento_nombre,
              a.provincia_nombre,
              a.distrito_nombre,
            ]
              .filter(Boolean)
              .join(" / ");
            const eliminando = eliminandoId === a.id_almacen;
            return (
              <div
                key={a.id_almacen}
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
                  <ActionIcon
                    variant="subtle"
                    color="indigo"
                    size="md"
                    radius="xl"
                    onClick={() => abrirEditar(a)}
                    disabled={guardando || eliminando}
                    aria-label="Editar almacen"
                  >
                    <IconPencil size={16} stroke={1.8} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="md"
                    radius="xl"
                    onClick={() => handleEliminar(a)}
                    disabled={guardando || eliminando}
                    loading={eliminando}
                    aria-label="Eliminar almacen"
                  >
                    <IconTrash size={16} stroke={1.8} />
                  </ActionIcon>
                </Group>
              </div>
            );
          })}
        </Stack>
      )}

      <Text size="xs" className="text-zinc-500">
        {almacenes.length === 1
          ? "1 almacen registrado"
          : `${almacenes.length} almacenes registrados`}
        .
      </Text>

      <ModalEstandar
        opened={modalAbierto}
        close={cerrarModal}
        title={enEdicion ? "Editar almacén" : "Añadir almacén"}
        size="md"
      >
        <FormAlmacenCarbon<CrearAlmacenCarbonClienteRequest>
          schema={Schema_AlmacenCarbonCliente}
          initialData={initialData}
          onSave={handleGuardar}
          onCancel={cerrarModal}
          loading={guardando}
          helpText="El almacen se persiste con el mismo `id_cliente` y se asocia a la lista actual del cliente."
        />
      </ModalEstandar>
    </Stack>
  );
};