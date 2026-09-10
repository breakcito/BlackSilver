import { api } from "../../../service/_api";
import type { IRespuesta } from "../../../shared/interfaces/_response";
import type {
  DTO_ActualizarCategoria,
  DTO_RegistroCategoria,
} from "./categorias.requests";
import type { RES_CategoriaResumen } from "./categorias.responses";

export class CategoriasService {
  private static PATH = "/categorias";

  public static get_categorias = async (): Promise<
    IRespuesta<RES_CategoriaResumen[]>
  > => {
    const { data } = await api.get(`${this.PATH}`);
    return data;
  };

  public static crear_categoria = async (
    dto: DTO_RegistroCategoria,
  ): Promise<IRespuesta<RES_CategoriaResumen>> => {
    const { data } = await api.post(`${this.PATH}`, dto);
    return data;
  };

  public static actualizar_categoria = async (
    id_categoria: number,
    dto: DTO_ActualizarCategoria,
  ): Promise<IRespuesta<RES_CategoriaResumen>> => {
    const { data } = await api.put(`${this.PATH}/${id_categoria}`, dto);
    return data;
  };

  public static eliminar_categoria = async (
    id_categoria: number,
  ): Promise<IRespuesta<RES_CategoriaResumen>> => {
    const { data } = await api.delete(`${this.PATH}/${id_categoria}`);
    return data;
  };
}
