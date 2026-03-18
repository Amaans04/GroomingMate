import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/api";
import { isValidPhoneNumber } from "libphonenumber-js";

const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, sendEmailOtp, verifyEmailOtp } = useAuth();

  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  // email verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  // const [emailVerified, setEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  // phone validation state
  const [phoneError, setPhoneError] = useState("");

  // ── send OTP ────────────────────────────────────────────────────────────────
  // async function handleSendOtp() {
  //   setOtpError("");
  //   setOtpSuccess("");
  //   if (!validateEmail(email)) {
  //     setOtpError("Enter a valid email first.");
  //     return;
  //   }
  //   setOtpLoading(true);
  //   try {
  //     await sendEmailOtp({ email });
  //     setOtpSent(true);
  //     setOtpSuccess("OTP sent! Check your inbox.");
  //   } catch (err) {
  //     setOtpError(getApiErrorMessage(err));
  //   } finally {
  //     setOtpLoading(false);
  //   }
  // }

  // // ── verify OTP ──────────────────────────────────────────────────────────────
  // async function handleVerifyOtp() {
  //   setOtpError("");
  //   setOtpSuccess("");
  //   if (otp.length !== 6) {
  //     setOtpError("Enter the 6-digit OTP.");
  //     return;
  //   }
  //   setOtpLoading(true);
  //   try {
  //     await verifyEmailOtp({ email, otp });
  //     setEmailVerified(true);
  //     setOtpSuccess("Email verified!");
  //     setOtpSent(false);
  //   } catch (err) {
  //     setOtpError(getApiErrorMessage(err));
  //   } finally {
  //     setOtpLoading(false);
  //   }
  // }

  // ── phone validation ────────────────────────────────────────────────────────
  function handlePhoneChange(e) {
    const val = e.target.value;
    setPhoneNumber(val);
    if (val && !isValidPhoneNumber(val, "IN")) {
      setPhoneError("Enter a valid phone number.");
    } else {
      setPhoneError("");
    }
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    // if (!emailVerified) {
    //   setError("Please verify your email before submitting.");
    //   return;
    // }
    if (!isValidPhoneNumber(phoneNumber, "IN")) {
      setError("Enter a valid phone number.");
      return;
    }

    try {
      await register({
        username: username.trim(),
        phone_number: phoneNumber.trim(),
        email: email.trim(),
        password,
        role,
      });
      navigate("/verify-email",{state:{email:email.trim()}});
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">

      {/* glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-violet-700/10 blur-[120px]" />
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
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-white tracking-tight">Create account</h1>
            <p className="text-slate-400 text-sm mt-1">Just the basics for now.</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>

            {/* username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="name" required
                placeholder="janesmith"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Phone number</label>
              <input
                value={phoneNumber}
                onChange={handlePhoneChange}
                autoComplete="tel" required
                placeholder="+91 98765 43210"
                className={`w-full rounded-xl border bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors
                  ${phoneError ? "border-red-700 focus:border-red-500" : "border-slate-800 focus:border-indigo-500"}`}
              />
              {phoneError && <p className="text-xs text-red-400">{phoneError}</p>}
            </div>

            {/* email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>

              {/* email input + verify button */}
              <div className="flex gap-2">
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // setEmailVerified(false);
                    // setOtpSent(false);
                    // setOtp("");
                    // setOtpError("");
                    // setOtpSuccess("");
                  }}
                  type="email" autoComplete="email" required
                  placeholder="you@example.com"
                  // disabled={emailVerified}
                  className={`flex-1 rounded-xl border bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors"border-slate-800 focus:border-indigo-500"}
                    disabled:opacity-60`}
                />
                {/* {!emailVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading || !email}
                    className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-2.5 text-xs font-medium text-white transition-colors"
                  >
                    {otpLoading && !otpSent ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : otpSent ? "Resend" : "Verify"}
                  </button>
                )}
                {emailVerified && (
                  <div className="shrink-0 flex items-center px-3 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )} */}
              </div>

              {/* OTP input — shown after send */}
              {/* {otpSent && !emailVerified && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otp.length !== 6}
                    className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-2.5 text-xs font-medium text-white transition-colors"
                  >
                    {otpLoading ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : "Confirm"}
                  </button>
                </div>
              )}

 */}
            </div>

            {/* password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password" required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* role */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {["customer", "barber"].map((r) => (
                  <button
                    key={r} type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-xl border py-2.5 text-sm font-medium capitalize transition-colors
                      ${role === r
                        ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                        : "border-slate-800 bg-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300"}`}
                  >
                    {r === "customer" ? "👤 Customer" : "✂️ Barber"}
                  </button>
                ))}
              </div>
            </div>

            {/* error */}
            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* submit — disabled until email verified */}
            <button
              type="submit" disabled={isLoading}
              className="w-full mt-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating…
                </span>
              ) : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}