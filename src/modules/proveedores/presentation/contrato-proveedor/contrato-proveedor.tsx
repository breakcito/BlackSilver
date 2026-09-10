import { Stack, Text } from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import { ArchivoCard } from "../../../../presentation/utils/archivo/archivo-card";
import type { ProveedorResponse } from "../../service/proveedores.responses";

interface Props {
  proveedor: ProveedorResponse;
}

/**
 * Lista read-only de los archivos del contrato de un proveedor de carbon.
 *
 * Se muestra dentro de un ModalEstandar desde el listado. El boton "Quitar"
 * del ArchivoCard NO se renderiza (no se pasa `onRemove`) porque este modal
 * es solo lectura; la gestion de archivos se hace en el modal "Editar".
 */
export const ContratoProveedor = ({ proveedor }: Props) => {
  const archivos = Array.isArray(proveedor.contratos)
    ? proveedor.contratos
    : [];

  if (archivos.length === 0) {
    return (
      <Stack align="center" gap="sm" py="xl">
        <IconFileText size={36} stroke={1.5} className="text-zinc-700" />
        <Text size="sm" fw={700} className="text-zinc-400 uppercase tracking-widest">
          Sin archivos en el contrato
        </Text>
        <Text size="xs" c="dimmed">
          Este proveedor aun no tiene archivos asociados al contrato. Puedes
          subirlos desde el modal "Editar".
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xs">
      {archivos.map((a) => (
        <ArchivoCard key={a.path_relativo} archivo={a} />
      ))}
    </Stack>
  );
};
