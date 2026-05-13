// app/admin/courses/[courseId]/page.tsx
"use client";

const BASE = process.env.NEXT_PUBLIC_API_BASE!;

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, FileText, CheckSquare,
  Clock, FileVideo, Loader2, UploadCloud, Trash2, ExternalLink, Calendar, Plus, ChevronDown, ChevronUp, User, GraduationCap
} from 'lucide-react';
import CurriculumTab from '@/app/admin/courses/components/CurriculumTab'; // ✅ adjust this import path to wherever your CurriculumTab file lives

interface Course { id: string; name: string; cohortId: string; }
interface Material { id: string; title: string; type: string; cloudinaryUrl: string; courseId: string; createdAt: string; }
interface Assignment { id: string; title: string; description: string; dueDate: string; courseId: string; }
interface Submission { id: string; cloudinaryUrl: string; submittedAt: string; grade: number | null; feedback: string | null; user: { name: string; email: string; }; }
interface Session { id: string; date: string; allowedIp: string; active: boolean; courseId: string; _count?: { attendances: number }; }
interface Assessment { id: string; title: string; description: string; timeLimit: number; courseId: string; questions?: string; }
interface MCQQuestion { q: string; options: [string, string, string, string]; answer: string; }

// ✅ CurriculumWeek type needed for the curriculum tab state
interface CurriculumWeek {
  id: string; week: number; title: string; description: string | null;
  courseId: string; cohortId: string;
  assignment?: any; materials?: any[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams(); // ✅ reads ?cohortId= from the URL
  const courseId = params.courseId as string;

  const [courseName, setCourseName] = useState<string>("Loading Course...");
  const [courseCohortId, setCourseCohortId] = useState<string>(
    searchParams.get('cohortId') ?? '' // ✅ seed from URL immediately so it's available before fetch completes
  );
  const [activeTab, setActiveTab] = useState<'materials' | 'assignments' | 'assessments' | 'attendance' | 'curriculum'>('materials');
  const [isLoading, setIsLoading] = useState(true);

  // --- States ---
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [curriculumWeeks, setCurriculumWeeks] = useState<CurriculumWeek[]>([]); // ✅ curriculum state

  // Materials Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadData, setUploadData] = useState({ title: '', type: 'pdf' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Assignments State
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [assignmentData, setAssignmentData] = useState({ title: '', description: '', dueDate: '' });

  // Attendance State
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [sessionData, setSessionData] = useState({ date: '', allowedIp: '' });

  // Assessments State
  const [isAddingAssessment, setIsAddingAssessment] = useState(false);
  const [assessmentData, setAssessmentData] = useState({ title: '', description: '', timeLimit: 30, mode: 'mcq' });

  // Question builder state
  const [openQuestions, setOpenQuestions] = useState<string | null>(null);
  const [draftQuestions, setDraftQuestions] = useState<Record<string, MCQQuestion[]>>({});
  const [savingQuestions, setSavingQuestions] = useState(false);

  // Paper upload state
  const [openPaper, setOpenPaper] = useState<string | null>(null);
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [uploadingPaper, setUploadingPaper] = useState(false);

  // Submissions State
  const [openSubmissions, setOpenSubmissions] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState<string | null>(null);
  const [grading, setGrading] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [savingGrade, setSavingGrade] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Fetch course details
        const res = await fetch(`${BASE}/admin/courses`, { headers });
        const courses = await res.json();
        if (Array.isArray(courses)) {
          const currentCourse = courses.find((c: any) => c.id === courseId);
          if (currentCourse) {
            setCourseName(currentCourse.name);
            // ✅ prefer URL param, fall back to DB value
            setCourseCohortId(prev => prev || currentCourse.cohortId || '');
          }
        }

        // 2. Fetch Materials
        const matRes = await fetch(`${BASE}/admin/materials`, { headers }).catch(() => null);
        if (matRes && matRes.ok) {
          const matData = await matRes.json();
          if (Array.isArray(matData)) setMaterials(matData.filter(m => m.courseId === courseId));
        }

        // 3. Fetch Assignments 
        const assRes = await fetch(`${BASE}/admin/assignments`, { headers }).catch(() => null);
        if (assRes && assRes.ok) {
          const assData = await assRes.json();
          if (Array.isArray(assData)) setAssignments(assData.filter(a => a.courseId === courseId));
        }

        // 4. Fetch Attendance Sessions
        const sessRes = await fetch(`${BASE}/admin/attendance/sessions`, { headers }).catch(() => null);
        if (sessRes && sessRes.ok) {
          const sessData = await sessRes.json();
          if (Array.isArray(sessData)) setSessions(sessData.filter(s => s.courseId === courseId));
        }

        // 5. Fetch Assessments
        const testRes = await fetch(`${BASE}/admin/assessments`, { headers }).catch(() => null);
        if (testRes && testRes.ok) {
          const testData = await testRes.json();
          if (Array.isArray(testData)) setAssessments(testData.filter(t => t.courseId === courseId));
        }

        // ✅ 6. Fetch Curriculum weeks
        const currRes = await fetch(`${BASE}/admin/curriculum?cohortId=${courseCohortId}&courseId=${courseId}`, { headers }).catch(() => null);
        if (currRes && currRes.ok) {
          const currData = await currRes.json();
          if (Array.isArray(currData)) {
            setCurriculumWeeks(currData.sort((a: CurriculumWeek, b: CurriculumWeek) => a.week - b.week));
          }
        }

      } catch (error) {
        console.error("Failed to load course details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) fetchCourseData();
  }, [courseId]);

  // --- Handlers ---

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return alert("Please select a file to upload.");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', uploadData.title);
      formData.append('type', uploadData.type);
      formData.append('courseId', courseId);
      formData.append('cohortId', courseCohortId);
      formData.append('file', selectedFile);

      const response = await fetch(`${BASE}/admin/materials`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload material');
      const newMaterial = await response.json();
      setMaterials([newMaterial, ...materials]);
      setIsUploading(false);
      setUploadData({ title: '', type: 'pdf' });
      setSelectedFile(null);
    } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Delete this material?")) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE}/admin/materials/${materialId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMaterials(materials.filter(m => m.id !== materialId));
    } catch (error: any) { alert(error.message); }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE}/admin/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...assignmentData, courseId }),
      });
      if (!response.ok) throw new Error("Failed to create assignment");
      const newAss = await response.json();
      setAssignments([newAss, ...assignments]);
      setIsAddingAssignment(false);
      setAssignmentData({ title: '', description: '', dueDate: '' });
    } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE}/admin/attendance/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...sessionData, courseId, cohortId: courseCohortId }),
      });
      if (!response.ok) throw new Error("Failed to create session");
      const newSess = await response.json();
      setSessions([newSess, ...sessions]);
      setIsAddingSession(false);
      setSessionData({ date: '', allowedIp: '' });
    } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  const getAssessmentMode = (a: Assessment) => {
    try { const p = JSON.parse(a.questions || ''); if (p?.paperUrl) return 'file_upload'; } catch {}
    return 'mcq';
  };

  const getPaperUrl = (a: Assessment) => {
    try { return JSON.parse(a.questions || '')?.paperUrl || null; } catch { return null; }
  };

  const toggleQuestions = (assessmentId: string, existing: string | undefined) => {
    if (openQuestions === assessmentId) { setOpenQuestions(null); return; }
    setOpenPaper(null);
    setOpenQuestions(assessmentId);
    if (!draftQuestions[assessmentId]) {
      let parsed: MCQQuestion[] = [];
      try { const q = JSON.parse(existing || '[]'); if (Array.isArray(q)) parsed = q; } catch {}
      if (parsed.length === 0) parsed = [{ q: '', options: ['', '', '', ''], answer: '' }];
      setDraftQuestions(prev => ({ ...prev, [assessmentId]: parsed }));
    }
  };

  const addQuestion = (assessmentId: string) => {
    setDraftQuestions(prev => ({
      ...prev,
      [assessmentId]: [...(prev[assessmentId] || []), { q: '', options: ['', '', '', ''], answer: '' }],
    }));
  };

  const removeQuestion = (assessmentId: string, idx: number) => {
    setDraftQuestions(prev => ({ ...prev, [assessmentId]: prev[assessmentId].filter((_, i) => i !== idx) }));
  };

  const updateQuestion = (assessmentId: string, idx: number, field: keyof MCQQuestion, value: any) => {
    setDraftQuestions(prev => {
      const updated = prev[assessmentId].map((q, i) => i === idx ? { ...q, [field]: value } : q);
      return { ...prev, [assessmentId]: updated };
    });
  };

  const updateOption = (assessmentId: string, qIdx: number, oIdx: number, value: string) => {
    setDraftQuestions(prev => {
      const updated = prev[assessmentId].map((q, i) => {
        if (i !== qIdx) return q;
        const options = [...q.options] as [string, string, string, string];
        options[oIdx] = value;
        return { ...q, options };
      });
      return { ...prev, [assessmentId]: updated };
    });
  };

  const handleSaveQuestions = async (assessmentId: string) => {
    const qs = draftQuestions[assessmentId] || [];
    if (qs.some(q => !q.q || q.options.some(o => !o) || !q.answer)) {
      alert('Fill in all question text, all 4 options, and mark the correct answer for each question.');
      return;
    }
    setSavingQuestions(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE}/admin/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questions: JSON.stringify(qs) }),
      });
      setAssessments(prev => prev.map(a => a.id === assessmentId ? { ...a, questions: JSON.stringify(qs) } : a));
      setOpenQuestions(null);
    } catch (err: any) { alert(err.message); } finally { setSavingQuestions(false); }
  };

  const handleUploadPaper = async (assessmentId: string) => {
    if (!paperFile) return;
    setUploadingPaper(true);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', paperFile);
      form.append('cohortId', courseCohortId);
      const res = await fetch(`${BASE}/admin/assessments/${assessmentId}/paper`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      const paperUrl = data.cloudinaryUrl || data.url || data.paperUrl;
      if (!paperUrl) throw new Error('Upload failed — no URL returned');
      const questionsJson = JSON.stringify({ paperUrl });
      await fetch(`${BASE}/admin/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questions: questionsJson }),
      });
      setAssessments(prev => prev.map(a => a.id === assessmentId ? { ...a, questions: questionsJson } : a));
      setPaperFile(null);
      setOpenPaper(null);
    } catch (err: any) { alert(err.message); } finally { setUploadingPaper(false); }
  };

  const toggleSubmissions = async (assignmentId: string) => {
    if (openSubmissions === assignmentId) { setOpenSubmissions(null); return; }
    setOpenSubmissions(assignmentId);
    if (submissions[assignmentId]) return;
    setLoadingSubmissions(assignmentId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE}/admin/assignments/${assignmentId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list: Submission[] = Array.isArray(data) ? data : [];
      setSubmissions(prev => ({ ...prev, [assignmentId]: list }));
      const initial: Record<string, { grade: string; feedback: string }> = {};
      list.forEach(s => { initial[s.id] = { grade: s.grade != null ? String(s.grade) : '', feedback: s.feedback || '' }; });
      setGrading(prev => ({ ...prev, ...initial }));
    } catch { } finally { setLoadingSubmissions(null); }
  };

  const handleSaveGrade = async (submissionId: string) => {
    const g = grading[submissionId];
    if (!g) return;
    setSavingGrade(submissionId);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE}/admin/submissions/${submissionId}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ grade: Number(g.grade), feedback: g.feedback }),
      });
      setSubmissions(prev => {
        const updated = { ...prev };
        for (const aid in updated) {
          updated[aid] = updated[aid].map(s =>
            s.id === submissionId ? { ...s, grade: Number(g.grade), feedback: g.feedback } : s
          );
        }
        return updated;
      });
    } catch (err: any) { alert(err.message); } finally { setSavingGrade(null); }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE}/admin/attendance/sessions/${sessionId}/close`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to close session");
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, active: false } : s));
    } catch (error: any) { alert(error.message); }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE}/admin/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...assessmentData, courseId }),
      });
      if (!response.ok) throw new Error("Failed to create assessment");
      const newTest = await response.json();
      setAssessments([newTest, ...assessments]);
      setIsAddingAssessment(false);
      setAssessmentData({ title: '', description: '', timeLimit: 30, mode: 'mcq' });
    } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit mb-4">
          <ArrowLeft size={20} /><span>Back to Cohort</span>
        </button>
        <h2 className="text-3xl font-bold text-white">{courseName}</h2>
        <p className="text-gray-400">Manage curriculum, grades, and attendance for this subject.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-800 overflow-x-auto hide-scrollbar">
        {[
          { id: 'materials', label: 'Materials', icon: BookOpen },
          { id: 'assignments', label: 'Assignments', icon: CheckSquare },
          { id: 'assessments', label: 'Assessments', icon: FileText },
          { id: 'attendance', label: 'Attendance', icon: Clock },
          { id: 'curriculum', label: 'Curriculum', icon: GraduationCap }, // ✅ new tab
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <tab.icon size={18} />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Areas */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Loading course data...</p>
          </div>
        ) : (
          <>
            {/* MATERIALS TAB */}
            {activeTab === 'materials' && (
              <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Course Materials</h3>
                  <button onClick={() => setIsUploading(!isUploading)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                    <UploadCloud size={18} /><span>{isUploading ? 'Cancel Upload' : 'Upload File'}</span>
                  </button>
                </div>

                {isUploading && (
                  <form onSubmit={handleFileUpload} className="mb-8 bg-[#0A0A0A] p-6 rounded-xl border border-gray-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Material Title</label>
                        <input type="text" required className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none" value={uploadData.title} onChange={(e) => setUploadData({...uploadData, title: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Format Type</label>
                        <select className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none" value={uploadData.type} onChange={(e) => setUploadData({...uploadData, type: e.target.value})}>
                          <option value="pdf">PDF Document</option>
                          <option value="slide">Presentation Slide</option>
                          <option value="video">Video Lecture</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Select File</label>
                      <input type="file" required className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500/10 file:text-purple-400" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="bg-purple-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Submit Material"}</button>
                  </form>
                )}

                {materials.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materials.map((mat) => (
                      <div key={mat.id} className="bg-[#0A0A0A] border border-gray-800 p-4 rounded-xl flex items-start justify-between group">
                        <div className="flex gap-3 items-start">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                            {mat.type === 'video' ? <FileVideo size={20} /> : <FileText size={20} />}
                          </div>
                          <div>
                            <h4 className="text-white font-medium line-clamp-1">{mat.title}</h4>
                            <p className="text-xs text-gray-500 uppercase mt-1">{mat.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={mat.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><ExternalLink size={18} /></a>
                          <button onClick={() => handleDeleteMaterial(mat.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (!isUploading && <div className="text-center py-12 text-gray-500">No materials uploaded yet.</div>)}
              </div>
            )}

            {/* ASSIGNMENTS TAB */}
            {activeTab === 'assignments' && (
              <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Course Assignments</h3>
                  <button onClick={() => setIsAddingAssignment(!isAddingAssignment)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                    <Plus size={18} /><span>{isAddingAssignment ? 'Cancel' : 'New Assignment'}</span>
                  </button>
                </div>

                {isAddingAssignment && (
                  <form onSubmit={handleCreateAssignment} className="mb-8 bg-[#0A0A0A] p-6 rounded-xl border border-gray-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Assignment Title</label>
                        <input type="text" required placeholder="e.g. Build a Smart Contract" className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none" value={assignmentData.title} onChange={(e) => setAssignmentData({...assignmentData, title: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Due Date</label>
                        <input type="date" required className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none [color-scheme:dark]" value={assignmentData.dueDate} onChange={(e) => setAssignmentData({...assignmentData, dueDate: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Instructions</label>
                      <textarea required rows={3} placeholder="Describe the task..." className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none" value={assignmentData.description} onChange={(e) => setAssignmentData({...assignmentData, description: e.target.value})} />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="bg-purple-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Publish Assignment"}</button>
                  </form>
                )}

                {assignments.length > 0 ? (
                  <div className="space-y-3">
                    {assignments.map(ass => {
                      const isOpen = openSubmissions === ass.id;
                      const subs = submissions[ass.id] || [];
                      return (
                        <div key={ass.id} className="bg-[#0A0A0A] border border-gray-800 rounded-xl overflow-hidden">
                          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <h4 className="text-white font-bold text-lg">{ass.title}</h4>
                              <p className="text-gray-400 text-sm mt-1 line-clamp-1">{ass.description}</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase">Due Date</p>
                                <p className="text-purple-400 font-medium">{new Date(ass.dueDate).toLocaleDateString()}</p>
                              </div>
                              <button
                                onClick={() => toggleSubmissions(ass.id)}
                                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-gray-700"
                              >
                                {loadingSubmissions === ass.id ? <Loader2 size={14} className="animate-spin" /> : isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                Submissions
                              </button>
                            </div>
                          </div>

                          {isOpen && (
                            <div className="border-t border-gray-800 animate-in fade-in duration-200">
                              {loadingSubmissions === ass.id ? (
                                <div className="p-8 flex justify-center text-gray-500"><Loader2 className="animate-spin" size={22} /></div>
                              ) : subs.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">No submissions yet.</div>
                              ) : (
                                <div className="divide-y divide-gray-800">
                                  {subs.map(sub => {
                                    const g = grading[sub.id] || { grade: '', feedback: '' };
                                    const isGraded = sub.grade != null;
                                    return (
                                      <div key={sub.id} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
                                        <div className="flex items-center gap-3 min-w-[200px]">
                                          <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                                            <User size={16} />
                                          </div>
                                          <div>
                                            <p className="text-white text-sm font-medium">{sub.user?.name || 'Unknown'}</p>
                                            <p className="text-gray-500 text-xs">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                                          </div>
                                        </div>
                                        <a href={sub.cloudinaryUrl} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm shrink-0 mt-1">
                                          <ExternalLink size={14} /> View File
                                        </a>
                                        <div className="flex flex-1 items-end gap-3 flex-wrap">
                                          <div>
                                            <label className="block text-xs text-gray-500 uppercase mb-1">Grade (%)</label>
                                            <input type="number" min="0" max="100"
                                              placeholder={isGraded ? String(sub.grade) : '—'}
                                              className="w-24 bg-[#111111] border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-purple-500"
                                              value={g.grade}
                                              onChange={e => setGrading(prev => ({ ...prev, [sub.id]: { ...g, grade: e.target.value } }))}
                                            />
                                          </div>
                                          <div className="flex-1 min-w-[160px]">
                                            <label className="block text-xs text-gray-500 uppercase mb-1">Feedback</label>
                                            <input type="text" placeholder="Optional comment..."
                                              className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-purple-500"
                                              value={g.feedback}
                                              onChange={e => setGrading(prev => ({ ...prev, [sub.id]: { ...g, feedback: e.target.value } }))}
                                            />
                                          </div>
                                          <button onClick={() => handleSaveGrade(sub.id)}
                                            disabled={savingGrade === sub.id || !g.grade}
                                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors shrink-0">
                                            {savingGrade === sub.id ? <Loader2 size={14} className="animate-spin" /> : isGraded ? 'Update' : 'Save Grade'}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (!isAddingAssignment && <div className="text-center py-12 text-gray-500 flex flex-col items-center"><CheckSquare size={48} className="mb-4 text-gray-700" /><p>No assignments created yet.</p></div>)}
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Class Sessions</h3>
                  <button onClick={() => setIsAddingSession(!isAddingSession)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                    <Plus size={18} /><span>{isAddingSession ? 'Cancel' : 'New Session'}</span>
                  </button>
                </div>

                {isAddingSession && (
                  <form onSubmit={handleCreateSession} className="mb-8 bg-[#0A0A0A] p-6 rounded-xl border border-gray-800 flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Date</label>
                      <input type="date" required className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none [color-scheme:dark]" value={sessionData.date} onChange={(e) => setSessionData({...sessionData, date: e.target.value})} />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Allowed IP (optional)</label>
                      <input type="text" placeholder="e.g. 192.168.1.0" className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none" value={sessionData.allowedIp} onChange={(e) => setSessionData({...sessionData, allowedIp: e.target.value})} />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="bg-purple-600 text-white px-6 py-2 rounded-lg h-[42px] flex items-center justify-center min-w-[120px]">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Start Session"}</button>
                  </form>
                )}

                {sessions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sessions.map(sess => (
                      <div key={sess.id} className="bg-[#0A0A0A] border border-gray-800 p-5 rounded-xl hover:border-purple-500/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center">
                            <Calendar size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-bold">{new Date(sess.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sess.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                                {sess.active ? 'Open' : 'Closed'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">{sess._count?.attendances ?? 0} attendances</p>
                          </div>
                        </div>
                        {sess.active && (
                          <button onClick={() => handleCloseSession(sess.id)}
                            className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20">
                            Close Session
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (!isAddingSession && <div className="text-center py-12 text-gray-500 flex flex-col items-center"><Clock size={48} className="mb-4 text-gray-700" /><p>No class sessions recorded yet.</p></div>)}
              </div>
            )}

            {/* ASSESSMENTS TAB */}
            {activeTab === 'assessments' && (
              <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Course Assessments</h3>
                  <button onClick={() => setIsAddingAssessment(!isAddingAssessment)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                    <Plus size={18} /><span>{isAddingAssessment ? 'Cancel' : 'New Assessment'}</span>
                  </button>
                </div>

                {isAddingAssessment && (
                  <form onSubmit={handleCreateAssessment} className="mb-8 bg-[#0A0A0A] p-6 rounded-xl border border-gray-800 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Assessment Mode</label>
                      <div className="flex gap-2">
                        {[{ v: 'mcq', label: 'Multiple Choice (MCQ)' }, { v: 'file_upload', label: 'File Upload (Question Paper)' }].map(({ v, label }) => (
                          <button key={v} type="button"
                            onClick={() => setAssessmentData({ ...assessmentData, mode: v })}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${assessmentData.mode === v ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}
                          >{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Title</label>
                        <input type="text" required placeholder="e.g. Midterm Quiz" className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none" value={assessmentData.title} onChange={(e) => setAssessmentData({...assessmentData, title: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Time Limit (Minutes)</label>
                        <input type="number" min="1" required className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none" value={assessmentData.timeLimit} onChange={(e) => setAssessmentData({...assessmentData, timeLimit: parseInt(e.target.value) || 0})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Instructions</label>
                      <textarea required rows={2} placeholder="Provide instructions..." className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none" value={assessmentData.description} onChange={(e) => setAssessmentData({...assessmentData, description: e.target.value})} />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="bg-purple-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Create Assessment'}</button>
                  </form>
                )}

                {assessments.length > 0 ? (
                  <div className="space-y-3">
                    {assessments.map(assessment => {
                      const mode = getAssessmentMode(assessment);
                      const paperUrl = getPaperUrl(assessment);
                      const qs = draftQuestions[assessment.id] || [];
                      const isQOpen = openQuestions === assessment.id;
                      const isPaperOpen = openPaper === assessment.id;
                      let existingQCount = 0;
                      try { const p = JSON.parse(assessment.questions || '[]'); if (Array.isArray(p)) existingQCount = p.length; } catch {}

                      return (
                        <div key={assessment.id} className="bg-[#0A0A0A] border border-gray-800 rounded-xl overflow-hidden">
                          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center shrink-0">
                                <FileText size={24} />
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-lg">{assessment.title}</h4>
                                <p className="text-gray-400 text-sm mt-1 line-clamp-1">{assessment.description}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-xs text-gray-400 bg-[#111111] border border-gray-800 px-2 py-1 rounded-md flex items-center gap-1">
                                    <Clock size={11} /> {assessment.timeLimit} min
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-md border font-medium ${mode === 'mcq' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                    {mode === 'mcq' ? `MCQ${existingQCount > 0 ? ` · ${existingQCount}q` : ''}` : `File Upload${paperUrl ? ' · Paper uploaded' : ''}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                              {mode === 'mcq' ? (
                                <button onClick={() => toggleQuestions(assessment.id, assessment.questions)}
                                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors border ${isQOpen ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-white'}`}>
                                  {isQOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  {existingQCount > 0 ? 'Edit Questions' : 'Add Questions'}
                                </button>
                              ) : (
                                <button onClick={() => { setOpenPaper(isPaperOpen ? null : assessment.id); setOpenQuestions(null); setPaperFile(null); }}
                                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors border ${isPaperOpen ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-white'}`}>
                                  <UploadCloud size={14} />
                                  {paperUrl ? 'Replace Paper' : 'Upload Paper'}
                                </button>
                              )}
                            </div>
                          </div>

                          {isQOpen && (
                            <div className="border-t border-gray-800 p-5 space-y-4 animate-in fade-in duration-200">
                              <p className="text-xs text-gray-500 uppercase font-medium">Question Builder</p>
                              {qs.map((q, qi) => (
                                <div key={qi} className="bg-[#111111] border border-gray-800 rounded-xl p-4 space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-blue-400 font-bold text-sm shrink-0">Q{qi + 1}.</span>
                                    <input type="text" placeholder="Question text..." value={q.q}
                                      className="flex-1 bg-[#0A0A0A] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500"
                                      onChange={e => updateQuestion(assessment.id, qi, 'q', e.target.value)} />
                                    <button onClick={() => removeQuestion(assessment.id, qi)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0"><Trash2 size={15} /></button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                                    {q.options.map((opt, oi) => (
                                      <label key={oi} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${q.answer === opt && opt ? 'border-green-500/50 bg-green-500/5' : 'border-gray-700'}`}>
                                        <input type="radio" name={`q-${assessment.id}-${qi}`} checked={q.answer === opt && !!opt}
                                          onChange={() => opt && updateQuestion(assessment.id, qi, 'answer', opt)} className="accent-green-500 shrink-0" />
                                        <input type="text" placeholder={`Option ${oi + 1}`} value={opt}
                                          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
                                          onChange={e => { updateOption(assessment.id, qi, oi, e.target.value); if (q.answer === opt) updateQuestion(assessment.id, qi, 'answer', e.target.value); }} />
                                      </label>
                                    ))}
                                  </div>
                                  {q.answer && <p className="text-xs text-green-400 pl-6">✓ Correct: {q.answer}</p>}
                                </div>
                              ))}
                              <div className="flex gap-3">
                                <button onClick={() => addQuestion(assessment.id)} type="button"
                                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg text-sm transition-colors">
                                  <Plus size={14} /> Add Question
                                </button>
                                <button onClick={() => handleSaveQuestions(assessment.id)} disabled={savingQuestions}
                                  className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 text-white rounded-lg text-sm font-bold transition-colors">
                                  {savingQuestions ? <Loader2 size={14} className="animate-spin" /> : 'Save Questions'}
                                </button>
                              </div>
                            </div>
                          )}

                          {isPaperOpen && (
                            <div className="border-t border-gray-800 p-5 space-y-3 animate-in fade-in duration-200">
                              {paperUrl && (
                                <div className="flex items-center gap-2 text-sm text-orange-400 bg-orange-500/5 border border-orange-500/20 rounded-lg px-4 py-2">
                                  <ExternalLink size={14} />
                                  <a href={paperUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Current paper — click to view</a>
                                </div>
                              )}
                              <div className="flex items-end gap-3">
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-500 uppercase mb-1">Question Paper (PDF / DOC)</label>
                                  <input type="file" accept=".pdf,.doc,.docx"
                                    className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500/10 file:text-orange-400 file:text-sm"
                                    onChange={e => setPaperFile(e.target.files?.[0] || null)} />
                                </div>
                                <button onClick={() => handleUploadPaper(assessment.id)} disabled={!paperFile || uploadingPaper}
                                  className="flex items-center gap-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-900/50 text-white rounded-lg text-sm font-bold transition-colors shrink-0">
                                  {uploadingPaper ? <Loader2 size={14} className="animate-spin" /> : <><UploadCloud size={14} /> Upload</>}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (!isAddingAssessment && <div className="text-center py-12 text-gray-500 flex flex-col items-center"><FileText size={48} className="mb-4 text-gray-700" /><p>No assessments created yet.</p></div>)}
              </div>
            )}

            {/* ✅ CURRICULUM TAB — passes cohortId from URL so seeding works */}
            {activeTab === 'curriculum' && (
              <CurriculumTab
                courseId={courseId}
                courseCohortId={courseCohortId}
                curriculumWeeks={curriculumWeeks}
                setCurriculumWeeks={setCurriculumWeeks}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}