// ============================================================
//  DOCTORA PETITE — SettingsModal.js
//  Credenciales guardadas en Supabase (sync entre dispositivos)
// ============================================================

import { useState, useEffect } from "react";
import { useApp, Modal, Field, Btn } from "../App";
import { extractSheetId } from "../hooks/useGoogleSheets";
import { supabase } from "../lib/supabaseClient";

const CONFIG_ID = "manon_config";

async function loadConfigFromSupabase() {
  const { data } = await supabase
    .from("config")
    .select("*")
    .eq("id", CONFIG_ID)
    .single();
  return data || null;
}

async function saveConfigToSupabase(fields) {
  const { error } = await supabase
    .from("config")
    .upsert({ id: CONFIG_ID, ...fields }, { onConflict: "id" });
  if (error) throw error;
}

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, apiKey, setApiKey, notify } = useApp();

  const [localKey,   setLocalKey]   = useState(apiKey);
  const [sheetUrl,   setSheetUrl]   = useState("");
  const [gapiKey,    setGapiKey]    = useState("");
  const [sheetSaved, setSheetSaved] = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(true);

  const sheetId = extractSheetId(sheetUrl);

  // ── Cargar config desde Supabase al abrir ─────────────────
  useEffect(() => {
    if (!settingsOpen) return;
    setLoadingCfg(true);
    loadConfigFromSupabase()
      .then(data => {
        if (data) {
          if (data.sheet_url) setSheetUrl(data.sheet_url);
          if (data.gapi_key)  setGapiKey(data.gapi_key);
          if (data.claude_key) {
            setApiKey(data.claude_key);
            setLocalKey(data.claude_key);
            localStorage.setItem("dp_apiKey", data.claude_key);
          }
          // También actualizar localStorage para hooks que lo usan
          if (data.sheet_url) localStorage.setItem("dp_sheet_url", data.sheet_url);
          if (data.gapi_key)  localStorage.setItem("dp_gapi_key",  data.gapi_key);
        }
      })
      .catch(() => {
        // Si falla Supabase, usar localStorage como fallback
        setSheetUrl(localStorage.getItem("dp_sheet_url") || "");
        setGapiKey(localStorage.getItem("dp_gapi_key")   || "");
      })
      .finally(() => setLoadingCfg(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen]);

  // ── Guardar Claude Key ────────────────────────────────────
  const saveClaudeKey = async () => {
    const key = localKey.trim();
    setApiKey(key);
    localStorage.setItem("dp_apiKey", key);
    try {
      await saveConfigToSupabase({ claude_key: key });
    } catch {}
    setSettingsOpen(false);
    notify("✅", "Clé Claude sauvegardée", "Active sur tous tes appareils 🌸");
  };

  // ── Guardar Google Sheets config ──────────────────────────
  const saveSheet = async () => {
    const url = sheetUrl.trim();
    const key = gapiKey.trim();
    // Guardar en localStorage para uso inmediato
    localStorage.setItem("dp_sheet_url", url);
    localStorage.setItem("dp_gapi_key",  key);
    // Guardar en Supabase para sync entre dispositivos
    try {
      await saveConfigToSupabase({ sheet_url: url, gapi_key: key });
      setSheetSaved(true);
      setTimeout(() => setSheetSaved(false), 2000);
      notify("✅", "Configuration sauvegardée", "Disponible sur tous tes appareils 🌸");
    } catch (err) {
      notify("❌", "Erreur Supabase", err.message);
    }
  };

  return (
    <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="⚙ Paramètres">

      <div className="settings-info">
        ☁️ <strong>Sync multi-appareils</strong> — Tes paramètres sont sauvegardés dans le cloud.
        Configure une seule fois, fonctionne partout.
      </div>

      {loadingCfg ? (
        <div style={{ textAlign:"center", padding:"20px 0", color:"var(--muted)", fontSize:13 }}>
          Chargement de ta configuration…
        </div>
      ) : (
        <>
          {/* ── Claude API Key ── */}
          <Field label="Clé API Claude (Anthropic)">
            <input
              type="password"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="sk-ant-api03-…"
            />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              Obtenir sur{" "}
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                console.anthropic.com
              </a>{" "}
              → API Keys
            </div>
          </Field>

          {apiKey && (
            <div style={{ fontSize: 12, color: "var(--sage)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              ✅ Clé Claude configurée — la recherche IA est active
            </div>
          )}

          <div className="modal-actions" style={{ marginBottom: 24 }}>
            <Btn variant="ghost" onClick={() => setSettingsOpen(false)}>Annuler</Btn>
            <Btn variant="primary" onClick={saveClaudeKey}>Sauvegarder clé Claude</Btn>
          </div>

          {/* ── Séparateur ── */}
          <div style={{ height: 1, background: "rgba(61,43,79,.1)", margin: "4px 0 20px" }} />

          {/* ── Google Sheets ── */}
          <p className="card-label" style={{ marginBottom: 10 }}>🔗 Google Sheets — Sync automatique</p>

          <div style={{ background:"rgba(122,68,144,.06)", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:11.5, color:"var(--soft)", lineHeight:1.75 }}>
            <strong style={{ color:"var(--violet)" }}>Comment configurer :</strong><br />
            1. Ouvre ta Google Sheet<br />
            2. <strong>Partager</strong> → "Tout le monde avec le lien" (Lecteur)<br />
            3. Copie l'URL complète et colle-la ci-dessous<br />
            4. Entre ta clé API Google (Google Cloud Console → APIs → Sheets API → Credentials)
          </div>

          <Field label="URL Google Sheets">
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
            />
            {sheetUrl && (
              <div style={{ fontSize:10.5, marginTop:4, color:sheetId?"#5C9460":"var(--rose)" }}>
                {sheetId ? `✓ Sheet ID détecté : ${sheetId.slice(0,24)}…` : "⚠ URL invalide — vérifie le lien complet"}
              </div>
            )}
          </Field>

          <Field label="Clé API Google">
            <input
              type="password"
              value={gapiKey}
              onChange={(e) => setGapiKey(e.target.value)}
              placeholder="AIza…"
            />
            <div style={{ fontSize:10.5, color:"var(--muted)", marginTop:4, lineHeight:1.5 }}>
              Google Cloud Console → APIs &amp; Services → Credentials → Create API Key
            </div>
          </Field>

          <button
            onClick={saveSheet}
            disabled={!sheetId || !gapiKey.trim()}
            style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:7,
              width:"100%", padding:"10px 20px", borderRadius:100,
              fontSize:13, fontWeight:600, border:"none", fontFamily:"inherit",
              cursor:(!sheetId||!gapiKey.trim())?"not-allowed":"pointer",
              background:sheetSaved?"#5C9460":"var(--violet)",
              color:"white", transition:"all .2s",
              opacity:(!sheetId||!gapiKey.trim())?0.45:1,
              marginTop:4,
            }}
          >
            {sheetSaved ? "✓ Sauvegardé sur tous les appareils !" : "☁️ Sauvegarder la configuration"}
          </button>

          {sheetUrl && sheetId && (
            <div style={{ fontSize:11.5, color:"var(--sage)", marginTop:10, textAlign:"center" }}>
              ✅ Sheet configurée — utilise le bouton Sync dans Progression
            </div>
          )}
        </>
      )}
    </Modal>
  );
}