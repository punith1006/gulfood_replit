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
 * @param onComplete - Callback function called when stream completes
 * @param onError - Callback function called on error
 */
export function streamChatResponse(
  input: string,
  conversationId: string,
  onToken: (token: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  const wsUrl = 'wss://stu.globalknowledgetech.com:8000/generate/response/stream';
  
  let ws: WebSocket | null = null;
  let hasCompleted = false;
  let hasErrored = false;
  let eotEncountered = false;
  let tokenBuffer = '';
  
  const safeComplete = () => {
    if (!hasCompleted && !hasErrored) {
      hasCompleted = true;
      onComplete();
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
      return;
    }
    
    tokenBuffer += token;
    
    const eotIndex = tokenBuffer.indexOf('<EOT>');
    
    if (eotIndex !== -1) {
      eotEncountered = true;
      const beforeEOT = tokenBuffer.substring(0, eotIndex);
      if (beforeEOT) {
        onToken(beforeEOT);
      }
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
        max_tokens: 512,
      };
      
      ws?.send(JSON.stringify(payload));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.token) {
          processToken(data.token);
        } else if (data.type === 'complete' || data.complete === true) {
          flushBuffer();
          safeComplete();
        }
      } catch (parseError) {
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
