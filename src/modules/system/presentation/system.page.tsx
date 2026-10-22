import { Tabs } from "@mantine/core";
import { useTitlePage } from "../../../hooks/useTitlePage";
import { UnidadesMedidaTab } from "./tabs/unidades-medida.tab";
import { ConversionesTab } from "./tabs/conversiones.tab";
import { NavegacionTab } from "./tabs/navegacion.tab";
import { ArchivosTab } from "./tabs/archivos.tab";
import { TipoCarbonTab } from "../../tipo-carbon/presentation/tabs/tipo-carbon.tab";
import { CalidadCarbonTab } from "../../tipo-carbon/presentation/tabs/calidad-carbon.tab";

const SystemPage = () => {
  useTitlePage("System");
  return (
    <div className="space-y-4">
      <Tabs defaultValue="unidades" color="indigo">
        <Tabs.List>
          <Tabs.Tab value="unidades">Unidades de Medida</Tabs.Tab>
          <Tabs.Tab value="conversiones">Conversiones</Tabs.Tab>
          <Tabs.Tab value="navegacion">Navegacion</Tabs.Tab>
          <Tabs.Tab value="archivos">Archivos</Tabs.Tab>
          <Tabs.Tab value="tipo-carbon">Tipos de Carbon</Tabs.Tab>
          <Tabs.Tab value="calidad-carbon">Calidad de Carbon</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="unidades" pt="md">
          <UnidadesMedidaTab />
        </Tabs.Panel>
        <Tabs.Panel value="conversiones" pt="md">
          <ConversionesTab />
        </Tabs.Panel>
        <Tabs.Panel value="navegacion" pt="md">
          <NavegacionTab />
        </Tabs.Panel>
        <Tabs.Panel value="archivos" pt="md">
          <ArchivosTab />
        </Tabs.Panel>
        <Tabs.Panel value="tipo-carbon" pt="md">
          <TipoCarbonTab />
        </Tabs.Panel>
        <Tabs.Panel value="calidad-carbon" pt="md">
          <CalidadCarbonTab />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default SystemPage;