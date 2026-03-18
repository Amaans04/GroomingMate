import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/api";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const { verifyEmailOtp, sendEmailOtp, isLoading } = useAuth();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  // if someone navigates here directly without email, send back
  if (!email) {
    navigate("/register", { replace: true });
    return null;
  }

  // ── verify ────────────────────────────────────────────────────────────────
  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    try {
      await verifyEmailOtp({ email, otp });
      setSuccess("Email verified! Redirecting…");
      setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  // ── resend ────────────────────────────────────────────────────────────────
  async function handleResend() {
    setError("");
    setResendSuccess("");
    setResendLoading(true);
    try {
      await sendEmailOtp({ email });
      setResendSuccess("New OTP sent! Check your inbox.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">

      {/* glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-700/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm">

        {/* logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L2 6v8l8 4 8-4V6L10 2zm0 2.4L15.6 7 10 9.6 4.4 7 10 4.4zM3.5 8.3l5.5 2.7v5.6L3.5 14V8.3zm7 8.3V11l5.5-2.7V14L10.5 16.6z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Groommate</span>
        </div>

        {/* card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-7">

          {/* icon */}
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-5">
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-white tracking-tight">Verify your email</h1>
          <p className="text-slate-400 text-sm mt-1 mb-6">
            We sent a 6-digit OTP to{" "}
            <span className="text-slate-200 font-medium">{email}</span>
          </p>

          <form onSubmit={handleVerify} className="space-y-4">

            {/* OTP input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">OTP</label>
              <input
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                placeholder="••••••"
                maxLength={6}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-center text-2xl font-semibold text-slate-100 placeholder-slate-700 outline-none focus:border-indigo-500 transition-colors tracking-[0.5em]"
              />
            </div>

            {/* error / success */}
            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-green-900/50 bg-green-950/40 px-3 py-2.5 text-sm text-green-300 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}
            {resendSuccess && (
              <p className="text-xs text-indigo-400">{resendSuccess}</p>
            )}

            {/* submit */}
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verifying…
                </span>
              ) : "Verify email"}
            </button>
          </form>

          {/* resend */}
          <div className="flex items-center justify-center mt-5 gap-1.5">
            <span className="text-sm text-slate-500">Didn't receive it?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors disabled:opacity-50"
            >
              {resendLoading ? "Sending…" : "Resend OTP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}