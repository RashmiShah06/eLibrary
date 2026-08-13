import express from "express";
import userRoutes from "./routes/user.route.js";
import bookRoutes from "./routes/book.route.js";

const app = express();

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);

export default app;