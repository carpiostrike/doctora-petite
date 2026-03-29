// ============================================================
//  DOCTORA PETITE — Vue Progression v6
//  Con Supabase — sincronización entre dispositivos
// ============================================================

import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { useApp, Card, Btn, Modal, Field } from "../App";
import { fetchGoogleSheet, getSheetConfig } from "../hooks/useGoogleSheets";
import { supabase } from "../lib/supabaseClient";

const MANON_SPECS = [
  { id:"cardio",    label:"Cardiologie",          color:"#9B8BC4", xlsHex:"B4A7D6", icon:"🫀" },
  { id:"pneumo",    label:"Pneumologie",           color:"#C4869A", xlsHex:"EAD1DC", icon:"💨" },
  { id:"vasc",      label:"Méd. vasculaire",       color:"#8B80B0", xlsHex:"D9D2E9", icon:"🩸" },
  { id:"gastro",    label:"Gastroentérologie",     color:"#A8A030", xlsHex:"FFE599", icon:"🫁" },
  { id:"nutrition", label:"Nutrition",             color:"#C09070", xlsHex:"FCE5CD", icon:"🥗" },
  { id:"chirdig",   label:"Chirurgie digestive",   color:"#A89840", xlsHex:"FFF2CC", icon:"🔪" },
  { id:"uro",       label:"Urologie",              color:"#C4894A", xlsHex:"F9CB9C", icon:"🫘" },
  { id:"ophtalmo",  label:"Ophtalmologie",         color:"#5B80C4", xlsHex:"A4C2F4", icon:"👁️" },
  { id:"orl",       label:"ORL",                   color:"#5C9460", xlsHex:"D9EAD3", icon:"👂" },
  { id:"psy",       label:"Psychiatrie",           color:"#5A8A8C", xlsHex:"A2C4C9", icon:"🧩" },
  { id:"mpr",       label:"MPR",                   color:"#B05A44", xlsHex:"DD7E6B", icon:"🦽" },
  { id:"neuro",     label:"Neurologie",            color:"#C47070", xlsHex:"EA9999", icon:"🧠" },
  { id:"neurochir", label:"Neurochirurgie",        color:"#C49090", xlsHex:"F4CCCC", icon:"🔬" },
  { id:"douleur",   label:"Douleur / Palliatifs",  color:"#909090", xlsHex:"D9D9D9", icon:"💊" },
  { id:"therapeu",  label:"Thérapeutique",         color:"#6090B4", xlsHex:"CFE2F3", icon:"💉" },
  { id:"other",     label:"Autre / Général",       color:"#8090A0", xlsHex:"",       icon:"📋" },
];

const HEX_TO_SPEC = {};
MANON_SPECS.forEach(s => { if (s.xlsHex) HEX_TO_SPEC[s.xlsHex.toUpperCase()] = s.id; });

function detectSpecByName(text) {
  if (!text) return "other";
  const t = text.toLowerCase();
  if (t.includes("cardio"))                            return "cardio";
  if (t.includes("neurochir"))                         return "neurochir";
  if (t.includes("neuro"))                             return "neuro";
  if (t.includes("pneumo"))                            return "pneumo";
  if (t.includes("vasculaire"))                        return "vasc";
  if (t.includes("gastro") || t.includes("hépatolo"))  return "gastro";
  if (t.includes("nutrition"))                         return "nutrition";
  if (t.includes("chirurgie digest"))                  return "chirdig";
  if (t.includes("uro"))                               return "uro";
  if (t.includes("ophtalmo"))                          return "ophtalmo";
  if (t.includes("orl"))                               return "orl";
  if (t.includes("psychiatr"))                         return "psy";
  if (t.includes("mpr") || t.includes("rééducat"))     return "mpr";
  if (t.includes("palliat") || t.includes("douleur"))  return "douleur";
  if (t.includes("thérapeu"))                          return "therapeu";
  return "other";
}

const splitBooks = (s) => (s || "").split(/[•/\n]/).map(x => x.trim()).filter(Boolean);

// ── Supabase helpers ─────────────────────────────────────────

async function loadFromSupabase() {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("num", { ascending: true });
  if (error) throw error;
  return (data || []).map(row => ({
    ...row,
    ecBooks:        row.ec_books       || [],
    relBooks:       row.rel_books      || [],
    vusBooks:       row.vus_books      || [],
    subspecialties: row.subspecialties || [],
  }));
}

async function upsertTopics(topics) {
  const rows = topics.map(t => ({
    id:             t.id,
    num:            t.num,
    title:          t.title,
    ec_books:       t.ecBooks        || [],
    rel_books:      t.relBooks       || [],
    vus_books:      t.vusBooks       || [],
    bg_hex:         t.bgHex          || "",
    specialty:      t.specialty      || "other",
    subspecialties: t.subspecialties || [],
    ec_done:        t.ec_done        || false,
    rel_done:       t.rel_done       || false,
    vus_done:       t.vus_done       || false,
    etudie:         t.etudie         || "none",
    note:           t.note           || "",
    pages:          t.pages          || "",
    doc:            t.doc            || "",
  }));
  const { error } = await supabase.from("topics").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function updateTopicInSupabase(id, changes) {
  const mapped = {};
  if (changes.ecBooks        !== undefined) mapped.ec_books       = changes.ecBooks;
  if (changes.relBooks       !== undefined) mapped.rel_books      = changes.relBooks;
  if (changes.vusBooks       !== undefined) mapped.vus_books      = changes.vusBooks;
  if (changes.subspecialties !== undefined) mapped.subspecialties = changes.subspecialties;
  if (changes.etudie         !== undefined) mapped.etudie         = changes.etudie;
  if (changes.note           !== undefined) mapped.note           = changes.note;
  if (changes.pages          !== undefined) mapped.pages          = changes.pages;
  if (changes.doc            !== undefined) mapped.doc            = changes.doc;
  if (changes.vus_done       !== undefined) mapped.vus_done       = changes.vus_done;
  const { error } = await supabase.from("topics").update(mapped).eq("id", id);
  if (error) throw error;
}

async function deleteTopicInSupabase(id) {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}

// ── Estados ──────────────────────────────────────────────────

const ETUDIE_STATES = [
  { key:"none",    label:"○",           bg:"rgba(176,168,187,.1)",  textColor:"var(--muted)" },
  { key:"encours", label:"🟡 En cours", bg:"rgba(201,169,110,.15)", textColor:"#8A6A30" },
  { key:"termine", label:"✅ Terminé",  bg:null,                    textColor:"white" },
];

function nextEtudie(current) {
  const idx = ETUDIE_STATES.findIndex(s => s.key === current);
  return ETUDIE_STATES[(idx + 1) % ETUDIE_STATES.length].key;
}

// ── Componente ───────────────────────────────────────────────

export default function Progress() {
  const { documents, notify, setSettingsOpen } = useApp();
  const fileRef = useRef();

  const [topics,       setTopics]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeSpec,   setActiveSpec]   = useState("all");
  const [search,       setSearch]       = useState("");
  const [syncing,      setSyncing]      = useState(false);
  const [lastSync,     setLastSync]     = useState(() => localStorage.getItem("dp_last_sync") || "");

  const [noteOpen,     setNoteOpen]     = useState(false);
  const [addOpen,      setAddOpen]      = useState(false);
  const [booksOpen,    setBooksOpen]    = useState(false);
  const [vusOpen,      setVusOpen]      = useState(false);
  const [subOpen,      setSubOpen]      = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);

  const [newTopic,  setNewTopic]  = useState({ num:"", title:"", ecInput:"", relInput:"", specialty:"cardio", note:"", pages:"" });
  const [tempBooks, setTempBooks] = useState({ ec:[], rel:[], ecInput:"", relInput:"" });
  const [tempVus,   setTempVus]   = useState({ books:[], input:"" });

  // ── Cargar desde Supabase ─────────────────────────────────
  useEffect(() => {
    loadFromSupabase()
      .then(data => { setTopics(data); setLoading(false); })
      .catch(err  => { notify("❌", "Erreur chargement", err.message); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync localStorage para App.js ─────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem("dp_manon_v4", JSON.stringify(topics));
      window.dispatchEvent(new StorageEvent("storage", { key: "dp_manon_v4" }));
    } catch {}
  }, [topics]);

  // ── Mutaciones ────────────────────────────────────────────
  const updateTopic = (id, changes) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    updateTopicInSupabase(id, changes).catch(err => notify("❌", "Erreur sauvegarde", err.message));
  };

  const deleteTopic = (id) => {
    setTopics(prev => prev.filter(t => t.id !== id));
    deleteTopicInSupabase(id).catch(err => notify("❌", "Erreur suppression", err.message));
  };

  // ── Sync Google Sheets → Supabase ─────────────────────────
  const syncGoogleSheet = async () => {
    const { sheetUrl, gapiKey } = getSheetConfig();
    if (!sheetUrl || !gapiKey) {
      notify("⚙️", "Configuration requise", "Ajoute l'URL et la clé API dans les Paramètres ⚙️");
      setSettingsOpen(true);
      return;
    }
    setSyncing(true);
    try {
      const imported = await fetchGoogleSheet(sheetUrl, gapiKey);
      const localMap = {};
      topics.forEach(t => { localMap[t.num] = t; });
      const merged = imported.map(t => {
        const local = localMap[t.num];
        if (!local) return t;
        return {
          ...t,
          etudie:         local.etudie !== "none" ? local.etudie : t.etudie,
          note:           local.note   || t.note,
          pages:          local.pages  || t.pages,
          doc:            local.doc    || t.doc,
          subspecialties: local.subspecialties?.length ? local.subspecialties : t.subspecialties,
          vusBooks:       local.vusBooks?.length ? local.vusBooks : t.vusBooks,
          vus_done:       local.vus_done || t.vus_done,
        };
      });
      await upsertTopics(merged);
      setTopics(merged);
      const now = new Date().toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
      setLastSync(now);
      localStorage.setItem("dp_last_sync", now);
      notify("✅", `${merged.length} thèmes synchronisés !`, `Google Sheets → Supabase · ${now} 🌸`);
    } catch (err) {
      notify("❌", "Erreur de synchronisation", err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Import Excel → Supabase ───────────────────────────────
  const importExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type:"array", cellStyles:true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });

        let hi = 0;
        for (let i = 0; i < Math.min(6, rows.length); i++) {
          if (rows[i].some(c => String(c).toLowerCase().includes("titre"))) { hi = i; break; }
        }

        const H     = rows[hi].map(c => String(c).toLowerCase().trim());
        const iN    = H.findIndex(h => h.includes("n°") || h === "n");
        const iT    = H.findIndex(h => h.includes("titre"));
        const iEc   = H.findIndex(h => h.includes("écriture") || h.includes("ecriture"));
        const iRel  = H.findIndex(h => h.includes("relecture"));
        const iVus  = H.findIndex(h => h.includes("vus"));
        const iCol  = H.findIndex(h => h.includes("couleur"));
        const iTerm = H.findIndex(h =>
          h.includes("terminé") || h.includes("termine") || h === "fait" || h === "done" || h === "ok"
        );

        const imported = [];
        for (let i = hi + 1; i < rows.length; i++) {
          const row   = rows[i];
          const titre = String(row[iT] ?? "").trim();
          if (!titre) continue;
          const ecStr  = String(row[iEc]  ?? "").trim();
          const relStr = String(row[iRel] ?? "").trim();
          const vusStr = String(row[iVus] ?? "").trim();
          const checkCols = iCol >= 0 ? [iCol, iEc] : [iEc];
          let bgHex = "";
          for (const ci of checkCols) {
            const cell = ws[XLSX.utils.encode_cell({ r:i, c:ci })];
            if (cell?.s?.bgColor?.rgb && cell.s.bgColor.rgb !== "000000") { bgHex = cell.s.bgColor.rgb.toUpperCase(); break; }
            if (cell?.s?.fgColor?.rgb && cell.s.fgColor.rgb !== "000000") { bgHex = cell.s.fgColor.rgb.toUpperCase(); break; }
          }
          const spec = HEX_TO_SPEC[bgHex] || detectSpecByName(ecStr);
          imported.push({
            id:             "t_" + i + "_" + Date.now(),
            num:            String(row[iN] ?? i).trim(),
            title:          titre,
            ecBooks:        splitBooks(ecStr),
            relBooks:       splitBooks(relStr),
            vusBooks:       splitBooks(vusStr),
            bgHex, specialty: spec, subspecialties: [],
            ec_done: false, rel_done: false,
            vus_done:       vusStr.length > 0,
            etudie:         (iTerm >= 0 && String(row[iTerm] ?? "").trim() ? "termine" : "none"),
            note:"", pages:"", doc:"",
          });
        }

        if (!imported.length) { notify("⚠️","Fichier vide","Vérifie les colonnes du fichier"); return; }
        await upsertTopics(imported);
        setTopics(imported);
        notify("✅", `${imported.length} thèmes importés !`, "Excel ECNi → Supabase 🌸");
      } catch(err) {
        notify("❌","Erreur import", err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // ── Add manual ────────────────────────────────────────────
  const addTopic = async () => {
    if (!newTopic.title.trim()) return;
    const t = {
      id: "t_m_" + Date.now(), num: newTopic.num, title: newTopic.title,
      ecBooks: splitBooks(newTopic.ecInput), relBooks: splitBooks(newTopic.relInput),
      vusBooks: [], bgHex: "", specialty: newTopic.specialty, subspecialties: [],
      ec_done: false, rel_done: false, vus_done: false, etudie: "none",
      note:"", pages:"", doc:"",
    };
    try {
      await upsertTopics([t]);
      setTopics(prev => [...prev, t]);
      setNewTopic({ num:"", title:"", ecInput:"", relInput:"", specialty:"cardio", note:"", pages:"" });
      setAddOpen(false);
      notify("✅","Thème ajouté", t.title.slice(0,50));
    } catch(err) { notify("❌","Erreur", err.message); }
  };

  // ── Modals helpers ────────────────────────────────────────
  const openBooks = (topic) => {
    setEditingTopic(topic);
    setTempBooks({ ec:[...(topic.ecBooks||[])], rel:[...(topic.relBooks||[])], ecInput:"", relInput:"" });
    setBooksOpen(true);
  };
  const saveBooks = () => {
    updateTopic(editingTopic.id, { ecBooks: tempBooks.ec, relBooks: tempBooks.rel });
    setBooksOpen(false);
    notify("✅","Livres mis à jour", editingTopic.title.slice(0,40));
  };
  const openVus = (topic) => {
    setEditingTopic(topic);
    setTempVus({ books:[...(topic.vusBooks||[])], input:"" });
    setVusOpen(true);
  };
  const saveVus = () => {
    updateTopic(editingTopic.id, { vusBooks: tempVus.books, vus_done: tempVus.books.length > 0 });
    setVusOpen(false);
    notify("👁️","Vus mis à jour", editingTopic.title.slice(0,40));
  };
  const openSub = (topic) => { setEditingTopic(topic); setSubOpen(true); };

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const bySpec = {};
    MANON_SPECS.forEach(s => { bySpec[s.id] = { total:0, vus:0, etudie:0 }; });
    topics.forEach(t => {
      const unique = [...new Set([t.specialty, ...(t.subspecialties||[])].filter(Boolean))];
      unique.forEach(sid => {
        if (!bySpec[sid]) bySpec[sid] = { total:0, vus:0, etudie:0 };
        bySpec[sid].total++;
        if (t.vus_done)           bySpec[sid].vus++;
        if (t.etudie==="termine") bySpec[sid].etudie++;
      });
    });
    return {
      total:   topics.length,
      vus:     topics.filter(t=>t.vus_done).length,
      encours: topics.filter(t=>t.etudie==="encours").length,
      termine: topics.filter(t=>t.etudie==="termine").length,
      bySpec,
    };
  }, [topics]);

  const filtered = useMemo(() => topics.filter(t => {
    const allSpecs    = [t.specialty, ...(t.subspecialties||[])];
    const matchSpec   = activeSpec === "all" || allSpecs.includes(activeSpec);
    const q           = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || String(t.num).includes(q) || (t.ecBooks||[]).join(" ").toLowerCase().includes(q);
    return matchSpec && matchSearch;
  }), [topics, activeSpec, search]);

  const sheetConfigured = !!(getSheetConfig().sheetUrl && getSheetConfig().gapiKey);

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:32 }}>🌸</div>
        <p style={{ color:"var(--muted)", fontSize:13 }}>Chargement depuis Supabase…</p>
      </div>
    );
  }

  return (
    <div className="view-enter" style={{ display:"grid", gridTemplateColumns:"256px 1fr", gap:18, alignItems:"start" }}>

      {/* ── LEFT ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

        <Card style={{ padding:16 }}>
          <p className="card-label">Progression ECNi</p>
          {[
            { label:"👁️ Vus",      val:stats.vus,     color:"#8BA888" },
            { label:"🟡 En cours", val:stats.encours, color:"#C9A96E" },
            { label:"✅ Terminés", val:stats.termine, color:"#5C4070" },
          ].map(s => {
            const pct = stats.total > 0 ? Math.round(s.val/stats.total*100) : 0;
            return (
              <div key={s.label} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:12, color:"var(--soft)" }}>{s.label}</span>
                  <span style={{ fontFamily:"monospace", fontSize:10.5, color:"var(--muted)" }}>{s.val}/{stats.total} · {pct}%</span>
                </div>
                <div style={{ height:4, background:"var(--blush)", borderRadius:100, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:s.color, borderRadius:100, transition:"width 1s" }} />
                </div>
              </div>
            );
          })}
        </Card>

        <Card style={{ padding:16 }}>
          <p className="card-label">Par spécialité</p>
          <div onClick={()=>setActiveSpec("all")} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 9px", borderRadius:9, cursor:"pointer", marginBottom:2, background:activeSpec==="all"?"rgba(61,43,79,.08)":"transparent", fontSize:12.5, color:activeSpec==="all"?"var(--plum)":"var(--soft)", fontWeight:activeSpec==="all"?500:400 }}>
            <span style={{ width:7,height:7,borderRadius:"50%",background:"var(--muted)",display:"inline-block" }} />
            Tous
            <span style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:10, color:"var(--muted)" }}>{stats.total}</span>
          </div>
          {MANON_SPECS.filter(s => (stats.bySpec[s.id]?.total||0)>0).map(spec => {
            const s   = stats.bySpec[spec.id]||{total:0,etudie:0};
            const isA = activeSpec === spec.id;
            return (
              <div key={spec.id} onClick={()=>setActiveSpec(spec.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 9px", borderRadius:9, cursor:"pointer", marginBottom:2, background:isA?spec.color+"20":"transparent", fontSize:12.5, color:isA?spec.color:"var(--soft)", fontWeight:isA?500:400, transition:"all .14s" }}>
                <span style={{ width:10,height:10,borderRadius:3,background:spec.color,display:"inline-block",flexShrink:0 }} />
                <span style={{ flex:1 }}>{spec.icon} {spec.label}</span>
                <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--muted)" }}>{s.etudie||0}/{s.total}</span>
              </div>
            );
          })}
        </Card>

        <Card style={{ padding:16 }}>
          <p className="card-label">Importer / Synchroniser</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <button onClick={syncGoogleSheet} disabled={syncing} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px 17px", borderRadius:100, fontSize:12.5, fontWeight:600, cursor:syncing?"not-allowed":"pointer", border:"none", fontFamily:"inherit", background:syncing?"rgba(122,68,144,.4)":(sheetConfigured?"var(--violet)":"rgba(122,68,144,.15)"), color:sheetConfigured?"white":"var(--violet)", transition:"all .2s", boxShadow:(syncing||!sheetConfigured)?"none":"0 2px 10px rgba(122,68,144,.25)" }}>
              <span style={{ fontSize:15 }}>{syncing ? "⏳" : "🔄"}</span>
              {syncing ? "Synchronisation…" : "Sync Google Sheets"}
            </button>
            {lastSync ? (
              <p style={{ fontSize:10, color:"var(--muted)", textAlign:"center", margin:0 }}>✓ Dernière sync : {lastSync}</p>
            ) : !sheetConfigured ? (
              <p onClick={()=>setSettingsOpen(true)} style={{ fontSize:10.5, color:"var(--violet)", textAlign:"center", margin:0, cursor:"pointer", textDecoration:"underline" }}>⚙️ Configurer dans Paramètres</p>
            ) : null}
            <div style={{ display:"flex", alignItems:"center", gap:8, margin:"2px 0" }}>
              <div style={{ flex:1, height:1, background:"rgba(61,43,79,.08)" }} />
              <span style={{ fontSize:10, color:"var(--muted)" }}>ou</span>
              <div style={{ flex:1, height:1, background:"rgba(61,43,79,.08)" }} />
            </div>
            <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"8px 17px", borderRadius:100, fontSize:12, fontWeight:500, cursor:"pointer", background:"rgba(61,43,79,.07)", color:"var(--soft)" }}>
              📊 Importer Excel (.xlsx)
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel} style={{ display:"none" }} />
            </label>
            <Btn variant="ghost" onClick={()=>setAddOpen(true)} style={{ justifyContent:"center", width:"100%" }}>+ Ajouter manuellement</Btn>
          </div>
        </Card>
      </div>

      {/* ── RIGHT ── */}
      <div>
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher thème, n°, livre…" style={{ flex:1, padding:"9px 14px", borderRadius:100, border:"1.5px solid rgba(61,43,79,.1)", background:"white", fontSize:13, fontFamily:"inherit", outline:"none" }} />
          <Btn variant="ghost" onClick={()=>setAddOpen(true)}>+ Ajouter</Btn>
          {topics.length>0 && <span style={{ fontSize:11.5, color:"var(--muted)", whiteSpace:"nowrap" }}>{filtered.length}/{topics.length}</span>}
        </div>

        {topics.length === 0 && (
          <Card style={{ textAlign:"center", padding:52 }}>
            <div style={{ fontSize:44, marginBottom:14 }}>📊</div>
            <p style={{ fontSize:14, color:"var(--soft)", lineHeight:1.8, marginBottom:20 }}>
              Synchronise ta Google Sheet ou importe ton Excel<br/>
              <span style={{ fontSize:12, color:"var(--muted)" }}>Colonnes : N°, Titre, Collège en écriture, Collège en relecture, Vus dans le collège, COULEUR</span>
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={syncGoogleSheet} disabled={syncing} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 24px", borderRadius:100, background:"var(--violet)", color:"white", fontSize:13.5, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"inherit" }}>🔄 Sync Google Sheets</button>
              <label style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 24px", borderRadius:100, background:"var(--plum)", color:"white", fontSize:13.5, fontWeight:500, cursor:"pointer" }}>
                📊 Importer Excel
                <input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{ display:"none" }} />
              </label>
            </div>
          </Card>
        )}

        {filtered.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"44px 1fr 180px 140px 160px 80px 56px", gap:5, padding:"4px 12px", marginBottom:4 }}>
            {["N°","Thème","✏️ Écriture","📖 Relecture","👁️ Vus dans","📚 Étudié",""].map((h,i)=>(
              <span key={i} style={{ fontSize:9.5, color:"var(--muted)", letterSpacing:"1px", textTransform:"uppercase", textAlign:i>1?"center":"left" }}>{h}</span>
            ))}
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {filtered.map(topic => {
            const spec     = MANON_SPECS.find(s=>s.id===topic.specialty)||MANON_SPECS[MANON_SPECS.length-1];
            const subSpecs = (topic.subspecialties||[]).map(sid => MANON_SPECS.find(s=>s.id===sid)).filter(Boolean);
            return (
              <div key={topic.id} style={{ display:"grid", gridTemplateColumns:"44px 1fr 180px 140px 160px 80px 56px", gap:5, alignItems:"start", background:topic.etudie==="termine"?spec.color+"18":topic.etudie==="encours"?"rgba(201,169,110,.06)":"white", borderRadius:12, padding:"10px 12px", border:`1px solid ${topic.etudie==="termine"?spec.color+"70":topic.etudie==="encours"?"rgba(201,169,110,.3)":"rgba(61,43,79,.06)"}`, transition:"all .15s" }}>
                <div style={{ textAlign:"center", paddingTop:2 }}>
                  <span style={{ fontFamily:"monospace", fontSize:10.5, color:"var(--muted)" }}>{topic.num}</span>
                  {topic.bgHex && <div style={{ width:10,height:6,borderRadius:2,background:"#"+topic.bgHex,margin:"3px auto 0" }} />}
                </div>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:500, color:"var(--ink)", lineHeight:1.35 }}>{topic.title.length>72?topic.title.slice(0,72)+"…":topic.title}</div>
                  <div style={{ display:"flex", gap:4, marginTop:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:9.5, padding:"1px 7px", borderRadius:100, background:spec.color+"20", color:spec.color, fontWeight:500 }}>{spec.icon} {spec.label}</span>
                    {subSpecs.map(ss => <span key={ss.id} style={{ fontSize:9.5, padding:"1px 7px", borderRadius:100, background:ss.color+"15", color:ss.color, fontWeight:500 }}>{ss.icon} {ss.label}</span>)}
                    <span onClick={()=>openSub(topic)} style={{ fontSize:9.5, padding:"1px 7px", borderRadius:100, background:"rgba(61,43,79,.06)", color:"var(--muted)", cursor:"pointer" }}>+ matière</span>
                  </div>
                  {topic.note && <div style={{ fontSize:10, color:"var(--gold)", marginTop:3 }}>📝 {topic.note.slice(0,45)}</div>}
                </div>
                <div>
                  {topic.ecBooks?.length>0?topic.ecBooks.map((b,i)=><div key={i} style={{ fontSize:10.5, color:"#5580A8", lineHeight:1.5, marginBottom:1 }}>📖 {b.length>28?b.slice(0,28)+"…":b}</div>):<span style={{ fontSize:10.5, color:"rgba(176,168,187,.6)" }}>—</span>}
                  <div onClick={()=>openBooks(topic)} style={{ fontSize:9.5, color:"var(--muted)", marginTop:3, cursor:"pointer", textDecoration:"underline" }}>✏️ Modifier livres</div>
                </div>
                <div>
                  {topic.relBooks?.length>0?topic.relBooks.map((b,i)=><div key={i} style={{ fontSize:10.5, color:"#8A6A30", lineHeight:1.5, marginBottom:1 }}>📚 {b.length>24?b.slice(0,24)+"…":b}</div>):<span style={{ fontSize:10.5, color:"rgba(176,168,187,.6)" }}>—</span>}
                  <div onClick={()=>openBooks(topic)} style={{ fontSize:9.5, color:"var(--muted)", marginTop:3, cursor:"pointer", textDecoration:"underline" }}>✏️ Modifier</div>
                </div>
                <div>
                  {topic.vusBooks?.length>0?topic.vusBooks.map((b,i)=><div key={i} style={{ fontSize:10.5, color:"#4E7A4C", lineHeight:1.5, marginBottom:1 }}>✅ {b.length>24?b.slice(0,24)+"…":b}</div>):<span style={{ fontSize:10.5, color:"rgba(176,168,187,.6)" }}>Pas encore vu</span>}
                  <div onClick={()=>openVus(topic)} style={{ fontSize:9.5, color:"var(--muted)", marginTop:3, cursor:"pointer", textDecoration:"underline" }}>+ Ajouter / modifier</div>
                </div>
                <div style={{ textAlign:"center", paddingTop:2 }}>
                  {(()=>{
                    const state     = ETUDIE_STATES.find(s=>s.key===(topic.etudie||"none"))||ETUDIE_STATES[0];
                    const isTermine = state.key==="termine";
                    return <button onClick={()=>updateTopic(topic.id,{etudie:nextEtudie(topic.etudie||"none")})} style={{ padding:"5px 0", borderRadius:100, fontSize:10.5, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"inherit", width:"100%", background:isTermine?spec.color:(state.bg||"rgba(176,168,187,.1)"), color:isTermine?"white":state.textColor, transition:"all .2s", boxShadow:isTermine?`0 2px 8px ${spec.color}50`:"none" }}>{state.label}</button>;
                  })()}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3, alignItems:"center", paddingTop:2 }}>
                  <button onClick={()=>{setEditingTopic({...topic});setNoteOpen(true);}} style={{ width:24,height:24,borderRadius:6,border:"1px solid rgba(61,43,79,.1)",background:"white",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center" }}>📝</button>
                  <button onClick={()=>deleteTopic(topic.id)} style={{ width:24,height:24,borderRadius:6,border:"1px solid rgba(201,137,122,.2)",background:"white",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--rose)" }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length===0&&topics.length>0&&<div style={{ textAlign:"center", padding:32, color:"var(--muted)", fontSize:13 }}>Aucun résultat pour «&nbsp;{search}&nbsp;»</div>}
      </div>

      {/* ── MODAL: Books ── */}
      <Modal open={booksOpen} onClose={()=>setBooksOpen(false)} title={`📚 Livres — N°${editingTopic?.num}`}>
        <div style={{ fontSize:12.5, color:"var(--soft)", marginBottom:14, fontStyle:"italic" }}>{editingTopic?.title?.slice(0,70)}</div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:11.5, fontWeight:500, color:"var(--soft)", marginBottom:7 }}>✏️ Livres d'écriture</label>
          {tempBooks.ec?.map((b,i)=><div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}><span style={{ flex:1, fontSize:12.5, padding:"6px 10px", background:"var(--cream)", borderRadius:8, color:"var(--ink)" }}>{b}</span><button onClick={()=>setTempBooks(p=>({...p,ec:p.ec.filter((_,j)=>j!==i)}))} style={{ width:24,height:24,borderRadius:6,border:"1px solid rgba(201,137,122,.3)",background:"white",cursor:"pointer",color:"var(--rose)",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button></div>)}
          <div style={{ display:"flex", gap:6 }}><input type="text" value={tempBooks.ecInput||""} onChange={e=>setTempBooks(p=>({...p,ecInput:e.target.value}))} onKeyDown={e=>{ if(e.key==="Enter"&&tempBooks.ecInput?.trim()) setTempBooks(p=>({...p,ec:[...p.ec,p.ecInput.trim()],ecInput:""})); }} placeholder="Ajouter un livre… (Entrée)" style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1.5px solid rgba(61,43,79,.11)", background:"var(--cream)", fontSize:12.5, fontFamily:"inherit", outline:"none" }} /><button onClick={()=>{ if(tempBooks.ecInput?.trim()) setTempBooks(p=>({...p,ec:[...p.ec,p.ecInput.trim()],ecInput:""})); }} style={{ padding:"8px 14px", borderRadius:8, background:"var(--plum)", color:"white", border:"none", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>+</button></div>
        </div>
        <div>
          <label style={{ display:"block", fontSize:11.5, fontWeight:500, color:"var(--soft)", marginBottom:7 }}>📖 Livres de relecture</label>
          {tempBooks.rel?.map((b,i)=><div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}><span style={{ flex:1, fontSize:12.5, padding:"6px 10px", background:"var(--cream)", borderRadius:8, color:"var(--ink)" }}>{b}</span><button onClick={()=>setTempBooks(p=>({...p,rel:p.rel.filter((_,j)=>j!==i)}))} style={{ width:24,height:24,borderRadius:6,border:"1px solid rgba(201,137,122,.3)",background:"white",cursor:"pointer",color:"var(--rose)",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button></div>)}
          <div style={{ display:"flex", gap:6 }}><input type="text" value={tempBooks.relInput||""} onChange={e=>setTempBooks(p=>({...p,relInput:e.target.value}))} onKeyDown={e=>{ if(e.key==="Enter"&&tempBooks.relInput?.trim()) setTempBooks(p=>({...p,rel:[...p.rel,p.relInput.trim()],relInput:""})); }} placeholder="Ajouter un libro… (Entrée)" style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1.5px solid rgba(61,43,79,.11)", background:"var(--cream)", fontSize:12.5, fontFamily:"inherit", outline:"none" }} /><button onClick={()=>{ if(tempBooks.relInput?.trim()) setTempBooks(p=>({...p,rel:[...p.rel,p.relInput.trim()],relInput:""})); }} style={{ padding:"8px 14px", borderRadius:8, background:"var(--plum)", color:"white", border:"none", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>+</button></div>
        </div>
        <div className="modal-actions"><Btn variant="ghost" onClick={()=>setBooksOpen(false)}>Annuler</Btn><Btn variant="primary" onClick={saveBooks}>Sauvegarder</Btn></div>
      </Modal>

      {/* ── MODAL: Vus ── */}
      <Modal open={vusOpen} onClose={()=>setVusOpen(false)} title={`👁️ Vu dans — N°${editingTopic?.num}`}>
        <div style={{ fontSize:12.5, color:"var(--soft)", marginBottom:14, fontStyle:"italic" }}>{editingTopic?.title?.slice(0,70)}</div>
        <label style={{ display:"block", fontSize:11.5, fontWeight:500, color:"var(--soft)", marginBottom:7 }}>Dans quels livres as-tu vu ce thème ?</label>
        {tempVus.books?.map((b,i)=><div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}><span style={{ flex:1, fontSize:12.5, padding:"6px 10px", background:"rgba(139,168,136,.1)", borderRadius:8, color:"#4E7A4C" }}>✅ {b}</span><button onClick={()=>setTempVus(p=>({...p,books:p.books.filter((_,j)=>j!==i)}))} style={{ width:24,height:24,borderRadius:6,border:"1px solid rgba(201,137,122,.3)",background:"white",cursor:"pointer",color:"var(--rose)",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button></div>)}
        <div style={{ display:"flex", gap:6, marginTop:4 }}><input type="text" value={tempVus.input||""} onChange={e=>setTempVus(p=>({...p,input:e.target.value}))} onKeyDown={e=>{ if(e.key==="Enter"&&tempVus.input?.trim()) setTempVus(p=>({...p,books:[...p.books,p.input.trim()],input:""})); }} placeholder="Nom du livre ou matière…" style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1.5px solid rgba(61,43,79,.11)", background:"var(--cream)", fontSize:12.5, fontFamily:"inherit", outline:"none" }} /><button onClick={()=>{ if(tempVus.input?.trim()) setTempVus(p=>({...p,books:[...p.books,p.input.trim()],input:""})); }} style={{ padding:"8px 14px", borderRadius:8, background:"var(--sage)", color:"white", border:"none", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>+</button></div>
        <div className="modal-actions"><Btn variant="ghost" onClick={()=>setVusOpen(false)}>Annuler</Btn><Btn variant="primary" onClick={saveVus}>Sauvegarder</Btn></div>
      </Modal>

      {/* ── MODAL: Subspecialty ── */}
      <Modal open={subOpen} onClose={()=>setSubOpen(false)} title={`🏷️ Sous-spécialités — N°${editingTopic?.num}`}>
        <div style={{ fontSize:12.5, color:"var(--soft)", marginBottom:14, fontStyle:"italic" }}>{editingTopic?.title?.slice(0,70)}</div>
        <p style={{ fontSize:12, color:"var(--soft)", marginBottom:12, lineHeight:1.6 }}>Ce thème apparaîtra aussi dans les filtres des spécialités sélectionnées.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
          {MANON_SPECS.filter(s=>s.id!==editingTopic?.specialty&&s.id!=="other").map(spec => {
            const isSelected = (editingTopic?.subspecialties||[]).includes(spec.id);
            return <div key={spec.id} onClick={()=>{ const cur=editingTopic?.subspecialties||[]; const next=isSelected?cur.filter(s=>s!==spec.id):[...cur,spec.id]; setEditingTopic(p=>({...p,subspecialties:next})); }} style={{ padding:"5px 12px", borderRadius:100, fontSize:12, cursor:"pointer", border:`1.5px solid ${isSelected?spec.color:"rgba(61,43,79,.1)"}`, background:isSelected?spec.color+"20":"white", color:isSelected?spec.color:"var(--soft)", fontWeight:isSelected?500:400, transition:"all .15s" }}>{spec.icon} {spec.label}</div>;
          })}
        </div>
        <div className="modal-actions"><Btn variant="ghost" onClick={()=>setSubOpen(false)}>Annuler</Btn><Btn variant="primary" onClick={()=>{ updateTopic(editingTopic.id,{subspecialties:editingTopic.subspecialties||[]}); setSubOpen(false); notify("✅","Sous-spécialités sauvegardées",""); }}>Sauvegarder</Btn></div>
      </Modal>

      {/* ── MODAL: Note ── */}
      <Modal open={noteOpen} onClose={()=>setNoteOpen(false)} title={`📝 Note — N°${editingTopic?.num}`}>
        <div style={{ fontSize:13, color:"var(--soft)", marginBottom:12, fontStyle:"italic" }}>{editingTopic?.title}</div>
        <Field label="Pages clés du livre"><input type="text" value={editingTopic?.pages||""} onChange={e=>setEditingTopic(p=>({...p,pages:e.target.value}))} placeholder="ex: 45-67, 120-135" /></Field>
        <Field label="Document lié (Bibliothèque)"><select value={editingTopic?.doc||""} onChange={e=>setEditingTopic(p=>({...p,doc:e.target.value}))}><option value="">-- Aucun --</option>{documents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Ma note personnelle"><textarea value={editingTopic?.note||""} onChange={e=>setEditingTopic(p=>({...p,note:e.target.value}))} placeholder="Points difficiles, mnémotechniques, à revoir…" rows={4} /></Field>
        <div className="modal-actions"><Btn variant="ghost" onClick={()=>setNoteOpen(false)}>Annuler</Btn><Btn variant="primary" onClick={()=>{ if(editingTopic) updateTopic(editingTopic.id,{pages:editingTopic.pages,doc:editingTopic.doc,note:editingTopic.note}); setNoteOpen(false); notify("📝","Note sauvegardée",editingTopic?.title?.slice(0,40)); }}>Sauvegarder</Btn></div>
      </Modal>

      {/* ── MODAL: Add manual ── */}
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Ajouter un thème">
        <div className="field-row">
          <Field label="N° ECNi"><input type="text" value={newTopic.num} onChange={e=>setNewTopic(p=>({...p,num:e.target.value}))} placeholder="ex: 234" /></Field>
          <Field label="Spécialité"><select value={newTopic.specialty} onChange={e=>setNewTopic(p=>({...p,specialty:e.target.value}))}>{MANON_SPECS.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}</select></Field>
        </div>
        <Field label="Titre"><input type="text" value={newTopic.title} onChange={e=>setNewTopic(p=>({...p,title:e.target.value}))} placeholder="Titre officiel ECNi…" /></Field>
        <Field label="✏️ Collège en écriture (séparer par •)"><input type="text" value={newTopic.ecInput||""} onChange={e=>setNewTopic(p=>({...p,ecInput:e.target.value}))} placeholder="ex: Collège Cardio • Thérapeutique" /></Field>
        <Field label="📖 Collège en relecture (optionnel)"><input type="text" value={newTopic.relInput||""} onChange={e=>setNewTopic(p=>({...p,relInput:e.target.value}))} placeholder="ex: Médecine interne • Urgences" /></Field>
        <div className="modal-actions"><Btn variant="ghost" onClick={()=>setAddOpen(false)}>Annuler</Btn><Btn variant="primary" onClick={addTopic}>Ajouter</Btn></div>
      </Modal>
    </div>
  );
}