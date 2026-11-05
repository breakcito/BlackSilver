import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import { formatNumber } from "../../shared/functions/formatNumber";
import { MONEDAS } from "../../shared/variables/monedas";
import type {
  RES_OrdenCompra,
  RES_OrdenCompraDetalle,
} from "../../service/responses/ordenes-compra/orden-compra";
import { TipoDespachoCompra } from "../../shared/enums/_generic/tipo-despacho-compra";
import {
  darkenHex,
  getPdfAccent,
  lightenHex,
} from "./pdf/pdf-theme";

interface OrdenCompraPDFProps {
  orden: RES_OrdenCompra;
  detalles: RES_OrdenCompraDetalle[];
  colorPredominante?: string | null;
}

export const OrdenCompraPDF = ({
  orden,
  detalles,
  colorPredominante,
}: OrdenCompraPDFProps) => {
  const accent = getPdfAccent(colorPredominante);
  const accentDark = darkenHex(accent, 0.3);
  const accentVeryDark = darkenHex(accent, 0.45);
  const accentSoft = lightenHex(accent, 0.55);

  const styles = StyleSheet.create({
    page: {
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 30,
      fontSize: 9,
      color: "#18181b",
      fontFamily: "Helvetica",
    },
    logoContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: accentSoft,
      paddingBottom: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: accent,
      paddingBottom: 8,
    },
    companyName: {
      fontSize: 12,
      fontWeight: 700,
      color: "#18181b",
    },
    title: {
      fontSize: 18,
      fontWeight: 700,
      color: accent,
      textAlign: "right",
    },
    documentNumber: {
      fontSize: 12,
      fontWeight: 700,
      textAlign: "right",
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 8,
      fontWeight: 700,
      color: accentVeryDark,
      textTransform: "uppercase",
      letterSpacing: 1,
      borderLeftWidth: 3,
      borderLeftColor: accent,
      paddingLeft: 6,
      marginBottom: 6,
      marginTop: 10,
    },
    row: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: accentSoft,
      paddingVertical: 6,
      alignItems: "center",
    },
    tableHeader: {
      backgroundColor: accentVeryDark,
      color: "#ffffff",
      fontWeight: 700,
      borderRadius: 2,
    },
    col0: { width: "5%", textAlign: "center" },
    col1: { width: "10%", textAlign: "center" },
    col2: { width: "10%", textAlign: "center" },
    col3: { width: "45%", textAlign: "left", paddingLeft: 8 },
    col4: { width: "15%", textAlign: "right", paddingRight: 8 },
    col5: { width: "15%", textAlign: "right", paddingRight: 8 },
    totalsContainer: {
      marginTop: 15,
      alignSelf: "flex-end",
      width: "35%",
      backgroundColor: accentSoft,
      padding: 10,
      borderRadius: 4,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 2,
    },
    totalLabel: {
      fontWeight: 700,
      color: accentVeryDark,
    },
    grandTotal: {
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: accent,
      paddingTop: 6,
      fontSize: 11,
      color: accentVeryDark,
      fontWeight: 700,
    },
    signatureSection: {
      marginTop: 40,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    signatureBox: {
      width: "30%",
      alignItems: "center",
    },
    signatureLine: {
      borderTopWidth: 1,
      borderTopColor: accentVeryDark,
      width: "100%",
      marginBottom: 4,
    },
    signatureName: { fontSize: 8, fontWeight: 700, textAlign: "center" },
    signatureRole: {
      fontSize: 8,
      color: accentDark,
      textAlign: "center",
      textTransform: "uppercase",
    },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 30,
      right: 30,
      textAlign: "center",
      color: accentDark,
      fontSize: 8,
      borderTopWidth: 1,
      borderTopColor: accentSoft,
      paddingTop: 8,
    },
  });


  const symbol =
    Object.values(MONEDAS).find((m) => m.label === orden.moneda)?.symbol ??
    "S/";

  return (
    <Document title={`Orden de Compra - ${orden.correlativo}`}>
      <Page size="A4" style={styles.page}>
        {/* ── Banda de logo superior (izquierda) ── */}
        {orden.empresa_logo && (() => {
          const isCupper = orden.empresa.toUpperCase().includes("CUPPER") || orden.empresa.toUpperCase().includes("HANNIA");
          return (
            <View style={[styles.logoContainer, { alignItems: "center" }]}>
              <Image
                src={orden.empresa_logo}
                style={
                  isCupper
                    ? { width: 70, height: 70, objectFit: "contain" }
                    : { width: 110, height: 40, objectFit: "contain" }
                }
              />
              <Text style={{ fontSize: 8, color: accentDark }}>
                Documento Oficial de Orden de Compra
              </Text>
            </View>
          );
        })()}

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1.5 }}>
            <Text style={{ fontSize: 8, color: accentDark, marginBottom: 2 }}>
              EMITIR FACTURA A NOMBRE DE:
            </Text>
            <Text style={styles.companyName}>
              {orden.empresa.toUpperCase()}
            </Text>
            {orden.empresa_ruc && (
              <Text style={{ fontSize: 8, color: "#52525b", marginTop: 2 }}>
                RUC: {orden.empresa_ruc}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={styles.title}>ORDEN DE COMPRA</Text>
            <Text style={styles.documentNumber}>N° {orden.correlativo}</Text>
            <Text style={{ fontSize: 8, color: "#52525b", marginTop: 4 }}>
              Fecha: {dayjs(orden.fecha_hora_orden).format("DD/MM/YYYY")}
            </Text>
          </View>
        </View>

        {/* Proveedor / Emisión */}
        <View style={{ flexDirection: "row", marginBottom: 15, gap: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: accentSoft,
              padding: 8,
              borderRadius: 4,
            }}
          >
            <Text style={styles.sectionTitle}>PROVEEDOR</Text>
            <Text style={{ fontWeight: 700, fontSize: 10 }}>
              {orden.proveedor}
            </Text>
            {orden.documento_proveedor && (
              <Text style={{ fontSize: 8, color: accentDark, marginTop: 2 }}>
                RUC / Doc: {orden.documento_proveedor}
              </Text>
            )}
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: accentSoft,
              padding: 8,
              borderRadius: 4,
            }}
          >
            <Text style={styles.sectionTitle}>REFERENCIA</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 2,
              }}
            >
              <Text style={{ fontSize: 8 }}>Cotización:</Text>
              <Text style={{ fontSize: 8, fontWeight: 700 }}>
                {orden.correlativo_cotizacion}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 8 }}>Moneda:</Text>
              <Text style={{ fontSize: 8, fontWeight: 700 }}>
                {orden.moneda}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabla */}
        {/* Tabla Agrupada */}
        <View style={{ marginBottom: 15 }}>
          {(() => {
            const agrupados = detalles.reduce(
              (acc, det) => {
                const lugar =
                  det.tipo_despacho === TipoDespachoCompra.Recojo &&
                    det.lugar_recojo
                    ? ` [Lugar: ${det.lugar_recojo}]`
                    : "";
                const txtDias =
                  det.tiempo_entrega_dias === 1
                    ? "1 día"
                    : `${det.tiempo_entrega_dias} días`;
                const destinoLabel = det.mina_destino
                  ? `Mina: ${det.mina_destino}`
                  : `Almacén: ${det.almacen_recepcionista}`;
                const key = `DESTINO: ${destinoLabel} | DESPACHO: ${det.tipo_despacho} (Entrega: ${txtDias})${lugar}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(det);
                return acc;
              },
              {} as Record<string, typeof detalles>,
            );

            return Object.entries(agrupados).map(([grupoName, items]) => (
              <View key={grupoName} style={{ marginBottom: 15 }}>
                <Text style={styles.sectionTitle}>
                  {grupoName.toUpperCase()}
                </Text>
                <View style={[styles.row, styles.tableHeader]}>
                  <Text style={styles.col0}>#</Text>
                  <Text style={styles.col3}>Descripción</Text>
                  <Text style={styles.col2}>U.M.</Text>
                  <Text style={styles.col1}>Cant.</Text>
                  <Text style={styles.col4}>P. Unit.</Text>
                  <Text style={styles.col5}>Total</Text>
                </View>
                {items.map((det, idx) => {
                  const hasEquivalence =
                    det.id_unidad_medida_base !== det.id_unidad_medida_oc;
                  const subtotalItem =
                    det.cantidad_requerida * det.precio_unitario;

                  return (
                    <View key={det.id_orden_compra_detalle} style={styles.row}>
                      <Text style={styles.col0}>{idx + 1}</Text>
                      <View style={styles.col3}>
                        <Text style={{ fontWeight: 700 }}>{det.producto}</Text>
                        {hasEquivalence && (
                          <Text
                            style={{
                              fontSize: 8,
                              color: "#71717a",
                              marginTop: 2,
                            }}
                          >
                            Eq: {formatNumber(det.contenido_por_presentacion)}{" "}
                            {det.unidad_medida_base_abv} x{" "}
                            {det.unidad_medida_oc_abv}
                          </Text>
                        )}
                        {det.comentario && (
                          <Text
                            style={{
                              fontSize: 8,
                              color: "#71717a",
                              marginTop: hasEquivalence ? 1 : 2,
                            }}
                          >
                            Obs: {det.comentario}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.col2}>
                        {det.unidad_medida_oc_abv}
                      </Text>
                      <Text style={styles.col1}>
                        {formatNumber(det.cantidad_requerida)}
                      </Text>
                      <Text style={styles.col4}>
                        {symbol} {formatNumber(det.precio_unitario)}
                      </Text>
                      <Text style={styles.col5}>
                        {symbol} {formatNumber(subtotalItem)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ));
          })()}
        </View>

        {/* Totales */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={{ fontWeight: 700 }}>
              {symbol}{" "}
              {formatNumber(
                orden.total_antes_igv -
                Number(orden.costo_flete) -
                Number(orden.otros_gastos),
              )}
            </Text>
          </View>
          {Number(orden.costo_flete) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Flete:</Text>
              <Text style={{ fontWeight: 700 }}>
                {symbol} {formatNumber(orden.costo_flete)}
              </Text>
            </View>
          )}
          {Number(orden.otros_gastos) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Otros:</Text>
              <Text style={{ fontWeight: 700 }}>
                {symbol} {formatNumber(orden.otros_gastos)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              IGV ({orden.porcentaje_igv}%):
            </Text>
            <Text style={{ fontWeight: 700 }}>
              {symbol} {formatNumber(orden.monto_igv)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>TOTAL GENERAL:</Text>
            <Text>
              {symbol} {formatNumber(orden.total_despues_igv)}
            </Text>
          </View>
        </View>

        {/* Observaciones Finales */}
        {orden.observacion && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
            <Text
              style={{
                fontSize: 8,
                fontStyle: "italic",
                color: accentDark,
                paddingLeft: 6,
              }}
            >
              {orden.observacion}
            </Text>
          </View>
        )}

        {/* Firmas */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>AUTORIZADO POR:</Text>
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>
                Rosa Maria Henriquez Acosta
              </Text>
              <Text style={styles.signatureRole}>Gerencia General</Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>
                Jhoselyn Henriquez Acosta
              </Text>
              <Text style={styles.signatureRole}>Jefe de Logística</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 15 }}>
          <Text style={styles.sectionTitle}>ELABORADO POR:</Text>
          <View style={[styles.signatureSection, { justifyContent: "center" }]}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>
                Ana Cecilia Haro Culquitante
              </Text>
              <Text style={styles.signatureRole}>Contabilidad</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Este documento es una Orden de Compra oficial de Cupper & Hannia S.A.C.
          </Text>
          <Text>
            Generado automáticamente el {dayjs().format("DD/MM/YYYY HH:mm:ss")}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
