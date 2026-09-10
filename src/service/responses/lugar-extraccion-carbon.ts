/**
 * Catalogo global de "Lugares de extraccion" de carbon.
 *
 * Antes existia un `id_proveedor` en la misma tabla; ahora el catalogo es
 * global y los proveedores se asocian via `lugar_extraccion_proveedor`.
 *
 * `id_departamento` / `id_provincia` / `id_distrito` y sus nombres son
 * opcionales: la direccion es la identidad del sitio.
 */
export interface RES_LugarExtraccionCarbon {
  id_lugar_extraccion: number;
  id_departamento: number | null;
  departamento_nombre: string | null;
  id_provincia: number | null;
  provincia_nombre: string | null;
  id_distrito: number | null;
  distrito_nombre: string | null;
  direccion: string;
  estado?: string;
}
