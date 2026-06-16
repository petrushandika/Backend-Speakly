import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "hono";
import { supabase } from "./lib/supabase";

export interface TRPCContext extends Record<string, unknown> {
  userId: string | null;
}

export async function createContext(c: Context): Promise<TRPCContext> {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) return { userId: null };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { userId: null };

  return { userId: data.user.id };
}

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { userId: ctx.userId } });
});
