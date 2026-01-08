import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontSize: 10, 
    color: '#333',
  },
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE', 
    paddingBottom: 10 
  },
  logoSection: { width: '50%' },
  logo: { width: 60, height: 60, objectFit: 'contain', marginBottom: 10 },
  companyName: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  
  // Meta data (Derecha)
  metaSection: { width: '40%', textAlign: 'right' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  label: { fontSize: 8, color: '#666', marginTop: 3 },
  value: { fontSize: 10, marginBottom: 5 },
  
  // Tabla
  table: { display: 'flex', width: 'auto', marginTop: 20, borderWidth: 1, borderColor: '#EEE' },
  tableRow: { 
    margin: 'auto', 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE', 
    minHeight: 25, 
    alignItems: 'center' 
  },
  tableHeader: { backgroundColor: '#F9FAFB', fontWeight: 'bold' },
  tableCol1: { width: '50%', padding: 5 },
  tableCol2: { width: '15%', padding: 5, textAlign: 'center' },
  tableCol3: { width: '15%', padding: 5, textAlign: 'right' },
  tableCol4: { width: '20%', padding: 5, textAlign: 'right' },
  
  // Totales
  totalsSection: { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end' },
  totalRow: { flexDirection: 'row', marginBottom: 5 },
  totalLabel: { width: 100, textAlign: 'right', paddingRight: 10, color: '#666' },
  totalValue: { width: 100, textAlign: 'right', fontWeight: 'bold' },
  grandTotal: { 
    fontSize: 14, 
    marginTop: 5, 
    borderTopWidth: 1, 
    borderTopColor: '#333', 
    paddingTop: 5 
  },

  // Footer
  footer: { 
    position: 'absolute', 
    bottom: 30, 
    left: 40, 
    right: 40, 
    textAlign: 'center', 
    fontSize: 8, 
    color: '#999', 
    borderTopWidth: 1, 
    borderTopColor: '#EEE', 
    paddingTop: 10 
  }
});

// Tipos de datos que recibe el PDF
interface Props {
  quote: any;
  items: any[];
  profile: any;
}

// Helper para evitar errores con toLocaleString en valores nulos
const formatCurrency = (amount: any) => {
    const num = Number(amount) || 0;
    return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const QuoteDocument = ({ quote, items, profile }: Props) => {
  const normalizeTaxRate = (value: any) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
  };

  // Cálculos de seguridad
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = safeItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
  const taxRate = normalizeTaxRate(quote?.tax_rate);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Validación estricta de imagen
  const logoUrl = profile?.company_logo_url;
  // Solo mostramos imagen si es un string válido y empieza con http (ignora file:// o blob:)
  const hasLogo = logoUrl && typeof logoUrl === 'string' && logoUrl.startsWith('http');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {/* Protección Anti-Crash para Imagen */}
            {hasLogo ? (
               <Image src={logoUrl} style={styles.logo} />
            ) : null}
            
            {/* Protección Anti-Crash para Textos (|| '') */}
            <Text style={styles.companyName}>{profile?.business_name || 'SERVICIO TÉCNICO'}</Text>
            <Text>{profile?.full_name || ''}</Text>
            <Text>{profile?.email || ''}</Text>
            <Text>{profile?.phone || ''}</Text>
          </View>

          <View style={styles.metaSection}>
            <Text style={styles.title}>PRESUPUESTO</Text>
            
            <Text style={styles.label}>REFERENCIA</Text>
            <Text style={styles.value}>#{quote?.id ? quote.id.slice(0, 8).toUpperCase() : '---'}</Text>
            
            <Text style={styles.label}>FECHA DE EMISIÓN</Text>
            <Text style={styles.value}>
                {quote?.created_at ? new Date(quote.created_at).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR')}
            </Text>
            
            <Text style={styles.label}>CLIENTE</Text>
            <Text style={styles.value}>{quote?.client_name || 'Consumidor Final'}</Text>
            <Text style={styles.value}>{quote?.client_address || ''}</Text>
          </View>
        </View>

        {/* TABLA DE ÍTEMS */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCol1}>DESCRIPCIÓN</Text>
            <Text style={styles.tableCol2}>CANT.</Text>
            <Text style={styles.tableCol3}>UNITARIO</Text>
            <Text style={styles.tableCol4}>TOTAL</Text>
          </View>

          {safeItems.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              {/* IMPORTANTE: Usamos || '' para evitar undefined */}
              <Text style={styles.tableCol1}>{item.description || 'Ítem sin nombre'}</Text>
              <Text style={styles.tableCol2}>{item.quantity || 1}</Text>
              <Text style={styles.tableCol3}>{formatCurrency(item.unit_price)}</Text>
              <Text style={styles.tableCol4}>{formatCurrency((item.quantity || 1) * (item.unit_price || 0))}</Text>
            </View>
          ))}
        </View>

        {/* SECCIÓN DE TOTALES */}
        <View style={styles.totalsSection}>
          <View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            {taxRate > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA ({(taxRate * 100).toFixed(0)}%)</Text>
                <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* PIE DE PÁGINA */}
        <Text style={styles.footer}>
          Documento generado digitalmente por UrbanFix. 
          Este presupuesto tiene una validez de 15 días a partir de la fecha de emisión.
        </Text>
      </Page>
    </Document>
  );
};
