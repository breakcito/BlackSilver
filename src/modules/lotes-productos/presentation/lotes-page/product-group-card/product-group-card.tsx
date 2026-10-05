import { type DataTableColumn } from "mantine-datatable";
import { Text } from "@mantine/core";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { DataTableEstandar } from "../../../../../presentation/utils/datatable-estandar";
import type { RES_Lote } from "../../../service/lotes.responses";
import { useProductGroupSelection } from "../../../hooks/useProductGroupSelection";
import { ProductGroupHeader } from "./product-group-header";

export interface GroupedProduct {
  id_producto: number;
  producto: string;
  categoria: string | null;
  unidad_medida_base: string;
  stock_minimo_base: number;
  lotes: RES_Lote[];
  total_stock_base: number;
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  es_perecible: boolean;
  es_auditable: boolean;
}

interface ProductGroupCardProps {
  product: GroupedProduct;
  columns: DataTableColumn<RES_Lote>[];
  loading: boolean;
  onPrint: (lotes: RES_Lote | RES_Lote[]) => void;
  selection: {
    selectedRecords: RES_Lote[];
    setSelectedRecords: (
      val: RES_Lote[] | ((prev: RES_Lote[]) => RES_Lote[]),
    ) => void;
  };
}

/**
 * Sub-fila que muestra la descripcion o referencia opcional de un lote.
 * Se renderiza como contenido expandido dentro de la fila correspondiente
 * del DataTable; aparece solo si el lote tiene descripcion.
 */
const DescripcionLote = ({ descripcion }: { descripcion: string }) => {
  return (
    <div className="flex items-start gap-2 px-4 py-2 bg-zinc-950/60 border-t border-zinc-800/60">
      <div className="shrink-0 p-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/30">
        <DocumentTextIcon className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <Text
          size="9px"
          fw={800}
          c="zinc.5"
          className="uppercase tracking-[0.18em] leading-none"
        >
          Descripción o referencia
        </Text>
        <Text
          size="xs"
          c="zinc.2"
          className="leading-snug break-words whitespace-pre-wrap"
        >
          {descripcion}
        </Text>
      </div>
    </div>
  );
};

export const ProductGroupCard = ({
  product,
  columns,
  loading,
  onPrint,
  selection,
}: ProductGroupCardProps) => {
  const { enhancedColumns } = useProductGroupSelection({
    lotes: product.lotes,
    columns,
    onPrint,
    selection,
  });

  return (
    <div className="bg-zinc-900/65 border border-zinc-800 rounded-[24px] shadow-2xl overflow-hidden flex flex-col backdrop-blur-md">
      <ProductGroupHeader product={product} />

      <div className="relative shadow-inner">
        <DataTableEstandar
          idAccessor="id_lote"
          columns={enhancedColumns}
          records={product.lotes}
          loading={loading}
          initialPageSize={5}
          minHeight={0}
          rowExpansion={{
            trigger: "always",
            expandable: ({ record }: { record: RES_Lote }) =>
              Boolean(
                record.descripcion && record.descripcion.trim().length > 0,
              ),
            content: ({ record }: { record: RES_Lote }) =>
              record.descripcion && record.descripcion.trim().length > 0 ? (
                <DescripcionLote descripcion={record.descripcion} />
              ) : null,
          }}
        />
      </div>
    </div>
  );
};
