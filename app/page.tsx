"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness, CheckCircle2, Clock3, CreditCard, FileText, LayoutDashboard, LogOut, Plus, Search, Settings, Sparkles, Wallet, X, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type JobRow = Tables<"jobs">;
type ClientRow = Tables<"clients">;
type PaymentRequestRow = Tables<"payment_requests">;
type PaymentRequestView = PaymentRequestRow & { client_name: string; job_title: string };
type JobStatus = "in_progress" | "completed" | "cancelled";
type JobView = JobRow & { client_name: string };

const money = (amount: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestView[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [nav, setNav] = useState("Overview");
  const [selected, setSelected] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [form, setForm] = useState({ title: "", client: "", amount: "", description: "" });

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const loadJobs = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      window.location.replace("/login");
      return;
    }
    setUserEmail(user.email ?? "");
    const [{ data: jobRows, error: jobsError }, { data: clients, error: clientsError }, { data: requestRows, error: requestsError }] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_requests").select("*").order("created_at", { ascending: false }),
    ]);
    if (jobsError || clientsError || requestsError) {
      notify("Couldn't load your workspace. Please refresh and try again.");
      setLoading(false);
      return;
    }
    const clientMap = new Map((clients ?? []).map((client: ClientRow) => [client.id, client.name]));
    const jobMap = new Map((jobRows ?? []).map((job: JobRow) => [job.id, job]));
    setJobs((jobRows ?? []).map((job: JobRow) => ({
      ...job,
      client_name: job.client_id ? clientMap.get(job.client_id) ?? "Client" : "No client",
    })));
    setPaymentRequests((requestRows ?? []).map((request: PaymentRequestRow) => ({
      ...request,
      client_name: clientMap.get(request.client_id) ?? "Client",
      job_title: jobMap.get(request.job_id)?.title ?? "Job",
    })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  const paid = 0; // Payment confirmation is not implemented yet.
  const pending = useMemo(() => jobs.filter((job) => job.status === "completed").reduce((sum, job) => sum + Number(job.amount), 0), [jobs]);
  const activeCount = jobs.filter((job) => job.status === "in_progress").length;

  async function submitJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !form.client.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace("/login"); return; }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({ user_id: user.id, name: form.client.trim() })
      .select("*")
      .single();

    if (clientError || !client) {
      notify(clientError?.message ?? "Couldn't save the client.");
      setSaving(false);
      return;
    }

    const { error: jobError } = await supabase.from("jobs").insert({
      user_id: user.id,
      client_id: client.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      amount,
      currency: "NGN",
      status: "in_progress",
    });

    if (jobError) {
      await supabase.from("clients").delete().eq("id", client.id);
      notify(jobError.message);
      setSaving(false);
      return;
    }

    setForm({ title: "", client: "", amount: "", description: "" });
    setOpen(false);
    setSaving(false);
    notify("Job saved to your Taskora account.");
    await loadJobs();
  }

  async function markComplete(job: JobView) {
    const { error } = await supabase.from("jobs").update({
      status: "completed" satisfies JobStatus,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
    if (error) { notify(error.message); return; }
    notify("Job marked as completed.");
    await loadJobs();
  }

  async function savePaymentRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const job = jobs.find((item) => item.id === selected);
    if (!job || !job.client_id) { notify("This job needs a client record first."); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace("/login"); return; }
    const summary = requestNote.trim() || job.description || "Work completed as agreed.";
    const { data: paymentRequest, error } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      job_id: job.id,
      client_id: job.client_id,
      amount: Number(job.amount),
      currency: job.currency,
      work_summary: summary,
      status: "draft",
    }).select("id").single();
    if (error || !paymentRequest) {
      setSaving(false);
      notify(error?.message ?? "Couldn't save the payment request.");
      return;
    }

    const shareResponse = await fetch(`/api/payment-requests/${paymentRequest.id}/share`, { method: "POST" });
    const shareResult = await shareResponse.json() as { shareUrl?: string; error?: string };
    setSaving(false);
    if (!shareResponse.ok || !shareResult.shareUrl) {
      setRequestOpen(false);
      setRequestNote("");
      notify(shareResult.error ?? "Draft saved, but the secure link couldn't be created. Please try again.");
      return;
    }

    setShareUrl(shareResult.shareUrl);
    setRequestNote("");
    try {
      await navigator.clipboard.writeText(shareResult.shareUrl);
      notify("Secure client link created and copied to your clipboard.");
    } catch {
      notify("Secure client link created. Use the Copy link button to copy it.");
    }
  }

  async function revokeShare(requestId: string) {
    if (!window.confirm("Revoke this client link? The existing link will stop working, but the payment request will remain saved.")) return;
    const response = await fetch(`/api/payment-requests/${requestId}/revoke`, { method: "POST" });
    const result = await response.json() as { error?: string };
    if (!response.ok) { notify(result.error ?? "Could not revoke this link."); return; }
    notify("Client link revoked. The request is now a draft.");
    await loadJobs();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  const navs = [["Overview", LayoutDashboard], ["My jobs", BriefcaseBusiness], ["Payments", CreditCard], ["Invoices", FileText]] as const;

  return <div className="app">
    <aside className="side">
      <div className="brand"><div className="mark">t.</div>taskora</div>
      <p className="label">WORKSPACE</p>
      <nav className="nav">{navs.map(([name, Icon]) => <button key={name} className={nav === name ? "active" : ""} onClick={() => { setNav(name); if (name !== "Overview") notify(name + " view is coming next."); }}><Icon size={17}/>{name}</button>)}</nav>
      <p className="label" style={{ marginTop: 35 }}>PREFERENCES</p>
      <nav className="nav"><button onClick={() => notify("Settings are coming soon.")}><Settings size={17}/>Settings</button></nav>
      <div className="bottom">
        <div className="help"><strong>Need a hand?</strong><p>Prepare a clear payment request when a job is complete.</p><button onClick={() => { const first = jobs.find((job) => job.status === "completed"); if (!first) { notify("Mark a job as complete first."); return; } setSelected(first.id); setRequestOpen(true); }}>Create a request ↗</button></div>
        <div className="profile"><div className="avatar">T</div><div style={{ minWidth: 0, flex: 1 }}><b>{userEmail || "Your account"}</b><div className="muted">Taskora account</div></div><button className="icon" aria-label="Sign out" onClick={signOut}><LogOut size={15}/></button></div>
      </div>
    </aside>

    <main className="main">
      <header className="top"><div>Workspace　/　<b style={{ color: "#26332c" }}>{nav}</b></div><div className="actions"><span className="pill">Your private workspace</span><button className="icon" aria-label="Search" onClick={() => notify("Search is coming soon.")}><Search size={16}/></button><button className="icon" aria-label="Notifications" onClick={() => notify("You're all caught up.")}><Bell size={16}/></button></div></header>
      <section className="welcome"><div><p className="eyebrow">YOUR WORK, IN MOTION</p><h1>Welcome to Taskora 👋</h1><p className="sub">Your jobs and client records are now saved to your account.</p></div><button className="primary" onClick={() => setOpen(true)}><Plus size={16}/> Create a job</button></section>
      <section className="stats">
        {[{ name: "Confirmed earnings", value: money(paid), foot: "No payment confirmations yet", icon: Wallet }, { name: "Completed job value", value: money(pending), foot: "Not necessarily paid", icon: Clock3 }, { name: "Active jobs", value: String(activeCount).padStart(2, "0"), foot: "Jobs currently in progress", icon: BriefcaseBusiness }, { name: "All jobs", value: String(jobs.length).padStart(2, "0"), foot: "Saved in your account", icon: Activity }].map(({ name, value, foot, icon: Icon }) => <article className="card" key={name}><div className="stat-top"><span>{name}</span><Icon size={17}/></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></article>)}
      </section>

      <div className="content">
        <div>
          <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Your jobs</h2><p className="panel-sub">Your saved client work, newest first.</p></div><button className="text-btn" onClick={() => setOpen(true)}>+ Add job</button></div>
            {loading ? <p className="panel-sub">Loading your jobs…</p> : jobs.length === 0 ? <div className="empty-state"><BriefcaseBusiness size={24}/><b>No jobs yet</b><span>Create your first job to get started. Your records will be saved to your account.</span></div> : jobs.slice(0, 10).map((job) => <div className="job" key={job.id}><div className="job-main"><div className="job-icon"><BriefcaseBusiness size={16}/></div><div style={{ minWidth: 0 }}><div className="job-name">{job.title}</div><div className="job-client">{job.client_name}</div></div></div><div className="amount">{money(Number(job.amount), job.currency)}</div><div className="job-actions"><span className={"status " + (job.status === "completed" ? "complete" : job.status === "cancelled" ? "pending" : "progress")}>{job.status.replace("_", " ")}</span>{job.status === "in_progress" && <button className="mini-action" onClick={() => void markComplete(job)}>Mark done</button>}{job.status === "completed" && <button className="mini-action" onClick={() => { setSelected(job.id); setRequestOpen(true); }}>Request payment</button>}</div></div>)}
          </section>
          <section className="panel" style={{ marginTop: 18 }}><div className="panel-head"><div><h2 className="panel-title">Payment requests</h2><p className="panel-sub">Manage the links you have shared with clients.</p></div><span className="pill">{paymentRequests.length} saved</span></div>{paymentRequests.length === 0 ? <p className="panel-sub">Your payment requests will appear here.</p> : paymentRequests.slice(0, 8).map((request) => <div className="request-row" key={request.id}><div className="request-info"><b>{request.job_title}</b><span>{request.client_name} · {money(Number(request.amount), request.currency)}</span></div><div className="request-controls"><span className={"status " + (request.status === "shared" ? "complete" : request.status === "paid" ? "paid" : "pending")}>{request.status}</span>{request.status === "shared" && <button className="mini-action" onClick={() => void revokeShare(request.id)}>Revoke link</button>}</div></div>)}</section>
          <section className="panel" style={{ marginTop: 18 }}><div className="panel-head"><div><h2 className="panel-title">Your account data</h2><p className="panel-sub">Records are stored in your private Taskora database.</p></div><span className="pill">Synced</span></div><div className="activity-row"><CheckCircle2 size={16}/><div><b>Account authentication</b><span>Managed by Supabase Auth.</span></div></div><div className="activity-row"><CheckCircle2 size={16}/><div><b>Private job records</b><span>Protected by owner-only Row Level Security.</span></div></div></section>
        </div>
        <div>
          <section className="assistant"><span className="assistant-label"><Sparkles size={13} style={{ display: "inline" }}/> TASKORA PAYMENT ASSISTANT</span><h2>Finished the work? Prepare the payment request.</h2><p>Choose a completed job and save a structured payment request to your account.</p><button onClick={() => { const first = jobs.find((job) => job.status === "completed"); if (!first) { notify("Mark a job as complete first."); return; } setSelected(first.id); setRequestOpen(true); }}><Zap size={14} style={{ display: "inline" }}/> Prepare payment request　<ArrowUpRight size={13} style={{ display: "inline" }}/></button></section>
          <section className="panel activity"><div className="panel-head"><div><h2 className="panel-title">Payment workflow</h2><p className="panel-sub">Your progress at a glance</p></div></div><div className="activity-row"><CheckCircle2 size={16}/><div><b>Record the agreed job</b><span>Saved to your Taskora database.</span></div></div><div className="activity-row"><CheckCircle2 size={16}/><div><b>Mark the work complete</b><span>Completion is stored against the job.</span></div></div><div className="activity-row"><ArrowDownLeft size={16}/><div><b>Share a secure payment request</b><span>Clients can review a private, expiring link. Payment collection is not enabled yet.</span></div></div></section>
        </div>
      </div>
      <p style={{ color: "#a1aaa2", fontSize: 9, textAlign: "center", marginTop: 28 }}>Taskora · Private account workspace · NEAR payments are not enabled yet</p>
    </main>

    {open && <div className="modal-bg" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p className="eyebrow">WORKSPACE</p><h2>Create a new job</h2></div><button className="close" onClick={() => setOpen(false)} aria-label="Close"><X size={16}/></button></div><form className="form" onSubmit={submitJob}><div className="field"><label htmlFor="title">Job or service name</label><input id="title" required maxLength={180} placeholder="e.g. Brand identity design" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}/></div><div className="field"><label htmlFor="client">Client name</label><input id="client" required maxLength={160} placeholder="Who is this work for?" value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })}/></div><div className="field"><label htmlFor="amount">Agreed amount (NGN)</label><input id="amount" required min="1" step="0.01" type="number" placeholder="e.g. 85000" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })}/></div><div className="field"><label htmlFor="description">Work description (optional)</label><textarea id="description" maxLength={4000} placeholder="Add a short note..." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}/></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={saving}>{saving ? "Saving…" : <><Plus size={14}/> Add job</>}</button></div></form></div></div>}

    {requestOpen && <div className="modal-bg" onMouseDown={(event) => { if (event.target === event.currentTarget) setRequestOpen(false); }}><div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p className="eyebrow">TASKORA ASSISTANT</p><h2>Prepare a payment request</h2></div><button className="close" onClick={() => setRequestOpen(false)} aria-label="Close"><X size={16}/></button></div><form className="form" onSubmit={savePaymentRequest}><div className="field"><label htmlFor="request-job">Completed job</label><select id="request-job" required value={selected} onChange={(event) => setSelected(event.target.value)}>{jobs.filter((job) => job.status === "completed").map((job) => <option key={job.id} value={job.id}>{job.title} — {job.client_name} ({money(Number(job.amount), job.currency)})</option>)}</select></div><div className="field"><label htmlFor="request-note">Work summary for your client</label><textarea id="request-note" maxLength={4000} placeholder="Summarise what was delivered..." value={requestNote} onChange={(event) => setRequestNote(event.target.value)}/></div><p className="form-hint">A secure client link will be created after you save. Links expire after 30 days and can be revoked here. Payment collection is not enabled yet.</p><div className="form-actions"><button type="button" className="secondary" onClick={() => setRequestOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={saving || !selected}>{saving ? "Saving…" : <><FileText size={14}/> Save request</>}</button></div></form></div></div>}
    {toast && <div className="toast"><span>{toast}</span>{shareUrl && <div className="toast-actions"><button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl)}>Copy link</button><a href={shareUrl} target="_blank" rel="noreferrer">Preview</a></div>}</div>}
  </div>;
}
