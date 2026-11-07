import { Button, Select, TextInput } from "@mantine/core";
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { MESES } from "../../../../shared/variables/meses";

interface Props {
  busqueda: string;
  setBusqueda: (val: string) => void;
  openCreate: () => void;
  mes: number;
  anio: number;
  cambiarPeriodo: (mes: number, anio: number) => void;
  recargar: () => void;
  loading?: boolean;
}

const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(dayjs().year() - i),
  label: String(dayjs().year() - i),
}));

const inputClasses = {
  input:
    "bg-zinc-900/50 border-zinc-800 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 text-white placeholder:text-zinc-500 transition-all",
  label: "text-zinc-400 text-xs font-semibold mb-1 ml-1",
};

/**
 * Filtros del modulo de venta de mineral: periodo (mes y anio) y busqueda.
 */
export const VentaMineralFiltro = ({
  busqueda,
  setBusqueda,
  openCreate,
  mes,
  anio,
  cambiarPeriodo,
  recargar,
  loading,
}: Props) => (
  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end w-full animate-fade-in">
    <div className="w-full sm:w-44">
      <Select
        label="Mes"
        placeholder="Mes"
        data={MESES}
        value={String(mes)}
        onChange={(val) => val && cambiarPeriodo(Number(val), anio)}
        radius="lg"
        size="sm"
        allowDeselect={false}
        classNames={inputClasses}
      />
    </div>

    <div className="w-full sm:w-32">
      <Select
        label="Año"
        placeholder="Año"
        data={YEARS}
        value={String(anio)}
        onChange={(val) => val && cambiarPeriodo(mes, Number(val))}
        radius="lg"
        size="sm"
        allowDeselect={false}
        classNames={inputClasses}
      />
    </div>

    <div className="flex-1 min-w-50 w-full">
      <TextInput
        label="Busqueda"
        placeholder="Lote, molino, mina o labor..."
        leftSection={
          <MagnifyingGlassIcon className="w-4 h-4 text-zinc-500" />
        }
        value={busqueda}
        onChange={(e) => setBusqueda(e.currentTarget.value)}
        radius="lg"
        size="sm"
        classNames={inputClasses}
      />
    </div>

    <div className="flex items-end gap-2 shrink-0">
      <Button
        variant="default"
        onClick={recargar}
        loading={loading}
        radius="lg"
        size="sm"
        leftSection={<ArrowPathIcon className="w-4 h-4" />}
        className="h-[38px]"
      >
        Actualizar
      </Button>
      <Button
        leftSection={<PlusIcon className="size-5" />}
        onClick={openCreate}
        radius="lg"
        size="sm"
        className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 shrink-0 px-6 font-bold h-[38px] transition-all"
      >
        Nuevo despacho
      </Button>
    </div>
  </div>
);
