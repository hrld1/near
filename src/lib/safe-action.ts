import { requireCoupleAction } from "@/lib/couple";
import type { ActionResult, FormState } from "@/types";

// Envoltorios para server actions de pareja: sesión + pareja + try/catch
// viven aquí una sola vez en lugar de repetirse en cada action.
// OJO: no usar en actions que hagan redirect() (el catch se lo tragaria);
// auth.ts y couple.ts quedan fuera a proposito.

export type CoupleCtx = Awaited<ReturnType<typeof requireCoupleAction>>;

// Action RPC: (ctx, ...args) => ActionResult<T>
export function coupleAction<Args extends unknown[], T = undefined>(
  fn: (ctx: CoupleCtx, ...args: Args) => Promise<ActionResult<T>>
) {
  return async (...args: Args): Promise<ActionResult<T>> => {
    try {
      return await fn(await requireCoupleAction(), ...args);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Error" };
    }
  };
}

// Action de formulario (useFormState): (ctx, formData) => FormState
export function coupleFormAction(
  fn: (ctx: CoupleCtx, formData: FormData) => Promise<FormState>
) {
  return async (_prev: FormState, formData: FormData): Promise<FormState> => {
    try {
      return await fn(await requireCoupleAction(), formData);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error" };
    }
  };
}
