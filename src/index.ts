import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*" }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes (to be implemented per sprint)
// import aiRoutes from "./routes/ai";
// import speechRoutes from "./routes/speech";
// import lessonRoutes from "./routes/lessons";
// import progressRoutes from "./routes/progress";
// import srsRoutes from "./routes/srs";
// import usersRoutes from "./routes/users";
// import roomsRoutes from "./routes/rooms";
// import grammarRoutes from "./routes/grammar";
// import vocabularyRoutes from "./routes/vocabulary";

// app.use("/ai", aiRoutes);
// app.use("/speech", speechRoutes);
// app.use("/lessons", lessonRoutes);
// app.use("/progress", progressRoutes);
// app.use("/srs", srsRoutes);
// app.use("/users", usersRoutes);
// app.use("/rooms", roomsRoutes);
// app.use("/grammar", grammarRoutes);
// app.use("/vocabulary", vocabularyRoutes);

app.listen(PORT, () => {
  console.log(`speakly-api running on http://localhost:${PORT}`);
});

export default app;
