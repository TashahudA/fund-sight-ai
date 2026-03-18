import { useState, useEffect, useRef } from "react";
import { FileText, ClipboardCheck, Sparkles, Check, Loader2 } from "lucide-react";

interface AiProcessingAnimationProps {
  active: boolean;
  dataReady?: boolean;
  onComplete?: () => void;
}

const steps = [
  { label: "Reading documents...", icon: FileText },
  { label: "Checking compliance...", icon: ClipboardCheck },
  { label: "Generating findings...", icon: Sparkles },
  { label: "Finalising analysis...", icon: Sparkles },
];

const STEP_DURATION = 2200;

export function AiProcessingAnimation({ active, dataReady, onComplete }: AiProcessingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [finished, setFinished] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [step4Complete, setStep4Complete] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) {
      setCurrentStep(-1);
      setFinished(false);
      setFadingOut(false);
      setStep4Complete(false);
      return;
    }

    setCurrentStep(0);
    setFinished(false);
    setFadingOut(false);
    setStep4Complete(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Advance steps 1-3 on timers; step 3 (index 3) waits for dataReady
    for (let i = 1; i <= 3; i++) {
      timers.push(setTimeout(() => setCurrentStep(i), STEP_DURATION * i));
    }

    return () => timers.forEach(clearTimeout);
  }, [active]);

  // When dataReady becomes true, jump to step 3 if not there yet, then mark complete
  useEffect(() => {
    if (!dataReady || step4Complete) return;
    if (currentStep < 0) return;

    if (currentStep < 3) {
      setCurrentStep(3);
      return;
    }

    // currentStep === 3 and dataReady — mark step 4 complete
    setStep4Complete(true);
  }, [dataReady, currentStep, step4Complete]);

  // Once step4 is marked complete, fade out then finish
  useEffect(() => {
    if (!step4Complete) return;
    const t1 = setTimeout(() => setFadingOut(true), 800);
    const t2 = setTimeout(() => {
      setFinished(true);
      onCompleteRef.current?.();
    }, 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step4Complete]);

  if (!active || finished) return null;

  const progress = step4Complete ? 100 : Math.min(((Math.min(currentStep + 1, 3)) / 4) * 100, 75);

  return (
    <div
      className={`rounded-lg border border-border bg-background p-6 space-y-5 transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: "#111111",
          }}
        />
      </div>

      <div className="space-y-0">
        {steps.map((step, i) => {
          if (i > currentStep) return null;

          const isLastStep = i === 3;
          const isComplete = isLastStep ? step4Complete : i < currentStep;
          const isCurrent = isLastStep ? !step4Complete : i === currentStep && i < 3;
          const StepIcon = step.icon;

          return (
            <div
              key={step.label}
              className="flex items-center gap-3 py-2.5 animate-fade-in"
              style={{ animationDuration: "0.3s" }}
            >
              {isComplete ? (
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

              <span
                className="text-sm font-medium"
                style={{
                  color: isComplete ? "#16a34a" : isCurrent ? "hsl(var(--foreground))" : "#888888",
                }}
              >
                {isLastStep && step4Complete ? "Complete" : step.label}
              </span>

              {isCurrent && !isLastStep && (
                <StepIcon className="h-4 w-4 ml-auto text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
