"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export default function FeedbackBanner({
  state,
  correctAnswer,
  meaning,
  onContinue,
}: {
  state: "idle" | "correct" | "wrong";
  correctAnswer?: string;
  meaning?: string;
  onContinue: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fokuskan tombol "Lanjut" begitu banner muncul, supaya Enter/Space
  // langsung lanjut ke soal berikutnya tanpa perlu menyentuh mouse.
  useEffect(() => {
    if (state !== "idle") {
      buttonRef.current?.focus();
    }
  }, [state]);

  return (
    <AnimatePresence>
      {state !== "idle" && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-[60] border-t-2 px-4 pb-safe pt-5 sm:px-8",
            state === "correct"
              ? "border-matcha bg-matcha-pale"
              : "border-torii bg-torii/10"
          )}
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {state === "correct" ? (
                <CheckCircle2 size={30} className="shrink-0 text-matcha-deep" />
              ) : (
                <XCircle size={30} className="shrink-0 text-torii" />
              )}
              <div>
                <p
                  className={cn(
                    "font-display text-lg font-bold",
                    state === "correct" ? "text-matcha-deep" : "text-torii"
                  )}
                >
                  {state === "correct" ? "Benar sekali!" : "Belum tepat"}
                </p>
                {state === "correct" && meaning && (
                  <p className="text-sm text-matcha-deep/80">
                    Arti: <span className="font-semibold">{meaning}</span>
                  </p>
                )}
                {state === "wrong" && correctAnswer && (
                  <p className="text-sm text-ink/60">
                    Jawaban yang benar: <span className="font-semibold">{correctAnswer}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              ref={buttonRef}
              onClick={onContinue}
              className={cn(
                "w-full shrink-0 rounded-2xl py-3.5 text-center font-display text-base font-bold uppercase tracking-wide text-white shadow-node transition-transform active:translate-y-1 active:shadow-nodePressed sm:w-auto sm:px-10",
                state === "correct" ? "bg-matcha" : "bg-torii"
              )}
            >
              Lanjut
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
