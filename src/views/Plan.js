// ============================================================
//  DOCTORA PETITE — Plan de Révision v2
//  - Plan fixe par spécialité (ne change pas à chaque render)
//  - Détail de chaque thème avec livre à étudier
//  - Thèmes 🟡 En cours en priorité
// ============================================================

import { useState, useMemo, useCallback } from "react";
import { useApp, Card, Btn, Modal, Field, SPECIALTIES } from "../App";

const TOPICS_KEY  = "dp_manon_v4";
const PLAN_KEY    = "dp_plan_v2"; // persisted plan so it doesn't change

function loadTopics() {
  try { const s = localStorage.getItem(TOPICS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}
function loadPlan() {
  try { const s = localStorage.getItem(PLAN_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function savePlan(p) {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(p)); } catch {}
}

function todayStr() { return new Date().toISOString().split("T")[0]; }
function addDaysToDate(base, n) {
  const d = new Date(base); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function daysBetween(dateStr) {
  const t = new Date(); t.setHours(0,0,0,0);
  const g = new Date(dateStr); g.setHours(0,0,0,0);
  return Math.ceil((g - t) / 86400000);
}
function isWeekend(dateStr) {
  const d = new Date(dateStr); return d.getDay() === 0 || d.getDay() === 6;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"short" });
}

const SPEC_ORDER = ["neuro","neurochir","mpr","psy","ophtalmo","orl","medecinleg","santepub","biostat","epidemio","cardio","pneumo","gastro","uro","vasc","nutrition","chirdig","douleur","therapeu","other"];
const TOPICS_PER_HOUR = 1.5;

// Generate a STABLE plan (sorted by specialty, fixed per session)
function generatePlan(pending, exams, hoursWeek, hoursWE, today) {
  if (!exams.length || !pending.length) return [];

  // Sort pending: 🟡 encours first, then by specialty order, then by num
  const sorted = [...pending].sort((a, b) => {
    if (a.etudie === "encours" && b.etudie !== "encours") return -1;
    if (b.etudie === "encours" && a.etudie !== "encours") return 1;
    const ai = SPEC_ORDER.indexOf(a.specialty); const bi = SPEC_ORDER.indexOf(b.specialty);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return (parseInt(a.num)||0) - (parseInt(b.num)||0);
  });

  const firstExam  = exams[0];
  const daysLeft   = daysBetween(firstExam.date);
  if (daysLeft <= 0) return [];

  const days = []; let topicIdx = 0;
  for (let i = 0; i < Math.min(daysLeft + 1, 60); i++) {
    const dateStr = addDaysToDate(today, i);
    const weekend = isWeekend(dateStr);
    const hours   = weekend ? hoursWE : hoursWeek;
    const cap     = Math.max(1, Math.floor(hours * TOPICS_PER_HOUR));
    const examDay = exams.find(e => e.date === dateStr);
    const dayTopics = [];
    if (!examDay) {
      for (let j = 0; j < cap && topicIdx < sorted.length; j++) {
        dayTopics.push(sorted[topicIdx].id);
        topicIdx++;
      }
    }
    days.push({ date:dateStr, weekend, hours, topicIds:dayTopics, examDay:!!examDay, examName:examDay?.title||null, isToday:dateStr===today });
  }
  return days;
}

export default function Plan() {
  const { events, setActiveView, notify } = useApp();
  const [activeTab, setActiveTab]   = useState("today");
  const [hoursPerDay, setHoursPerDay] = useState({ week:3, weekend:6 });
  const [editHours,  setEditHours]  = useState(false);
  const [openTopic,  setOpenTopic]  = useState(null); // topic detail modal

  const topics = loadTopics();
  const today  = todayStr();

  const exams = useMemo(() =>
    events.filter(e => e.type==="exam" && e.date>=today)
      .sort((a,b)=>a.date.localeCompare(b.date))
  , [events, today]);

  const pending   = topics.filter(t => t.etudie !== "termine");
  const encours   = topics.filter(t => t.etudie === "encours");
  const doneCount = topics.filter(t => t.etudie === "termine").length;
  const pctDone   = topics.length > 0 ? Math.round(doneCount/topics.length*100) : 0;
  const daysToFirst = exams.length > 0 ? daysBetween(exams[0].date) : null;

  // Load or generate stable plan
  const plan = useMemo(() => {
    const saved = loadPlan();
    // Regenerate if: no saved plan, or hours changed, or today changed, or different exam
    const key = `${hoursPerDay.week}_${hoursPerDay.weekend}_${today}_${exams[0]?.date||""}`;
    if (saved && saved.key === key && saved.days?.length) return saved.days;
    const newPlan = generatePlan(pending, exams, hoursPerDay.week, hoursPerDay.weekend, today);
    savePlan({ key, days: newPlan });
    return newPlan;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoursPerDay, today, exams.length]);

  const topicMap = useMemo(() => {
    const m = {}; topics.forEach(t => { m[t.id] = t; }); return m;
  }, [topics]);

  const specMap = useMemo(() => {
    const m = {}; SPECIALTIES.forEach(s => { m[s.id] = s; }); return m;
  }, []);

  const todayPlan    = plan.find(d => d.isToday);
  const todayTopics  = (todayPlan?.topicIds||[]).map(id=>topicMap[id]).filter(Boolean);

  const updateStatus = useCallback((topicId, status) => {
    try {
      const all = loadTopics();
      const upd = all.map(t => t.id===topicId ? {...t, etudie:status} : t);
      localStorage.setItem(TOPICS_KEY, JSON.stringify(upd));
      window.dispatchEvent(new StorageEvent("storage", { key:TOPICS_KEY }));
      // Invalidate plan cache so done topics are removed
      localStorage.removeItem(PLAN_KEY);
      notify(status==="termine"?"✅":"🟡", status==="termine"?"Thème terminé !":"En cours", "");
    } catch {}
  }, [notify]);

  // ── Topic detail card ─────────────────────────────────────
  const TopicCard = ({ topic, showActions=true }) => {
    if (!topic) return null;
    const spec = specMap[topic.specialty];
    const isEncours = topic.etudie === "encours";
    return (
      <div style={{ display:"flex", alignItems:"flex-start", gap:12, background:isEncours?"rgba(201,169,110,.06)":"white", borderRadius:12, padding:"13px 16px", border:`1px solid ${isEncours?"rgba(201,169,110,.3)":"rgba(122,68,144,.07)"}`, cursor:"pointer" }}
        onClick={()=>setOpenTopic(topic)}
      >
        <div style={{ width:10, height:10, borderRadius:3, background:spec?.color||"#999", flexShrink:0, marginTop:4 }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12.5, fontWeight:500, color:"var(--ink)", lineHeight:1.35 }}>
            {isEncours && <span style={{ marginRight:5 }}>🟡</span>}
            <span style={{ fontFamily:"monospace", fontSize:10.5, color:"var(--muted)", marginRight:6 }}>N°{topic.num}</span>
            {topic.title.length>65?topic.title.slice(0,65)+"…":topic.title}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
            <span style={{ fontSize:10, padding:"1px 7px", borderRadius:100, background:spec?.color+"18"||"#eee", color:spec?.color||"#888" }}>
              {spec?.icon} {spec?.label}
            </span>
            {topic.ecBooks?.[0] && (
              <span style={{ fontSize:10, color:"#5580A8" }}>📖 {topic.ecBooks[0].slice(0,35)}</span>
            )}
            {topic.vusBooks?.length>0 && (
              <span style={{ fontSize:10, color:"#4E7A4C" }}>✅ Vu dans {topic.vusBooks[0].slice(0,25)}</span>
            )}
          </div>
        </div>
        {showActions && (
          <div style={{ display:"flex", gap:5, flexShrink:0 }}>
            {!isEncours && (
              <button onClick={e=>{e.stopPropagation();updateStatus(topic.id,"encours");}} style={{ padding:"4px 9px", borderRadius:100, fontSize:10, border:"none", cursor:"pointer", background:"rgba(201,169,110,.15)", color:"#8A6030", fontFamily:"inherit" }}>🟡</button>
            )}
            <button onClick={e=>{e.stopPropagation();updateStatus(topic.id,"termine");}} style={{ padding:"4px 9px", borderRadius:100, fontSize:10, border:"none", cursor:"pointer", background:"rgba(139,168,136,.15)", color:"#4E7A4C", fontFamily:"inherit" }}>✅</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="view-enter">

      {/* ── STATS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Terminés",       val:`${doneCount}/${topics.length}`, sub:`${pctDone}% complété`,       color:"var(--violet)" },
          { label:"En cours 🟡",    val:encours.length,                  sub:"priorité haute",              color:"#C9A96E"       },
          { label:"Jours restants", val:daysToFirst??"-",                sub:exams[0]?exams[0].title.replace("Examen — ","").slice(0,20):"Ajoute un examen", color:"var(--rose)" },
          { label:"Aujourd'hui",    val:todayTopics.length||"-",         sub:`${todayPlan?.hours||0}h prévues`, color:"var(--sage)" },
        ].map(s=>(
          <Card key={s.label} style={{ padding:14, textAlign:"center" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:24, fontWeight:500, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:10, color:"var(--muted)", marginTop:3 }}>{s.sub}</div>
            <div style={{ fontSize:9.5, color:"var(--muted)", marginTop:2, letterSpacing:".5px", textTransform:"uppercase" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        {[
          { id:"today", label:"📅 Aujourd'hui" },
          { id:"plan",  label:"🗓️ Plan complet" },
          { id:"repas", label:"🔄 Repas rapide" },
        ].map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ padding:"8px 18px", borderRadius:100, fontSize:12.5, fontWeight:500, cursor:"pointer", border:"none", fontFamily:"inherit", background:activeTab===tab.id?"var(--violet)":"white", color:activeTab===tab.id?"white":"var(--soft)", boxShadow:activeTab===tab.id?"0 4px 12px rgba(122,68,144,.25)":"var(--sh-sm)", transition:"all .18s" }}>
            {tab.label}
          </button>
        ))}
        <button onClick={()=>setEditHours(!editHours)} style={{ marginLeft:"auto", padding:"8px 14px", borderRadius:100, fontSize:11.5, cursor:"pointer", border:"1.5px solid rgba(122,68,144,.14)", background:"white", color:"var(--soft)", fontFamily:"inherit" }}>
          ⚙ {hoursPerDay.week}h · {hoursPerDay.weekend}h WE
        </button>
      </div>

      {/* Hours editor */}
      {editHours && (
        <Card style={{ padding:14, marginBottom:14, display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" }}>
          <span style={{ fontSize:12.5, color:"var(--soft)", fontWeight:500 }}>Heures d'étude :</span>
          {[{k:"week",label:"Semaine",max:10},{k:"weekend",label:"Week-end",max:12}].map(({k,label,max})=>(
            <div key={k} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ fontSize:11.5, color:"var(--muted)" }}>{label}</span>
              <input type="range" min={1} max={max} value={hoursPerDay[k]} onChange={e=>{setHoursPerDay(p=>({...p,[k]:+e.target.value}));localStorage.removeItem(PLAN_KEY);}} style={{ width:70 }} />
              <span style={{ fontFamily:"monospace", fontSize:12, color:"var(--violet)", width:22 }}>{hoursPerDay[k]}h</span>
            </div>
          ))}
          <span style={{ fontSize:10.5, color:"var(--muted)" }}>≈ {Math.floor(hoursPerDay.week*1.5)} thèmes/j · {Math.floor(hoursPerDay.weekend*1.5)} WE</span>
        </Card>
      )}

      {/* No exams warning */}
      {exams.length===0 && (
        <Card style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📅</div>
          <p style={{ fontSize:14, color:"var(--soft)", lineHeight:1.7, marginBottom:16 }}>
            Aucun examen dans le Calendrier.<br/>
            <span style={{ fontSize:12, color:"var(--muted)" }}>Ajoute tes examens pour générer le plan.</span>
          </p>
          <Btn variant="primary" onClick={()=>setActiveView("calendar")}>→ Aller au Calendrier</Btn>
        </Card>
      )}

      {/* ── TODAY ── */}
      {activeTab==="today" && exams.length>0 && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <h2 style={{ fontFamily:"'Lora',serif", fontSize:18, color:"var(--ink)" }}>
                {formatDate(today)} — {todayTopics.length} thème{todayTopics.length!==1?"s":""}
              </h2>
              <p style={{ fontSize:11.5, color:"var(--muted)", marginTop:2 }}>
                Clique sur un thème pour voir quel livre étudier
              </p>
            </div>
            {daysToFirst!==null && (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"monospace", fontSize:22, color:"var(--rose)", fontWeight:500 }}>{daysToFirst}j</div>
                <div style={{ fontSize:10, color:"var(--muted)" }}>avant {exams[0]?.title?.replace("Examen — ","").slice(0,20)}</div>
              </div>
            )}
          </div>

          {todayTopics.length===0 ? (
            <Card style={{ textAlign:"center", padding:28 }}>
              <p style={{ fontSize:13.5, color:"var(--soft)" }}>
                {pending.length===0 ? "🎉 Tous les thèmes sont terminés !" : "Aucun thème planifié aujourd'hui."}
              </p>
            </Card>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {todayTopics.map(t=><TopicCard key={t.id} topic={t} />)}
            </div>
          )}
        </div>
      )}

      {/* ── FULL PLAN ── */}
      {activeTab==="plan" && exams.length>0 && (
        <div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
            {exams.map(e=>(
              <div key={e.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:100, background:"rgba(232,132,154,.1)", border:"1px solid rgba(232,132,154,.3)", fontSize:11.5 }}>
                <span style={{ color:"var(--rose)" }}>📝</span>
                <span style={{ color:"var(--ink)", fontWeight:500 }}>{e.title.replace("Examen — ","")}</span>
                <span style={{ color:"var(--muted)" }}>· {formatDate(e.date)} ({daysBetween(e.date)}j)</span>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {plan.map(day=>{
              const dayTopics = (day.topicIds||[]).map(id=>topicMap[id]).filter(Boolean);
              // Group by specialty for display
              const specGroups = {};
              dayTopics.forEach(t=>{ if(!specGroups[t.specialty]) specGroups[t.specialty]=[]; specGroups[t.specialty].push(t); });

              return (
                <div key={day.date} style={{ borderRadius:12, overflow:"hidden", border:day.examDay?"1.5px solid rgba(232,132,154,.5)":day.isToday?"1.5px solid var(--violet)":"1px solid rgba(122,68,144,.07)", background:day.examDay?"rgba(232,132,154,.06)":day.isToday?"rgba(122,68,144,.04)":"white" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px" }}>
                    <div style={{ width:80, flexShrink:0 }}>
                      <div style={{ fontSize:11.5, fontWeight:500, color:day.isToday?"var(--violet)":day.examDay?"var(--rose)":"var(--ink)" }}>
                        {day.isToday?"Aujourd'hui":formatDate(day.date)}
                      </div>
                      <div style={{ fontSize:10, color:"var(--muted)" }}>{day.weekend?"WE":"Sem."} · {day.hours}h</div>
                    </div>

                    <div style={{ flex:1, display:"flex", gap:5, flexWrap:"wrap" }}>
                      {day.examDay ? (
                        <span style={{ fontSize:12, color:"var(--rose)", fontWeight:500 }}>📝 {day.examName}</span>
                      ) : Object.entries(specGroups).map(([sid, ts])=>{
                        const spec = specMap[sid];
                        return (
                          <span key={sid} style={{ fontSize:10.5, padding:"2px 8px", borderRadius:100, background:spec?.color+"18"||"#eee", color:spec?.color||"#888" }}>
                            {spec?.icon} {ts.length} thème{ts.length>1?"s":""}
                          </span>
                        );
                      })}
                    </div>

                    {!day.examDay && (
                      <span style={{ fontFamily:"monospace", fontSize:11, color:"var(--muted)", flexShrink:0 }}>
                        {dayTopics.filter(t=>t.etudie==="termine").length}/{dayTopics.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── REPAS RAPIDE ── */}
      {activeTab==="repas" && (
        <div>
          <div style={{ marginBottom:14 }}>
            <h2 style={{ fontFamily:"'Lora',serif", fontSize:18, color:"var(--ink)", marginBottom:4 }}>
              🔄 Repas rapide — {encours.length} thème{encours.length!==1?"s":""}
            </h2>
            <p style={{ fontSize:12, color:"var(--muted)" }}>Thèmes 🟡 En cours à finaliser en priorité.</p>
          </div>
          {encours.length===0 ? (
            <Card style={{ textAlign:"center", padding:36 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>✨</div>
              <p style={{ fontSize:13.5, color:"var(--soft)", lineHeight:1.7, marginBottom:14 }}>
                Aucun thème en cours.<br/>
                <span style={{ fontSize:12, color:"var(--muted)" }}>Marque des thèmes 🟡 dans Progression.</span>
              </p>
              <Btn variant="ghost" onClick={()=>setActiveView("progress")}>→ Progression</Btn>
            </Card>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {encours.map(t=><TopicCard key={t.id} topic={t} />)}
            </div>
          )}
        </div>
      )}

      {/* ── TOPIC DETAIL MODAL ── */}
      {openTopic && (
        <div className="overlay" onClick={()=>setOpenTopic(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"monospace", marginBottom:4 }}>Thème N°{openTopic.num}</div>
                <h2 style={{ fontFamily:"'Lora',serif", fontSize:17, color:"var(--ink)", lineHeight:1.3 }}>{openTopic.title}</h2>
              </div>
              <button onClick={()=>setOpenTopic(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"var(--muted)", padding:4 }}>×</button>
            </div>

            {/* Specialty */}
            {(() => { const spec = specMap[openTopic.specialty]; return spec ? (
              <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 12px", borderRadius:100, background:spec.color+"20", color:spec.color, fontSize:12, fontWeight:500, marginBottom:14 }}>
                {spec.icon} {spec.label}
              </span>
            ) : null; })()}

            {/* Books to study */}
            {openTopic.ecBooks?.length>0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>✏️ Livre principal à étudier</div>
                {openTopic.ecBooks.map((b,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", background:"rgba(91,128,196,.08)", borderRadius:9, marginBottom:5 }}>
                    <span style={{ fontSize:16 }}>📖</span>
                    <span style={{ fontSize:13, color:"#5580A8", fontWeight:500 }}>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {openTopic.relBooks?.length>0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>📚 Lectures complémentaires</div>
                {openTopic.relBooks.map((b,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"rgba(201,169,110,.08)", borderRadius:9, marginBottom:5 }}>
                    <span style={{ fontSize:16 }}>📚</span>
                    <span style={{ fontSize:12.5, color:"#8A6030" }}>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {openTopic.vusBooks?.length>0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>👁️ Déjà vu dans</div>
                {openTopic.vusBooks.map((b,i)=>(
                  <div key={i} style={{ padding:"7px 12px", background:"rgba(139,168,136,.1)", borderRadius:9, fontSize:12, color:"#4E7A4C", marginBottom:4 }}>✅ {b}</div>
                ))}
              </div>
            )}

            {openTopic.note && (
              <div style={{ marginBottom:14, padding:"10px 12px", background:"rgba(212,165,116,.1)", borderRadius:9 }}>
                <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>📝 NOTE</div>
                <div style={{ fontSize:12.5, color:"var(--ink)", lineHeight:1.6 }}>{openTopic.note}</div>
              </div>
            )}

            {(!openTopic.ecBooks?.length && !openTopic.relBooks?.length) && (
              <div style={{ padding:"12px", background:"var(--lavande-m)", borderRadius:9, fontSize:12.5, color:"var(--soft)", marginBottom:14 }}>
                Aucun livre assigné. Va dans <strong>Progression</strong> pour ajouter les livres de ce thème.
              </div>
            )}

            {/* Actions */}
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <button onClick={()=>{updateStatus(openTopic.id,"encours");setOpenTopic(null);}} style={{ flex:1, padding:"10px", borderRadius:100, fontSize:12.5, border:"none", cursor:"pointer", background:"rgba(201,169,110,.15)", color:"#8A6030", fontFamily:"inherit", fontWeight:500 }}>
                🟡 En cours
              </button>
              <button onClick={()=>{updateStatus(openTopic.id,"termine");setOpenTopic(null);}} style={{ flex:1, padding:"10px", borderRadius:100, fontSize:12.5, border:"none", cursor:"pointer", background:"rgba(139,168,136,.2)", color:"#4E7A4C", fontFamily:"inherit", fontWeight:500 }}>
                ✅ Terminé
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}