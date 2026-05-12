import { useAuthStore } from "@/src/store/authStore";
import { useEffect } from "react";

export const AuthProvider = ({ children }) => {
  useEffect(() => {
    void useAuthStore.getState().bootstrapSession();
  }, []);

  return children;
};

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt);
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const loading = useAuthStore((s) => s.loading);
  const getRegisteredUsers = useAuthStore((s) => s.getRegisteredUsers);
  const deleteUser = useAuthStore((s) => s.deleteUser);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const validateSession = useAuthStore((s) => s.validateSession);

  return {
    user,
    token,
    refreshToken,
    tokenExpiresAt,
    sessionStatus,
    login,
    register,
    logout,
    loading,
    getRegisteredUsers,
    deleteUser,
    resetPassword,
    refreshSession,
    validateSession,
  };
};