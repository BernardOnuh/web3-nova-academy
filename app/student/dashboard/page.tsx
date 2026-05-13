"use client";

import { useEffect, useState, useRef } from 'react';
import { BookOpen, Clock, CheckSquare, FileText, GraduationCap, Loader2, ArrowRight, TrendingUp, MessageCircle, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_API_BASE!;
const WHATSAPP_GROUP = 'https://chat.whatsapp.com/Fcje58kq9qQLCK4U4mo4Xy?mode=gi_t';

export default function StudentDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [upcomingAssessments, setUpcomingAssessments] = useState(0);
  const [userName, setUserName] = useState('');
  const [showWhatsappPrompt, setShowWhatsappPrompt] = useState(true);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const [canDismiss, setCanDismiss] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // WhatsApp prompt countdown - can't dismiss until timer reaches 0
  useEffect(() => {
    if (!showWhatsappPrompt) return;
    
    countdownRef.current = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          setCanDismiss(true);
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showWhatsappPrompt]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    try {
      const payload = JSON.parse(atob(token!.split('.')[1]));
      setUserName(payload.email?.split('@')[0] || 'Student');
    } catch {}
    const headers = { Authorization: `Bearer ${token}` };
    const now = new Date();
    Promise.all([
      fetch(`${BASE}/student/attendance`, { headers }).then(r => r.json()).catch(() => []),
      fetch(`${BASE}/student/assignments`, { headers }).then(r => r.json()).catch(() => []),
      fetch(`${BASE}/student/assessments`, { headers }).then(r => r.json()).catch(() => []),
    ]).then(([attendance, assignments, assessments]) => {
      if (Array.isArray(attendance)) setAttendanceCount(attendance.length);
      if (Array.isArray(assignments)) setPendingAssignments(assignments.filter((a: any) => new Date(a.dueDate) > now).length);
      if (Array.isArray(assessments)) setUpcomingAssessments(assessments.filter((a: any) => new Date(a.dueDate) > now).length);
    }).finally(() => setIsLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = [
    {
      label: 'Sessions Attended',
      value: attendanceCount,
      icon: Clock,
      href: '/student/attendance',
      accent: '#3b82f6',
      accentBg: 'rgba(59,130,246,0.12)',
      accentBorder: 'rgba(59,130,246,0.25)',
      note: 'Total recorded sessions',
    },
    {
      label: 'Pending Assignments',
      value: pendingAssignments,
      icon: CheckSquare,
      href: '/student/assignments',
      accent: '#f59e0b',
      accentBg: 'rgba(245,158,11,0.12)',
      accentBorder: 'rgba(245,158,11,0.25)',
      note: pendingAssignments === 0 ? 'All caught up! 🎉' : 'Due soon — check now',
    },
    {
      label: 'Upcoming Assessments',
      value: upcomingAssessments,
      icon: FileText,
      href: '/student/assessments',
      accent: '#a78bfa',
      accentBg: 'rgba(167,139,250,0.12)',
      accentBorder: 'rgba(167,139,250,0.25)',
      note: upcomingAssessments === 0 ? 'Nothing scheduled' : 'Prepare in advance',
    },
  ];

  const quickLinks = [
    {
      title: 'Course Materials',
      desc: 'Lectures, slides & resources',
      href: '/student/materials',
      icon: BookOpen,
      accent: '#3b82f6',
      accentBg: 'rgba(59,130,246,0.12)',
    },
    {
      title: 'My Grades',
      desc: 'Scores for assignments & tests',
      href: '/student/grades',
      icon: GraduationCap,
      accent: '#10b981',
      accentBg: 'rgba(16,185,129,0.12)',
    },
    {
      title: 'Progress',
      desc: 'Track your performance',
      href: '/student/grades',
      icon: TrendingUp,
      accent: '#f59e0b',
      accentBg: 'rgba(245,158,11,0.12)',
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700&display=swap');

        .db-root {
          font-family: 'Outfit', system-ui, sans-serif;
          color: #e5e7eb;
          max-width: 1100px;
        }

        /* ── WhatsApp Prompt (REQUIRED) ── */
        .db-whatsapp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          animation: fadeInOverlay 0.3s ease;
          padding: 20px;
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .db-whatsapp-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          border: 2px solid rgba(59,130,246,0.4);
          border-radius: 24px;
          padding: 40px;
          max-width: 480px;
          text-align: center;
          animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.2);
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.85) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .db-whatsapp-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -30%;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        
        .db-whatsapp-card::after {
          content: '';
          position: absolute;
          bottom: -40%;
          left: -20%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(34,211,102,0.12) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .db-whatsapp-icon {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #25d366 0%, #20ba5a 100%);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 12px 32px rgba(37,211,102,0.35);
          animation: iconBounce 0.6s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes iconBounce {
          0% { transform: scale(0) rotate(-20deg); }
          100% { transform: scale(1) rotate(0); }
        }

        .db-whatsapp-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #f87171;
          margin-bottom: 16px;
        }

        .db-whatsapp-title {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #f3f4f6;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .db-whatsapp-subtitle {
          font-size: 15px;
          color: #ef4444;
          font-weight: 700;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }

        .db-whatsapp-desc {
          font-size: 15px;
          color: #d1d5db;
          line-height: 1.7;
          margin-bottom: 12px;
        }

        .db-whatsapp-highlight {
          background: rgba(37,211,102,0.15);
          border: 1px solid rgba(37,211,102,0.3);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #22c55e;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .db-whatsapp-btn-primary {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #25d366 0%, #20ba5a 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          letter-spacing: -0.01em;
          box-shadow: 0 8px 24px rgba(37,211,102,0.3);
          margin-bottom: 16px;
        }
        .db-whatsapp-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(37,211,102,0.4);
        }
        .db-whatsapp-btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .db-whatsapp-btn-skip {
          width: 100%;
          padding: 12px 20px;
          background: transparent;
          border: 1.5px solid rgba(255,255,255,0.15);
          color: #9ca3af;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          letter-spacing: -0.01em;
        }
        .db-whatsapp-btn-skip:hover:not(:disabled) {
          border-color: rgba(255,255,255,0.25);
          color: #f3f4f6;
          background: rgba(255,255,255,0.05);
        }
        .db-whatsapp-btn-skip:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .db-whatsapp-countdown {
          font-size: 13px;
          color: #60a5fa;
          padding: 12px;
          border-radius: 10px;
          background: rgba(59,130,246,0.1);
          letter-spacing: 0.02em;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .db-whatsapp-countdown-timer {
          font-size: 18px;
          font-weight: 800;
          color: #3b82f6;
          font-family: 'Courier New', monospace;
        }

        /* ── Greeting ── */
        .db-greeting {
          margin-bottom: 40px;
          animation: slideDown 0.6s ease 0.1s both;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .db-greeting-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #3b82f6;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .db-greeting-eyebrow::before {
          content: '';
          display: inline-block;
          width: 16px;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, transparent);
          border-radius: 1px;
        }

        .db-greeting h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          line-height: 1.2;
          color: #f3f4f6;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .db-greeting p {
          font-size: 15px;
          color: #9ca3af;
          font-weight: 400;
          line-height: 1.6;
        }

        /* ── Stat cards ── */
        .db-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .db-stat-card {
          display: block;
          text-decoration: none;
          background: linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          opacity: 0;
          position: relative;
          overflow: hidden;
        }
        .db-stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(ellipse at top left, var(--card-accent-bg, transparent) 0%, transparent 65%);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .db-stat-card:hover::before { opacity: 1; }
        .db-stat-card:hover {
          border-color: var(--card-border, rgba(255,255,255,0.15));
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
          background: linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.5) 100%);
        }
        .db-stat-card:hover .db-stat-arrow { opacity: 1; transform: translateX(0); }

        .db-stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
        .db-stat-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }
        .db-stat-icon-wrap::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--card-accent-bg);
          border-radius: inherit;
          z-index: -1;
        }

        .db-stat-arrow {
          opacity: 0;
          transform: translateX(-6px);
          transition: opacity 0.3s, transform 0.3s;
          color: rgba(255,255,255,0.3);
        }

        .db-stat-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .db-stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 36px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.03em;
          color: #f3f4f6;
        }

        .db-stat-note {
          font-size: 12px;
          color: #6b7280;
          margin-top: 10px;
          line-height: 1.5;
        }

        /* ── Quick links ── */
        .db-section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 14px;
          margin-top: 24px;
        }

        .db-links {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
        }

        .db-link-card {
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          background: linear-gradient(135deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.25) 100%);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 18px 20px;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          opacity: 0;
          position: relative;
          overflow: hidden;
        }
        .db-link-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--lc-accent);
          opacity: 0;
          transition: opacity 0.3s;
          z-index: -1;
        }
        .db-link-card:hover {
          border-color: var(--lc-border, rgba(255,255,255,0.12));
          background: linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.4) 100%);
          transform: translateY(-2px);
        }
        .db-link-card:hover .db-link-title { color: var(--lc-accent, #f3f4f6); }
        .db-link-card:hover .db-link-arrow { opacity: 1; transform: translateX(3px); }

        .db-link-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }
        .db-link-icon::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--lc-accent-bg);
          border-radius: inherit;
          z-index: -1;
        }

        .db-link-title {
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
          transition: color 0.25s;
          letter-spacing: -0.01em;
        }

        .db-link-desc {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .db-link-arrow {
          margin-left: auto;
          opacity: 0;
          transform: translateX(-3px);
          transition: opacity 0.25s, transform 0.25s;
          color: rgba(255,255,255,0.25);
          flex-shrink: 0;
        }

        /* ── Skeleton shimmer ── */
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }

        .db-skeleton {
          display: inline-block;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%);
          background-size: 400px 100%;
          animation: shimmer 1.6s ease infinite;
          width: 52px;
          height: 36px;
          vertical-align: middle;
        }

        /* ── Entrance animations ── */
        @keyframes rise {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .db-stat-card:nth-child(1) { animation: rise 0.5s ease 0.2s both; }
        .db-stat-card:nth-child(2) { animation: rise 0.5s ease 0.28s both; }
        .db-stat-card:nth-child(3) { animation: rise 0.5s ease 0.36s both; }
        .db-link-card:nth-child(1) { animation: rise 0.5s ease 0.44s both; }
        .db-link-card:nth-child(2) { animation: rise 0.5s ease 0.50s both; }
        .db-link-card:nth-child(3) { animation: rise 0.5s ease 0.56s both; }

        /* ── Divider ── */
        .db-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
          margin: 32px 0;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .db-root { padding: 0; }
          .db-stats { grid-template-columns: 1fr; }
          .db-links { grid-template-columns: 1fr; }
          .db-greeting h1 { font-size: 24px; }
          .db-whatsapp-card { padding: 28px 20px; max-width: 90vw; }
          .db-whatsapp-title { font-size: 24px; }
          .db-whatsapp-desc { font-size: 14px; }
        }
      `}</style>

      {/* WhatsApp Prompt (REQUIRED - Can't dismiss until 10 seconds) */}
      {showWhatsappPrompt && (
        <div className="db-whatsapp-overlay">
          <div className="db-whatsapp-card">
            <div className="db-whatsapp-badge">
              <AlertCircle size={14} />
              ATTENTION REQUIRED
            </div>

            <div className="db-whatsapp-icon">
              <MessageCircle size={36} color="white" fill="white" />
            </div>

            <h3 className="db-whatsapp-title">Join Our Community</h3>
            <p className="db-whatsapp-subtitle">You must join the WhatsApp group to meet your tutors</p>
            <p className="db-whatsapp-desc">
              All important announcements, live sessions, and direct tutor communication happen here. This is where your learning community thrives.
            </p>

            <div className="db-whatsapp-highlight">
              <span style={{ fontSize: '16px' }}>✓</span>
              Meet and connect with your tutors
            </div>

            <a href={WHATSAPP_GROUP} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
              <button className="db-whatsapp-btn-primary">
                <MessageCircle size={18} />
                Join WhatsApp Group Now
              </button>
            </a>

            {!canDismiss && (
              <button className="db-whatsapp-btn-skip" disabled>
                Continue (Locked for {countdownSeconds}s)
              </button>
            )}

            {canDismiss && (
              <button 
                className="db-whatsapp-btn-skip" 
                onClick={() => setShowWhatsappPrompt(false)}
              >
                Continue to Dashboard
              </button>
            )}

            <div className="db-whatsapp-countdown">
              <span>⏱️ Unlocks in</span>
              <span className="db-whatsapp-countdown-timer">{countdownSeconds}s</span>
            </div>
          </div>
        </div>
      )}

      <div className="db-root">

        {/* Greeting */}
        <div className="db-greeting">
          <div className="db-greeting-eyebrow">
            ✨ {greeting()}
          </div>
          <h1>Welcome back, {userName ? `${userName.charAt(0).toUpperCase() + userName.slice(1)}` : 'Learner'}</h1>
          <p>Here's your learning dashboard for today. Keep pushing towards your goals!</p>
        </div>

        {/* Stat cards */}
        <div className="db-stats">
          {stats.map((s) => (
            <Link
              href={s.href}
              key={s.label}
              className="db-stat-card"
              style={{
                // @ts-ignore
                '--card-accent-bg': s.accentBg,
                '--card-border': s.accentBorder,
              }}
            >
              <div className="db-stat-top">
                <div className="db-stat-icon-wrap" style={{ color: s.accent }}>
                  <s.icon size={20} strokeWidth={2} />
                </div>
                <span className="db-stat-arrow">
                  <ArrowRight size={16} strokeWidth={1.5} />
                </span>
              </div>
              <div className="db-stat-label">{s.label}</div>
              <div className="db-stat-value">
                {isLoading ? <span className="db-skeleton" /> : s.value}
              </div>
              <div className="db-stat-note">{!isLoading && s.note}</div>
            </Link>
          ))}
        </div>

        <div className="db-divider" />

        {/* Quick links */}
        <p className="db-section-label">Quick Access</p>
        <div className="db-links">
          {quickLinks.map((l) => (
            <Link
              href={l.href}
              key={l.title}
              className="db-link-card"
              style={{
                // @ts-ignore
                '--lc-accent': l.accent,
                '--lc-accent-bg': l.accentBg,
                '--lc-border': `${l.accent}44`,
              }}
            >
              <div className="db-link-icon" style={{ color: l.accent }}>
                <l.icon size={18} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="db-link-title">{l.title}</div>
                <div className="db-link-desc">{l.desc}</div>
              </div>
              <span className="db-link-arrow">
                <ArrowRight size={15} strokeWidth={1.5} />
              </span>
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}