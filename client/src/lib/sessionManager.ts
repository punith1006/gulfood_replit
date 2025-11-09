const LEAD_EMAIL_KEY = 'gulfood_lead_email';
const LEAD_NAME_KEY = 'gulfood_lead_name';

export interface LeadInfo {
  email: string;
  name: string;
  exists: boolean;
}

export const sessionManager = {
  createNewSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  getOrCreateSessionId(): string {
    return this.createNewSessionId();
  },

  getSessionId(): string | null {
    return null;
  },

  clearSession(): void {
    localStorage.removeItem(LEAD_EMAIL_KEY);
    localStorage.removeItem(LEAD_NAME_KEY);
  },

  setLeadInfo(email: string, name: string): void {
    localStorage.setItem(LEAD_EMAIL_KEY, email);
    localStorage.setItem(LEAD_NAME_KEY, name);
  },

  getLeadInfo(): { email: string | null; name: string | null } {
    return {
      email: localStorage.getItem(LEAD_EMAIL_KEY),
      name: localStorage.getItem(LEAD_NAME_KEY)
    };
  },

  hasLeadInfo(): boolean {
    return !!(localStorage.getItem(LEAD_EMAIL_KEY) && localStorage.getItem(LEAD_NAME_KEY));
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
