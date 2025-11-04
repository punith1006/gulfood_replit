import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type UserRole = "visitor" | "exhibitor" | "organizer" | null;

interface RoleContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  hasRegistered: boolean;
  setHasRegistered: (registered: boolean) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [hasRegistered, setHasRegistered] = useState(false);

  // Reset hasRegistered when role changes
  useEffect(() => {
    setHasRegistered(false);
  }, [userRole]);

  return (
    <RoleContext.Provider value={{ userRole, setUserRole, hasRegistered, setHasRegistered }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
