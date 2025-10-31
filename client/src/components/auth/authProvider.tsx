import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  email: string;
  firstName?: string;
  lastName?: string;
  practiceId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    firstName?: string,
    lastName?: string,
    practiceId?: string,
  ) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    try {
      const savedUser = localStorage.getItem("hr_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.warn("localStorage access failed:", error);
    }
    setIsLoading(false);
  }, []);

  const login = (
    email: string,
    firstName?: string,
    lastName?: string,
    practiceId?: string,
  ) => {
    const userData = { email, firstName, lastName, practiceId };
    setUser(userData);
    try {
      localStorage.setItem("hr_user", JSON.stringify(userData));
    } catch (error) {
      console.warn("localStorage access failed:", error);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("hr_user");
    } catch (error) {
      console.warn("localStorage access failed:", error);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
