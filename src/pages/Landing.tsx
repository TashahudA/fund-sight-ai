import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

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

function RevealSection({ children, className = "", style = {}, delay = 0 }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(50px)",
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s ease-out ${delay}ms`,
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
        transform: visible ? "translateY(0)" : "translateY(50px)",
        transition: `opacity 0.7s ease-out ${index * 200}ms, transform 0.7s ease-out ${index * 200}ms`,
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
        transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
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
  { q: "What types of SMSFs can Auditron audit?", a: "Any SMSF — accumulation, pension, or hybrid. Auditron checks compliance across all 12 SIS Act areas." },
  { q: "How accurate is the AI analysis?", a: "Every finding cites specific dollar amounts and document references. Auditron focuses on material compliance risks — the same issues that trigger ATO contravention reports." },
  { q: "Is this a replacement for a registered auditor?", a: "No. Auditron produces a draft compliance assessment. The registered auditor reviews, adjusts, and signs off." },
  { q: "Is client data secure?", a: "All data encrypted in transit and at rest. Stored in Australia. Each auditor's data is completely isolated." },
  { q: "Can I export reports?", a: "Yes. Download formatted PDF compliance reports with findings, RFIs, and draft opinion." },
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
              <span style={{ fontWeight: 500, fontSize: "18px", color: "#111111" }}>{item.q}</span>
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
                maxHeight: isOpen ? "300px" : "0px",
                opacity: isOpen ? 1 : 0,
                overflow: "hidden",
                transition: "max-height 0.3s ease, opacity 0.3s ease",
              }}
            >
              <p className="pb-5 leading-relaxed" style={{ fontSize: "16px", color: "#666666" }}>{item.a}</p>
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
  { step: "01", title: "Upload", desc: "Drag and drop your fund pack. Financial statements, workpapers, bank statements, remittances — Auditron reads them all." },
  { step: "02", title: "Analyse", desc: "AI checks compliance across 12 SIS Act areas. Contributions, pensions, in-house assets, related party transactions, lodgement history." },
  { step: "03", title: "Review", desc: "Structured findings with specific dollar amounts and document references. RFIs auto-generated. Draft opinion with full reasoning." },
];

const features = [
  {
    title: "Catches what others miss",
    desc: "Sundry debtor balances that could be disguised loans. Interest-free related party transactions. In-house assets hiding in receivables. Auditron flags the material risks that trigger ATO contravention reports.",
    img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.13.54%20pm.png",
    imgSide: "right" as const,
  },
  {
    title: "RFIs that matter",
    desc: "No generic checklist items. Every RFI names the exact document, figure, or transaction that needs clarification. The same questions a 15-year auditor would actually send to the accountant.",
    img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.12.44%20pm.png",
    imgSide: "left" as const,
  },
  {
    title: "Draft opinions with full reasoning",
    desc: "Every audit produces an opinion — unqualified, qualified, or adverse — with detailed reasoning citing specific compliance areas and document references.",
    img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.15.51%20pm.png",
    imgSide: "right" as const,
  },
];

const pricingFeatures = [
  "AI compliance analysis across 12 SIS Act areas",
  "Specific findings with dollar amounts and references",
  "Auto-generated RFIs for unresolved items",
  "Draft audit opinion with reasoning",
  "Unlimited document uploads",
  "Unlimited AI interactions",
  "Results in under 60 seconds",
];

const navLinks = [
  { label: "How It Works", id: "how-it-works" },
  { label: "Features", id: "features" },
  { label: "Pricing", id: "pricing" },
  { label: "FAQ", id: "faq" },
];

const stats = [
  { number: "12", label: "SIS Act compliance areas checked" },
  { number: "$29", label: "per audit, unlimited documents" },
  { number: "< 1 min", label: "from upload to findings" },
];

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                  */
/* ------------------------------------------------------------------ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#ffffff", overflow: "hidden" }}>

      {/* ---- Background atmosphere orbs ---- */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div style={{
          position: "absolute", top: "-10%", left: "20%", width: "800px", height: "800px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          animation: "orbDrift1 20s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "65%", right: "10%", width: "800px", height: "800px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)",
          animation: "orbDrift2 20s ease-in-out infinite",
        }} />
      </div>

      {/* ==== NAV ==== */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: "64px",
          background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid #f0f0f0" : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div className="flex h-full items-center justify-between mx-auto" style={{ paddingLeft: "32px", paddingRight: "32px", maxWidth: "1200px" }}>
          <span style={{ fontWeight: 700, fontSize: "20px", color: "#111111" }}>
            Auditron
          </span>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="bg-transparent border-none cursor-pointer transition-colors"
                style={{ fontSize: "14px", color: "#888888" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111111")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#888888")}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm transition-colors" style={{ color: "#888888", fontSize: "14px" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#111111")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888888")}
            >
              Login
            </Link>
            <a
              href="mailto:hello@auditron.com.au"
              className="inline-flex items-center justify-center text-sm font-medium transition-colors"
              style={{
                background: "#111111", color: "#ffffff", borderRadius: "9999px",
                padding: "8px 20px", textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#333333")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#111111")}
            >
              Book a Demo
            </a>
          </div>
        </div>
      </nav>

      {/* ==== HERO (100vh) ==== */}
      <section className="relative z-10 flex items-center justify-center" style={{ minHeight: "100vh", paddingTop: "64px" }}>
        {/* Hero background orb behind counter */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div style={{
            width: "800px", height: "800px", borderRadius: "50%",
            background: "radial-gradient(circle 400px, rgba(0,0,0,0.05), transparent)",
            animation: "heroBreath 15s ease-in-out infinite",
          }} />
        </div>

        <div className="text-center relative z-10 px-6" style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* AI-POWERED label */}
          <p className="hero-fade hero-fade-1" style={{
            fontWeight: 300, fontSize: "16px",
            color: "#bbbbbb", letterSpacing: "12px", textTransform: "uppercase",
            marginBottom: "20px",
          }}>
            AI-POWERED
          </p>

          {/* SMSF Auditing. */}
          <h1 className="hero-fade hero-fade-2 leading-tight">
            <span className="hidden md:block" style={{ fontWeight: 800, fontSize: "80px", color: "#111111" }}>
              SMSF Auditing.
            </span>
            <span className="block md:hidden" style={{ fontWeight: 800, fontSize: "48px", color: "#111111" }}>
              SMSF Auditing.
            </span>
          </h1>

          {/* GIANT counter — visual centrepiece */}
          <div className="hero-fade hero-fade-3" style={{ marginTop: "32px" }}>
            <span className="counter-glow hidden md:inline-block" style={{
              fontWeight: 800, fontSize: "120px", color: "#111111", lineHeight: 1.1,
            }}>
              &lt; 1 min
            </span>
            <span className="counter-glow inline-block md:hidden" style={{
              fontWeight: 800, fontSize: "72px", color: "#111111", lineHeight: 1.1,
            }}>
              &lt; 1 min
            </span>
            <p style={{ fontSize: "16px", color: "#aaaaaa", marginTop: "8px", letterSpacing: "2px" }}>
              average turnaround time
            </p>
          </div>

          {/* Description */}
          <p className="hero-fade hero-fade-4 mx-auto" style={{
            fontWeight: 400, fontSize: "18px", color: "#888888",
            maxWidth: "560px", marginTop: "36px", lineHeight: 1.7,
          }}>
            Upload fund documents. Get AI-powered compliance findings, automated RFIs, and audit-ready reports.
          </p>

          {/* Buttons */}
          <div className="hero-fade hero-fade-5 mt-10 flex items-center justify-center gap-4">
            <a
              href="mailto:hello@auditron.com.au"
              className="inline-flex items-center justify-center font-medium transition-colors"
              style={{
                background: "#111111", color: "#ffffff", borderRadius: "8px",
                padding: "14px 32px", fontSize: "15px", textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#333333")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#111111")}
            >
              Book a Demo
            </a>
            <button
              onClick={() => scrollTo("video")}
              className="inline-flex items-center justify-center font-medium transition-colors"
              style={{
                border: "1px solid #dddddd", background: "transparent", color: "#111111",
                borderRadius: "8px", padding: "14px 32px", fontSize: "15px", cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fafafa"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* ==== VIDEO ==== */}
      <section id="video" className="relative z-10 px-6" style={{ paddingBottom: "100px" }}>
        <RevealSection className="text-center mb-8">
          <p style={{
            fontWeight: 500, fontSize: "14px", color: "#aaaaaa",
            textTransform: "uppercase", letterSpacing: "4px",
          }}>
            See it in action
          </p>
        </RevealSection>
        <RevealSection>
          <div className="mx-auto" style={{ maxWidth: "1100px" }}>
            <div style={{
              borderRadius: "16px", background: "#f5f5f5", padding: "8px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
            }}>
              <video
                autoPlay muted loop playsInline controls={false}
                className="w-full"
                style={{ objectFit: "contain", borderRadius: "12px", display: "block" }}
                src="https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screen%20Recording%202026-03-19%20at%20101437%20am.mp4"
              />
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ==== STATS BAR ==== */}
      <section className="relative z-10" style={{ padding: "80px 24px" }}>
        <div className="mx-auto flex flex-col md:flex-row items-center justify-center gap-0" style={{ maxWidth: "900px" }}>
          {stats.map((stat, i) => (
            <StaggerChild key={i} index={i}>
              <div className="flex flex-col items-center text-center" style={{
                padding: "24px 48px",
                borderRight: i < stats.length - 1 ? "1px solid #e5e5e5" : "none",
              }}>
                <span style={{ fontWeight: 800, fontSize: "48px", color: "#111111", lineHeight: 1.2 }}>
                  {stat.number}
                </span>
                <span style={{ fontWeight: 400, fontSize: "14px", color: "#888888", marginTop: "8px" }}>
                  {stat.label}
                </span>
              </div>
            </StaggerChild>
          ))}
        </div>
      </section>

      {/* ==== HOW IT WORKS — Dark section ==== */}
      <section id="how-it-works" className="relative z-10" style={{ background: "#0a0a0a", padding: "140px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "1100px" }}>
          <RevealSection className="text-center mb-4">
            <h2 style={{ fontWeight: 700, fontSize: "44px", color: "#ffffff" }}>
              How it works
            </h2>
          </RevealSection>
          <RevealSection className="text-center mb-16">
            <p style={{ fontWeight: 400, fontSize: "18px", color: "#666666" }}>
              Three steps. Under sixty seconds.
            </p>
          </RevealSection>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((item, i) => (
              <StaggerChild key={i} index={i}>
                <div
                  className="relative overflow-hidden"
                  style={{
                    background: "#151515", border: "1px solid #222222", borderRadius: "16px",
                    padding: "48px", transition: "all 0.3s ease", cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#333333";
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#222222";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span style={{
                    position: "absolute", top: "8px", right: "16px",
                    fontWeight: 900, fontSize: "140px",
                    lineHeight: 1, color: "rgba(255,255,255,0.03)", pointerEvents: "none", userSelect: "none",
                  }}>
                    {item.step}
                  </span>
                  <h3 style={{ fontWeight: 600, fontSize: "22px", color: "#ffffff" }}>
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-relaxed" style={{ fontWeight: 400, fontSize: "15px", color: "#777777" }}>
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
          <RevealSection className="text-center" style={{ paddingTop: "140px", paddingBottom: "40px" }}>
            <h2 style={{ fontWeight: 700, fontSize: "40px", color: "#111111" }}>
              Built for senior auditors
            </h2>
            <p className="mt-4" style={{ fontWeight: 400, fontSize: "18px", color: "#888888" }}>
              Every feature designed to catch what matters and ignore what doesn't.
            </p>
          </RevealSection>

          {features.map((feat, i) => {
            const imgLeft = feat.imgSide === "left";
            return (
              <div
                key={i}
                className={`flex flex-col ${imgLeft ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 md:gap-16`}
                style={{ padding: "140px 0" }}
              >
                {/* Text */}
                <RevealSection className="flex-1" style={{ maxWidth: "460px" }}>
                  <h3 style={{ fontWeight: 600, fontSize: "28px", color: "#111111", lineHeight: 1.3 }}>
                    {feat.title}
                  </h3>
                  <p className="mt-4" style={{ fontWeight: 400, fontSize: "16px", color: "#666666", lineHeight: 1.7 }}>
                    {feat.desc}
                  </p>
                </RevealSection>

                {/* Image */}
                <SlideIn direction={feat.imgSide} className="flex-1" style={{ maxWidth: "560px", width: "100%" }}>
                  <div style={{
                    background: "#f7f7f7", borderRadius: "16px", border: "1px solid #eeeeee",
                    padding: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
                  }}>
                    <img
                      src={feat.img} alt={feat.title}
                      className="w-full" loading="lazy"
                      style={{ objectFit: "contain", borderRadius: "8px", display: "block" }}
                    />
                  </div>
                </SlideIn>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==== SPEED CALLOUT — Dark section ==== */}
      <section className="relative z-10 overflow-hidden" style={{ background: "#0a0a0a", padding: "120px 24px" }}>
        {/* Animated ring */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div className="speed-ring" style={{
            width: "600px", height: "600px", borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.06)",
          }} />
        </div>

        <div className="mx-auto text-center relative z-10" style={{ maxWidth: "600px" }}>
          <RevealSection>
            <h2 style={{ fontWeight: 800, fontSize: "56px", color: "#ffffff", lineHeight: 1.1 }}>
              Upload. Click. Done.
            </h2>
            <p className="mt-6 mx-auto" style={{ fontWeight: 400, fontSize: "18px", color: "#666666", maxWidth: "500px", lineHeight: 1.7 }}>
              Average audit turnaround: under 60 seconds. Unlimited document uploads. Unlimited AI interactions per audit.
            </p>
            <div className="mt-10">
              <a
                href="mailto:hello@auditron.com.au"
                className="inline-flex items-center justify-center font-medium transition-colors"
                style={{
                  background: "#ffffff", color: "#111111", borderRadius: "8px",
                  padding: "14px 32px", fontSize: "15px", textDecoration: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e5e5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
              >
                Book a Demo
              </a>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ==== PRICING — White bg ==== */}
      <section id="pricing" className="relative z-10" style={{ background: "#ffffff", padding: "140px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "480px" }}>
          <RevealSection className="text-center mb-4">
            <h2 style={{ fontWeight: 700, fontSize: "40px", color: "#111111" }}>
              Simple pricing
            </h2>
          </RevealSection>
          <RevealSection className="text-center mb-12">
            <p style={{ fontWeight: 400, fontSize: "18px", color: "#888888" }}>
              One price. Everything included.
            </p>
          </RevealSection>
          <RevealSection>
            <div style={{
              background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "20px",
              padding: "56px 48px", boxShadow: "0 16px 48px rgba(0,0,0,0.06)",
            }}>
              <div className="text-center">
                <span style={{ fontWeight: 800, fontSize: "72px", color: "#111111" }}>$29</span>
                <p style={{ fontWeight: 400, fontSize: "18px", color: "#888888", marginTop: "4px" }}>per audit</p>
              </div>
              <div style={{ height: "1px", background: "#f0f0f0", margin: "24px 0" }} />
              <ul className="space-y-3">
                {pricingFeatures.map((feat, i) => (
                  <li key={i} className="flex items-start gap-3" style={{ fontSize: "15px", color: "#555555" }}>
                    <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#111111" }} strokeWidth={2.5} />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                className="w-full mt-8 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "#111111", color: "#ffffff", border: "none", cursor: "pointer", padding: "16px", borderRadius: "8px" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#333333"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#111111"; }}
                onClick={() => window.location.href = "mailto:hello@auditron.com.au"}
              >
                Book a Demo
              </button>
              <p className="mt-4 text-center" style={{ fontSize: "14px", color: "#aaaaaa" }}>
                Volume pricing for firms processing 20+ audits.
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ==== FAQ ==== */}
      <section id="faq" className="relative z-10" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "680px" }}>
          <RevealSection className="text-center mb-12">
            <h2 style={{ fontWeight: 700, fontSize: "40px", color: "#111111" }}>
              Questions
            </h2>
          </RevealSection>
          <RevealSection>
            <FAQAccordion />
          </RevealSection>
        </div>
      </section>

      {/* ==== BOTTOM CTA ==== */}
      <section className="relative z-10" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div style={{
            width: "600px", height: "600px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,0,0,0.04) 0%, transparent 70%)",
          }} />
        </div>
        <div className="mx-auto text-center relative z-10" style={{ maxWidth: "680px" }}>
          <RevealSection>
            <h2 style={{ fontWeight: 700, fontSize: "44px", color: "#111111" }}>
              Ready to audit smarter?
            </h2>
            <p className="mt-4" style={{ fontWeight: 400, fontSize: "18px", color: "#888888" }}>
              Stop spending hours on compliance reviews.
            </p>
            <div className="mt-8">
              <a
                href="mailto:hello@auditron.com.au"
                className="inline-flex items-center justify-center font-medium transition-colors"
                style={{
                  background: "#111111", color: "#ffffff", borderRadius: "8px",
                  padding: "14px 32px", fontSize: "15px", textDecoration: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#333333")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#111111")}
              >
                Book a Demo
              </a>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ==== FOOTER ==== */}
      <footer className="relative z-10" style={{ background: "#fafafa", borderTop: "1px solid #f0f0f0", padding: "48px 32px" }}>
        <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-6" style={{ maxWidth: "1100px" }}>
          <div className="flex flex-col items-center md:items-start gap-1">
            <span style={{ fontWeight: 700, fontSize: "16px", color: "#111111" }}>Auditron</span>
            <span style={{ fontSize: "13px", color: "#999999" }}>© 2026 Auditron. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { label: "How It Works", action: () => scrollTo("how-it-works") },
              { label: "Features", action: () => scrollTo("features") },
              { label: "Pricing", action: () => scrollTo("pricing") },
              { label: "FAQ", action: () => scrollTo("faq") },
              { label: "Privacy", action: () => {} },
              { label: "Terms", action: () => {} },
            ].map((link) => (
              <button
                key={link.label}
                className="text-sm bg-transparent border-none cursor-pointer transition-colors"
                style={{ color: "#999999" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111111")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#999999")}
                onClick={link.action}
              >
                {link.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "13px", color: "#999999" }}>Built in Melbourne</span>
        </div>
      </footer>

      {/* ---- CSS Keyframes ---- */}
      <style>{`
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(4%, 6%); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-6%, 4%); }
        }
        @keyframes heroBreath {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes counterGlow {
          0%, 100% { text-shadow: 0 0 0px rgba(0,0,0,0); }
          50% { text-shadow: 0 0 100px rgba(0,0,0,0.12); }
        }
        .counter-glow {
          animation: counterGlow 3s ease-in-out infinite;
        }
        @keyframes speedRing {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.5; }
          50% { transform: rotate(180deg) scale(1.08); opacity: 1; }
        }
        .speed-ring {
          animation: speedRing 12s ease-in-out infinite;
        }

        /* Hero staggered fade-ins */
        .hero-fade {
          opacity: 0;
          transform: translateY(20px);
          animation: heroFadeIn 0.7s ease-out forwards;
        }
        .hero-fade-1 { animation-delay: 0.3s; }
        .hero-fade-2 { animation-delay: 0.6s; }
        .hero-fade-3 { animation-delay: 0.9s; }
        .hero-fade-4 { animation-delay: 1.2s; }
        .hero-fade-5 { animation-delay: 1.5s; }
        @keyframes heroFadeIn {
          to { opacity: 1; transform: translateY(0); }
        }

        /* Mobile stats: remove right borders */
        @media (max-width: 767px) {
          .stats-divider { border-right: none !important; }
        }
      `}</style>
    </div>
  );
}
