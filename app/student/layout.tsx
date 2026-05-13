"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Clock,
  CheckSquare,
  FileText,
  GraduationCap,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Don't display layout on /students page (onboarding flow)
  if (pathname === '/student' || pathname.startsWith('/student?')) {
    return <>{children}</>;
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Materials', path: '/student/materials', icon: BookOpen },
    { name: 'Attendance', path: '/student/attendance', icon: Clock },
    { name: 'Assignments', path: '/student/assignments', icon: CheckSquare },
    { name: 'Assessments', path: '/student/assessments', icon: FileText },
    { name: 'Grades', path: '/student/grades', icon: GraduationCap },
  ];

  const getActiveLabel = () =>
    navItems.find(
      (item) =>
        pathname === item.path ||
        (item.path !== '/student' && pathname.startsWith(item.path))
    )?.name ?? 'Student Portal';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');

        /* ── Glow keyframes ── */
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 8px 1px rgba(59,130,246,0.35), inset 0 0 12px rgba(59,130,246,0.08); }
          50%       { box-shadow: 0 0 18px 4px rgba(59,130,246,0.55), inset 0 0 20px rgba(59,130,246,0.14); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .nav-active {
          position: relative;
          background: linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(59,130,246,0.10) 100%);
          border: 1px solid rgba(59,130,246,0.35);
          color: #93c5fd;
          animation: glowPulse 3s ease-in-out infinite;
        }
        .nav-active::before {
          content: '';
          position: absolute;
          left: 0; top: 20%; bottom: 20%;
          width: 3px;
          background: linear-gradient(180deg, #3b82f6, #60a5fa);
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 8px 2px rgba(96,165,250,0.7);
        }

        .nav-item {
          transition: background 0.18s, color 0.18s, border-color 0.18s;
          border: 1px solid transparent;
        }
        .nav-item:hover:not(.nav-active) {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.07);
          color: #e2e8f0;
        }

        .sidebar-animate {
          animation: fadeSlideIn 0.22s ease both;
        }
        .mobile-overlay {
          animation: overlayFadeIn 0.2s ease both;
        }

        /* Scrollbar */
        .slim-scroll::-webkit-scrollbar { width: 4px; }
        .slim-scroll::-webkit-scrollbar-track { background: transparent; }
        .slim-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      <div
        style={{ fontFamily: "'DM Sans', sans-serif" }}
        className="flex h-screen bg-[#080810] text-gray-200 overflow-hidden"
      >
        {/* ── Mobile Overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden mobile-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-40
            w-64 flex flex-col
            bg-[#0d0d18] border-r border-white/[0.06]
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h1
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                className="text-lg font-bold text-white tracking-tight leading-none"
              >
                Web3Nova
              </h1>
              <span className="mt-1.5 inline-block text-[10px] font-semibold tracking-widest uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                Student Portal
              </span>
            </div>
            {/* Close button (mobile) */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto slim-scroll sidebar-animate">
            <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest uppercase text-gray-600">
              Menu
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.path ||
                (item.path !== '/student' && pathname.startsWith(item.path));

              return (
                <Link href={item.path} key={item.path}>
                  <div
                    className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${
                      isActive ? 'nav-active' : 'text-gray-400'
                    }`}
                  >
                    <Icon
                      size={18}
                      className={isActive ? 'text-blue-400' : 'text-gray-500'}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span className={`text-sm font-medium ${isActive ? 'text-blue-300' : ''}`}>
                      {item.name}
                    </span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_2px_rgba(96,165,250,0.8)]" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-white/[0.06]">
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                window.location.href = '/login';
              }}
              className="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-gray-500 hover:text-red-400 group transition-colors"
            >
              <LogOut size={18} className="group-hover:text-red-400 transition-colors" strokeWidth={1.8} />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Mobile top bar */}
          <header className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-[#0d0d18] border-b border-white/[0.06] shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <span
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              className="text-sm font-semibold text-white"
            >
              {mounted ? getActiveLabel() : 'Web3Nova'}
            </span>
            {/* Placeholder to center the title */}
            <div className="w-9" />
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto slim-scroll relative">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
              <div className="absolute -top-32 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px]" />
              <div className="absolute top-1/2 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px]" />
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}