import { Select } from "@mantine/core";

import { MESES } from "../../../../shared/variables/meses";

interface Props {
  mes: number;
  anio: number;
  onCambio: (mes: number, anio: number) => void;
  anios: number[];
}

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white transition-all h-8 text-xs",
  dropdown:
    "bg-zinc-950 border-zinc-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl",
  option:
    "text-zinc-300 hover:bg-zinc-800 hover:text-white data-[selected]:bg-indigo-600 data-[selected]:text-white font-medium transition-colors",
};

/**
 * Control de periodo de un indicador.
 *
 * Va en la cabecera del bloque que filtra, no en una barra global: asi se
 * sabe de entrada que filtro mueve a cada indicador, y cada bloque se
 * maneja por su cuenta.
 */
export const DashboardPeriodo = ({ mes, anio, onCambio, anios }: Props) => {
  const dataAnios = anios.map((a) => ({ value: String(a), label: String(a) }));

  return (
    <div className="flex items-center gap-1.5">
      <Select
        aria-label="Mes"
        data={MESES}
        value={String(mes)}
        onChange={(valor) => valor && onCambio(Number(valor), anio)}
        radius="lg"
        size="xs"
        w={92}
        classNames={inputClasses}
        comboboxProps={{ withinPortal: true }}
      />

      <Select
        aria-label="Año"
        data={dataAnios}
        value={String(anio)}
        onChange={(valor) => valor && onCambio(mes, Number(valor))}
        radius="lg"
        size="xs"
        w={76}
        classNames={inputClasses}
        comboboxProps={{ withinPortal: true }}
      />
    </div>
  );
};
