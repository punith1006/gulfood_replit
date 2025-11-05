import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type AuthType = "organizer" | "exhibitor" | null;

interface OrganizerAuth {
  email: string;
  name: string;
  role: string;
}

interface ExhibitorAuth {
  companyName: string;
  email: string;
  code: string;
}

interface AuthContextType {
  authType: AuthType;
  organizerAuth: OrganizerAuth | null;
  exhibitorAuth: ExhibitorAuth | null;
  isLoading: boolean;
  loginOrganizer: (auth: OrganizerAuth & { token: string }) => void;
  loginExhibitor: (auth: ExhibitorAuth & { token: string }) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode}) {
  const [authType, setAuthType] = useState<AuthType>(null);
  const [organizerAuth, setOrganizerAuth] = useState<OrganizerAuth | null>(null);
  const [exhibitorAuth, setExhibitorAuth] = useState<ExhibitorAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedAuthType = localStorage.getItem("authType") as AuthType;
    const savedOrganizerAuth = localStorage.getItem("organizerAuth");
    const savedExhibitorAuth = localStorage.getItem("exhibitorAuth");
    const savedToken = localStorage.getItem("authToken");

    if (savedAuthType === "organizer" && savedOrganizerAuth && savedToken) {
      setAuthType("organizer");
      setOrganizerAuth(JSON.parse(savedOrganizerAuth));
    } else if (savedAuthType === "exhibitor" && savedExhibitorAuth && savedToken) {
      setAuthType("exhibitor");
      setExhibitorAuth(JSON.parse(savedExhibitorAuth));
    }
    setIsLoading(false);
  }, []);

  const loginOrganizer = (auth: OrganizerAuth & { token: string }) => {
    const { token, ...authData } = auth;
    setAuthType("organizer");
    setOrganizerAuth(authData);
    setExhibitorAuth(null);
    localStorage.setItem("authType", "organizer");
    localStorage.setItem("authToken", token);
    localStorage.setItem("organizerAuth", JSON.stringify(authData));
    localStorage.removeItem("exhibitorAuth");
  };

  const loginExhibitor = (auth: ExhibitorAuth & { token: string }) => {
    const { token, ...authData } = auth;
    setAuthType("exhibitor");
    setExhibitorAuth(authData);
    setOrganizerAuth(null);
    localStorage.setItem("authType", "exhibitor");
    localStorage.setItem("authToken", token);
    localStorage.setItem("exhibitorAuth", JSON.stringify(authData));
    localStorage.removeItem("organizerAuth");
  };

  const logout = () => {
    setAuthType(null);
    setOrganizerAuth(null);
    setExhibitorAuth(null);
    localStorage.removeItem("authType");
    localStorage.removeItem("authToken");
    localStorage.removeItem("organizerAuth");
    localStorage.removeItem("exhibitorAuth");
  };

  const isAuthenticated = authType !== null;

  return (
    <AuthContext.Provider
      value={{
        authType,
        organizerAuth,
        exhibitorAuth,
        isLoading,
        loginOrganizer,
        loginExhibitor,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
