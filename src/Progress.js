import { useState, useEffect } from "react";
import { useApp, Card, CardLabel } from "../App";
import { SPECIALTIES } from "../constants";

export default function Dashboard() {
  const { events, progress, documents, setActiveView } = useApp();

  const nextExam = events
    .filter((e) => e.type === "exam" && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  const [countdown, setCountdown] = useState({ d: 0, h: "00", m: "00" });

  useEffect(() => {
    if (!nextExam) return;
    const tick = () => {
      const diff = new Date(`${nextExam.date}T${nextExam.time || "09:00"}`) - new Date();
      if (diff <= 0) return;
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
      });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [nextExam]);

  const today = new Date().toISOString().split("T")[0];
  const todayTopics = events
    .filter((e) => e.date === today && e.type === "class")
    .sort((a, b) => a.time?.localeCompare(b.time));

  const quickSearch = (term) => {
    setActiveView("search");
    setTimeout(() => {
      const el = document.getElementById("search-input-main");
      if (el) { el.value = term; el.dispatchEvent(new Event("input", { bubbles: true })); }
    }, 100);
  };

  return (
    <div className="dash-grid view-enter">

      <Card className="exam-card">
        <CardLabel>Prochain examen</CardLabel>
        {nextExam ? (
          <>
            <div className="exam-name">{nextExam.title.replace("Examen — ", "")}</div>
            <div className="exam-spec">
              {SPECIALTIES.find((s) => s.id === nextExam.specialty)?.label} · {nextExam.date}
            </div>
            <div className="countdown">
              <div className="cd-block">
                <span className="cd-num">{countdown.d}</span>
                <span className="cd-lbl">jours</span>
              </div>
              <span className="cd-sep">:</span>
              <div className="cd-block">
                <span className="cd-num">{countdown.h}</span>
                <span className="cd-lbl">heures</span>
              </div>
              <span className="cd-sep">:</span>
              <div className="cd-block">
                <span className="cd-num">{countdown.m}</span>
                <span className="cd-lbl">min</span>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>
            Aucun examen planifié. Ajoute-en un dans le Calendrier.
          </p>
        )}
      </Card>

      <Card>
        <CardLabel>Thèmes d'aujourd'hui</CardLabel>
        {todayTopics.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Aucun cours aujourd'hui 🌸</p>
        ) : (
          todayTopics.map((ev) => {
            const spec = SPECIALTIES.find((s) => s.id === ev.specialty);
            const doc  = documents.find((d) => d.id === ev.linkedDocId);
            return (
              <div key={ev.id} className="topic-row" onClick={() => quickSearch(ev.title.replace("Cours — ", ""))}>
                <span className="spec-dot" style={{ width: 8, height: 8, background: spec?.color || "#B0A8BB" }} />
                <div style={{ flex: 1 }}>
                  <div className="topic-name">{ev.title.replace("Cours — ", "")}</div>
                  <div className="topic-src">{doc?.name || spec?.label}</div>
                </div>
                <div className="topic-time">{ev.time}</div>
              </div>
            );
          })
        )}
      </Card>

      <Card style={{ gridRow: "1 / 3" }}>
        <CardLabel>Progression — cliquer pour gérer</CardLabel>
        {SPECIALTIES.map((spec) => {
          const p   = progress.find((x) => x.specialtyId === spec.id);
          const pct = p ? Math.round((p.topicsDone / p.topicsTotal) * 100) : 0;
          return (
            <div
              key={spec.id}
              className="prog-item"
              onClick={() => setActiveView("progress")}
              style={{ cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = ".7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <div className="prog-header">
                <span className="prog-name">{spec.label}</span>
                <span className="prog-pct">{pct}%</span>
              </div>
              <div className="prog-bar">
                <div className="prog-fill" style={{ width: `${pct}%`, background: spec.color }} />
              </div>
            </div>
          );
        })}
        <div
          onClick={() => setActiveView("progress")}
          style={{ marginTop: 14, fontSize: 11.5, color: "var(--rose)", cursor: "pointer", textAlign: "center" }}
        >
          → Gérer mes thèmes et marquer comme étudié
        </div>
      </Card>

      <Card style={{ gridColumn: "1 / 3" }}>
        <CardLabel>Accès rapides</CardLabel>
        <div className="quick-grid">
          {[
            { icon: "🔍", label: "Buscador IA",  desc: "Cherche dans tous tes PDFs, apuntes et Collèges", view: "search"   },
            { icon: "📚", label: "Bibliothèque", desc: "Tous tes documents classifiés automatiquement",    view: "library"  },
            { icon: "🏥", label: "Mode Hôpital", desc: "Références rapides pour les gardes et rotations",  view: "hospital" },
          ].map((item) => (
            <div key={item.view} className="quick-item" onClick={() => setActiveView(item.view)}>
              <div className="quick-icon">{item.icon}</div>
              <div className="quick-label">{item.label}</div>
              <div className="quick-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ gridColumn: "3 / 4", gridRow: "3 / 4" }}>
        <CardLabel>Rotations hospitalières</CardLabel>
        {[
          { badge: "badge-now",  label: "En cours", name: "Cardiologie — CHU Bordeaux", date: "→ 28 mars" },
          { badge: "badge-next", label: "Suivante", name: "Neurologie — Pellegrin",     date: "1 avr."    },
          { badge: "badge-soon", label: "À venir",  name: "Urgences Pédiatriques",      date: "mai"       },
          { badge: "badge-soon", label: "À venir",  name: "Gastro-entérologie",         date: "juin"      },
        ].map((r, i) => (
          <div key={i} className="rot-row">
            <span className={`badge ${r.badge}`}>{r.label}</span>
            <span className="rot-name">{r.name}</span>
            <span className="rot-date">{r.date}</span>
          </div>
        ))}
      </Card>

    </div>
  );
}