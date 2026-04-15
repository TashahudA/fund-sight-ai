import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook — fires once                            */
/* ------------------------------------------------------------------ */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function RevealSection({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(40px)",
      transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
      ...style,
    }}>{children}</div>
  );
}

/* ------------------------------------------------------------------ */
/*  Smooth scroll                                                      */
/* ------------------------------------------------------------------ */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
const faqItems = [
  { q: "What types of SMSFs can Auditron audit?", a: "Any SMSF — accumulation, pension, or hybrid. Auditron checks compliance across all 12 SIS Act areas regardless of fund complexity." },
  { q: "How accurate is the AI analysis?", a: "Auditron cites specific dollar amounts and document references for every finding. It focuses on material compliance risks — the same issues that trigger ATO contravention reports." },
  { q: "Is Auditron a replacement for a registered auditor?", a: "No. Auditron produces a draft compliance assessment for review. The registered auditor reviews, adjusts, and signs off. This saves time, not replaces judgment." },
  { q: "Is my client data secure?", a: "All data encrypted in transit and at rest. Documents stored in Australia. Each auditor's data is completely isolated." },
  { q: "Can I export audit reports?", a: "Yes. Download a formatted PDF compliance report with findings, RFIs, and draft opinion." },
];

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div>
      {faqItems.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <button onClick={() => setOpenIndex(isOpen ? null : i)} className="w-full flex items-center justify-between py-6 text-left">
              <span style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "15px", color: "#111111", letterSpacing: "-0.01em" }}>{item.q}</span>
              <div className="ml-4 shrink-0" style={{ transition: "transform 0.3s ease", transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", color: "#999999" }}>
                <Plus className="h-4 w-4" />
              </div>
            </button>
            <div style={{ maxHeight: isOpen ? "200px" : "0px", opacity: isOpen ? 1 : 0, overflow: "hidden", transition: "max-height 0.4s ease, opacity 0.4s ease" }}>
              <p className="pb-6" style={{ fontSize: "15px", color: "#666666", lineHeight: 1.8 }}>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const howItWorksTabs = [
  { num: "01", tab: "Upload", title: "Drop in the fund pack", desc: "Financial statements, workpapers, bank statements, tax returns — drag them all in. Auditron reads every page.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-21%20at%2012.26.20%20pm.png" },
  { num: "02", tab: "Analyse", title: "AI checks every SIS Act area", desc: "Contribution caps, pension minimums, in-house assets, related party transactions. Checked automatically. Referenced to source.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-21%20at%2012.27.20%20pm.png" },
  { num: "03", tab: "Review", title: "Findings ready for sign-off", desc: "Specific dollar amounts. Exact document references. RFIs already drafted. Your job is to review and sign.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-21%20at%2012.29.00%20pm.png" },
];

const features = [
  { pill: "AI ANALYSIS", title: "Finds what auditors miss", desc: "Auditron reads every figure, every balance, every reference — then cross-checks them across all your documents simultaneously. No skimming. No assumptions.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.13.54%20pm.png", imgSide: "right" as const },
  { pill: "RFIs", title: "RFIs written like a senior auditor", desc: "Every RFI names the exact document, figure, and transaction that needs clarification. The actual questions your client needs to answer.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-21%20at%2012.23.30%20pm.png", imgSide: "left" as const },
  { pill: "RISK FLAGS", title: "The risks hiding in plain sight", desc: "Sundry debtor balances that could be disguised loans. Interest-free related party transactions. In-house assets hiding in receivables. Material risks, not paperwork gaps.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%204.04.42%20pm.png", imgSide: "right" as const },
  { pill: "AUDIT OPINION", title: "Sign-off ready. Not just a summary.", desc: "Every audit produces an opinion — unqualified, qualified, or adverse — with detailed reasoning citing specific compliance areas and document references.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-21%20at%2012.24.12%20pm.png", imgSide: "left" as const },
];

const pricingFeatures = [
  "AI compliance analysis across 12 SIS Act areas",
  "Specific findings with dollar amounts and references",
  "Auto-generated RFIs for unresolved items",
  "Draft audit opinion with reasoning",
  "Unlimited document uploads per audit",
  "Results in minutes, not hours",
];

const navLinks = [
  { label: "How It Works", id: "how-it-works" },
  { label: "Features", id: "features" },
  { label: "Pricing", id: "pricing" },
  { label: "FAQ", id: "faq" },
];

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                  */
/* ------------------------------------------------------------------ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [videoRotate, setVideoRotate] = useState(6);
  const [activeTab, setActiveTab] = useState(0);
  const [tabProgress, setTabProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState(false);
  const [formSending, setFormSending] = useState(false);

  const tabTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scroll handler: nav pill + video tilt
  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 80);
      const t = Math.min(window.scrollY / 400, 1);
      setVideoRotate(6 * (1 - t));
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Tab auto-advance timer
  const startTabTimer = useCallback((fromTab: number) => {
    if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setTabProgress(0);

    const progressInterval = setInterval(() => {
      setTabProgress(prev => {
        if (prev >= 100) return 100;
        return prev + (100 / (4000 / 50)); // 50ms intervals over 4s
      });
    }, 50);
    progressRef.current = progressInterval;

    tabTimerRef.current = setTimeout(() => {
      clearInterval(progressInterval);
      const next = (fromTab + 1) % 3;
      setContentVisible(false);
      setTimeout(() => {
        setActiveTab(next);
        setContentVisible(true);
        startTabTimer(next);
      }, 150);
    }, 4000);
  }, []);

  useEffect(() => {
    startTabTimer(0);
    return () => {
      if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabClick = useCallback((index: number) => {
    if (index === activeTab) return;
    setContentVisible(false);
    setTimeout(() => {
      setActiveTab(index);
      setContentVisible(true);
      startTabTimer(index);
    }, 150);
  }, [activeTab, startTabTimer]);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  }, []);

  const currentStep = howItWorksTabs[activeTab];

  return (
    <div className="min-h-screen" style={{ background: "#ffffff", overflow: "hidden" }}>

      {/* ==== NAVBAR — FLOATING PILL ==== */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex justify-center"
        style={{
          padding: scrolled ? "10px 16px 0" : "0",
          transition: "padding 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          style={{
            maxWidth: scrolled ? "780px" : "100%",
            width: "100%",
            background: scrolled ? "rgba(255,255,255,0.88)" : "transparent",
            backdropFilter: scrolled ? "blur(16px)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
            borderRadius: scrolled ? "100px" : "0",
            border: scrolled ? "1px solid #ebebeb" : "1px solid transparent",
            boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.07)" : "none",
            transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
            padding: scrolled ? "0 24px" : "0 32px",
          }}
        >
          <div className="flex h-14 items-center justify-between">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "18px", color: "#111111", textDecoration: "none", cursor: "pointer", letterSpacing: "-0.02em" }}
            >
              Auditron
            </a>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="nav-link-hover"
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 500, color: "#888888", padding: "6px 12px", position: "relative" }}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login" className="nav-link-hover" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 500, color: "#888888", position: "relative", padding: "6px 0" }}>
                Login
              </Link>
              <button
                onClick={() => scrollTo("contact")}
                style={{
                  fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 600,
                  background: "#111111", color: "#ffffff", border: "none", borderRadius: "100px",
                  padding: "8px 20px", cursor: "pointer", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                Book a Demo
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ==== HERO ==== */}
      <section className="relative z-10" style={{ minHeight: "100vh", paddingTop: "100px", background: "#ffffff" }}>
        <div className="relative z-10 flex flex-col items-center justify-center px-6" style={{ minHeight: "calc(60vh - 100px)" }}>
          <div className="text-center" style={{ maxWidth: "800px" }}>
            <p className="ai-powered-shimmer" style={{
              fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "14px",
              letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "20px",
              color: "#999999", display: "inline-block",
            }}>
              AI-POWERED
            </p>

            <h1 style={{ lineHeight: 1.0, marginBottom: "20px" }}>
              <span className="hidden md:block" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "76px", color: "#111111", letterSpacing: "-0.03em" }}>
                SMSF <span className="auditing-glow">Auditing</span>
              </span>
              <span className="block md:hidden" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "44px", color: "#111111", letterSpacing: "-0.03em" }}>
                SMSF <span className="auditing-glow">Auditing</span>
              </span>
            </h1>

            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "20px", color: "#333333", marginBottom: "12px" }}>
              Auditron prepares the audit. You review it. You sign it.
            </p>

            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px", color: "#888888", maxWidth: "480px", margin: "0 auto", lineHeight: 1.7 }}>
              Upload your fund documents. Get AI-powered compliance findings, automated RFIs, and audit-ready reports — in 60 SECONDS
            </p>

            <div style={{ marginTop: "36px", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={() => scrollTo("contact")}
                className="btn-hover-lift"
                style={{
                  fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "15px",
                  background: "#111111", color: "#ffffff", border: "none", borderRadius: "8px",
                  height: "48px", padding: "0 32px", cursor: "pointer", transition: "all 0.2s ease",
                }}
              >
                Book a Demo
              </button>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="btn-hover-lift"
                style={{
                  fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "15px",
                  background: "#ffffff", color: "#111111", border: "1px solid #333333", borderRadius: "8px",
                  height: "48px", padding: "0 32px", cursor: "pointer", transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
              >
                See How It Works
              </button>
            </div>
          </div>
        </div>

        {/* VIDEO MOCKUP */}
        <div className="relative z-10 px-6" style={{ marginTop: "56px", paddingBottom: "0" }}>
          <div className="mx-auto" style={{ maxWidth: "1000px" }}>
            <div style={{
              transform: `perspective(1200px) rotateX(${videoRotate}deg)`,
              transformOrigin: "top center",
              transition: "box-shadow 0.4s ease",
              boxShadow: "0 40px 120px rgba(0,0,0,0.16), 0 8px 32px rgba(0,0,0,0.08)",
              borderRadius: "12px",
              overflow: "hidden",
            }}>
              <div style={{
                background: "#1a1a1a", height: "38px", borderRadius: "12px 12px 0 0",
                padding: "0 16px", display: "flex", alignItems: "center", position: "relative",
              }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#febc2e" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28c840" }} />
                </div>
                <div style={{
                  position: "absolute", left: "50%", transform: "translateX(-50%)",
                  background: "#2d2d2d", borderRadius: "6px", width: "240px", height: "22px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "12px", color: "#888888" }}>app.auditron.com.au</span>
                </div>
              </div>
              <div style={{ overflow: "hidden", borderRadius: "0 0 12px 12px" }}>
                <video
                  autoPlay muted loop playsInline controls={false}
                  style={{ display: "block", width: "100%" }}
                  src="https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screen%20Recording%202026-03-19%20at%20101437%20am.mp4"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==== HOW IT WORKS — TAB SWITCHER ==== */}
      <section id="how-it-works" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "1100px" }}>
          <RevealSection className="text-center" style={{ marginBottom: "48px" }}>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "13px", color: "#999999", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
              HOW IT WORKS
            </p>
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#111111", letterSpacing: "-0.02em" }}>
              From upload to opinion in 3 steps
            </h2>
          </RevealSection>

          <RevealSection>
            <div style={{
              background: "#f5f5f5",
              borderRadius: "24px",
              padding: "64px",
              boxShadow: "0 2px 40px rgba(0,0,0,0.06)",
            }}>
              {/* Tab buttons */}
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
                {howItWorksTabs.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => handleTabClick(i)}
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: "14px",
                      background: activeTab === i ? "#111111" : "#ebebeb",
                      color: activeTab === i ? "#ffffff" : "#666666",
                      borderRadius: "100px",
                      padding: "10px 24px",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                    }}
                  >
                    {step.num}&nbsp;&nbsp;{step.tab}
                  </button>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ maxWidth: "200px", margin: "16px auto 0", height: "2px", background: "#dddddd", borderRadius: "1px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  background: "#111111",
                  width: `${tabProgress}%`,
                  transition: "width 50ms linear",
                }} />
              </div>

              {/* Content panel */}
              <div
                style={{
                  marginTop: "48px",
                  display: "flex",
                  gap: "48px",
                  alignItems: "center",
                  opacity: contentVisible ? 1 : 0,
                  transition: "opacity 0.25s ease",
                  flexWrap: "wrap",
                }}
              >
                {/* Left — text */}
                <div style={{ flex: "0 0 40%", minWidth: "260px" }}>
                  <h3 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "32px", color: "#111111", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                    {currentStep.title}
                  </h3>
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px", color: "#666666", lineHeight: 1.75, marginTop: "16px", maxWidth: "360px" }}>
                    {currentStep.desc}
                  </p>
                </div>
                {/* Right — image */}
                <div style={{
                  flex: 1,
                  minWidth: "260px",
                  background: "#f0f0f0",
                  borderRadius: "16px",
                  height: "340px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  padding: "16px",
                }}>
                  <img
                    src={currentStep.img}
                    alt={currentStep.title}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      width: "auto",
                      height: "auto",
                      objectFit: "contain",
                      borderRadius: "10px",
                      display: "block",
                    }}
                  />
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ==== FEATURES ==== */}
      <section id="features" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "1100px" }}>
          <RevealSection className="text-center" style={{ marginBottom: "64px" }}>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "13px", color: "#999999", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
              FEATURES
            </p>
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#111111", letterSpacing: "-0.02em" }}>
              Built for how auditors actually work
            </h2>
          </RevealSection>

          {features.map((feat, i) => {
            const imgLeft = feat.imgSide === "left";
            return (
              <RevealSection key={i}>
                <div
                  className={`flex flex-col ${imgLeft ? "md:flex-row-reverse" : "md:flex-row"} items-center`}
                  style={{ gap: "48px", paddingTop: i === 0 ? "0" : "100px" }}
                >
                  {/* Text column — 40% */}
                  <div style={{ flex: "0 0 40%", minWidth: "240px" }}>
                    <span style={{
                      fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "12px",
                      color: "#666666", background: "#f0f0f0", borderRadius: "100px",
                      padding: "4px 14px", display: "inline-block", marginBottom: "14px",
                    }}>
                      {feat.pill}
                    </span>
                    <h3 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "32px", color: "#111111", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: "16px" }}>
                      {feat.title}
                    </h3>
                    <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px", color: "#666666", lineHeight: 1.75, maxWidth: "380px" }}>
                      {feat.desc}
                    </p>
                  </div>
                  {/* Image column — 60% */}
                  <div style={{ flex: "0 0 60%", minWidth: "280px", width: "100%" }}>
                    <div className="feature-img-card" style={{
                      borderRadius: "16px", overflow: "hidden",
                      boxShadow: "0 16px 56px rgba(0,0,0,0.12)",
                      transition: "all 0.3s ease",
                    }}>
                      <img src={feat.img} alt={feat.title} className="w-full" loading="lazy" style={{ objectFit: "contain", display: "block", width: "100%" }} />
                    </div>
                  </div>
                </div>
              </RevealSection>
            );
          })}
        </div>
      </section>

      {/* ==== PRICING ==== */}
      <section id="pricing" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "680px" }}>
          <RevealSection className="text-center" style={{ marginBottom: "64px" }}>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "13px", color: "#999999", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
              PRICING
            </p>
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#111111", letterSpacing: "-0.02em" }}>
              Simple pricing. No surprises.
            </h2>
          </RevealSection>
          <RevealSection>
            <div className="text-center" style={{
              background: "#111111", borderRadius: "24px", padding: "64px", position: "relative",
              boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
              maxWidth: "680px", margin: "0 auto",
            }}>
              <div>
                <span style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "80px", color: "#ffffff", letterSpacing: "-0.03em" }}>$29</span>
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "18px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>per audit</p>
              </div>
              <ul className="mt-12 space-y-5 text-left">
                {pricingFeatures.map((feat, i) => (
                  <li key={i} className="flex items-start gap-3" style={{ fontSize: "15px", color: "rgba(255,255,255,0.7)" }}>
                    <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#ffffff" }} strokeWidth={2.5} />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                className="w-full mt-12 btn-hover-lift"
                style={{ height: "48px", borderRadius: "8px", fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "15px", background: "#ffffff", color: "#111111", border: "none", cursor: "pointer", transition: "all 0.2s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                onClick={() => scrollTo("contact")}
              >
                Book a Demo
              </button>
              <p className="mt-5" style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>
                Volume pricing available for firms processing 20+ audits per month.
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ==== FAQ ==== */}
      <section id="faq" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "680px" }}>
          <RevealSection className="text-center" style={{ marginBottom: "64px" }}>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "13px", color: "#999999", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
              FAQ
            </p>
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#111111", letterSpacing: "-0.02em" }}>
              Questions
            </h2>
          </RevealSection>
          <RevealSection>
            <FAQAccordion />
          </RevealSection>
        </div>
      </section>

      {/* ==== CONTACT / BOOK A DEMO ==== */}
      <section id="contact" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "520px" }}>
          <RevealSection className="text-center" style={{ marginBottom: "48px" }}>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "13px", color: "#999999", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
              CONTACT
            </p>
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#111111", letterSpacing: "-0.02em" }}>
              Book a Demo
            </h2>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "18px", color: "#888888", marginTop: "16px" }}>
              We'll walk you through Auditron with your own fund docs.
            </p>
          </RevealSection>

          <RevealSection>
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" required className="contact-input" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" required className="contact-input" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Firm Name</label>
                <input type="text" className="contact-input" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Audits per month</label>
                <select
                  className="contact-input"
                  style={{ ...inputStyle, color: "#888888", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center" }}
                  defaultValue=""
                >
                  <option value="" disabled>Select...</option>
                  <option value="1-10">1–10</option>
                  <option value="10-50">10–50</option>
                  <option value="50-100">50–100</option>
                  <option value="100+">100+</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn-hover-lift"
                style={{
                  fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "16px",
                  background: "#111111", color: "#ffffff", border: "none", borderRadius: "8px",
                  height: "52px", cursor: "pointer", transition: "all 0.2s ease", width: "100%",
                }}
              >
                Send Request
              </button>
              {formSubmitted && (
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "15px", color: "#22c55e", textAlign: "center", marginTop: "8px" }}>
                  Thanks — we'll be in touch within 24 hours.
                </p>
              )}
            </form>
          </RevealSection>
        </div>
      </section>

      {/* ==== FOOTER ==== */}
      <footer style={{ background: "#0a0a0a", borderTop: "1px solid #1a1a1a", padding: "48px 32px" }}>
        <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-6" style={{ maxWidth: "1100px" }}>
          <div className="flex flex-col items-center md:items-start gap-1">
            <span style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "16px", color: "#ffffff" }}>Auditron</span>
            <span style={{ fontSize: "13px", color: "#555555" }}>© 2026 Auditron. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <button key={link.id} onClick={() => scrollTo(link.id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: "#555555", padding: "4px 0", transition: "color 0.2s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#999999"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#555555"; }}
              >
                {link.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "13px", color: "#555555" }}>Built in Melbourne</span>
        </div>
      </footer>

      {/* ---- CSS ---- */}
      <style>{`
        @keyframes auditingGlow {
          0%, 100% { text-shadow: 0 0 0px rgba(0,0,0,0); }
          50% { text-shadow: 0 0 60px rgba(0,0,0,0.07); }
        }
        .auditing-glow { animation: auditingGlow 4s ease-in-out infinite; }

        @keyframes shimmerSweep {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .ai-powered-shimmer {
          background: linear-gradient(90deg, #999999 0%, #cccccc 50%, #999999 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerSweep 2.5s linear infinite;
        }

        .nav-link-hover { position: relative; transition: color 0.2s ease; }
        .nav-link-hover::after {
          content: '';
          position: absolute; bottom: -2px; left: 0; width: 100%; height: 1px;
          background: #111111; transform: scaleX(0); transform-origin: left;
          transition: transform 0.2s ease;
        }
        .nav-link-hover:hover::after { transform: scaleX(1); }
        .nav-link-hover:hover { color: #111111 !important; }

        .btn-hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .btn-hover-lift:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.12); }

        .feature-img-card:hover { transform: translateY(-4px); box-shadow: 0 32px 80px rgba(0,0,0,0.14); }

        .contact-input:focus {
          border-color: #111111 !important;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.06) !important;
          outline: none;
        }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Open Sans', sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  color: "#333333",
  marginBottom: "6px",
  display: "block",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "'Open Sans', sans-serif",
  fontWeight: 400,
  fontSize: "15px",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "14px 16px",
  width: "100%",
  background: "#ffffff",
  color: "#111111",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  outline: "none",
};
