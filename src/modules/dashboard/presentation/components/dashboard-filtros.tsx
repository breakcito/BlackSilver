import { Divider, Select, Text } from "@mantine/core";

import { BotonRecargar } from "../../../../presentation/utils/boton-recargar";
import type { RES_Almacen } from "../../../../service/responses/almacen";
import { MESES } from "../../../../shared/variables/meses";

interface Props {
  mes: number;
  setMes: (mes: number) => void;
  anio: number;
  setAnio: (anio: number) => void;
  anios: number[];
  idAlmacen: number | null;
  setIdAlmacen: (idAlmacen: number | null) => void;
  busquedaAlmacen: string;
  setBusquedaAlmacen: (busqueda: string) => void;
  almacenesVisibles: RES_Almacen[];
  loading: boolean;
  onRecargar: () => void;
  /** Etiqueta del periodo vigente (ej. "Noviembre 2026"). */
  etiquetaPeriodo: string;
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
};

/**
 * Barra de control del dashboard.
 *
 * El periodo mueve solo a los indicadores de flujo y el almacen mueve a
 * todos: cada bloque dice cuales filtros lo afectan, asi que la barra no
 * necesita explicarse.
 */
export const DashboardFiltros = ({
  mes,
  setMes,
  anio,
  setAnio,
  anios,
  idAlmacen,
  setIdAlmacen,
  busquedaAlmacen,
  setBusquedaAlmacen,
  almacenesVisibles,
  loading,
  onRecargar,
  etiquetaPeriodo,
}: Props) => {
  const dataAnios = anios.map((a) => ({ value: String(a), label: String(a) }));

  const dataAlmacenes = [
    { value: "todos", label: "Todos los almacenes" },
    ...almacenesVisibles.map((a) => ({
      value: String(a.id_almacen),
      label: a.nombre,
    })),
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 w-full animate-fade-in">
      <div className="w-full md:w-32">
        <Select
          label="Mes"
          placeholder="Mes"
          data={MESES}
          value={String(mes)}
          onChange={(valor) => valor && setMes(Number(valor))}
          radius="lg"
          size="sm"
          classNames={inputClasses}
        />
      </div>

      <div className="w-full md:w-28">
        <Select
          label="Año"
          placeholder="Año"
          data={dataAnios}
          value={String(anio)}
          onChange={(valor) => valor && setAnio(Number(valor))}
          radius="lg"
          size="sm"
          classNames={inputClasses}
        />
      </div>

      <Divider orientation="vertical" className="hidden md:block my-2" />

      <div className="w-full md:w-64">
        <Select
          label="Almacén"
          placeholder="Almacén"
          data={dataAlmacenes}
          value={idAlmacen === null ? "todos" : String(idAlmacen)}
          onChange={(valor) =>
            setIdAlmacen(valor === "todos" || valor === null ? null : Number(valor))
          }
          searchable
          searchValue={busquedaAlmacen}
          onSearchChange={setBusquedaAlmacen}
          nothingFoundMessage="Sin coincidencias"
          radius="lg"
          size="sm"
          classNames={inputClasses}
        />
      </div>

      <div className="flex-1" />

      <Text size="xs" className="hidden lg:block text-zinc-500 pb-2">
        {etiquetaPeriodo}
      </Text>

      <div className="shrink-0">
        <BotonRecargar onReload={onRecargar} loading={loading} />
      </div>
    </div>
  );
};
