import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import type { Question } from "@/lib/game";

export const profiles = pgTable("quiz_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 24 }).notNull(),
  avatar: integer("avatar").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rooms = pgTable("quiz_rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  hostToken: uuid("host_token").defaultRandom().notNull(),
  status: varchar("status", { length: 16 }).notNull().default("lobby"),
  packId: text("pack_id").notNull().default("mix"),
  packTitle: text("pack_title").notNull().default("Le grand mélange"),
  questions: jsonb("questions").$type<Question[]>().notNull().default([]),
  questionIndex: integer("question_index").notNull().default(0),
  questionStartedAt: timestamp("question_started_at", { withTimezone: true }),
  remainingSeconds: integer("remaining_seconds").notNull().default(20),
  shopEnabled: boolean("shop_enabled").notNull().default(true),
  votingEnabled: boolean("voting_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const players = pgTable("quiz_players", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  token: uuid("token").defaultRandom().notNull(),
  name: varchar("name", { length: 24 }).notNull(),
  avatar: integer("avatar").notNull().default(0),
  score: integer("score").notNull().default(0),
  coins: integer("coins").notNull().default(150),
  doubleNext: boolean("double_next").notNull().default(false),
  shield: boolean("shield").notNull().default(false),
  hint: boolean("hint").notNull().default(false),
  vote: text("vote"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});

export const answers = pgTable("quiz_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  questionIndex: integer("question_index").notNull(),
  answerIndex: integer("answer_index").notNull(),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex("quiz_one_answer").on(t.roomId, t.playerId, t.questionIndex)]);

export const quizzes = pgTable("quiz_custom_packs", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 80 }).notNull(),
  description: text("description").notNull().default("Créé avec amour, joué entre amis."),
  questions: jsonb("questions").$type<Question[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scores = pgTable("quiz_high_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 24 }).notNull(),
  score: integer("score").notNull(),
  correct: integer("correct").notNull(),
  total: integer("total").notNull(),
  packName: varchar("pack_name", { length: 80 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
