// Backend/src/routes/faceshape.route.js

import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import faceshapeContoellers from "../controllers/faceshape.contoellers.js";

const router = express.Router();

// const ML_SERVER_URL = process.env.ML_SERVER_URL || "http://localhost:8000";

// Memory storage — no disk write, forward straight to Python
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Both endpoints support the same handler for backward compatibility
router.post("/predict-face-shape", upload.single("image"), faceshapeContoellers.uploadImageandPredict);
router.post("/predict", upload.single("image"), faceshapeContoellers.uploadImageandPredict);
router.get("/health", faceshapeContoellers.checkHealth);

// POST /faceshape/api/predict
// Auth is already verified by the middleware mounted in app.js
// router.post("/predict", upload.single("image"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No image uploaded" });
//     }

//     const form = new FormData();
//     form.append("file", req.file.buffer, {
//       filename   : req.file.originalname,
//       contentType: req.file.mimetype,
//     });

//     const { data } = await axios.post(`${ML_SERVER_URL}/predict`, form, {
//       headers: form.getHeaders(),
//       timeout: 30000,
//     });

//     return res.status(200).json(data);

//   } catch (err) {
//     if (err.code === "ECONNREFUSED") {
//       return res.status(503).json({ error: "ML service unavailable. Try again later." });
//     }
//     if (err.code === "ECONNABORTED") {
//       return res.status(504).json({ error: "ML service timed out. Try again." });
//     }
//     if (err.response?.data) {
//       return res.status(err.response.status).json(err.response.data);
//     }
//     console.error("[faceshape] Error:", err.message);
//     return res.status(500).json({ error: "Something went wrong" });
//   }
// });

router.post('predict-face-shape', upload.single("image"),faceshapeContoellers.uploadImageandPredict)
router.get('/health', faceshapeContoellers.checkHealth)


// GET /faceshape/api/health
// router.get("/health", async (_req, res) => {
//   try {
//     const { data } = await axios.get(`${ML_SERVER_URL}/`, { timeout: 5000 });
//     return res.status(200).json({ status: "ok", ml_server: data });
//   } catch {
//     return res.status(503).json({ status: "ml_server_down" });
//   }
// });


export default router;
