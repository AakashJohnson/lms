import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  CheckCircle2,
  X,
  Shield,
  BadgeCheck,
  ShieldCheck,
  ArrowRight,
  Users,
  GraduationCap,
  UserRound,
  Award,
  Settings,
} from 'lucide-react';
import AnuvadiniLanguageSwitcher from '../components/AnuvadiniLanguageSwitcher';

const API_URL = 'http://localhost:5000/api/v1';
const TRANSLATE_API = 'https://pravahai.aicte-india.org/api/translatebulk';

const easeOut = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: easeOut } },
};

const staggerGroup = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.18 } },
};

const BASE_COPY = {
  heroLine1: 'Cooperative Education &',
  heroLine2: 'Advanced Skills Learning Management System',
  learn: 'Learn',
  collaborate: 'Collaborate',
  grow: 'Grow',
  aiPoweredTitle: 'AI-Powered Learning',
  aiPoweredDesc: 'Smart recommendations and personalized paths',
  liveTitle: 'Live & Interactive Classes',
  liveDesc: 'Learn from experts anywhere, anytime',
  progressTitle: 'Track Progress & Achievements',
  progressDesc: 'Monitor your learning journey',
  certTitle: 'Industry-Ready Certifications',
  certDesc: 'Earn recognized certificates',
  welcomeBack: 'Welcome Back!',
  signInJourney: 'Sign in to continue your learning journey',
  rememberMe: 'Remember me',
  forgotPassword: 'Forgot password?',
  signingIn: 'Signing in...',
  signIn: 'Sign In',
  noAccount: "Don't have an account?",
  createNow: 'Create one now',
  loginAs: 'Login as',
  student: 'Student',
  trainer: 'Trainer',
  admin: 'Admin',
  startLearning: 'Start Learning',
  manageCourses: 'Manage Courses',
  systemAccess: 'System Access',
  trustLine1: 'A secure and trusted learning platform by',
  trustLine2: 'Ministry of Cooperation, Government of India',
  trustLine3: 'Integrated with Anuvadini - Language Learning Initiative',
  securePlatform: 'Secure Platform',
  secureEncrypted: 'Your data is encrypted',
  govtCertified: 'Govt. Certified',
  trustedReliable: 'Trusted & Reliable',
  privacyProtected: 'Privacy Protected',
  dataSecurity: '100% Data Security',
};

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ emailOrMobile: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeDemo, setActiveDemo] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translatedCopy, setTranslatedCopy] = useState(BASE_COPY);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberEmail');
    const savedPassword = localStorage.getItem('rememberPassword');
    const savedRemember = localStorage.getItem('rememberMe');

    if (savedEmail && savedPassword && savedRemember === 'true') {
      setFormData({ emailOrMobile: savedEmail, password: savedPassword });
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) navigate('/dashboard');
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/auth/login`, formData);
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        if (rememberMe) {
          localStorage.setItem('rememberEmail', formData.emailOrMobile);
          localStorage.setItem('rememberPassword', formData.password);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberEmail');
          localStorage.removeItem('rememberPassword');
          localStorage.removeItem('rememberMe');
        }
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot connect to server. Please make sure backend is running.');
      } else if (err.response?.status === 401) {
        setError('Invalid credentials. Please check your email/mobile and password.');
      } else if (err.response?.status === 403) {
        setError(err.response?.data?.error || 'Account not approved or inactive.');
      } else {
        setError(err.response?.data?.error || err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const autoFill = (email, password, role) => {
    setFormData({ emailOrMobile: email, password });
    setError('');
    setActiveDemo(role);
    setTimeout(() => setActiveDemo(null), 1500);
  };

  const fallbackImg = (e) => {
    e.currentTarget.style.visibility = 'hidden';
  };

  const features = [
    { title: translatedCopy.aiPoweredTitle, desc: translatedCopy.aiPoweredDesc, icon: '/2.png' },
    { title: translatedCopy.liveTitle, desc: translatedCopy.liveDesc, icon: '/3.png' },
    { title: translatedCopy.progressTitle, desc: translatedCopy.progressDesc, icon: '/4.png' },
    { title: translatedCopy.certTitle, desc: translatedCopy.certDesc, icon: '/5.png' },
  ];

  const stats = [
    { value: '10K+', label: 'Active Learners', icon: Users },
    { value: '500+', label: 'Courses', icon: GraduationCap },
    { value: '100+', label: 'Expert Trainers', icon: UserRound },
    { value: '95%', label: 'Success Rate', icon: Award },
  ];

  const demoCredentials = [
    { role: translatedCopy.student, email: 'student@ncui.in', password: 'Student@123', subtitle: translatedCopy.startLearning, icon: GraduationCap },
    { role: translatedCopy.trainer, email: 'trainer@ncui.in', password: 'Trainer@123', subtitle: translatedCopy.manageCourses, icon: UserRound },
    { role: translatedCopy.admin, email: 'admin@ncui.in', password: 'Admin@123', subtitle: translatedCopy.systemAccess, icon: Settings },
  ];

  useEffect(() => {
    let mounted = true;

    const translateUi = async () => {
      if (currentLanguage === 'en') {
        setTranslatedCopy(BASE_COPY);
        return;
      }

      try {
        const keys = Object.keys(BASE_COPY);
        const values = keys.map((k) => BASE_COPY[k]);
        const fmt = (l) => (l.includes('-') ? l : `${l}-IN`);
        const res = await fetch(TRANSLATE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: values,
            source_language: fmt('en'),
            target_language: fmt(currentLanguage),
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const translated = data?.translated_text;
        if (!Array.isArray(translated) || translated.length !== values.length) return;

        const mapped = { ...BASE_COPY };
        keys.forEach((k, i) => {
          mapped[k] = translated[i] || BASE_COPY[k];
        });
        if (mounted) setTranslatedCopy(mapped);
      } catch {
        // fallback remains last loaded copy
      }
    };

    translateUi();
    return () => {
      mounted = false;
    };
  }, [currentLanguage]);

  return (
    <LazyMotion features={domAnimation}>
    <div className="login-page">
      <m.section
        className="login-hero"
        initial="hidden"
        animate="show"
        variants={staggerGroup}
      >
        <div className="hero-soft-bg" />
        <div className="top-branding">
          <img src="/ncui.png" alt="NCUI logo" className="ncui-logo" onError={fallbackImg} />
          <span className="top-brand-divider" />
          <img src="/ankuvadini.png" alt="Anuvadini logo" className="top-anuvadini-logo" onError={fallbackImg} />
        </div>

        <m.div className="hero-copy" variants={fadeUp}>
          <div className="ceas-logo-crop">
            <img src="/mca_logo.png" alt="Ministry of Cooperation logo" onError={fallbackImg} />
          </div>
          <h1>CEAS LMS</h1>
          <p className="hero-subtitle">{translatedCopy.heroLine1}<br />{translatedCopy.heroLine2}</p>
          <p className="hero-pillars">{translatedCopy.learn} <span>&bull;</span> {translatedCopy.collaborate} <span>&bull;</span> {translatedCopy.grow}</p>
        </m.div>

        <m.div className="feature-row" variants={staggerGroup}>
          {features.map((feature) => (
            <m.div className="feature-item" key={feature.title} variants={fadeUp}>
              <img src={feature.icon} alt={`${feature.title} icon`} onError={fallbackImg} />
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </m.div>
          ))}
        </m.div>

        <img
          src="/1.png"
          alt="Classroom students learning with a trainer and projector"
          className="classroom-art"
          onError={fallbackImg}
        />
        <div className="classroom-fade" />

      </m.section>

      <m.section className="login-side" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: easeOut }}>
        <div className="login-side-inner">
          <div className="login-lang-slot">
            <AnuvadiniLanguageSwitcher currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} />
          </div>

          <m.div
            className="login-card"
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.18 }}
          >
            <div className="mobile-brand">
              <img src="/login_logo.png" alt="CEAS LMS logo" onError={fallbackImg} />
            </div>

            <div className="card-heading">
              <div className="cap-circle">
                <GraduationCap />
              </div>
              <h2>{translatedCopy.welcomeBack}</h2>
              <p>{translatedCopy.signInJourney}</p>
            </div>

            {error && (
              <div className="error-box">
                <div><X /></div>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <label className="field-wrap">
                <Mail />
                <input
                  name="emailOrMobile"
                  type="text"
                  required
                  value={formData.emailOrMobile}
                  onChange={handleChange}
                  placeholder="student@ncui.in"
                />
              </label>

              <label className="field-wrap">
                <Lock />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-btn" aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </label>

              <div className="form-row">
                <label className="remember-label">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span>{translatedCopy.rememberMe}</span>
                </label>
                <a href="/forgot-password">{translatedCopy.forgotPassword}</a>
              </div>

              <m.button type="submit" disabled={loading} className="signin-btn" whileTap={{ scale: loading ? 1 : 0.985 }}>
                {loading ? (
                  <>
                    <Loader2 className="spin" />
                    {translatedCopy.signingIn}
                  </>
                ) : (
                  <>
                    {translatedCopy.signIn}
                    <ArrowRight />
                  </>
                )}
              </m.button>
            </form>

            <p className="register-link">
              {translatedCopy.noAccount} <a href="/register">{translatedCopy.createNow}</a>
            </p>

            <div className="login-as">
              <div className="divider-line" />
              <span>{translatedCopy.loginAs}</span>
              <div className="divider-line" />
            </div>

            <div className="role-grid">
              {demoCredentials.map((cred) => (
                <m.button
                  key={cred.role}
                  type="button"
                  onClick={() => autoFill(cred.email, cred.password, cred.role)}
                  className={`role-card ${activeDemo === cred.role ? 'active' : ''}`}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                >
                  <cred.icon />
                  <strong>{cred.role}</strong>
                  <span>{cred.subtitle}</span>
                  <span className="role-arrow"><ArrowRight /></span>
                  {activeDemo === cred.role && <CheckCircle2 className="role-check" />}
                </m.button>
              ))}
            </div>
          </m.div>

          <m.div
            className="trust-banner"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOut, delay: 0.34 }}
          >
            <ShieldCheck />
            <p>
              {translatedCopy.trustLine1}<br />
              <strong>{translatedCopy.trustLine2}</strong><br />
              {translatedCopy.trustLine3}
            </p>
          </m.div>

          <m.div
            className="security-row"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: easeOut, delay: 0.44 }}
          >
            <div><Shield /><strong>{translatedCopy.securePlatform}</strong><span>{translatedCopy.secureEncrypted}</span></div>
            <div><BadgeCheck /><strong>{translatedCopy.govtCertified}</strong><span>{translatedCopy.trustedReliable}</span></div>
            <div><ShieldCheck /><strong>{translatedCopy.privacyProtected}</strong><span>{translatedCopy.dataSecurity}</span></div>
          </m.div>
        </div>
      </m.section>

      <style>{`
        .login-page {
          --primary: #462FDD;
          --ink: #13106A;
          --muted: #655DA7;
          height: 100vh;
          width: 100%;
          display: flex;
          overflow: hidden;
          background: #fbfaff;
          color: var(--ink);
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        #anuvadini-lang-a11y-wrapper {
          display: none !important;
        }

        .login-hero {
          position: relative;
          display: flex;
          width: 58%;
          height: 100vh;
          overflow: hidden;
          background: #f8f6ff;
        }

        .hero-soft-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(780px 380px at 56% 24%, rgba(255,255,255,.86), transparent 72%),
            linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(245,241,255,.92) 52%, rgba(236,229,255,.70) 100%);
          z-index: 1;
        }

        .hero-wave {
          position: absolute;
          top: -2px;
          right: -2px;
          width: min(300px, 29vw);
          height: auto;
          z-index: 4;
          pointer-events: none;
        }

        .top-branding {
          position: absolute;
          top: 24px;
          left: 34px;
          z-index: 18;
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .ncui-logo {
          width: 54px;
          height: 54px;
          object-fit: contain;
        }

        .top-brand-divider {
          width: 1px;
          height: 52px;
          background: #d9d0fa;
        }

        .top-anuvadini-logo {
          width: 210px;
          height: auto;
          object-fit: contain;
        }

        .brand-row {
          position: absolute;
          top: 18px;
          left: 34px;
          z-index: 5;
          display: flex;
          align-items: flex-start;
          gap: 28px;
        }

        .ministry-logo {
          width: min(350px, 33vw);
          height: auto;
          object-fit: contain;
        }

        .brand-divider {
          width: 1px;
          height: 68px;
          background: #c9c0ef;
          margin-top: 15px;
        }

        .anuvadini-logo {
          width: min(220px, 20vw);
          height: auto;
          margin-top: 20px;
          object-fit: contain;
        }

        .hero-copy {
          position: absolute;
          z-index: 5;
          top: clamp(105px, 12.3vh, 132px);
          left: 50%;
          transform: translateX(-50%);
          width: 680px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .ceas-logo {
          width: clamp(90px, 12vh, 126px);
          height: clamp(90px, 12vh, 126px);
          object-fit: contain;
          margin: 0 auto 8px;
          display: block;
        }

        .ceas-logo-crop {
          width: 150px;
          height: 86px;
          margin: 0 auto 14px;
          overflow: visible;
          border-radius: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ceas-logo-crop img {
          width: 150px;
          height: auto;
          max-width: none;
          transform: none;
          object-fit: contain;
        }

        .hero-copy h1 {
          margin: 0;
          margin-top: 2px;
          font-size: clamp(46px, 5.4vw, 64px);
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0;
          color: var(--primary);
        }

        .hero-subtitle {
          margin: 8px 0 0;
          font-size: clamp(15px, 1.6vh, 18px);
          line-height: 1.28;
          font-weight: 700;
          color: #151171;
        }

        .hero-pillars {
          margin: clamp(10px, 1.7vh, 17px) 0 0;
          font-size: 16px;
          line-height: 1;
          font-weight: 700;
          color: var(--primary);
        }

        .hero-pillars span {
          display: inline-block;
          margin: 0 13px;
        }

        .feature-row {
          position: absolute;
          z-index: 5;
          left: 11%;
          right: 11%;
          top: clamp(320px, 39vh, 430px);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 48px;
        }

        .feature-item {
          text-align: center;
          min-width: 0;
          background: transparent !important;
        }

        .feature-item img {
          width: clamp(52px, 6vh, 64px);
          height: clamp(52px, 6vh, 64px);
          object-fit: contain;
          display: block;
          margin: 0 auto 9px;
          mix-blend-mode: multiply !important;
          background: transparent !important;
          filter: contrast(1.14) saturate(1.08) brightness(0.94);
        }

        .feature-item h3 {
          margin: 0;
          color: #11106d;
          font-size: clamp(10px, 1.15vh, 11px);
          line-height: 1.18;
          font-weight: 800;
        }

        .feature-item p {
          margin: 8px auto 0;
          max-width: 116px;
          color: #1d1a81;
          font-size: clamp(8px, 1vh, 9.5px);
          line-height: 1.5;
          font-weight: 500;
        }

        .classroom-art {
          position: absolute;
          z-index: 2;
          left: 0;
          right: 0;
          bottom: 104px;
          width: 100%;
          height: clamp(245px, 32vh, 350px);
          object-fit: cover;
          object-position: bottom center;
          animation: classroomReveal .9s ease-out both;
        }

        .classroom-fade {
          position: absolute;
          left: 0;
          right: 0;
          z-index: 6;
          pointer-events: none;
          display: none;
        }

        .stats-bar {
          position: absolute;
          z-index: 6;
          left: 0;
          right: 0;
          bottom: 0;
          height: 104px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: center;
          background: linear-gradient(90deg, #341EC3 0%, #462FDD 50%, #321DBD 100%);
          color: white;
          box-shadow: 0 -16px 42px rgba(70, 47, 221, .24);
          display: none;
        }

        .stat-item {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          border-right: 1px solid rgba(255,255,255,.22);
          animation: statRise .55s ease-out both;
        }

        .stat-item:nth-child(2) { animation-delay: .08s; }
        .stat-item:nth-child(3) { animation-delay: .16s; }
        .stat-item:nth-child(4) { animation-delay: .24s; }

        .stat-item:last-child {
          border-right: 0;
        }

        .stat-icon {
          width: 32px;
          height: 32px;
          stroke-width: 1.8;
        }

        .stat-item strong {
          display: block;
          font-size: clamp(22px, 2.6vh, 27px);
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0;
        }

        .stat-item span {
          display: block;
          margin-top: 6px;
          font-size: 13px;
          line-height: 1;
          color: rgba(255,255,255,.92);
        }

        .login-side {
          width: 42%;
          height: 100vh;
          background: linear-gradient(180deg, #fff 0%, #fbfaff 68%, #f7f3ff 100%);
          display: flex;
          justify-content: center;
          overflow: hidden;
        }

        .login-side-inner {
          width: min(100%, 585px);
          height: 100vh;
          padding: clamp(14px, 2vh, 20px) 26px 18px;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .login-lang-slot {
          position: absolute;
          top: 18px;
          right: 18px;
          z-index: 40;
        }

        .anu-lang-wrap { position: relative; }
        .anu-lang-pill {
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          background: linear-gradient(135deg, #6178f5 0%, #7a48bf 100%);
          color: #fff;
          height: 44px;
          min-width: 195px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 7px;
          box-shadow: 0 10px 24px rgba(66,49,151,.32);
        }
        .anu-lang-logo {
          width: 24px;
          height: 24px;
          object-fit: contain;
          border-radius: 50%;
          background: rgba(255,255,255,.92);
          padding: 2px;
        }
        .anu-lang-current { font-size: 16px; font-weight: 700; line-height: 1; }
        .anu-lang-chevron { width: 13px; height: 13px; opacity: .95; }
        .anu-lang-divider { margin-left: auto; width: 1px; height: 20px; background: rgba(255,255,255,.35); }
        .anu-lang-action {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255,255,255,.24);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .anu-lang-action img { width: 12px; height: 12px; object-fit: contain; }
        .anu-lang-dropdown {
          position: absolute;
          top: 58px;
          right: 0;
          width: 260px;
          max-height: 600px;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #d8d8d8;
          box-shadow: 0 14px 30px rgba(0,0,0,.18);
          overflow: hidden;
          z-index: 50;
        }
        .anu-lang-search {
          width: calc(100% - 20px);
          margin: 10px;
          height: 34px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0 10px;
          font-size: 13px;
        }
        .anu-lang-list {
          max-height: 500px;
          overflow-y: auto;
          border-top: 1px solid #ececec;
          border-bottom: 1px solid #ececec;
        }
        .anu-lang-item {
          width: 100%;
          text-align: left;
          background: #fff;
          border: 0;
          padding: 10px 14px;
          font-size: 14px;
          color: #303030;
        }
        .anu-lang-item:hover { background: #f7f7f7; }
        .anu-lang-footer {
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #7d7d7d;
          font-size: 11px;
          font-style: italic;
          background: #f7f7f7;
        }
        .anu-lang-footer img { width: 60px; object-fit: contain; }

        .language-pill {
          margin-left: auto;
          margin-bottom: clamp(12px, 2vh, 24px);
          height: 60px;
          min-width: 300px;
          padding: 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          background: linear-gradient(135deg, #2e2466 0%, #2f1f67 100%);
          display: flex;
          align-items: center;
          gap: 12px;
          color: #9f96c4;
          font-weight: 700;
          font-size: 34px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 30px rgba(26, 12, 69, .35);
        }

        .language-brand-icon {
          width: 28px;
          height: 28px;
          object-fit: contain;
          border-radius: 50%;
          padding: 4px;
          background: rgba(255,255,255,.20);
        }

        .language-select {
          appearance: none;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f2f0ff;
          font-size: 23px;
          font-weight: 700;
          line-height: 1;
          min-width: 112px;
          cursor: pointer;
        }

        .language-chevron {
          width: 16px;
          height: 16px;
          color: #d9d3f5;
          margin-left: -4px;
        }

        .language-divider {
          width: 1px;
          height: 30px;
          background: rgba(255,255,255,.22);
          margin-left: auto;
          margin-right: 8px;
        }

        .language-action {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255,255,255,.20);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #ece8ff;
        }

        .language-action svg {
          width: 16px;
          height: 16px;
        }


        .login-card {
          width: 100%;
          border-radius: 28px;
          border: 1px solid rgba(226,219,255,.82);
          background: rgba(255,255,255,.94);
          box-shadow: 0 26px 65px rgba(34,18,112,.07);
          padding: clamp(18px, 2.1vh, 22px) 42px clamp(18px, 2.2vh, 24px);
        }

        .mobile-brand {
          display: none;
        }

        .card-heading {
          text-align: center;
          margin-bottom: clamp(16px, 2.2vh, 23px);
        }

        .cap-circle {
          width: clamp(60px, 7.2vh, 78px);
          height: clamp(60px, 7.2vh, 78px);
          margin: 0 auto clamp(8px, 1.2vh, 12px);
          border-radius: 50%;
          border: 1px solid #ded4ff;
          background: #f0ebff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cap-circle svg {
          width: clamp(28px, 3.4vh, 36px);
          height: clamp(28px, 3.4vh, 36px);
          color: var(--primary);
          stroke-width: 2.4;
        }

        .card-heading h2 {
          margin: 0;
          color: #151171;
          font-size: clamp(26px, 3.1vh, 31px);
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0;
        }

        .card-heading p {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.2;
          font-weight: 500;
        }

        .error-box {
          margin-bottom: 16px;
          border: 1px solid #fecaca;
          border-radius: 16px;
          background: #fff1f2;
          padding: 12px;
          display: flex;
          gap: 10px;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 600;
        }

        .error-box div {
          width: 28px;
          height: 28px;
          flex: 0 0 auto;
          border-radius: 10px;
          background: #fee2e2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-box svg {
          width: 16px;
          height: 16px;
        }

        .login-form {
          display: grid;
          gap: clamp(10px, 1.5vh, 14px);
        }

        .field-wrap {
          position: relative;
          display: block;
        }

        .field-wrap > svg {
          position: absolute;
          left: 17px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: var(--primary);
          stroke-width: 2.3;
        }

        .field-wrap input {
          width: 100%;
          height: clamp(46px, 5.1vh, 52px);
          border: 1px solid #ddd7f2;
          border-radius: 11px;
          background: #fff;
          padding: 0 48px 0 50px;
          color: #151171;
          font-size: 15px;
          font-weight: 600;
          outline: none;
          transition: border-color .18s ease, box-shadow .18s ease;
        }

        .field-wrap input::placeholder {
          color: #151171;
          opacity: .95;
        }

        .field-wrap input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(70,47,221,.08);
        }

        .eye-btn {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #8e85c8;
          border: 0;
          background: transparent;
          padding: 4px;
          cursor: pointer;
        }

        .eye-btn svg {
          width: 20px;
          height: 20px;
        }

        .form-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 2px;
          font-size: 13px;
        }

        .remember-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--muted);
          font-weight: 500;
        }

        .remember-label input {
          width: 15px;
          height: 15px;
          accent-color: var(--primary);
        }

        .form-row a,
        .register-link a {
          color: var(--primary);
          font-weight: 700;
          text-decoration: none;
        }

        .signin-btn {
          height: clamp(50px, 5.6vh, 58px);
          margin-top: clamp(4px, 1vh, 8px);
          border: 0;
          border-radius: 11px;
          background: linear-gradient(90deg, #401FD6 0%, #4B25DC 52%, #431BD4 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          font-size: 19px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(70,47,221,.22);
        }

        .signin-btn:disabled {
          opacity: .62;
          cursor: not-allowed;
        }

        .signin-btn svg {
          width: 21px;
          height: 21px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .register-link {
          margin: clamp(12px, 1.8vh, 18px) 0 0;
          color: var(--muted);
          text-align: center;
          font-size: 13px;
          font-weight: 500;
        }

        .login-as {
          margin: clamp(16px, 2.2vh, 24px) 0 clamp(12px, 1.8vh, 18px);
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 18px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 500;
        }

        .divider-line {
          height: 1px;
          background: #ece7fb;
        }

        .role-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .role-card {
          position: relative;
          min-height: clamp(104px, 12.2vh, 126px);
          border: 1px solid #e2dcf4;
          border-radius: 11px;
          background: #fff;
          color: var(--ink);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 14px 8px;
          cursor: pointer;
          transition: border-color .18s ease, background .18s ease, transform .18s ease;
        }

        .role-card:hover,
        .role-card.active {
          border-color: var(--primary);
          background: #f8f5ff;
        }

        .role-card > svg:first-child {
          width: 26px;
          height: 26px;
          color: var(--primary);
          stroke-width: 2.5;
          margin-bottom: 9px;
        }

        .role-card strong {
          font-size: 13px;
          line-height: 1;
          font-weight: 800;
        }

        .role-card span {
          color: var(--muted);
          font-size: 11px;
          line-height: 1;
          margin-top: 9px;
        }

        .role-arrow {
          width: 20px;
          height: 20px;
          border: 1.5px solid var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 13px !important;
          color: var(--primary) !important;
        }

        .role-arrow svg {
          width: 12px;
          height: 12px;
        }

        .role-check {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 16px;
          height: 16px;
          color: var(--primary);
        }

        .trust-banner {
          margin-top: clamp(14px, 2vh, 22px);
          min-height: clamp(70px, 8.4vh, 80px);
          border: 1px solid #dcd3ff;
          border-radius: 14px;
          background: linear-gradient(90deg, #f2edff 0%, #fbf9ff 100%);
          display: grid;
          grid-template-columns: 46px 1fr 160px;
          align-items: center;
          gap: 14px;
          padding: 13px 22px;
          color: #1c1777;
          box-shadow: 0 16px 32px rgba(70,47,221,.07);
        }

        .trust-banner > svg {
          width: 35px;
          height: 35px;
          color: var(--primary);
          stroke-width: 2.3;
        }

        .trust-banner p {
          margin: 0;
          font-size: 11.5px;
          line-height: 1.42;
          font-weight: 600;
        }

        .trust-banner strong {
          font-weight: 800;
        }

        .trust-banner img {
          width: 142px;
          height: auto;
          justify-self: end;
        }

        .security-row {
          margin-top: clamp(12px, 2vh, 22px);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          color: #17126f;
        }

        .security-row div {
          display: grid;
          grid-template-columns: 28px 1fr;
          column-gap: 8px;
          align-items: center;
          min-width: 0;
        }

        .security-row svg {
          grid-row: span 2;
          width: 26px;
          height: 26px;
          color: #887fc5;
          stroke-width: 2.2;
        }

        .security-row strong {
          font-size: 10.5px;
          line-height: 1.1;
          font-weight: 800;
          color: #18136f;
        }

        .security-row span {
          font-size: 10.5px;
          line-height: 1.2;
          color: var(--muted);
          margin-top: 3px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes waveFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }

        @keyframes classroomReveal {
          from { opacity: .72; transform: scale(1.025); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes statRise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
        .hero-wave,
          .classroom-art,
          .stat-item {
            animation: none !important;
          }
        }

        @media (max-width: 1280px) {
          .brand-row { left: 28px; gap: 20px; }
          .ministry-logo { width: 285px; }
          .anuvadini-logo { width: 185px; }
          .hero-copy { top: 124px; }
          .hero-copy h1 { font-size: 52px; }
          .feature-row { left: 8%; right: 8%; top: 406px; gap: 28px; }
          .classroom-art { height: 320px; bottom: 82px; }
          .login-card { padding-inline: 34px; }
        }

        @media (max-width: 1023px) {
          .login-page {
            display: block;
            min-height: 100vh;
            overflow-y: auto;
          }

          .login-hero {
            width: 100%;
            min-height: auto;
            height: 245px;
            display: block;
            border-bottom: 1px solid #ece7ff;
          }

          .hero-wave,
          .top-branding,
          .feature-row,
          .classroom-art,
          .stats-bar {
            display: none;
          }

          .brand-row {
            position: relative;
            top: auto;
            left: auto;
            padding: 18px 20px 0;
            justify-content: center;
            gap: 16px;
          }

          .ministry-logo { width: 210px; }
          .brand-divider { height: 50px; margin-top: 10px; }
          .anuvadini-logo { width: 142px; margin-top: 16px; }

          .hero-copy {
            position: relative;
            top: auto;
            left: auto;
            transform: none;
            width: 100%;
            margin-top: 12px;
          }

          .ceas-logo { width: 64px; height: 64px; margin-bottom: 5px; }
          .hero-copy h1 { font-size: 36px; }
          .hero-subtitle, .hero-pillars { display: none; }

          .login-side {
            width: 100%;
            min-height: auto;
          }

          .login-side-inner {
            padding: 18px 16px 30px;
          }

          .language-pill {
            margin-bottom: 16px;
            height: 44px;
          }

          .login-card {
            border-radius: 22px;
            padding: 24px 18px;
          }

          .card-heading h2 { font-size: 32px; }
          .role-grid { gap: 9px; }
          .role-card { min-height: 110px; }
          .trust-banner {
            grid-template-columns: 34px 1fr;
            padding: 12px 14px;
          }
          .trust-banner img { display: none; }
          .security-row { gap: 10px; }
          .security-row div { grid-template-columns: 1fr; text-align: center; justify-items: center; }
          .security-row svg { grid-row: auto; margin-bottom: 5px; }
        }

        @media (max-width: 560px) {
          .brand-row { transform: scale(.8); transform-origin: top center; width: 125%; margin-left: -12.5%; }
          .login-hero { height: 218px; }
          .language-pill { margin-inline: auto 0; }
          .card-heading h2 { font-size: 28px; }
          .role-grid { grid-template-columns: 1fr; }
          .role-card { min-height: 96px; }
          .trust-banner p { font-size: 10.5px; }
          .security-row { grid-template-columns: 1fr; }
        }

        @media (min-width: 1024px) {
          .login-page {
            height: 100vh;
            min-height: 0;
            overflow: hidden;
            background: #fbfaff;
          }

          .login-hero {
            flex: 0 0 58%;
            width: 58%;
            height: 100vh;
            min-height: 0;
          }

          .login-side {
            flex: 0 0 42%;
            width: 42%;
            height: 100vh;
            min-height: 0;
            overflow: hidden;
          }

          .hero-soft-bg {
            background:
              radial-gradient(820px 420px at 50% 22%, rgba(255,255,255,.94), rgba(255,255,255,.62) 54%, transparent 78%),
              linear-gradient(180deg, #fbfaff 0%, #f8f5ff 44%, rgba(240,233,255,.78) 100%);
          }

          .hero-wave {
            width: 300px;
            top: 0;
            right: 0;
          }

          .brand-row {
            top: 18px;
            left: 34px;
            gap: 28px;
          }

          .ministry-logo {
            width: clamp(280px, 20.5vw, 352px);
          }

          .brand-divider {
            height: 74px;
            margin-top: 15px;
          }

          .anuvadini-logo {
            width: clamp(176px, 13vw, 222px);
            margin-top: 20px;
          }

          .hero-copy {
            top: clamp(104px, 11.7vh, 128px);
            width: min(690px, 68%);
          }

          .ceas-logo {
            width: clamp(104px, 12.5vh, 132px);
            height: clamp(104px, 12.5vh, 132px);
            margin-bottom: 8px;
          }

          .hero-copy h1 {
            font-size: clamp(58px, 4.7vw, 76px);
            line-height: .96;
            font-weight: 900;
          }

          .hero-subtitle {
            margin-top: 8px;
            font-size: clamp(16px, 1.7vh, 19px);
            line-height: 1.25;
            font-weight: 700;
          }

          .hero-pillars {
            margin-top: clamp(12px, 1.8vh, 18px);
            font-size: 16px;
            font-weight: 800;
          }

          .feature-row {
            left: 11.8%;
            right: 11.8%;
            top: clamp(384px, 43.5vh, 450px);
            gap: clamp(34px, 5vw, 66px);
            z-index: 7;
          }

          .feature-item img {
            width: 64px;
            height: 64px;
            margin-bottom: 10px;
          }

          .feature-item h3 {
            font-size: 11px;
            line-height: 1.18;
          }

          .feature-item p {
            font-size: 9.5px;
            line-height: 1.45;
            max-width: 122px;
          }

          .classroom-art {
            top: clamp(468px, 51.4vh, 545px);
            bottom: 0;
            height: auto;
            z-index: 2;
            object-position: bottom center;
          }

          .stats-bar {
            left: 16px;
            right: 16px;
            bottom: 12px;
            height: 94px;
            border-radius: 0 0 18px 18px;
            overflow: hidden;
            z-index: 8;
            background: linear-gradient(90deg, rgba(52,30,195,.98) 0%, rgba(70,47,221,.98) 50%, rgba(50,29,189,.98) 100%);
          }

          .stat-item {
            height: 58px;
            gap: 18px;
          }

          .stat-icon {
            width: 32px;
            height: 32px;
          }

          .stat-item strong {
            font-size: 27px;
          }

          .stat-item span {
            font-size: 13px;
          }

          .login-side-inner {
            position: relative;
            width: min(100%, 650px);
            height: 100vh;
            padding: 0 24px;
          }

          .language-pill {
            position: absolute;
            top: 20px;
            right: 18px;
            z-index: 10;
            height: 42px;
            min-width: 176px;
            margin: 0;
            padding: 0 15px;
            font-size: 14px;
            box-shadow: 0 10px 28px rgba(70,47,221,.08);
          }

          .login-card {
            position: absolute;
            top: clamp(78px, 8.6vh, 88px);
            left: 50%;
            transform: translateX(-50%);
            width: min(560px, calc(100% - 34px));
            border-radius: 28px;
            padding: clamp(20px, 2.3vh, 27px) 38px clamp(18px, 2.2vh, 25px);
          }

          .cap-circle {
            width: clamp(66px, 7.5vh, 78px);
            height: clamp(66px, 7.5vh, 78px);
            margin-bottom: 12px;
          }

          .card-heading {
            margin-bottom: clamp(18px, 2.3vh, 26px);
          }

          .card-heading h2 {
            font-size: clamp(28px, 3.1vh, 32px);
          }

          .card-heading p {
            font-size: 15px;
          }

          .login-form {
            gap: clamp(11px, 1.55vh, 16px);
          }

          .field-wrap input {
            height: clamp(48px, 5.3vh, 54px);
            border-radius: 10px;
          }

          .form-row {
            margin-top: 3px;
            font-size: 13px;
          }

          .signin-btn {
            height: clamp(52px, 5.8vh, 60px);
            margin-top: 8px;
            border-radius: 10px;
            font-size: 19px;
          }

          .register-link {
            margin-top: clamp(14px, 1.9vh, 20px);
            font-size: 13px;
          }

          .login-as {
            margin: clamp(18px, 2.4vh, 27px) 0 clamp(13px, 1.8vh, 18px);
          }

          .role-grid {
            gap: 14px;
          }

          .role-card {
            min-height: clamp(112px, 12.4vh, 128px);
            border-radius: 10px;
          }

          .trust-banner {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            top: calc(100vh - 160px);
            width: min(560px, calc(100% - 34px));
            min-height: 76px;
            margin: 0;
            border-radius: 14px;
            grid-template-columns: 46px 1fr 150px;
            padding: 12px 20px;
          }

          .trust-banner img {
            width: 140px;
          }

          .security-row {
            position: absolute;
            left: 50%;
            bottom: 23px;
            transform: translateX(-50%);
            width: min(560px, calc(100% - 34px));
            margin: 0;
            gap: 12px;
          }
        }

        @media (min-width: 1024px) {
          .login-page {
            --left: 59.2%;
            --right: 40.8%;
            height: 100dvh !important;
            min-height: 720px;
            overflow: hidden !important;
            background: #fbfaff;
          }

          .login-hero {
            flex: 0 0 var(--left) !important;
            width: var(--left) !important;
            height: 100dvh !important;
            min-height: 720px;
            overflow: hidden;
            background: #f9f7ff;
          }

          .login-side {
            flex: 0 0 var(--right) !important;
            width: var(--right) !important;
            height: 100dvh !important;
            min-height: 720px;
            overflow: hidden !important;
            background:
              radial-gradient(560px 360px at 50% 7%, rgba(245,241,255,.92), transparent 72%),
              linear-gradient(180deg, #ffffff 0%, #fbfaff 56%, #f8f5ff 100%);
          }

          .hero-soft-bg {
            background:
              radial-gradient(760px 360px at 52% 20%, rgba(255,255,255,.96), rgba(255,255,255,.66) 58%, transparent 78%),
              linear-gradient(180deg, #fbfaff 0%, #f8f5ff 47%, rgba(241,235,255,.78) 100%) !important;
          }

          .hero-wave {
            width: clamp(300px, 22vw, 420px) !important;
            top: -18px !important;
            right: -2px !important;
            object-fit: contain !important;
            object-position: top right !important;
          }

          .brand-row {
            top: clamp(16px, 2.2vh, 24px) !important;
            left: clamp(24px, 2.2vw, 34px) !important;
            gap: clamp(22px, 2vw, 30px) !important;
            align-items: flex-start;
          }

          .ministry-logo {
            width: clamp(280px, 21.3vw, 352px) !important;
          }

          .brand-divider {
            height: clamp(62px, 8.2vh, 82px) !important;
            margin-top: clamp(10px, 1.8vh, 17px) !important;
          }

          .anuvadini-logo {
            width: clamp(178px, 13.8vw, 228px) !important;
            margin-top: clamp(15px, 2.4vh, 24px) !important;
          }

          .hero-copy {
            top: clamp(108px, 12.4vh, 132px) !important;
            width: min(690px, 72%) !important;
          }

          .ceas-logo-crop {
            width: clamp(104px, 12.8vh, 132px) !important;
            height: clamp(104px, 12.8vh, 132px) !important;
            margin-bottom: 8px !important;
          }

          .ceas-logo-crop img {
            width: clamp(144px, 17.2vh, 182px) !important;
            height: clamp(144px, 17.2vh, 182px) !important;
            transform: translateY(-11px) !important;
          }

          .hero-copy h1 {
            font-size: clamp(60px, 5.05vw, 77px) !important;
            line-height: .95 !important;
            font-weight: 900 !important;
            color: #462FDD !important;
          }

          .hero-subtitle {
            margin-top: clamp(8px, 1vh, 10px) !important;
            font-size: clamp(16px, 1.88vh, 19px) !important;
            line-height: 1.25 !important;
            font-weight: 700 !important;
          }

          .hero-pillars {
            margin-top: clamp(13px, 1.8vh, 18px) !important;
            font-size: clamp(15px, 1.7vh, 17px) !important;
            font-weight: 800 !important;
          }

          .hero-pillars span {
            margin: 0 14px !important;
          }

          .feature-row {
            top: clamp(342px, 38vh, 410px) !important;
            left: 13.2% !important;
            right: 13.2% !important;
            gap: clamp(36px, 5.7vw, 76px) !important;
            z-index: 8 !important;
          }

          .feature-item img {
            width: clamp(58px, 7.1vh, 66px) !important;
            height: clamp(58px, 7.1vh, 66px) !important;
            margin-bottom: 10px !important;
            mix-blend-mode: multiply !important;
            filter: contrast(1.05) saturate(1.05) !important;
          }

          .feature-item h3 {
            font-size: clamp(10.5px, 1.25vh, 12px) !important;
            line-height: 1.18 !important;
            font-weight: 800 !important;
            color: #11106d !important;
          }

          .feature-item p {
            max-width: 126px !important;
            margin-top: 8px !important;
            font-size: clamp(8.5px, 1.06vh, 10px) !important;
            line-height: 1.45 !important;
            color: #1a1776 !important;
          }

          .classroom-art {
            top: auto !important;
            bottom: 0 !important;
            height: clamp(385px, 48vh, 500px) !important;
            width: 100% !important;
            object-fit: cover !important;
            object-position: bottom center !important;
            z-index: 2 !important;
          }

          .classroom-fade {
            display: block !important;
            top: calc(100dvh - clamp(385px, 48vh, 500px));
            height: clamp(120px, 17vh, 170px);
            background: linear-gradient(
              180deg,
              rgba(251,250,255,1) 0%,
              rgba(251,250,255,.92) 18%,
              rgba(251,250,255,.66) 44%,
              rgba(251,250,255,.22) 74%,
              rgba(251,250,255,0) 100%
            );
          }

          .stats-bar {
            left: clamp(14px, 1vw, 18px) !important;
            right: clamp(14px, 1vw, 18px) !important;
            bottom: clamp(10px, 1.25vh, 14px) !important;
            height: clamp(86px, 10.5vh, 98px) !important;
            border-radius: 0 0 18px 18px !important;
            overflow: hidden !important;
            z-index: 9 !important;
            background: linear-gradient(90deg, rgba(52,30,195,.98), rgba(70,47,221,.99), rgba(50,29,189,.98)) !important;
            box-shadow: 0 -18px 44px rgba(70, 47, 221, .26) !important;
          }

          .stat-item {
            height: 58px !important;
            gap: clamp(14px, 1.25vw, 20px) !important;
          }

          .stat-icon {
            width: clamp(28px, 3.6vh, 34px) !important;
            height: clamp(28px, 3.6vh, 34px) !important;
          }

          .stat-item strong {
            font-size: clamp(23px, 3.1vh, 29px) !important;
          }

          .stat-item span {
            font-size: clamp(12px, 1.45vh, 14px) !important;
          }

          .login-side-inner {
            position: relative !important;
            width: 100% !important;
            max-width: 640px !important;
            height: 100dvh !important;
            min-height: 720px;
            padding: 0 26px !important;
          }

          .language-pill {
            position: absolute !important;
            top: clamp(18px, 2.2vh, 22px) !important;
            right: clamp(18px, 2.4vw, 24px) !important;
            height: 42px !important;
            min-width: 178px !important;
            margin: 0 !important;
            font-size: 14px !important;
            z-index: 20 !important;
            background: rgba(255,255,255,.92) !important;
          }

          .login-card {
            position: absolute !important;
            top: clamp(80px, 9.4vh, 92px) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(498px, calc(100% - 76px)) !important;
            max-height: calc(100dvh - 265px) !important;
            border-radius: 28px !important;
            padding: clamp(16px, 2vh, 22px) 34px clamp(14px, 1.8vh, 18px) !important;
            box-shadow: 0 24px 64px rgba(31, 18, 110, .07) !important;
          }

          .cap-circle {
            width: clamp(58px, 7vh, 72px) !important;
            height: clamp(58px, 7vh, 72px) !important;
            margin-bottom: clamp(8px, 1vh, 11px) !important;
          }

          .card-heading {
            margin-bottom: clamp(14px, 1.9vh, 20px) !important;
          }

          .card-heading h2 {
            font-size: clamp(26px, 3vh, 31px) !important;
            line-height: 1 !important;
          }

          .card-heading p {
            margin-top: 9px !important;
            font-size: clamp(13.5px, 1.65vh, 15px) !important;
          }

          .login-form {
            gap: clamp(10px, 1.35vh, 14px) !important;
          }

          .field-wrap input {
            height: clamp(44px, 5vh, 52px) !important;
            border-radius: 10px !important;
            font-size: 14px !important;
          }

          .form-row {
            margin-top: 3px !important;
            font-size: 13px !important;
          }

          .signin-btn {
            height: clamp(48px, 5.5vh, 56px) !important;
            margin-top: 5px !important;
            border-radius: 10px !important;
            font-size: 19px !important;
          }

          .register-link {
            margin-top: clamp(10px, 1.45vh, 14px) !important;
            font-size: 12.5px !important;
          }

          .login-as {
            margin: clamp(13px, 1.8vh, 18px) 0 clamp(10px, 1.4vh, 14px) !important;
            font-size: 13px !important;
          }

          .role-grid {
            gap: 14px !important;
          }

          .role-card {
            min-height: clamp(88px, 10.8vh, 112px) !important;
            border-radius: 10px !important;
          }

          .trust-banner {
            position: absolute !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            top: calc(100dvh - clamp(176px, 19.8vh, 194px)) !important;
            width: min(508px, calc(100% - 64px)) !important;
            min-height: 76px !important;
            margin: 0 !important;
            padding: 12px 20px !important;
            grid-template-columns: 42px 1fr 138px !important;
            border-radius: 14px !important;
          }

          .trust-banner img {
            width: 132px !important;
          }

          .trust-banner p {
            font-size: 11px !important;
            line-height: 1.4 !important;
          }

          .security-row {
            position: absolute !important;
            left: 50% !important;
            bottom: clamp(18px, 2.1vh, 22px) !important;
            transform: translateX(-50%) !important;
            width: min(508px, calc(100% - 64px)) !important;
            margin: 0 !important;
            gap: 14px !important;
          }

          .security-row strong,
          .security-row span {
            font-size: 10px !important;
          }
        }

        @media (min-width: 1024px) {
          .hero-wave {
            width: clamp(320px, 22.5vw, 430px) !important;
            top: 0 !important;
            right: 0 !important;
            object-fit: contain !important;
            object-position: top right !important;
            transform: none !important;
            animation: none !important;
          }

          .hero-copy {
            top: clamp(92px, 11vh, 118px) !important;
          }

          .ceas-logo-crop {
            width: clamp(88px, 10.8vh, 112px) !important;
            height: clamp(88px, 10.8vh, 112px) !important;
            margin-bottom: 6px !important;
          }

          .ceas-logo-crop img {
            width: clamp(124px, 15vh, 158px) !important;
            height: clamp(124px, 15vh, 158px) !important;
            transform: translateY(-10px) !important;
          }

          .hero-copy h1 {
            font-size: clamp(54px, 4.65vw, 70px) !important;
          }

          .feature-row {
            top: clamp(372px, 42vh, 430px) !important;
            z-index: 8 !important;
          }

          .feature-item {
            position: relative !important;
            padding: 4px 2px 2px !important;
            border-radius: 14px !important;
          }

          .feature-item img {
            mix-blend-mode: multiply !important;
            filter: contrast(1.05) saturate(1.05) !important;
          }

          .classroom-art {
            height: clamp(330px, 40vh, 410px) !important;
            top: auto !important;
            bottom: 0 !important;
          }

          .classroom-fade {
            display: block !important;
            top: calc(100dvh - clamp(330px, 40vh, 410px) - 122px) !important;
            height: clamp(178px, 22vh, 235px) !important;
            background: linear-gradient(
              180deg,
              rgba(251,250,255,1) 0%,
              rgba(251,250,255,.98) 16%,
              rgba(251,250,255,.84) 42%,
              rgba(251,250,255,.44) 70%,
              rgba(251,250,255,0) 100%
            ) !important;
          }

          .login-card {
            top: clamp(92px, 10.6vh, 104px) !important;
            padding: clamp(14px, 1.7vh, 18px) 34px clamp(12px, 1.5vh, 16px) !important;
            max-height: none !important;
          }

          .cap-circle {
            width: clamp(54px, 6.4vh, 66px) !important;
            height: clamp(54px, 6.4vh, 66px) !important;
            margin-bottom: clamp(6px, .8vh, 9px) !important;
          }

          .card-heading {
            margin-bottom: clamp(12px, 1.5vh, 16px) !important;
          }

          .card-heading h2 {
            font-size: clamp(24px, 2.75vh, 29px) !important;
          }

          .card-heading p {
            margin-top: 7px !important;
            font-size: clamp(12px, 1.45vh, 14px) !important;
          }

          .login-form {
            gap: clamp(8px, 1.1vh, 12px) !important;
          }

          .field-wrap input {
            height: clamp(40px, 4.5vh, 48px) !important;
            font-size: 13.5px !important;
          }

          .signin-btn {
            height: clamp(44px, 5vh, 52px) !important;
            margin-top: 4px !important;
            font-size: 18px !important;
          }

          .register-link {
            margin-top: clamp(10px, 1.45vh, 14px) !important;
          }

          .login-as {
            margin: clamp(10px, 1.35vh, 14px) 0 clamp(8px, 1.1vh, 12px) !important;
          }

          .role-card {
            min-height: clamp(78px, 9vh, 96px) !important;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }

          .role-card > svg:first-child {
            width: 22px !important;
            height: 22px !important;
            margin-bottom: 6px !important;
          }

          .role-arrow {
            margin-top: 8px !important;
          }

          .trust-banner {
            top: calc(100dvh - clamp(162px, 18vh, 178px)) !important;
          }
        }

        @media (min-width: 1024px) {
          .hero-copy {
            top: clamp(96px, 11.4vh, 124px) !important;
            z-index: 12 !important;
            width: min(620px, 64%) !important;
          }

          .ceas-logo-crop {
            width: clamp(82px, 9.8vh, 102px) !important;
            height: clamp(82px, 9.8vh, 102px) !important;
            margin-bottom: 4px !important;
          }

          .ceas-logo-crop img {
            width: clamp(116px, 13.8vh, 146px) !important;
            height: clamp(116px, 13.8vh, 146px) !important;
            transform: translateY(-9px) !important;
          }

          .hero-copy h1 {
            font-size: clamp(48px, 4.2vw, 64px) !important;
            line-height: .98 !important;
            white-space: nowrap !important;
          }

          .hero-subtitle {
            display: block !important;
            opacity: 1 !important;
            margin-top: 8px !important;
            font-size: clamp(14px, 1.55vh, 17px) !important;
            line-height: 1.22 !important;
          }

          .hero-pillars {
            opacity: 1 !important;
            margin-top: 11px !important;
            font-size: clamp(13px, 1.45vh, 15px) !important;
          }

          .feature-row {
            top: clamp(386px, 46vh, 444px) !important;
            left: 12.5% !important;
            right: 12.5% !important;
            gap: clamp(28px, 4.8vw, 60px) !important;
            z-index: 14 !important;
          }

          .feature-item {
            min-height: 116px !important;
          }

          .feature-item img {
            width: clamp(52px, 6vh, 62px) !important;
            height: clamp(52px, 6vh, 62px) !important;
            mix-blend-mode: multiply !important;
          }

          .feature-item h3 {
            font-size: clamp(9.5px, 1.1vh, 11px) !important;
            line-height: 1.15 !important;
          }

          .feature-item p {
            font-size: clamp(8px, .95vh, 9.2px) !important;
            line-height: 1.35 !important;
            max-width: 116px !important;
          }

          .classroom-art {
            height: clamp(380px, 45vh, 460px) !important;
            bottom: 0 !important;
            top: auto !important;
            object-position: center top !important;
            z-index: 2 !important;
          }

          .classroom-fade {
            display: block !important;
            z-index: 5 !important;
            top: calc(100dvh - clamp(380px, 45vh, 460px) - 30px) !important;
            height: clamp(115px, 14vh, 145px) !important;
            background: linear-gradient(
              180deg,
              rgba(251,250,255,1) 0%,
              rgba(251,250,255,.88) 24%,
              rgba(251,250,255,.52) 58%,
              rgba(251,250,255,0) 100%
            ) !important;
          }

          .stats-bar {
            z-index: 18 !important;
          }

          .login-card {
            top: clamp(86px, 9.6vh, 96px) !important;
            width: min(500px, calc(100% - 78px)) !important;
            padding: 12px 34px 12px !important;
            border-radius: 14px !important;
            overflow: visible !important;
          }

          .role-card,
          .field-wrap input,
          .signin-btn {
            border-radius: 9px !important;
          }

          .cap-circle {
            width: clamp(46px, 5.8vh, 58px) !important;
            height: clamp(46px, 5.8vh, 58px) !important;
            margin-bottom: 7px !important;
          }

          .cap-circle svg {
            width: 26px !important;
            height: 26px !important;
          }

          .card-heading {
            margin-bottom: 11px !important;
          }

          .card-heading h2 {
            font-size: clamp(22px, 2.5vh, 27px) !important;
          }

          .card-heading p {
            margin-top: 6px !important;
            font-size: 12px !important;
          }

          .login-form {
            gap: 8px !important;
          }

          .field-wrap input {
            height: clamp(38px, 4.3vh, 44px) !important;
          }

          .form-row {
            margin-top: 2px !important;
            font-size: 12.5px !important;
          }

          .signin-btn {
            height: clamp(42px, 4.8vh, 48px) !important;
            margin-top: 4px !important;
            font-size: 17px !important;
          }

          .register-link {
            margin-top: 9px !important;
            font-size: 12px !important;
          }

          .login-as {
            margin: 9px 0 8px !important;
            gap: 12px !important;
          }

          .role-grid {
            gap: 10px !important;
          }

          .role-card {
            min-height: clamp(66px, 7.6vh, 78px) !important;
            padding: 7px 6px !important;
          }

          .role-card > svg:first-child {
            width: 19px !important;
            height: 19px !important;
            margin-bottom: 4px !important;
          }

          .role-card strong {
            font-size: 12px !important;
          }

          .role-card span {
            font-size: 10px !important;
            margin-top: 5px !important;
          }

          .role-arrow {
            width: 18px !important;
            height: 18px !important;
            margin-top: 6px !important;
          }

          .trust-banner {
            top: auto !important;
            bottom: clamp(76px, 8.4vh, 86px) !important;
            min-height: 68px !important;
            padding: 10px 18px !important;
            z-index: 5 !important;
          }

          .trust-banner p {
            font-size: 10.5px !important;
            line-height: 1.32 !important;
          }

          .security-row {
            bottom: clamp(16px, 1.8vh, 20px) !important;
          }
        }

        @media (min-width: 1024px) {
          .login-hero {
            isolation: isolate !important;
          }

          .top-branding {
            top: clamp(18px, 2.4vh, 28px) !important;
            left: clamp(28px, 2.6vw, 44px) !important;
            gap: clamp(18px, 1.6vw, 26px) !important;
          }

          .ncui-logo {
            width: clamp(44px, 5.5vh, 58px) !important;
            height: clamp(44px, 5.5vh, 58px) !important;
          }

          .top-brand-divider {
            height: clamp(44px, 5.8vh, 60px) !important;
          }

          .top-anuvadini-logo {
            width: clamp(160px, 12.5vw, 220px) !important;
          }

          .hero-copy {
            top: clamp(92px, 10.5vh, 120px) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(720px, 78%) !important;
            z-index: 16 !important;
          }

          .ceas-logo-crop {
            width: clamp(120px, 14vh, 158px) !important;
            height: clamp(68px, 8vh, 92px) !important;
            overflow: visible !important;
            border-radius: 0 !important;
          }

          .ceas-logo-crop img {
            width: clamp(120px, 14vh, 158px) !important;
            height: auto !important;
            transform: none !important;
            object-fit: contain !important;
          }

          .hero-copy h1 {
            font-size: clamp(52px, 4.25vw, 68px) !important;
            line-height: .96 !important;
            text-align: center !important;
            white-space: nowrap !important;
          }

          .hero-subtitle {
            font-size: clamp(13px, 1.5vh, 16px) !important;
            line-height: 1.18 !important;
          }

          .hero-pillars {
            margin-top: 9px !important;
            font-size: clamp(12px, 1.35vh, 14px) !important;
          }

          .classroom-art {
            height: clamp(455px, 54vh, 560px) !important;
            bottom: 0 !important;
            top: auto !important;
            object-fit: cover !important;
            object-position: center top !important;
            z-index: 2 !important;
          }

          .classroom-fade {
            display: block !important;
            z-index: 6 !important;
            top: calc(100dvh - clamp(455px, 54vh, 560px) - 6px) !important;
            height: clamp(155px, 19vh, 205px) !important;
            background: linear-gradient(
              180deg,
              rgba(251,250,255,1) 0%,
              rgba(251,250,255,.96) 18%,
              rgba(251,250,255,.74) 46%,
              rgba(251,250,255,.32) 72%,
              rgba(251,250,255,0) 100%
            ) !important;
          }

          .feature-row {
            top: calc(100dvh - clamp(455px, 54vh, 560px) + 34px) !important;
            left: 12% !important;
            right: 12% !important;
            gap: clamp(32px, 5vw, 68px) !important;
            z-index: 17 !important;
            align-items: start !important;
          }

          .feature-item {
            min-height: 108px !important;
            padding: 0 !important;
            text-shadow: 0 1px 8px rgba(255,255,255,.75) !important;
          }

          .feature-item img {
            width: clamp(50px, 5.8vh, 60px) !important;
            height: clamp(50px, 5.8vh, 60px) !important;
            margin-bottom: 7px !important;
            mix-blend-mode: multiply !important;
          }

          .feature-item h3 {
            font-size: clamp(9.5px, 1.08vh, 10.8px) !important;
            line-height: 1.15 !important;
          }

          .feature-item p {
            font-size: clamp(7.8px, .88vh, 8.8px) !important;
            line-height: 1.32 !important;
            max-width: 112px !important;
            margin-top: 6px !important;
          }

          .stats-bar {
            height: clamp(82px, 9.2vh, 92px) !important;
            bottom: clamp(8px, 1vh, 12px) !important;
            z-index: 22 !important;
          }

          .stat-item {
            height: 54px !important;
          }

          .stat-item strong {
            font-size: clamp(22px, 2.6vh, 26px) !important;
          }

          .stat-item span {
            font-size: clamp(11px, 1.25vh, 13px) !important;
          }
        }

        /* Keep emblem and title separated across all responsive overrides */
        .hero-copy .ceas-logo-crop {
          margin-bottom: 14px !important;
        }

        .hero-copy h1 {
          margin-top: 2px !important;
        }

        .language-pill {
          height: 60px !important;
          min-width: 300px !important;
          padding: 0 14px !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 999px !important;
          background: linear-gradient(135deg, #2e2466 0%, #2f1f67 100%) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 30px rgba(26, 12, 69, .35) !important;
          gap: 12px !important;
          color: #9f96c4 !important;
          font-weight: 700 !important;
          font-size: 34px !important;
        }

        .language-brand-icon {
          width: 28px !important;
          height: 28px !important;
          object-fit: contain !important;
          border-radius: 50% !important;
          padding: 4px !important;
          background: rgba(255,255,255,.20) !important;
        }

        .language-select {
          appearance: none !important;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          color: #f2f0ff !important;
          font-size: 23px !important;
          font-weight: 700 !important;
          line-height: 1 !important;
          min-width: 112px !important;
          cursor: pointer !important;
        }

        .language-chevron {
          width: 16px !important;
          height: 16px !important;
          color: #d9d3f5 !important;
          margin-left: -4px !important;
        }

        .language-divider {
          width: 1px !important;
          height: 30px !important;
          background: rgba(255,255,255,.22) !important;
          margin-left: auto !important;
          margin-right: 8px !important;
        }

        .language-action {
          width: 30px !important;
          height: 30px !important;
          border-radius: 50% !important;
          background: rgba(255,255,255,.20) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #ece8ff !important;
        }

        .language-action svg {
          width: 16px !important;
          height: 16px !important;
        }

      `}</style>
    </div>
    </LazyMotion>
  );
}
