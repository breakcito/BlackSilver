import { Button, Select, TextInput } from "@mantine/core";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { getCoincidencias } from "../../../../shared/functions/get-coincidencias";
import {
  BalanceAmbito,
  BalanceTipo,
} from "../../../../shared/enums/balances/balances";
import type { RES_OrigenBalance } from "../../service/balances.responses";

interface Props {
  ambito: string | null;
  setAmbito: (valor: string | null) => void;
  tipo: string | null;
  setTipo: (valor: string | null) => void;
  origen: string | null;
  setOrigen: (valor: string | null) => void;
  busqueda: string;
  setBusqueda: (valor: string) => void;
  origenes: RES_OrigenBalance[];
  hayFiltros: boolean;
  limpiarFiltros: () => void;
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
 * Filtros del detalle de movimientos.
 *
 * Se aplican SOBRE LA INFORMACION YA CARGADA: no vuelven a pedirla al
 * servidor, asi que recalculan al instante mientras el usuario escribe.
 */
export const BalancesFiltrosDetalle = ({
  ambito,
  setAmbito,
  tipo,
  setTipo,
  origen,
  setOrigen,
  busqueda,
  setBusqueda,
  origenes,
  hayFiltros,
  limpiarFiltros,
}: Props) => {
  const [busquedaOrigen, setBusquedaOrigen] = useState("");

  /**
   * Las categorias se filtran con busqueda tolerante: el usuario escribe
   * "flete", "carbon" o "mant" y encuentra la categoria aunque el nombre
   * completo sea largo.
   */
  const origenesVisibles = useMemo(() => {
    const q = busquedaOrigen.trim();
    if (!q) return origenes;
    return getCoincidencias(origenes, q, {
      keys: ["label"],
      fuseThreshold: 0.4,
    }).map((r) => r.item);
  }, [origenes, busquedaOrigen]);

  const opcionesOrigen = useMemo(
    () => origenesVisibles.map((o) => ({ value: o.value, label: o.label })),
    [origenesVisibles],
  );

  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 w-full">
      <div className="w-full md:w-32">
        <Select
          label="Ámbito"
          placeholder="Todos"
          data={[
            { value: BalanceAmbito.Mineral, label: "Mineral" },
            { value: BalanceAmbito.Carbon, label: "Carbón" },
          ]}
          value={ambito}
          onChange={setAmbito}
          clearable
          radius="lg"
          size="sm"
          classNames={inputClasses}
        />
      </div>

      <div className="w-full md:w-36">
        <Select
          label="Tipo"
          placeholder="Todos"
          data={[
            { value: BalanceTipo.Ingreso, label: "Solo ingresos" },
            { value: BalanceTipo.Egreso, label: "Solo egresos" },
          ]}
          value={tipo}
          onChange={setTipo}
          clearable
          radius="lg"
          size="sm"
          classNames={inputClasses}
        />
      </div>

      <div className="w-full md:w-56">
        <Select
          label="Categoría"
          placeholder="Todas"
          data={opcionesOrigen}
          value={origen}
          onChange={setOrigen}
          onSearchChange={setBusquedaOrigen}
          searchValue={busquedaOrigen}
          searchable
          clearable
          nothingFoundMessage="Sin coincidencias"
          radius="lg"
          size="sm"
          classNames={inputClasses}
          comboboxProps={{
            withinPortal: true,
            zIndex: 9999,
            transitionProps: { transition: "pop", duration: 200 },
          }}
        />
      </div>

      <div className="flex-1 min-w-48 w-full">
        <TextInput
          label="Búsqueda"
          placeholder="Descripción, referencia, molino, placa..."
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

      {hayFiltros && (
        <Button
          size="sm"
          radius="lg"
          variant="subtle"
          color="gray"
          onClick={limpiarFiltros}
          className="shrink-0"
        >
          Limpiar
        </Button>
      )}
    </div>
  );
};
