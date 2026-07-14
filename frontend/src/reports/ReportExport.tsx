import React from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { RiskFindingDTO } from '../reviewer-workspace/types';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 12, color: '#1f2937' },
  header: { fontSize: 24, marginBottom: 10, textAlign: 'center', fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginBottom: 30, textAlign: 'center', color: '#6b7280' },
  sectionTitle: { fontSize: 16, marginTop: 20, marginBottom: 10, borderBottom: '1px solid #e5e7eb', paddingBottom: 5, fontWeight: 'bold' },
  riskCard: { marginBottom: 15, padding: 10, backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' },
  levelHigh: { color: '#dc2626', fontSize: 10, textTransform: 'uppercase', marginBottom: 5, fontWeight: 'bold' },
  levelMedium: { color: '#ea580c', fontSize: 10, textTransform: 'uppercase', marginBottom: 5, fontWeight: 'bold' },
  levelLow: { color: '#ca8a04', fontSize: 10, textTransform: 'uppercase', marginBottom: 5, fontWeight: 'bold' },
  levelNotEvaluated: { color: '#6b7280', fontSize: 10, textTransform: 'uppercase', marginBottom: 5, fontWeight: 'bold' },
  reason: { marginBottom: 8, lineHeight: 1.4 },
  evidenceBox: { marginTop: 5, padding: 5, backgroundColor: '#f3f4f6', borderLeft: '2px solid #9ca3af' },
  evidenceText: { fontSize: 10, fontStyle: 'italic', color: '#4b5563' },
  redlineBox: { marginTop: 10, padding: 5, backgroundColor: '#eff6ff', borderLeft: '2px solid #3b82f6' },
  redlineLabel: { fontSize: 10, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 2 },
});

interface ReportDocumentProps {
  findings: RiskFindingDTO[];
  score: number;
}

const ReportDocument: React.FC<ReportDocumentProps> = ({ findings, score }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>ContractLens Analysis Report</Text>
      <Text style={styles.subtitle}>Overall Risk Score: {score}/100</Text>

      <Text style={styles.sectionTitle}>Key Findings</Text>
      {findings.map((finding) => {
        let levelStyle = styles.levelLow;
        if (finding.status === 'not_evaluated') levelStyle = styles.levelNotEvaluated;
        else if (finding.riskLevel === 'high' || finding.riskLevel === 'critical') levelStyle = styles.levelHigh;
        else if (finding.riskLevel === 'medium') levelStyle = styles.levelMedium;

        return (
          <View key={finding.id} style={styles.riskCard} wrap={false}>
            <Text style={levelStyle}>
              {finding.status === 'not_evaluated' ? 'Not Evaluated' : finding.riskLevel}
            </Text>
            <Text style={styles.reason}>{finding.reason}</Text>
            
            {finding.evidence && finding.evidence.length > 0 && (
              <View style={styles.evidenceBox}>
                {finding.evidence.map((ev, idx) => (
                  <Text key={idx} style={styles.evidenceText}>
                    "{ev.quote}" - {ev.documentName} {ev.section ? `(Sec ${ev.section})` : ''}
                  </Text>
                ))}
              </View>
            )}

            {finding.redline && (
              <View style={styles.redlineBox}>
                <Text style={styles.redlineLabel}>Suggested Redline:</Text>
                <Text style={{ fontSize: 10 }}>{finding.redline.suggestedText}</Text>
              </View>
            )}
          </View>
        );
      })}
    </Page>
  </Document>
);

export const ReportExport: React.FC<ReportDocumentProps> = (props) => {
  return (
    <div className="mt-4">
      <PDFDownloadLink
        document={<ReportDocument {...props} />}
        fileName="contractlens_report.pdf"
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
      >
        {({ loading }) =>
          loading ? 'Generating PDF...' : 'Download PDF Report'
        }
      </PDFDownloadLink>
    </div>
  );
};
