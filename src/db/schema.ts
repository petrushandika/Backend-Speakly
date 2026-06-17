import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  real,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id:                uuid("id").primaryKey().defaultRandom(),
  authId:            uuid("auth_id").unique().notNull(),
  email:             text("email").unique().notNull(),
  displayName:       text("display_name").notNull(),
  avatarUrl:         text("avatar_url"),
  bio:               text("bio"),
  nativeLanguage:    text("native_language"),
  country:           text("country"),
  cefrLevel:         text("cefr_level").notNull().default("B1"),
  goal:              text("goal").notNull().default("general"),
  domain:            text("domain").notNull().default("general"),
  accentPreference:  text("accent_preference").notNull().default("american"),
  streakDays:        integer("streak_days").notNull().default(0),
  xpTotal:           integer("xp_total").notNull().default(0),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

// ─── Lessons ─────────────────────────────────────────────────────────────────
export const lessons = pgTable("lessons", {
  id:          uuid("id").primaryKey().defaultRandom(),
  title:       text("title").notNull(),
  description: text("description"),
  cefrLevel:   text("cefr_level").notNull(),
  category:    text("category").notNull().default("grammar"),
  content:     jsonb("content").notNull().default({}),
  orderIndex:  integer("order_index").notNull().default(0),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ─── User Progress ────────────────────────────────────────────────────────────
export const userProgress = pgTable(
  "user_progress",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId:    uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    status:      text("status").notNull().default("not_started"),
    score:       integer("score"),
    xpEarned:    integer("xp_earned").notNull().default(0),
    completedAt: timestamp("completed_at"),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.lessonId)],
);

// ─── Flashcards (SRS) ────────────────────────────────────────────────────────
export const flashcards = pgTable(
  "flashcards",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    front:        text("front").notNull(),
    back:         text("back").notNull(),
    example:      text("example"),
    tags:         text("tags").array().default([]),
    easeFactor:   real("ease_factor").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(1),
    repetitions:  integer("repetitions").notNull().default(0),
    dueDate:      timestamp("due_date").notNull().defaultNow(),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_flashcards_user_due").on(t.userId, t.dueDate)],
);

// ─── Vocabulary ───────────────────────────────────────────────────────────────
export const vocabulary = pgTable(
  "vocabulary",
  {
    id:         uuid("id").primaryKey().defaultRandom(),
    userId:     uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    word:       text("word").notNull(),
    definition: text("definition").notNull(),
    example:    text("example"),
    cefrLevel:  text("cefr_level"),
    mastery:    integer("mastery").notNull().default(0),
    createdAt:  timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.word)],
);

// ─── Grammar Errors ───────────────────────────────────────────────────────────
export const userErrors = pgTable(
  "user_errors",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    userId:        uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    errorCategory: text("error_category").notNull(),
    originalText:  text("original_text").notNull(),
    correctedText: text("corrected_text"),
    context:       text("context"),
    createdAt:     timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_user_errors_user").on(t.userId, t.createdAt)],
);

// ─── Chat Messages ────────────────────────────────────────────────────────────
export const chatMessages = pgTable(
  "chat_messages",
  {
    id:             uuid("id").primaryKey().defaultRandom(),
    userId:         uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role:           text("role").notNull(),
    content:        text("content").notNull(),
    hasCorrection:  boolean("has_correction").notNull().default(false),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_chat_messages_user").on(t.userId, t.createdAt)],
);

// ─── Speaking Sessions ────────────────────────────────────────────────────────
export const speakingSessions = pgTable("speaking_sessions", {
  id:            uuid("id").primaryKey().defaultRandom(),
  userId:        uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  transcript:    text("transcript"),
  feedback:      jsonb("feedback"),
  durationSecs:  integer("duration_secs"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ─── Rooms ────────────────────────────────────────────────────────────────────
export const rooms = pgTable("rooms", {
  id:         uuid("id").primaryKey().defaultRandom(),
  name:       text("name").notNull(),
  topic:      text("topic"),
  hostId:     uuid("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isActive:   boolean("is_active").notNull().default(true),
  maxMembers: integer("max_members").notNull().default(4),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const roomMembers = pgTable(
  "room_members",
  {
    roomId:   uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    userId:   uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.roomId, t.userId)],
);

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  progress:         many(userProgress),
  flashcards:       many(flashcards),
  vocabulary:       many(vocabulary),
  errors:           many(userErrors),
  chatMessages:     many(chatMessages),
  speakingSessions: many(speakingSessions),
  rooms:            many(rooms),
  roomMemberships:  many(roomMembers),
}));

export const lessonsRelations = relations(lessons, ({ many }) => ({
  progress: many(userProgress),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user:   one(users,   { fields: [userProgress.userId],   references: [users.id] }),
  lesson: one(lessons, { fields: [userProgress.lessonId], references: [lessons.id] }),
}));

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  user: one(users, { fields: [flashcards.userId], references: [users.id] }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  host:    one(users,       { fields: [rooms.hostId], references: [users.id] }),
  members: many(roomMembers),
}));

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(rooms, { fields: [roomMembers.roomId], references: [rooms.id] }),
  user: one(users, { fields: [roomMembers.userId], references: [users.id] }),
}));
