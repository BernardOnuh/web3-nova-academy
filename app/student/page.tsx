"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ChevronLeft, ChevronRight, ArrowRight,
  Star, Brain, Palette, Crown, BookOpen, Target,
  Eye, Zap, Puzzle, Heart, Trophy, Award, X, Flame
} from 'lucide-react';

const BASE = 'https://cohort-portal-cmhj.onrender.com';
const AUTO_ADVANCE_MS = 6000;

interface CurriculumWeek { id: string; week: number; title: string; }

const monthThemes = [
  { name: 'Think',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  icon: Brain   },
  { name: 'Craft',  color: '#06B6D4', bg: 'rgba(6,182,212,0.1)',   icon: Palette },
  { name: 'Launch', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  icon: Crown   },
];
const weekIcons = [BookOpen, Target, Eye, Zap, Brain, Puzzle, Star, Heart, BookOpen, Target, Trophy, Award];

export default function OnboardingFlow() {
  const [step, setStep]                 = useState<'loading'|'welcome'|'curriculum'|'payment'>('loading');
  const [curriculum, setCurriculum]     = useState<CurriculumWeek[]>([]);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [userName, setUserName]         = useState('');
  const [paymentData, setPaymentData]   = useState<any>(null);
  const [isPaid, setIsPaid]             = useState(false);
  const [direction, setDirection]       = useState(0);
  const [progress, setProgress]         = useState(0);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const rafRef       = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const monthRef     = useRef(0);

  const stopFela = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  };

  useEffect(() => {
    const canvas = document.getElementById('ob-particles') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const COLORS = ['rgba(139,92,246,', 'rgba(6,182,212,', 'rgba(245,158,11,'];
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.15,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`; ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 100) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${0.06*(1-dist/100)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const name = payload.email?.split('@')[0] || 'Creator';
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
    } catch {}
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${BASE}/student/curriculum`, { headers }).then(r => r.json()),
      fetch(`${BASE}/payments/status`, { headers }).then(r => r.json()).catch(() => null),
    ]).then(([cur, pay]) => {
      if (Array.isArray(cur)) setCurriculum(cur.map((it: any) => ({ id: it.id || String(it.week), week: it.week, title: it.title || 'Untitled Week' })));
      if (pay?.payment?.status === 'PAID') setIsPaid(true);
      setPaymentData(pay);
    }).catch(console.error).finally(() => setStep('welcome'));
  }, []);

  const startProgress = useCallback((fromMonth: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    monthRef.current = fromMonth;
    startTimeRef.current = performance.now();
    setProgress(0);
    const tick = (now: number) => {
      const p = Math.min((now - startTimeRef.current) / AUTO_ADVANCE_MS, 1);
      setProgress(p);
      if (p < 1) { rafRef.current = requestAnimationFrame(tick); }
      else {
        if (monthRef.current < 2) {
          const next = monthRef.current + 1;
          setDirection(1); setCurrentMonth(next); monthRef.current = next;
          startTimeRef.current = performance.now(); setProgress(0);
          rafRef.current = requestAnimationFrame(tick);
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (step !== 'curriculum') return;
    if (monthRef.current !== currentMonth) startProgress(currentMonth);
  }, [currentMonth, step, startProgress]);

  useEffect(() => {
    if (step === 'curriculum') startProgress(0);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const goToMonth = (n: number) => {
    if (n < 0 || n > 2) return;
    setDirection(n > currentMonth ? 1 : -1);
    setCurrentMonth(n);
    startProgress(n);
  };

  const touchX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -50) goToMonth(currentMonth + 1);
    if (dx >  50) goToMonth(currentMonth - 1);
  };

  const pay = async (type: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/payments/initiate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentType: type }),
    });
    const data = await res.json();
    if (data.checkoutUrl) { stopFela(); window.location.href = data.checkoutUrl; }
  };

  const months = curriculum.reduce((acc: CurriculumWeek[][], w) => {
    const i = Math.ceil(w.week / 4) - 1;
    if (!acc[i]) acc[i] = [];
    acc[i].push(w);
    return acc;
  }, []);
  const theme = monthThemes[currentMonth] || monthThemes[0];
  const ThemeIcon = theme.icon;

  if (step === 'loading') return (
    <>
      <style>{`*{margin:0;padding:0;box-sizing:border-box;}body{background:#09090B;}`}</style>
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#09090B', color:'#fff', fontFamily:'system-ui', gap:'24px' }}>
        <motion.div animate={{ rotate:360 }} transition={{ duration:2, repeat:Infinity, ease:'linear' }}
          style={{ width:48, height:48, borderRadius:'50%', border:'3px solid rgba(139,92,246,0.15)', borderTopColor:'#8B5CF6' }} />
        <p style={{ color:'#71717A', fontSize:'14px', letterSpacing:'0.05em' }}>Loading your curriculum...</p>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700;800&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        body{background:#09090B;font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}

        .ob-root{min-height:100vh;background:#02020A;color:#FAFAFA;display:flex;align-items:center;justify-content:center;padding:20px;position:relative;overflow:hidden;}
        .ob-root::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(139,92,246,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.07) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse at 50% 50%,black 20%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse at 50% 50%,black 20%,transparent 75%);}
        .ob-root::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px);animation:scanlines 8s linear infinite;}
        @keyframes scanlines{0%{background-position:0 0;}100%{background-position:0 200px;}}

        .ob-orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;}
        .ob-orb-1{width:420px;height:420px;top:-120px;left:-100px;background:radial-gradient(circle,rgba(139,92,246,0.2) 0%,transparent 70%);animation:orb-drift 14s ease-in-out infinite alternate;}
        .ob-orb-2{width:360px;height:360px;bottom:-80px;right:-80px;background:radial-gradient(circle,rgba(6,182,212,0.15) 0%,transparent 70%);animation:orb-drift 11s ease-in-out infinite alternate-reverse;}
        .ob-orb-3{width:260px;height:260px;top:45%;left:60%;background:radial-gradient(circle,rgba(245,158,11,0.09) 0%,transparent 70%);animation:orb-drift 16s ease-in-out infinite alternate;}
        @keyframes orb-drift{0%{transform:translate(0,0) scale(1);}50%{transform:translate(28px,-18px) scale(1.07);}100%{transform:translate(-18px,28px) scale(0.94);}}

        #ob-particles{position:fixed;inset:0;pointer-events:none;z-index:0;}
        .ob-horizon{position:fixed;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 0%,rgba(139,92,246,0.5) 30%,rgba(6,182,212,0.6) 60%,transparent 100%);box-shadow:0 0 24px rgba(139,92,246,0.35),0 0 48px rgba(6,182,212,0.2);z-index:1;pointer-events:none;}

        .ob-container{position:relative;z-index:2;width:66.666%;max-width:480px;min-width:320px;}

        .ob-card{backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);background:rgba(8,8,14,0.8);border:1px solid rgba(139,92,246,0.18);box-shadow:0 0 0 1px rgba(139,92,246,0.06),inset 0 1px 0 rgba(255,255,255,0.04);}

        .ob-welcome{text-align:center;padding:20px 0;}
        .ob-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:100px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#A78BFA;margin-bottom:24px;}
        .ob-headline{font-family:'Playfair Display',Georgia,serif;font-size:44px;font-weight:800;line-height:1.1;letter-spacing:-0.03em;color:#FAFAFA;margin-bottom:8px;}
        .ob-headline em{font-style:italic;background:linear-gradient(135deg,#A78BFA,#818CF8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .ob-subtitle{font-size:15px;color:#71717A;line-height:1.6;margin-bottom:32px;max-width:380px;margin-left:auto;margin-right:auto;}
        .ob-stats{display:flex;justify-content:center;gap:48px;margin-bottom:36px;}
        .ob-stat-value{font-size:32px;font-weight:700;color:#FAFAFA;letter-spacing:-0.02em;}
        .ob-stat-label{font-size:11px;color:#52525B;letter-spacing:0.06em;text-transform:uppercase;margin-top:4px;}

        .ob-btn-wrap{position:relative;display:inline-block;}
        .ob-btn-wrap::before{content:'';position:absolute;inset:-6px;border-radius:100px;background:conic-gradient(from var(--angle,0deg),#8B5CF6,#06B6D4,#F59E0B,#8B5CF6);opacity:0;transition:opacity 0.3s;filter:blur(8px);animation:spin-angle 3s linear infinite;}
        .ob-btn-wrap:hover::before{opacity:0.7;}
        @property --angle{syntax:'<angle>';inherits:false;initial-value:0deg;}
        @keyframes spin-angle{to{--angle:360deg;}}
        @keyframes idle-pulse{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,0.0);}50%{box-shadow:0 0 0 10px rgba(139,92,246,0.18);}}
        .ob-btn{position:relative;z-index:1;display:inline-flex;align-items:center;gap:10px;padding:16px 36px;border-radius:100px;background:#FAFAFA;border:none;color:#09090B;font-size:15px;font-weight:600;cursor:pointer;transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.18s;font-family:'Inter',system-ui,sans-serif;letter-spacing:0.01em;animation:idle-pulse 2.4s ease-in-out infinite;}
        .ob-btn:hover{transform:scale(1.06) translateY(-3px);box-shadow:0 18px 40px rgba(139,92,246,0.22),0 4px 12px rgba(0,0,0,0.3);animation:none;}
        .ob-btn:active{transform:scale(0.97);}
        .ob-btn:hover .ob-btn-arrow{transform:translateX(4px);}
        .ob-btn-arrow{transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1);}

        .ob-curriculum{display:flex;flex-direction:column;align-items:center;gap:20px;}
        .ob-month-header{text-align:center;}
        .ob-month-badge{font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#71717A;margin-bottom:6px;}
        .ob-month-name{font-family:'Playfair Display',Georgia,serif;font-size:36px;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;}

        .ob-progress-bars{display:flex;gap:8px;width:100%;}
        .ob-progress-track{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden;cursor:pointer;}
        .ob-progress-fill{height:100%;border-radius:2px;}

        .ob-card{width:100%;background:#0C0C10;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;min-height:400px;touch-action:pan-y;user-select:none;}
        .ob-card-header{display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.06);}
        .ob-card-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;}
        .ob-card-label{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#52525B;margin-bottom:2px;}
        .ob-card-title{font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;color:#E4E4E7;}
        .ob-weeks{display:flex;flex-direction:column;gap:8px;}
        .ob-week{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);}
        .ob-week-num{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .ob-week-content{flex:1;}
        .ob-week-label{font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#52525B;margin-bottom:3px;}
        .ob-week-title{font-size:14px;font-weight:600;color:#E4E4E7;line-height:1.3;letter-spacing:-0.01em;}

        .ob-nav{display:flex;align-items:center;gap:32px;}
        .ob-nav-btn{width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#71717A;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;}
        .ob-nav-btn:hover:not(:disabled){border-color:rgba(255,255,255,0.2);color:#FAFAFA;background:rgba(255,255,255,0.03);}
        .ob-nav-btn:disabled{opacity:0.25;cursor:not-allowed;}
        .ob-nav-hint{font-size:12px;color:#52525B;letter-spacing:0.03em;user-select:none;}

        /* ── Join modal ─────────────────────────────────────── */
        .ob-modal-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(2,2,10,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
        .ob-modal{position:relative;width:100%;max-width:440px;background:#0A0A12;border-radius:24px;overflow:hidden;border:1px solid rgba(139,92,246,0.3);}

        /* animated top border beam */
        .ob-modal-beam{height:3px;width:100%;background:linear-gradient(90deg,#8B5CF6,#06B6D4,#F59E0B,#8B5CF6);background-size:200% 100%;animation:beam-slide 2.5s linear infinite;}
        @keyframes beam-slide{0%{background-position:0% 0;}100%{background-position:200% 0;}}

        .ob-modal-inner{padding:36px 32px 32px;}
        .ob-modal-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#52525B;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;z-index:2;}
        .ob-modal-close:hover{border-color:rgba(255,255,255,0.2);color:#FAFAFA;background:rgba(255,255,255,0.05);}

        .ob-modal-eyebrow{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#F59E0B;margin-bottom:16px;}
        .ob-modal-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:#F59E0B;animation:dot-pulse 1.4s ease-in-out infinite;}
        @keyframes dot-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(0.7);}}

        .ob-modal-title{font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:800;letter-spacing:-0.02em;color:#FAFAFA;line-height:1.15;margin-bottom:10px;}
        .ob-modal-title span{font-style:italic;background:linear-gradient(135deg,#A78BFA,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}

        .ob-modal-sub{font-size:14px;color:#71717A;line-height:1.6;margin-bottom:28px;}

        /* price row */
        .ob-modal-price-row{display:flex;align-items:baseline;gap:6px;margin-bottom:24px;}
        .ob-modal-currency{font-size:22px;font-weight:600;color:#A78BFA;}
        .ob-modal-amount{font-family:'Playfair Display',Georgia,serif;font-size:52px;font-weight:800;letter-spacing:-0.03em;color:#FAFAFA;line-height:1;}
        .ob-modal-per{font-size:13px;color:#52525B;align-self:flex-end;padding-bottom:8px;}

        /* perks */
        .ob-modal-perks{display:flex;flex-direction:column;gap:10px;margin-bottom:28px;padding:20px;border-radius:14px;background:rgba(139,92,246,0.05);border:1px solid rgba(139,92,246,0.1);}
        .ob-modal-perk{display:flex;align-items:center;gap:10px;font-size:13px;color:#A1A1AA;}
        .ob-modal-perk-dot{width:5px;height:5px;border-radius:50%;background:#8B5CF6;flex-shrink:0;}

        /* CTA buttons */
        .ob-modal-btns{display:flex;flex-direction:column;gap:10px;}
        .ob-modal-pay-full{position:relative;width:100%;padding:18px 24px;border-radius:14px;border:none;cursor:pointer;font-family:'Inter',system-ui,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.01em;color:#09090B;overflow:hidden;background:linear-gradient(135deg,#A78BFA 0%,#06B6D4 100%);transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.18s;}
        .ob-modal-pay-full:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 16px 40px rgba(139,92,246,0.35);}
        .ob-modal-pay-full:active{transform:scale(0.98);}
        .ob-modal-pay-full-shine{position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.25) 50%,transparent 60%);background-size:200% 100%;animation:shine-slide 2.2s ease-in-out infinite;}
        @keyframes shine-slide{0%{background-position:200% 0;}100%{background-position:-200% 0;}}

        .ob-modal-pay-split{width:100%;padding:16px 24px;border-radius:14px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#A1A1AA;font-family:'Inter',system-ui,sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s;}
        .ob-modal-pay-split:hover{border-color:rgba(255,255,255,0.2);color:#FAFAFA;background:rgba(255,255,255,0.03);}

        .ob-modal-defer{width:100%;padding:13px 20px;border-radius:12px;background:transparent;border:1px dashed rgba(139,92,246,0.25);color:#6B5FA0;font-family:'Inter',system-ui,sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;}
        .ob-modal-defer:hover{border-color:rgba(139,92,246,0.5);color:#A78BFA;}

        /* The attention-grabbing join button on phase 3 */
        .ob-join-trigger{position:relative;display:inline-flex;align-items:center;gap:10px;padding:18px 40px;border-radius:100px;border:none;cursor:pointer;font-family:'Inter',system-ui,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.02em;color:#09090B;overflow:hidden;background:linear-gradient(135deg,#A78BFA 0%,#06B6D4 50%,#F59E0B 100%);background-size:200% 100%;animation:join-bg-shift 3s ease-in-out infinite alternate, join-shake 6s ease-in-out infinite;}
        .ob-join-trigger:hover{animation:none;transform:scale(1.07) translateY(-4px);box-shadow:0 20px 50px rgba(139,92,246,0.45),0 0 0 4px rgba(139,92,246,0.2);}
        .ob-join-trigger:active{transform:scale(0.97);}
        @keyframes join-bg-shift{0%{background-position:0% 50%;}100%{background-position:100% 50%;}}
        @keyframes join-shake{0%,90%,100%{transform:translateX(0) translateY(0);}92%{transform:translateX(-4px) translateY(-1px);}94%{transform:translateX(4px) translateY(-2px);}96%{transform:translateX(-3px) translateY(0);}98%{transform:translateX(3px) translateY(-1px);}}
        .ob-join-trigger-shine{position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.3) 50%,transparent 60%);background-size:200% 100%;animation:shine-slide 2s ease-in-out infinite;}
        .ob-join-pulse-ring{position:absolute;inset:-8px;border-radius:100px;border:2px solid rgba(139,92,246,0.5);animation:ring-expand 2s ease-out infinite;}
        .ob-join-pulse-ring-2{position:absolute;inset:-16px;border-radius:100px;border:1px solid rgba(139,92,246,0.25);animation:ring-expand 2s ease-out 0.5s infinite;}
        @keyframes ring-expand{0%{opacity:1;transform:scale(1);}100%{opacity:0;transform:scale(1.12);}}

        /* Payment step (kept as fallback) */
        .ob-payment{text-align:center;}
        .ob-price-card{width:100%;background:#0C0C10;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 28px;margin:28px 0 24px;}
        .ob-price-label{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#52525B;margin-bottom:12px;}
        .ob-price{font-family:'Playfair Display',Georgia,serif;font-size:60px;font-weight:800;letter-spacing:-0.03em;color:#FAFAFA;margin-bottom:8px;}
        .ob-price sup{font-size:30px;font-weight:500;color:#71717A;margin-right:4px;}
        .ob-price-note{font-size:13px;color:#52525B;}
        .ob-deadline{font-size:12px;color:#52525B;margin-top:20px;line-height:1.5;}

        @media(max-width:600px){.ob-container{width:100%;min-width:0;}}
      `}</style>

      <div className="ob-root">
        <div className="ob-orb ob-orb-1" />
        <div className="ob-orb ob-orb-2" />
        <div className="ob-orb ob-orb-3" />
        <canvas id="ob-particles" />
        <div className="ob-horizon" />

        <div className="ob-container">
          <AnimatePresence mode="wait">

            {/* WELCOME */}
            {step === 'welcome' && (
              <motion.div key="welcome" className="ob-welcome"
                initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-30 }} transition={{ duration:0.5 }}>
                <div className="ob-badge"><Sparkles size={14} strokeWidth={2} /> Welcome to Cohort</div>
                <h1 className="ob-headline">Hey, <em>{userName}</em></h1>
                <p className="ob-subtitle">
                  This is a bold step — one you won't regret.
                  Over 12 weeks, you'll build real skills, ship real work,
                  and come out the other side a different kind of creator.
                </p>
                <div className="ob-stats">
                  <div><div className="ob-stat-value">12</div><div className="ob-stat-label">Weeks</div></div>
                  <div><div className="ob-stat-value">3</div><div className="ob-stat-label">Phases</div></div>
                  <div><div className="ob-stat-value">1</div><div className="ob-stat-label">Goal</div></div>
                </div>
                <div className="ob-btn-wrap">
                  <button className="ob-btn" onClick={() => {
                    if (!audioRef.current) {
                      const audio = new Audio('/fela.mp3');
                      audio.loop = true; audio.volume = 0.55;
                      audio.play().catch(() => {});
                      audioRef.current = audio;
                    }
                    setStep('curriculum');
                  }}>
                    See What's Inside
                    <ArrowRight size={18} strokeWidth={2} className="ob-btn-arrow" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* CURRICULUM */}
            {step === 'curriculum' && (
              <motion.div key="curriculum" className="ob-curriculum"
                initial={{ opacity:0 }} animate={{ opacity:1 }}
                exit={{ opacity:0 }} transition={{ duration:0.4 }}>

                <div className="ob-month-header">
                  <div className="ob-month-badge">Phase {currentMonth + 1} of 3</div>
                  <div className="ob-month-name" style={{ color: theme.color }}>{theme.name}</div>
                </div>

                <div className="ob-progress-bars">
                  {[0,1,2].map(i => {
                    const isPast = i < currentMonth, isActive = i === currentMonth;
                    const fill = isPast ? 1 : isActive ? progress : 0;
                    return (
                      <div key={i} className="ob-progress-track" onClick={() => goToMonth(i)}>
                        <div className="ob-progress-fill" style={{
                          width: `${fill * 100}%`, background: monthThemes[i].color,
                          opacity: isPast ? 0.45 : 1,
                          transition: isActive ? 'none' : 'width 0.3s ease',
                        }} />
                      </div>
                    );
                  })}
                </div>

                <motion.div key={currentMonth} className="ob-card"
                  initial={{ x: direction * 80, opacity:0 }} animate={{ x:0, opacity:1 }}
                  transition={{ duration:0.45, ease:[0.25,0.46,0.45,0.94] }}
                  onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                  <div className="ob-card-header">
                    <div className="ob-card-icon" style={{ background: theme.bg }}>
                      <ThemeIcon size={20} strokeWidth={1.8} style={{ color: theme.color }} />
                    </div>
                    <div>
                      <div className="ob-card-label">Month {currentMonth + 1}</div>
                      <div className="ob-card-title">{['Foundation','Mastery','Impact'][currentMonth]}</div>
                    </div>
                  </div>
                  <div className="ob-weeks">
                    {months[currentMonth]?.length > 0 ? months[currentMonth].map((week, i) => {
                      const WIcon = weekIcons[(week.week - 1) % weekIcons.length];
                      return (
                        <motion.div key={week.id || week.week} className="ob-week"
                          initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                          transition={{ delay: i * 0.08, duration:0.3 }}>
                          <div className="ob-week-num" style={{ background: theme.bg, color: theme.color }}>
                            <WIcon size={15} strokeWidth={2} />
                          </div>
                          <div className="ob-week-content">
                            <div className="ob-week-label">Week {week.week}</div>
                            <div className="ob-week-title">{week.title}</div>
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <div style={{ textAlign:'center', padding:'40px 20px', color:'#52525B', fontSize:'14px' }}>
                        <p>No curriculum data yet.</p>
                        <p style={{ marginTop:'8px', fontSize:'12px' }}>Weeks loaded: {curriculum.length}</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                <div className="ob-nav">
                  <button className="ob-nav-btn" onClick={() => goToMonth(currentMonth - 1)} disabled={currentMonth === 0}>
                    <ChevronLeft size={22} strokeWidth={1.5} />
                  </button>
                  <span className="ob-nav-hint">
                    {currentMonth === 0 && 'Auto-advancing →'}
                    {currentMonth === 1 && '← Swipe or wait →'}
                    {currentMonth === 2 && "← You've seen it all"}
                  </span>
                  <button className="ob-nav-btn" onClick={() => goToMonth(currentMonth + 1)} disabled={currentMonth === 2}>
                    <ChevronRight size={22} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Phase 3 CTA — attention-grabbing trigger */}
                {currentMonth === 2 && (
                  <motion.div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}
                    initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
                    {isPaid ? (
                      <a href="/student/dashboard" style={{ textDecoration:'none' }}>
                        <div className="ob-btn-wrap">
                          <button className="ob-btn">
                            Go to Dashboard
                            <ArrowRight size={18} strokeWidth={2} className="ob-btn-arrow" />
                          </button>
                        </div>
                      </a>
                    ) : (
                      <>
                        <div style={{ position:'relative' }}>
                          <div className="ob-join-pulse-ring" />
                          <div className="ob-join-pulse-ring-2" />
                          <button className="ob-join-trigger" onClick={() => setShowJoinModal(true)}>
                            <span className="ob-join-trigger-shine" />
                            <Flame size={18} strokeWidth={2} style={{ position:'relative', zIndex:1 }} />
                            <span style={{ position:'relative', zIndex:1 }}>Join the Cohort</span>
                            <ArrowRight size={18} strokeWidth={2} style={{ position:'relative', zIndex:1 }} />
                          </button>
                        </div>
                        <p style={{ fontSize:'12px', color:'#3F3F46', letterSpacing:'0.03em' }}>
                          Limited spots · Cohort starts soon
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── JOIN MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div className="ob-modal-overlay"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.25 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowJoinModal(false); }}>
            <motion.div className="ob-modal"
              initial={{ opacity:0, scale:0.88, y:40 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.92, y:20 }}
              transition={{ duration:0.35, ease:[0.25,0.46,0.45,0.94] }}>

              <div className="ob-modal-beam" />

              <div className="ob-modal-inner">
                <button className="ob-modal-close" onClick={() => setShowJoinModal(false)}>
                  <X size={14} strokeWidth={2} />
                </button>

                <div className="ob-modal-eyebrow">
                  <div className="ob-modal-eyebrow-dot" />
                  Spots filling fast
                </div>

                <h2 className="ob-modal-title">
                  Ready to <span>change</span> everything?
                </h2>

                <p className="ob-modal-sub">
                  12 weeks. Real skills. Real work shipped. One payment stands between you and becoming a different kind of creator.
                </p>

                <div className="ob-modal-price-row">
                  <span className="ob-modal-currency">₦</span>
                  <span className="ob-modal-amount">70,000</span>
                  <span className="ob-modal-per">full program</span>
                </div>

                <div className="ob-modal-perks">
                  {['12 weeks of live sessions','Hands-on projects & feedback','Private cohort community','Lifetime access to recordings','Direct mentor access'].map(perk => (
                    <div key={perk} className="ob-modal-perk">
                      <div className="ob-modal-perk-dot" />
                      {perk}
                    </div>
                  ))}
                </div>

                <div className="ob-modal-btns">
                  <button className="ob-modal-pay-full" onClick={() => { setShowJoinModal(false); pay('full'); }}>
                    <span className="ob-modal-pay-full-shine" />
                    <span style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                      Pay in Full — ₦70,000 <ArrowRight size={16} strokeWidth={2.5} />
                    </span>
                  </button>

                  <button className="ob-modal-pay-split" onClick={() => { setShowJoinModal(false); pay('instalment1'); }}>
                    Start with Instalment 1 — ₦35,000
                  </button>

                  <button className="ob-modal-defer" onClick={() => { setShowJoinModal(false); stopFela(); window.location.href = '/student/dashboard'; }}>
                    I'll pay at the end of the month →
                  </button>
                </div>

                {paymentData?.deadlines?.instalment2 && (
                  <p className="ob-deadline" style={{ marginTop:'16px', textAlign:'center' }}>
                    Second instalment due by{' '}
                    {new Date(paymentData.deadlines.instalment2).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}