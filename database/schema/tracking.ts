import {
    index,
    integer,
    primaryKey,
    real,
    sqliteTable,
    text,
} from "drizzle-orm/sqlite-core";

export const trackingSession = sqliteTable("tracking_session", {
  id: text("id").primaryKey(), // UUID string (generate di app)
  user_id: text("user_id").notNull(),
  mode: text("mode"), // car | bike | walk
  started_at: integer("started_at", { mode: "timestamp" })
    .notNull(),
  ended_at: integer("ended_at", { mode: "timestamp" }),
});

export const trackingPoints = sqliteTable(
  "tracking_points",
  {
    session_id: text("session_id").notNull(),
    recorded_at: integer("recorded_at", { mode: "timestamp" }).notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    speed: real("speed"), // m/s
    bearing: real("bearing"), // degrees
    elevation: real("elevation"),
    accuracy: real("accuracy"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.session_id, table.recorded_at] }),
    sessionIdx: index("tracking_points_session_idx").on(table.session_id),
    recordedAtIdx: index("tracking_points_recorded_at_idx").on(table.recorded_at),
  })
);