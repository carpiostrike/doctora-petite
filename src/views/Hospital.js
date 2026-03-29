import { useState } from "react";
import { useApp, ThinkingDots, semanticSearch } from "../App";

const QUICK_REFS = [
  "Lecture ECG", "Score Glasgow", "Score Wells", "NFS normale",
  "ATB guidelines", "Anticoagulants", "Antalgiques paliers", "Critères hospitalisation",
];

const CARDS = [
  { icon: "🚨", title: "Protocoles urgence",  desc: "Conduites à tenir depuis tes documents",     query: "protocoles urgence" },
  { icon: "💊", title: "Posologies",           desc: "Référence de doses depuis tes PDFs",         query: "posologies traitements" },
  { icon: "🩺", title: "Sémiologie rapide",    desc: "Fiches sémiologiques par spécialité",        query: "sémiologie rapide" },
  { icon: "🔬", title: "Valeurs biologiques",  desc: "Normes et interprétation des examens",       query: "valeurs biologiques normales" },
];

export default function Hospital() {
  const { documents, apiKey, notify, setSettingsOpen } = useApp();
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const doSearch = async (term) => {
    const q = term || query;
    if (!q.trim()) return;
    if (!apiKey) {
      setSettingsOpen(true);
      notify("⚙️", "Clé API manquante", "Configure ta clé Claude dans ⚙ Paramètres.");
      return;
    }
    setQuery(q);
    setLoading(true);
    setResults(null);
    try {
      const data = await semanticSearch(apiKey, q, documents);
      setResults(data);
    } catch (e) {
      notify("❌", "Erreur", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hosp-wrap view-enter">
      {/* Header */}
      <div className="hosp-head">
        <h2 className="hosp-title">Mode <em>Hôpital</em></h2>
        <div className="hosp-badge">
          <div className="pulse-dot on" />
          Cardio — CHU Bordeaux
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 18 }}>
        <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "rgba(255,255,255,.35)" }}>🔍</span>
        <input
          type="text"
          className="hosp-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Recherche rapide dans tes documents…"
          style={{ paddingLeft: 48 }}
        />
      </div>

      {/* Quick ref chips */}
      <div className="hosp-quick">
        {QUICK_REFS.map((ref) => (
          <button key={ref} className="hosp-chip" onClick={() => doSearch(ref)}>
            {ref}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <ThinkingDots dark />}

      {/* Results */}
      {!loading && results && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 10 }}>
            {results.totalFound || results.results?.length} résultat{(results.results?.length || 0) !== 1 ? "s" : ""} — source : tes documents
          </p>
          {(results.results || []).slice(0, 3).map((r, i) => (
            <div key={i} className="hosp-result">
              <div className="hosp-result-title">{r.matchedSection || r.docName}</div>
              <div className="hosp-result-source">📍 {r.docName}</div>
              <div className="hosp-result-summary">{r.summary}</div>
            </div>
          ))}
          {results.results?.length === 0 && (
            <p style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>
              Aucun résultat pour «&nbsp;{query}&nbsp;» dans tes documents.
            </p>
          )}
        </div>
      )}

      {/* Category cards (shown when no results) */}
      {!loading && !results && (
        <div className="hosp-grid">
          {CARDS.map((c) => (
            <div key={c.title} className="hosp-card" onClick={() => doSearch(c.query)}>
              <div className="hosp-card-icon">{c.icon}</div>
              <div className="hosp-card-title">{c.title}</div>
              <div className="hosp-card-desc">{c.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}