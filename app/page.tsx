"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, Bot, BriefcaseBusiness, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, Copy, CreditCard, FileText, LayoutDashboard,
  LogOut, Menu, Plus, Search, Send, Settings, Sparkles, Wallet, X, Zap
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import JobMilestones from "@/components/job-milestones";
import JobUpdates from "@/components/job-updates";
import type { Tables } from "@/lib/supabase/database.types";

type JobRow = Tables<"jobs">;
type ClientRow = Tables<"clients">;
type PaymentRequestRow = Tables<"payment_requests">;
type PaymentRequestView = Omit<PaymentRequestRow, "owner_share_token"> & { client_name: string; job_title: string };
type JobStatus = "in_progress" | "completed" | "cancelled";
type JobView = JobRow & { client_name: string };
type PageName = "Overview" | "My Jobs" | "My Payments" | "Invoices" | "Assistant" | "Settings";
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
  const [completionJob, setCompletionJob] = useState<JobView | null>(null);
  const [completionAcknowledged, setCompletionAcknowledged] = useState(false);
  const [amountEditJob, setAmountEditJob] = useState<JobView | null>(null);
  const [editedAmount, setEditedAmount] = useState("");
  const [toast, setToast] = useState("");
  const [nav, setNav] = useState<PageName>("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileFullName, setProfileFullName] = useState("");
  const [profileBusinessName, setProfileBusinessName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [jobFilter, setJobFilter] = useState<"all" | JobStatus>("all");
  const [selected, setSelected] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantConversationId, setAssistantConversationId] = useState<string | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<{ role: "assistant" | "user"; content: string }[]>([
    { role: "assistant", content: "Hi! I can help you navigate your Taskora workspace and prepare payment requests from completed jobs. Try asking me to show completed jobs, check pending requests, or prepare an invoice." },
  ]);
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
    const [{ data: jobRows, error: jobsError }, { data: clients, error: clientsError }, { data: requestRows, error: requestsError }, { data: profile }] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_requests").select("id,user_id,job_id,client_id,amount,currency,work_summary,status,created_at,updated_at,settlement_network,settlement_asset,recipient_account_id,amount_atomic").order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name,business_name").eq("id", user.id).maybeSingle(),
    ]);
    setProfileFullName(profile?.full_name ?? "");
    setProfileBusinessName(profile?.business_name ?? "");
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
    setPaymentRequests((requestRows ?? []).map((request: Omit<PaymentRequestRow, "owner_share_token">) => ({
      ...request,
      client_name: clientMap.get(request.client_id) ?? "Client",
      job_title: jobMap.get(request.job_id)?.title ?? "Job",
    })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  useEffect(() => {
    let cancelled = false;
    async function loadAssistantHistory() {
      try {
        const response = await fetch("/api/assistant/history", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as {
          conversationId?: string | null;
          messages?: { role: "assistant" | "user"; content: string }[];
        };
        if (cancelled) return;
        setAssistantConversationId(result.conversationId ?? null);
        if (result.messages?.length) setAssistantMessages(result.messages);
      } catch {
        // The chat remains usable if history is temporarily unavailable.
      }
    }
    void loadAssistantHistory();
    return () => { cancelled = true; };
  }, []);

  const activeJobs = jobs.filter((job) => job.status === "in_progress");
  const completedJobs = jobs.filter((job) => job.status === "completed");
  const cryptoJobs = jobs.filter((job) => isCryptoAsset(job.currency));
  const pendingUsdc = completedJobs.filter((job) => job.currency === "USDC")
    .reduce((sum, job) => sum + Number(job.amount), 0);
  const pendingNear = completedJobs.filter((job) => job.currency === "NEAR")
    .reduce((sum, job) => sum + Number(job.amount), 0);
  const pendingValueLabel = cryptoAmount(pendingUsdc, "USDC") + " · " +
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(pendingNear) + " NEAR";
  const paidRequests = paymentRequests.filter((request) => request.status === "paid");
  const sharedRequests = paymentRequests.filter((request) => request.status === "shared");
  const filteredJobs = jobs.filter((job) => jobFilter === "all" || job.status === jobFilter);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchJobResults = normalizedSearch
    ? jobs.filter((job) => [job.title, job.client_name, job.status, job.currency].some((value) => value.toLowerCase().includes(normalizedSearch))).slice(0, 5)
    : [];
  const searchRequestResults = normalizedSearch
    ? paymentRequests.filter((request) => [request.job_title, request.client_name, request.status, request.currency].some((value) => value.toLowerCase().includes(normalizedSearch))).slice(0, 5)
    : [];
  const notificationItems = [
    ...paymentRequests.filter((request) => request.status === "draft").slice(0, 3).map((request) => ({
      title: "Draft payment request",
      detail: request.job_title + " · " + request.client_name,
      page: "Invoices" as PageName,
    })),
    ...paymentRequests.filter((request) => request.status === "shared").slice(0, 3).map((request) => ({
      title: "Awaiting client payment",
      detail: request.job_title + " · " + request.client_name,
      page: "My Payments" as PageName,
    })),
    ...completedJobs.filter((job) => !paymentRequests.some((request) => request.job_id === job.id)).slice(0, 2).map((job) => ({
      title: "Completed job needs a request",
      detail: job.title + " · " + job.client_name,
      page: "My Jobs" as PageName,
    })),
  ].slice(0, 6);

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

  function markComplete(job: JobView) {
    if (job.status !== "in_progress") return;
    if (!isCryptoAsset(job.currency)) {
      notify("This is an older fiat record. Create a new job with a crypto amount.");
      return;
    }
    setCompletionAcknowledged(false);
    setCompletionJob(job);
  }

  async function confirmJobCompletion() {
    const job = completionJob;
    if (!job || !completionAcknowledged || saving) return;
    setSaving(true);
    const { data, error } = await supabase.from("jobs").update({
      status: "completed" satisfies JobStatus,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id).eq("status", "in_progress").select("id").maybeSingle();
    setSaving(false);
    if (error) { notify("Couldn't complete this job: " + error.message); return; }
    if (!data) {
      setCompletionJob(null);
      notify("This job has already changed. Refreshing its latest status.");
      await loadJobs();
      return;
    }
    setCompletionJob(null);
    setCompletionAcknowledged(false);
    notify("Job completed. You can now prepare its crypto payment request.");
    await loadJobs();
  }

  async function saveCompletedJobAmount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const job = amountEditJob;
    const amount = Number(editedAmount);
    if (!job || job.status !== "completed" || !Number.isFinite(amount) || amount <= 0 || saving) return;

    setSaving(true);
    const { error } = await supabase.rpc("update_completed_job_amount", {
      p_job_id: job.id,
      p_amount: amount,
    });
    setSaving(false);

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("amount is locked")) {
        notify("This amount is locked because a payment request has already been shared or paid.");
        setAmountEditJob(null);
      } else if (message.includes("completed job not found")) {
        notify("This job is no longer available to edit. Refreshing its latest status.");
        setAmountEditJob(null);
      } else {
        notify("Couldn't update the job amount. " + error.message);
      }
      await loadJobs();
      return;
    }

    setAmountEditJob(null);
    setEditedAmount("");
    notify("Completed job amount and draft invoices updated.");
    await loadJobs();
  }

  async function cancelJob(job: JobView) {
    if (job.status !== "in_progress") return;
    if (!window.confirm("Cancel this job? It will remain in your records with a cancelled status.")) return;
    const { error } = await supabase.from("jobs").update({
      status: "cancelled" satisfies JobStatus,
      completed_at: null,
    }).eq("id", job.id);
    if (error) { notify("Couldn't cancel this job: " + error.message); return; }
    notify("Job cancelled.");
    await loadJobs();
  }
  async function openRequestFor(job: JobView) {
    if (job.status !== "completed") {
      notify("Only completed jobs can have a payment request.");
      return;
    }
    if (job.currency !== "NEAR") {
      notify("Client checkout currently supports NEAR testnet only. Create a NEAR-denominated job first.");
      return;
    }
    if (paymentRequests.some((request) => request.job_id === job.id)) {
      notify("A payment request already exists for this job. Manage or reshare it from Invoices.");
      setNav("Invoices");
      return;
    }
    setSelected(job.id);
    setRequestOpen(true);
  }

  async function savePaymentRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const job = jobs.find((item) => item.id === selected);
    if (!job || job.status !== "completed" || !job.client_id || job.currency !== "NEAR") {
      notify("Choose a completed NEAR-denominated job. Client checkout currently supports NEAR testnet only.");
      return;
    }
    setSaving(true);
    const { data: existingRequest, error: existingRequestError } = await supabase
      .from("payment_requests").select("id").eq("job_id", job.id).limit(1).maybeSingle();
    if (existingRequestError) {
      setSaving(false);
      notify("Couldn't verify whether a payment request already exists. Please try again.");
      return;
    }
    if (existingRequest) {
      setSaving(false);
      setRequestOpen(false);
      notify("A payment request already exists for this job. Manage or reshare it from Invoices.");
      setNav("Invoices");
      await loadJobs();
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace("/login"); return; }
    const summary = requestNote.trim() || job.description || "Work completed as agreed.";
    const { data: paymentRequest, error } = await supabase.from("payment_requests").insert({
      user_id: user.id, job_id: job.id, client_id: job.client_id,
      amount: Number(job.amount), currency: job.currency, work_summary: summary,
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

  async function copyExistingShare(requestId: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/payment-requests/" + requestId + "/share", { method: "GET", cache: "no-store" });
      const result = await response.json() as { shareUrl?: string; error?: string };
      if (!response.ok || !result.shareUrl) {
        notify(result.error ?? "Couldn't retrieve the existing client link.");
        return;
      }
      setShareUrl(result.shareUrl);
      try {
        await navigator.clipboard.writeText(result.shareUrl);
        notify("Existing client link copied. It has not been replaced.");
      } catch {
        notify("Existing link retrieved. Use Copy link in the confirmation.");
      }
    } finally {
      setSaving(false);
    }
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

  async function deleteDraftRequest(requestId: string) {
    if (saving) return;
    if (!window.confirm("Permanently delete this draft payment request? This cannot be undone. Only drafts that have not been shared or paid can be deleted.")) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("payment_requests")
      .delete()
      .eq("id", requestId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error) {
      notify("Couldn't delete this draft. It may have payment history or may no longer be a draft.");
      return;
    }
    if (!data) {
      notify("This request is no longer a draft. Refreshing its latest status.");
      await loadJobs();
      return;
    }
    notify("Draft payment request deleted.");
    await loadJobs();
  }


  async function sendAssistantMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = assistantInput.trim();
    if (!prompt) return;
    const lower = prompt.toLowerCase();
    const previousMessages = assistantMessages.slice(-10);
    setAssistantMessages((items) => [...items, { role: "user", content: prompt }]);
    setAssistantInput("");

    if (lower.includes("invoice") || lower.includes("payment request") || lower.includes("request payment")) {
      const match = completedJobs.find((job) =>
        isCryptoAsset(job.currency) &&
        (lower.includes(job.title.toLowerCase()) || lower.includes(job.client_name.toLowerCase())
          || (!lower.includes(" for ") && !lower.includes(" of ")))
      );
      if (match) {
        const reply = "I found " + match.title + " for " + match.client_name + " (" +
          cryptoAmount(Number(match.amount), match.currency) +
          "). I've opened the payment-request form so you can review the details before creating it.";
        setAssistantMessages((items) => [...items, { role: "assistant", content: reply }]);
        void openRequestFor(match);
      } else {
        const reply = completedJobs.length
          ? "I couldn't find a matching completed crypto job. Mention the job title or client name, or review your completed work in My Jobs."
          : "There are no completed crypto-denominated jobs ready for a payment request yet. Once you complete a job, I can open its payment-request form.";
        setAssistantMessages((items) => [...items, { role: "assistant", content: reply }]);
      }
      return;
    }

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          conversationId: assistantConversationId,
          messages: [
            ...previousMessages.map((message) => ({ role: message.role, content: message.content })),
            { role: "user", content: prompt },
          ],
        }),
      });
      const result = await response.json() as { reply?: string; error?: string; conversationId?: string };
      if (!response.ok) throw new Error(result.error ?? "Taskora Assistant couldn't respond right now.");
      if (result.conversationId) setAssistantConversationId(result.conversationId);
      setAssistantMessages((items) => [
        ...items,
        { role: "assistant", content: result.reply ?? "I couldn't form a response. Please try again." },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong while contacting Taskora Assistant.";
      setAssistantMessages((items) => [...items, { role: "assistant", content: message }]);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace("/login"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profileFullName.trim() || null,
      business_name: profileBusinessName.trim() || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { notify("Couldn't save your profile: " + error.message); return; }
    notify("Profile settings saved.");
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      notify("Use a password with at least 8 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) { notify("Couldn't update your password: " + error.message); return; }
    setNewPassword("");
    notify("Your password has been updated.");
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
    { name: "Assistant" as PageName, icon: Bot },
    { name: "Settings" as PageName, icon: Settings },
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
          {job.status === "in_progress" && <><button className="mini-action" onClick={() => void markComplete(job)}>Mark complete</button><button className="mini-action danger-action" onClick={() => void cancelJob(job)}>Cancel job</button></>}
          {job.status === "completed" && job.currency === "NEAR" && <><button className="mini-action" onClick={() => { setAmountEditJob(job); setEditedAmount(String(job.amount)); }}>Edit amount</button><button className="mini-action" onClick={() => void openRequestFor(job)}>Request payment</button></>}
          {job.status === "completed" && job.currency === "USDC" && <span className="subtle-note">NEAR testnet checkout only</span>}
        </div>
        <JobMilestones jobId={job.id}/>
        <JobUpdates jobId={job.id}/>
      </div>);

  const requestRows = (items: PaymentRequestView[], invoiceMode = false) => items.length === 0
    ? <div className="empty-state"><FileText size={25}/><b>No {invoiceMode ? "invoices" : "payment requests"} yet</b><span>Complete a crypto-denominated job, then prepare a secure payment request for your client.</span></div>
    : items.map((request) => <div className="request-row" key={request.id}>
        <div className="request-info"><b>{request.job_title}</b><span>{request.client_name} · {cryptoAmount(Number(request.amount), request.currency)}</span><small>{invoiceMode ? "Created " + dateLabel(request.created_at) : "Request created " + dateLabel(request.created_at)}</small></div>
        <div className="request-controls">
          <span className={"status " + (request.status === "shared" ? "complete" : request.status === "paid" ? "paid" : "pending")}>{request.status}</span>
          {request.status === "draft" && request.currency === "NEAR" && <button className="mini-action" disabled={saving} onClick={() => void shareDraft(request.id)}>Share link</button>}
          {request.status === "draft" && request.currency === "USDC" && <span className="subtle-note">USDC checkout is not enabled yet</span>}
          {request.status === "draft" && <button className="mini-action danger-action" disabled={saving} onClick={() => void deleteDraftRequest(request.id)}>Delete draft</button>}
          {request.status === "shared" && <button className="mini-action" disabled={saving} onClick={() => void copyExistingShare(request.id)}><Copy size={12}/> Copy link</button>}
          {request.status === "shared" && <button className="mini-action danger-action" disabled={saving} onClick={() => void revokeShare(request.id)}>Revoke link</button>}
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
      <nav className="nav"><button title={collapsed ? "Settings" : undefined} className={nav === "Settings" ? "active" : ""} onClick={() => changePage("Settings")}><Settings size={17}/><span>Settings</span></button></nav>
      <div className="bottom">
        <div className="help"><strong>Need a hand?</strong><p>Turn completed work into a secure crypto payment request.</p><button onClick={() => { const first = completedJobs.find((job) => isCryptoAsset(job.currency)); if (!first) { notify("Complete a crypto-denominated job first."); return; } void openRequestFor(first); }}>Create a request ↗</button></div>
        <div className="profile"><div className="avatar">T</div><div className="profile-copy"><b>{userEmail || "Your account"}</b><div className="muted">Taskora account</div></div><button className="icon" aria-label="Sign out" onClick={signOut}><LogOut size={15}/></button></div>
      </div>
    </aside>

    <main className="main">
      <header className="top">
        <div className="top-left"><button className="mobile-menu-btn icon" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={18}/></button><span>Workspace　/　<b style={{ color: "#26332c" }}>{nav}</b></span></div>
        <div className="actions"><span className="pill">NEAR ecosystem workspace</span><button className="icon" aria-label="Search" aria-expanded={searchOpen} onClick={() => { setSearchOpen((value) => !value); setNotificationsOpen(false); }}><Search size={16}/></button><button className="icon notification-trigger" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setSearchOpen(false); }}><Bell size={16}/>{notificationItems.length > 0 && <span className="notification-dot"/>}</button></div>
      </header>
      {searchOpen && <section className="utility-popover search-popover" role="dialog" aria-label="Search workspace">
        <div className="utility-popover-head"><b>Search workspace</b><button className="utility-close" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={15}/></button></div>
        <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search jobs, clients or payment requests…" aria-label="Search jobs, clients or payment requests"/>
        {!normalizedSearch && <p className="utility-hint">Search by job title, client, status or crypto asset.</p>}
        {normalizedSearch && searchJobResults.length === 0 && searchRequestResults.length === 0 && <p className="utility-hint">No matching jobs or payment requests.</p>}
        {searchJobResults.map((job) => <button className="utility-result" key={"job-"+job.id} onClick={() => { setJobFilter("all"); changePage("My Jobs"); setSearchOpen(false); }}><span><b>{job.title}</b><small>{job.client_name} · Job · {job.status.replace("_"," ")}</small></span><ArrowUpRight size={14}/></button>)}
        {searchRequestResults.map((request) => <button className="utility-result" key={"request-"+request.id} onClick={() => { changePage("Invoices"); setSearchOpen(false); }}><span><b>{request.job_title}</b><small>{request.client_name} · Payment request · {request.status}</small></span><ArrowUpRight size={14}/></button>)}
      </section>}
      {notificationsOpen && <section className="utility-popover notifications-popover" role="dialog" aria-label="Workspace notifications">
        <div className="utility-popover-head"><div><b>Notifications</b><small>{notificationItems.length} items need your attention</small></div><button className="utility-close" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={15}/></button></div>
        {notificationItems.length === 0 ? <p className="utility-hint">You're all caught up. New drafts and completed jobs will appear here.</p> : notificationItems.map((item,index) => <button className="utility-result" key={item.title+"-"+index} onClick={() => { changePage(item.page); setNotificationsOpen(false); }}><span><b>{item.title}</b><small>{item.detail}</small></span><ArrowUpRight size={14}/></button>)}
      </section>}

      {nav === "Overview" && <>
        <section className="welcome"><div><p className="eyebrow">YOUR WORK, IN MOTION</p><h1>Welcome to Taskora</h1><p className="sub">Manage work, prepare crypto payment requests and track your client workflow.</p></div><button className="primary" onClick={() => setOpen(true)}><Plus size={16}/> Create a job</button></section>
        <section className="stats">
          {[
            { name: "Confirmed payments", value: paidRequests.length.toString().padStart(2, "0"), foot: "Only verified payments count", icon: Wallet },
            { name: "Completed job value", value: pendingValueLabel, foot: "USDC and NEAR values shown separately", icon: Clock3 },
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
            <section className="panel activity"><div className="panel-head"><div><h2 className="panel-title">Payment workflow</h2><p className="panel-sub">Current product capabilities</p></div></div><div className="activity-row"><CheckCircle2 size={16}/><div><b>Record client work</b><span>Jobs and client details are saved privately.</span></div></div><div className="activity-row"><CheckCircle2 size={16}/><div><b>Prepare a crypto request</b><span>Use USDC or NEAR as the requested asset.</span></div></div><div className="activity-row"><Clock3 size={16}/><div><b>NEAR testnet settlement</b><span>Eligible requests are marked paid only after server-side transaction verification.</span></div></div></section>
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
        <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Payment activity</h2><p className="panel-sub">Only payments confirmed by the server-side NEAR testnet verifier are marked paid.</p></div><span className="pill">Crypto only</span></div>{loading?<p className="panel-sub">Loading payment activity…</p>:requestRows(paymentRequests)}</section>
        <div className="info-banner"><LockIconText /> NEAR testnet checkout is available for eligible requests. A request is marked paid only after server-side transaction verification.</div>
      </>}


      {nav === "Assistant" && <>
        <section className="welcome"><div><p className="eyebrow">YOUR WORKFLOW COMPANION</p><h1>Taskora Assistant</h1><p className="sub">Get help with jobs and crypto payment requests using your live workspace data.</p></div><span className="assistant-state"><span className="live-dot"/> AI assistant · setup required</span></section>
        <div className="assistant-layout">
          <section className="panel assistant-chat-panel">
            <div className="assistant-chat-head"><div className="assistant-avatar"><Bot size={20}/></div><div><b>Taskora Assistant</b><span>Workspace tools available after sign-in</span></div><span className="assistant-beta">AI BETA</span></div>
            <div className="assistant-messages" aria-live="polite">
              {assistantMessages.map((message,index)=><div className={"chat-message "+message.role} key={index}><div className="chat-bubble">{message.content}</div></div>)}
              {loading && <p className="panel-sub">Loading your workspace context…</p>}
            </div>
            <form className="assistant-composer" onSubmit={sendAssistantMessage}><input aria-label="Ask Taskora Assistant" value={assistantInput} onChange={(event)=>setAssistantInput(event.target.value)} placeholder="Ask about jobs, payments or invoices…" maxLength={500}/><button type="submit" className="primary" disabled={!assistantInput.trim()} aria-label="Send message"><Send size={16}/></button></form>
            <p className="assistant-disclaimer">AI replies use your authenticated workspace data when Gateway access is configured. Financial actions always require your review; the Assistant cannot send or confirm payments.</p>
          </section>
          <aside className="assistant-side">
            <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Workspace snapshot</h2><p className="panel-sub">Live counts from your account.</p></div></div><div className="assistant-metric"><span>Total jobs</span><b>{jobs.length}</b></div><div className="assistant-metric"><span>Completed jobs</span><b>{completedJobs.length}</b></div><div className="assistant-metric"><span>Shared requests</span><b>{sharedRequests.length}</b></div></section>
            <section className="panel assistant-suggestions"><h2 className="panel-title">Quick prompts</h2><button onClick={()=>setAssistantInput("Show my completed jobs")}>Show my completed jobs <ArrowUpRight size={13}/></button><button onClick={()=>setAssistantInput("Show my unpaid requests")}>Show unpaid requests <ArrowUpRight size={13}/></button><button onClick={()=>setAssistantInput("Summarise my workspace")}>Summarise my workspace <ArrowUpRight size={13}/></button><button onClick={()=>setAssistantInput("Prepare an invoice")}>Prepare an invoice <ArrowUpRight size={13}/></button></section>
          </aside>
        </div>
      </>}

      {nav === "Settings" && <>
        <section className="welcome"><div><p className="eyebrow">ACCOUNT PREFERENCES</p><h1>Settings</h1><p className="sub">Manage your Taskora profile and account security. <a href="/wallet" style={{ color: "var(--accent, #16a36a)", fontWeight: 600, marginLeft: 6 }}>Connect NEAR wallet ↗</a></p></div></section>
        <div className="settings-layout">
          <section className="panel">
            <div className="panel-head"><div><h2 className="panel-title">Profile information</h2><p className="panel-sub">These details are used to identify your workspace.</p></div></div>
            <form className="form" onSubmit={saveProfile}>
              <div className="field"><label htmlFor="profile-name">Full name</label><input id="profile-name" maxLength={120} value={profileFullName} onChange={(event)=>setProfileFullName(event.target.value)} placeholder="Your full name"/></div>
              <div className="field"><label htmlFor="business-name">Business name</label><input id="business-name" maxLength={160} value={profileBusinessName} onChange={(event)=>setProfileBusinessName(event.target.value)} placeholder="Your business or studio (optional)"/></div>
              <div className="field"><label htmlFor="account-email">Account email</label><input id="account-email" value={userEmail} readOnly aria-readonly="true"/><small className="field-hint">Email address is managed by your sign-in provider.</small></div>
              <div className="form-actions"><button className="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div>
            </form>
          </section>
          <section className="panel">
            <div className="panel-head"><div><h2 className="panel-title">Password & security</h2><p className="panel-sub">Choose a strong password you don't use elsewhere.</p></div></div>
            <form className="form" onSubmit={changePassword}>
              <div className="field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" minLength={8} required autoComplete="new-password" value={newPassword} onChange={(event)=>setNewPassword(event.target.value)} placeholder="At least 8 characters"/></div>
              <div className="form-actions"><button className="primary" type="submit" disabled={saving || newPassword.length < 8}>{saving ? "Updating…" : "Update password"}</button></div>
            </form>
            <div className="settings-signout"><div><b>Sign out</b><span>End this session on this device.</span></div><button className="secondary" onClick={() => void signOut()}><LogOut size={14}/> Sign out</button></div>
          </section>
        </div>
        <div className="info-banner"><LockIconText /> Profile changes are private to your account. Password updates are handled securely by Supabase Auth.</div>
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

    {completionJob && <div className="modal-bg" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!saving)setCompletionJob(null);}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="complete-job-title"><div className="modal-head"><div><p className="eyebrow">JOB COMPLETION</p><h2 id="complete-job-title">Complete this job?</h2></div><button className="close" onClick={()=>setCompletionJob(null)} aria-label="Close" disabled={saving}><X size={16}/></button></div><div className="form"><div className="completion-summary"><strong>{completionJob.title}</strong><span>{completionJob.client_name} · {cryptoAmount(Number(completionJob.amount),completionJob.currency)}</span></div><p className="form-hint">Before confirming, make sure the agreed work has been delivered and any useful progress notes or evidence have been recorded in this job. Completion does not mean payment has been received.</p><label className="completion-confirm"><input type="checkbox" checked={completionAcknowledged} onChange={(event)=>setCompletionAcknowledged(event.target.checked)}/><span>I confirm this work has been completed and delivered to the client.</span></label><div className="form-actions"><button type="button" className="secondary" disabled={saving} onClick={()=>setCompletionJob(null)}>Not yet</button><button type="button" className="primary" disabled={saving||!completionAcknowledged} onClick={()=>void confirmJobCompletion()}>{saving?"Completing…":"Confirm completion"}</button></div></div></div></div>}

    {amountEditJob && <div className="modal-bg" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!saving)setAmountEditJob(null);}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-job-amount-title"><div className="modal-head"><div><p className="eyebrow">COMPLETED JOB</p><h2 id="edit-job-amount-title">Edit agreed amount</h2></div><button className="close" onClick={()=>setAmountEditJob(null)} aria-label="Close" disabled={saving}><X size={16}/></button></div><form className="form" onSubmit={saveCompletedJobAmount}><div className="completion-summary"><strong>{amountEditJob.title}</strong><span>{amountEditJob.client_name} · NEAR testnet</span></div><div className="field"><label htmlFor="edit-job-amount">New amount (NEAR)</label><input id="edit-job-amount" type="number" required min="0.000001" step="any" value={editedAmount} onChange={(event)=>setEditedAmount(event.target.value)} /></div><p className="form-hint">This updates the completed job and its draft payment requests. The amount is locked after a request is shared or paid. Use a small amount for this testnet checkout; no real funds are involved.</p><div className="form-actions"><button type="button" className="secondary" disabled={saving} onClick={()=>setAmountEditJob(null)}>Cancel</button><button type="submit" className="primary" disabled={saving||!editedAmount||!Number.isFinite(Number(editedAmount))||Number(editedAmount)<=0}>{saving?"Saving…":"Save amount"}</button></div></form></div></div>}
    {requestOpen && <div className="modal-bg" onMouseDown={(event)=>{if(event.target===event.currentTarget)setRequestOpen(false);}}><div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p className="eyebrow">TASKORA ASSISTANT</p><h2>Prepare a crypto invoice</h2></div><button className="close" onClick={()=>setRequestOpen(false)} aria-label="Close"><X size={16}/></button></div><form className="form" onSubmit={savePaymentRequest}>
      <div className="field"><label htmlFor="request-job">Completed job</label><select id="request-job" required value={selected} onChange={(event)=>setSelected(event.target.value)}>{completedJobs.filter((job)=>isCryptoAsset(job.currency)).map((job)=><option key={job.id} value={job.id}>{job.title} — {job.client_name} ({cryptoAmount(Number(job.amount),job.currency)})</option>)}</select></div>
      <div className="field"><label htmlFor="request-note">Work summary for your client</label><textarea id="request-note" maxLength={4000} placeholder="Summarise what was delivered..." value={requestNote} onChange={(event)=>setRequestNote(event.target.value)}/></div>
      <p className="form-hint">A private, expiring request link will be created. Eligible NEAR requests can be paid on testnet; the request is marked paid only after server-side verification.</p>
      <div className="form-actions"><button type="button" className="secondary" onClick={()=>setRequestOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={saving||!selected}>{saving?"Saving…":<><FileText size={14}/> Create invoice</>}</button></div>
    </form></div></div>}
    {toast && <div className="toast"><span>{toast}</span>{shareUrl&&<div className="toast-actions"><button type="button" onClick={()=>void navigator.clipboard.writeText(shareUrl)}><Copy size={12}/> Copy link</button><a href={shareUrl} target="_blank" rel="noreferrer">Preview</a></div>}</div>}
  </div>;
}

function LockIconText() {
  return <><Clock3 size={17}/> NEAR testnet checkout is available for eligible requests. A request is marked paid only after server-side transaction verification.</>;
}
