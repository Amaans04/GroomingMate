// Frontend/src/pages/FaceShape.jsx

import { useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const SHAPE_COLORS = {
  Heart : "text-rose-400",
  Oval  : "text-teal-400",
  Square: "text-sky-400",
};

const SHAPE_BAR_COLORS = {
  Heart : "bg-rose-400",
  Oval  : "bg-teal-400",
  Square: "bg-sky-400",
};

const SHAPE_EMOJIS = {
  Heart : "🫀",
  Oval  : "🥚",
  Square: "⬛",
};

// ── API call — same pattern as auth functions in AuthContext ──
async function predictFaceShape(imageFile) {
  const form = new FormData();
  form.append("image", imageFile);

  const res = await api.post("/faceshape/api/predict-face-shape", form, {
    headers        : { "Content-Type": "multipart/form-data" },
    withCredentials: true,
  });

  return { ok: true, data: res.data };
}

// ── Component ─────────────────────────────────────────────────
export default function FaceShape() {
  const { user } = useAuth();

  const [image,     setImage]     = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [dragging,  setDragging]  = useState(false);

  const fileRef = useRef();

  // ── File handling ────────────────────────────────────────────

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload a valid image (JPG or PNG)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }
    setError("");
    setResult(null);
    setImage(URL.createObjectURL(file));
    setImageFile(file);
  };

  const onFileChange = (e) => handleFile(e.target.files[0]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);

  // ── Predict ──────────────────────────────────────────────────

  const analyse = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data } = await predictFaceShape(imageFile);
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError("");
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex justify-center px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-5">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-1">
            ✨ Face Shape Detector
          </h1>
          {user?.username && (
            <p className="text-gray-500 text-sm mb-1">Hey, {user.username} 👋</p>
          )}
          <p className="text-gray-400 text-sm">
            Upload a clear frontal photo to discover your face shape
          </p>
          <p className="text-gray-600 text-xs mt-1">
            📸 Best results: frontal face · good lighting · hair away from face
          </p>
        </div>

        {/* Upload dropzone */}
        {!result && (
          <div
            onClick={() => fileRef.current.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`
              border-2 border-dashed rounded-2xl p-8 cursor-pointer
              flex justify-center items-center min-h-[200px]
              bg-[#1a1a1a] transition-colors duration-200
              ${dragging ? "border-teal-400" : "border-[#333] hover:border-[#555]"}
            `}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />

            {image ? (
              <img
                src={image}
                alt="Preview"
                className="max-h-72 max-w-full rounded-xl object-contain"
              />
            ) : (
              <div className="text-center select-none">
                <p className="text-5xl mb-3">📷</p>
                <p className="text-gray-300 text-sm">
                  Drop your photo here or click to browse
                </p>
                <p className="text-gray-600 text-xs mt-1">JPG, PNG — max 10 MB</p>
              </div>
            )}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-rose-950 border border-rose-500/30 text-rose-400 text-sm rounded-xl px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        {/* Buttons */}
        {image && !result && (
          <div className="flex gap-3">
            <button
              onClick={analyse}
              disabled={loading}
              className={`
                flex-1 py-3 rounded-xl font-semibold text-sm text-[#0f0f0f]
                bg-teal-400 transition-opacity
                ${loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90 active:opacity-80"}
              `}
            >
              {loading ? "🔍 Analysing..." : "🔍 Analyse Face Shape"}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 rounded-xl font-semibold text-sm text-gray-300 bg-[#2a2a2a] hover:bg-[#333] transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-10 h-10 border-4 border-[#333] border-t-teal-400 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">
              Detecting face and running model...
            </p>
          </div>
        )}

        {/* ── Result ── */}
        {result && !loading && (
          <div className="flex flex-col gap-4">

            {/* Photo + shape card */}
            <div className="flex gap-4 items-start">
              <img
                src={image}
                alt="Your photo"
                className="w-36 h-36 object-cover rounded-xl flex-shrink-0"
              />

              <div className="flex-1 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-4 border border-[#2a2a3e]">
                <p className={`text-xl font-bold mb-2 ${SHAPE_COLORS[result.prediction] || "text-white"}`}>
                  {SHAPE_EMOJIS[result.prediction]}  {result.prediction} Face
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {result.info?.description}
                </p>

                {!result.face_detected && (
                  <div className="mt-3 bg-amber-950/60 border border-amber-500/30 text-amber-400 text-xs rounded-lg px-3 py-2">
                    ⚠️ No face detected — using full image
                  </div>
                )}
                {result.confidence < 0.65 && (
                  <div className="mt-2 bg-amber-950/60 border border-amber-500/30 text-amber-400 text-xs rounded-lg px-3 py-2">
                    ⚠️ Low confidence ({(result.confidence * 100).toFixed(0)}%) — could also
                    be <span className="font-semibold">{result.all_scores[1]?.class}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Confidence bars */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4">
              <h3 className="text-white font-semibold text-sm mb-4">📊 Confidence</h3>
              <div className="flex flex-col gap-3">
                {result.all_scores.map(({ class: cls, confidence }) => (
                  <div key={cls} className="flex items-center gap-3">
                    <span className="text-gray-300 text-sm w-14 shrink-0">{cls}</span>
                    <div className="flex-1 bg-[#2a2a2a] rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${SHAPE_BAR_COLORS[cls] || "bg-teal-400"}`}
                        style={{ width: `${(confidence * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <span className="text-gray-500 text-xs w-12 text-right shrink-0">
                      {(confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hairstyle tips */}
            {result.info && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4">
                <h3 className="text-white font-semibold text-sm mb-4">💇 Hairstyle Tips</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wide">
                      ✅ Works great
                    </p>
                    <div className="flex flex-col gap-2">
                      {result.info.hairstyles.map((s) => (
                        <div
                          key={s}
                          className="bg-[#111] border-l-2 border-teal-400 rounded-lg px-3 py-2 text-gray-300 text-xs leading-relaxed"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wide">
                      ❌ Avoid
                    </p>
                    <div className="flex flex-col gap-2">
                      {result.info.avoid.map((s) => (
                        <div
                          key={s}
                          className="bg-[#1a0f0f] border-l-2 border-rose-500 rounded-lg px-3 py-2 text-gray-300 text-xs leading-relaxed"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Try again */}
            <button
              onClick={reset}
              className="w-full py-3 rounded-xl font-semibold text-sm text-[#0f0f0f] bg-teal-400 hover:opacity-90 active:opacity-80 transition-opacity"
            >
              Try Another Photo
            </button>

            <p className="text-gray-700 text-xs text-center pb-2">
              Results are AI-generated and for guidance only 😊
            </p>

          </div>
        )}

      </div>
    </div>
  );
}