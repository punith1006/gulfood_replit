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
  loginOrganizer: (auth: OrganizerAuth) => void;
  loginExhibitor: (auth: ExhibitorAuth) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authType, setAuthType] = useState<AuthType>(null);
  const [organizerAuth, setOrganizerAuth] = useState<OrganizerAuth | null>(null);
  const [exhibitorAuth, setExhibitorAuth] = useState<ExhibitorAuth | null>(null);

  useEffect(() => {
    const savedAuthType = localStorage.getItem("authType") as AuthType;
    const savedOrganizerAuth = localStorage.getItem("organizerAuth");
    const savedExhibitorAuth = localStorage.getItem("exhibitorAuth");

    if (savedAuthType === "organizer" && savedOrganizerAuth) {
      setAuthType("organizer");
      setOrganizerAuth(JSON.parse(savedOrganizerAuth));
    } else if (savedAuthType === "exhibitor" && savedExhibitorAuth) {
      setAuthType("exhibitor");
      setExhibitorAuth(JSON.parse(savedExhibitorAuth));
    }
  }, []);

  const loginOrganizer = (auth: OrganizerAuth) => {
    setAuthType("organizer");
    setOrganizerAuth(auth);
    setExhibitorAuth(null);
    localStorage.setItem("authType", "organizer");
    localStorage.setItem("organizerAuth", JSON.stringify(auth));
    localStorage.removeItem("exhibitorAuth");
  };

  const loginExhibitor = (auth: ExhibitorAuth) => {
    setAuthType("exhibitor");
    setExhibitorAuth(auth);
    setOrganizerAuth(null);
    localStorage.setItem("authType", "exhibitor");
    localStorage.setItem("exhibitorAuth", JSON.stringify(auth));
    localStorage.removeItem("organizerAuth");
  };

  const logout = () => {
    setAuthType(null);
    setOrganizerAuth(null);
    setExhibitorAuth(null);
    localStorage.removeItem("authType");
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
