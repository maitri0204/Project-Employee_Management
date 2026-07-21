"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/services";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { login } = useAuth();
  const router = useRouter();
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const otpValue = useMemo(() => otp.join(""), [otp]);

  useAutoDismiss(error, setError);
  useAutoDismiss(message, setMessage);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await authApi.sendOtp(email);
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      setCooldown(60);
      setMessage("OTP sent successfully. Check your email.");
      window.setTimeout(() => refs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await authApi.verifyOtp(email, otpValue);
      if (response.data) {
        login(response.data.token, response.data.user);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      await authApi.sendOtp(email);
      setCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      setMessage("A new OTP has been sent to your email.");
      window.setTimeout(() => refs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-12 text-slate-900">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom right, rgb(240, 249, 255) 0%, rgb(255, 255, 255) 50%, rgb(240, 248, 255) 100%)",
        }}
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-16 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl font-bold text-white shadow-lg">
            EM
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900">Welcome</h1>
          <p className="mt-2 text-slate-600">Employee Management System</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl">
          {step === "email" ? (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="you@company.com"
                />
              </div>

              {error ? (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
              ) : null}
              {message ? (
                <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900">Enter OTP</h2>
                <p className="mt-2 text-sm text-slate-600">
                  We sent a 6-digit code to {email}.
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      refs.current[index] = el;
                    }}
                    value={digit}
                    inputMode="numeric"
                    maxLength={1}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(-1);
                      const next = [...otp];
                      next[index] = value;
                      setOtp(next);
                      if (value && index < next.length - 1) {
                        refs.current[index + 1]?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[index] && index > 0) {
                        refs.current[index - 1]?.focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData
                        .getData("text")
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      if (!pasted) return;
                      const next = [...otp];
                      pasted.split("").forEach((char, i) => {
                        if (index + i < 6) next[index + i] = char;
                      });
                      setOtp(next);
                      refs.current[Math.min(index + pasted.length, 5)]?.focus();
                    }}
                    className="h-12 w-10 rounded-xl border border-slate-200 text-center text-lg font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:h-14 sm:w-12"
                  />
                ))}
              </div>

              {error ? (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
              ) : null}
              {message ? (
                <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || otpValue.length !== 6}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Verifying..." : "Verify & Login"}
              </button>

              <div className="flex flex-col items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={cooldown > 0 || isSubmitting}
                  className="font-semibold text-blue-600 hover:opacity-80 disabled:text-slate-400"
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                    setMessage("");
                  }}
                  className="text-slate-600 hover:text-slate-900"
                >
                  Change email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
