import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Award,
  BarChart3,
  Bot,
  BookOpen,
  Brain,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileBadge,
  FileText,
  FolderOpen,
  GraduationCap,
  Languages,
  MapPin,
  MessageCircle,
  MonitorPlay,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';

const navItems = ['Home', 'Courses', 'AI Tools', 'Live Classes', 'Assessments', 'Resources', 'About Us'];

const trustItems = [
  { icon: ShieldCheck, label: 'Government', detail: 'Initiative', color: '#f97316' },
  { icon: ShieldCheck, label: 'Secure &', detail: 'Reliable', color: '#16803a' },
  { icon: Bot, label: 'AI', detail: 'Powered', color: '#6750e8' },
  { icon: MonitorPlay, label: 'Mobile', detail: 'First', color: '#2584d6' },
];

const stats = [
  { icon: Users, value: '100K+', label: 'Active Learners', color: '#16803a' },
  { icon: BookOpen, value: '500+', label: 'Courses Available', color: '#f15a24' },
  { icon: Award, value: '50K+', label: 'Certificates Issued', color: '#15803d' },
  { icon: GraduationCap, value: '1K+', label: 'Trainers & Experts', color: '#4f46e5' },
  { icon: Users, value: '25+', label: 'Cooperative Partners', color: '#f59e0b' },
  { icon: ShieldCheck, value: '100%', label: 'Secure Platform', color: '#16803a' },
];

const features = [
  { icon: Bot, title: 'AI Tutor', copy: 'Get instant answers, explanations and personalized guidance.', color: '#16a34a' },
  { icon: FileText, title: 'AI Notes', copy: 'Generate smart notes from lessons in one click.', color: '#4f46e5' },
  { icon: Brain, title: 'Flashcards', copy: 'AI-generated flashcards to help you revise better.', color: '#ec4899' },
  { icon: ClipboardCheck, title: 'Assessments', copy: 'Take quizzes, tests and track performance.', color: '#f97316' },
  { icon: MonitorPlay, title: 'Live Classes', copy: 'Interactive live sessions with experts via Zoom/Webex.', color: '#7c3aed' },
  { icon: FileBadge, title: 'Certificates', copy: 'Earn verified certificates with QR code verification.', color: '#0d9488' },
  { icon: BarChart3, title: 'Analytics', copy: 'Track your progress with advanced analytics and reports.', color: '#2584d6' },
  { icon: FolderOpen, title: 'Media Library', copy: 'Access videos, PDFs, audio and learning resources.', color: '#f59e0b' },
];

const assistantTools = [
  { icon: Search, title: 'Smart Search', copy: 'Find anything instantly' },
  { icon: FileText, title: 'Summarize', copy: 'Get key points quickly' },
  { icon: BookOpen, title: 'Generate Notes', copy: 'Create notes in seconds' },
  { icon: ClipboardCheck, title: 'Practice Quiz', copy: 'Test your knowledge' },
];

const impactStats = [
  ['1L+', 'Learners Empowered'],
  ['28+', 'States & UTs Reached'],
  ['10K+', 'Cooperative Societies'],
  ['95%', 'Learner Satisfaction'],
];

const journeySteps = [
  { icon: CalendarCheck, title: 'Register', copy: 'Create your account in just a few steps' },
  { icon: Search, title: 'Explore', copy: 'Browse courses and choose what you love' },
  { icon: BookOpen, title: 'Enroll', copy: 'Enroll in the course that interests you' },
  { icon: GraduationCap, title: 'Learn', copy: 'Access content and learn at your pace' },
  { icon: ClipboardCheck, title: 'Assess', copy: 'Take tests and track progress' },
  { icon: Award, title: 'Get Certified', copy: 'Earn certificates and achieve more' },
];

const dashboards = [
  { title: 'Student Dashboard', stats: ['Courses 8', 'Progress 78%', 'Time 48h 30m'], bars: [34, 52, 48, 78, 64] },
  { title: 'Trainer Dashboard', stats: ['Students 1,248', 'Courses 24', 'Tests 16'], bars: [62, 44, 75, 58, 86] },
  { title: 'Admin Dashboard', stats: ['Users 10L+', 'Active 12,430', 'Rate 85%'], bars: [48, 80, 56, 92, 70] },
];

const testimonials = [
  ['Priya Sharma', 'Student', 'CEAS-LMS has transformed the way I learn. The AI Tutor and live classes are amazing.'],
  ['Ramesh Verma', 'Trainer', 'An excellent platform to train and engage learners across cooperative societies.'],
  ['Anita Patel', 'Cooperative Member', 'The courses are practical, easy to understand and highly useful for our work.'],
];

const stateRows = [
  ['Uttar Pradesh', '12,345+'],
  ['Maharashtra', '10,234+'],
  ['Tamil Nadu', '8,765+'],
  ['Karnataka', '7,654+'],
  ['Rajasthan', '6,543+'],
];

const certificates = [
  { name: 'Pratham Sharma', course: 'Digital Learning Excellence' },
  { name: 'Lakshaya Tyagi', course: 'Cooperative Leadership' },
  { name: 'Santosh Kumar Thakur', course: 'Cooperative Management' },
];

export default function LandingPage() {
  const [activeCertificate, setActiveCertificate] = useState(0);
  const showPreviousCertificate = () => {
    setActiveCertificate((current) => (current - 1 + certificates.length) % certificates.length);
  };
  const showNextCertificate = () => {
    setActiveCertificate((current) => (current + 1) % certificates.length);
  };
  const visibleCertificates = [-1, 0, 1].map((offset) => ({
    ...certificates[(activeCertificate + offset + certificates.length) % certificates.length],
    slot: offset === 0 ? 'main' : offset < 0 ? 'side left-side' : 'side right-side',
  }));

  return (
    <main className="ceas-landing">
      <nav className="ceas-nav" aria-label="Main navigation">
        <a href="/" className="ceas-gov-brand" aria-label="Government of India Ministry of Cooperation">
          <img src="/logo.jpg" alt="" />
          <span>
            Government of India
            <strong>Ministry of Cooperation</strong>
          </span>
        </a>

        <a href="/" className="ceas-product-brand" aria-label="CEAS-LMS home">
          <img src="/mca_logo.png" alt="" />
          <span>
            CEAS-LMS
            <strong>Learn - Grow - Cooperate</strong>
          </span>
        </a>

        <div className="ceas-nav-links">
          {navItems.map((item) => (
            <a key={item} className={item === 'Home' ? 'active' : ''} href={item === 'Home' ? '/' : '#features'}>
              {item}
            </a>
          ))}
        </div>

        <div className="ceas-actions">
          <button className="ceas-language" aria-label="Change language">
            <Languages size={15} />
          </button>
          <a className="ceas-login" href="/login">
            Login
          </a>
          <a className="ceas-get-started" href="/login">
            Get Started
          </a>
        </div>
      </nav>

      <section className="ceas-hero" aria-labelledby="ceas-hero-title">
        <div className="ceas-hero-copy reveal">
          <div className="ceas-pill">
            <Sparkles size={14} />
            AI-Powered Learning for a New India
          </div>

          <h1 id="ceas-hero-title">
            Empowering <span>Bharat</span>
            <br />
            Through Intelligent
            <br />
            <strong>Cooperative Learning</strong>
          </h1>

          <p>
            CEAS-LMS is India's most advanced digital learning platform for cooperative education, capacity building,
            certification and lifelong learning for all.
          </p>

          <div className="ceas-hero-buttons">
            <a className="ceas-primary-btn" href="/login">
              Start Learning Now
              <ChevronRight size={17} />
            </a>
            <a className="ceas-secondary-btn" href="#features">
              Explore Courses
              <ChevronRight size={17} />
            </a>
          </div>

          <div className="ceas-trust-row" aria-label="Platform highlights">
            {trustItems.map(({ icon: Icon, label, detail, color }) => (
              <div className="ceas-trust-card" key={`${label}-${detail}`}>
                <span style={{ color }}>
                  <Icon size={17} />
                </span>
                <b>{label}</b>
                <small>{detail}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="ceas-hero-visual" aria-hidden="true">
          <img className="ceas-hero-image" src="/hero.png" alt="" />

          <div className="ceas-float-card ceas-ai-card float-a">
            <div className="ceas-card-title">
              <span>
                <Bot size={15} />
              </span>
              <div>
                <b>AI Tutor</b>
                <small>Online</small>
              </div>
            </div>
            <p>Hello! I'm your AI learning assistant. How can I help you today?</p>
            <div className="ceas-chat-input">Ask Anything...</div>
          </div>

          <div className="ceas-float-card ceas-progress-card float-b">
            <b>Learning Progress</b>
            <div className="ceas-progress-ring">
              <span>78%</span>
            </div>
            <small>Course Progress</small>
          </div>

          <div className="ceas-float-card ceas-live-card float-c">
            <div className="ceas-card-title">
              <span className="ceas-avatar" />
              <div>
                <b>Live Class</b>
                <small>AI & Digital Transformation</small>
              </div>
            </div>
            <button>Join Live</button>
          </div>

          <div className="ceas-float-card ceas-cert-card float-d">
            <span>
              <Trophy size={21} />
            </span>
            <div>
              <b>Certificate Earned</b>
              <small>Data Analytics</small>
              <em>Issued on 15 May 2026</em>
            </div>
          </div>
        </div>

        <div className="ceas-stats-strip" aria-label="CEAS LMS statistics">
          {stats.map(({ icon: Icon, value, label, color }, index) => (
            <div className="ceas-stat" key={label} style={{ animationDelay: `${index * 70}ms` }}>
              <Icon size={28} style={{ color }} />
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="ceas-section ceas-features">
        <span className="section-kicker">Everything You Need to Succeed</span>
        <h2>Powerful Features for Modern Learners</h2>

        <div className="feature-grid">
          {features.map(({ icon: Icon, title, copy, color }, index) => (
            <article className="feature-card reveal" key={title} style={{ animationDelay: `${index * 55}ms` }}>
              <span className="feature-icon" style={{ color, background: `${color}17` }}>
                <Icon size={25} />
              </span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <a href="/login">
                Explore
                <ChevronRight size={14} />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="ceas-wide-card assistant-band">
        <img src="/robots.png" alt="" />
        <div className="assistant-copy">
          <h2>Your Personal<br />AI Learning Assistant</h2>
          <ul>
            <li>Ask doubts and get instant answers</li>
            <li>Generate notes, summaries & explanations</li>
            <li>Smart search across all learning resources</li>
            <li>Personalized learning recommendations</li>
          </ul>
          <a className="ceas-primary-btn compact" href="/login">
            Try AI Tutor Now
            <ChevronRight size={16} />
          </a>
        </div>
        <div className="assistant-chat">
          <div className="mini-head">
            <Bot size={16} />
            <div>
              <b>AI Tutor</b>
              <small>Online</small>
            </div>
          </div>
          <div className="bubble right">Explain the concept of Cooperative Society...</div>
          <div className="bubble">
            A cooperative society is an autonomous association of persons united voluntarily to meet their economic,
            social and cultural needs.
          </div>
          <div className="mini-input">
            Type your question...
            <span>
              <ChevronRight size={13} />
            </span>
          </div>
        </div>
        <div className="assistant-tools">
          {assistantTools.map(({ icon: Icon, title, copy }) => (
            <div className="tool-row" key={title}>
              <Icon size={18} />
              <div>
                <b>{title}</b>
                <small>{copy}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ceas-wide-card impact-band">
        <img src="/map.png" alt="" />
        <div className="impact-content">
          <h2>Making an Impact Across Bharat</h2>
          <div className="impact-stats">
            {impactStats.map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ceas-section journey-section">
        <h2>Your Learning Journey</h2>
        <div className="journey-track">
          {journeySteps.map(({ icon: Icon, title, copy }, index) => (
            <article className="journey-step" key={title}>
              <span>
                <Icon size={18} />
              </span>
              <h3>{title}</h3>
              <p>{copy}</p>
              {index < journeySteps.length - 1 && <i />}
            </article>
          ))}
        </div>
      </section>

      <section className="ceas-section dashboards-section">
        <div className="dashboard-copy">
          <span className="section-kicker left">Role Based Dashboards</span>
          <h2>Real-Time Insights.<br />Smarter Decisions.</h2>
          <p>
            Powerful dashboards for students, trainers and administrators to track progress and make data-driven
            decisions.
          </p>
          <a className="ceas-primary-btn compact" href="/login">
            View Dashboards
            <ChevronRight size={16} />
          </a>
        </div>

        {dashboards.map((dashboard, index) => (
          <article className="dashboard-card" key={dashboard.title}>
            <h3>{dashboard.title}</h3>
            <div className="dashboard-metrics">
              {dashboard.stats.map((item) => {
                const [label, ...value] = item.split(' ');
                return (
                  <div key={item}>
                    <small>{label}</small>
                    <strong>{value.join(' ')}</strong>
                  </div>
                );
              })}
            </div>
            <div className={`mini-chart chart-${index}`}>
              {dashboard.bars.map((height, barIndex) => (
                <span key={`${dashboard.title}-${barIndex}`} style={{ '--bar-height': `${height}%` } as CSSProperties} />
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="ceas-section certificate-section">
        <div className="certificate-copy">
          <span className="section-kicker left">Certify Your Achievements</span>
          <h2>Recognized Certificates.<br />Trusted Across India.</h2>
          <p>Earn industry-recognized certificates with QR verification from Government of India.</p>
          <a className="ceas-primary-btn compact" href="/login">
            View All Certificates
            <ChevronRight size={16} />
          </a>
        </div>
        <button className="carousel-btn left-btn" type="button" aria-label="Previous certificate" onClick={showPreviousCertificate}>
          <ChevronLeft size={22} />
        </button>
        <div className="certificate-stack">
          {visibleCertificates.map(({ name, course, slot }) => (
            <div className={`certificate-card ${slot}`} key={`${name}-${slot}`}>
              <img src="/mca_logo.png" alt="" />
              <span>Certificate of Completion</span>
              <h3>{name}</h3>
              <p>Successfully completed {course}</p>
              <b>QR Verified</b>
            </div>
          ))}
        </div>
        <button className="carousel-btn right-btn" type="button" aria-label="Next certificate" onClick={showNextCertificate}>
          <ChevronRight size={22} />
        </button>
      </section>

      <section className="ceas-section testimonial-section">
        <h2>What Our Learners Say</h2>
        <div className="testimonial-grid">
          {testimonials.map(([name, role, quote]) => (
            <article className="testimonial-card" key={name}>
              <div className="person-dot">{name.charAt(0)}</div>
              <h3>{name}</h3>
              <small>{role}</small>
              <p>"{quote}"</p>
              <div className="stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={14} fill="currentColor" />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ceas-wide-card reach-band">
        <img src="/cardmap.png" alt="" />
        <div className="reach-copy">
          <h2>Reaching Every Corner<br />of New India</h2>
          <p>
            CEAS-LMS is empowering learners from every state and union territory through cooperative education and
            digital learning.
          </p>
          <a className="ceas-primary-btn compact" href="/login">
            Explore Your State
            <ChevronRight size={16} />
          </a>
          <div className="reach-numbers">
            <span><b>28</b>States</span>
            <span><b>8</b>UTs</span>
            <span><b>700+</b>Districts</span>
            <span><b>1L+</b>Learners</span>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div>
          <span>
            <Trophy size={28} />
          </span>
          <div>
            <h2>Be a Part of India's Learning Revolution</h2>
            <p>Join CEAS-LMS today and contribute towards a stronger, self-reliant cooperative Bharat.</p>
          </div>
        </div>
        <a href="/login">
          Get Started Now
          <ChevronRight size={17} />
        </a>
        <a className="outline" href="#features">
          Contact Us
        </a>
      </section>

      <footer className="ceas-footer">
        <div className="footer-brand">
          <img src="/mca_logo.png" alt="" />
          <b>CEAS-LMS</b>
          <span>Learn - Grow - Cooperate</span>
        </div>
        <div>
          <b>Quick Links</b>
          <a href="#features">Courses</a>
          <a href="#features">AI Tools</a>
          <a href="#features">Live Classes</a>
        </div>
        <div>
          <b>Resources</b>
          <a href="#features">Help Center</a>
          <a href="#features">User Guide</a>
          <a href="#features">FAQ's</a>
        </div>
        <div>
          <b>Support</b>
          <span>support@ceas-lms.gov.in</span>
          <span>1800-123-4567</span>
          <span>Mon - Fri, 9:00 AM - 6:00 PM</span>
        </div>
        <div className="footer-gov">
          <img src="/logo.jpg" alt="" />
          <b>Government of India</b>
          <span>Ministry of Cooperation</span>
        </div>
      </footer>

      <style>{`
        .ceas-landing {
          min-height: 100vh;
          background: #fffaf3;
          color: #152033;
          font-family: Poppins, ui-sans-serif, system-ui, sans-serif;
          overflow-x: hidden;
        }

        .ceas-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          display: grid;
          grid-template-columns: 220px 210px 1fr auto;
          align-items: center;
          gap: 18px;
          min-height: 66px;
          padding: 8px 30px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 1px 0 rgba(20, 30, 24, 0.08);
          backdrop-filter: blur(18px);
        }

        .ceas-gov-brand,
        .ceas-product-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          color: #172033;
          text-decoration: none;
        }

        .ceas-gov-brand img {
          width: 34px;
          height: 34px;
          object-fit: cover;
          border-radius: 5px;
        }

        .ceas-product-brand img {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }

        .ceas-gov-brand span,
        .ceas-product-brand span {
          display: grid;
          gap: 1px;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.22;
        }

        .ceas-product-brand span {
          font-size: 18px;
          color: #16803a;
          letter-spacing: 0;
        }

        .ceas-gov-brand strong,
        .ceas-product-brand strong {
          display: block;
          font-size: 9px;
          font-weight: 800;
          color: #263346;
        }

        .ceas-nav-links {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 25px;
          min-width: 0;
        }

        .ceas-nav-links a {
          position: relative;
          padding: 12px 0;
          color: #172033;
          font-size: 10px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
          transition: color 180ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .ceas-nav-links a:hover {
          color: #f97316;
          transform: translateY(-1px);
        }

        .ceas-nav-links a.active {
          color: #f97316;
        }

        .ceas-nav-links a.active::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 2px;
          width: 32px;
          height: 3px;
          border-radius: 999px;
          background: #f97316;
          transform: translateX(-50%);
        }

        .ceas-actions {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .ceas-language,
        .ceas-login,
        .ceas-get-started {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 34px;
          border-radius: 7px;
          border: 1px solid #cfd8dc;
          background: #fff;
          color: #102318;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
        }

        .ceas-language {
          width: 36px;
          border-color: transparent;
          color: #f97316;
        }

        .ceas-login {
          min-width: 68px;
        }

        .ceas-get-started {
          min-width: 88px;
          border-color: #0f4a2b;
          background: #0f4a2b;
          color: #fff;
        }

        .ceas-login:hover,
        .ceas-get-started:hover,
        .ceas-language:hover,
        .ceas-primary-btn:hover,
        .ceas-secondary-btn:hover,
        .feature-card:hover,
        .dashboard-card:hover,
        .testimonial-card:hover {
          transform: translateY(-2px);
        }

        .ceas-hero {
          position: relative;
          min-height: 666px;
          padding: 72px 48px 112px 72px;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 24%, rgba(255,255,255,0.44) 42%, rgba(255,255,255,0.03) 100%),
            radial-gradient(circle at 25% 28%, rgba(255, 184, 77, 0.18), transparent 34%),
            #fff7e8;
        }

        .ceas-hero::after {
          content: '';
          position: absolute;
          inset: auto 0 0;
          height: 110px;
          background: linear-gradient(180deg, rgba(255,255,255,0), #fff);
          pointer-events: none;
        }

        .ceas-hero-copy {
          position: relative;
          z-index: 3;
          max-width: 610px;
        }

        .ceas-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          margin-bottom: 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(245, 158, 11, 0.18);
          box-shadow: 0 10px 28px rgba(151, 93, 18, 0.08);
          color: #233326;
          font-size: 10px;
          font-weight: 900;
        }

        .ceas-pill svg {
          color: #f97316;
        }

        .ceas-hero h1 {
          margin: 0;
          color: #121926;
          font-size: clamp(40px, 3.5vw, 56px);
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1.04;
        }

        .ceas-hero h1 span {
          color: #f97316;
        }

        .ceas-hero h1 strong {
          color: #155c2f;
          font-weight: 900;
        }

        .ceas-hero-copy p {
          max-width: 545px;
          margin: 15px 0 20px;
          color: #344357;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.8;
        }

        .ceas-hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 22px;
        }

        .ceas-primary-btn,
        .ceas-secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 46px;
          padding: 0 19px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 15px 32px rgba(18, 78, 43, 0.16);
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
        }

        .ceas-primary-btn {
          background: #0f5a31;
          color: #fff;
        }

        .ceas-secondary-btn {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(15, 90, 49, 0.18);
          color: #0f5a31;
        }

        .ceas-primary-btn.compact {
          height: 38px;
          width: max-content;
          min-width: 145px;
        }

        .ceas-trust-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          max-width: 470px;
        }

        .ceas-trust-card {
          display: grid;
          grid-template-columns: 25px 1fr;
          align-items: center;
          min-height: 46px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 8px 24px rgba(54, 54, 54, 0.11);
          animation: popIn 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .ceas-trust-card span {
          grid-row: span 2;
          display: inline-flex;
          align-items: center;
        }

        .ceas-trust-card b,
        .ceas-trust-card small {
          display: block;
          color: #273142;
          font-size: 10px;
          font-weight: 900;
          line-height: 1.05;
        }

        .ceas-trust-card small {
          color: #526070;
          font-weight: 800;
        }

        .ceas-hero-visual {
          position: absolute;
          inset: 0 0 60px 0;
          z-index: 1;
          overflow: hidden;
        }

        .ceas-hero-image {
          position: absolute;
          right: 0;
          bottom: 0;
          width: min(75vw, 1380px);
          height: 100%;
          object-fit: cover;
          object-position: right bottom;
          filter: saturate(1.04);
          animation: slowPan 14s ease-in-out infinite alternate;
        }

        .ceas-float-card {
          position: absolute;
          z-index: 4;
          border: 1px solid rgba(220, 228, 224, 0.86);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 18px 50px rgba(37, 54, 42, 0.18);
          backdrop-filter: blur(15px);
        }

        .float-a { animation: floatCard 5.8s ease-in-out infinite; }
        .float-b { animation: floatCard 6.4s ease-in-out infinite 500ms; }
        .float-c { animation: floatCard 6s ease-in-out infinite 900ms; }
        .float-d { animation: floatCard 6.8s ease-in-out infinite 250ms; }

        .ceas-ai-card {
          left: 40%;
          top: 38%;
          width: 160px;
          min-height: 142px;
          padding: 12px;
          border-radius: 10px;
        }

        .ceas-card-title {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .ceas-card-title span:first-child {
          display: inline-flex;
          width: 29px;
          height: 29px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #dff8ea;
          color: #0f7c3f;
        }

        .ceas-card-title b,
        .ceas-progress-card b,
        .ceas-cert-card b {
          display: block;
          font-size: 11px;
          font-weight: 900;
          color: #142235;
        }

        .ceas-card-title small {
          display: block;
          color: #16803a;
          font-size: 8px;
          font-weight: 900;
        }

        .ceas-ai-card p {
          margin: 12px 0 12px;
          color: #344357;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.45;
        }

        .ceas-chat-input {
          display: flex;
          align-items: center;
          height: 31px;
          padding: 0 10px;
          border-radius: 999px;
          background: #f4f7f8;
          color: #8a95a3;
          font-size: 9px;
          font-weight: 900;
        }

        .ceas-progress-card {
          left: 52%;
          top: 45.5%;
          width: 126px;
          min-height: 146px;
          padding: 13px 10px 10px;
          border-radius: 8px;
          text-align: center;
        }

        .ceas-progress-ring {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          margin: 14px auto 8px;
          border-radius: 50%;
          background: conic-gradient(#19a75a 0 78%, #e5eef0 78% 100%);
          animation: ringPulse 2.8s ease-in-out infinite;
        }

        .ceas-progress-ring span {
          display: grid;
          place-items: center;
          width: 55px;
          height: 55px;
          border-radius: 50%;
          background: #fff;
          color: #0f5a31;
          font-size: 20px;
          font-weight: 900;
        }

        .ceas-progress-card small {
          color: #647386;
          font-size: 9px;
          font-weight: 900;
        }

        .ceas-live-card {
          right: 7.4%;
          top: 43%;
          width: 184px;
          padding: 12px;
          border-radius: 8px;
        }

        .ceas-avatar {
          background:
            linear-gradient(#fff8ed, #fff8ed) padding-box,
            linear-gradient(135deg, #f97316, #16a34a) border-box;
          border: 2px solid transparent;
        }

        .ceas-live-card button {
          margin-top: 11px;
          width: 84px;
          height: 29px;
          border: 0;
          border-radius: 5px;
          background: #0f5a31;
          color: #fff;
          font-size: 9px;
          font-weight: 900;
        }

        .ceas-cert-card {
          right: 17.2%;
          bottom: 12.5%;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 198px;
          padding: 11px 12px;
          border-radius: 8px;
          background: rgba(42, 119, 201, 0.93);
          color: #fff;
        }

        .ceas-cert-card > span {
          display: inline-grid;
          place-items: center;
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #f6b51f;
          color: #154ca0;
        }

        .ceas-cert-card b,
        .ceas-cert-card small,
        .ceas-cert-card em {
          color: #fff;
        }

        .ceas-cert-card small,
        .ceas-cert-card em {
          display: block;
          font-size: 9px;
          font-style: normal;
          font-weight: 900;
          opacity: 0.88;
        }

        .ceas-stats-strip {
          position: absolute;
          left: 48px;
          right: 48px;
          bottom: 26px;
          z-index: 7;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          align-items: center;
          min-height: 72px;
          border: 1px solid rgba(221, 228, 223, 0.86);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 16px 36px rgba(38, 55, 45, 0.15);
          backdrop-filter: blur(18px);
        }

        .ceas-stat {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          min-width: 0;
          min-height: 52px;
          padding: 0 18px;
          border-right: 1px solid #e2e8e4;
          animation: statRise 650ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .ceas-stat:last-child {
          border-right: 0;
        }

        .ceas-stat strong {
          display: block;
          color: #0f5a31;
          font-size: 20px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0;
        }

        .ceas-stat span {
          display: block;
          margin-top: 4px;
          color: #263346;
          font-size: 10px;
          font-weight: 900;
          line-height: 1.2;
        }

        .ceas-section {
          width: min(1780px, calc(100% - 96px));
          margin: 0 auto;
          padding: 32px 0;
        }

        .section-kicker {
          display: block;
          color: #0f6a37;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
        }

        .section-kicker.left {
          text-align: left;
        }

        .ceas-section h2 {
          margin: 5px 0 24px;
          color: #152033;
          font-size: 28px;
          font-weight: 900;
          line-height: 1.18;
          letter-spacing: 0;
          text-align: center;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
          gap: 18px;
        }

        .feature-card,
        .dashboard-card,
        .testimonial-card {
          border: 1px solid rgba(218, 226, 221, 0.9);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 12px 36px rgba(25, 50, 35, 0.08);
          transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease;
        }

        .feature-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 210px;
          padding: 22px 14px;
          text-align: center;
        }

        .feature-card:hover,
        .dashboard-card:hover,
        .testimonial-card:hover {
          box-shadow: 0 18px 50px rgba(25, 50, 35, 0.14);
        }

        .feature-icon {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          border-radius: 15px;
          margin-bottom: 15px;
        }

        .feature-card h3 {
          margin: 0 0 10px;
          color: #152033;
          font-size: 13px;
          font-weight: 900;
        }

        .feature-card p {
          flex: 1;
          margin: 0;
          color: #405066;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.6;
        }

        .feature-card a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 14px;
          color: #0f6a37;
          font-size: 10px;
          font-weight: 900;
          text-decoration: none;
        }

        .ceas-wide-card {
          position: relative;
          width: min(1780px, calc(100% - 96px));
          aspect-ratio: 2166 / 768;
          margin: 0 auto 28px;
          overflow: hidden;
          border-radius: 18px;
          box-shadow: 0 18px 48px rgba(19, 45, 32, 0.14);
          box-sizing: border-box;
        }

        .ceas-wide-card > img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          z-index: 0;
        }

        .assistant-band {
          display: grid;
          grid-template-columns: 0.85fr 0.98fr 0.72fr;
          gap: 22px;
          padding: 30px 38px;
          color: #fff;
          isolation: isolate;
        }

        .assistant-band::after,
        .impact-band::after,
        .reach-band::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(90deg, rgba(2, 45, 29, 0.80) 0%, rgba(5, 54, 36, 0.24) 44%, rgba(3, 36, 25, 0.08) 100%);
        }

        .assistant-copy,
        .assistant-chat,
        .assistant-tools,
        .impact-content,
        .reach-copy,
        .state-list {
          position: relative;
          z-index: 2;
        }

        .assistant-copy {
          align-self: center;
          max-width: 370px;
        }

        .assistant-copy h2,
        .impact-content h2,
        .reach-copy h2,
        .final-cta h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: 0;
        }

        .assistant-copy ul {
          display: grid;
          gap: 8px;
          margin: 18px 0;
          padding: 0;
          list-style: none;
        }

        .assistant-copy li {
          position: relative;
          padding-left: 22px;
          font-size: 10px;
          font-weight: 800;
        }

        .assistant-copy li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #1ec968;
          box-shadow: 0 0 18px rgba(30, 201, 104, 0.8);
        }

        .assistant-chat {
          align-self: center;
          min-height: 214px;
          padding: 18px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.9);
          color: #172033;
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.22);
          opacity: 0.94;
        }

        .mini-head {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 16px;
        }

        .mini-head svg {
          color: #0f7c3f;
        }

        .mini-head b,
        .mini-head small {
          display: block;
          font-size: 11px;
          font-weight: 900;
        }

        .mini-head small {
          color: #16803a;
        }

        .bubble {
          width: 86%;
          margin: 10px 0;
          padding: 10px 13px;
          border-radius: 13px;
          background: #edf4f0;
          color: #425167;
          font-size: 9px;
          font-weight: 700;
          line-height: 1.6;
          animation: chatPop 3.4s ease-in-out infinite;
        }

        .bubble.right {
          margin-left: auto;
          background: #f2ecff;
        }

        .mini-input {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 38px;
          margin-top: 14px;
          padding-left: 15px;
          border-radius: 999px;
          background: #f6f8f9;
          color: #9aa3ad;
          font-size: 9px;
          font-weight: 800;
        }

        .mini-input span {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          margin-right: 3px;
          border-radius: 50%;
          background: #0f6a37;
          color: #fff;
        }

        .assistant-tools {
          align-self: center;
          display: grid;
          gap: 10px;
        }

        .tool-row {
          display: flex;
          gap: 12px;
          align-items: center;
          min-height: 50px;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(18, 90, 48, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          animation: toolGlow 3s ease-in-out infinite;
        }

        .tool-row svg {
          color: #ffd450;
        }

        .tool-row b,
        .tool-row small {
          display: block;
        }

        .tool-row b {
          font-size: 11px;
          font-weight: 900;
        }

        .tool-row small {
          font-size: 9px;
          font-weight: 700;
          opacity: 0.86;
        }

        .impact-band {
          width: min(1600px, calc(100% - 140px));
          aspect-ratio: 2166 / 768;
          color: #fff;
        }

        .impact-band::after {
          background: linear-gradient(90deg, rgba(1, 49, 34, 0.12), rgba(4, 44, 32, 0.26), rgba(4, 46, 33, 0.04));
        }

        .impact-band > img {
          object-fit: cover;
          object-position: center center;
        }

        .impact-content {
          display: grid;
          justify-items: center;
          align-content: center;
          min-height: 100%;
          text-align: center;
          padding-top: 8px;
        }

        .impact-content h2 {
          color: #ffdc75;
          margin-bottom: 20px;
          font-size: 24px;
        }

        .impact-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(120px, 1fr));
          gap: 34px;
          width: min(700px, 72%);
        }

        .impact-stats strong {
          display: block;
          font-size: 30px;
          font-weight: 900;
        }

        .impact-stats span {
          display: block;
          font-size: 10px;
          font-weight: 800;
        }

        .journey-section {
          padding-top: 8px;
        }

        .journey-track {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 18px;
        }

        .journey-step {
          position: relative;
          min-height: 120px;
          padding: 4px 8px 0 48px;
        }

        .journey-step > span {
          position: absolute;
          left: 0;
          top: 0;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #eef8f0;
          color: #0f8f4b;
          box-shadow: 0 0 0 8px rgba(15, 143, 75, 0.06);
        }

        .journey-step h3 {
          margin: 0 0 7px;
          font-size: 13px;
          font-weight: 900;
        }

        .journey-step p {
          margin: 0;
          color: #536274;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.5;
        }

        .journey-step i {
          position: absolute;
          top: 18px;
          right: -21px;
          width: 35px;
          height: 2px;
          background: linear-gradient(90deg, #16803a, #f97316);
          animation: lineMove 1.8s ease-in-out infinite;
        }

        .dashboards-section {
          display: grid;
          grid-template-columns: 1.15fr repeat(3, 1fr);
          gap: 24px;
          align-items: stretch;
          padding: 28px;
          border-radius: 18px;
          background: linear-gradient(90deg, #fff9ec, #fff);
        }

        .dashboard-copy h2,
        .certificate-copy h2 {
          margin: 6px 0 14px;
          text-align: left;
        }

        .dashboard-copy p,
        .certificate-copy p,
        .reach-copy p,
        .final-cta p {
          margin: 0 0 20px;
          color: #405066;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.7;
        }

        .dashboard-card {
          padding: 22px;
        }

        .dashboard-card h3 {
          margin: 0 0 18px;
          font-size: 13px;
          font-weight: 900;
        }

        .dashboard-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .dashboard-metrics small,
        .dashboard-metrics strong {
          display: block;
        }

        .dashboard-metrics small {
          color: #6b7888;
          font-size: 8px;
          font-weight: 800;
        }

        .dashboard-metrics strong {
          margin-top: 4px;
          color: #152033;
          font-size: 15px;
          font-weight: 900;
        }

        .mini-chart {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          height: 82px;
          margin-top: 18px;
          padding: 10px;
          border-radius: 10px;
          background: #f6faf8;
        }

        .mini-chart span {
          flex: 1;
          height: var(--bar-height);
          border-radius: 6px 6px 2px 2px;
          background: linear-gradient(180deg, #24c68a, #4f46e5);
          transform-origin: bottom;
          animation: barGrow 1.1s cubic-bezier(0.22, 1, 0.36, 1) both infinite alternate;
        }

        .chart-1 span { background: linear-gradient(180deg, #20c997, #2563eb); }
        .chart-2 span { background: linear-gradient(180deg, #f59e0b, #16a34a); }

        .certificate-section {
          position: relative;
          display: grid;
          grid-template-columns: 0.8fr 44px 1.7fr 44px;
          gap: 20px;
          align-items: center;
          padding: 28px;
          border-radius: 18px;
          background: linear-gradient(90deg, #fffaf0, #fff);
          border: 1px solid rgba(226, 215, 197, 0.9);
        }

        .carousel-btn {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border: 1px solid #f4c891;
          border-radius: 50%;
          background: #fff;
          color: #bd5d12;
          box-shadow: 0 10px 24px rgba(150, 93, 35, 0.12);
          cursor: pointer;
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, box-shadow 180ms ease;
        }

        .carousel-btn:hover {
          background: #fff7e8;
          box-shadow: 0 14px 30px rgba(150, 93, 35, 0.18);
          transform: translateY(-2px) scale(1.03);
        }

        .certificate-stack {
          display: grid;
          grid-template-columns: 0.8fr 1.18fr 0.8fr;
          align-items: center;
          min-height: 240px;
        }

        .certificate-card {
          display: grid;
          place-items: center;
          min-height: 150px;
          padding: 18px;
          border: 3px double #f4b461;
          border-radius: 8px;
          background: #fffaf0;
          box-shadow: 0 16px 36px rgba(122, 84, 34, 0.14);
          color: #8b5d20;
          font-family: Merriweather, serif;
          font-size: 15px;
          font-weight: 900;
          transform: rotate(-4deg) scale(0.92);
          text-align: center;
          transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, box-shadow 220ms ease;
        }

        .certificate-card.main {
          min-height: 218px;
          z-index: 2;
          padding: 20px;
          transform: none;
          animation: certFloat 4s ease-in-out infinite;
        }

        .certificate-card img {
          width: 38px;
          height: 38px;
          object-fit: contain;
        }

        .certificate-card.main img {
          width: 46px;
          height: 46px;
          object-fit: contain;
        }

        .certificate-card span,
        .certificate-card p,
        .certificate-card b {
          display: block;
          text-align: center;
        }

        .certificate-card span {
          margin-top: 8px;
          color: #6a4a1f;
          font-size: 12px;
        }

        .certificate-card h3 {
          margin: 11px 0 6px;
          color: #182135;
          font-size: 15px;
          line-height: 1.25;
        }

        .certificate-card p {
          margin: 0;
          color: #625246;
          font-size: 9px;
          font-family: Poppins, sans-serif;
          font-weight: 800;
          line-height: 1.45;
        }

        .certificate-card b {
          margin-top: 11px;
          color: #bd5d12;
          font-size: 10px;
          font-family: Poppins, sans-serif;
        }

        .certificate-card.main h3 {
          font-size: 18px;
        }

        .certificate-card.main p {
          font-size: 10px;
        }

        .certificate-card.right-side {
          transform: rotate(4deg) scale(0.92);
        }

        .testimonial-section h2 {
          text-align: left;
        }

        .testimonial-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .testimonial-card {
          position: relative;
          min-height: 170px;
          padding: 24px 24px 18px 74px;
        }

        .person-dot {
          position: absolute;
          left: 24px;
          top: 24px;
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #16803a);
          color: #fff;
          font-size: 16px;
          font-weight: 900;
        }

        .testimonial-card h3,
        .testimonial-card small {
          display: block;
          margin: 0;
        }

        .testimonial-card h3 {
          font-size: 13px;
          font-weight: 900;
        }

        .testimonial-card small {
          color: #6b7888;
          font-size: 9px;
          font-weight: 800;
        }

        .testimonial-card p {
          margin: 18px 0 12px;
          color: #405066;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.6;
        }

        .stars {
          display: flex;
          gap: 4px;
          color: #f59e0b;
        }

        .reach-band {
          display: grid;
          grid-template-columns: 0.8fr 1fr;
          padding: 42px;
          color: #fff;
        }

        .reach-band::after {
          background: linear-gradient(90deg, rgba(2, 51, 36, 0.88) 0%, rgba(5, 54, 36, 0.34) 38%, rgba(3, 36, 25, 0.04) 78%);
        }

        .reach-copy {
          align-self: center;
        }

        .reach-copy h2 {
          color: #fff;
        }

        .reach-copy p,
        .final-cta p {
          color: rgba(255, 255, 255, 0.88);
        }

        .reach-numbers {
          display: grid;
          grid-template-columns: repeat(4, max-content);
          gap: 28px;
          margin-top: 24px;
        }

        .reach-numbers span,
        .reach-numbers b {
          display: block;
        }

        .reach-numbers b {
          font-size: 30px;
          font-weight: 900;
        }

        .reach-numbers span {
          font-size: 11px;
          font-weight: 800;
        }

        .state-list {
          align-self: center;
          justify-self: end;
          width: 360px;
          padding: 24px;
          border-radius: 16px;
          background: rgba(5, 35, 26, 0.55);
          backdrop-filter: blur(12px);
        }

        .state-list h3 {
          margin: 0 0 18px;
          font-size: 13px;
          font-weight: 900;
        }

        .state-row {
          display: grid;
          grid-template-columns: 100px 1fr 70px;
          align-items: center;
          gap: 10px;
          margin: 12px 0;
          font-size: 10px;
          font-weight: 900;
        }

        .state-row i {
          display: block;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg, #f97316 var(--state-width), rgba(255, 255, 255, 0.18) var(--state-width));
          animation: statePulse 2s ease-in-out infinite;
        }

        .final-cta {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 22px;
          width: min(1780px, calc(100% - 96px));
          margin: 0 auto 28px;
          padding: 26px 38px;
          border-radius: 16px;
          background: linear-gradient(135deg, #0b5b32, #0f743f);
          color: #fff;
          box-shadow: 0 18px 48px rgba(16, 84, 46, 0.22);
        }

        .final-cta > div {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .final-cta > div > span {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(255, 213, 74, 0.18);
          color: #ffd54a;
        }

        .final-cta h2 {
          color: #ffd54a;
          font-size: 25px;
        }

        .final-cta p {
          margin: 5px 0 0;
        }

        .final-cta a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          height: 42px;
          min-width: 150px;
          border: 1px solid rgba(255, 255, 255, 0.42);
          border-radius: 8px;
          color: #fff;
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
        }

        .final-cta a.outline {
          background: transparent;
        }

        .ceas-footer {
          display: grid;
          grid-template-columns: 1.3fr repeat(3, 1fr) 1.2fr;
          gap: 34px;
          width: min(1780px, calc(100% - 96px));
          margin: 0 auto;
          padding: 24px 0 36px;
          color: #263346;
        }

        .ceas-footer > div {
          display: grid;
          align-content: start;
          gap: 8px;
          font-size: 10px;
          font-weight: 700;
        }

        .ceas-footer a,
        .ceas-footer span {
          color: #536274;
          text-decoration: none;
        }

        .ceas-footer b {
          color: #152033;
          font-size: 12px;
          font-weight: 900;
        }

        .footer-brand img,
        .footer-gov img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        .footer-gov {
          justify-items: end;
          text-align: right;
        }

        .reveal {
          animation: revealUp 760ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes revealUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes slowPan {
          from { transform: scale(1) translateX(0); }
          to { transform: scale(1.015) translateX(8px); }
        }

        @keyframes floatCard {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes ringPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.045); }
        }

        @keyframes statRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes chatPop {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes toolGlow {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }

        @keyframes lineMove {
          0%, 100% { opacity: 0.45; transform: scaleX(0.72); }
          50% { opacity: 1; transform: scaleX(1); }
        }

        @keyframes barGrow {
          from { transform: scaleY(0.42); opacity: 0.8; }
          to { transform: scaleY(1); opacity: 1; }
        }

        @keyframes certFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes statePulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        @media (max-width: 1280px) {
          .ceas-nav {
            grid-template-columns: 190px 190px 1fr auto;
            gap: 13px;
            padding-inline: 22px;
          }

          .ceas-nav-links {
            gap: 16px;
          }

          .feature-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .assistant-band,
          .dashboards-section {
            grid-template-columns: 1fr 1fr;
          }

          .assistant-tools {
            grid-column: 1 / -1;
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .dashboard-copy {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 1040px) {
          .ceas-nav {
            grid-template-columns: 1fr auto;
          }

          .ceas-product-brand,
          .ceas-nav-links {
            display: none;
          }

          .ceas-hero {
            padding: 48px 24px 230px;
            min-height: auto;
          }

          .ceas-hero-visual {
            position: relative;
            inset: auto;
            height: 520px;
            margin: 22px -24px 0;
          }

          .ceas-hero-image {
            width: 100%;
            height: 100%;
            right: 0;
          }

          .ceas-ai-card { left: 4%; top: 26%; }
          .ceas-progress-card { left: 38%; top: 47%; }
          .ceas-live-card { right: 5%; top: 35%; }
          .ceas-cert-card { right: 8%; bottom: 10%; }

          .ceas-stats-strip {
            left: 24px;
            right: 24px;
            bottom: 26px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .ceas-stat:nth-child(3) {
            border-right: 0;
          }

          .ceas-section,
          .ceas-wide-card,
          .final-cta,
          .ceas-footer {
            width: min(100% - 32px, 760px);
          }

          .journey-track,
          .testimonial-grid,
          .certificate-section,
          .reach-band,
          .final-cta,
          .ceas-footer {
            grid-template-columns: 1fr;
          }

          .journey-step i {
            display: none;
          }

          .assistant-band,
          .dashboards-section {
            grid-template-columns: 1fr;
          }

          .assistant-tools {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .impact-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .state-list,
          .footer-gov {
            justify-self: stretch;
            width: auto;
            text-align: left;
            justify-items: start;
          }
        }

        @media (max-width: 720px) {
          .ceas-nav {
            min-height: 64px;
            padding: 9px 14px;
          }

          .ceas-gov-brand span { font-size: 9px; }
          .ceas-gov-brand strong { font-size: 8px; }
          .ceas-language,
          .ceas-login { display: none; }
          .ceas-get-started { min-width: 88px; height: 34px; font-size: 11px; }

          .ceas-hero {
            padding: 32px 16px 430px;
          }

          .ceas-hero h1 {
            font-size: 36px;
          }

          .ceas-hero-copy p {
            font-size: 13px;
          }

          .ceas-primary-btn,
          .ceas-secondary-btn {
            width: 100%;
            height: 50px;
          }

          .ceas-trust-row,
          .feature-grid,
          .assistant-tools,
          .impact-stats,
          .reach-numbers {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ceas-hero-visual {
            height: 390px;
            margin-inline: -16px;
          }

          .ceas-ai-card,
          .ceas-progress-card,
          .ceas-live-card,
          .ceas-cert-card {
            transform: scale(0.76);
            transform-origin: center;
          }

          .ceas-ai-card { left: -2%; top: 23%; }
          .ceas-progress-card { left: 30%; top: 52%; }
          .ceas-live-card { right: -3%; top: 33%; }
          .ceas-cert-card { right: 0; bottom: 4%; }

          .ceas-stats-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            left: 16px;
            right: 16px;
            bottom: 22px;
          }

          .ceas-stat {
            justify-content: flex-start;
            min-height: 60px;
            padding: 0 12px;
          }

          .ceas-stat,
          .ceas-stat:nth-child(3) {
            border-right: 1px solid #e2e8e4;
          }

          .ceas-stat:nth-child(2n),
          .ceas-stat:last-child {
            border-right: 0;
          }

          .assistant-band,
          .reach-band {
            padding: 26px 20px;
          }

          .certificate-section {
            overflow: hidden;
          }

          .certificate-stack {
            grid-template-columns: 1fr;
          }

          .certificate-card.side {
            display: none;
          }

          .final-cta {
            padding: 24px 20px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 1ms !important;
          }
        }
      `}</style>
    </main>
  );
}
