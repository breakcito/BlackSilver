import { SegmentedControl } from "@mantine/core";
import { useState } from "react";
import { IconScale, IconStack2 } from "@tabler/icons-react";

import { useTitlePage } from "../../../hooks/useTitlePage";
import { PanelZarandeo } from "./panels/panel-zarandeo";
import { PanelBlending } from "./panels/panel-blending";

/**
 * Produccion de carbon: ZARANDEO y BLENDING.
 *
 * El zarandeo separa el carbon por granulometria; el blending mezcla varias
 * calidades del mismo tipo de carbon y produce un lote despachable. Son dos
 * operaciones distintas sobre el mismo stock, asi que conviven en la misma
 * pantalla y se alternan con un selector.
 */
export const TamizajeCarbonPage = () => {
  useTitlePage("Producción de Carbón");

  const [vista, setVista] = useState<"zarandeo" | "blending">("zarandeo");

  return (
    <div className="space-y-5 animate-fade-in text-zinc-100">
      <div className="flex items-center justify-center">
        <SegmentedControl
          value={vista}
          onChange={(valor) => setVista(valor as "zarandeo" | "blending")}
          size="xs"
          radius="lg"
          data={[
            {
              value: "zarandeo",
              label: (
                <span className="flex items-center gap-1.5">
                  <IconScale size={14} />
                  Zarandeo
                </span>
              ),
            },
            {
              value: "blending",
              label: (
                <span className="flex items-center gap-1.5">
                  <IconStack2 size={14} />
                  Blending
                </span>
              ),
            },
          ]}
        />
      </div>

      {vista === "zarandeo" ? <PanelZarandeo /> : <PanelBlending />}
    </div>
  );
};
