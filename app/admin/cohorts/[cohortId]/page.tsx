// app/admin/cohorts/[cohortId]/page.tsx
"use client";

const BASE = process.env.NEXT_PUBLIC_API_BASE!;

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Users, ShieldCheck, Loader2, Mail, Trash2 } from 'lucide-react';

interface Course { id: string; name: string; cohortId: string; _count?: { students: number }; }
interface Student { id: string; name: string; email: string; cohortId: string; courseId: string; }
interface Tutor { id: string; name: string; email: string; courseId: string; }

export default function CohortDetailPage() {
  const params = useParams();
  const cohortId = params.cohortId as string;

  const [activeTab, setActiveTab] = useState<'courses' | 'students' | 'admins'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [cohortStudents, setCohortStudents] = useState<Student[]>([]);
  const [cohortTutors, setCohortTutors] = useState<Tutor[]>([]);
  
  const [cohortName, setCohortName] = useState<string>("Loading Cohort...");
  const [isLoading, setIsLoading] = useState(true);

  // New state variables for adding a custom course
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);

  useEffect(() => {
    const fetchCohortData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Fetch cohort name
        const cohortRes = await fetch(`${BASE}/admin/cohorts`, { headers });
        const cohortsData = await cohortRes.json();
        const currentCohort = cohortsData.find((c: any) => c.id === cohortId);
        if (currentCohort) setCohortName(currentCohort.name);

        // 2. Fetch courses & filter for this cohort
        const courseRes = await fetch(`${BASE}/admin/courses`, { headers });
        const coursesData = await courseRes.json();
        let cohortCourseIds: string[] = [];
        if (Array.isArray(coursesData)) {
          const filteredCourses = coursesData.filter((c: any) => c.cohortId === cohortId);
          setCourses(filteredCourses);
          cohortCourseIds = filteredCourses.map(c => c.id);
        }

        // 3. Fetch Students & filter for this cohort
        const studentRes = await fetch(`${BASE}/admin/students`, { headers }).catch(() => null);
        if (studentRes && studentRes.ok) {
          const studentData = await studentRes.json();
          if (Array.isArray(studentData)) {
            setCohortStudents(studentData.filter((s: any) => s.cohortId === cohortId));
          }
        }

        // 4. Fetch Tutors & filter by courses that belong to this cohort
        const tutorRes = await fetch(`${BASE}/admin/admins`, { headers }).catch(() => null);
        if (tutorRes && tutorRes.ok) {
          const tutorData = await tutorRes.json();
          if (Array.isArray(tutorData)) {
            setCohortTutors(tutorData.filter((t: any) => cohortCourseIds.includes(t.courseId)));
          }
        }

      } catch (error) {
        console.error("Failed to load cohort details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (cohortId) fetchCohortData();
  }, [cohortId]);

  const handleAddCustomCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    setIsSubmittingCourse(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE}/admin/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newCourseName, cohortId: cohortId }),
      });

      if (!response.ok) throw new Error('Failed to create custom course');
      const newCourse = await response.json();
      setCourses([...courses, newCourse]);
      setNewCourseName('');
      setIsAddingCourse(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmittingCourse(false);
    }
  };

  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || "Unknown Course";

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Delete this course? This will also remove its materials, assignments, and sessions.')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE}/admin/courses/${courseId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the cohort?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE}/admin/students/${studentId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setCohortStudents(cohortStudents.filter(s => s.id !== studentId));
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteTutor = async (tutorId: string) => {
    if (!confirm('Remove this tutor?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE}/admin/admins/${tutorId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setCohortTutors(cohortTutors.filter(t => t.id !== tutorId));
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit mb-4">
          <ArrowLeft size={20} />
          <span>Back to Overview</span>
        </Link>
        <h2 className="text-3xl font-bold text-white">{cohortName}</h2>
        <p className="text-gray-400">Manage courses, students, and tutors for this cohort.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-800 overflow-x-auto hide-scrollbar">
        {[
          { id: 'courses', label: 'Courses', icon: BookOpen },
          { id: 'students', label: `Students (${cohortStudents.length})`, icon: Users },
          { id: 'admins', label: `Assigned Tutors (${cohortTutors.length})`, icon: ShieldCheck }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Areas */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Loading cohort data...</p>
          </div>
        ) : (
          <>
            {/* COURSES TAB */}
            {activeTab === 'courses' && (
              <div className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Curriculum</h3>
                  <button onClick={() => setIsAddingCourse(!isAddingCourse)} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-gray-700">
                    {isAddingCourse ? "Cancel" : "+ Add Custom Course"}
                  </button>
                </div>

                {isAddingCourse && (
                  <form onSubmit={handleAddCustomCourse} className="mb-6 bg-[#0A0A0A] p-4 rounded-xl border border-purple-500/30 flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Course Name</label>
                      <input type="text" required placeholder="e.g., Advanced Cryptography" className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} />
                    </div>
                    <button type="submit" disabled={isSubmittingCourse} className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-lg flex items-center justify-center min-w-[140px]">
                      {isSubmittingCourse ? <Loader2 className="animate-spin" size={18} /> : "Save Course"}
                    </button>
                  </form>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map(course => (
                    <div key={course.id} className="bg-[#0A0A0A] border border-gray-800 p-5 rounded-xl hover:border-purple-500/50 transition-colors group relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400">
                            <BookOpen size={20} />
                          </div>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <h4 className="text-white font-bold mb-1">{course.name}</h4>
                        <p className="text-sm text-gray-500 mb-4">
                          Course ID: {course.id.substring(0,8)}...
                        </p>
                      </div>
                      <Link href={`/admin/courses/${course.id}?cohortId=${cohortId}`} className="text-purple-400 text-sm font-medium hover:text-purple-300 w-fit">
                        Manage Course &rarr;
                      </Link>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
                    </div>
                  ))}
                  {courses.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500">No courses found.</div>
                  )}
                </div>
              </div>
            )}

            {/* STUDENTS TAB */}
            {activeTab === 'students' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {cohortStudents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#1A1A1A] text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Student Name</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">Enrolled Course</th>
                          <th className="px-6 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {cohortStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-800/30 transition-colors group">
                            <td className="px-6 py-4 text-white font-medium flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              {student.name}
                            </td>
                            <td className="px-6 py-4 text-gray-400 text-sm flex items-center gap-2">
                              <Mail size={14} /> {student.email}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                                {getCourseName(student.courseId)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleDeleteStudent(student.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <Users size={48} className="mb-4 text-gray-700" />
                    <p>No students enrolled in this cohort yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* ADMINS TAB */}
            {activeTab === 'admins' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {cohortTutors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#1A1A1A] text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Tutor Name</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">Assigned Subject</th>
                          <th className="px-6 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {cohortTutors.map((tutor) => (
                          <tr key={tutor.id} className="hover:bg-gray-800/30 transition-colors group">
                            <td className="px-6 py-4 text-white font-medium flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center text-xs font-bold">
                                {tutor.name.charAt(0).toUpperCase()}
                              </div>
                              {tutor.name}
                            </td>
                            <td className="px-6 py-4 text-gray-400 text-sm flex items-center gap-2">
                              <Mail size={14} /> {tutor.email}
                            </td>
                            <td className="px-6 py-4 text-purple-400 font-medium text-sm">
                              {getCourseName(tutor.courseId)}
                            </td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleDeleteTutor(tutor.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <ShieldCheck size={48} className="mb-4 text-gray-700" />
                    <p>No tutors have been assigned to courses in this cohort yet.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}