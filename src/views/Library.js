import { useState } from "react";
import { useApp, Card, Btn } from "../App";
import { SPECIALTIES, DOC_TYPES } from "../constants";

export default function Library() {
  const { documents, notify } = useApp();
  const [filter,    setFilter]    = useState("all");
  const [collapsed, setCollapsed] = useState({});

  const toggle = (key) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const filtered = documents.filter((d) => {
    if (filter === "all") return true;
    if (["college","pdf","note","case"].includes(filter)) return d.type === filter;
    return d.specialty === filter;
  });

  const sideFilters = [
    { id: "all",     label: "Tout voir",          dot: "var(--muted)" },
    { id: "college", label: "Collèges officiels", dot: "#C9897A" },
    { id: "pdf",     label: "PDFs Drive",         dot: "#5C4070" },
    { id: "note",    label: "Apuntes FreeNotes",  dot: "#8BA888" },
    { id: "case",    label: "Cas cliniques",       dot: "#C9A96E" },
  ];

  return (
    <div className="lib-layout view-enter">
      {/* Sidebar filters */}
      <aside>
        <Card className="lib-sidebar-card">
          <div className="lib-s-label">Type de source</div>
          {sideFilters.map((f) => (
            <button
              key={f.id}
              className={`lib-filter ${filter === f.id ? "active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: f.dot, display: "inline-block", flexShrink: 0 }} />
              {f.label}
            </button>
          ))}

          <div className="lib-s-label">Spécialités</div>
          {SPECIALTIES.map((s) => {
            const cnt = documents.filter((d) => d.specialty === s.id).length;
            return (
              <button
                key={s.id}
                className={`lib-filter ${filter === s.id ? "active" : ""}`}
                onClick={() => setFilter(s.id)}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
                {s.label}
                {cnt > 0 && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>{cnt}</span>}
              </button>
            );
          })}
        </Card>
      </aside>

      {/* Main content */}
      <div className="lib-main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <p style={{ fontSize: 13, color: "var(--soft)" }}>
            {filtered.length} document{filtered.length !== 1 ? "s" : ""} · classifiés par l'IA
          </p>
          <Btn variant="ghost" style={{ fontSize: 12 }}>☁ Importer PDF</Btn>
        </div>

        {/* Group by doc type */}
        {Object.entries(DOC_TYPES).map(([type, typeInfo]) => {
          const typeDocs = filtered.filter((d) => d.type === type);
          if (typeDocs.length === 0) return null;
          const key = "sec-" + type;
          return (
            <Card key={type} className="lib-section">
              <div className="lib-sec-header" onClick={() => toggle(key)}>
                <div className="lib-sec-title">
                  {typeInfo.icon} {typeInfo.label}
                  <em className="lib-count">{typeDocs.length}</em>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {collapsed[key] ? "▸" : "▾"}
                </span>
              </div>

              {!collapsed[key] && (
                <div className="docs-grid">
                  {typeDocs.map((doc) => {
                    const spec = SPECIALTIES.find((s) => s.id === doc.specialty);
                    return (
                      <div
                        key={doc.id}
                        className="doc-card"
                        onClick={() => notify("📄", doc.name, doc.summary || "Document ouvert.")}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = typeInfo.color; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(61,43,79,.08)"; }}
                      >
                        <div className="doc-stripe" style={{ background: typeInfo.color }} />
                        <span className="doc-icon">{typeInfo.icon}</span>
                        <div className="doc-name">{doc.name}</div>
                        <div className="doc-meta">{spec?.label || ""} · {doc.pages || "?"} p.</div>
                      </div>
                    );
                  })}
                  <div className="doc-card doc-add">
                    <span style={{ fontSize: 22, opacity: .4 }}>＋</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Ajouter</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>
              Aucun document trouvé.<br />Importe tes PDFs depuis Google Drive.
            </p>
          </Card>
        )}

        <div className="upload-zone">
          ☁ Importer un nouveau PDF ou apunte de FreeNotes — cliquez ici
        </div>
      </div>
    </div>
  );
}