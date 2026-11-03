"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, ClipboardList, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Milestone = Tables<"job_milestones">;
type ChecklistItem = Tables<"milestone_checklist_items">;

export default function JobMilestones({ jobId }: { jobId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: milestoneRows, error } = await supabase
      .from("job_milestones").select("*").eq("job_id", jobId)
      .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) { setLoading(false); return; }
    const rows = milestoneRows ?? [];
    setMilestones(rows);
    if (rows.length) {
      const { data: checklistRows } = await supabase.from("milestone_checklist_items")
        .select("*").in("milestone_id", rows.map((row) => row.id))
        .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
      setItems(checklistRows ?? []);
    } else setItems([]);
    setLoading(false);
  }, [jobId, supabase]);

  useEffect(() => { if (expanded) void load(); }, [expanded, load]);

  async function addMilestone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("job_milestones").insert({
      job_id: jobId, user_id: user.id, title,
      description: newDescription.trim() || null, sort_order: milestones.length,
    });
    setSaving(false);
    if (error) return;
    setNewTitle(""); setNewDescription("");
    await load();
  }

  async function saveMilestone(id: string) {
    const title = editingTitle.trim();
    if (!title) return;
    const { error } = await supabase.from("job_milestones").update({ title }).eq("id", id);
    if (!error) { setEditingId(null); setEditingTitle(""); await load(); }
  }

  async function deleteMilestone(id: string) {
    if (!window.confirm("Delete this milestone and its checklist items?")) return;
    const { error } = await supabase.from("job_milestones").delete().eq("id", id);
    if (!error) await load();
  }

  async function setMilestoneStatus(milestone: Milestone, status: Milestone["status"]) {
    const { error } = await supabase.from("job_milestones").update({
      status, completed_at: status === "completed" ? new Date().toISOString() : null,
    }).eq("id", milestone.id);
    if (!error) await load();
  }

  async function addChecklistItem(event: React.FormEvent<HTMLFormElement>, milestoneId: string) {
    event.preventDefault();
    const title = (itemDrafts[milestoneId] ?? "").trim();
    if (!title) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const count = items.filter((item) => item.milestone_id === milestoneId).length;
    const { error } = await supabase.from("milestone_checklist_items").insert({
      milestone_id: milestoneId, user_id: user.id, title, sort_order: count,
    });
    if (!error) {
      setItemDrafts((drafts) => ({ ...drafts, [milestoneId]: "" }));
      await load();
    }
  }

  async function toggleItem(item: ChecklistItem) {
    const isCompleted = !item.is_completed;
    const { error } = await supabase.from("milestone_checklist_items").update({
      is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null,
    }).eq("id", item.id);
    if (!error) await load();
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from("milestone_checklist_items").delete().eq("id", id);
    if (!error) await load();
  }

  const done = milestones.filter((milestone) => milestone.status === "completed").length;
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.is_completed).length;

  return <section className="milestone-box">
    <button type="button" className="milestone-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      <span><ClipboardList size={14}/> Work plan <small>{done}/{milestones.length} milestones · {completedItems}/{totalItems} tasks</small></span>
      {expanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
    </button>
    {expanded && <div className="milestone-content">
      {loading ? <p className="milestone-muted">Loading work plan…</p> : milestones.length === 0
        ? <p className="milestone-muted">No milestones yet. Break this job into smaller stages.</p>
        : milestones.map((milestone) => {
          const checklist = items.filter((item) => item.milestone_id === milestone.id);
          const completed = checklist.filter((item) => item.is_completed).length;
          return <article className="milestone-card" key={milestone.id}>
            <div className="milestone-card-head">
              <div className="milestone-title-wrap">
                {editingId === milestone.id
                  ? <form className="milestone-edit" onSubmit={(event) => { event.preventDefault(); void saveMilestone(milestone.id); }}>
                      <input autoFocus maxLength={180} value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} aria-label="Edit milestone title"/>
                      <button type="submit" aria-label="Save milestone"><Check size={13}/></button>
                      <button type="button" aria-label="Cancel editing" onClick={() => setEditingId(null)}><X size={13}/></button>
                    </form>
                  : <strong>{milestone.title}</strong>}
                <small>{completed}/{checklist.length} tasks complete</small>
              </div>
              <div className="milestone-tools">
                <select aria-label="Milestone status" value={milestone.status} onChange={(event) => void setMilestoneStatus(milestone, event.target.value as Milestone["status"])}>
                  <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
                </select>
                <button type="button" aria-label="Edit milestone" onClick={() => { setEditingId(milestone.id); setEditingTitle(milestone.title); }}><Pencil size={13}/></button>
                <button type="button" aria-label="Delete milestone" onClick={() => void deleteMilestone(milestone.id)}><Trash2 size={13}/></button>
              </div>
            </div>
            {milestone.description && <p className="milestone-description">{milestone.description}</p>}
            <div className="checklist-list">
              {checklist.map((item) => <div className="checklist-item" key={item.id}>
                <label><input type="checkbox" checked={item.is_completed} onChange={() => void toggleItem(item)}/><span className={item.is_completed ? "is-done" : ""}>{item.title}</span></label>
                <button type="button" aria-label="Delete checklist item" onClick={() => void deleteItem(item.id)}><X size={12}/></button>
              </div>)}
            </div>
            <form className="checklist-add" onSubmit={(event) => void addChecklistItem(event, milestone.id)}>
              <input maxLength={240} value={itemDrafts[milestone.id] ?? ""} onChange={(event) => setItemDrafts((drafts) => ({ ...drafts, [milestone.id]: event.target.value }))} placeholder="Add a checklist task…" aria-label="New checklist task"/>
              <button type="submit" disabled={!(itemDrafts[milestone.id] ?? "").trim()}><Plus size={13}/> Add</button>
            </form>
          </article>;
        })}
      <form className="milestone-create" onSubmit={addMilestone}>
        <input required maxLength={180} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="New milestone title" aria-label="New milestone title"/>
        <input maxLength={500} value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Short description (optional)" aria-label="Milestone description"/>
        <button type="submit" disabled={saving || !newTitle.trim()}><Plus size={14}/>{saving ? "Adding…" : "Add milestone"}</button>
      </form>
    </div>}
  </section>;
}
