"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: window.location.origin + "/auth/callback?next=/",
        },
      });
      if (signUpError) setError(signUpError.message);
      else setMessage("Check your email for the confirmation link. Once confirmed, you can sign in.");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) setError(signInError.message);
      else window.location.replace("/");
    }
    setBusy(false);
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/login" className="auth-brand"><span className="mark">t.</span> taskora</Link>
    <p className="eyebrow">YOUR WORK, IN MOTION</p>
    <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
    <p className="auth-sub">{mode === "login" ? "Sign in to access your private workspace." : "Set up your Taskora workspace in a few steps."}</p>
    <form className="form" onSubmit={submit}>
      {mode === "signup" && <div className="field"><label htmlFor="full-name">Your name</label><input id="full-name" required maxLength={120} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name"/></div>}
      <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters"/></div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <button className="primary auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
    </form>
    <p className="auth-switch">{mode === "login" ? "New to Taskora?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
    <p className="auth-legal">By continuing, you agree to use Taskora responsibly. Your workspace records are private to your account.</p>
  </section></main>;
}
