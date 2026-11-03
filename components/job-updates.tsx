"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Paperclip, Plus, Trash2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type JobUpdate = Tables<"job_updates">;
type UpdateWithUrl = JobUpdate & { attachmentUrl: string | null };
const BUCKET = "taskora-work-evidence";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"];

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function JobUpdates({ jobId }: { jobId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [updates, setUpdates] = useState<UpdateWithUrl[]>([]);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase.from("job_updates")
      .select("*").eq("job_id", jobId).order("created_at", { ascending: false });
    if (queryError) {
      setError("Couldn't load progress history. Please try again.");
      setLoading(false);
      return;
    }
    const rows = data ?? [];
    const hydrated = await Promise.all(rows.map(async (row) => {
      if (!row.attachment_path) return { ...row, attachmentUrl: null };
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(row.attachment_path, 60 * 10);
      return { ...row, attachmentUrl: signed?.signedUrl ?? null };
    }));
    setUpdates(hydrated);
    setLoading(false);
  }, [jobId, supabase]);

  useEffect(() => { void load(); }, [load]);

  function chooseFile(next: File | null) {
    if (!next) { setFile(null); return; }
    if (!ALLOWED_TYPES.includes(next.type)) {
      setError("Use a JPG, PNG, WebP, PDF, or plain-text file.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (next.size < 1 || next.size > MAX_FILE_SIZE) {
      setError("Files must be smaller than 10 MB.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setError("");
    setFile(next);
  }

  async function addUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = content.trim();
    if ((!note && !file) || saving) return;
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setError("Please sign in again to add an update."); return; }

    let attachmentPath: string | null = null;
    if (file) {
      const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "evidence";
      attachmentPath = user.id + "/" + jobId + "/" + crypto.randomUUID() + "-" + safeName;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(attachmentPath, file, {
        contentType: file.type, upsert: false,
      });
      if (uploadError) {
        setSaving(false);
        setError("Couldn't upload that file. Please try again.");
        return;
      }
    }

    const { error: insertError } = await supabase.from("job_updates").insert({
      job_id: jobId, user_id: user.id, content: note || "Work evidence attached.",
      attachment_path: attachmentPath,
      attachment_name: file?.name ?? null,
      attachment_mime_type: file?.type ?? null,
      attachment_size: file?.size ?? null,
    });
    if (insertError) {
      if (attachmentPath) await supabase.storage.from(BUCKET).remove([attachmentPath]);
      setSaving(false);
      setError("Couldn't save this update. Please try again.");
      return;
    }
    setContent("");
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setSaving(false);
    await load();
  }

  async function deleteUpdate(update: UpdateWithUrl) {
    if (!window.confirm("Delete this progress update?")) return;
    const { error: deleteError } = await supabase.from("job_updates").delete().eq("id", update.id);
    if (deleteError) { setError("Couldn't delete this update."); return; }
    if (update.attachment_path) {
      await supabase.storage.from(BUCKET).remove([update.attachment_path]);
    }
    setUpdates((current) => current.filter((item) => item.id !== update.id));
  }

  return <section className="job-updates">
    <div className="job-updates-heading">
      <span><FileText size={14}/> Progress notes &amp; evidence</span>
      <small>{updates.length} {updates.length === 1 ? "update" : "updates"}</small>
    </div>
    <form className="job-update-form" onSubmit={(event) => void addUpdate(event)}>
      <label className="job-update-label" htmlFor={"job-update-" + jobId}>Record a work update</label>
      <textarea id={"job-update-" + jobId} maxLength={5000} rows={3} value={content}
        onChange={(event) => setContent(event.target.value)} placeholder="What have you worked on? Add a progress note…" />
      <div className="job-update-form-footer">
        <div className="job-update-file">
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} aria-label="Attach work evidence" />
          <small>{file ? file.name + " · " + formatSize(file.size) : "Optional: JPG, PNG, WebP, PDF or TXT · max 10 MB"}</small>
        </div>
        <button type="submit" disabled={saving || (!content.trim() && !file)}><Plus size={13}/>{saving ? "Saving…" : "Add update"}</button>
      </div>
      {file && <button type="button" className="job-update-clear-file" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }}>Remove attachment</button>}
      {error && <p className="job-update-error" role="alert">{error} <button type="button" onClick={() => void load()}>Retry loading</button></p>}
    </form>
    <div className="job-update-history" aria-live="polite">
      {loading ? <p className="job-update-muted">Loading progress history…</p> : updates.length === 0
        ? <p className="job-update-muted">No updates yet. Add a note or attach evidence as work progresses.</p>
        : updates.map((update) => <article className="job-update-entry" key={update.id}>
          <div className="job-update-entry-head"><time dateTime={update.created_at}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(update.created_at))}</time>
            <button type="button" aria-label="Delete progress update" onClick={() => void deleteUpdate(update)}><Trash2 size={13}/></button>
          </div>
          <p>{update.content}</p>
          {update.attachment_path && <div className="job-update-attachment">
            {update.attachment_mime_type?.startsWith("image/") ? <ImageIcon size={15}/> : <Paperclip size={15}/>}
            <span>{update.attachment_name}<small>{update.attachment_size ? formatSize(update.attachment_size) : "Attachment"}</small></span>
            {update.attachmentUrl ? <a href={update.attachmentUrl} target="_blank" rel="noreferrer">View file</a> : <small>File unavailable</small>}
          </div>}
        </article>)}
    </div>
  </section>;
}
