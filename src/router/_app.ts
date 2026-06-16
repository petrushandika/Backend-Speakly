import { router } from "../trpc";
import { usersRouter } from "./users";
import { lessonsRouter } from "./lessons";
import { srsRouter } from "./srs";
import { progressRouter } from "./progress";
import { grammarRouter } from "./grammar";
import { vocabularyRouter } from "./vocabulary";
import { roomsRouter } from "./rooms";
import { aiRouter } from "./ai";

export const appRouter = router({
  users: usersRouter,
  lessons: lessonsRouter,
  srs: srsRouter,
  progress: progressRouter,
  grammar: grammarRouter,
  vocabulary: vocabularyRouter,
  rooms: roomsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
