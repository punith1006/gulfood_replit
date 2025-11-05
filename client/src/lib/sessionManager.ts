const SESSION_STORAGE_KEY = 'gulfood_session_id';
const LEAD_EMAIL_KEY = 'gulfood_lead_email';
const LEAD_NAME_KEY = 'gulfood_lead_name';

export interface LeadInfo {
  email: string;
  name: string;
  exists: boolean;
}

export const sessionManager = {
  getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    
    return sessionId;
  },

  getSessionId(): string | null {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  },

  clearSession(): void {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(LEAD_EMAIL_KEY);
    sessionStorage.removeItem(LEAD_NAME_KEY);
  },

  setLeadInfo(email: string, name: string): void {
    sessionStorage.setItem(LEAD_EMAIL_KEY, email);
    sessionStorage.setItem(LEAD_NAME_KEY, name);
  },

  getLeadInfo(): { email: string | null; name: string | null } {
    return {
      email: sessionStorage.getItem(LEAD_EMAIL_KEY),
      name: sessionStorage.getItem(LEAD_NAME_KEY)
    };
  },

  hasLeadInfo(): boolean {
    return !!(sessionStorage.getItem(LEAD_EMAIL_KEY) && sessionStorage.getItem(LEAD_NAME_KEY));
  },

  async checkLeadExists(email: string): Promise<LeadInfo | null> {
    try {
      const response = await fetch(`/api/leads/check/${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (data.exists && data.lead) {
        this.setLeadInfo(data.lead.email, data.lead.name);
        return {
          email: data.lead.email,
          name: data.lead.name,
          exists: true
        };
      }
      
      return {
        email,
        name: '',
        exists: false
      };
    } catch (error) {
      console.error('Error checking lead existence:', error);
      return null;
    }
  }
};
