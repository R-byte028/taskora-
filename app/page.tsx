"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, Copy, CreditCard, FileText, LayoutDashboard,
  LogOut, Menu, Plus, Search, Settings, Sparkles, Wallet, X, Zap
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type JobRow = Tables<"jobs">;
type ClientRow = Tables<"clients">;
type PaymentRequestRow = Tables<"payment_requests">;
type PaymentRequestView = PaymentRequestRow & { client_name: string; job_title: string };
type JobStatus = "in_progress" | "completed" | "cancelled";
type JobView = JobRow & { client_name: string };
type PageName = "Overview" | "My Jobs" | "My Payments" | "Invoices";
type Asset = "USDC" | "NEAR";

const isCryptoAsset = (currency: string): currency is Asset => currency === "USDC" || currency === "NEAR";
const cryptoAmount = (amount: number, currency: string) => {
  if (!isCryptoAsset(currency)) return "Legacy record · recreate in crypto";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency === "USDC" ? 2 : 0,
    maximumFractionDigits: currency === "USDC" ? 2 : 4,
  }).format(amount);
  return currency === "USDC" ? "$" + formatted + " USDC" : formatted + " NEAR";
};
const dateLabel = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));

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
  const [nav, setNav] = useState<PageName>("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [jobFilter, setJobFilter] = useState<"all" | JobStatus>("all");
  const [selected, setSelected] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [form, setForm] = useState({ title: "", client: "", amount: "", description: "", currency: "USDC" as Asset });

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
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

  const activeJobs = jobs.filter((job) => job.status === "in_progress");
  const completedJobs = jobs.filter((job) => job.status === "completed");
  const cryptoJobs = jobs.filter((job) => isCryptoAsset(job.currency));
  const pendingValue = completedJobs.filter((job) => isCryptoAsset(job.currency))
    .reduce((sum, job) => sum + Number(job.amount), 0);
  const paidRequests = paymentRequests.filter((request) => request.status === "paid");
  const sharedRequests = paymentRequests.filter((request) => request.status === "shared");
  const filteredJobs = jobs.filter((job) => jobFilter === "all" || job.status === jobFilter);

  async function submitJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !form.client.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace("/login"); return; }

    const { data: client, error: clientError } = await supabase
      .from("clients").insert({ user_id: user.id, name: form.client.trim() }).select("*").single();
    if (clientError || !client) {
      notify(clientError?.message ?? "Couldn't save the client.");
      setSaving(false);
      return;
    }
    const { error: jobError } = await supabase.from("jobs").insert({
      user_id: user.id, client_id: client.id, title: form.title.trim(),
      description: form.description.trim() || null, amount, currency: form.currency,
      status: "in_progress",
    });
    if (jobError) {
      await supabase.from("clients").delete().eq("id", client.id);
      notify(jobError.message);
      setSaving(false);
      return;
    }
    setForm({ title: "", client: "", amount: "", description: "", currency: "USDC" });
    setOpen(false);
    setSaving(false);
    notify("Crypto-denominated job saved.");
    await loadJobs();
  }

  async function markComplete(job: JobView) {
    if (!isCryptoAsset(job.currency)) {
      notify("This is an older fiat record. Create a new job with a crypto amount.");
      return;
    }
    const { error } = await supabase.from("jobs").update({
      status: "completed" satisfies JobStatus,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
    if (error) { notify(error.message); return; }
    notify("Job marked as completed.");
    await loadJobs();
  }

  async function openRequestFor(job: JobView) {
    if (!isCryptoAsset(job.currency)) {
      notify("This older record uses a fiat denomination. Create a new crypto-denominated job first.");
      return;
    }
    setSelected(job.id);
    setRequestOpen(true);
  }

  async function savePaymentRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const job = jobs.find((item) => item.id === selected);
    if (!job || !job.client_id || !isCryptoAsset(job.currency)) {
      notify("Choose a completed job with a supported crypto asset.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace("/login"); return; }
    const summary = requestNote.trim() || job.description || "Work completed as agreed.";
    const { data: paymentRequest, error } = await supabase.from("payment_requests").insert({
      user_id: user.id, job_id: job.id, client_id: job.client_id,
      amount: Number(job.amount), currency: job.currency, work_summary: summary, status: "draft",
    }).select("id").single();
    if (error || !paymentRequest) {
      setSaving(false);
      notify(error?.message ?? "Couldn't save the payment request.");
      return;
    }
    const shareResponse = await fetch("/api/payment-requests/" + paymentRequest.id + "/share", { method: "POST" });
    const shareResult = await shareResponse.json() as { shareUrl?: string; error?: string };
    setSaving(false);
    if (!shareResponse.ok || !shareResult.shareUrl) {
      setRequestOpen(false);
      setRequestNote("");
      notify(shareResult.error ?? "Draft saved, but the secure link couldn't be created. You can retry from Invoices.");
      await loadJobs();
      return;
    }
    setShareUrl(shareResult.shareUrl);
    setRequestOpen(false);
    setRequestNote("");
    try {
      await navigator.clipboard.writeText(shareResult.shareUrl);
      notify("Secure crypto payment request created and link copied.");
    } catch {
      notify("Secure crypto payment request created. Use Copy link in the confirmation.");
    }
    await loadJobs();
  }

  async function shareDraft(requestId: string) {
    setSaving(true);
    const response = await fetch("/api/payment-requests/" + requestId + "/share", { method: "POST" });
    const result = await response.json() as { shareUrl?: string; error?: string };
    setSaving(false);
    if (!response.ok || !result.shareUrl) { notify(result.error ?? "Couldn't create the secure client link."); return; }
    setShareUrl(result.shareUrl);
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      notify("Secure link copied to clipboard.");
    } catch {
      notify("Secure link created. Copy it from the confirmation.");
    }
    await loadJobs();
  }

  async function revokeShare(requestId: string) {
    if (!window.confirm("Revoke this client link? The existing link will stop working, but the request will remain saved.")) return;
    const response = await fetch("/api/payment-requests/" + requestId + "/revoke", { method: "POST" });
    const result = await response.json() as { error?: string };
    if (!response.ok) { notify(result.error ?? "Could not revoke this link."); return; }
    setShareUrl("");
    notify("Client link revoked. The request is now a draft.");
    await loadJobs();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  const navs = [
    { name: "Overview" as PageName, icon: LayoutDashboard },
    { name: "My Jobs" as PageName, icon: BriefcaseBusiness },
    { name: "My Payments" as PageName, icon: Wallet },
    { name: "Invoices" as PageName, icon: FileText },
  ];

  const changePage = (page: PageName) => {
    setNav(page);
    setMobileNavOpen(false);
  };

  const jobRows = (items: JobView[]) => items.length === 0
    ? <div className="empty-state"><BriefcaseBusiness size={25}/><b>No jobs found</b><span>Jobs you create will appear here with their crypto denomination and current status.</span></div>
    : items.map((job) => <div className="job" key={job.id}>
        <div className="job-main"><div className="job-icon"><BriefcaseBusiness size={16}/></div><div className="job-copy"><div className="job-name">{job.title}</div><div className="job-client">{job.client_name} · Added {dateLabel(job.created_at)}</div></div></div>
        <div className="amount">{cryptoAmount(Number(job.amount), job.currency)}</div>
        <div className="job-actions">
          <span className={"status " + (job.status === "completed" ? "complete" : job.status === "cancelled" ? "pending" : "progress")}>{job.status.replace("_", " ")}</span>
          {job.status === "in_progress" && <button className="mini-action" onClick={() => void markComplete(job)}>Mark complete</button>}
          {job.status === "completed" && isCryptoAsset(job.currency) && <button className="mini-action" onClick={() => void openRequestFor(job)}>Request payment</button>}
        </div>
      </div>);

  const requestRows = (items: PaymentRequestView[], invoiceMode = false) => items.length === 0
    ? <div className="empty-state"><FileText size={25}/><b>No {invoiceMode ? "invoices" : "payment requests"} yet</b><span>Complete a crypto-denominated job, then prepare a secure payment request for your client.</span></div>
    : items.map((request) => <div className="request-row" key={request.id}>
        <div className="request-info"><b>{request.job_title}</b><span>{request.client_name} · {cryptoAmount(Number(request.amount), request.currency)}</span><small>{invoiceMode ? "Created " + dateLabel(request.created_at) : "Request created " + dateLabel(request.created_at)}</small></div>
        <div className="request-controls">
          <span className={"status " + (request.status === "shared" ? "complete" : request.status === "paid" ? "paid" : "pending")}>{request.status}</span>
          {request.status === "draft" && isCryptoAsset(request.currency) && <button className="mini-action" disabled={saving} onClick={() => void shareDraft(request.id)}>Share link</button>}
          {request.status === "shared" && <button className="mini-action danger-action" onClick={() => void revokeShare(request.id)}>Revoke link</button>}
          {request.status === "shared" && <span className="subtle-note">Awaiting verified on-chain payment</span>}
          {!isCryptoAsset(request.currency) && <span className="subtle-note">Recreate this legacy request in crypto</span>}
        </div>
      </div>);

  return <div className={"app " + (collapsed ? "sidebar-collapsed " : "") + (mobileNavOpen ? "mobile-nav-open" : "")}>
    {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
    <aside className="side">
      <div className="brand-row">
        <div className="brand"><div className="mark">t.</div><span>taskora</span></div>
        <button className="collapse-btn" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={17}/> : <ChevronLeft size={17}/>}</button>
      </div>
      <p className="label">WORKSPACE</p>
      <nav className="nav">{navs.map(({ name, icon: Icon }) => <button key={name} title={collapsed ? name : undefined} className={nav === name ? "active" : ""} onClick={() => changePage(name)}><Icon size={17}/><span>{name}</span></button>)}</nav>
      <p className="label preferences-label">PREFERENCES</p>
      <nav className="nav"><button title={collapsed ? "Settings" : undefined} onClick={() => notify("Settings will be added after the core payment workflow.")}><Settings size={17}/><span>Settings</span></button></nav>
      <div className="bottom">
        <div className="help"><strong>Need a hand?</strong><p>Turn completed work into a secure crypto payment request.</p><button onClick={() => { const first = completedJobs.find((job) => isCryptoAsset(job.currency)); if (!first) { notify("Complete a crypto-denominated job first."); return; } void openRequestFor(first); }}>Create a request ↗</button></div>
        <div className="profile"><div className="avatar">T</div><div className="profile-copy"><b>{userEmail || "Your account"}</b><div className="muted">Taskora account</div></div><button className="icon" aria-label="Sign out" onClick={signOut}><LogOut size={15}/></button></div>
      </div>
    </aside>

    <main className="main">
      <header className="top">
        <div className="top-left"><button className="mobile-menu-btn icon" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={18}/></button><span>Workspace　/　<b style={{ color: "#26332c" }}>{nav}</b></span></div>
        <div className="actions"><span className="pill">NEAR ecosystem workspace</span><button className="icon" aria-label="Search" onClick={() => notify("Search will be available across jobs and requests soon.")}><Search size={16}/></button><button className="icon" aria-label="Notifications" onClick={() => notify("You're all caught up.")}><Bell size={16}/></button></div>
      </header>

      {nav === "Overview" && <>
        <section className="welcome"><div><p className="eyebrow">YOUR WORK, IN MOTION</p><h1>Welcome to Taskora</h1><p className="sub">Manage work, prepare crypto payment requests and track your client workflow.</p></div><button className="primary" onClick={() => setOpen(true)}><Plus size={16}/> Create a job</button></section>
        <section className="stats">
          {[
            { name: "Confirmed payments", value: paidRequests.length.toString().padStart(2, "0"), foot: "Only verified payments count", icon: Wallet },
            { name: "Completed job value", value: cryptoAmount(pendingValue, "USDC"), foot: "Across crypto-denominated jobs", icon: Clock3 },
            { name: "Active jobs", value: String(activeJobs.length).padStart(2, "0"), foot: "Currently in progress", icon: BriefcaseBusiness },
            { name: "Payment requests", value: String(paymentRequests.length).padStart(2, "0"), foot: sharedRequests.length + " shared with clients", icon: Activity },
          ].map(({ name, value, foot, icon: Icon }) => <article className="card" key={name}><div className="stat-top"><span>{name}</span><Icon size={17}/></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></article>)}
        </section>
        <div className="content">
          <div>
            <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Recent jobs</h2><p className="panel-sub">Your latest client work.</p></div><button className="text-btn" onClick={() => changePage("My Jobs")}>View all ↗</button></div>{loading ? <p className="panel-sub">Loading your jobs…</p> : jobRows(jobs.slice(0, 6))}</section>
            <section className="panel" style={{ marginTop: 18 }}><div className="panel-head"><div><h2 className="panel-title">Recent payment requests</h2><p className="panel-sub">Crypto requests shared with clients.</p></div><button className="text-btn" onClick={() => changePage("My Payments")}>View payments ↗</button></div>{requestRows(paymentRequests.slice(0, 5))}</section>
          </div>
          <div>
            <section className="assistant"><span className="assistant-label"><Sparkles size={13} style={{ display: "inline" }}/> TASKORA PAYMENT ASSISTANT</span><h2>Work completed? Get your crypto request ready.</h2><p>Taskora helps structure the payment details and create a secure link for your client.</p><button onClick={() => { const first = completedJobs.find((job) => isCryptoAsset(job.currency)); if (!first) { notify("Complete a crypto-denominated job first."); return; } void openRequestFor(first); }}><Zap size={14} style={{ display: "inline" }}/> Prepare payment request　<ArrowUpRight size={13} style={{ display: "inline" }}/></button></section>
            <section className="panel activity"><div className="panel-head"><div><h2 className="panel-title">Payment workflow</h2><p className="panel-sub">Current product capabilities</p></div></div><div className="activity-row"><CheckCircle2 size={16}/><div><b>Record client work</b><span>Jobs and client details are saved privately.</span></div></div><div className="activity-row"><CheckCircle2 size={16}/><div><b>Prepare a crypto request</b><span>Use USDC or NEAR as the requested asset.</span></div></div><div className="activity-row"><Clock3 size={16}/><div><b>On-chain settlement</b><span>Wallet payment and transaction verification are the next integration stage.</span></div></div></section>
          </div>
        </div>
      </>}

      {nav === "My Jobs" && <>
        <section className="welcome"><div><p className="eyebrow">WORKSPACE</p><h1>My Jobs</h1><p className="sub">Create, organise and complete client work with crypto-denominated values.</p></div><button className="primary" onClick={() => setOpen(true)}><Plus size={16}/> Create a job</button></section>
        <section className="stats compact-stats">{[{name:"All jobs",value:jobs.length},{name:"In progress",value:activeJobs.length},{name:"Completed",value:completedJobs.length},{name:"Crypto-ready",value:cryptoJobs.length}].map((item)=><article className="card" key={item.name}><div className="stat-top"><span>{item.name}</span></div><div className="stat-value">{String(item.value).padStart(2,"0")}</div></article>)}</section>
        <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Job register</h2><p className="panel-sub">Select a status to filter your work.</p></div><div className="filter-tabs">{(["all","in_progress","completed","cancelled"] as const).map((filter)=><button key={filter} className={jobFilter===filter?"selected":""} onClick={()=>setJobFilter(filter)}>{filter==="all"?"All":filter.replace("_"," ")}</button>)}</div></div>{loading?<p className="panel-sub">Loading jobs…</p>:jobRows(filteredJobs)}</section>
      </>}

      {nav === "My Payments" && <>
        <section className="welcome"><div><p className="eyebrow">CRYPTO ACTIVITY</p><h1>My Payments</h1><p className="sub">Monitor payment requests and their settlement status.</p></div><button className="primary" onClick={()=>changePage("Invoices")}><FileText size={16}/> View invoices</button></section>
        <section className="stats compact-stats"><article className="card"><div className="stat-top"><span>Confirmed</span><CheckCircle2 size={17}/></div><div className="stat-value">{paidRequests.length}</div><div className="stat-foot">Verified payment records</div></article><article className="card"><div className="stat-top"><span>Awaiting payment</span><Clock3 size={17}/></div><div className="stat-value">{sharedRequests.length}</div><div className="stat-foot">Shared with clients</div></article><article className="card"><div className="stat-top"><span>Draft requests</span><FileText size={17}/></div><div className="stat-value">{paymentRequests.filter((r)=>r.status==="draft").length}</div><div className="stat-foot">Not yet shared</div></article></section>
        <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Payment activity</h2><p className="panel-sub">A payment is not marked complete until on-chain verification is implemented.</p></div><span className="pill">Crypto only</span></div>{loading?<p className="panel-sub">Loading payment activity…</p>:requestRows(paymentRequests)}</section>
        <div className="info-banner"><LockIconText /> Wallet connection and transaction verification are not live yet. Shared links are payment requests, not proof that funds have been received.</div>
      </>}

      {nav === "Invoices" && <>
        <section className="welcome"><div><p className="eyebrow">CLIENT DOCUMENTS</p><h1>Invoices & requests</h1><p className="sub">Create and manage crypto-denominated payment requests for completed work.</p></div><button className="primary" onClick={()=>{const first=completedJobs.find((job)=>isCryptoAsset(job.currency));if(!first){notify("Complete a crypto-denominated job first.");return;}void openRequestFor(first);}}><Plus size={16}/> New invoice</button></section>
        <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Your invoices</h2><p className="panel-sub">Each invoice is linked to a saved job and client.</p></div><span className="pill">{paymentRequests.length} total</span></div>{loading?<p className="panel-sub">Loading invoices…</p>:requestRows(paymentRequests,true)}</section>
        <div className="info-banner"><FileText size={17}/> Taskora invoices are crypto payment requests. Fiat amounts and fiat checkout are not supported.</div>
      </>}

      <p className="workspace-footer">Taskora · Crypto-first payment workflow · Built for the NEAR ecosystem</p>
    </main>

    {open && <div className="modal-bg" onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false);}}><div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p className="eyebrow">WORKSPACE</p><h2>Create a new job</h2></div><button className="close" onClick={()=>setOpen(false)} aria-label="Close"><X size={16}/></button></div><form className="form" onSubmit={submitJob}>
      <div className="field"><label htmlFor="title">Job or service name</label><input id="title" required maxLength={180} placeholder="e.g. Brand identity design" value={form.title} onChange={(event)=>setForm({...form,title:event.target.value})}/></div>
      <div className="field"><label htmlFor="client">Client name</label><input id="client" required maxLength={160} placeholder="Who is this work for?" value={form.client} onChange={(event)=>setForm({...form,client:event.target.value})}/></div>
      <div className="field"><label htmlFor="amount">Agreed crypto amount</label><div className="amount-input"><input id="amount" required min="0.000001" step="any" type="number" placeholder={form.currency==="USDC"?"e.g. 125.00":"e.g. 2.5"} value={form.amount} onChange={(event)=>setForm({...form,amount:event.target.value})}/><select aria-label="Payment asset" value={form.currency} onChange={(event)=>setForm({...form,currency:event.target.value as Asset})}><option value="USDC">USDC</option><option value="NEAR">NEAR</option></select></div><small className="field-hint">{form.currency==="USDC"?"USD-pegged crypto stablecoin denomination.":"Native NEAR token denomination."}</small></div>
      <div className="field"><label htmlFor="description">Work description (optional)</label><textarea id="description" maxLength={4000} placeholder="Add a short note..." value={form.description} onChange={(event)=>setForm({...form,description:event.target.value})}/></div>
      <div className="form-actions"><button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={saving}>{saving?"Saving…":<><Plus size={14}/> Add job</>}</button></div>
    </form></div></div>}

    {requestOpen && <div className="modal-bg" onMouseDown={(event)=>{if(event.target===event.currentTarget)setRequestOpen(false);}}><div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p className="eyebrow">TASKORA ASSISTANT</p><h2>Prepare a crypto invoice</h2></div><button className="close" onClick={()=>setRequestOpen(false)} aria-label="Close"><X size={16}/></button></div><form className="form" onSubmit={savePaymentRequest}>
      <div className="field"><label htmlFor="request-job">Completed job</label><select id="request-job" required value={selected} onChange={(event)=>setSelected(event.target.value)}>{completedJobs.filter((job)=>isCryptoAsset(job.currency)).map((job)=><option key={job.id} value={job.id}>{job.title} — {job.client_name} ({cryptoAmount(Number(job.amount),job.currency)})</option>)}</select></div>
      <div className="field"><label htmlFor="request-note">Work summary for your client</label><textarea id="request-note" maxLength={4000} placeholder="Summarise what was delivered..." value={requestNote} onChange={(event)=>setRequestNote(event.target.value)}/></div>
      <p className="form-hint">A private, expiring request link will be created. This is not a live payment checkout; wallet settlement and on-chain verification are still being integrated.</p>
      <div className="form-actions"><button type="button" className="secondary" onClick={()=>setRequestOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={saving||!selected}>{saving?"Saving…":<><FileText size={14}/> Create invoice</>}</button></div>
    </form></div></div>}
    {toast && <div className="toast"><span>{toast}</span>{shareUrl&&<div className="toast-actions"><button type="button" onClick={()=>void navigator.clipboard.writeText(shareUrl)}><Copy size={12}/> Copy link</button><a href={shareUrl} target="_blank" rel="noreferrer">Preview</a></div>}</div>}
  </div>;
}

function LockIconText() {
  return <><Clock3 size={17}/> Wallet connection and transaction verification are not live yet. Shared links are requests, not proof that funds have been received.</>;
}
