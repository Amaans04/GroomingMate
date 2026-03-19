import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.route.js"
import passport from "./passport/passport.js";
import passportBase from "passport";

const app = express();
app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  })
);
app.use(cookieParser())
app.use(express.json())
app.use(passportBase.initialize());

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});
//logging incoming requests for testing purposes
// app.use((req, res, next) => {
//   console.log("----- Incoming Request -----");
//   console.log("Method:", req.method);
//   console.log("URL:", req.url);

//   const body = { ...req.body };

//   console.log("Body:", body);
//   console.log("-----------------------------");

//   next();
// });

app.use('/auth/api', authRoutes)


export default app;