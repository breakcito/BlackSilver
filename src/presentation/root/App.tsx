import { Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "../layouts/public.layout.tsx";
import { AuthLayout } from "../layouts/auth/auth.layout.tsx";
import { ProtectedRoute } from "./protectedRoute.tsx";
import { PublicRoute } from "./publicRoute.tsx";
import { LoginPage } from "../../modules/login/presentation/login.page.tsx";
import { HomePage } from "../pages/home/home.page.tsx";
import { ConcesionesPage } from "../../modules/concesiones/presentation/concesiones.page.tsx";
import { MinasPage } from "../../modules/minas-labores/presentation/minas.page.tsx";
import { EmpresasPage } from "../../modules/empresas/presentation/empresas.page.tsx";
import { CategoriasPage } from "../../modules/categorias/presentation/categorias.page.tsx";
import { PersonalPage } from "../../modules/personal/presentation/personal.page.tsx";
import { AlmacenesPage } from "../../modules/almacenes/presentation/almacenes.page.tsx";
import { ProductosPage } from "../../modules/productos/presentation/productos.page.tsx";
import OrganigramaPage from "../../modules/organigrama/presentation/organigrama.page.tsx";
import { LotesPage } from "../../modules/lotes-productos/presentation/lotes-page/lotes.page.tsx";
import { RequerimientosAlmacenAtencionPage } from "../../modules/requerimientos-almacen-atencion/presentation/atencion-requerimientos.page.tsx";
import { KardexProductosPage } from "../../modules/kardex-productos/presentation/kardex.page.tsx";
import { RolesPage } from "../../modules/roles/presentation/roles.page.tsx";
import { CuentasPage } from "../../modules/cuentas/presentation/cuentas.page.tsx";
import { SolicitudesReabastecimientoPage } from "../../modules/solicitudes-reabastecimiento/presentation/solicitudes-reabastecimiento.page.tsx";
import { PerfilPage } from "../../modules/perfil/presentation/perfil.page.tsx";
import { SolicitudesReabastecimientoAtencionPage } from "../../modules/solicitudes-reabastecimiento-atencion/presentation/atencion-solicitudes.page.tsx";
import { AtencionPrestamosPage } from "../../modules/prestamos-almacen-atencion/presentation/atencion-prestamos.page.tsx";
import { PrestamosAlmacenPage } from "../../modules/prestamos-almacen/presentation/prestamos-almacen.page.tsx";
import { ClientesPage } from "../../modules/clientes/presentation/clientes-page/clientes.page.tsx";
import { ProveedoresPage } from "../../modules/proveedores/presentation/proveedores-page/proveedores.page.tsx";
import CotizacionesPage from "../../modules/cotizaciones/presentation/cotizaciones.page.tsx";
import { OrdenesCompraPage } from "../../modules/ordenes-compra/presentation/ordenes-compra-page.tsx";
import { RecepcionTransferenciasOCPage } from "../../modules/ordenes-compra-recepcion-transferencias/presentation/oc-recepcion-transferencias.page.tsx";
import { ActivosFijosPage } from "../../modules/activos-fijos/presentation/activos-fijos.page.tsx";
import { useEffect } from "react";
import { onSocketEvent } from "../../service/_socket.ts";
import { useAuditoriaStore } from "../../stores/auditoria.store.ts";
import ModoAuditoriaPage from "../../modules/modo-auditoria/presentation/ModoAuditoriaPage.tsx";
import { ControlConsumoPage } from "../../modules/control-consumo/presentation/control-consumo.page.tsx";
import { ControlUsoPage } from "../../modules/control-uso/presentation/control-uso.page.tsx";
import { LoteMineralPage } from "../../modules/lote-mineral/presentation/lote-mineral.page.tsx";
import { MantenimientoPage } from "../../modules/mantenimiento-activos/presentation/mantenimiento.page.tsx";
import { ProduccionMineralPage } from "../../modules/produccion-mineral/presentation/produccion.page.tsx";
import ProgramacionHorariosPage from "../../modules/programacion-horarios/presentation/programacion-horarios.page.tsx";
import MarcarAsistenciaPage from "../../modules/asistencia/presentation/marcar-asistencia.page.tsx";
import AsistenciaPage from "../../modules/asistencia/presentation/asistencia.page.tsx";
import PlanillaPage from "../../modules/planilla/presentation/planilla.page.tsx";
import SystemPage from "../../modules/system/presentation/system.page.tsx";
import { CompraCarbonPage } from "../../modules/compra-carbon/presentation/compra-carbon-page.tsx";
import { KardexCarbonPage } from "../../modules/kardex-carbon/presentation/kardex-carbon-page.tsx";
import { TamizajeCarbonPage } from "../../modules/tamizaje-carbon/presentation/tamizaje-carbon-page.tsx";

export const App = () => {
  const { setModoAuditoria } = useAuditoriaStore();

  useEffect(() => {
    const channel = onSocketEvent(
      "global-audit-mode",
      "audit.mode.toggled",
      (data: { en_modo_auditable: boolean }) => {
        setModoAuditoria(data.en_modo_auditable);
      },
    );

    return () => {
      channel.stopListening(".audit.mode.toggled");
    };
  }, [setModoAuditoria]);

  return (
    <Routes>
      {/* Rutas publicas */}
      <Route
        element={
          <PublicRoute>
            <PublicLayout />
          </PublicRoute>
        }
      >
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Rutas ocultas (sin layout) */}
      <Route path="/about" element={<ModoAuditoriaPage />} />
      <Route path="/marcar-asistencia" element={<MarcarAsistenciaPage />} />

      {/* Rutas protegidas */}
      <Route
        element={
          <ProtectedRoute>
            <AuthLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/perfil" element={<PerfilPage />} />

        {/* Configuracion (rutas planas) */}
        <Route path="/trabajadores" element={<PersonalPage />} />
        <Route path="/areas-cargos" element={<OrganigramaPage />} />
        <Route path="/empresas" element={<EmpresasPage />} />
        <Route path="/almacenes" element={<AlmacenesPage />} />
        <Route path="/concesiones" element={<ConcesionesPage />} />
        <Route path="/minas" element={<MinasPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/cuentas" element={<CuentasPage />} />
        <Route path="/proveedores" element={<ProveedoresPage />} />
        <Route path="/clientes" element={<ClientesPage />} />

        {/* Logistica */}
        <Route path="/categorias" element={<CategoriasPage />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/activos" element={<ActivosFijosPage />} />
        <Route path="/lotes" element={<LotesPage />} />
        <Route path="/kardex" element={<KardexProductosPage />} />
        <Route path="/atencion-requerimientos" element={<RequerimientosAlmacenAtencionPage />} />
        <Route path="/solicitudes" element={<SolicitudesReabastecimientoPage />} />
        <Route path="/atencion-solicitudes" element={<SolicitudesReabastecimientoAtencionPage />} />
        <Route path="/prestamos" element={<PrestamosAlmacenPage />} />
        <Route path="/atencion-prestamos" element={<AtencionPrestamosPage />} />
        <Route path="/cotizaciones" element={<CotizacionesPage />} />
        <Route path="/ordenes-compra" element={<OrdenesCompraPage />} />
        <Route path="/recepcion-transferencias" element={<RecepcionTransferenciasOCPage />} />

        {/* Operaciones */}
        <Route path="/uso" element={<ControlUsoPage />} />
        <Route path="/mantenimiento" element={<MantenimientoPage />} />
        <Route path="/consumo" element={<ControlConsumoPage />} />
        <Route path="/lote-mineral" element={<LoteMineralPage />} />
        <Route path="/produccion-mineral" element={<ProduccionMineralPage />} />
        <Route path="/programacion-horarios" element={<ProgramacionHorariosPage />} />
        <Route path="/asistencia" element={<AsistenciaPage />} />
        <Route path="/planilla" element={<PlanillaPage />} />

        {/* Operaciones con Carbón */}
        <Route path="/compra-carbon" element={<CompraCarbonPage />} />
        <Route path="/kardex-carbon" element={<KardexCarbonPage />} />
        <Route path="/tamizaje-carbon" element={<TamizajeCarbonPage />} />

        {/* System module (oculto, solo URL directa) */}
        <Route path="/system" element={<SystemPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
};