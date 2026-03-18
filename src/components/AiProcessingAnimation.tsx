import { useState, useEffect } from "react";
import { FileText, ClipboardCheck, Sparkles, Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AiProcessingAnimationProps {
  active: boolean;
  onComplete?: () => void;
}

const steps = [
  { label: "Reading documents...", icon: FileText },
  { label: "Checking compliance...", icon: ClipboardCheck },
  { label: "Generating findings...", icon: Sparkles },
  { label: "Complete", icon: Check },
];

const STEP_DURATION = 2200;

export function AiProcessingAnimation({ active, onComplete }: AiProcessingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [finished, setFinished] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!active) {
      setCurrentStep(-1);
      setFinished(false);
      setFadingOut(false);
      return;
    }

    // Start step 0 immediately
    setCurrentStep(0);
    setFinished(false);
    setFadingOut(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 1; i < steps.length; i++) {
      timers.push(setTimeout(() => setCurrentStep(i), STEP_DURATION * i));
    }

    // After last step completes, fade out
    timers.push(
      setTimeout(() => {
        setFadingOut(true);
      }, STEP_DURATION * steps.length)
    );

    timers.push(
      setTimeout(() => {
        setFinished(true);
        onComplete?.();
      }, STEP_DURATION * steps.length + 500)
    );

    return () => timers.forEach(clearTimeout);
  }, [active, onComplete]);

  if (!active || finished) return null;

  const progress = Math.min(((currentStep + 1) / steps.length) * 100, 100);

  return (
    <div
      className={`rounded-lg border border-border bg-background p-6 space-y-5 transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: "#111111",
          }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-0">
        {steps.map((step, i) => {
          if (i > currentStep) return null;

          const isComplete = i < currentStep;
          const isCurrent = i === currentStep && currentStep < steps.length - 1;
          const isFinalComplete = i === steps.length - 1 && currentStep === steps.length - 1;
          const StepIcon = step.icon;

          return (
            <div
              key={step.label}
              className="flex items-center gap-3 py-2.5 animate-fade-in"
              style={{ animationDuration: "0.3s" }}
            >
              {/* Icon area */}
              {isComplete || isFinalComplete ? (
                <div className="flex items-center justify-center h-6 w-6 rounded-full shrink-0" style={{ backgroundColor: "#16a34a20" }}>
                  <Check className="h-3.5 w-3.5" style={{ color: "#16a34a" }} />
                </div>
              ) : isCurrent ? (
                <div className="flex items-center justify-center h-6 w-6 shrink-0">
                  <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-6 w-6 shrink-0">
                  <StepIcon className="h-4 w-4" style={{ color: "#888888" }} />
                </div>
              )}

              {/* Label */}
              <span
                className="text-sm font-medium"
                style={{
                  color: isComplete || isFinalComplete ? "#16a34a" : isCurrent ? "hsl(var(--foreground))" : "#888888",
                }}
              >
                {step.label}
              </span>

              {/* Step icon on the right for context */}
              {isCurrent && (
                <StepIcon className="h-4 w-4 ml-auto text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
