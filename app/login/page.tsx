// app/login/page.tsx
"use client";

const BASE = process.env.NEXT_PUBLIC_API_BASE!;

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck, Award, Hexagon, Sparkles, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to authenticate');

      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.user.role);

      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        setErrorMessage('Server is waking up or unreachable. Please try again in 30 seconds.');
      } else {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0a0b12', fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-5px) translateX(-5px); }
          75% { transform: translateY(10px) translateX(-3px); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .grid-pattern {
          background-image: 
            linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        
        .grid-pattern-dark {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        
        .cursor-glow {
          position: fixed;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
          transform: translate(-50%, -50%);
          transition: transform 0.1s ease-out;
        }
        
        .shimmer {
          background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
        }
        
        .orbit-ring {
          position: absolute;
          border: 1px solid rgba(59, 130, 246, 0.12);
          border-radius: 50%;
          animation: orbit 20s linear infinite;
        }
      `}</style>

      {/* Animated cursor glow */}
      <div 
        className="cursor-glow"
        style={{ left: mousePosition.x, top: mousePosition.y }}
      />

      {/* Background grid layers */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute inset-0 grid-pattern-dark opacity-50" style={{ backgroundSize: '60px 60px', backgroundPosition: '30px 30px' }} />
      
      {/* Animated gradient orbs - blue only */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)', filter: 'blur(100px)', top: '-200px', left: '-200px', animation: 'pulse-glow 6s ease-in-out infinite' }} />
      <div className="absolute rounded-full pointer-events-none -z-10"
        style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', filter: 'blur(100px)', bottom: '-100px', right: '-100px', animation: 'pulse-glow 8s ease-in-out infinite 1s' }} />
      <div className="absolute rounded-full pointer-events-none -z-10"
        style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)', filter: 'blur(80px)', bottom: '20%', left: '30%', animation: 'pulse-glow 7s ease-in-out infinite 2s' }} />

      {/* Orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="orbit-ring w-[800px] h-[800px]" style={{ animationDuration: '30s' }} />
        <div className="orbit-ring w-[600px] h-[600px]" style={{ animationDuration: '20s', animationDirection: 'reverse' }} />
        <div className="orbit-ring w-[400px] h-[400px]" style={{ animationDuration: '15s' }} />
      </div>

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-blue-400/30 pointer-events-none"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${8 + Math.random() * 10}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
            opacity: 0.2 + Math.random() * 0.3,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
          }}
        />
      ))}

      {/* Main Card */}
      <div
        className="w-full relative z-10"
        style={{
          maxWidth: 460,
          background: 'rgba(10, 11, 18, 0.85)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 32,
          padding: '2.6rem 2.4rem 2.4rem',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1) inset',
        }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 rounded-3xl shimmer pointer-events-none" style={{ borderRadius: 32 }} />

        {/* Logo Section - no border */}
        <div className="flex items-center justify-center mb-6">
          <div
            className="relative group"
            style={{
              width: '100%',
              maxWidth: 320,
              height: 120,
              padding: '10px 20px',
            }}
          >
            <Image
              src="/web3nova.png"
              alt="Web3Nova Logo"
              fill
              priority
              style={{
                objectFit: 'contain',
                filter:
                  'brightness(0) invert(1) drop-shadow(0 0 12px rgba(59,130,246,0.6)) drop-shadow(0 0 25px rgba(59,130,246,0.4))',
              }}
            />
          </div>
        </div>

        <p className="text-center mb-7" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.3px', fontWeight: 400 }}>
          Sign in to access your learning portal
        </p>

        {/* Trust badges - blue theme only */}
        <div className="flex justify-center flex-wrap gap-2.5 mb-8">
          {[
            { icon: <ShieldCheck size={12} />, label: 'Secure' },
            { icon: <Award size={12} />, label: 'Academy' },
            { icon: <Hexagon size={12} />, label: 'Web3' },
            { icon: <Sparkles size={12} />, label: 'AI-Powered' },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 transition-all duration-200 hover:scale-105"
              style={{
                padding: '5px 13px',
                borderRadius: 40,
                fontSize: 11.5,
                fontWeight: 500,
                border: '1px solid rgba(59,130,246,0.3)',
                background: 'rgba(59,130,246,0.08)',
                color: '#60a5fa',
                letterSpacing: '0.2px',
              }}
            >
              <span style={{ color: '#3b82f6' }}>{icon}</span>
              {label}
            </span>
          ))}
        </div>

        {/* Error banner - blue tinted */}
        {errorMessage && (
          <div
            className="flex items-start gap-3 mb-6 animate-in slide-in-from-top-2 fade-in duration-300"
            style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 14,
              padding: '12px 16px',
            }}
          >
            <AlertCircle size={16} style={{ color: '#60a5fa', marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#93c5fd', lineHeight: 1.5, fontWeight: 450 }}>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <div className="relative flex items-center group">
              <Mail size={16} style={{ position: 'absolute', left: 14, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', transition: 'color 0.2s' }} className="group-focus-within:text-blue-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="student@web3nova.org"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: '13px 16px 13px 42px',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none',
                  transition: 'all 0.2s',
                  fontWeight: 450,
                }}
                className="focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(59,130,246,0.6)';
                  e.target.style.background = 'rgba(59,130,246,0.05)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Password
            </label>
            <div className="relative flex items-center group">
              <Lock size={16} style={{ position: 'absolute', left: 14, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: '13px 48px 13px 42px',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none',
                  transition: 'all 0.2s',
                  fontWeight: 450,
                }}
                className="focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(59,130,246,0.6)';
                  e.target.style.background = 'rgba(59,130,246,0.05)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                className="hover:text-blue-400"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Zap size={10} style={{ color: '#3b82f6' }} />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>
                First-time login? Your password is your first name, lowercase.
              </p>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end" style={{ marginTop: -2 }}>
            <a 
              href="#" 
              style={{ fontSize: 12.5, color: 'rgba(59,130,246,0.7)', textDecoration: 'none', fontWeight: 500 }}
              className="hover:text-blue-400 transition-colors duration-200"
            >
              Forgot password?
            </a>
          </div>

          {/* Submit Button - blue gradient only */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading
                ? 'rgba(37,99,235,0.4)'
                : 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
              border: 'none',
              borderRadius: 14,
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              letterSpacing: '0.3px',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
            onMouseEnter={e => {
              if (!isLoading) {
                e.currentTarget.style.opacity = '0.95';
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            
            {isLoading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  <path d="M8 2a6 6 0 0 1 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Authenticating...
              </>
            ) : (
              <>Sign In <ArrowRight size={17} style={{ transition: 'transform 0.2s' }} className="group-hover:translate-x-1" /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-[rgba(10,11,18,0.85)] text-white/25" style={{ backdropFilter: 'blur(8px)' }}>Secure Access</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3">
          <Lock size={12} style={{ color: 'rgba(59,130,246,0.5)' }} />
          <p className="text-center" style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2px' }}>
            Protected by 256-bit encryption & Web3 security protocols
          </p>
        </div>
        
        {/* Version tag */}
        <div className="absolute bottom-4 right-6 opacity-20 pointer-events-none">
          <span style={{ fontSize: 10, color: 'white' }}>v2.0.0</span>
        </div>
      </div>
    </div>
  );
}