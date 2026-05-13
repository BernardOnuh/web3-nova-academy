// app/student/attendance/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, Loader2, Wifi, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_BASE!;

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  session: { date: string; active: boolean };
}

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = () => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE}/student/attendance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRecords(data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE}/student/attendance/check-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Checked in successfully!', ok: true });
        setIsLoading(true);
        load();
      } else {
        setMessage({ text: data.error || 'Check-in failed.', ok: false });
      }
    } catch {
      setMessage({ text: 'Network error. Try again.', ok: false });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const attendanceRate = records.length > 0 ? 100 : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700&display=swap');

        .att-root {
          font-family: 'Outfit', system-ui, sans-serif;
          animation: fadeInUp 0.6s ease 0.1s both;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .att-header {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 40px;
        }

        .att-header-top {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .att-header h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          color: #f3f4f6;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .att-header p {
          font-size: 15px;
          color: #9ca3af;
          font-weight: 400;
        }

        .att-header-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .att-checkin-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          letter-spacing: -0.01em;
          box-shadow: 0 8px 24px rgba(59,130,246,0.3);
        }

        .att-checkin-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(59,130,246,0.4);
        }

        .att-checkin-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .att-checkin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .att-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .att-stat-card {
          background: linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%);
          border: 1px solid rgba(59,130,246,0.25);
          border-radius: 16px;
          padding: 24px;
          animation: fadeInUp 0.5s ease 0.15s both;
          position: relative;
          overflow: hidden;
        }

        .att-stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at top left, rgba(59,130,246,0.1) 0%, transparent 65%);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .att-stat-card:hover::before {
          opacity: 1;
        }

        .att-stat-icon {
          width: 44px;
          height: 44px;
          background: rgba(59,130,246,0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          color: #3b82f6;
        }

        .att-stat-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .att-stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 700;
          color: #f3f4f6;
          letter-spacing: -0.02em;
        }

        .att-message {
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 600;
          animation: slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1);
          margin-bottom: 24px;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .att-message.success {
          background: rgba(34,197,94,0.1);
          border-color: rgba(34,197,94,0.3);
          color: #22c55e;
        }

        .att-message.error {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.3);
          color: #ef4444;
        }

        .att-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          color: #6b7280;
          flex-direction: column;
          gap: 12px;
        }

        .att-empty {
          background: linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 60px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: fadeInUp 0.6s ease 0.2s both;
        }

        .att-empty-icon {
          width: 80px;
          height: 80px;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: #6b7280;
        }

        .att-empty-text {
          font-size: 15px;
          color: #9ca3af;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .att-empty-hint {
          font-size: 13px;
          color: #6b7280;
          max-width: 380px;
          line-height: 1.6;
        }

        .att-table-wrapper {
          background: linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
          animation: fadeInUp 0.6s ease 0.2s both;
        }

        .att-table {
          width: 100%;
          border-collapse: collapse;
        }

        .att-table thead {
          background: rgba(0,0,0,0.2);
        }

        .att-table th {
          padding: 16px 20px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #9ca3af;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .att-table tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: all 0.2s;
        }

        .att-table tbody tr:hover {
          background: rgba(255,255,255,0.02);
        }

        .att-table tbody tr:last-child {
          border-bottom: none;
        }

        .att-table td {
          padding: 16px 20px;
        }

        .att-table-date {
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .att-table-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #22c55e;
        }

        .att-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
          margin: 32px 0;
        }

        @media (max-width: 768px) {
          .att-header-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .att-checkin-btn {
            width: 100%;
          }

          .att-stats {
            grid-template-columns: 1fr;
          }

          .att-empty {
            padding: 40px 24px;
          }

          .att-table th,
          .att-table td {
            padding: 12px 16px;
            font-size: 13px;
          }
        }
      `}</style>

      <div className="att-root">
        {/* Header */}
        <div className="att-header">
          <div className="att-header-top">
            <h1>Attendance</h1>
            <p>Track your session attendance and check in to live classes</p>
          </div>

          <div className="att-header-controls">
            <button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="att-checkin-btn"
            >
              {isCheckingIn ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Checking In...
                </>
              ) : (
                <>
                  <Wifi size={18} />
                  Check In Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`att-message ${message.ok ? 'success' : 'error'}`}>
            {message.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {message.text}
          </div>
        )}

        {/* Stats */}
        {!isLoading && records.length > 0 && (
          <>
            <div className="att-stats">
              <div className="att-stat-card">
                <div className="att-stat-icon">
                  <Calendar size={22} />
                </div>
                <div className="att-stat-label">Sessions Attended</div>
                <div className="att-stat-value">{records.length}</div>
              </div>
              <div className="att-stat-card">
                <div className="att-stat-icon">
                  <TrendingUp size={22} />
                </div>
                <div className="att-stat-label">Attendance Rate</div>
                <div className="att-stat-value">{attendanceRate}%</div>
              </div>
            </div>
            <div className="att-divider" />
          </>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="att-loading">
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '15px', fontWeight: '500' }}>Loading attendance records...</span>
          </div>
        ) : records.length === 0 ? (
          /* Empty State */
          <div className="att-empty">
            <div className="att-empty-icon">
              <Clock size={40} />
            </div>
            <p className="att-empty-text">No attendance records yet</p>
            <p className="att-empty-hint">Use the "Check In Now" button when you join a live class session. Make sure you're connected to the class network.</p>
          </div>
        ) : (
          /* Table */
          <div className="att-table-wrapper">
            <table className="att-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, idx) => (
                  <tr key={rec.id} style={{ animation: `fadeInUp 0.5s ease ${0.25 + idx * 0.06}s both` }}>
                    <td>
                      <span className="att-table-date">
                        <Calendar size={16} />
                        {new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      <span className="att-table-status">
                        <CheckCircle2 size={16} />
                        Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}