import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook — fires once                            */
/* ------------------------------------------------------------------ */
function useScrollReveal(threshold = 0.1) {
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
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
        ...style,
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
        transition: `opacity 0.8s ease-out ${index * 150}ms, transform 0.8s ease-out ${index * 150}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SlideIn({ children, direction = "right", className = "", style = {} }: { children: React.ReactNode; direction?: "left" | "right"; className?: string; style?: React.CSSProperties }) {
  const { ref, visible } = useScrollReveal();
  const x = direction === "right" ? "60px" : "-60px";
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : `translateX(${x})`,
        transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Smooth scroll                                                      */
/* ------------------------------------------------------------------ */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/*  FAQ Accordion                                                      */
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
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between py-6 text-left"
            >
              <span style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "15px", color: "#111111", letterSpacing: "-0.01em" }}>{item.q}</span>
              <div
                className="ml-4 shrink-0"
                style={{
                  transition: "transform 0.3s ease",
                  transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                  color: "#999999",
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
                transition: "max-height 0.4s ease, opacity 0.4s ease",
              }}
            >
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
const howItWorks = [
  { step: "01", title: "Upload", desc: "Drag and drop your fund pack. Financial statements, workpapers, bank statements — Auditron reads them all." },
  { step: "02", title: "Analyse", desc: "AI checks compliance across 12 SIS Act areas. Contribution caps, pension minimums, in-house assets, related party transactions." },
  { step: "03", title: "Review", desc: "Get structured findings with specific dollar amounts and document references. RFIs auto-generated for unresolved items." },
];

const features = [
  {
    title: "Reads your documents, not just filenames",
    desc: "Auditron uses native PDF reading to extract real figures from financial statements, general ledgers, and workpapers. It cross-references numbers across documents — just like a senior auditor would.",
    img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.13.54%20pm.png",
    imgSide: "right" as const,
  },
  {
    title: "RFIs that matter",
    desc: "No generic checklist items. Every RFI names the exact document, figure, or transaction that needs clarification. The same questions a 15-year auditor would send to the accountant.",
    img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.12.44%20pm.png",
    imgSide: "left" as const,
  },
  {
    title: "Catches what others miss",
    desc: "Sundry debtor balances that could be disguised loans. Interest-free related party transactions. In-house assets hiding in receivables. Auditron flags the material risks, not the paperwork gaps.",
    img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%204.04.42%20pm.png",
    imgSide: "right" as const,
  },
  {
    title: "Draft opinions with full reasoning",
    desc: "Every audit produces an opinion — unqualified, qualified, or adverse — with detailed reasoning citing specific compliance areas and document references.",
    img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.15.51%20pm.png",
    imgSide: "left" as const,
  },
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

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#ffffff", overflow: "hidden" }}>

      {/* ---- Background atmosphere orbs ---- */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div style={{
          position: "absolute", top: "-5%", left: "25%", width: "800px", height: "800px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          animation: "glowDrift1 30s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "60%", right: "15%", width: "600px", height: "600px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          animation: "glowDrift2 30s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "10%", width: "700px", height: "700px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          animation: "glowDrift1 25s ease-in-out infinite reverse",
        }} />
      </div>

      {/* ---- Subtle noise overlay ---- */}
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden="true" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: 0.03,
        mixBlendMode: "multiply",
      }} />

      {/* ==== NAV ==== */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: scrolled ? "rgba(255,255,255,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "1px solid transparent",
          transition: "all 0.4s ease",
        }}
      >
        <div className="flex h-14 items-center justify-between mx-auto" style={{ paddingLeft: "32px", paddingRight: "32px", maxWidth: "1200px" }}>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="auditron-brand"
            style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "20px", color: "#111111", textDecoration: "none", cursor: "pointer", letterSpacing: "-0.02em" }}
          >
            Auditron
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="nav-link-hover text-sm font-medium bg-transparent border-none cursor-pointer"
                style={{ color: "#888888", position: "relative", padding: "4px 0" }}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="nav-link-hover text-sm font-medium" style={{ color: "#888888", position: "relative", padding: "4px 0" }}>
              Login
            </Link>
            <Button size="sm" className="btn-hover-lift" asChild>
              <a href="mailto:hello@auditron.com.au">Book a Demo</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* ==== HERO + VIDEO ==== */}
      <section className="relative z-10" style={{ minHeight: "100vh", paddingTop: "80px" }}>
        {/* Hero glow — large radial behind headline */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true" style={{ top: "-10%" }}>
          <div style={{
            width: "1000px", height: "1000px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,0,0,0.06) 0%, transparent 60%)",
            animation: "heroDrift 20s ease-in-out infinite",
          }} />
        </div>

        {/* Hero text content — positioned in upper portion */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6" style={{ minHeight: "calc(65vh - 80px)" }}>
          <div className="text-center" style={{ maxWidth: "800px" }}>
            <RevealSection>
              {/* Line 1: AI-Powered */}
              <p style={{
                fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "25px",
                color: "#999999", letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: "20px",
              }}>
                AI-Powered
              </p>

              {/* Line 2: SMSF Auditing */}
              <h1 style={{ lineHeight: 1.05 }}>
                <span className="hidden md:block" style={{
                  fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "76px", color: "#111111",
                  letterSpacing: "-0.03em",
                }}>
                  SMSF <span className="auditing-glow">Auditing</span>
                </span>
                <span className="block md:hidden" style={{
                  fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "44px", color: "#111111",
                  letterSpacing: "-0.03em",
                }}>
                  SMSF <span className="auditing-glow">Auditing</span>
                </span>
              </h1>

              {/* Subheading */}
              <p className="mt-6" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "22px", color: "#888888" }}>
                SMSF compliance in{" "}
                <span style={{
                  fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "#999999",
                  fontSize: "26px",
                  textShadow: "0 0 40px rgba(0,0,0,0.12), 0 0 80px rgba(0,0,0,0.06)",
                }}>minutes</span>
                , not hours.
              </p>

              {/* Description */}
              <p className="mt-6 mx-auto" style={{
                fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px",
                color: "#999999", maxWidth: "540px", lineHeight: 1.8,
              }}>
                Upload your fund documents. Get AI-powered compliance findings, automated RFIs, and audit-ready reports - in 60 SECONDS
              </p>

              {/* Buttons */}
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button size="lg" className="btn-hover-lift" asChild>
                  <a href="mailto:hello@auditron.com.au">Book a Demo</a>
                </Button>
                <button
                  onClick={() => scrollTo("how-it-works")}
                  className="btn-hover-lift inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6"
                  style={{ border: "1px solid #dddddd", background: "transparent", color: "#111111", transition: "all 0.3s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f9f9f9"; e.currentTarget.style.borderColor = "#cccccc"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#dddddd"; }}
                >
                  See How It Works
                </button>
              </div>
            </RevealSection>
          </div>
        </div>

        {/* Video — peeks from bottom of hero viewport */}
        <div className="relative z-10 px-6" style={{ marginTop: "40px", paddingBottom: "80px" }}>
          {/* Glow behind video */}
          <div className="pointer-events-none absolute left-1/2 bottom-0" aria-hidden="true" style={{
            transform: "translateX(-50%)",
            width: "80%", height: "300px",
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.08) 0%, transparent 70%)",
            filter: "blur(40px)",
          }} />
          <div className="mx-auto flex justify-center" style={{ maxWidth: "1100px" }}>
            <div className="video-container" style={{
              borderRadius: "16px",
              boxShadow: "0 25px 80px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
              overflow: "hidden",
              display: "inline-block",
              transform: "perspective(1200px) rotateX(2deg)",
              transition: "transform 0.5s ease, box-shadow 0.5s ease",
            }}>
              <video
                autoPlay muted loop playsInline controls={false}
                style={{ display: "block", width: "auto", height: "auto", maxWidth: "100%", borderRadius: "0" }}
                src="https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screen%20Recording%202026-03-19%20at%20101437%20am.mp4"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==== HOW IT WORKS — Dark section ==== */}
      <section id="how-it-works" className="relative z-10" style={{ background: "#111111", padding: "140px 24px" }}>
        {/* Section glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div style={{
            width: "800px", height: "600px", borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }} />
        </div>
        <div className="mx-auto relative z-10" style={{ maxWidth: "1100px" }}>
          <RevealSection className="text-center mb-20">
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#ffffff", letterSpacing: "-0.02em" }}>
              From upload to opinion in 3 steps
            </h2>
          </RevealSection>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, i) => (
              <StaggerChild key={i} index={i}>
                <div
                  className="relative overflow-hidden card-hover-dark"
                  style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "16px",
                    padding: "48px 40px", transition: "all 0.3s ease", cursor: "default",
                  }}
                >
                  <span style={{
                    position: "absolute", top: "12px", right: "16px",
                    fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "100px",
                    lineHeight: 1, color: "rgba(255,255,255,0.04)", pointerEvents: "none", userSelect: "none",
                  }}>
                    {item.step}
                  </span>
                  <h3 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "22px", color: "#ffffff", letterSpacing: "-0.01em" }}>
                    {item.title}
                  </h3>
                  <p className="mt-4" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
                    {item.desc}
                  </p>
                </div>
              </StaggerChild>
            ))}
          </div>
        </div>
      </section>

      {/* ==== FEATURES — Alternating layout ==== */}
      <section id="features" className="relative z-10" style={{ background: "#ffffff" }}>
        <div className="mx-auto" style={{ maxWidth: "1100px", padding: "0 24px" }}>
          {features.map((feat, i) => {
            const imgLeft = feat.imgSide === "left";
            return (
              <div
                key={i}
                className={`flex flex-col ${imgLeft ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 md:gap-20`}
                style={{ padding: "140px 0" }}
              >
                {/* Text */}
                <RevealSection className="flex-1" style={{ maxWidth: "440px" }}>
                  <h3 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "30px", color: "#111111", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                    {feat.title}
                  </h3>
                  <p className="mt-5" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px", color: "#666666", lineHeight: 1.8 }}>
                    {feat.desc}
                  </p>
                </RevealSection>

                {/* Image */}
                <SlideIn direction={feat.imgSide} className="flex-1" style={{ maxWidth: "560px", width: "100%" }}>
                  <div className="feature-img-card" style={{
                    borderRadius: "16px", border: "1px solid rgba(0,0,0,0.06)",
                    padding: "12px",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
                    transition: "all 0.3s ease",
                    background: "#fafafa",
                  }}>
                    <img
                      src={feat.img} alt={feat.title}
                      className="w-full" loading="lazy"
                      style={{ objectFit: "contain", borderRadius: "10px" }}
                    />
                  </div>
                </SlideIn>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==== PRICING — Dark section ==== */}
      <section id="pricing" className="relative z-10" style={{ background: "#111111", padding: "140px 24px" }}>
        {/* Pricing glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div style={{
            width: "600px", height: "600px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)",
            animation: "heroGlow 8s ease-in-out infinite",
          }} />
        </div>
        <div className="mx-auto relative z-10" style={{ maxWidth: "560px" }}>
          <RevealSection className="text-center mb-16">
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#ffffff", letterSpacing: "-0.02em" }}>
              Simple pricing
            </h2>
            <p className="mt-4" style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
              No subscriptions. No per-user fees. Pay per audit.
            </p>
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
                  className="w-full mt-12 h-12 rounded-lg text-sm font-semibold btn-hover-lift"
                  style={{ background: "#ffffff", color: "#111111", border: "none", cursor: "pointer", transition: "all 0.3s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                  onClick={() => window.location.href = "mailto:hello@auditron.com.au"}
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
      </section>

      {/* ==== FAQ ==== */}
      <section id="faq" className="relative z-10" style={{ background: "#ffffff", padding: "140px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "680px" }}>
          <RevealSection className="text-center mb-16">
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#111111", letterSpacing: "-0.02em" }}>
              Frequently asked
            </h2>
          </RevealSection>
          <RevealSection>
            <FAQAccordion />
          </RevealSection>
        </div>
      </section>

      {/* ==== BOTTOM CTA ==== */}
      <section className="relative z-10" style={{ background: "#fafafa", padding: "140px 24px" }}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div style={{
            width: "700px", height: "700px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,0,0,0.05) 0%, transparent 60%)",
            animation: "heroGlow 8s ease-in-out infinite",
          }} />
        </div>
        <div className="mx-auto text-center relative z-10" style={{ maxWidth: "680px" }}>
          <RevealSection>
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "44px", color: "#111111", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Ready to audit smarter?
            </h2>
            <p className="mt-5" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "18px", color: "#888888", lineHeight: 1.8 }}>
              Join SMSF auditors saving hours per fund.
            </p>
            <div className="mt-10">
              <Button size="lg" className="btn-hover-lift" asChild>
                <a href="mailto:hello@auditron.com.au">Book a Demo</a>
              </Button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ==== FOOTER ==== */}
      <footer className="relative z-10" style={{ background: "#ffffff", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "56px 32px" }}>
        <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-6" style={{ maxWidth: "1100px" }}>
          <div className="flex flex-col items-center md:items-start gap-1">
            <span style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "16px", color: "#111111", letterSpacing: "-0.02em" }}>Auditron</span>
            <span style={{ fontSize: "13px", color: "#999999" }}>© 2026 Auditron. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-8">
            {["Product", "Pricing", "Contact", "Privacy", "Terms"].map((label) => (
              <button
                key={label}
                className="nav-link-hover text-sm bg-transparent border-none cursor-pointer"
                style={{ color: "#888888", position: "relative", padding: "4px 0" }}
                onClick={() => {
                  if (label === "Pricing") scrollTo("pricing");
                  else if (label === "Product") scrollTo("features");
                  else if (label === "Contact") window.location.href = "mailto:hello@auditron.com.au";
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "13px", color: "#999999" }}>Built in Melbourne</span>
        </div>
      </footer>

      {/* ---- CSS Keyframes & Micro-interactions ---- */}
      <style>{`
        @keyframes glowDrift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(5%, 8%); }
        }
        @keyframes glowDrift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-8%, 5%); }
        }
        @keyframes heroDrift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(3%, -2%); }
          50% { transform: translate(-2%, 4%); }
          75% { transform: translate(-4%, -1%); }
        }
        @keyframes heroGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes auditingGlow {
          0%, 100% { text-shadow: 0 0 40px rgba(0,0,0,0.0); }
          50% { text-shadow: 0 0 80px rgba(0,0,0,0.08), 0 0 120px rgba(0,0,0,0.04); }
        }
        .auditing-glow {
          animation: auditingGlow 4s ease-in-out infinite;
        }

        /* Brand shimmer */
        @keyframes brandShimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .auditron-brand {
          animation: brandShimmer 6s ease-in-out infinite;
        }

        /* Pricing rotating border */
        @keyframes pricingBorderSpin {
          0% { background: conic-gradient(from 0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.18), rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03)); }
          25% { background: conic-gradient(from 90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.18), rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03)); }
          50% { background: conic-gradient(from 180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.18), rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03)); }
          75% { background: conic-gradient(from 270deg, rgba(255,255,255,0.03), rgba(255,255,255,0.18), rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03)); }
          100% { background: conic-gradient(from 360deg, rgba(255,255,255,0.03), rgba(255,255,255,0.18), rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03)); }
        }
        .pricing-border-wrap {
          position: relative;
          border-radius: 17px;
          padding: 1px;
          background: conic-gradient(from 0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.18), rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03));
          animation: pricingBorderSpin 8s linear infinite;
          transform: scale(1.02);
        }

        /* Nav link animated underline */
        .nav-link-hover {
          position: relative;
          transition: color 0.3s ease;
        }
        .nav-link-hover::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 1px;
          background: #111111;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.3s ease;
        }
        .nav-link-hover:hover::after {
          transform: scaleX(1);
          transform-origin: left;
        }
        .nav-link-hover:hover {
          color: #111111 !important;
        }

        /* Button hover lift */
        .btn-hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .btn-hover-lift:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }

        /* Dark card hover */
        .card-hover-dark:hover {
          border-color: #444444 !important;
          transform: translateY(-6px) !important;
          box-shadow: 0 16px 50px rgba(0,0,0,0.4) !important;
        }

        /* Feature image card hover */
        .feature-img-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 60px rgba(0,0,0,0.1);
          border-color: rgba(0,0,0,0.1) !important;
        }

        /* Video container hover */
        .video-container:hover {
          transform: perspective(1200px) rotateX(0deg) scale(1.01) !important;
          box-shadow: 0 35px 100px -15px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05) !important;
        }
      `}</style>
    </div>
  );
}
