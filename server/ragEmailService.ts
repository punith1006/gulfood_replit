interface RAGApiRequest {
  input: string;
  bot_details: {
    collection: string;
    top_k: number;
  };
  language: string;
}

interface RAGApiResponse {
  success: boolean;
  email_response: string;
  has_sufficient_context: boolean;
  retrieved_docs_count: number;
  context_sources: Array<{
    doc_name: string;
    relevance_score: number;
    url: string;
  }>;
  needs_clarification: boolean;
}

export async function generateEmailResponseFromRAG(
  subject: string,
  emailBody: string
): Promise<RAGApiResponse> {
  const requestBody: RAGApiRequest = {
    input: `Subject: ${subject}\n\n${emailBody}`,
    bot_details: {
      collection: "gulfood_docs",
      top_k: 5
    },
    language: "En"
  };

  try {
    const response = await fetch(
      'https://stu.globalknowledgetech.com:8000/email/generate-response',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`RAG API returned status ${response.status}: ${response.statusText}`);
    }

    const data: RAGApiResponse = await response.json();
    
    console.log('📚 RAG API response received:', {
      has_sufficient_context: data.has_sufficient_context,
      needs_clarification: data.needs_clarification,
      retrieved_docs_count: data.retrieved_docs_count
    });

    return data;
  } catch (error: any) {
    console.error('❌ Failed to call RAG API:', error);
    throw new Error(`RAG API error: ${error.message}`);
  }
}
