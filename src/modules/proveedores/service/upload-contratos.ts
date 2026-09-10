import { api } from "../../../service/_api";
import type { IArchivo } from "../../../shared/interfaces/archivo";

interface IArchivoServer {
  url: string;
  path_relativo: string;
  nombre_original: string | null;
  extension: string | null;
}

/**
 * Sube los archivos a la carpeta `contratos-proveedor` del storage del backend
 * y devuelve la lista de IArchivo resultantes (con URL pública y path_relativo
 * listo para persistir en la columna JSON `proveedor.contratos`).
 *
 * Usado por los hooks de registro y edicion del proveedor de carbon.
 */
export const subirContratos = async (
  files: File[],
): Promise<IArchivo[]> => {
  const subidos: IArchivo[] = [];
  for (const file of files) {
    const fd = new FormData();
    fd.append("archivo", file, file.name);
    fd.append("carpeta", "contratos-proveedor");
    const { data } = await api.post<{
      success: boolean;
      data: IArchivoServer;
      message?: string;
    }>("/archivos/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (data?.success && data.data) {
      const a = data.data;
      subidos.push({
        url: a.url,
        path_relativo: a.path_relativo,
        nombre_original: a.nombre_original ?? file.name,
        extension: a.extension ?? null,
      });
    } else {
      throw new Error(data?.message ?? `No se pudo subir ${file.name}`);
    }
  }
  return subidos;
};
