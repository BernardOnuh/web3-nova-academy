"use client";

/**
 * CurriculumTab — Complete curriculum management for admin course page
 */

import { useState, useEffect, type ReactElement } from "react";
import {
  GraduationCap, Loader2, Edit3, Check, X, ChevronDown, ChevronUp,
  Plus, UploadCloud, Trash2, ExternalLink, BookMarked, CheckSquare,
  FileText, FileVideo, Link as LinkIcon, User, Calendar,
  Clock, Eye, Save, AlertTriangle,
} from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "https://cohort-portal-cmhj.onrender.com";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface Material {
  id: string;
  title: string;
  type: string;
  cloudinaryUrl: string;
  curriculumId?: string;
  createdAt?: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  openAt?: string;
  closeAt?: string;
  questionText?: string;
  questionDocUrl?: string;
  allowedSubmissionTypes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CurriculumWeek {
  id: string;
  week: number;
  title: string;
  description: string | null;
  courseId: string;
  cohortId: string;
  assignment?: Assignment | null;
  materials?: Material[];
  createdAt?: string;
  updatedAt?: string;
}

interface Submission {
  id: string;
  cloudinaryUrl?: string;
  contentUrl?: string;
  submissionType?: string;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
  student?: { id: string; name: string; email: string };
  user?: { id: string; name: string; email: string };
}

interface CurriculumTabProps {
  courseId: string;
  courseCohortId: string;
  curriculumWeeks: CurriculumWeek[];
  setCurriculumWeeks: React.Dispatch<React.SetStateAction<CurriculumWeek[]>>;
  onRefresh?: () => void;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const authHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const authHeadersMultipart = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return { Authorization: `Bearer ${token}` };
};

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const windowStatus = (a?: Assignment | null): { label: string; color: string; icon: ReactElement | null } => {
  if (!a?.openAt) return { label: "No window set", color: "text-gray-600", icon: null };
  const now = Date.now();
  const open = new Date(a.openAt).getTime();
  const close = new Date(a.closeAt!).getTime();
  if (now < open) return { label: `Opens ${fmt(a.openAt)}`, color: "text-amber-400", icon: <Calendar size={11} /> };
  if (now <= close) return { label: `Open until ${fmt(a.closeAt)}`, color: "text-green-400", icon: <Clock size={11} /> };
  return { label: `Closed ${fmt(a.closeAt)}`, color: "text-gray-500", icon: null };
};

const SUBMISSION_TYPES = ["url", "pdf", "doc", "image", "video", "code"] as const;

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: "bg-green-500/90 border-green-400",
    error: "bg-red-500/90 border-red-400",
    info: "bg-blue-500/90 border-blue-400",
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg border ${colors[type]} text-white text-sm shadow-lg animate-in slide-in-from-bottom-2 duration-300`}>
      {message}
    </div>
  );
}

function InlineField({
  label, value, onChange, multiline, placeholder, required = false,
}: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="bg-[#111111] border border-purple-500/40 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none w-full"
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="bg-[#111111] border border-purple-500/40 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-full"
        />
      )}
    </div>
  );
}

/* ─── Submission viewer ──────────────────────────────────────────────────── */

function SubmissionDrawer({ assignmentId, onClose }: { assignmentId: string; onClose: () => void }) {
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/admin/assignments/${assignmentId}/submissions`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to fetch submissions");
        const data: Submission[] = await res.json();
        setSubs(Array.isArray(data) ? data : []);
        const init: Record<string, { grade: string; feedback: string }> = {};
        (Array.isArray(data) ? data : []).forEach(s => {
          init[s.id] = { grade: s.grade != null ? String(s.grade) : "", feedback: s.feedback || "" };
        });
        setGrading(init);
      } catch (err) {
        console.error("Error loading submissions:", err);
        setSubs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId]);

  const saveGrade = async (subId: string) => {
    const g = grading[subId];
    if (!g?.grade) {
      setToast({ message: "Please enter a grade", type: "error" });
      return;
    }
    setSaving(subId);
    try {
      const res = await fetch(`${BASE}/admin/submissions/${subId}/grade`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ grade: Number(g.grade), feedback: g.feedback }),
      });
      if (!res.ok) throw new Error("Failed to save grade");
      setSubs(prev => prev?.map(s => s.id === subId ? { ...s, grade: Number(g.grade), feedback: g.feedback } : s) ?? null);
      setToast({ message: "Grade saved successfully", type: "success" });
    } catch (e: any) {
      setToast({ message: e.message || "Failed to save grade", type: "error" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="border-t border-gray-800 bg-[#050505] animate-in fade-in slide-in-from-top-1 duration-200">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800/60 sticky top-0 bg-[#050505] z-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <User size={12} /> Student Submissions
        </p>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
          <X size={15} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="animate-spin text-purple-400" size={24} />
        </div>
      ) : !subs || subs.length === 0 ? (
        <div className="p-12 text-center text-gray-600 text-sm">
          <User size={32} className="mx-auto mb-3 text-gray-800" />
          <p>No submissions yet.</p>
          <p className="text-xs mt-1">Students will appear here after submitting.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800/60 max-h-[60vh] overflow-y-auto">
          {subs.map(sub => {
            const student = sub.student || sub.user;
            const g = grading[sub.id] || { grade: "", feedback: "" };
            const fileUrl = sub.cloudinaryUrl || sub.contentUrl;
            return (
              <div key={sub.id} className="px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {student?.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{student?.name ?? "Unknown Student"}</p>
                      <p className="text-gray-600 text-xs truncate">{student?.email ?? "No email"}</p>
                      <p className="text-gray-700 text-[10px] mt-0.5">Submitted: {fmtTime(sub.submittedAt)}</p>
                    </div>
                  </div>

                  {fileUrl ? (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm transition-colors shrink-0"
                    >
                      <ExternalLink size={14} />
                      {sub.submissionType === "url" ? "View Submission URL" : "View Submission File"}
                    </a>
                  ) : (
                    <span className="text-gray-700 text-sm shrink-0">No file submitted</span>
                  )}

                  <div className="flex-1 flex flex-wrap items-end gap-3 ml-auto">
                    <div className="w-24">
                      <label className="block text-[10px] text-gray-600 uppercase mb-1 font-semibold">Grade (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        placeholder="0-100"
                        value={g.grade}
                        onChange={e => setGrading(p => ({ ...p, [sub.id]: { ...g, grade: e.target.value } }))}
                        className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[10px] text-gray-600 uppercase mb-1 font-semibold">Feedback</label>
                      <input
                        type="text"
                        placeholder="Add feedback for student..."
                        value={g.feedback}
                        onChange={e => setGrading(p => ({ ...p, [sub.id]: { ...g, feedback: e.target.value } }))}
                        className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      onClick={() => saveGrade(sub.id)}
                      disabled={saving === sub.id}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shrink-0"
                    >
                      {saving === sub.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {sub.grade != null ? "Update" : "Save"}
                    </button>
                    {sub.grade != null && (
                      <div className="flex items-center gap-1 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${sub.grade >= 70 ? "bg-green-500" : sub.grade >= 50 ? "bg-yellow-500" : "bg-red-500"}`} />
                        <span className="text-green-400 text-sm font-bold">{sub.grade}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Assignment panel ───────────────────────────────────────────────────── */

function AssignmentPanel({
  week,
  onAssignmentCreated,
}: {
  week: CurriculumWeek;
  onAssignmentCreated: (weekId: string, assignment: Assignment) => void;
  onAssignmentUpdated?: (weekId: string, assignment: Assignment) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    questionText: "",
    allowedTypes: "",
    questionDoc: null as File | null,
  });

  const ws = windowStatus(week.assignment);

  const handleCreate = async () => {
    if (!form.title || !form.description) {
      alert("Title and description are required.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      if (form.questionText) fd.append("questionText", form.questionText);
      if (form.allowedTypes.trim()) fd.append("allowedSubmissionTypes", form.allowedTypes.trim());
      if (form.questionDoc) fd.append("questionDoc", form.questionDoc);

      const res = await fetch(`${BASE}/admin/curriculum/${week.id}/assignment`, {
        method: "POST",
        headers: authHeadersMultipart(),
        body: fd,
      });
      if (!res.ok) {
        const e = await res.text();
        throw new Error(e || "Failed to create assignment");
      }
      const assignment: Assignment = await res.json();
      onAssignmentCreated(week.id, assignment);
      setAdding(false);
      setForm({ title: "", description: "", questionText: "", allowedTypes: "", questionDoc: null });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <CheckSquare size={11} /> Assignment
        </p>
        {!week.assignment && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors"
          >
            <Plus size={12} /> Set Assignment
          </button>
        )}
        {week.assignment && !adding && (
          <button
            onClick={() => setShowSubs(s => !s)}
            className="text-[11px] text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Eye size={11} /> {showSubs ? "Hide" : "View"} Submissions
          </button>
        )}
      </div>

      {!week.assignment && !adding && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-700 text-xs py-8 border border-dashed border-gray-800 rounded-xl gap-2">
          <CheckSquare size={24} className="text-gray-800" />
          <span>No assignment set for this week</span>
          <p className="text-[10px] text-gray-800">Click "Set Assignment" to create one</p>
        </div>
      )}

      {week.assignment && !adding && (
        <div className="space-y-2 flex-1">
          <div className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border border-gray-800 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-white text-sm font-semibold leading-snug">{week.assignment.title}</p>
              <p className="text-gray-500 text-xs leading-relaxed mt-1">{week.assignment.description}</p>
            </div>

            {week.assignment.questionText && (
              <div className="border-t border-gray-800 pt-3">
                <p className="text-[10px] text-gray-600 uppercase font-semibold mb-1.5 tracking-wider">Question / Instructions</p>
                <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{week.assignment.questionText}</p>
              </div>
            )}

            {week.assignment.questionDocUrl && (
              <a
                href={week.assignment.questionDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs transition-colors"
              >
                <ExternalLink size={12} />
                View Assignment Document
              </a>
            )}

            {week.assignment.allowedSubmissionTypes && (() => {
              try {
                const types: string[] = JSON.parse(week.assignment.allowedSubmissionTypes);
                if (types.length > 0) {
                  return (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {types.map(t => (
                        <span key={t} className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md uppercase font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>
                  );
                }
              } catch { return null; }
              return null;
            })()}

            <div className={`text-[11px] flex items-center gap-1.5 pt-1 font-medium ${ws.color}`}>
              {ws.icon}
              {ws.label}
            </div>
          </div>
        </div>
      )}

      {adding && (
        <div className="space-y-3 bg-[#111111] border border-gray-800 rounded-xl p-4">
          <InlineField label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g., Build a Landing Page" required />
          <InlineField label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} multiline placeholder="Brief context shown above the question" required />
          <InlineField label="Question Text" value={form.questionText} onChange={v => setForm(f => ({ ...f, questionText: v }))} multiline placeholder="Full instructions typed directly (optional)" />

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Question Document (Optional)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={e => setForm(f => ({ ...f, questionDoc: e.target.files?.[0] ?? null }))}
              className="w-full text-gray-500 text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-purple-500/10 file:text-purple-400 file:text-sm file:font-semibold file:cursor-pointer hover:file:bg-purple-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Allowed Submission Types
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBMISSION_TYPES.map(t => {
                let parsed: string[] = [];
                try { parsed = JSON.parse(form.allowedTypes || "[]"); } catch { parsed = []; }
                const active = parsed.includes(t);
                const toggle = () => {
                  const next = active ? parsed.filter(x => x !== t) : [...parsed, t];
                  setForm(f => ({ ...f, allowedTypes: JSON.stringify(next) }));
                };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={toggle}
                    className={`text-[11px] px-3 py-1.5 rounded-lg border uppercase font-semibold transition-all duration-200 ${
                      active
                        ? "bg-purple-500/20 border-purple-500 text-purple-300 shadow-sm shadow-purple-500/20"
                        : "bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Create Assignment
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {showSubs && week.assignment && (
        <div className="mt-4">
          <SubmissionDrawer assignmentId={week.assignment.id} onClose={() => setShowSubs(false)} />
        </div>
      )}
    </div>
  );
}

/* ─── Materials panel ────────────────────────────────────────────────────── */

// ✅ FIX: accepts fallbackCohortId so uploads work before/after seeding
function MaterialsPanel({
  week,
  fallbackCohortId,
  onMaterialAdded,
  onMaterialDeleted,
}: {
  week: CurriculumWeek;
  fallbackCohortId: string;
  onMaterialAdded: (weekId: string, material: Material) => void;
  onMaterialDeleted: (weekId: string, materialId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", type: "pdf", file: null as File | null });
  const mats = week.materials ?? [];

  // ✅ FIX: prefer week.cohortId (from DB), fall back to prop passed from parent
  const resolvedCohortId = week.cohortId || fallbackCohortId;

  const handleUpload = async () => {
    if (!form.file || !form.title) {
      alert("Title and file are required.");
      return;
    }
    if (!resolvedCohortId) {
      alert("Could not resolve cohort ID. Please refresh the page and try again.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", form.file);
      fd.append("title", form.title);
      fd.append("type", form.type);
      fd.append("courseId", week.courseId);
      fd.append("cohortId", resolvedCohortId); // ✅ FIX: always resolved
      fd.append("curriculumId", week.id);

      const res = await fetch(`${BASE}/admin/materials`, {
        method: "POST",
        headers: authHeadersMultipart(),
        body: fd,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Upload failed");
      }
      const mat: Material = await res.json();
      onMaterialAdded(week.id, mat);
      setAdding(false);
      setForm({ title: "", type: "pdf", file: null });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (matId: string) => {
    if (!confirm("Are you sure you want to delete this material? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${BASE}/admin/materials/${matId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      onMaterialDeleted(week.id, matId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <BookMarked size={11} /> Week Materials
        </p>
        <button
          onClick={() => setAdding(a => !a)}
          className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors"
        >
          <Plus size={12} /> {adding ? "Cancel" : "Add Material"}
        </button>
      </div>

      {adding && (
        <div className="bg-[#111111] border border-gray-800 rounded-xl p-4 space-y-3 mb-4">
          <InlineField
            label="Material Title"
            value={form.title}
            onChange={v => setForm(f => ({ ...f, title: v }))}
            placeholder="e.g., Week 1 Slides, Lecture Video, etc."
          />
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Material Type</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500"
            >
              <option value="pdf">📄 PDF Document</option>
              <option value="slide">📊 Presentation Slide</option>
              <option value="video">🎥 Video Lecture</option>
              <option value="link">🔗 External Link</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Upload File</label>
            <input
              type="file"
              onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
              className="w-full text-gray-500 text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-purple-500/10 file:text-purple-400 file:text-sm file:font-semibold file:cursor-pointer hover:file:bg-purple-500/20 transition-colors"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !form.file || !form.title}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/40 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            Upload Material
          </button>
        </div>
      )}

      {mats.length === 0 && !adding ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-700 text-xs py-8 border border-dashed border-gray-800 rounded-xl gap-2">
          <BookMarked size={24} className="text-gray-800" />
          <span>No materials uploaded yet</span>
          <p className="text-[10px] text-gray-800">Click "Add Material" to upload</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 max-h-[400px] overflow-y-auto pr-1">
          {mats.map(mat => (
            <div
              key={mat.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-[#111111] border border-gray-800 rounded-xl group hover:border-gray-700 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                {mat.type === "video" ? <FileVideo size={14} /> : mat.type === "link" ? <LinkIcon size={14} /> : <FileText size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{mat.title}</p>
                <p className="text-gray-600 text-[10px] uppercase">{mat.type}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <a
                  href={mat.cloudinaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-600 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="View Material"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => handleDelete(mat.id)}
                  className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete Material"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Week row ───────────────────────────────────────────────────────────── */

// ✅ FIX: accepts fallbackCohortId and threads it into MaterialsPanel
function WeekRow({
  week,
  fallbackCohortId,
  onWeekUpdated,
  onAssignmentCreated,
  onMaterialAdded,
  onMaterialDeleted,
}: {
  week: CurriculumWeek;
  fallbackCohortId: string;
  onWeekUpdated: (weekId: string, patch: Partial<CurriculumWeek>) => void;
  onAssignmentCreated: (weekId: string, assignment: Assignment) => void;
  onMaterialAdded: (weekId: string, material: Material) => void;
  onMaterialDeleted: (weekId: string, materialId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({ title: week.title ?? "", description: week.description ?? "" });

  const mats = week.materials ?? [];
  const hasAssignment = !!week.assignment;
  const ws = windowStatus(week.assignment);

  const saveWeek = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/admin/curriculum/${week.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(edits),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to save");
      }
      const updated = await res.json();
      onWeekUpdated(week.id, updated);
      setEditing(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-[#0A0A0A] border rounded-xl overflow-hidden transition-all duration-200 ${expanded ? "border-purple-500/40 shadow-lg shadow-purple-500/5" : "border-gray-800 hover:border-gray-700"}`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 transition-all duration-200 ${
          expanded
            ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20"
            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
        }`}>
          {week.week}
        </div>

        {editing ? (
          <div className="flex-1 flex flex-col sm:flex-row gap-2 min-w-0">
            <input
              value={edits.title}
              onChange={e => setEdits(p => ({ ...p, title: e.target.value }))}
              placeholder="Week title"
              className="flex-1 bg-[#111111] border border-purple-500/40 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <input
              value={edits.description}
              onChange={e => setEdits(p => ({ ...p, description: e.target.value }))}
              placeholder="Short description (optional)"
              className="flex-1 bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-base truncate">{week.title || `Week ${week.week}`}</p>
            {week.description && <p className="text-gray-500 text-xs truncate mt-0.5">{week.description}</p>}
          </div>
        )}

        {!editing && (
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${
              hasAssignment
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-gray-900 text-gray-600 border-gray-800"
            }`}>
              {hasAssignment ? "✓ Assignment" : "No Assignment"}
            </span>
            {hasAssignment && ws.label !== "No window set" && (
              <span className={`text-[10px] font-medium flex items-center gap-1 ${ws.color}`}>
                {ws.icon}
                {ws.label}
              </span>
            )}
            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${
              mats.length > 0
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-gray-900 text-gray-600 border-gray-800"
            }`}>
              {mats.length > 0 ? `📄 ${mats.length} Material${mats.length > 1 ? "s" : ""}` : "No Materials"}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button
                onClick={saveWeek}
                disabled={saving}
                className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                title="Save Changes"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEdits({ title: week.title ?? "", description: week.description ?? "" });
                }}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-2 text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
              title="Edit Week"
            >
              <Edit3 size={16} />
            </button>
          )}

          <button
            onClick={() => setExpanded(e => !e)}
            className="p-2 text-gray-600 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-800 animate-in fade-in duration-200">
          <div className="p-5">
            {/* ✅ FIX: pass fallbackCohortId down so uploads always have a cohortId */}
            <MaterialsPanel
              week={week}
              fallbackCohortId={fallbackCohortId}
              onMaterialAdded={onMaterialAdded}
              onMaterialDeleted={onMaterialDeleted}
            />
          </div>
          <div className="p-5">
            <AssignmentPanel
              week={week}
              onAssignmentCreated={onAssignmentCreated}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────────────────────── */

export default function CurriculumTab({
  courseId,
  courseCohortId,
  curriculumWeeks = [],
  setCurriculumWeeks,
  onRefresh,
}: CurriculumTabProps) {
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleSeed = async () => {
    if (!courseCohortId) {
      setToast({ message: "Cohort ID is missing — navigate here from the cohort page.", type: "error" });
      return;
    }
    if (!confirm("This will generate 12 curriculum weeks. You can edit them afterward. Continue?")) return;
    setSeeding(true);
    try {
      console.log(`Seeding curriculum for cohort ${courseCohortId} and course ${courseId}`);
      const res = await fetch(`${BASE}/admin/curriculum/seed/${courseCohortId}/${courseId}`, {
        method: "POST",
        headers: authHeadersMultipart(),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Seeding failed");
      }

      const data: CurriculumWeek[] = await res.json();
      if (Array.isArray(data)) {
        setCurriculumWeeks(data.sort((a, b) => a.week - b.week));
        setToast({ message: "Successfully generated 12 weeks!", type: "success" });
      }
      if (onRefresh) onRefresh();
    } catch (e: any) {
      console.error("Seed error:", e);
      setToast({ message: e.message || "Failed to seed curriculum", type: "error" });
    } finally {
      setSeeding(false);
    }
  };

  const handleWeekUpdated = (weekId: string, patch: Partial<CurriculumWeek>) => {
    setCurriculumWeeks(prev => prev.map(w => w.id === weekId ? { ...w, ...patch } : w));
    setToast({ message: "Week updated successfully", type: "success" });
  };

  const handleAssignmentCreated = (weekId: string, assignment: Assignment) => {
    setCurriculumWeeks(prev => prev.map(w => w.id === weekId ? { ...w, assignment } : w));
    setToast({ message: "Assignment created successfully!", type: "success" });
  };

  const handleMaterialAdded = (weekId: string, material: Material) => {
    setCurriculumWeeks(prev =>
      prev.map(w => w.id === weekId ? { ...w, materials: [material, ...(w.materials ?? [])] } : w)
    );
    setToast({ message: "Material uploaded successfully!", type: "success" });
  };

  const handleMaterialDeleted = (weekId: string, materialId: string) => {
    setCurriculumWeeks(prev =>
      prev.map(w => w.id === weekId ? { ...w, materials: (w.materials ?? []).filter(m => m.id !== materialId) } : w)
    );
    setToast({ message: "Material deleted", type: "success" });
  };

  const withAssignment = curriculumWeeks.filter(w => !!w.assignment).length;
  const withMaterials = curriculumWeeks.filter(w => (w.materials?.length ?? 0) > 0).length;
  const progressPercentage = Math.round(((withAssignment + withMaterials) / 24) * 100);

  return (
    <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ✅ FIX: warn early if cohortId is missing so the issue is obvious */}
      {!courseCohortId && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-semibold">Cohort ID Missing</p>
            <p className="text-red-400/70 text-xs mt-0.5">
              Navigate to this course from a cohort page so the cohort ID is passed correctly.
              Curriculum seeding and material uploads will not work without it.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <GraduationCap size={22} className="text-purple-400" />
            Course Curriculum
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {curriculumWeeks.length} of 12 weeks generated
          </p>
        </div>

        {curriculumWeeks.length === 0 ? (
          <button
            onClick={handleSeed}
            disabled={seeding || !courseCohortId}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-900/50 disabled:to-indigo-900/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/20"
          >
            {seeding ? <Loader2 size={18} className="animate-spin" /> : <GraduationCap size={18} />}
            {seeding ? "Generating..." : "Generate 12 Weeks"}
          </button>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
              <span className="text-sm text-gray-400">
                <span className="text-white font-semibold">{withAssignment}</span> / 12 Assignments
              </span>
            </div>
            <div className="flex items-center gap-2 bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              <span className="text-sm text-gray-400">
                <span className="text-white font-semibold">{withMaterials}</span> / 12 Weeks with Files
              </span>
            </div>
          </div>
        )}
      </div>

      {curriculumWeeks.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 font-semibold uppercase tracking-wider">
            <span>Curriculum Completion</span>
            <span className="text-purple-400">{progressPercentage}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {curriculumWeeks.length > 0 && withAssignment === 0 && withMaterials === 0 && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-sm font-semibold">Curriculum Ready for Content</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              Expand each week below to add materials and create assignments for your students.
            </p>
          </div>
        </div>
      )}

      {curriculumWeeks.length === 0 && (
        <div className="text-center py-16 flex flex-col items-center text-gray-600 bg-[#0A0A0A] rounded-2xl border border-gray-800">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
            <GraduationCap size={40} className="text-purple-400" />
          </div>
          <p className="font-semibold text-gray-400 mb-1">No Curriculum Generated</p>
          <p className="text-sm text-gray-600">Click the button above to create your 12-week course structure.</p>
        </div>
      )}

      {curriculumWeeks.length > 0 && (
        <div className="space-y-3">
          {curriculumWeeks.map(week => (
            // ✅ FIX: pass courseCohortId as fallbackCohortId to every WeekRow
            <WeekRow
              key={week.id}
              week={week}
              fallbackCohortId={courseCohortId}
              onWeekUpdated={handleWeekUpdated}
              onAssignmentCreated={handleAssignmentCreated}
              onMaterialAdded={handleMaterialAdded}
              onMaterialDeleted={handleMaterialDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}