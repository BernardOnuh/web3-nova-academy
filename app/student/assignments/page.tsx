// app/student/assignments/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { CheckSquare, UploadCloud, Loader2, CheckCircle2, ExternalLink, Clock, AlertCircle, FileUp, Zap } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_BASE!;

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, string>>({});
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${BASE}/student/assignments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAssignments(data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (assignmentId: string) => {
    if (!selectedFile) return;
    setSubmitting(assignmentId);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', selectedFile);
      const res = await fetch(`${BASE}/student/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(prev => ({ ...prev, [assignmentId]: data.cloudinaryUrl }));
        setActiveUpload(null);
        setSelectedFile(null);
      } else {
        alert(data.error || 'Submission failed.');
      }
    } catch {
      alert('Network error. Try again.');
    } finally {
      setSubmitting(null);
    }
  };

  const isPastDue = (dueDate: string) => new Date(dueDate) < new Date();
  const isUpcoming = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days <= 3 && days > 0;
  };
  const getDaysRemaining = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const pendingCount = assignments.filter(a => !submitted[a.id]).length;
  const submittedCount = assignments.length - pendingCount;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700&display=swap');

        .asgn-root {
          font-family: 'Outfit', system-ui, sans-serif;
          animation: fadeInUp 0.6s ease 0.1s both;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .asgn-header {
          margin-bottom: 40px;
        }

        .asgn-header h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          color: #f3f4f6;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .asgn-header p {
          font-size: 15px;
          color: #9ca3af;
          font-weight: 400;
        }

        .asgn-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .asgn-stat-card {
          background: linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px;
          animation: fadeInUp 0.5s ease 0.15s both;
          position: relative;
          overflow: hidden;
        }

        .asgn-stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at top left, var(--stat-color, rgba(59,130,246,0.15)) 0%, transparent 65%);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .asgn-stat-card:hover::before {
          opacity: 1;
        }

        .asgn-stat-icon {
          width: 40px;
          height: 40px;
          background: var(--stat-color, rgba(59,130,246,0.15));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          color: var(--stat-icon-color, #3b82f6);
        }

        .asgn-stat-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .asgn-stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #f3f4f6;
          letter-spacing: -0.02em;
        }

        .asgn-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
          margin: 32px 0;
        }

        .asgn-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          color: #6b7280;
          flex-direction: column;
          gap: 12px;
        }

        .asgn-empty {
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

        .asgn-empty-icon {
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

        .asgn-empty-text {
          font-size: 15px;
          color: #9ca3af;
          font-weight: 500;
        }

        .asgn-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .asgn-card {
          background: linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          opacity: 0;
          animation: fadeInUp 0.5s ease forwards;
        }

        .asgn-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(ellipse at top left, var(--card-glow, transparent) 0%, transparent 65%);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .asgn-card:hover::before {
          opacity: 1;
        }

        .asgn-card:hover {
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.4);
        }

        .asgn-card:nth-child(1) { animation-delay: 0.2s; }
        .asgn-card:nth-child(2) { animation-delay: 0.26s; }
        .asgn-card:nth-child(3) { animation-delay: 0.32s; }
        .asgn-card:nth-child(4) { animation-delay: 0.38s; }
        .asgn-card:nth-child(n+5) { animation-delay: 0.44s; }

        .asgn-card-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .asgn-card-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .asgn-card-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #f3f4f6;
          letter-spacing: -0.01em;
          flex: 1;
          line-height: 1.3;
        }

        .asgn-card-badge {
          padding: 6px 12px;
          background: rgba(34,197,94,0.15);
          border: 1px solid rgba(34,197,94,0.3);
          color: #22c55e;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .asgn-card-badge.pending {
          background: rgba(59,130,246,0.15);
          border-color: rgba(59,130,246,0.3);
          color: #3b82f6;
        }

        .asgn-card-badge.urgent {
          background: rgba(239,68,68,0.15);
          border-color: rgba(239,68,68,0.3);
          color: #ef4444;
        }

        .asgn-card-desc {
          font-size: 14px;
          color: #d1d5db;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .asgn-card-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 13px;
          color: #9ca3af;
        }

        .asgn-card-meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .asgn-card-meta-item.overdue {
          color: #ef4444;
          font-weight: 600;
        }

        .asgn-card-meta-item.urgent {
          color: #f59e0b;
          font-weight: 600;
        }

        .asgn-card-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .asgn-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 20px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          letter-spacing: -0.01em;
          border: none;
          white-space: nowrap;
        }

        .asgn-btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 8px 20px rgba(59,130,246,0.3);
        }

        .asgn-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(59,130,246,0.4);
        }

        .asgn-btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .asgn-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .asgn-btn-secondary {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: #e5e7eb;
        }

        .asgn-btn-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.2);
        }

        .asgn-btn-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .asgn-btn-link {
          background: transparent;
          color: #3b82f6;
          border: none;
          padding: 0;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .asgn-btn-link:hover {
          color: #60a5fa;
        }

        .asgn-upload-section {
          background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.03) 100%);
          border: 1.5px dashed rgba(59,130,246,0.3);
          border-radius: 12px;
          padding: 20px;
          margin-top: 16px;
          animation: slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .asgn-upload-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 10px;
          display: block;
        }

        .asgn-upload-input {
          width: 100%;
          padding: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #e5e7eb;
          font-size: 13px;
          margin-bottom: 12px;
          transition: all 0.2s;
        }

        .asgn-upload-input:focus {
          outline: none;
          border-color: rgba(59,130,246,0.3);
          background: rgba(59,130,246,0.05);
        }

        .asgn-upload-input::file-selector-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          transition: all 0.2s;
          margin-right: 8px;
        }

        .asgn-upload-input::file-selector-button:hover {
          transform: scale(1.02);
        }

        .asgn-upload-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .asgn-stat-value {
            font-size: 24px;
          }

          .asgn-card-title-row {
            flex-direction: column;
          }

          .asgn-card-actions {
            flex-direction: column;
            width: 100%;
          }

          .asgn-btn {
            width: 100%;
          }

          .asgn-upload-actions {
            flex-direction: column;
          }

          .asgn-empty {
            padding: 40px 24px;
          }
        }
      `}</style>

      <div className="asgn-root">
        {/* Header */}
        <div className="asgn-header">
          <h1>Assignments</h1>
          <p>Complete and submit your coursework before the deadline</p>
        </div>

        {/* Stats */}
        {!isLoading && assignments.length > 0 && (
          <>
            <div className="asgn-stats">
              <div className="asgn-stat-card" style={{ '--stat-color': 'rgba(59,130,246,0.15)', '--stat-icon-color': '#3b82f6' } as React.CSSProperties}>
                <div className="asgn-stat-icon">
                  <CheckSquare size={20} />
                </div>
                <div className="asgn-stat-label">Total Assignments</div>
                <div className="asgn-stat-value">{assignments.length}</div>
              </div>
              <div className="asgn-stat-card" style={{ '--stat-color': 'rgba(34,197,94,0.15)', '--stat-icon-color': '#22c55e' } as React.CSSProperties}>
                <div className="asgn-stat-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div className="asgn-stat-label">Submitted</div>
                <div className="asgn-stat-value">{submittedCount}</div>
              </div>
              <div className="asgn-stat-card" style={{ '--stat-color': `rgba(${pendingCount > 0 ? '59,130,246' : '34,197,94'},0.15)`, '--stat-icon-color': `${pendingCount > 0 ? '#3b82f6' : '#22c55e'}` } as React.CSSProperties}>
                <div className="asgn-stat-icon">
                  <Zap size={20} />
                </div>
                <div className="asgn-stat-label">Pending</div>
                <div className="asgn-stat-value">{pendingCount}</div>
              </div>
            </div>
            <div className="asgn-divider" />
          </>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="asgn-loading">
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '15px', fontWeight: '500' }}>Loading assignments...</span>
          </div>
        ) : assignments.length === 0 ? (
          /* Empty State */
          <div className="asgn-empty">
            <div className="asgn-empty-icon">
              <CheckSquare size={40} />
            </div>
            <p className="asgn-empty-text">No assignments posted yet</p>
          </div>
        ) : (
          /* List */
          <div className="asgn-list">
            {assignments.map((asgn, idx) => {
              const done = !!submitted[asgn.id];
              const overdue = isPastDue(asgn.dueDate);
              const upcoming = isUpcoming(asgn.dueDate);
              const daysLeft = getDaysRemaining(asgn.dueDate);
              const isOpen = activeUpload === asgn.id;

              return (
                <div key={asgn.id} className="asgn-card" style={{
                  '--card-glow': done ? 'rgba(34,197,94,0.1)' : overdue ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                } as React.CSSProperties}>
                  <div className="asgn-card-header">
                    <div className="asgn-card-title-row">
                      <h4 className="asgn-card-title">{asgn.title}</h4>
                      {done && (
                        <div className="asgn-card-badge">
                          ✓ Submitted
                        </div>
                      )}
                      {!done && overdue && (
                        <div className="asgn-card-badge urgent">
                          Overdue
                        </div>
                      )}
                      {!done && upcoming && !overdue && (
                        <div className="asgn-card-badge urgent">
                          {daysLeft}d Left
                        </div>
                      )}
                      {!done && !overdue && !upcoming && (
                        <div className="asgn-card-badge pending">
                          Pending
                        </div>
                      )}
                    </div>
                    <p className="asgn-card-desc">{asgn.description}</p>
                  </div>

                  <div className="asgn-card-meta">
                    <span className={`asgn-card-meta-item ${overdue && !done ? 'overdue' : upcoming && !done ? 'urgent' : ''}`}>
                      <Clock size={14} />
                      Due: {new Date(asgn.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {overdue && !done && (
                      <span className="asgn-card-meta-item overdue">
                        <AlertCircle size={14} />
                        Submission closed
                      </span>
                    )}
                  </div>

                  <div className="asgn-card-actions">
                    {done ? (
                      <>
                        <button className="asgn-btn asgn-btn-secondary" disabled>
                          <CheckCircle2 size={16} />
                          Submitted
                        </button>
                        <a href={submitted[asgn.id]} target="_blank" rel="noopener noreferrer" className="asgn-btn-link">
                          <ExternalLink size={14} />
                          View Submission
                        </a>
                      </>
                    ) : (
                      <button
                        onClick={() => { setActiveUpload(isOpen ? null : asgn.id); setSelectedFile(null); }}
                        disabled={overdue}
                        className={`asgn-btn ${overdue ? 'asgn-btn-secondary' : 'asgn-btn-primary'}`}
                      >
                        <UploadCloud size={16} />
                        {isOpen ? 'Cancel' : 'Submit Work'}
                      </button>
                    )}
                  </div>

                  {isOpen && !done && (
                    <div className="asgn-upload-section">
                      <label className="asgn-upload-label">Select File to Submit</label>
                      <input
                        type="file"
                        className="asgn-upload-input"
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      {selectedFile && (
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
                          <strong>Selected:</strong> {selectedFile.name}
                        </div>
                      )}
                      <div className="asgn-upload-actions">
                        <button
                          onClick={() => { setActiveUpload(null); setSelectedFile(null); }}
                          className="asgn-btn asgn-btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={!selectedFile || submitting === asgn.id}
                          onClick={() => handleSubmit(asgn.id)}
                          className="asgn-btn asgn-btn-primary"
                        >
                          {submitting === asgn.id ? (
                            <>
                              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <FileUp size={16} />
                              Upload & Submit
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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