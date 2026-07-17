// ============================================================
//  DOCTORA PETITE — Nous 💜
//  Vista para encontrar huecos para llamarse Diego & Manon
// ============================================================

import { useState, useRef } from "react";

const PALETTE = {
  lavanda:  "#FBF7FD",
  ciruela:  "#2D1B33",
  rosa:     "#E8849A",
  violeta:  "#7A4490",
  lila:     "#C8A4D4",
  lilaLight:"#EFE4F7",
  rojaLight:"#FCF0F3",
  white:    "#FFFFFF",
  muted:    "#9B8AAA",
};

const CALL_EMOJIS = ["📞","💬","🥂","☕","🌙","🌅","❤️","💜"];

// ─── API CALL ────────────────────────────────────────────────

async function analyzeSchedules(imageA, imageB, nameA, nameB) {
  const toBase64 = (dataUrl) => dataUrl.split(",")[1];
  const mediaType = (dataUrl) => dataUrl.split(";")[0].split(":")[1];

  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Voici les emplois du temps de deux personnes en relation longue distance : ${nameA} et ${nameB}.
Analyse les deux images et trouve les créneaux compatibles où ils peuvent s'appeler.

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans backticks.

Format exact :
{
  "scheduleA": {
    "name": "${nameA}",
    "summary": "résumé de 1-2 phrases de son emploi du temps",
    "busySlots": ["Lundi 8h-18h", "Mardi 9h-17h", ...]
  },
  "scheduleB": {
    "name": "${nameB}",
    "summary": "résumé de 1-2 phrases de son emploi du temps",
    "busySlots": ["Lundi 7h-20h", ...]
  },
  "freeSlots": [
    {
      "day": "Lundi",
      "time": "18h30 - 20h00",
      "quality": "ideal",
      "note": "courte explication pourquoi c'est bien"
    }
  ],
  "weeklyPlan": [
    { "day": "Lundi", "time": "19h00", "duration": "30 min", "type": "appel rapide" },
    { "day": "Jeudi", "time": "20h30", "duration": "1h", "type": "appel du soir" }
  ],
  "tenderNote": "un mot doux et encourageant pour ce couple en longue distance (en français, chaleureux)"
}`
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType(imageA),
            data: toBase64(imageA)
          }
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType(imageB),
            data: toBase64(imageB)
          }
        }
      ]
    }
  ];

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": localStorage.getItem("dp_apiKey") || "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur API: ${resp.status}`);
  }

  const data = await resp.json();
  const raw = data.content?.[0]?.text || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// ─── IMAGE UPLOADER ──────────────────────────────────────────

function ImageUploader({ name, emoji, color, image, onImage }) {
  const ref = useRef();

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !image && ref.current.click()}
      style={{
        flex: 1,
        minWidth: 0,
        border: `2px dashed ${image ? color : PALETTE.lila}`,
        borderRadius: 20,
        background: image ? `${color}08` : PALETTE.lilaLight,
        cursor: image ? "default" : "pointer",
        transition: "all 0.3s",
        overflow: "hidden",
        position: "relative",
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {image ? (
        <>
          <img
            src={image}
            alt={name}
            style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
          />
          <div style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            boxSizing: "border-box",
            background: PALETTE.white,
          }}>
            <span style={{ fontSize: 13, color: PALETTE.ciruela, fontWeight: 600 }}>
              {emoji} {name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onImage(null); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: PALETTE.muted, fontSize: 18, lineHeight: 1,
              }}
            >×</button>
          </div>
        </>
      ) : (
        <div style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
          <div style={{ fontWeight: 700, color: PALETTE.ciruela, fontSize: 15, marginBottom: 6 }}>
            {name}
          </div>
          <div style={{ color: PALETTE.muted, fontSize: 13 }}>
            Glisse ou clique pour ajouter<br />une photo de ton emploi du temps
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUALITY BADGE ───────────────────────────────────────────

function QualityBadge({ quality }) {
  const map = {
    ideal:  { label: "Idéal", bg: "#E8F5E9", color: "#388E3C" },
    good:   { label: "Bien",  bg: "#FFF8E1", color: "#F57F17" },
    ok:     { label: "Ok",    bg: "#EEF2FF", color: "#3949AB" },
  };
  const q = map[quality] || map.ok;
  return (
    <span style={{
      background: q.bg, color: q.color,
      borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
    }}>{q.label}</span>
  );
}

// ─── RESULTS ─────────────────────────────────────────────────

function Results({ result }) {
  const { scheduleA, scheduleB, freeSlots, weeklyPlan, tenderNote } = result;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Tender note */}
      <div style={{
        background: `linear-gradient(135deg, ${PALETTE.rosa}22, ${PALETTE.lila}33)`,
        borderRadius: 16, padding: "18px 22px",
        borderLeft: `4px solid ${PALETTE.rosa}`,
        color: PALETTE.ciruela, fontSize: 14, fontStyle: "italic", lineHeight: 1.6,
      }}>
        💜 {tenderNote}
      </div>

      {/* Summaries */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[scheduleA, scheduleB].map((s, i) => (
          <div key={i} style={{
            flex: 1, minWidth: 200,
            background: PALETTE.white, borderRadius: 14,
            padding: "14px 16px", border: `1px solid ${PALETTE.lila}55`,
          }}>
            <div style={{ fontWeight: 700, color: PALETTE.violeta, fontSize: 13, marginBottom: 6 }}>
              {i === 0 ? "👨‍💻" : "🩺"} {s.name}
            </div>
            <div style={{ fontSize: 12, color: PALETTE.muted, lineHeight: 1.5 }}>{s.summary}</div>
          </div>
        ))}
      </div>

      {/* Free slots */}
      <div>
        <div style={{ fontWeight: 700, color: PALETTE.ciruela, fontSize: 14, marginBottom: 10 }}>
          📅 Créneaux libres compatibles
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {freeSlots?.length > 0 ? freeSlots.map((slot, i) => (
            <div key={i} style={{
              background: PALETTE.white, borderRadius: 12,
              padding: "12px 16px", border: `1px solid ${PALETTE.lila}44`,
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 18 }}>{CALL_EMOJIS[i % CALL_EMOJIS.length]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: PALETTE.ciruela, fontSize: 13 }}>
                  {slot.day} · {slot.time}
                </div>
                <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 2 }}>{slot.note}</div>
              </div>
              <QualityBadge quality={slot.quality} />
            </div>
          )) : (
            <div style={{ color: PALETTE.muted, fontSize: 13, fontStyle: "italic" }}>
              Pas de créneaux détectés — la semaine est vraiment chargée 😔
            </div>
          )}
        </div>
      </div>

      {/* Weekly plan */}
      {weeklyPlan?.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, color: PALETTE.ciruela, fontSize: 14, marginBottom: 10 }}>
            🗓️ Plan d'appels de la semaine
          </div>
          <div style={{
            background: PALETTE.white, borderRadius: 14,
            border: `1px solid ${PALETTE.lila}44`, overflow: "hidden",
          }}>
            {weeklyPlan.map((item, i) => (
              <div key={i} style={{
                padding: "12px 16px",
                borderBottom: i < weeklyPlan.length - 1 ? `1px solid ${PALETTE.lila}33` : "none",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `${PALETTE.violeta}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>
                  📞
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: PALETTE.ciruela, fontSize: 13 }}>
                    {item.day} à {item.time}
                  </div>
                  <div style={{ fontSize: 12, color: PALETTE.muted }}>
                    {item.type} · {item.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN VIEW ───────────────────────────────────────────────

export default function Nous() {
  const [imageA, setImageA] = useState(null); // Diego
  const [imageB, setImageB] = useState(null); // Manon
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const canAnalyze = imageA && imageB && !loading;

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await analyzeSchedules(imageA, imageB, "Diego", "Manon");
      setResult(res);
    } catch (e) {
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImageA(null);
    setImageB(null);
    setResult(null);
    setError(null);
  };

  return (
    <div style={{
      padding: "28px 24px",
      maxWidth: 720,
      margin: "0 auto",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>💜</span>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 800,
            color: PALETTE.ciruela, letterSpacing: -0.5,
          }}>Nous</h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: PALETTE.muted, lineHeight: 1.5 }}>
          Partagez vos emplois du temps et trouvez les meilleurs moments pour vous appeler, même dans les semaines chargées.
        </p>
      </div>

      {/* Upload zone */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <ImageUploader
          name="Diego"
          emoji="👨‍💻"
          color={PALETTE.violeta}
          image={imageA}
          onImage={setImageA}
        />
        <ImageUploader
          name="Manon"
          emoji="🩺"
          color={PALETTE.rosa}
          image={imageB}
          onImage={setImageB}
        />
      </div>

      {/* CTA */}
      {!result && (
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          style={{
            width: "100%",
            padding: "15px 24px",
            background: canAnalyze
              ? `linear-gradient(135deg, ${PALETTE.violeta}, ${PALETTE.rosa})`
              : PALETTE.lila + "66",
            color: canAnalyze ? PALETTE.white : PALETTE.muted,
            border: "none",
            borderRadius: 16,
            fontWeight: 700,
            fontSize: 15,
            cursor: canAnalyze ? "pointer" : "not-allowed",
            transition: "all 0.3s",
            marginBottom: 8,
          }}
        >
          {loading ? "Analyse en cours…" : "✨ Trouver nos créneaux"}
        </button>
      )}

      {!imageA && !imageB && (
        <p style={{ textAlign: "center", fontSize: 12, color: PALETTE.muted, margin: "4px 0 0" }}>
          Ajoute les deux emplois du temps pour commencer
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          marginTop: 24, textAlign: "center",
          color: PALETTE.muted, fontSize: 13,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8, animation: "pulse 1.5s infinite" }}>💜</div>
          <div>L'IA analyse vos semaines…</div>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 16, padding: "14px 18px",
          background: "#FFF0F0", borderRadius: 12,
          borderLeft: `4px solid #E8849A`,
          color: "#C0526A", fontSize: 13,
        }}>
          ⚠️ {error}
          {error.includes("API") && (
            <div style={{ marginTop: 6, fontSize: 12, color: PALETTE.muted }}>
              Vérifie que ta clé API est configurée dans les paramètres ⚙️
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div style={{ marginTop: 8, marginBottom: 20 }}>
            <Results result={result} />
          </div>
          <button
            onClick={handleReset}
            style={{
              width: "100%", padding: "12px",
              background: "none",
              border: `1.5px solid ${PALETTE.lila}`,
              borderRadius: 14, color: PALETTE.muted,
              fontSize: 13, cursor: "pointer", fontWeight: 600,
            }}
          >
            🔄 Nouvelle semaine
          </button>
        </>
      )}
    </div>
  );
}
