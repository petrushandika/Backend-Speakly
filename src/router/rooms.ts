import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { rooms, roomMembers, users } from "../db/schema";
import { sql } from "drizzle-orm";

export const roomsRouter = router({
  getActive: protectedProcedure.query(async () => {
    return db.query.rooms.findMany({
      where: eq(rooms.isActive, true),
      with: { members: true, host: { columns: { displayName: true } } },
      limit: 20,
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name:  z.string().min(1).max(100),
        topic: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [room] = await db
        .insert(rooms)
        .values({ name: input.name, topic: input.topic, hostId: user.id })
        .returning();

      // Host joins automatically
      await db.insert(roomMembers).values({ roomId: room.id, userId: user.id });

      return room;
    }),

  join: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const room = await db.query.rooms.findFirst({
        where: and(eq(rooms.id, input.roomId), eq(rooms.isActive, true)),
        with: { members: true },
      });
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      if (room.members.length >= room.maxMembers) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Room is full" });
      }

      await db
        .insert(roomMembers)
        .values({ roomId: input.roomId, userId: user.id })
        .onConflictDoNothing();

      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await db
        .delete(roomMembers)
        .where(and(eq(roomMembers.roomId, input.roomId), eq(roomMembers.userId, user.id)));

      const remainingMembers = await db.query.roomMembers.findMany({
        where: eq(roomMembers.roomId, input.roomId),
      });

      if (remainingMembers.length === 0) {
        await db
          .update(rooms)
          .set({ isActive: false })
          .where(eq(rooms.id, input.roomId));
      }

      return { success: true };
    }),

  close: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await db
        .update(rooms)
        .set({ isActive: false })
        .where(and(eq(rooms.id, input.roomId), eq(rooms.hostId, user.id)));

      return { success: true };
    }),
});
