import React, { useState } from "react";
import { useAuth } from "./authProvider";
import LoginForm from "./login";
import RegisterForm from "./register";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, login, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <RegisterForm
          onRegister={(email, firstName, lastName, practiceId) => login(email, firstName, lastName, practiceId)}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      );
    }

    return (
      <LoginForm
        onLogin={(email, firstName, lastName) => login(email, firstName, lastName)}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  return <>{children}</>;
};
