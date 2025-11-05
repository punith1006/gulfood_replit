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
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: 515,
              h: 80,
              linearGradient: ['#2563eb', '#1d4ed8'],
              color: '#2563eb'
            }
          ],
          margin: [-40, -60, -40, 0]
        },
        {
          text: 'GULFOOD 2026',
          fontSize: 28,
          bold: true,
          color: '#ffffff',
          alignment: 'center',
          margin: [0, -65, 0, 5]
        },
        {
          text: 'January 26-30, 2026 | Dubai World Trade Centre & Expo City Dubai',
          fontSize: 11,
          color: '#ffffff',
          alignment: 'center',
          margin: [0, 0, 0, 25]
        },
        {
          text: 'Analytics Report',
          style: 'header',
          alignment: 'center',
          color: '#1f2937',
          margin: [0, 20, 0, 5]
        },
        {
          text: 'Event Organizer Dashboard',
          fontSize: 14,
          color: '#6b7280',
          alignment: 'center',
          margin: [0, 0, 0, 10]
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
        const headerCells = tableLines[0].split('|').map(h => h.trim());
        const headers = headerCells.filter(h => h);
        const headerCount = headers.length;
        
        const rows = tableLines.slice(2).map(row => {
          const cells = row.split('|').map(cell => cell.trim());
          const filteredCells = cells.filter(c => c !== '');
          
          while (filteredCells.length < headerCount) {
            filteredCells.push('');
          }
          
          return filteredCells.slice(0, headerCount).map(c => c || '-');
        });
        
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
    const headerCells = tableLines[0].split('|').map(h => h.trim());
    const headers = headerCells.filter(h => h);
    const headerCount = headers.length;
    
    const rows = tableLines.slice(2).map(row => {
      const cells = row.split('|').map(cell => cell.trim());
      const filteredCells = cells.filter(c => c !== '');
      
      while (filteredCells.length < headerCount) {
        filteredCells.push('');
      }
      
      return filteredCells.slice(0, headerCount).map(c => c || '-');
    });
    
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
  journeyPlan: any;
  name?: string;
  email?: string;
  organization?: string;
  generatedAt: string;
  eventName: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const plan = reportData.journeyPlan;
    
    if (!plan) {
      return reject(new Error('Journey plan data is missing'));
    }

    const content: Content[] = [
      {
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: 515,
            h: 80,
            linearGradient: ['#f97316', '#ea580c'],
            color: '#f97316'
          }
        ],
        margin: [-40, -60, -40, 0]
      },
      {
        text: 'GULFOOD 2026',
        fontSize: 28,
        bold: true,
        color: '#ffffff',
        alignment: 'center',
        margin: [0, -65, 0, 5]
      },
      {
        text: 'January 26-30, 2026 | Dubai',
        fontSize: 12,
        color: '#ffffff',
        alignment: 'center',
        margin: [0, 0, 0, 25]
      },
      {
        text: 'Your Personal Journey Plan',
        style: 'header',
        alignment: 'center',
        color: '#1f2937',
        margin: [0, 20, 0, 10]
      },
      {
        text: `Generated: ${new Date(reportData.generatedAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`,
        style: 'metadata',
        alignment: 'center',
        margin: [0, 0, 0, 30]
      }
    ];

    // Add user information
    if (reportData.name || reportData.organization) {
      content.push({
        text: 'Prepared for',
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 5]
      });
      
      const userInfo = [];
      if (reportData.name) userInfo.push(`Name: ${reportData.name}`);
      if (reportData.organization) userInfo.push(`Organization: ${reportData.organization}`);
      if (plan.role) userInfo.push(`Role: ${plan.role}`);
      
      content.push({
        ul: userInfo,
        fontSize: 10,
        margin: [0, 0, 0, 20]
      });
    }

    // Add relevance score
    content.push({
      text: `Relevance Score: ${plan.relevanceScore}%`,
      fontSize: 16,
      bold: true,
      color: plan.relevanceScore >= 80 ? '#16a34a' : plan.relevanceScore >= 60 ? '#ca8a04' : '#dc2626',
      margin: [0, 0, 0, 10]
    });

    // Add general overview
    if (plan.generalOverview) {
      content.push({
        text: 'Overview',
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      });
      content.push({
        text: plan.generalOverview,
        fontSize: 10,
        lineHeight: 1.5,
        margin: [0, 0, 0, 15]
      });
    }

    // Add score justification
    if (plan.scoreJustification) {
      content.push({
        text: 'Why This Score?',
        style: 'sectionHeader',
        margin: [0, 15, 0, 10]
      });
      content.push({
        text: plan.scoreJustification,
        fontSize: 10,
        lineHeight: 1.5,
        margin: [0, 0, 0, 15]
      });
    }

    // Add benefits
    if (plan.benefits && plan.benefits.length > 0) {
      content.push({
        text: 'Key Benefits for You',
        style: 'sectionHeader',
        margin: [0, 15, 0, 10]
      });
      content.push({
        ul: plan.benefits,
        fontSize: 10,
        margin: [0, 0, 0, 15]
      });
    }

    // Add recommendations
    if (plan.recommendations && plan.recommendations.length > 0) {
      content.push({
        text: 'Personalized Recommendations',
        style: 'sectionHeader',
        margin: [0, 15, 0, 10]
      });
      content.push({
        ol: plan.recommendations,
        fontSize: 10,
        margin: [0, 0, 0, 15]
      });
    }

    // Add matched exhibitors
    if (plan.matchedExhibitors && plan.matchedExhibitors.length > 0) {
      content.push({
        text: `Top ${plan.matchedExhibitors.length} Matched Exhibitors`,
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      });
      
      plan.matchedExhibitors.forEach((exhibitor: any, idx: number) => {
        content.push({
          text: `${idx + 1}. ${exhibitor.companyName || exhibitor.name}`,
          fontSize: 11,
          bold: true,
          margin: [0, 10, 0, 3]
        });
        
        const exhibitorInfo = [];
        if (exhibitor.sector) exhibitorInfo.push(`Sector: ${exhibitor.sector}`);
        if (exhibitor.country) exhibitorInfo.push(`Country: ${exhibitor.country}`);
        if (exhibitor.boothNumber) exhibitorInfo.push(`Booth: ${exhibitor.boothNumber}`);
        if (exhibitor.relevancePercentage) exhibitorInfo.push(`Match: ${exhibitor.relevancePercentage}%`);
        
        content.push({
          ul: exhibitorInfo,
          fontSize: 9,
          margin: [0, 0, 0, 5]
        });
        
        if (exhibitor.description) {
          content.push({
            text: exhibitor.description,
            fontSize: 9,
            color: '#6b7280',
            margin: [0, 0, 0, 5]
          });
        }
      });
    }

    // Add matched sessions
    if (plan.matchedSessions && plan.matchedSessions.length > 0) {
      content.push({
        text: `Recommended Sessions (${plan.matchedSessions.length})`,
        style: 'sectionHeader',
        margin: [0, 20, 0, 10]
      });
      
      plan.matchedSessions.forEach((session: any, idx: number) => {
        content.push({
          text: `${idx + 1}. ${session.title}`,
          fontSize: 11,
          bold: true,
          margin: [0, 10, 0, 3]
        });
        
        const sessionInfo = [];
        if (session.sessionDate) {
          sessionInfo.push(`Date: ${new Date(session.sessionDate).toLocaleDateString()}`);
        }
        if (session.location) sessionInfo.push(`Location: ${session.location}`);
        
        content.push({
          ul: sessionInfo,
          fontSize: 9,
          margin: [0, 0, 0, 5]
        });
        
        if (session.description) {
          content.push({
            text: session.description,
            fontSize: 9,
            color: '#6b7280',
            margin: [0, 0, 0, 5]
          });
        }
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
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: 515,
              h: 80,
              linearGradient: ['#16a34a', '#15803d'],
              color: '#16a34a'
            }
          ],
          margin: [-40, -60, -40, 0]
        },
        {
          text: 'GULFOOD 2026',
          fontSize: 28,
          bold: true,
          color: '#ffffff',
          alignment: 'center',
          margin: [0, -65, 0, 5]
        },
        {
          text: 'January 26-30, 2026 | Dubai',
          fontSize: 12,
          color: '#ffffff',
          alignment: 'center',
          margin: [0, 0, 0, 25]
        },
        {
          text: 'Your Event Journey Report',
          style: 'header',
          alignment: 'center',
          color: '#1f2937',
          margin: [0, 20, 0, 5]
        },
        {
          text: 'Conversation Summary',
          fontSize: 14,
          color: '#6b7280',
          alignment: 'center',
          margin: [0, 0, 0, 10]
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
