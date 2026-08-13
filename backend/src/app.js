import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import userRoutes from "./routes/user.route.js";
import bookRoutes from "./routes/book.route.js";
import borrowRoutes from "./routes/borrow.route.js";
import reservationRoutes from "./routes/reservation.route.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/borrow", borrowRoutes);
app.use("/api/reservations", reservationRoutes);

export default app;