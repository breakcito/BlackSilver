import { Text } from "@mantine/core";
import { BanknotesIcon } from "@heroicons/react/24/outline";

interface Props {
  busqueda: string;
}

export const EmptyStateVentaCarbon = ({ busqueda }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center p-20 border border-dashed border-zinc-800 rounded-4xl bg-zinc-900/10 backdrop-blur-sm">
      <BanknotesIcon className="w-12 h-12 text-zinc-700 mb-4" />
      <Text
        size="sm"
        fw={700}
        className="text-zinc-400 uppercase tracking-widest"
      >
        {busqueda ? "Sin resultados" : "No hay ventas de carbon"}
      </Text>
      <Text size="xs" c="dimmed" className="mt-1">
        {busqueda
          ? "Intenta con otro termino."
          : "Comience registrando una nueva venta de carbon."}
      </Text>
    </div>
  );
};
