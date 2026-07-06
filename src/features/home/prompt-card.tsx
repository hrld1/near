"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { answerPromptAction } from "@/actions/presence";
import { Button } from "@/components/ui/button";
import { Textarea, FieldError } from "@/components/ui/input";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button size="sm" type="submit" loading={pending}>
      Responder
    </Button>
  );
}

export function PromptCard({
  promptId,
  question,
  myAnswer,
  partnerAnswer,
  partnerName
}: {
  promptId: number;
  question: string;
  myAnswer: string | null;
  partnerAnswer: string | null;
  partnerName: string | null;
}) {
  const [state, action] = useFormState(answerPromptAction, {});

  return (
    <div>
      <p className="flex items-start gap-2 font-display text-lg leading-snug text-ink">
        <Sparkles className="mt-1 h-4 w-4 shrink-0 text-rose" />
        {question}
      </p>

      {myAnswer ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-sand px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Tu</p>
            <p className="mt-0.5 text-sm text-ink">{myAnswer}</p>
          </div>
          {partnerAnswer ? (
            <div className="rounded-xl bg-rose-faint px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-deep">
                {partnerName}
              </p>
              <p className="mt-0.5 text-sm text-ink">{partnerAnswer}</p>
            </div>
          ) : (
            <p className="text-xs text-ink-soft">
              {partnerName} aún no ha respondido. Su respuesta aparecerá aquí.
            </p>
          )}
        </div>
      ) : (
        <form action={action} className="mt-4 space-y-2.5">
          <input type="hidden" name="promptId" value={promptId} />
          <Textarea name="answer" rows={2} maxLength={500} placeholder="Tu respuesta..." required />
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-soft">
              {partnerAnswer !== null
                ? `${partnerName} ya respondio: responde para verlo`
                : "La respuesta del otro se revela al responder"}
            </p>
            <SendButton />
          </div>
          <FieldError>{state.error}</FieldError>
        </form>
      )}
    </div>
  );
}
