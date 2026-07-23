"use client";

import { useFormState, useFormStatus } from "react-dom";
import { answerPromptAction } from "@/actions/presence";
import { Button } from "@/components/ui/button";
import { Textarea, FieldError } from "@/components/ui/input";
import { QuestionStage, Reveal } from "@/features/questions/question-stage";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Responder
    </Button>
  );
}

// La pregunta del día, ahora protagonista del Home (it33): una sola pregunta
// en grande, con el mismo lenguaje visual que las cartas de los mazos.
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
  const name = partnerName ?? "tu pareja";

  return (
    <QuestionStage eyebrow="Pregunta de hoy" question={question}>
      {myAnswer ? (
        <Reveal myAnswer={myAnswer} partnerAnswer={partnerAnswer} partnerName={partnerName} />
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="promptId" value={promptId} />
          <Textarea name="answer" rows={3} maxLength={500} placeholder="Tu respuesta…" required />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-soft">
              {partnerAnswer !== null
                ? `${name} ya respondió: responde para verlo`
                : "La respuesta del otro se revela al responder"}
            </p>
            <SendButton />
          </div>
          <FieldError>{state.error}</FieldError>
        </form>
      )}
    </QuestionStage>
  );
}
