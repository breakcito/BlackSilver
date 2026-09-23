import { api } from "../../../service/_api";
import type { IArchivo } from "../../../shared/interfaces/archivo";

interface IArchivoServer {
  url: string;
  path_relativo: string;
  nombre_original: string | null;
  extension: string | null;
}

/**
 * Sube los archivos a la carpeta `anticipos-proveedor` del storage del
 * backend y devuelve la lista de IArchivo resultantes (con URL publica
 * y path_relativo listo para persistir en la columna JSON
 * `anticipo_proveedor.evidencias`).
 *
 * Patron identico a `subirContratos`: el FE sube primero y luego manda
 * los IArchivo resultantes en el JSON del POST de registro del anticipo.
 */
export const subirAnticipos = async (
  files: File[],
): Promise<IArchivo[]> => {
  const subidos: IArchivo[] = [];
  for (const file of files) {
    const fd = new FormData();
    fd.append("archivo", file, file.name);
    fd.append("carpeta", "anticipos-proveedor");
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
