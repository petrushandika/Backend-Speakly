import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../lib/supabase";
import { TRPCError } from "@trpc/server";

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const roomsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
        topic: z.string().optional(),
        durationMins: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const roomCode = generateRoomCode();

      const { data: room, error } = await supabase
        .from("peer_rooms")
        .insert({
          room_code: roomCode,
          host_id: ctx.userId,
          cefr_level: input.cefrLevel,
          topic: input.topic,
          duration_mins: input.durationMins,
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      await supabase.from("room_participants").insert({
        room_id: room.id,
        user_id: ctx.userId,
      });

      return room;
    }),

  join: protectedProcedure
    .input(z.object({ roomCode: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const { data: room, error } = await supabase
        .from("peer_rooms")
        .select("*")
        .eq("room_code", input.roomCode.toUpperCase())
        .eq("status", "waiting")
        .single();

      if (error || !room) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });

      await supabase.from("room_participants").insert({
        room_id: room.id,
        user_id: ctx.userId,
      });

      await supabase.from("peer_rooms").update({ status: "active", started_at: new Date().toISOString() }).eq("id", room.id);

      return room;
    }),

  getActive: protectedProcedure
    .input(z.object({ cefrLevel: z.string().optional() }))
    .query(async ({ input }) => {
      let query = supabase.from("peer_rooms").select("*, room_participants(count)").eq("status", "waiting");
      if (input.cefrLevel) query = query.eq("cefr_level", input.cefrLevel);

      const { data } = await query.limit(10);
      return data ?? [];
    }),

  end: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await supabase
        .from("peer_rooms")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", input.roomId);

      return { success: true };
    }),
});
