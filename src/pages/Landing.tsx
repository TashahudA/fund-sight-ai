import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Mark from "@/components/brand/Mark";
import Wordmark from "@/components/brand/Wordmark";
import RuleMotif from "@/components/brand/RuleMotif";

/* ------------------------------------------------------------------ */
/*  Scroll reveal                                                      */
/* ------------------------------------------------------------------ */
function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Smooth scroll                                                      */
/* ------------------------------------------------------------------ */
function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ------------------------------------------------------------------ */
/*  Buttons                                                            */
/* ------------------------------------------------------------------ */
function PrimaryBtn({
  children,
  onClick,
  as = "button",
  to,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  as?: "button" | "link" | "a";
  to?: string;
  href?: string;
}) {
  const inner = (
    <>
      <span>{children}</span>
      <span className="brand-btn-flash">
        <Mark size={12} color="#E8DDC9" />
      </span>
    </>
  );
  if (as === "link" && to)
    return (
      <Link to={to} className="brand-btn-primary">
        {inner}
      </Link>
    );
  if (as === "a" && href)
    return (
      <a href={href} className="brand-btn-primary">
        {inner}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className="brand-btn-primary">
      {inner}
    </button>
  );
}

function SecondaryBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="brand-btn-secondary">
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        height: 72,
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        background: scrolled ? "rgba(242, 235, 221, 0.92)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(92,26,27,0.06)" : "1px solid transparent",
        transition: "background 200ms ease, border-color 200ms ease",
      }}
    >
      <div
        className="mx-auto h-full flex items-center justify-between"
        style={{ maxWidth: 1200, padding: "0 32px" }}
      >
        <Link to="/" aria-label="Auditron home" className="flex items-center">
          <Wordmark height={24} color="#5C1A1B" />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {[
            ["How it works", "how"],
            ["Features", "features"],
            ["Pricing", "pricing"],
            ["FAQ", "faq"],
          ].map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollToId(id)}
              className="brand-link"
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontWeight: 500,
                fontSize: 15,
                color: "#5C1A1B",
                background: "transparent",
                border: 0,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          <Link
            to="/login"
            className="brand-link hidden sm:inline-flex"
            style={{
              fontFamily: '"Inter Tight", system-ui, sans-serif',
              fontWeight: 500,
              fontSize: 15,
              color: "#5C1A1B",
            }}
          >
            Login
          </Link>
          <PrimaryBtn onClick={() => scrollToId("contact")}>Book a demo</PrimaryBtn>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ paddingTop: 168, paddingBottom: 96, background: "#F2EBDD" }}
    >
      <RuleMotif fade draw />
      {/* Subtle vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(92,26,27,0.025) 100%)",
        }}
      />

      <div
        className="relative mx-auto text-center"
        style={{ maxWidth: 1200, padding: "0 24px" }}
      >
        <Reveal>
          <div className="brand-eyebrow mb-6 flex items-center justify-center gap-2">
            <Mark size={10} color="#5C1A1B" />
            AI-powered SMSF audits
            <Mark size={10} color="#5C1A1B" />
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1
            className="font-display mx-auto"
            style={{
              fontSize: "clamp(46px, 6.8vw, 76px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#5C1A1B",
              maxWidth: 920,
            }}
          >
            95% of your audit done.
            <br />
            In under <em style={{ fontStyle: "italic", fontWeight: 500 }}>10 minutes</em>.
          </h1>
        </Reveal>

        {/* Horizontal flourish: thin oxblood rule with the tick on its right end */}
        <Reveal delay={120}>
          <div className="mt-8 flex items-center justify-center gap-2.5" aria-hidden>
            <span style={{ display: "block", width: 60, height: 1, background: "#5C1A1B", opacity: 0.55 }} />
            <Mark size={12} color="#5C1A1B" />
          </div>
        </Reveal>

        <Reveal delay={160}>
          <p
            className="mx-auto mt-7"
            style={{
              fontFamily: '"Inter Tight", system-ui, sans-serif',
              fontWeight: 400,
              fontSize: 19,
              lineHeight: 1.55,
              color: "#6B5F52",
              maxWidth: 560,
            }}
          >
            Auditron runs the full audit. You review the findings and sign off.
          </p>
        </Reveal>

        <Reveal delay={220}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <PrimaryBtn onClick={() => scrollToId("contact")}>Book a demo</PrimaryBtn>
            <SecondaryBtn onClick={() => scrollToId("how")}>See how it works</SecondaryBtn>
          </div>
        </Reveal>

        <Reveal delay={280}>
          <div
            className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 brand-tabular"
            style={{
              fontFamily: '"Inter Tight", system-ui, sans-serif',
              fontWeight: 400,
              fontSize: 13,
              color: "#6B5F52",
            }}
          >
            <span>Built in Australia</span>
            <Mark size={10} color="#5C1A1B" />
            <span>Data hosted in Australia</span>
            <Mark size={10} color="#5C1A1B" />
            <span>For registered SMSF auditors</span>
          </div>
        </Reveal>

        {/* Product screenshot */}
        <Reveal delay={360}>
          <div
            className="relative mx-auto mt-16"
            style={{
              maxWidth: 1100,
              borderRadius: 20,
              overflow: "hidden",
              background: "#F2EBDD",
              border: "1px solid rgba(92,26,27,0.08)",
              boxShadow: "0 24px 48px -12px rgba(92,26,27,0.18)",
            }}
          >
            {/* macOS chrome */}
            <div
              className="flex items-center gap-2"
              style={{
                padding: "12px 16px",
                background: "rgba(92,26,27,0.04)",
                borderBottom: "1px solid rgba(92,26,27,0.08)",
              }}
            >
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#E5C2C2" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#E5DCC2" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#C2E5CC" }} />
            </div>
            <div
              style={{
                aspectRatio: "16 / 10",
                background:
                  "linear-gradient(135deg, #F2EBDD 0%, #E8DDC9 100%)",
                position: "relative",
              }}
            >
              <img
                src="/hero-dashboard.png"
                alt="Auditron dashboard preview"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ pointerEvents: "none" }}
              >
                <Mark size={56} color="#5C1A1B" style={{ opacity: 0.12 }} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Watermark */}
      <div
        aria-hidden
        className="absolute"
        style={{ right: 32, bottom: 32, opacity: 0.4 }}
      >
        <Mark size={32} color="#E8DDC9" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Trust strip                                                        */
/* ------------------------------------------------------------------ */
function TrustStrip() {
  const firms = [
    "Pinnacle Audit",
    "Greycliff Partners",
    "Maitland & Co",
    "Northbourne Audit",
    "Westmere SMSF",
  ];
  return (
    <section style={{ padding: "56px 24px 56px", background: "#F2EBDD" }}>
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <Reveal>
          <div className="brand-eyebrow text-center mb-8">
            Trusted by SMSF auditors across Australia
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {firms.map((f) => (
              <div
                key={f}
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 400,
                  fontSize: 22,
                  color: "#6B5F52",
                  opacity: 0.5,
                  letterSpacing: "-0.01em",
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
      <div
        className="mx-auto mt-14"
        style={{ maxWidth: 1200, height: 1, background: "rgba(92,26,27,0.08)" }}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How it works                                                       */
/* ------------------------------------------------------------------ */
const steps = [
  {
    n: "01",
    title: "Upload",
    body:
      "Drop the workpapers, financials, bank statements, deed, and minutes. Auditron reads everything simultaneously and cross-references every figure to its source.",
  },
  {
    n: "02",
    title: "Review",
    body:
      "Auditron produces a draft compliance assessment, risk flags, and RFIs written in the voice of a senior auditor. You review, edit, and approve before anything goes out.",
  },
  {
    n: "03",
    title: "Sign off",
    body:
      "Receive a complete audit file — planning document, working papers, findings, RFIs, audit report, and signed opinion. Ready for ATO scrutiny.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how"
      className="relative"
      style={{ padding: "120px 24px", background: "#F2EBDD" }}
    >
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <Reveal>
          <div className="brand-eyebrow mb-5 flex items-center gap-2">
            <Mark size={10} color="#5C1A1B" /> How it works
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(34px, 4.4vw, 48px)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: "#5C1A1B",
              maxWidth: 720,
            }}
          >
            Three steps. <em style={{ fontStyle: "italic" }}>One signed opinion.</em>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-10 md:gap-8 mt-16">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="relative">
                <Mark size={16} color="#5C1A1B" />
                <div
                  className="font-display brand-tabular"
                  style={{
                    fontWeight: 400,
                    fontSize: 96,
                    lineHeight: 1,
                    color: "#5C1A1B",
                    opacity: 0.12,
                    marginTop: 8,
                  }}
                >
                  {s.n}
                </div>
                <h3
                  style={{
                    fontFamily: '"Inter Tight", system-ui, sans-serif',
                    fontWeight: 600,
                    fontSize: 22,
                    color: "#5C1A1B",
                    marginTop: 16,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontFamily: '"Inter Tight", system-ui, sans-serif',
                    fontWeight: 400,
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: "#1A1612",
                    marginTop: 12,
                  }}
                >
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <div
        className="mx-auto mt-24"
        style={{ maxWidth: 1200, height: 1, background: "rgba(92,26,27,0.08)" }}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */
const features = [
  {
    eyebrow: "AI analysis",
    title: "Every figure read. Every document agreed.",
    body:
      "Financials, bank statements, investment reports, trust deeds, minutes — read simultaneously and agreed across every document. Every finding linked to its exact source. No skimming. No assumptions.",
    img: "/feature-1.png",
  },
  {
    eyebrow: "Risk flags",
    title: "The risks hiding in plain sight.",
    body:
      "Sundry debtor balances that could be disguised loans. Interest-free related party transactions. In-house assets hiding in receivables. Material risks, not paperwork gaps.",
    img: "/feature-2.png",
  },
  {
    eyebrow: "RFIs",
    title: "RFIs written like a senior auditor.",
    body:
      "Every RFI names the exact document, figure, and transaction requiring clarification. Editable before anything goes out. Nothing sent without your approval.",
    img: "/feature-3.png",
  },
  {
    eyebrow: "Audit opinion",
    title: "Sign-off ready. Not just a summary.",
    body:
      "Every audit produces an opinion — unqualified, qualified, or adverse — with detailed reasoning citing specific compliance areas and document references.",
    img: "/feature-4.png",
  },
  {
    eyebrow: "Audit file",
    title: "A complete audit file. Ready for ATO review.",
    body:
      "Planning document, working papers, findings, RFIs, audit report — all generated, all cross-referenced to source evidence. Everything your file needs to stand up to scrutiny.",
    img: "/feature-5.png",
  },
];

function FeatureBlock({
  feature,
  reverse,
}: {
  feature: (typeof features)[number];
  reverse: boolean;
}) {
  return (
    <div
      className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center brand-feature-card ${
        reverse ? "md:[direction:rtl]" : ""
      }`}
    >
      <div className={reverse ? "md:[direction:ltr]" : ""}>
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 12,
            background: "#E8DDC9",
            border: "1px solid rgba(92,26,27,0.08)",
            boxShadow: "0 12px 24px -8px rgba(92,26,27,0.08)",
            aspectRatio: "4 / 3",
          }}
        >
          <RuleMotif variant="ink-faint" />
          <img
            src={feature.img}
            alt={feature.title}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ pointerEvents: "none" }}
          >
            <Mark size={48} color="#5C1A1B" style={{ opacity: 0.18 }} />
          </div>
        </div>
      </div>
      <div className={reverse ? "md:[direction:ltr]" : ""}>
        <Mark size={14} color="#5C1A1B" />
        <div className="brand-eyebrow mt-4">{feature.eyebrow}</div>
        <h3
          className="font-display mt-4"
          style={{
            fontWeight: 500,
            fontSize: "clamp(28px, 3.4vw, 36px)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            color: "#5C1A1B",
          }}
        >
          {feature.title}
        </h3>
        <p
          className="mt-5"
          style={{
            fontFamily: '"Inter Tight", system-ui, sans-serif',
            fontWeight: 400,
            fontSize: 16,
            lineHeight: 1.65,
            color: "#1A1612",
            maxWidth: 480,
          }}
        >
          {feature.body}
        </p>
      </div>
    </div>
  );
}

function Features() {
  return (
    <section
      id="features"
      className="relative"
      style={{ padding: "120px 24px", background: "#F2EBDD" }}
    >
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <Reveal>
          <div className="brand-eyebrow mb-5 flex items-center gap-2">
            <Mark size={10} color="#5C1A1B" /> What Auditron does
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(34px, 4.4vw, 48px)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: "#5C1A1B",
              maxWidth: 820,
            }}
          >
            Every figure read. Every risk flagged.{" "}
            <em style={{ fontStyle: "italic" }}>Every RFI written.</em>
          </h2>
        </Reveal>

        <div className="space-y-24 md:space-y-28 mt-20">
          {features.map((f, i) => (
            <Reveal key={f.eyebrow} delay={i * 60}>
              <FeatureBlock feature={f} reverse={i % 2 === 1} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  The Line (pull-quote)                                              */
/* ------------------------------------------------------------------ */
function TheLine() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#2A0B0C", padding: "120px 24px" }}
    >
      <RuleMotif variant="cream" fade />
      <Reveal>
        <div className="relative mx-auto text-center" style={{ maxWidth: 980 }}>
          <p
            className="font-display"
            style={{
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "clamp(32px, 5vw, 56px)",
              lineHeight: 1.15,
              letterSpacing: "-0.015em",
              color: "#F2EBDD",
            }}
          >
            "The auditor remains the auditor. Auditron just removes the busywork."
          </p>
          <div className="mt-10 flex justify-center">
            <Mark size={20} color="#E8DDC9" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */
const tiers = [
  {
    name: "Starter",
    price: "$X",
    features: [
      "Per-audit pricing",
      "Full audit file generation",
      "Email support",
      "Single auditor seat",
    ],
    recommended: false,
  },
  {
    name: "Practice",
    price: "$X",
    features: [
      "Everything in Starter",
      "Volume per-audit pricing",
      "Priority support",
      "Up to 5 auditor seats",
    ],
    recommended: true,
  },
  {
    name: "Firm",
    price: "$X",
    features: [
      "Everything in Practice",
      "Custom volume pricing",
      "Dedicated success manager",
      "Unlimited seats",
    ],
    recommended: false,
  },
];

function Pricing() {
  return (
    <section
      id="pricing"
      className="relative"
      style={{ padding: "120px 24px", background: "#F2EBDD" }}
    >
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <Reveal>
          <div className="text-center">
            <div className="brand-eyebrow mb-5 flex items-center justify-center gap-2">
              <Mark size={10} color="#5C1A1B" /> Pricing
            </div>
            <h2
              className="font-display mx-auto"
              style={{
                fontSize: "clamp(34px, 4.4vw, 48px)",
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                color: "#5C1A1B",
                maxWidth: 820,
              }}
            >
              Per audit. <em style={{ fontStyle: "italic" }}>No subscriptions.</em> No surprises.
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-16">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <div
                className="relative h-full flex flex-col"
                style={{
                  background: "#F2EBDD",
                  border: t.recommended
                    ? "1.5px solid #5C1A1B"
                    : "1px solid rgba(92,26,27,0.12)",
                  borderRadius: 12,
                  padding: "32px 28px",
                  boxShadow: t.recommended
                    ? "0 18px 36px -12px rgba(232,221,201,0.25)"
                    : "0 8px 20px -10px rgba(92,26,27,0.06)",
                }}
              >
                {t.recommended && (
                  <div
                    className="absolute"
                    style={{
                      top: -12,
                      left: 28,
                      background: "#E8DDC9",
                      color: "#5C1A1B",
                      fontFamily: '"Inter Tight", system-ui, sans-serif',
                      fontWeight: 600,
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      padding: "5px 10px",
                      borderRadius: 4,
                    }}
                  >
                    Most chosen
                  </div>
                )}
                <div
                  style={{
                    fontFamily: '"Inter Tight", system-ui, sans-serif',
                    fontWeight: 600,
                    fontSize: 18,
                    color: "#5C1A1B",
                  }}
                >
                  {t.name}
                </div>
                <div className="mt-3 flex items-baseline gap-1.5 brand-tabular">
                  <span
                    className="font-display"
                    style={{
                      fontWeight: 500,
                      fontSize: 56,
                      lineHeight: 1,
                      color: "#5C1A1B",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {t.price}
                  </span>
                  <span
                    style={{
                      fontFamily: '"Inter Tight", system-ui, sans-serif',
                      fontWeight: 400,
                      fontSize: 16,
                      color: "#6B5F52",
                    }}
                  >
                    /audit
                  </span>
                </div>
                <ul className="mt-7 space-y-3 flex-1">
                  {t.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <span style={{ marginTop: 3 }}>
                        <Mark size={14} color="#5C1A1B" />
                      </span>
                      <span
                        style={{
                          fontFamily: '"Inter Tight", system-ui, sans-serif',
                          fontWeight: 400,
                          fontSize: 15,
                          color: "#1A1612",
                          lineHeight: 1.5,
                        }}
                      >
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <PrimaryBtn onClick={() => scrollToId("contact")}>Book a demo</PrimaryBtn>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <div
        className="mx-auto mt-24"
        style={{ maxWidth: 1200, height: 1, background: "rgba(92,26,27,0.08)" }}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "Does Auditron replace the auditor?",
    a: "No. Auditron produces a draft compliance assessment for review. The registered auditor reviews, adjusts, and signs off. Auditron saves time, not judgment.",
  },
  {
    q: "Where is my client data stored?",
    a: "All data encrypted in transit and at rest. Hosted in Australia. Each auditor's data is completely isolated.",
  },
  {
    q: "Can I export the audit file?",
    a: "Yes. Download the complete audit file as a formatted PDF including findings, RFIs, working papers, and the draft opinion.",
  },
  {
    q: "Will the ATO accept Auditron-generated workpapers?",
    a: "Auditron produces standard workpapers cross-referenced to source evidence. The audit opinion is signed by you, the registered auditor — the same as any other audit.",
  },
  {
    q: "How long does it take to learn?",
    a: "Most auditors run their first audit within 30 minutes of logging in. Upload, review, sign off.",
  },
  {
    q: "What does it cost per fund?",
    a: "Per-audit pricing — no subscriptions. See pricing above.",
  },
];

function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section
      id="faq"
      className="relative"
      style={{ padding: "120px 24px", background: "#F2EBDD" }}
    >
      <div className="mx-auto" style={{ maxWidth: 880 }}>
        <Reveal>
          <div className="brand-eyebrow mb-5 flex items-center gap-2">
            <Mark size={10} color="#5C1A1B" /> Frequently asked
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(34px, 4.4vw, 48px)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              color: "#5C1A1B",
            }}
          >
            What auditors <em style={{ fontStyle: "italic" }}>ask first.</em>
          </h2>
        </Reveal>

        <div className="mt-12">
          {faqs.map((f, i) => {
            const open = openIdx === i;
            return (
              <div
                key={f.q}
                className="brand-accordion"
                data-open={open ? "true" : "false"}
                style={{ borderTop: "1px solid rgba(92,26,27,0.12)" }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between text-left"
                  style={{
                    padding: "24px 0",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Inter Tight", system-ui, sans-serif',
                      fontWeight: 600,
                      fontSize: 18,
                      color: "#5C1A1B",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {f.q}
                  </span>
                  <span className="brand-accordion-mark" style={{ marginLeft: 16, flexShrink: 0 }}>
                    <Mark size={18} color="#5C1A1B" />
                  </span>
                </button>
                <div
                  style={{
                    maxHeight: open ? 280 : 0,
                    overflow: "hidden",
                    transition: "max-height 350ms ease, padding 350ms ease",
                    paddingBottom: open ? 24 : 0,
                  }}
                >
                  <p
                    style={{
                      fontFamily: '"Inter Tight", system-ui, sans-serif',
                      fontWeight: 400,
                      fontSize: 16,
                      lineHeight: 1.65,
                      color: "#1A1612",
                      maxWidth: 720,
                    }}
                  >
                    {f.a}
                  </p>
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid rgba(92,26,27,0.12)" }} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom CTA                                                         */
/* ------------------------------------------------------------------ */
function BottomCTA() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden"
      style={{ padding: "120px 24px", background: "#F2EBDD" }}
    >
      <RuleMotif fade />
      <div className="relative mx-auto text-center" style={{ maxWidth: 880 }}>
        <Reveal>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(34px, 4.8vw, 56px)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#5C1A1B",
            }}
          >
            Ready to <em style={{ fontStyle: "italic" }}>audit smarter?</em>
          </h2>
          <p
            className="mx-auto mt-5"
            style={{
              fontFamily: '"Inter Tight", system-ui, sans-serif',
              fontWeight: 400,
              fontSize: 19,
              lineHeight: 1.55,
              color: "#6B5F52",
              maxWidth: 520,
            }}
          >
            Join SMSF auditors saving hours per fund.
          </p>
          <div className="mt-9 flex justify-center">
            <PrimaryBtn as="link" to="/signup">
              Book a demo
            </PrimaryBtn>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  const cols: { heading: string; links: { label: string; to?: string; href?: string }[] }[] = [
    {
      heading: "Product",
      links: [
        { label: "How it works", href: "#how" },
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Contact", href: "#contact" },
        { label: "Careers", href: "#" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { label: "Documentation", href: "#" },
        { label: "Security", href: "#" },
        { label: "Status", href: "#" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Terms of Service", to: "/terms" },
        { label: "Privacy Policy", to: "/privacy" },
      ],
    },
  ];

  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: "#5C1A1B", color: "#F2EBDD", padding: "80px 24px 40px" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0.22 }}
      >
        <RuleMotif variant="cream" />
      </div>

      <div className="relative mx-auto" style={{ maxWidth: 1200 }}>
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <Wordmark height={32} color="#F2EBDD" />
            <p
              className="mt-5"
              style={{
                fontFamily: '"Inter Tight", system-ui, sans-serif',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(242,235,221,0.7)",
                maxWidth: 360,
              }}
            >
              An AI audit instrument built for registered SMSF auditors. Australian-built. Australian-hosted.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-8">
            {cols.map((col) => (
              <div key={col.heading}>
                <div
                  className="brand-eyebrow"
                  style={{ color: "rgba(242,235,221,0.55)", marginBottom: 16 }}
                >
                  {col.heading}
                </div>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.to ? (
                        <Link
                          to={l.to}
                          style={{
                            fontFamily: '"Inter Tight", system-ui, sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            color: "#F2EBDD",
                          }}
                        >
                          {l.label}
                        </Link>
                      ) : (
                        <a
                          href={l.href}
                          style={{
                            fontFamily: '"Inter Tight", system-ui, sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            color: "#F2EBDD",
                          }}
                        >
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-16"
          style={{ height: 1, background: "rgba(242,235,221,0.12)" }}
        />

        <div className="mt-6 flex flex-col md:flex-row items-center md:items-center justify-between gap-4">
          <div
            style={{
              fontFamily: '"Inter Tight", system-ui, sans-serif',
              fontWeight: 400,
              fontSize: 13,
              color: "rgba(232,221,201,0.7)",
            }}
          >
            © 2026 Auditron. All rights reserved.
          </div>
          <Mark size={14} color="#E8DDC9" />
          <div
            style={{
              fontFamily: '"Inter Tight", system-ui, sans-serif',
              fontWeight: 400,
              fontSize: 13,
              color: "rgba(232,221,201,0.7)",
            }}
          >
            Built in Melbourne.
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Landing() {
  return (
    <div className="brand-scope min-h-screen">
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <Features />
        <TheLine />
        <Pricing />
        <FAQ />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  );
}