import { useRef, useState } from "react";
import { Button, Group } from "@mantine/core";
import { PlusIcon, CubeIcon } from "@heroicons/react/24/outline";
import { ModalEstandar } from "../../../../presentation/utils/modal-estandar";
import { RegistroCotizacion } from "../registro-cotizacion/registro-cotizacion";
import type {
  ItemSolicitudParaCotizar,
} from "../../hooks/registro-cotizacion/useRegistroCotizacion";
import type { RES_Comparativo } from "../../../../service/responses/cotizaciones/cotizacion";

interface NuevaCotizacionDesdeSolicitudProps {
  opened: boolean;
  onClose: () => void;
  idSolicitud: number;
  /** Items pre-seleccionados desde Detalle de Solicitud. */
  items: ItemSolicitudParaCotizar[];
  /** Tras guardar exitosamente: refrescar el padre y cerrar. */
  onSuccess: (data: RES_Comparativo[]) => void;
}

/**
 * Modal reutilizable que abre "Nueva Cotización" pre-rellenada con los items
 * seleccionados en Detalle de Solicitud de Reabastecimiento. La pre-carga se
 * hace via la prop `preCargarDesdeSolicitud` de RegistroCotizacion (que ya
 * tiene el useEffect interno que llama a seedFromSolicitud al montar).
 *
 * Header con 2 botones (pasados como `rightSection` al ModalEstandar):
 *  - "Añadir Productos": abre ModalSeleccionProductos para cargar productos
 *    faltantes del catálogo.
 *  - "Añadir Cotización": crea una columna-nueva en el comparativo para
 *    sumar otro proveedor.
 */
export const NuevaCotizacionDesdeSolicitud = ({
  opened,
  onClose,
  idSolicitud,
  items,
  onSuccess,
}: NuevaCotizacionDesdeSolicitudProps) => {
  // Ref al RegistroCotizacion para poder llamar a `agregarCotizacion`
  // desde el boton del header sin tener que re-renderizar el comparativo.
  const registroRef = useRef<{
    agregarCotizacion: () => void;
    limpiarComparativo: () => void;
    hasProductos: () => boolean;
  }>(null);

  // State del modal interno "Añadir Productos". Vive aqui (no en el hook
  // RegistroCotizacion) porque solo se expone desde el header de este wrapper.
  const [openedSeleccionProductos, setOpenedSeleccionProductos] =
    useState(false);

  const handleAgregarCotizacion = () => {
    registroRef.current?.agregarCotizacion();
  };

  const handleAbrirSeleccionProductos = () => {
    setOpenedSeleccionProductos(true);
  };

  // Acciones que se muestran en la cabecera del modal (a la derecha del titulo).
  const headerActions = (
    <Group gap="xs">
      <Button
        variant="light"
        color="cyan"
        radius="xl"
        size="xs"
        leftSection={<CubeIcon className="w-4 h-4" />}
        onClick={handleAbrirSeleccionProductos}
      >
        Añadir Productos
      </Button>
      <Button
        variant="light"
        color="teal"
        radius="xl"
        size="xs"
        leftSection={<PlusIcon className="w-4 h-4" />}
        onClick={handleAgregarCotizacion}
      >
        Añadir Cotización
      </Button>
    </Group>
  );

  return (
    <ModalEstandar
      opened={opened}
      close={onClose}
      title="Nueva Cotización desde Solicitud de Reabastecimiento"
      size="95%"
      rightSection={headerActions}
    >
      <RegistroCotizacion
        ref={registroRef}
        onSuccess={(data) => {
          onSuccess(data);
          onClose();
        }}
        onCancel={onClose}
        // El modal interno de selección de productos lo abrimos desde
        // nuestro botón del header (ver `openedSeleccionProductos`).
        modalProductosOpened={openedSeleccionProductos}
        setModalProductosOpened={setOpenedSeleccionProductos}
        // `es_auditable` lo recalcula el backend desde los productos del
        // comparativo; mandamos false como default visual.
        esAuditableGlobal={false}
        // Pre-cargar productos, cantidades y vinculacion con la solicitud.
        preCargarDesdeSolicitud={{
          idSolicitud,
          items,
          empresasIds: [],
        }}
      />
    </ModalEstandar>
  );
};
