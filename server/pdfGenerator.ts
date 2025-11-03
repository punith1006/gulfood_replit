import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

type Analytics = {
  totalRegistrations: number;
  exhibitorSignups: number;
  aiInteractions: number;
  meetingRequests: number;
  sectorEngagement: Array<{ sector: string; count: number; percentage: number }>;
  aiAccuracy: number;
  totalFeedback: number;
};

const fonts = {
  Courier: {
    normal: 'Courier',
    bold: 'Courier-Bold',
    italics: 'Courier-Oblique',
    bolditalics: 'Courier-BoldOblique'
  },
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  },
  Times: {
    normal: 'Times-Roman',
    bold: 'Times-Bold',
    italics: 'Times-Italic',
    bolditalics: 'Times-BoldItalic'
  }
};

export async function generateOrganizerAnalyticsPDF(analytics: Analytics): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const sectorRows = analytics.sectorEngagement.map((sector: { sector: string; count: number; percentage: number }) => [
      sector.sector,
      sector.count.toString(),
      `${sector.percentage}%`
    ]);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        {
          text: 'Gulfood 2026 Analytics Report',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        {
          text: 'Event Organizer Dashboard',
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        {
          text: `Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`,
          style: 'metadata',
          alignment: 'center',
          margin: [0, 0, 0, 30]
        },

        { text: 'Key Metrics', style: 'sectionHeader', margin: [0, 0, 0, 15] },
        
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'AI Response Accuracy', style: 'metricLabel' },
                { text: `${analytics.aiAccuracy}%`, style: 'metricValue', color: '#16a34a' },
                { text: `Based on ${analytics.totalFeedback} feedback responses`, style: 'metricSubtext' }
              ],
              margin: [0, 0, 10, 15]
            },
            {
              width: '*',
              stack: [
                { text: 'AI Chatbot Interactions', style: 'metricLabel' },
                { text: analytics.aiInteractions.toString(), style: 'metricValue', color: '#2563eb' },
                { text: `${analytics.totalFeedback} feedback responses`, style: 'metricSubtext' }
              ],
              margin: [0, 0, 10, 15]
            }
          ]
        },

        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Total Exhibitors', style: 'metricLabel' },
                { text: analytics.exhibitorSignups.toString(), style: 'metricValue', color: '#7c3aed' },
                { text: 'Registered exhibitors', style: 'metricSubtext' }
              ],
              margin: [0, 0, 10, 15]
            },
            {
              width: '*',
              stack: [
                { text: 'Meeting Requests', style: 'metricLabel' },
                { text: analytics.meetingRequests.toString(), style: 'metricValue', color: '#ea580c' },
                { text: 'Scheduled meetings', style: 'metricSubtext' }
              ],
              margin: [0, 0, 10, 15]
            }
          ]
        },

        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Total Registrations', style: 'metricLabel' },
                { text: analytics.totalRegistrations.toString(), style: 'metricValue', color: '#dc2626' },
                { text: 'Event registrations', style: 'metricSubtext' }
              ],
              margin: [0, 0, 10, 15]
            },
            {
              width: '*',
              text: ''
            }
          ]
        },

        { text: 'Sector Engagement', style: 'sectionHeader', margin: [0, 20, 0, 15] },
        
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto'],
            body: [
              [
                { text: 'Sector', style: 'tableHeader' },
                { text: 'Exhibitors', style: 'tableHeader' },
                { text: 'Percentage', style: 'tableHeader' }
              ],
              ...sectorRows
            ]
          },
          layout: {
            fillColor: (rowIndex: number) => rowIndex === 0 ? '#f3f4f6' : (rowIndex % 2 === 0 ? '#fafafa' : null),
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb'
          },
          margin: [0, 0, 0, 30]
        },

        {
          text: 'Event Information',
          style: 'sectionHeader',
          margin: [0, 0, 0, 10]
        },
        {
          ul: [
            'Event: Gulfood 2026',
            'Dates: January 26-30, 2026',
            'Venues: Dubai World Trade Centre & Expo City Dubai',
            `Report Type: Organizer Analytics`
          ],
          margin: [0, 0, 0, 20]
        },

        {
          text: '© 2026 Gulfood. All rights reserved.',
          style: 'footer',
          alignment: 'center',
          margin: [0, 30, 0, 0]
        }
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#1f2937'
        },
        subheader: {
          fontSize: 16,
          color: '#6b7280'
        },
        metadata: {
          fontSize: 10,
          color: '#9ca3af',
          italics: true
        },
        sectionHeader: {
          fontSize: 18,
          bold: true,
          color: '#1f2937'
        },
        metricLabel: {
          fontSize: 11,
          color: '#6b7280',
          margin: [0, 0, 0, 5]
        },
        metricValue: {
          fontSize: 28,
          bold: true,
          margin: [0, 0, 0, 3]
        },
        metricSubtext: {
          fontSize: 9,
          color: '#9ca3af'
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: '#374151',
          fillColor: '#f3f4f6'
        },
        footer: {
          fontSize: 9,
          color: '#9ca3af'
        }
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
        color: '#374151'
      }
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    
    pdfDoc.end();
  });
}

function parseMarkdownTable(markdown: string): any[] {
  const tables: any[] = [];
  const lines = markdown.split('\n');
  let inTable = false;
  let tableLines: string[] = [];
  
  for (const line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      tableLines.push(line);
    } else if (inTable && tableLines.length > 0) {
      if (tableLines.length > 2) {
        const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
        const rows = tableLines.slice(2).map(row => 
          row.split('|').map(cell => cell.trim()).filter(cell => cell)
        );
        
        if (headers.length > 0 && rows.length > 0) {
          tables.push({
            headers,
            rows
          });
        }
      }
      inTable = false;
      tableLines = [];
    }
  }
  
  if (inTable && tableLines.length > 2) {
    const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
    const rows = tableLines.slice(2).map(row => 
      row.split('|').map(cell => cell.trim()).filter(cell => cell)
    );
    
    if (headers.length > 0 && rows.length > 0) {
      tables.push({
        headers,
        rows
      });
    }
  }
  
  return tables;
}

export async function generateJourneyPlanPDF(reportData: {
  sessionId: string;
  conversationHistory: Array<{ role: string; content: string }>;
  generatedAt: string;
  eventName: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let journeyPlanContent: any = null;
    const planMessages = reportData.conversationHistory.filter(msg => 
      msg.role === 'assistant' && (
        msg.content.includes('|') || 
        msg.content.toLowerCase().includes('day 1') ||
        msg.content.toLowerCase().includes('itinerary')
      )
    );

    const content: Content[] = [
      {
        text: 'Gulfood 2026 Journey Plan',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      {
        text: 'Your Personalized Event Itinerary',
        style: 'subheader',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      {
        text: `Generated: ${new Date(reportData.generatedAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`,
        style: 'metadata',
        alignment: 'center',
        margin: [0, 0, 0, 30]
      }
    ];

    if (planMessages.length > 0) {
      planMessages.forEach((msg, idx) => {
        const tables = parseMarkdownTable(msg.content);
        const textContent = msg.content.split('\n').filter(line => 
          !line.trim().startsWith('|') && line.trim().length > 0
        ).join('\n');

        if (textContent.length > 20) {
          content.push({
            text: textContent.substring(0, 500),
            fontSize: 10,
            margin: [0, 0, 0, 15],
            lineHeight: 1.4
          });
        }

        tables.forEach((table, tableIdx) => {
          if (table.headers.length > 0 && table.rows.length > 0) {
            content.push({
              text: idx === 0 && tableIdx === 0 ? 'Your Itinerary' : `Day ${tableIdx + 1}`,
              style: 'sectionHeader',
              margin: [0, 15, 0, 10]
            });

            content.push({
              table: {
                headerRows: 1,
                widths: Array(table.headers.length).fill('auto'),
                body: [
                  table.headers.map((h: string) => ({ text: h, style: 'tableHeader' })),
                  ...table.rows.map((row: string[]) => 
                    row.map(cell => ({ text: cell, fontSize: 9 }))
                  )
                ]
              },
              layout: {
                fillColor: (rowIndex: number) => rowIndex === 0 ? '#f3f4f6' : (rowIndex % 2 === 0 ? '#fafafa' : null),
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#e5e7eb',
                vLineColor: () => '#e5e7eb'
              },
              margin: [0, 0, 0, 15]
            });
          }
        });
      });
    } else {
      content.push({
        text: 'No journey plan found in conversation. Please ask Faris to plan your journey first.',
        fontSize: 11,
        italics: true,
        color: '#6b7280',
        margin: [0, 20, 0, 0]
      });
    }

    content.push({
      text: 'Event Information',
      style: 'sectionHeader',
      margin: [0, 30, 0, 10]
    });

    content.push({
      ul: [
        'Event: Gulfood 2026',
        'Dates: January 26-30, 2026',
        'Venues: Dubai World Trade Centre & Expo City Dubai',
        'Distance between venues: 12 km (7.5 miles)',
        'Travel time: 20-30 minutes by car/taxi'
      ],
      margin: [0, 0, 0, 20]
    });

    content.push({
      text: '© 2026 Gulfood. All rights reserved.',
      style: 'footer',
      alignment: 'center',
      margin: [0, 30, 0, 0]
    });

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content,
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#1f2937'
        },
        subheader: {
          fontSize: 16,
          color: '#6b7280'
        },
        metadata: {
          fontSize: 10,
          color: '#9ca3af',
          italics: true
        },
        sectionHeader: {
          fontSize: 18,
          bold: true,
          color: '#1f2937'
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: '#374151',
          fillColor: '#f3f4f6'
        },
        footer: {
          fontSize: 9,
          color: '#9ca3af'
        }
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
        color: '#374151'
      }
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    
    pdfDoc.end();
  });
}

export async function generateVisitorJourneyPDF(reportData: {
  sessionId: string;
  conversationHistory: Array<{ role: string; content: string }>;
  feedbackCount: number;
  generatedAt: string;
  eventName: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const conversationContent: Content[] = reportData.conversationHistory.map((msg, idx) => {
      const isUser = msg.role === 'user';
      const displayContent = msg.content.length > 300 ? msg.content.substring(0, 300) + '...' : msg.content;
      
      return {
        columns: [
          {
            width: isUser ? 50 : '*',
            text: ''
          },
          {
            width: isUser ? '*' : 450,
            stack: [
              {
                text: isUser ? 'You' : 'Faris AI Assistant',
                bold: true,
                fontSize: 10,
                color: isUser ? '#2563eb' : '#16a34a',
                margin: [0, 0, 0, 3]
              },
              {
                text: displayContent,
                fontSize: 9,
                color: '#374151',
                margin: [0, 0, 0, idx === reportData.conversationHistory.length - 1 ? 0 : 10]
              }
            ],
            margin: [0, 0, 0, 0]
          },
          {
            width: isUser ? '*' : 50,
            text: ''
          }
        ],
        margin: [0, 0, 0, 8]
      };
    });

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        {
          text: 'Gulfood 2026 Journey Report',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        {
          text: 'Your Event Experience Summary',
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        {
          text: `Generated: ${new Date(reportData.generatedAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`,
          style: 'metadata',
          alignment: 'center',
          margin: [0, 0, 0, 30]
        },

        { text: 'Journey Summary', style: 'sectionHeader', margin: [0, 0, 0, 15] },
        
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Session ID', style: 'metricLabel' },
                { text: reportData.sessionId.substring(0, 16) + '...', style: 'sessionId' }
              ],
              margin: [0, 0, 10, 15]
            },
            {
              width: '*',
              stack: [
                { text: 'Interactions', style: 'metricLabel' },
                { text: Math.ceil(reportData.conversationHistory.length / 2).toString(), style: 'metricValue', color: '#2563eb' }
              ],
              margin: [0, 0, 10, 15]
            },
            {
              width: '*',
              stack: [
                { text: 'Feedback Given', style: 'metricLabel' },
                { text: reportData.feedbackCount.toString(), style: 'metricValue', color: '#16a34a' }
              ],
              margin: [0, 0, 0, 15]
            }
          ]
        },

        { text: 'Conversation History', style: 'sectionHeader', margin: [0, 20, 0, 15] },
        
        ...conversationContent,

        {
          text: 'Event Information',
          style: 'sectionHeader',
          margin: [0, 30, 0, 10],
          pageBreak: conversationContent.length > 8 ? 'before' : undefined
        },
        {
          ul: [
            'Event: Gulfood 2026',
            'Dates: January 26-30, 2026',
            'Venues: Dubai World Trade Centre & Expo City Dubai',
            `Report Type: Visitor Journey`
          ],
          margin: [0, 0, 0, 20]
        },

        {
          text: '© 2026 Gulfood. All rights reserved.',
          style: 'footer',
          alignment: 'center',
          margin: [0, 30, 0, 0]
        }
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#1f2937'
        },
        subheader: {
          fontSize: 16,
          color: '#6b7280'
        },
        metadata: {
          fontSize: 10,
          color: '#9ca3af',
          italics: true
        },
        sectionHeader: {
          fontSize: 18,
          bold: true,
          color: '#1f2937'
        },
        metricLabel: {
          fontSize: 11,
          color: '#6b7280',
          margin: [0, 0, 0, 5]
        },
        metricValue: {
          fontSize: 24,
          bold: true,
          margin: [0, 0, 0, 3]
        },
        sessionId: {
          fontSize: 10,
          color: '#374151',
          italics: true
        },
        footer: {
          fontSize: 9,
          color: '#9ca3af'
        }
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
        color: '#374151'
      }
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    
    pdfDoc.end();
  });
}
