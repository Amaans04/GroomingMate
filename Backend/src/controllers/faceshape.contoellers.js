import axios from "axios";
import FormData from "form-data";

// Ensure ML_SERVER_URL doesn't have trailing slash to avoid //predict
const ML_SERVER_URL = (process.env.ML_SERVER_URL || "http://localhost:8000").replace(/\/$/, "");

async function uploadImageandPredict (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename   : req.file.originalname,
      contentType: req.file.mimetype,
    });

    const { data } = await axios.post(`${ML_SERVER_URL}/predict`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    return res.status(200).json(data);

  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({ error: "ML service unavailable. Try again later." });
    }
    if (err.code === "ECONNABORTED") {
      return res.status(504).json({ error: "ML service timed out. Try again." });
    }
    if (err.response?.data) {
      return res.status(err.response.status).json(err.response.data);
    }
    console.error("[faceshape] Error:", err.message);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

async function checkHealth(_req, res) {
  try {
    const { data } = await axios.get(`${ML_SERVER_URL}/`, { timeout: 5000 });
    return res.status(200).json({ status: "ok", ml_server: data });
  } catch {
    return res.status(503).json({ status: "ml_server_down" });
  }
};

export default {uploadImageandPredict,checkHealth}