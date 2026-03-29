import { useState } from "react";
import { useApp, Btn, Tag, ThinkingDots, semanticSearch } from "../App";
import { SPECIALTIES, DOC_TYPES } from "../constants";

const FILTERS = [
  { id: "all",     label: "Tout" },
  { id: "college", label: "📖 Collèges" },
  { id: "pdf",     label: "📄 PDFs" },
  { id: "note",    label: "📝 Notes" },
  { id: "case",    label: "🔬 Cas cliniques" },
  ...SPECIALTIES.slice(0, 5).map((s) => ({ id: s.id, label: `${s.icon} ${s.label}` })),
];

export default function Search() {
  const { documents, apiKey, notify, setSettingsOpen } = useApp();
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState(null); // null = empty state
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState("all");

  const doSearch = async (q = query) => {
    if (!q.trim()) return;

    if (!apiKey) {
      setSettingsOpen(true);
      notify("⚙️", "Clé API manquante", "Configure ta clé Claude dans ⚙ Paramètres.");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const data = await semanticSearch(apiKey, q, documents);
      setResults(data);
    } catch (e) {
      notify("❌", "Erreur IA", e.message);
      setResults({ results: [], totalFound: 0, suggestion: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Client-side filter
  const filtered = (results?.results || []).filter((r) => {
    if (filter === "all") return true;
    if (["college","pdf","note","case"].includes(filter)) return r.docType === filter;
    return r.specialty === filter;
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);

  return (
    <div className="view-enter">
      {/* Search bar */}
      <div className="search-wrap">
        <span className="search-icon-pos">🔍</span>
        <input
          id="search-input-main"
          type="text"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Rechercher un thème, une maladie, un symptôme…"
        />
        <Btn
          variant="primary"
          onClick={() => doSearch()}
          disabled={loading}
          style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", padding: "8px 18px" }}
        >
          Rechercher
        </Btn>
      </div>

      {/* Filter chips */}
      <div className="chips">
        {FILTERS.map((f) => (
          <div
            key={f.id}
            className={`chip ${filter === f.id ? "active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </div>
        ))}
      </div>

      {/* Results area */}
      {loading && <ThinkingDots />}

      {!loading && results === null && (
        <div className="empty-state">
          <div className="empty-icon">✦</div>
          <p>
            Recherche sémantique dans tes PDFs, apuntes et Collèges.<br />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {apiKey
                ? "Toutes les réponses viennent uniquement de tes documents."
                : "⚙ Configure ta clé Claude dans Paramètres pour activer la recherche IA."}
            </span>
          </p>
          {!apiKey && (
            <Btn
              variant="primary"
              onClick={() => setSettingsOpen(true)}
              style={{ marginTop: 16 }}
            >
              ⚙ Configurer la clé API
            </Btn>
          )}
        </div>
      )}

      {!loading && results !== null && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>
            Aucun résultat dans tes documents pour «&nbsp;<strong>{query}</strong>&nbsp;».<br />
            {results.suggestion && (
              <span style={{ color: "var(--gold)", fontSize: 12 }}>{results.suggestion}</span>
            )}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""} dans tes documents pour «&nbsp;
            <strong style={{ color: "var(--ink)" }}>{query}</strong>&nbsp;»
          </p>

          {filtered.map((r, i) => {
            const typeInfo = DOC_TYPES[r.docType] || DOC_TYPES.pdf;
            return (
              <div key={i} className="result-card">
                <div className="result-header">
                  <div className="result-title">{r.matchedSection || r.docName}</div>
                  <div className="result-tags">
                    <Tag type={r.docType} />
                    <span className="pct-badge">{r.relevanceScore}%</span>
                  </div>
                </div>
                <div className="result-source">📍 {r.docName}</div>
                <div className="result-summary">{r.summary}</div>
                {r.keyTerms?.length > 0 && (
                  <div className="key-terms">
                    {r.keyTerms.map((t) => (
                      <span key={t} className="key-term">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}