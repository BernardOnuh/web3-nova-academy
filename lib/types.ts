// lib/types.ts — response shapes from cohort-portal (see cohort-portal/API.md)

export interface Cohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  _count?: { students: number; courses: number };
}

export interface CourseCounts {
  students: number;
  materials?: number;
  teachings?: number;
  aiTests?: number;
  admins?: number;
}

export interface Course {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  level?: string | null;
  durationWeeks?: number | null;
  cohortId: string;
  cohort?: { id: string; name: string; startDate?: string; endDate?: string };
  curriculum?: { id: string; week: number; title: string; description?: string | null }[];
  _count?: CourseCounts;
}

export interface PublicUser {
  id: string;
  name: string;
  studentName: string | null;
  email: string;
  role: string;
  imageUrl: string | null;
  expectation: string | null;
  points: number;
  cohortId: string | null;
  courseId: string | null;
  createdAt: string;
}

export interface Profile extends PublicUser {
  cohort: { id: string; name: string } | null;
  extraCourses?: { id: string; name: string }[];
  onboardedAt?: string | null;
  profileBonus?: number | null;
  firstTestUnlocksAt?: string | null;
  course: Pick<Course, 'id' | 'name' | 'description' | 'imageUrl' | 'level' | 'durationWeeks'> | null;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  imageUrl: string | null;
  courseId: string;
  courseName: string | null;
  points: number;
  testsTaken: number;
}

export interface Leaderboard {
  cohort: { id: string; name: string } | null;
  total: number;
  entries: LeaderboardEntry[];
}

export interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  category: 'MATERIAL' | 'RECORDING';
  type: string;
  cloudinaryUrl: string;
  uploadedAt: string;
}

export interface Library {
  course: Course;
  recordings: LibraryItem[];
  materials: LibraryItem[];
}

export interface TestSummary {
  id: string;
  title: string;
  description: string | null;
  maxScore: number;
  opensAt: string | null;
  closesAt: string | null;
  taken: boolean;
  score: number | null;
  course?: { name: string };
  /** first test is locked until 24h after onboarding */
  lockedUntil?: string | null;
  lockReason?: string | null;
}

export interface TestQuestion { q: string; options: string[] }

export interface TestDetail {
  id: string;
  title: string;
  description: string | null;
  maxScore: number;
  questions: TestQuestion[];
  taken: boolean;
  score: number | null;
}

export interface AdminTest {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  maxScore: number;
  opensAt: string | null;
  closesAt: string | null;
  createdAt: string;
  questions: string;
  courseId: string;
  course?: { id: string; name: string };
  _count?: { attempts: number };
}

export interface Student {
  id: string;
  name: string;
  email: string;
  cohortId: string;
  courseId: string;
  createdAt?: string;
}

export interface Tutor {
  id: string;
  name: string;
  email: string;
  courseId: string;
  createdAt?: string;
}

export interface CourseSummary {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  level?: string | null;
}

/** GET /v2/onboarding */
export interface OnboardingStatus {
  user: PublicUser & { gender: 'MALE' | 'FEMALE' | null };
  cohort: { id: string; name: string } | null;
  course: CourseSummary | null;
  extraCourses: CourseSummary[];
  availableCourses: CourseSummary[];
  onboardedAt: string | null;
  profileCompletedAt: string | null;
  profileBonus: number | null;
  earlyBirdSlotsLeft: number;
  firstTestUnlocksAt: string | null;
  uploadsEnabled: boolean;
  /** only on POST /v2/onboarding/profile */
  awarded?: number;
  rank?: number | null;
}

export type ProofStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TaskProof {
  id: string;
  status: ProofStatus;
  imageUrl: string;
  note: string | null;
  points: number;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** GET /v2/tasks/invite */
export interface InviteTask {
  task: string;
  points: number;
  state: 'NOT_STARTED' | ProofStatus;
  latest: TaskProof | null;
}

/** GET /v2/admin/proofs */
export interface AdminProof extends TaskProof {
  task: string;
  student: { id: string; name: string; studentName: string | null; imageUrl: string | null; points: number; studentCourse: { name: string } | null };
  reviewedBy: { name: string } | null;
}
