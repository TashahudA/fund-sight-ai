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
const howItWorksSteps = [
  { num: "01", title: "Upload", desc: "Drag and drop your fund pack. Financial statements, workpapers, bank statements — Auditron reads them all." },
  { num: "02", title: "Analyse", desc: "AI checks compliance across 12 SIS Act areas. Contribution caps, pension minimums, in-house assets, related party transactions." },
  { num: "03", title: "Review", desc: "Get structured findings with specific dollar amounts and document references. RFIs auto-generated for unresolved items." },
];

const features = [
  { title: "Reads your documents, not just filenames", desc: "Auditron uses native PDF reading to extract real figures from financial statements, general ledgers, and workpapers. It cross-references numbers across documents — just like a senior auditor would.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.13.54%20pm.png", imgSide: "right" as const },
  { title: "RFIs that matter", desc: "No generic checklist items. Every RFI names the exact document, figure, or transaction that needs clarification. The same questions a 15-year auditor would send to the accountant.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.12.44%20pm.png", imgSide: "left" as const },
  { title: "Catches what others miss", desc: "Sundry debtor balances that could be disguised loans. Interest-free related party transactions. In-house assets hiding in receivables. Auditron flags the material risks, not the paperwork gaps.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%204.04.42%20pm.png", imgSide: "right" as const },
  { title: "Draft opinions with full reasoning", desc: "Every audit produces an opinion — unqualified, qualified, or adverse — with detailed reasoning citing specific compliance areas and document references.", img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.15.51%20pm.png", imgSide: "left" as const },
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
  const [activeStep, setActiveStep] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const stepRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  // Scroll handler: nav pill + video tilt
  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 80);
      // Video tilt interpolation: 6deg at 0px → 0deg at 400px
      const t = Math.min(window.scrollY / 400, 1);
      setVideoRotate(6 * (1 - t));
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Intersection observer for how-it-works steps
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    stepRefs.forEach((ref, i) => {
      if (!ref.current) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveStep(i); },
        { threshold: 0.5 }
      );
      obs.observe(ref.current);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  }, []);

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
            {/* AI-POWERED label with shimmer */}
            <p className="ai-powered-shimmer" style={{
              fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "14px",
              letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "20px",
              color: "#999999", display: "inline-block",
            }}>
              AI-POWERED
            </p>

            {/* SMSF Auditing */}
            <h1 style={{ lineHeight: 1.0, marginBottom: "20px" }}>
              <span className="hidden md:block" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "76px", color: "#111111", letterSpacing: "-0.03em" }}>
                SMSF <span className="auditing-glow">Auditing</span>
              </span>
              <span className="block md:hidden" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "44px", color: "#111111", letterSpacing: "-0.03em" }}>
                SMSF <span className="auditing-glow">Auditing</span>
              </span>
            </h1>

            {/* Sub-headline */}
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "20px", color: "#333333", marginBottom: "12px" }}>
              Auditron prepares the audit. You review it. You sign it.
            </p>

            {/* Description */}
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px", color: "#888888", maxWidth: "480px", margin: "0 auto", lineHeight: 1.7 }}>
              Upload your fund documents. Get AI-powered compliance findings, automated RFIs, and audit-ready reports — in 60 SECONDS
            </p>

            {/* Buttons */}
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

        {/* VIDEO MOCKUP with browser chrome */}
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
              {/* Browser chrome bar */}
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
              {/* Video */}
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

        {/* Hero bottom gradient */}
        <div style={{ height: "160px", background: "linear-gradient(to bottom, #ffffff, #111111)", position: "relative", zIndex: 1 }} />
      </section>

      {/* ==== HOW IT WORKS — SCROLL-PINNED STICKY ==== */}
      <section id="how-it-works" style={{ background: "#111111", position: "relative" }}>
        <div style={{ paddingTop: "100px", paddingBottom: "0", textAlign: "center" }}>
          <RevealSection>
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#ffffff", letterSpacing: "-0.02em", paddingBottom: "80px" }}>
              From upload to opinion in 3 steps
            </h2>
          </RevealSection>
        </div>

        {/* Scroll-pinned layout */}
        <div style={{ height: "300vh", position: "relative" }}>
          <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", overflow: "hidden" }}>
            {/* LEFT — step indicator */}
            <div className="hidden md:flex" style={{ width: "35%", flexDirection: "column", justifyContent: "center", paddingLeft: "80px", position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "48px", position: "relative" }}>
                {/* Vertical line */}
                <div style={{
                  position: "absolute", left: "7px", top: "8px", bottom: "8px", width: "2px", background: "#222222",
                }}>
                  <div style={{
                    width: "2px", background: "#ffffff",
                    height: `${((activeStep) / 2) * 100}%`,
                    transition: "height 0.4s ease",
                  }} />
                </div>
                {howItWorksSteps.map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "20px", paddingLeft: "24px" }}>
                    <span style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: activeStep === i ? 700 : 400,
                      fontSize: activeStep === i ? "18px" : "16px",
                      color: activeStep === i ? "#ffffff" : "#444444",
                      transition: "all 0.4s ease",
                    }}>
                      {step.num}
                    </span>
                    <span style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: activeStep === i ? 700 : 400,
                      fontSize: activeStep === i ? "18px" : "16px",
                      color: activeStep === i ? "#ffffff" : "#444444",
                      transition: "all 0.4s ease",
                    }}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — scrolling panels */}
            <div style={{ width: "100%", flex: 1, overflowY: "auto", scrollbarWidth: "none" }} className="hide-scrollbar">
              {howItWorksSteps.map((step, i) => (
                <div
                  key={i}
                  ref={stepRefs[i]}
                  style={{
                    height: "100vh", display: "flex", alignItems: "center", padding: "60px",
                  }}
                >
                  <div>
                    {/* Mobile step number */}
                    <span className="block md:hidden" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "14px", color: "#555555", letterSpacing: "0.1em", marginBottom: "12px" }}>
                      STEP {step.num}
                    </span>
                    <h3 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "32px", color: "#ffffff", letterSpacing: "-0.02em" }}>
                      {step.title}
                    </h3>
                    <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px", color: "#aaaaaa", maxWidth: "400px", marginTop: "16px", lineHeight: 1.7 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section bottom gradient */}
        <div style={{ height: "160px", background: "linear-gradient(to bottom, #111111, #ffffff)", position: "relative", zIndex: 1 }} />
      </section>

      {/* ==== FEATURES ==== */}
      <section id="features" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "1100px" }}>
          <RevealSection className="text-center" style={{ marginBottom: "80px" }}>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "14px", color: "#999999", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px" }}>
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
                  className={`flex flex-col ${imgLeft ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 md:gap-20`}
                  style={{ padding: "60px 0" }}
                >
                  <div className="flex-1" style={{ maxWidth: "420px" }}>
                    <h3 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "28px", color: "#111111", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                      {feat.title}
                    </h3>
                    <p className="mt-5" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px", color: "#666666", lineHeight: 1.7, maxWidth: "420px" }}>
                      {feat.desc}
                    </p>
                  </div>
                  <div className="flex-1" style={{ maxWidth: "560px", width: "100%" }}>
                    <div className="feature-img-card" style={{
                      borderRadius: "12px", overflow: "hidden",
                      boxShadow: "0 24px 64px rgba(0,0,0,0.10)",
                      transition: "all 0.3s ease",
                    }}>
                      <img src={feat.img} alt={feat.title} className="w-full" loading="lazy" style={{ objectFit: "contain", display: "block" }} />
                    </div>
                  </div>
                </div>
              </RevealSection>
            );
          })}
        </div>

        {/* Section bottom gradient */}
        <div style={{ height: "160px", background: "linear-gradient(to bottom, #ffffff, #111111)", marginLeft: "-24px", marginRight: "-24px", marginBottom: "-120px" }} />
      </section>

      {/* ==== PRICING ==== */}
      <section id="pricing" style={{ background: "#111111", padding: "120px 24px" }}>
        <div className="mx-auto relative z-10" style={{ maxWidth: "560px" }}>
          <RevealSection className="text-center" style={{ marginBottom: "60px" }}>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "14px", color: "#555555", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px" }}>
              PRICING
            </p>
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#ffffff", letterSpacing: "-0.02em" }}>
              Simple pricing. No surprises.
            </h2>
          </RevealSection>
          <RevealSection>
            <div className="pricing-border-wrap">
              <div className="text-center" style={{
                background: "#1a1a1a", borderRadius: "16px", padding: "64px", position: "relative",
                boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
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
            </div>
          </RevealSection>
        </div>

        {/* Section bottom gradient */}
        <div style={{ height: "160px", background: "linear-gradient(to bottom, #111111, #fafafa)", marginLeft: "-24px", marginRight: "-24px", marginBottom: "-120px" }} />
      </section>

      {/* ==== FAQ ==== */}
      <section id="faq" style={{ background: "#fafafa", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "680px" }}>
          <RevealSection className="text-center" style={{ marginBottom: "60px" }}>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "14px", color: "#999999", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px" }}>
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

        {/* Section bottom gradient */}
        <div style={{ height: "80px", background: "linear-gradient(to bottom, #fafafa, #ffffff)", marginLeft: "-24px", marginRight: "-24px", marginBottom: "-120px" }} />
      </section>

      {/* ==== CONTACT / BOOK A DEMO ==== */}
      <section id="contact" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "520px" }}>
          <RevealSection className="text-center" style={{ marginBottom: "48px" }}>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 500, fontSize: "14px", color: "#999999", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "16px" }}>
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
              <input
                type="text" placeholder="Jane Smith" required
                className="contact-input"
                style={inputStyle}
              />
              <input
                type="email" placeholder="jane@smithauditing.com.au" required
                className="contact-input"
                style={inputStyle}
              />
              <input
                type="text" placeholder="Smith SMSF Auditing"
                className="contact-input"
                style={inputStyle}
              />
              <select
                className="contact-input"
                style={{ ...inputStyle, color: "#888888", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center" }}
                defaultValue=""
              >
                <option value="" disabled>Audits per month</option>
                <option value="1-10">1–10</option>
                <option value="10-50">10–50</option>
                <option value="50-100">50–100</option>
                <option value="100+">100+</option>
              </select>
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

        @keyframes pricingBorderSpin {
          0% { background: conic-gradient(from 0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.18), rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03)); }
          100% { background: conic-gradient(from 360deg, rgba(255,255,255,0.03), rgba(255,255,255,0.18), rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03)); }
        }
        .pricing-border-wrap {
          position: relative;
          border-radius: 17px;
          padding: 1px;
          background: conic-gradient(from 0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.18), rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03));
          animation: pricingBorderSpin 8s linear infinite;
          transform: scale(1.03);
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

        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

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
