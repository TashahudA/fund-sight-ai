import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook for scroll-reveal                       */
/* ------------------------------------------------------------------ */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}
    >
      {children}
    </div>
  );
}

function StaggerChild({ children, index }: { children: React.ReactNode; index: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.6s ease-out ${index * 100}ms, transform 0.6s ease-out ${index * 100}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Accent word component                                              */
/* ------------------------------------------------------------------ */
function AccentWord({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "#999999" }}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Accordion                                                      */
/* ------------------------------------------------------------------ */
const faqItems = [
  { q: "What types of SMSFs can Auditron audit?", a: "Auditron supports all SMSF structures including single-member, multi-member, corporate trustee, and individual trustee funds. Our AI is trained on ATO compliance requirements for all fund types." },
  { q: "How accurate is the AI analysis?", a: "Our AI achieves over 95% accuracy on compliance checks, cross-referencing against current SIS Act requirements, ATO rulings, and APES 110 standards. Every finding includes source references for auditor verification." },
  { q: "Can I export audit reports?", a: "Yes — Auditron generates comprehensive audit reports that can be exported as PDF. Reports include all findings, RFI tracking, and compliance opinions formatted for professional use." },
  { q: "Is my client data secure?", a: "Absolutely. All data is encrypted at rest and in transit. We use enterprise-grade infrastructure with SOC 2 compliance, and your data is never used to train AI models." },
  { q: "How does the RFI workflow work?", a: "When the AI identifies missing information, it automatically generates RFIs categorised by priority. You can track responses, attach documents, and the AI re-evaluates once information is provided." },
];

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      {faqItems.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between py-5 text-left"
            >
              <span className="text-sm font-semibold text-foreground">{item.q}</span>
              <div
                className="ml-4 shrink-0 text-muted-foreground"
                style={{
                  transition: "transform 0.3s ease",
                  transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                }}
              >
                <Plus className="h-4 w-4" />
              </div>
            </button>
            <div
              style={{
                maxHeight: isOpen ? "200px" : "0px",
                opacity: isOpen ? 1 : 0,
                overflow: "hidden",
                transition: "max-height 0.3s ease, opacity 0.3s ease",
              }}
            >
              <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card component with hover                                          */
/* ------------------------------------------------------------------ */
function HoverCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: "12px",
        padding: "32px",
        transition: "all 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#cccccc";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5e5e5";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screenshot placeholder                                             */
/* ------------------------------------------------------------------ */
function ScreenshotPlaceholder() {
  return (
    <div
      style={{
        aspectRatio: "4/3",
        background: "#f4f4f4",
        border: "1px solid #e5e5e5",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ color: "#cccccc", fontSize: "14px" }}>Screenshot</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                  */
/* ------------------------------------------------------------------ */
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const howItWorks = [
    { step: "01", title: "Upload Documents", desc: "Drop your SMSF fund documents — financial statements, member reports, trust deeds — and we handle the rest." },
    { step: "02", title: "AI Analysis", desc: "Our AI cross-references every document against SIS Act requirements, ATO rulings, and compliance standards." },
    { step: "03", title: "Review Findings", desc: "Get a complete compliance report with flagged issues, RFIs, and an audit opinion — ready for your review." },
  ];

  const features = [
    { title: "AI-Powered Findings", desc: "Automated compliance analysis against SIS Act, ATO rulings, and APES standards with source-referenced findings." },
    { title: "Smart RFI Tracking", desc: "Auto-generated requests for information, categorised by priority with full audit trail and response tracking." },
    { title: "Document Management", desc: "Centralised document storage with version control, audit-ready organisation, and instant retrieval." },
    { title: "Audit Opinions", desc: "AI-assisted audit opinion generation based on findings, with full transparency on the reasoning chain." },
  ];

  const pricingFeatures = [
    "Unlimited SMSF audits",
    "AI compliance analysis",
    "Automated RFI generation",
    "Document management",
    "Audit report export",
    "Priority support",
  ];

  return (
    <div className="min-h-screen bg-background" style={{ overflow: "hidden" }}>
      {/* ---- Background glows ---- */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        {/* Hero glow 1 */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "20%",
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
            animation: "glowDrift1 25s ease-in-out infinite",
          }}
        />
        {/* Hero glow 2 */}
        <div
          style={{
            position: "absolute",
            top: "5%",
            right: "10%",
            width: "50%",
            height: "50%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
            animation: "glowDrift2 30s ease-in-out infinite",
          }}
        />
      </div>

      {/* ---- Nav ---- */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: scrolled ? "rgba(255,255,255,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid #f0f0f0" : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div className="container max-w-6xl flex h-14 items-center justify-between">
          <span className="text-base font-bold tracking-tight text-foreground">Auditron</span>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Button size="sm" onClick={() => navigate("/signup")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <section className="relative z-10 pt-32 pb-20">
        <div className="container max-w-6xl text-center">
          <RevealSection>
            {/* Shimmer pill */}
            <div className="inline-flex items-center mb-8">
              <span
                className="relative overflow-hidden rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground"
                style={{ borderColor: "#e5e5e5" }}
              >
                <span className="relative z-10">AI-Powered SMSF Auditing</span>
                <span
                  className="absolute inset-0 z-0"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent)",
                    animation: "shimmer 3s linear infinite",
                  }}
                />
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
              SMSF compliance in<br />
              <AccentWord>minutes</AccentWord>, not hours.
            </h1>

            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload your fund documents. Get AI-powered compliance findings, automated RFIs, and audit-ready reports — in a fraction of the time.
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" onClick={() => navigate("/signup")}>
                Start Free Audit
              </Button>
              <Button size="lg" variant="outline" onClick={() => {
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}>
                See How It Works
              </Button>
            </div>
          </RevealSection>

          {/* Demo video */}
          <RevealSection className="mt-16">
            <div
              className="mx-auto"
              style={{
                maxWidth: "960px",
                borderRadius: "12px",
                border: "1px solid #e5e5e5",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                overflow: "hidden",
                aspectRatio: "16/9",
              }}
            >
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                src="/demo-video.mp4"
              />
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ---- Section divider wave ---- */}
      <div className="h-24 relative z-10" style={{ background: "linear-gradient(180deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)", animation: "waveBand 8s ease-in-out infinite alternate" }} />

      {/* ---- How it works ---- */}
      <section id="how-it-works" className="relative z-10 py-20">
        <div className="container max-w-6xl">
          <RevealSection className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              How it <AccentWord>works</AccentWord>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Three steps from documents to a complete audit report.</p>
          </RevealSection>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((item, i) => (
              <StaggerChild key={i} index={i}>
                <HoverCard>
                  <span className="text-xs font-semibold text-muted-foreground tracking-wider">{item.step}</span>
                  <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </HoverCard>
              </StaggerChild>
            ))}
          </div>
        </div>
      </section>

      <div className="h-24 relative z-10" style={{ background: "linear-gradient(180deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)", animation: "waveBand 8s ease-in-out infinite alternate" }} />

      {/* ---- Features ---- */}
      <section className="relative z-10 py-20">
        <div className="container max-w-6xl">
          <RevealSection className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Built for <AccentWord>auditors</AccentWord>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Every feature designed to reduce manual work and improve audit quality.</p>
          </RevealSection>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feat, i) => (
              <StaggerChild key={i} index={i}>
                <HoverCard>
                  <h3 className="text-base font-semibold text-foreground">{feat.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                  <div className="mt-4">
                    <ScreenshotPlaceholder />
                  </div>
                </HoverCard>
              </StaggerChild>
            ))}
          </div>
        </div>
      </section>

      <div className="h-24 relative z-10" style={{ background: "linear-gradient(180deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)", animation: "waveBand 8s ease-in-out infinite alternate" }} />

      {/* ---- Pricing ---- */}
      <section className="relative z-10 py-20">
        {/* Pricing glow */}
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            style={{
              width: "50%",
              height: "60%",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,0,0,0.04) 0%, transparent 70%)",
              animation: "pricingPulse 6s ease-in-out infinite",
            }}
          />
        </div>
        <div className="container max-w-lg relative z-10">
          <RevealSection className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Simple <AccentWord>pricing</AccentWord>
            </h2>
            <p className="mt-4 text-muted-foreground">One plan. Everything included. No surprises.</p>
          </RevealSection>
          <RevealSection>
            <HoverCard className="text-center">
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Professional</span>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">$49</span>
                <span className="text-muted-foreground text-sm"> / month</span>
              </div>
              <ul className="mt-8 space-y-3 text-left">
                {pricingFeatures.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                    <Check className="h-4 w-4 text-foreground shrink-0" strokeWidth={2.5} />
                    {feat}
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-8" size="lg" onClick={() => navigate("/signup")}>
                Get Started
              </Button>
            </HoverCard>
          </RevealSection>
        </div>
      </section>

      <div className="h-24 relative z-10" style={{ background: "linear-gradient(180deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)", animation: "waveBand 8s ease-in-out infinite alternate" }} />

      {/* ---- FAQ ---- */}
      <section className="relative z-10 py-20">
        <div className="container max-w-2xl">
          <RevealSection className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Frequently <AccentWord>asked</AccentWord>
            </h2>
          </RevealSection>
          <RevealSection>
            <FAQAccordion />
          </RevealSection>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="relative z-10 border-t py-8" style={{ borderColor: "#f0f0f0" }}>
        <div className="container max-w-6xl flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">Auditron</span>
          <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Auditron. All rights reserved.</span>
        </div>
      </footer>

      {/* ---- CSS Keyframes ---- */}
      <style>{`
        @keyframes glowDrift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(5%, 8%); }
        }
        @keyframes glowDrift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-8%, 5%); }
        }
        @keyframes pricingPulse {
          0%, 100% { opacity: 0.02; }
          50% { opacity: 0.06; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes waveBand {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
