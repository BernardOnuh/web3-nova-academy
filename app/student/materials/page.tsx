// app/student/materials/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { FileText, FileVideo, BookOpen, ExternalLink, Loader2, Download, Clock, Archive } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_BASE!;

interface Material {
  id: string;
  title: string;
  type: string;
  cloudinaryUrl: string;
  uploadedAt: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  pdf:   { icon: <FileText size={20} />, color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)', label: 'PDF Document' },
  slide: { icon: <Archive size={20} />, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)', label: 'Slides' },
  video: { icon: <FileVideo size={20} />, color: '#3b82f6', bgColor: 'rgba(59,130,246,0.12)', label: 'Video' },
};

export default function StudentMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${BASE}/student/materials`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMaterials(data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700&display=swap');

        .mat-root {
          font-family: 'Outfit', system-ui, sans-serif;
          animation: fadeInUp 0.6s ease 0.1s both;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mat-header {
          margin-bottom: 40px;
        }

        .mat-header h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          color: #f3f4f6;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .mat-header p {
          font-size: 15px;
          color: #9ca3af;
          font-weight: 400;
          line-height: 1.6;
        }

        .mat-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          py: 40px;
          min-height: 400px;
          color: #6b7280;
        }

        .mat-empty {
          background: linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 60px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .mat-empty-icon {
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

        .mat-empty-text {
          font-size: 15px;
          color: #9ca3af;
          margin-bottom: 8px;
        }

        .mat-empty-hint {
          font-size: 13px;
          color: #6b7280;
        }

        .mat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .mat-card {
          background: linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          opacity: 0;
        }

        .mat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(ellipse at top left, var(--mat-bg, transparent) 0%, transparent 65%);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .mat-card:nth-child(1) { animation: fadeInUp 0.5s ease 0.2s both; }
        .mat-card:nth-child(2) { animation: fadeInUp 0.5s ease 0.26s both; }
        .mat-card:nth-child(3) { animation: fadeInUp 0.5s ease 0.32s both; }
        .mat-card:nth-child(4) { animation: fadeInUp 0.5s ease 0.38s both; }
        .mat-card:nth-child(5) { animation: fadeInUp 0.5s ease 0.44s both; }
        .mat-card:nth-child(6) { animation: fadeInUp 0.5s ease 0.50s both; }
        .mat-card:nth-child(n+7) { animation: fadeInUp 0.5s ease 0.56s both; }

        .mat-card:hover::before {
          opacity: 1;
        }

        .mat-card:hover {
          border-color: var(--mat-color, rgba(255,255,255,0.15));
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 20px var(--mat-glow, transparent);
        }

        .mat-card-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          color: var(--mat-color);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .mat-card-icon-wrap::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--mat-bg);
          border-radius: inherit;
          z-index: -1;
        }

        .mat-card-icon-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 30%, var(--mat-color), transparent);
          opacity: 0;
          transition: opacity 0.3s;
          border-radius: inherit;
        }

        .mat-card:hover .mat-card-icon-wrap::after {
          opacity: 0.15;
        }

        .mat-card-content {
          flex: 1;
        }

        .mat-card-title {
          font-size: 15px;
          font-weight: 700;
          color: #f3f4f6;
          margin-bottom: 8px;
          line-height: 1.4;
          letter-spacing: -0.01em;
          word-break: break-word;
        }

        .mat-card-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 16px;
        }

        .mat-card-type-badge {
          padding: 4px 10px;
          background: var(--mat-bg);
          color: var(--mat-color);
          border-radius: 6px;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.05em;
        }

        .mat-card-date {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .mat-card-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          background: transparent;
          border: 1.5px solid var(--mat-color, rgba(255,255,255,0.15));
          color: var(--mat-color, #60a5fa);
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
          display: inline-flex;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .mat-card-action:hover {
          background: var(--mat-bg, rgba(59,130,246,0.1));
          border-color: var(--mat-color, rgba(59,130,246,0.4));
          transform: translateY(-2px);
        }

        .mat-card-action:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .mat-grid {
            grid-template-columns: 1fr;
          }

          .mat-header h1 {
            font-size: 24px;
          }

          .mat-empty {
            padding: 40px 24px;
          }
        }
      `}</style>

      <div className="mat-root">
        {/* Header */}
        <div className="mat-header">
          <h1>Course Materials</h1>
          <p>Access all your course resources, slides, videos, and documents</p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="mat-loading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6b7280' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '15px', fontWeight: '500' }}>Loading materials...</span>
            </div>
          </div>
        ) : materials.length === 0 ? (
          /* Empty State */
          <div className="mat-empty">
            <div className="mat-empty-icon">
              <BookOpen size={40} />
            </div>
            <p className="mat-empty-text">No materials uploaded yet</p>
            <p className="mat-empty-hint">Check back soon for course resources, slides, and videos</p>
          </div>
        ) : (
          /* Materials Grid */
          <div className="mat-grid">
            {materials.map(mat => {
              const config = TYPE_CONFIG[mat.type] || { icon: <FileText size={20} />, color: '#9ca3af', bgColor: 'rgba(156,163,175,0.12)', label: 'File' };
              const uploadDate = new Date(mat.uploadedAt);
              const dateStr = uploadDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div
                  key={mat.id}
                  className="mat-card"
                  style={{
                    '--mat-color': config.color,
                    '--mat-bg': config.bgColor,
                    '--mat-glow': `${config.color}20`,
                  } as React.CSSProperties}
                >
                  <div className="mat-card-content">
                    <div className="mat-card-icon-wrap">
                      {config.icon}
                    </div>
                    <h4 className="mat-card-title">{mat.title}</h4>
                    <div className="mat-card-meta">
                      <span className="mat-card-type-badge">{config.label}</span>
                      <span className="mat-card-date">
                        <Clock size={12} />
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  <a
                    href={mat.cloudinaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mat-card-action"
                    style={{
                      '--mat-color': config.color,
                      '--mat-bg': config.bgColor,
                    } as React.CSSProperties}
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </a>
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