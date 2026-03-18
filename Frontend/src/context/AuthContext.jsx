import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "groommate_auth_v1";
export const RESET_IDENTIFIER_KEY = "reset_identifier";
export const RESET_OTP_KEY = "reset_otp";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setUser(parsed?.user ?? null);
      setIsAuthed(Boolean(parsed?.isAuthed));
    } catch {
      // ignore corrupted storage
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user, isAuthed })
      );
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  }, [user, isAuthed]);

  const login = useCallback(async ({ email, phone_number, password }) => {
    setIsLoading(true);
    try {
      const res = await api.post("/auth/api/login", {
        email,
        phone_number,
        password,
      });
      setUser(res.data?.user ?? null);
      setIsAuthed(true);
      return { ok: true, data: res.data };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async ({ username, phone_number, email, password, role = "customer" }) => {
      setIsLoading(true);
      try {
        const res = await api.post("/auth/api/register", {
          username,
          phone_number,
          email,
          password,
          role,
        });
        // Backend also sets cookies on register, so treat as authenticated.
        // setUser(res.data?.user ?? null);
        // setIsAuthed(true);
        return { ok: true, data: res.data };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.post("/auth/api/logout");
    } catch {
      // If backend is down, still clear local auth.
    } finally {
      setUser(null);
      setIsAuthed(false);
      setIsLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async ({ identifier }) => {
    setIsLoading(true);
    try{
      const email = identifier;
      const res = await api.post("/auth/api/forgot-password", {
        email,
      });
      return {ok: true, data: res.data};
    }finally{
      setIsLoading(false);
    }
  },[])

  const verifyOtp = useCallback(async({ identifier, otp })=>{
    setIsLoading(true);
    try{
      const email = identifier;
      const res = await api.post("/auth/api/verify-otp",{
        email,
        otp
      });
      return {ok:true, data:res.data};
    }finally{
      setIsLoading(false)
    }
  },[]);

  const resetPassword = useCallback(async({ identifier, otp, newPassword }) => {
    setIsLoading(true);
    try{
      const email = identifier;
      const res = await api.post("/auth/api/reset-password",{
        email,
        otp,
        newPassword,
      });
      return{ok:true, data: res.data};
    }finally{
      setIsAuthed(false);
      setIsLoading(false);
    }
  },[])

  const sendEmailOtp = useCallback(async({email})=>{
    setIsLoading(true);
    try{
      const res = await api.post("/auth/api/resend-email-otp",{email});
      return {ok:true, data:res.data};
    }finally{
      setIsLoading(false)
    }
  },[]);

  const verifyEmailOtp = useCallback(async({email,otp}) => {
    setIsLoading(true);
    try{
      const res = await api.post("/auth/api/verify-email", { email, otp });
      setUser(res.data?.user ?? null);
      setIsAuthed(true);
      return {ok:true, data:res.data}
    }finally{
      setIsLoading(false)
    }
  },[])

  const value = useMemo(
    () => ({
      user,
      isAuthed,
      isLoading,
      isReady,
      login,
      register,
      logout,
      forgotPassword,
      verifyOtp,
      resetPassword,
      sendEmailOtp,
      verifyEmailOtp
    }),
    [
      user,
      isAuthed,
      isLoading,
      isReady,
      login,
      register,
      logout,
      forgotPassword,
      verifyOtp,
      resetPassword,
      sendEmailOtp,
      verifyEmailOtp
    ]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

