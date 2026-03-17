import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.route.js"
import { configDotenv } from 'dotenv'
configDotenv();

const app = express();
app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  })
);
app.use(cookieParser())
app.use(express.json())

app.use('/auth/api', authRoutes)

export default app;