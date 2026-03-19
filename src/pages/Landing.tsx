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
        transform: visible ? "translateY(0)" : "translateY(50px)",
        transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
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
        transition: `opacity 0.7s ease-out ${index * 150}ms, transform 0.7s ease-out ${index * 150}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SlideIn({ children, direction = "right", className = "" }: { children: React.ReactNode; direction?: "left" | "right"; className?: string }) {
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
          <div key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between py-5 text-left"
            >
              <span style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "15px", color: "#111111" }}>{item.q}</span>
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
                transition: "max-height 0.3s ease, opacity 0.3s ease",
              }}
            >
              <p className="pb-5 leading-relaxed" style={{ fontSize: "15px", color: "#666666" }}>{item.a}</p>
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
    img: "https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screenshot%202026-03-19%20at%203.15.02%20pm.png",
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

      {/* ==== NAV ==== */}
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
        <div className="flex h-14 items-center justify-between mx-auto" style={{ paddingLeft: "32px", paddingRight: "32px", maxWidth: "1200px" }}>
          <span style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "20px", color: "#111111" }}>
            Auditron
          </span>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-sm font-medium transition-colors bg-transparent border-none cursor-pointer"
                style={{ color: "#888888" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111111")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#888888")}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium transition-colors" style={{ color: "#888888" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#111111")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888888")}
            >
              Login
            </Link>
            <Button size="sm" asChild>
              <a href="mailto:hello@auditron.com.au">Book a Demo</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* ==== HERO ==== */}
      <section className="relative z-10 flex items-center justify-center" style={{ minHeight: "100vh", paddingTop: "80px", paddingBottom: "60px" }}>
        {/* Hero glow — large radial behind headline */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div style={{
            width: "800px", height: "800px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,0,0,0.04) 0%, transparent 70%)",
            animation: "heroDrift 20s ease-in-out infinite",
          }} />
        </div>

        <div className="text-center relative z-10 px-6" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <RevealSection>
            {/* Line 1: AI-Powered */}
            <p style={{
              fontFamily: "'Open Sans', sans-serif", fontWeight: 300, fontSize: "24px",
              color: "#999999", letterSpacing: "8px", textTransform: "uppercase",
              marginBottom: "12px",
            }}>
              AI-Powered
            </p>

            {/* Line 2: SMSF Auditing */}
            <h1 className="leading-tight">
              <span className="hidden md:block" style={{
                fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "72px", color: "#111111",
              }}>
                SMSF <span className="auditing-glow">Auditing</span>
              </span>
              <span className="block md:hidden" style={{
                fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "44px", color: "#111111",
              }}>
                SMSF <span className="auditing-glow">Auditing</span>
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "22px", color: "#888888" }}>
              SMSF compliance in{" "}
              <span style={{
                fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "#888888",
                textShadow: "0 0 30px rgba(0,0,0,0.12)",
              }}>minutes</span>
              , not hours.
            </p>

            {/* Description */}
            <p className="mt-6 mx-auto leading-relaxed" style={{
              fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px",
              color: "#999999", maxWidth: "540px",
            }}>
              Upload your fund documents. Get AI-powered compliance findings, automated RFIs, and audit-ready reports — in a fraction of the time.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" asChild>
                <a href="mailto:hello@auditron.com.au">Book a Demo</a>
              </Button>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 transition-colors"
                style={{ border: "1px solid #dddddd", background: "transparent", color: "#111111" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f9f9f9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                See How It Works
              </button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ==== VIDEO ==== */}
      <section className="relative z-10 pb-24 px-6">
        <RevealSection className="text-center mb-10">
          <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "32px", color: "#111111" }}>
            See it in action
          </h2>
        </RevealSection>
        <RevealSection>
          <div className="mx-auto" style={{ maxWidth: "1100px" }}>
            <div style={{
              borderRadius: "16px", border: "1px solid #e5e5e5",
              boxShadow: "0 12px 48px rgba(0,0,0,0.08)",
              overflow: "hidden", aspectRatio: "16/9",
            }}>
              <video
                autoPlay muted loop playsInline controls={false}
                className="w-full h-full"
                style={{ objectFit: "contain" }}
                src="https://puxbjitnqpsxixxilxsu.supabase.co/storage/v1/object/public/public-assets/Screen%20Recording%202026-03-19%20at%20101437%20am.mp4"
              />
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ==== HOW IT WORKS — Dark section ==== */}
      <section id="how-it-works" className="relative z-10" style={{ background: "#111111", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "1100px" }}>
          <RevealSection className="text-center mb-16">
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "36px", color: "#ffffff" }}>
              From upload to opinion in 3 steps
            </h2>
          </RevealSection>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((item, i) => (
              <StaggerChild key={i} index={i}>
                <div
                  className="relative overflow-hidden"
                  style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px",
                    padding: "40px", transition: "all 0.2s ease", cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#444444";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#2a2a2a";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span style={{
                    position: "absolute", top: "12px", right: "16px",
                    fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "100px",
                    lineHeight: 1, color: "rgba(255,255,255,0.04)", pointerEvents: "none", userSelect: "none",
                  }}>
                    {item.step}
                  </span>
                  <h3 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "20px", color: "#ffffff" }}>
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-relaxed" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "15px", color: "#888888" }}>
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
                className={`flex flex-col ${imgLeft ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 md:gap-16`}
                style={{ padding: "120px 0" }}
              >
                {/* Text */}
                <RevealSection className="flex-1" style={{ maxWidth: "440px" }}>
                  <h3 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "28px", color: "#111111", lineHeight: 1.3 }}>
                    {feat.title}
                  </h3>
                  <p className="mt-4 leading-relaxed" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "16px", color: "#666666" }}>
                    {feat.desc}
                  </p>
                </RevealSection>

                {/* Image */}
                <SlideIn direction={feat.imgSide} className="flex-1" style={{ maxWidth: "560px", width: "100%" }}>
                  <div style={{
                    background: "#f9f9f9", borderRadius: "12px", border: "1px solid #e5e5e5",
                    padding: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                  }}>
                    <img
                      src={feat.img} alt={feat.title}
                      className="w-full" loading="lazy"
                      style={{ objectFit: "contain", borderRadius: "8px" }}
                    />
                  </div>
                </SlideIn>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==== PRICING — Dark section ==== */}
      <section id="pricing" className="relative z-10" style={{ background: "#111111", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "560px" }}>
          <RevealSection className="text-center mb-12">
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "36px", color: "#ffffff" }}>
              Simple pricing
            </h2>
          </RevealSection>
          <RevealSection>
            <div className="pricing-border-wrap">
              <div className="text-center" style={{
                background: "#1a1a1a", borderRadius: "16px", padding: "56px", position: "relative",
              }}>
                <div>
                  <span style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: "72px", color: "#ffffff" }}>$29</span>
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "18px", color: "#888888", marginTop: "4px" }}>per audit</p>
                </div>
                <ul className="mt-10 space-y-4 text-left">
                  {pricingFeatures.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3" style={{ fontSize: "15px", color: "#cccccc" }}>
                      <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#ffffff" }} strokeWidth={2.5} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full mt-10 h-11 rounded-md text-sm font-medium transition-colors"
                  style={{ background: "#ffffff", color: "#111111", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                  onClick={() => window.location.href = "mailto:hello@auditron.com.au"}
                >
                  Book a Demo
                </button>
                <p className="mt-4" style={{ fontSize: "14px", color: "#666666" }}>
                  Volume pricing available for firms processing 20+ audits per month.
                </p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ==== FAQ ==== */}
      <section id="faq" className="relative z-10" style={{ background: "#ffffff", padding: "120px 24px" }}>
        <div className="mx-auto" style={{ maxWidth: "680px" }}>
          <RevealSection className="text-center mb-12">
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "36px", color: "#111111" }}>
              Frequently asked
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
            animation: "heroGlow 8s ease-in-out infinite",
          }} />
        </div>
        <div className="mx-auto text-center relative z-10" style={{ maxWidth: "680px" }}>
          <RevealSection>
            <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "40px", color: "#111111" }}>
              Ready to audit smarter?
            </h2>
            <p className="mt-4" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 400, fontSize: "18px", color: "#888888" }}>
              Join SMSF auditors saving hours per fund.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <a href="mailto:hello@auditron.com.au">Book a Demo</a>
              </Button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ==== FOOTER ==== */}
      <footer className="relative z-10" style={{ background: "#fafafa", borderTop: "1px solid #f0f0f0", padding: "48px 32px" }}>
        <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-6" style={{ maxWidth: "1100px" }}>
          <div className="flex flex-col items-center md:items-start gap-1">
            <span style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "16px", color: "#111111" }}>Auditron</span>
            <span style={{ fontSize: "13px", color: "#999999" }}>© 2026 Auditron. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            {["Product", "Pricing", "Contact", "Privacy", "Terms"].map((label) => (
              <button
                key={label}
                className="text-sm bg-transparent border-none cursor-pointer transition-colors"
                style={{ color: "#888888" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#111111")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#888888")}
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
          50% { text-shadow: 0 0 80px rgba(0,0,0,0.08); }
        }
        .auditing-glow {
          animation: auditingGlow 4s ease-in-out infinite;
        }
        @keyframes pricingBorderRotate {
          0% { --angle: 0deg; }
          100% { --angle: 360deg; }
        }
        .pricing-border-wrap {
          position: relative;
          border-radius: 17px;
          padding: 1px;
          background: conic-gradient(from var(--angle, 0deg), rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          animation: pricingBorderSpin 8s linear infinite;
        }
        @keyframes pricingBorderSpin {
          0% { background: conic-gradient(from 0deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05)); }
          25% { background: conic-gradient(from 90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05)); }
          50% { background: conic-gradient(from 180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05)); }
          75% { background: conic-gradient(from 270deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05)); }
          100% { background: conic-gradient(from 360deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05)); }
        }
      `}</style>
    </div>
  );
}
