import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RESET_IDENTIFIER_KEY, RESET_OTP_KEY, useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/api";

export default function VerifyOtp() {
  const { verifyOtp, isLoading } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const identifier = localStorage.getItem(RESET_IDENTIFIER_KEY);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier) {
      setError("Please start from Forgot Password again.");
      return;
    }
    if (!otp.trim()) {
      setError("Enter the OTP.");
      return;
    }

    try {
      await verifyOtp({ identifier, otp: otp.trim() });
      localStorage.setItem(RESET_OTP_KEY, otp.trim());
      navigate("/reset-password");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-700/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L2 6v8l8 4 8-4V6L10 2zm0 2.4L15.6 7 10 9.6 4.4 7 10 4.4zM3.5 8.3l5.5 2.7v5.6L3.5 14V8.3zm7 8.3V11l5.5-2.7V14L10.5 16.6z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">GroomMate</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-7">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Verify OTP
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Enter the OTP we sent to your email.
            </p>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                OTP
              </label>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                inputMode="numeric"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Didn’t get it?{" "}
          <Link
            to="/forgot-password"
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Try again
          </Link>
        </p>
      </div>
    </div>
  );
}