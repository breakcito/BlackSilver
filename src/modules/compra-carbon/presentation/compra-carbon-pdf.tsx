import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { formatNumber } from "../../../shared/functions/formatNumber";
import { numeroALetras } from "../../../shared/functions/numero-a-letras";
import type { CompraCarbonResumen } from "../service/compra-carbon.responses";
import type { RES_Empresa } from "../../../service/responses/empresa";
import type { ProveedorResponse } from "../../proveedores/service/proveedores.responses";

interface CompraCarbonPDFProps {
  compra: {
    cabecera: CompraCarbonResumen;
  };
  empresa: RES_Empresa;
  proveedor?: ProveedorResponse | null;
  urlLogoEmpresa?: string | null;
  colorPredominante?: string | null;
}

const formatPEN = (n: number) => `S/ ${formatNumber(n)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SIN_DATO = "—";

const ObservacionesBlock = ({ nombreEmpresa }: { nombreEmpresa: string }) => (
  <View style={STYLES.observaciones}>
    <Text style={STYLES.observacionesTitulo}>OBSERVACIONES:</Text>
    <Text style={STYLES.observacionesTexto}>
      {`1. El precio de la presente orden de compra / cotización preliminar es puesto en planta y/o depósito de ${nombreEmpresa}.\n`}
      {`1.1. La unidad de transporte debe llegar totalmente encarpada con lona, para evitar la contaminación ambiental durante el trayecto del despacho.\n`}
      {`1.2. El horario de recepción de unidades de transporte es de Lunes a Domingo de 7:00 am a 5:00 pm.\n`}
      {`1.3. El material transportado debe cumplir con todos los documentos legales de procedencia. La aceptación de esta orden de compra cuenta como declaración jurada de procedencia lícita.\n`}
      {`1.4. El material no será de uso energético.\n`}
      {`2. ${nombreEmpresa} dejará constancia de la recepción a través de sello y VoBo en la Guía de Remisión Remitente proporcionada por el proveedor.\n`}
      {`2.1. La presente orden de compra preliminar tiene una tolerancia de +/- 10% en tonelaje.`}
    </Text>
  </View>
);

const STYLES = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 26,
    paddingHorizontal: 28,
    fontSize: 9,
    color: "#18181b",
    fontFamily: "Helvetica",
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 14,
  },
  logoCol: { width: 148, justifyContent: "center", paddingRight: 10 },
  logo: { width: 70, height: 70, objectFit: "contain" },
  fiscalCol: { flex: 1, justifyContent: "center", paddingRight: 10 },
  fiscalLinea: { fontSize: 7.5, lineHeight: 1.45, color: "#27272a" },
  fiscalLabel: { fontSize: 7.5, fontWeight: 700, color: "#18181b" },
  emisorBox: {
    width: 186,
    borderWidth: 1,
    borderColor: "#18181b",
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  emisorRazon: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: "center",
  },
  emisorLinea: { fontSize: 8, textAlign: "center", lineHeight: 1.35 },
  emisorDoc: { fontSize: 9, fontWeight: 700, textAlign: "center" },
  emisorCorrelativo: { fontSize: 9, fontWeight: 700, textAlign: "center" },

  etiqueta: { fontSize: 8, fontWeight: 700, color: "#18181b" },
  dato: { fontSize: 8, color: "#27272a" },
  filaDato: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },

  tabla: { borderWidth: 1, borderColor: "#18181b" },
  tablaHeader: {
    flexDirection: "row",
    backgroundColor: "#e4e4e7",
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  th: { fontSize: 7.5, fontWeight: 700, textAlign: "center" },
  tablaFila: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 5,
    alignItems: "flex-start",
  },
  celdaCant: { width: "12%", textAlign: "center", fontSize: 8 },
  celdaUm: { width: "8%", textAlign: "center", fontSize: 8 },
  celdaCodigo: { width: "18%", textAlign: "center", paddingHorizontal: 4 },
  celdaFicha: { width: "26%", paddingHorizontal: 4, alignItems: "center" }, // Más ancho y alineado a la izquierda
  celdaPrecio: {
    width: "18%",
    textAlign: "center",
    paddingRight: 6,
    fontSize: 8,
  },
  celdaImporte: {
    width: "18%",
    textAlign: "center",
    paddingRight: 6,
    fontSize: 8,
  },

  fichaItem: {
    fontSize: 6.5,
    lineHeight: 1.25,
    color: "#27272a",
  },
  celdaCodigoValor: { fontSize: 8.5, fontWeight: 700 },
  celdaCodigoNombre: {
    fontSize: 7.5,
    color: "#52525b",
    marginTop: 2,
  },
  tablaEspacio: { flexGrow: 1, minHeight: 90 },

  cierreRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 10 },
  letrasCol: { flex: 1, paddingRight: 12 },
  letrasLabel: { fontSize: 7.5, fontWeight: 700, color: "#18181b" },
  letrasValor: { fontSize: 8, lineHeight: 1.4, color: "#27272a", marginTop: 2 },
  resumenCol: { width: 186 },
  resumenFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
  },
  resumenLabel: { fontSize: 7.5, color: "#52525b" },
  resumenValor: { fontSize: 7.5, color: "#18181b" },
  resumenTotalLabel: { fontSize: 9, fontWeight: 700, color: "#18181b" },
  resumenTotalValor: { fontSize: 9, fontWeight: 700, color: "#18181b" },

  observaciones: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#18181b",
    padding: 6,
  },
  observacionesTitulo: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#18181b",
    marginBottom: 3,
  },
  observacionesTexto: {
    fontSize: 6.5,
    lineHeight: 1.35,
    color: "#27272a",
  },
});

export const CompraCarbonPDF = ({
  compra,
  empresa,
  proveedor,
  urlLogoEmpresa,
}: CompraCarbonPDFProps) => {
  const { cabecera } = compra;

  const proveedorNombre =
    proveedor?.razon_social?.trim() || cabecera.proveedor || SIN_DATO;
  const proveedorDocumento =
    proveedor?.ruc ||
    cabecera.proveedor_ruc ||
    proveedor?.dni ||
    cabecera.proveedor_dni ||
    SIN_DATO;

  const direccionProveedor =
    proveedor?.direccion?.trim() || cabecera.proveedor_direccion || SIN_DATO;

  const fCreacion = dayjs(cabecera.created_at).locale("es");
  const fechaEmision = `${cap(fCreacion.format("dddd"))}, ${fCreacion.date()} de ${cap(
    fCreacion.format("MMMM"),
  )} de ${fCreacion.year()}`;

  const totalCotizado = Number(cabecera.total_cotizado || 0);
  const aplicaIgv = Boolean(cabecera.aplica_igv);
  const igvMonto = Number(cabecera.monto_igv_cotizado || 0);

  return (
    <Document title={`Orden de Compra Preliminar - ${cabecera.correlativo}`}>
      <Page size="A4" style={STYLES.page}>
        {/* ── Cabecera ── */}
        <View style={STYLES.cabecera}>
          <View style={STYLES.logoCol}>
            {urlLogoEmpresa ? (
              <Image src={urlLogoEmpresa} style={STYLES.logo} />
            ) : null}
          </View>

          <View style={STYLES.fiscalCol}>
            {empresa.domicilio_fiscal?.trim() ? (
              <Text style={STYLES.fiscalLinea}>
                <Text style={STYLES.fiscalLabel}>DOMICILIO FISCAL: </Text>
                {empresa.domicilio_fiscal}
              </Text>
            ) : null}
            <Text style={STYLES.fiscalLinea}>
              <Text style={STYLES.fiscalLabel}>FECHA: </Text>
              {fechaEmision}
            </Text>
          </View>

          <View style={STYLES.emisorBox}>
            <Text style={STYLES.emisorRazon}>
              {empresa.razon_social.toUpperCase()}
            </Text>
            <Text style={STYLES.emisorLinea}>{`RUC: ${empresa.ruc}`}</Text>
            <Text style={STYLES.emisorDoc}>ORDEN DE COMPRA</Text>
            <Text style={STYLES.emisorCorrelativo}>
              {`N° ${cabecera.correlativo}`}
            </Text>
          </View>
        </View>

        {/* ── Proveedor ── */}
        <View style={{ marginBottom: 12 }}>
          <View style={STYLES.filaDato}>
            <Text style={[STYLES.etiqueta, { width: 82 }]}>PROVEEDOR:</Text>
            <Text style={[STYLES.dato, { flex: 1 }]}>{proveedorNombre}</Text>
          </View>
          <View style={STYLES.filaDato}>
            <Text style={[STYLES.etiqueta, { width: 82 }]}>RUC / DNI:</Text>
            <Text style={[STYLES.dato, { flex: 1 }]}>{proveedorDocumento}</Text>
          </View>
          <View style={STYLES.filaDato}>
            <Text style={[STYLES.etiqueta, { width: 82 }]}>DIRECCIÓN:</Text>
            <Text style={[STYLES.dato, { flex: 1 }]}>{direccionProveedor}</Text>
          </View>
        </View>

        {/* ── Tabla de lo prometido ── */}
        <View style={STYLES.tabla}>
          <View style={STYLES.tablaHeader}>
            <Text style={[STYLES.th, { width: "12%" }]}>CANTIDAD</Text>
            <Text style={[STYLES.th, { width: "8%" }]}>UM</Text>
            <Text style={[STYLES.th, { width: "18%" }]}>CÓDIGO</Text>
            <Text style={[STYLES.th, { width: "26%" }]}>FICHA TÉCNICA</Text>
            <Text style={[STYLES.th, { width: "18%" }]}>P/U</Text>
            <Text style={[STYLES.th, { width: "18%" }]}>IMPORTE</Text>
          </View>

          <View style={STYLES.tablaFila}>
            <Text style={STYLES.celdaCant}>
              {formatNumber(Number(cabecera.toneladas_prometidas), 3)}
            </Text>
            <Text style={STYLES.celdaUm}>TN</Text>

            <View style={STYLES.celdaCodigo}>
              <Text style={STYLES.celdaCodigoValor}>
                {cabecera.tipo_carbon_prometido_codigo ||
                  cabecera.tipo_carbon_prometido}
              </Text>
            </View>

            {/* Ficha técnica mapeada en etiquetas <Text> */}
            <View style={STYLES.celdaFicha}>
              <View style={{ alignItems: "flex-start" }}>
                {Array.isArray(cabecera.ficha_tecnica) &&
                cabecera.ficha_tecnica.length > 0 ? (
                  cabecera.ficha_tecnica.map((item, idx) => (
                    <Text key={idx} style={STYLES.fichaItem}>
                      • {item}
                    </Text>
                  ))
                ) : (
                  <Text style={STYLES.fichaItem}>—</Text>
                )}
              </View>
            </View>

            <Text style={STYLES.celdaPrecio}>
              {formatPEN(Number(cabecera.precio_unitario_cotizado))}
            </Text>
            <Text style={STYLES.celdaImporte}>{formatPEN(totalCotizado)}</Text>
          </View>

          <View style={STYLES.tablaEspacio} />
        </View>

        {/* ── Importe en letras + resumen ── */}
        <View style={STYLES.cierreRow}>
          <View style={STYLES.letrasCol}>
            <Text style={STYLES.letrasLabel}>IMPORTE EN LETRAS:</Text>
            <Text style={STYLES.letrasValor}>
              {`${numeroALetras(totalCotizado)} ${totalCotizado === 1 ? "SOL" : "SOLES"}`}
            </Text>
          </View>

          <View style={STYLES.resumenCol}>
            <View style={STYLES.resumenFila}>
              <Text style={STYLES.resumenLabel}>
                {aplicaIgv
                  ? `IGV REF. (${formatNumber(cabecera.porcentaje_igv)}%)`
                  : "IGV"}
              </Text>
              <Text style={STYLES.resumenValor}>
                {aplicaIgv ? formatPEN(igvMonto) : "No aplica"}
              </Text>
            </View>
            <View style={STYLES.resumenFila}>
              <Text style={STYLES.resumenTotalLabel}>TOTAL</Text>
              <Text style={STYLES.resumenTotalValor}>
                {formatPEN(totalCotizado)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Observaciones ── */}
        <ObservacionesBlock nombreEmpresa={empresa.razon_social} />
      </Page>
    </Document>
  );
};
