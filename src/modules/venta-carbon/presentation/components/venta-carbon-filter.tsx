import { Button, Select, TextInput } from "@mantine/core";
import {
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { MESES } from "../../../../shared/variables/meses";
import { BotonRecargar } from "../../../../presentation/utils/boton-recargar";
import { inputClasses } from "./input-classes";

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

export const VentaCarbonFilter = ({
  busqueda,
  setBusqueda,
  openCreate,
  mes,
  anio,
  cambiarPeriodo,
  recargar,
  loading,
}: Props) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end w-full animate-fade-in">
      <div className="w-full sm:w-44">
        <Select
          label="Mes"
          placeholder="Mes"
          leftSection={<CalendarDaysIcon className="w-4 h-4 text-zinc-400" />}
          data={MESES}
          value={String(mes)}
          onChange={(val) => val && cambiarPeriodo(Number(val), anio)}
          radius="lg"
          size="sm"
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
          classNames={inputClasses}
        />
      </div>

      <div className="flex-1 min-w-50 w-full">
        <TextInput
          label="Busqueda"
          placeholder="Correlativo, codigo, cliente o destino..."
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

      <div className="flex gap-2 items-center shrink-0">
        <BotonRecargar onReload={recargar} loading={loading} />
        <Button
          leftSection={<PlusIcon className="w-5 h-5" />}
          onClick={openCreate}
          radius="lg"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 px-6 font-semibold shrink-0"
        >
          Nueva Venta
        </Button>
      </div>
    </div>
  );
};
