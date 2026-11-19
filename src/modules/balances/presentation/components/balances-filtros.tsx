import { Divider, Select } from "@mantine/core";
import dayjs from "dayjs";

import { BotonRecargar } from "../../../../presentation/utils/boton-recargar";
import { MESES } from "../../../../shared/variables/meses";

interface Props {
  mes: number;
  setMes: (mes: number) => void;
  anio: number;
  setAnio: (anio: number) => void;
  mesComparativo: number;
  anioComparativo: number;
  cambiarComparacion: (mes: number, anio: number) => void;
  loading: boolean;
  onRecargar: () => void;
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

const YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = dayjs().year() - 4 + i;
  return { value: String(y), label: String(y) };
});

/**
 * Barra de control del balance: el periodo, el periodo con el que se
 * compara y la moneda.
 *
 * Sigue el mismo patron que el resto de modulos (una fila plana de
 * controles, sin tarjeta envolvente). Los filtros del detalle van con el
 * detalle, en su propia pestana.
 */
export const BalancesFiltros = ({
  mes,
  setMes,
  anio,
  setAnio,
  mesComparativo,
  anioComparativo,
  cambiarComparacion,
  loading,
  onRecargar,
}: Props) => {
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
          data={YEARS}
          value={String(anio)}
          onChange={(valor) => valor && setAnio(Number(valor))}
          radius="lg"
          size="sm"
          classNames={inputClasses}
        />
      </div>

      <Divider orientation="vertical" className="hidden md:block my-2" />

      <div className="w-full md:w-36">
        <Select
          label="Comparar mes"
          placeholder="Mes"
          data={MESES}
          value={String(mesComparativo)}
          onChange={(valor) =>
            valor && cambiarComparacion(Number(valor), anioComparativo)
          }
          radius="lg"
          size="sm"
          classNames={inputClasses}
        />
      </div>

      <div className="w-full md:w-28">
        <Select
          label="Comparar año"
          placeholder="Año"
          data={YEARS}
          value={String(anioComparativo)}
          onChange={(valor) =>
            valor && cambiarComparacion(mesComparativo, Number(valor))
          }
          radius="lg"
          size="sm"
          classNames={inputClasses}
        />
      </div>

      <div className="flex-1" />

      <div className="shrink-0">
        <BotonRecargar onReload={onRecargar} loading={loading} />
      </div>
    </div>
  );
};
