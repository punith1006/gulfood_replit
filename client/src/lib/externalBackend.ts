// External backend integration for Gulfood 2026 chatbot
// Backend URL: https://stu.globalknowledgetech.com:8000

const BACKEND_BASE_URL = 'https://stu.globalknowledgetech.com:8000';
const USER_ID = 'user123'; // Hardcoded as per requirements
const BOT_ID = 'DWTC'; // Hardcoded as per requirements
const LANGUAGE = 'en'; // Always English

/**
 * Creates a new conversation space on the external backend
 * @returns Promise containing the conversation_uuid
 */
export async function createConversation(): Promise<string> {
  try {
    const response = await fetch(
      `${BACKEND_BASE_URL}/conversations/createnull?user_uuid=${USER_ID}&bot_id=${BOT_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }

    const data = await response.json();
    return data.conversation_uuid;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Streams chat response from the external backend via WebSocket
 * @param input - User's message or query
 * @param conversationId - The conversation UUID from createConversation
 * @param onToken - Callback function called for each token received
 * @param onComplete - Callback function called when stream completes (with optional suggestions)
 * @param onError - Callback function called on error
 */
export function streamChatResponse(
  input: string,
  conversationId: string,
  onToken: (token: string) => void,
  onComplete: (suggestions?: string[]) => void,
  onError: (error: Error) => void
): () => void {
  const wsUrl = 'wss://stu.globalknowledgetech.com:8000/generate/response/stream';
  
  let ws: WebSocket | null = null;
  let hasCompleted = false;
  let hasErrored = false;
  let eotEncountered = false;
  let tokenBuffer = '';
  let postEOTBuffer = '';  // Buffer for content after <EOT>
  
  const safeComplete = () => {
    if (!hasCompleted && !hasErrored) {
      hasCompleted = true;
      
      // Try to parse suggestions from post-EOT content
      let suggestions: string[] | undefined;
      if (postEOTBuffer.trim()) {
        try {
          const parsed = JSON.parse(postEOTBuffer.trim());
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            suggestions = parsed.suggestions;
          }
        } catch (error) {
          console.error('Failed to parse post-EOT suggestions:', error);
        }
      }
      
      onComplete(suggestions);
    }
  };
  
  const safeError = (error: Error) => {
    if (!hasErrored && !hasCompleted) {
      hasErrored = true;
      onError(error);
    }
  };
  
  const processToken = (token: string) => {
    if (eotEncountered) {
      // After <EOT>, accumulate content for suggestions parsing
      postEOTBuffer += token;
      return;
    }
    
    tokenBuffer += token;
    
    const eotIndex = tokenBuffer.indexOf('<EOT>');
    
    if (eotIndex !== -1) {
      eotEncountered = true;
      const beforeEOT = tokenBuffer.substring(0, eotIndex);
      const afterEOT = tokenBuffer.substring(eotIndex + 5); // Skip '<EOT>'
      
      if (beforeEOT) {
        onToken(beforeEOT);
      }
      
      // Start capturing post-EOT content
      postEOTBuffer = afterEOT;
      tokenBuffer = '';
    } else {
      const safeLength = tokenBuffer.length - 4;
      if (safeLength > 0) {
        const safeContent = tokenBuffer.substring(0, safeLength);
        onToken(safeContent);
        tokenBuffer = tokenBuffer.substring(safeLength);
      }
    }
  };
  
  const flushBuffer = () => {
    if (!eotEncountered && tokenBuffer.length > 0) {
      onToken(tokenBuffer);
      tokenBuffer = '';
    }
  };
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      
      const payload = {
        input,
        user_id: USER_ID,
        language: LANGUAGE,
        bot_details: {
          collection: 'gulfood_docs',
          system_prompt: '',
          top_k: 5,
        },
        convo_id: conversationId,
        temperature: 0.7,
        max_tokens: 1024,
      };
      
      ws?.send(JSON.stringify(payload));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data && typeof data === 'object' && data.token) {
          // Token wrapped in object
          processToken(data.token);
        } else if (data && typeof data === 'object' && data.suggestions && Array.isArray(data.suggestions)) {
          // Suggestions arrived as a separate message
          postEOTBuffer = JSON.stringify(data);
        } else if (data && typeof data === 'object' && (data.type === 'complete' || data.complete === true)) {
          // Completion signal
          flushBuffer();
          safeComplete();
        } else if (typeof data === 'string' || typeof data === 'number') {
          // Bare primitive - treat as token
          processToken(String(data));
        }
      } catch (parseError) {
        // Non-JSON message - treat as token
        processToken(event.data);
      }
    };
    
    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      safeError(new Error('WebSocket connection error'));
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);
      flushBuffer();
      safeComplete();
    };
    
  } catch (error) {
    console.error('Error establishing WebSocket connection:', error);
    safeError(error as Error);
  }
  
  return () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}
