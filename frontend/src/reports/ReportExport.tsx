import React from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { Document as DocxDocument, Paragraph, TextRun, Packer, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { RiskFindingDTO } from '../reviewer-workspace/types';
import { FileText, Download } from 'lucide-react';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#111827', lineHeight: 1.5 },
  header: { fontSize: 20, marginBottom: 5, textAlign: 'left', fontWeight: 'bold' },
  subtitle: { fontSize: 10, marginBottom: 30, textAlign: 'left', color: '#4B5563', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 14, marginTop: 20, marginBottom: 10, borderBottom: '1pt solid #E5E7EB', paddingBottom: 5, fontWeight: 'bold' },
  riskCard: { marginBottom: 15, padding: 10, backgroundColor: '#FFFFFF', border: '1pt solid #E5E7EB' },
  levelHigh: { color: '#9E1B1B', fontSize: 9, textTransform: 'uppercase', marginBottom: 5, fontWeight: 'bold' },
  levelMedium: { color: '#B45309', fontSize: 9, textTransform: 'uppercase', marginBottom: 5, fontWeight: 'bold' },
  levelLow: { color: '#334155', fontSize: 9, textTransform: 'uppercase', marginBottom: 5, fontWeight: 'bold' },
  levelNotEvaluated: { color: '#4B5563', fontSize: 9, textTransform: 'uppercase', marginBottom: 5, fontWeight: 'bold' },
  reason: { marginBottom: 8, fontSize: 11 },
  evidenceBox: { marginTop: 5, padding: 8, backgroundColor: '#F3F4F6', borderLeft: '1pt solid #4B5563' },
  evidenceText: { fontSize: 9, fontStyle: 'italic', color: '#111827' },
  redlineBox: { marginTop: 10, padding: 8, backgroundColor: '#ECFDF5', borderLeft: '1pt solid #065F46' },
  redlineLabel: { fontSize: 9, fontWeight: 'bold', color: '#065F46', marginBottom: 2, textTransform: 'uppercase' },
});

interface ReportDocumentProps {
  findings: RiskFindingDTO[];
  score: number;
}

const ReportDocument: React.FC<ReportDocumentProps> = ({ findings, score }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>ContractLens Review Report</Text>
      <Text style={styles.subtitle}>Final Risk Score: {score}/100 • Generated: {new Date().toLocaleDateString()}</Text>

      <Text style={styles.sectionTitle}>Key Findings</Text>
      {findings.map((finding) => {
        let levelStyle = styles.levelLow;
        if (finding.status === 'not_evaluated') levelStyle = styles.levelNotEvaluated;
        else if (finding.riskLevel === 'high' || finding.riskLevel === 'critical') levelStyle = styles.levelHigh;
        else if (finding.riskLevel === 'medium') levelStyle = styles.levelMedium;

        return (
          <View key={finding.id} style={styles.riskCard} wrap={false}>
            <Text style={levelStyle}>
              {finding.status === 'not_evaluated' ? 'NOT EVALUATED' : `${finding.riskLevel} RISK`}
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
                <Text style={styles.redlineLabel}>Proposed Redline</Text>
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
  const handleDownloadDocx = async () => {
    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "ContractLens Review Report",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `Final Risk Score: ${props.score}/100 • Generated: ${new Date().toLocaleDateString()}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "Key Findings",
            heading: HeadingLevel.HEADING_2,
            border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
            spacing: { after: 200 },
          }),
          ...props.findings.flatMap(finding => {
            const children = [
              new Paragraph({
                children: [
                  new TextRun({ text: `[${finding.status === 'not_evaluated' ? 'NOT EVALUATED' : finding.riskLevel.toUpperCase()}] `, bold: true }),
                  new TextRun({ text: finding.reason })
                ],
                spacing: { before: 200, after: 100 }
              })
            ];

            if (finding.evidence && finding.evidence.length > 0) {
              finding.evidence.forEach(ev => {
                children.push(new Paragraph({
                  children: [
                    new TextRun({ text: `Source: "${ev.quote}" - ${ev.documentName}`, italics: true, color: "4B5563" })
                  ],
                  indent: { left: 720 },
                  spacing: { after: 100 }
                }));
              });
            }

            if (finding.redline) {
              children.push(new Paragraph({
                children: [
                  new TextRun({ text: "Proposed Redline: ", bold: true, color: "065F46" }),
                  new TextRun({ text: finding.redline.suggestedText, color: "065F46" })
                ],
                indent: { left: 720 },
                spacing: { after: 200 }
              }));
            }

            return children;
          })
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "contractlens_report.docx");
  };

  return (
    <div className="bg-legal-surface border border-legal-border rounded-sm shadow-sm p-5 mb-6">
      <h3 className="font-mono text-[10px] text-legal-meta uppercase tracking-widest border-b border-legal-border pb-2 mb-3">Export Dossier</h3>
      <p className="font-body text-sm text-legal-text mb-5 leading-relaxed">Download a formal audit trail of all identified contradictions, playbook violations, and AI-proposed redlines for offline review.</p>
      
      <div className="flex space-x-3">
        <PDFDownloadLink
          document={<ReportDocument {...props} />}
          fileName="contractlens_report.pdf"
          className="flex-1 flex justify-center items-center px-4 py-2 bg-legal-focus text-white font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-blue-900 transition-colors rounded-sm"
        >
          {({ loading }) => (
            <>
              <FileText className="w-3.5 h-3.5 mr-2" />
              {loading ? 'Generating...' : 'Export PDF'}
            </>
          )}
        </PDFDownloadLink>

        <button
          onClick={handleDownloadDocx}
          className="flex-1 flex justify-center items-center px-4 py-2 bg-legal-surface border border-legal-border text-legal-text font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-legal-bg transition-colors rounded-sm"
        >
          <Download className="w-3.5 h-3.5 mr-2" />
          Export DOCX
        </button>
      </div>
    </div>
  );
};
