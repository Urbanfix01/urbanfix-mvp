import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const brand = {
  ink: '#0b1020',
  muted: '#667085',
  line: '#e5eaf2',
  soft: '#f7f9fc',
  orange: '#ff8a1f',
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: brand.ink,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: brand.line,
    paddingBottom: 18,
  },
  businessBlock: {
    width: '58%',
    flexDirection: 'row',
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: 'contain',
    marginRight: 14,
  },
  logoPlaceholder: {
    width: 58,
    height: 58,
    marginRight: 14,
    borderRadius: 14,
    backgroundColor: brand.soft,
    borderWidth: 1,
    borderColor: brand.line,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 800,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  businessMeta: {
    marginTop: 3,
    color: brand.muted,
    lineHeight: 1.35,
  },
  metaSection: {
    width: '36%',
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  metaGrid: {
    marginTop: 10,
  },
  label: {
    fontSize: 7,
    color: brand.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  value: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 2,
    marginBottom: 7,
  },
  clientBand: {
    marginTop: 24,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: brand.line,
    backgroundColor: brand.soft,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clientColumn: {
    width: '58%',
  },
  clientName: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: 900,
    textTransform: 'uppercase',
  },
  address: {
    marginTop: 7,
    color: '#344054',
    lineHeight: 1.4,
  },
  totalBox: {
    width: '34%',
    borderRadius: 16,
    backgroundColor: brand.ink,
    color: '#ffffff',
    padding: 14,
  },
  totalLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#b8c0cc',
  },
  totalAmount: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: 900,
  },
  section: {
    marginTop: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 900,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  sectionTotal: {
    fontSize: 10,
    fontWeight: 800,
  },
  table: {
    borderWidth: 1,
    borderColor: brand.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: brand.line,
    minHeight: 34,
    alignItems: 'center',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  tableHeader: {
    backgroundColor: brand.soft,
    minHeight: 28,
  },
  th: {
    fontSize: 7,
    fontWeight: 900,
    color: '#8795aa',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  conceptCol: {
    width: '52%',
    padding: 9,
  },
  qtyCol: {
    width: '12%',
    padding: 9,
    textAlign: 'center',
  },
  unitCol: {
    width: '18%',
    padding: 9,
    textAlign: 'right',
  },
  totalCol: {
    width: '18%',
    padding: 9,
    textAlign: 'right',
  },
  itemName: {
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1.25,
  },
  itemType: {
    marginTop: 3,
    fontSize: 7,
    color: brand.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  totalsSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsBox: {
    width: 220,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  totalRowMuted: {
    color: brand.muted,
  },
  grandTotal: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: brand.ink,
    fontSize: 13,
    fontWeight: 900,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: brand.line,
    paddingTop: 10,
    color: '#98a2b3',
    fontSize: 8,
    textAlign: 'center',
  },
  empty: {
    borderWidth: 1,
    borderColor: brand.line,
    borderRadius: 14,
    padding: 16,
    color: brand.muted,
  },
});

interface Props {
  quote: any;
  items: any[];
  profile: any;
}

const formatCurrency = (amount: any) => {
  const num = Number(amount) || 0;
  return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const formatQuantity = (value: any) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '1';
  return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const normalizeItemType = (item: any) => {
  const rawType = String(item?.metadata?.type || item?.type || item?.item_type || '').toLowerCase();
  if (rawType.includes('material')) return 'material';
  return 'labor';
};

const cleanItemName = (item: any) => {
  const description = String(item?.description || 'Item sin nombre').trim();
  return (
    description
      .replace(/\s+-\s+mano de obra$/i, '')
      .replace(/\s+para\s+.+$/i, '')
      .trim() || description
  );
};

const getItemKindLabel = (item: any) => (normalizeItemType(item) === 'material' ? 'Material' : 'Mano de obra');

const getLineTotal = (item: any) => Number(item?.quantity || 0) * Number(item?.unit_price || 0);

const renderItemsTable = (title: string, rows: any[]) => {
  const sectionTotal = rows.reduce((acc, item) => acc + getLineTotal(item), 0);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionTotal}>{formatCurrency(sectionTotal)}</Text>
      </View>

      {rows.length ? (
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.conceptCol, styles.th]}>Detalle</Text>
            <Text style={[styles.qtyCol, styles.th]}>Cant.</Text>
            <Text style={[styles.unitCol, styles.th]}>Unitario</Text>
            <Text style={[styles.totalCol, styles.th]}>Total</Text>
          </View>

          {rows.map((item, index) => (
            <View
              key={`${title}-${index}`}
              style={index === rows.length - 1 ? [styles.tableRow, styles.lastRow] : styles.tableRow}
            >
              <View style={styles.conceptCol}>
                <Text style={styles.itemName}>{cleanItemName(item)}</Text>
                <Text style={styles.itemType}>{getItemKindLabel(item)}</Text>
              </View>
              <Text style={styles.qtyCol}>{formatQuantity(item?.quantity || 1)}</Text>
              <Text style={styles.unitCol}>{formatCurrency(item?.unit_price)}</Text>
              <Text style={styles.totalCol}>{formatCurrency(getLineTotal(item))}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Sin items cargados.</Text>
      )}
    </View>
  );
};

export const QuoteDocument = ({ quote, items, profile }: Props) => {
  const safeItems = Array.isArray(items) ? items : [];
  const laborItems = safeItems.filter((item) => normalizeItemType(item) !== 'material');
  const materialItems = safeItems.filter((item) => normalizeItemType(item) === 'material');
  const subtotal = safeItems.reduce((acc, item) => acc + getLineTotal(item), 0);
  const taxRate = Number(quote?.tax_rate || 0) > 0 ? Number(quote?.tax_rate || 0) : 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const logoUrl = profile?.company_logo_url || profile?.avatar_url;
  const hasLogo = logoUrl && typeof logoUrl === 'string' && logoUrl.startsWith('http');
  const issuedAt = quote?.created_at
    ? new Date(quote.created_at).toLocaleDateString('es-AR')
    : new Date().toLocaleDateString('es-AR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.businessBlock}>
            {hasLogo ? <Image src={logoUrl} style={styles.logo} /> : <View style={styles.logoPlaceholder} />}
            <View>
              <Text style={styles.businessName}>{profile?.business_name || 'Servicio tecnico'}</Text>
              <Text style={styles.businessMeta}>{profile?.full_name || ''}</Text>
              {profile?.email ? <Text style={styles.businessMeta}>{profile.email}</Text> : null}
              {profile?.phone ? <Text style={styles.businessMeta}>{profile.phone}</Text> : null}
            </View>
          </View>

          <View style={styles.metaSection}>
            <Text style={styles.title}>Presupuesto</Text>
            <View style={styles.metaGrid}>
              <Text style={styles.label}>Referencia</Text>
              <Text style={styles.value}>#{quote?.id ? quote.id.slice(0, 8).toUpperCase() : '---'}</Text>
              <Text style={styles.label}>Emision</Text>
              <Text style={styles.value}>{issuedAt}</Text>
            </View>
          </View>
        </View>

        <View style={styles.clientBand}>
          <View style={styles.clientColumn}>
            <Text style={styles.label}>Presupuesto para</Text>
            <Text style={styles.clientName}>{quote?.client_name || 'Consumidor Final'}</Text>
            {quote?.client_address ? <Text style={styles.address}>{quote.client_address}</Text> : null}
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {renderItemsTable('Mano de obra', laborItems)}
        {materialItems.length ? renderItemsTable('Materiales', materialItems) : null}

        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={[styles.totalRow, styles.totalRowMuted]}>
              <Text>Subtotal</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </View>
            {taxRate > 0 ? (
              <View style={[styles.totalRow, styles.totalRowMuted]}>
                <Text>IVA {(taxRate * 100).toFixed(0)}%</Text>
                <Text>{formatCurrency(tax)}</Text>
              </View>
            ) : null}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text>Total</Text>
              <Text>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>Presupuesto generado por UrbanFix. Validez: 15 dias desde la fecha de emision.</Text>
      </Page>
    </Document>
  );
};
