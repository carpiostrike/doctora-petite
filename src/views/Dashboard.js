import { useState, useEffect } from "react";
import { useApp, Card, CardLabel, Modal, Btn, SPECIALTIES } from "../App";

export default function Dashboard() {
  const { events, progress, documents, setActiveView, semesterSpecs = [], updateSemesterSpecs, setAddEventOpen } = useApp();
  const [editSemester, setEditSemester] = useState(false);
  const [tempSpecs,    setTempSpecs]    = useState([]);

  // Next exam countdown
  const nextExam = events
    .filter(e => e.type === "exam" && new Date(e.date) >= new Date())
    .sort((a,b) => new Date(a.date)-new Date(b.date))[0];

  const [countdown, setCountdown] = useState({ d:0, h:"00", m:"00" });
  useEffect(()=>{
    if (!nextExam) return;
    const tick = () => {
      const diff = new Date(`${nextExam.date}T${nextExam.time||"09:00"}`) - new Date();
      if (diff <= 0) return;
      setCountdown({ d:Math.floor(diff/86400000), h:String(Math.floor(diff%86400000/3600000)).padStart(2,"0"), m:String(Math.floor(diff%3600000/60000)).padStart(2,"0") });
    };
    tick(); const id = setInterval(tick, 60000); return ()=>clearInterval(id);
  },[nextExam]);

  const today = new Date().toISOString().split("T")[0];
  const todayEvents = events.filter(e=>e.date===today).sort((a,b)=>a.time?.localeCompare(b.time));

  // Semester specialties
  const activeSemester = (() => {
    try {
      const saved = localStorage.getItem("dp_semester_specs");
      return saved ? JSON.parse(saved) : semesterSpecs;
    } catch { return semesterSpecs; }
  })();
  const semesterSpecObjects = SPECIALTIES.filter(s => activeSemester.includes(s.id));

  const openEditSemester = () => { setTempSpecs([...activeSemester]); setEditSemester(true); };

  const toggleSpec = (id) => {
    setTempSpecs(prev => prev.includes(id) ? prev.filter(s=>s!==id) : [...prev, id]);
  };

  const saveSemester = () => {
    localStorage.setItem("dp_semester_specs", JSON.stringify(tempSpecs));
    if (typeof updateSemesterSpecs === "function") updateSemesterSpecs(tempSpecs);
    setEditSemester(false);
    window.location.reload();
  };

  const DOT_COLORS = { exam:"#C9897A", class:"#7B9EC7", rotation:"#8BA888", revision:"#8BA888" };

  return (
    <div className="dash-grid view-enter">

      {/* ── NEXT EXAM ── */}
      <Card className="exam-card">
        <CardLabel>Prochain examen</CardLabel>
        {nextExam ? (
          <>
            <div className="exam-name">{nextExam.title.replace("Examen — ","")}</div>
            <div className="exam-spec">{SPECIALTIES.find(s=>s.id===nextExam.specialty)?.label} · {nextExam.date}</div>
            <div className="countdown">
              <div className="cd-block"><span className="cd-num">{countdown.d}</span><span className="cd-lbl">jours</span></div>
              <span className="cd-sep">:</span>
              <div className="cd-block"><span className="cd-num">{countdown.h}</span><span className="cd-lbl">heures</span></div>
              <span className="cd-sep">:</span>
              <div className="cd-block"><span className="cd-num">{countdown.m}</span><span className="cd-lbl">min</span></div>
            </div>
            <div
              onClick={()=>setAddEventOpen(true)}
              style={{ marginTop:14, fontSize:11, color:"rgba(255,255,255,.4)", cursor:"pointer", textDecoration:"underline" }}
            >
              ✏️ Modifier / ajouter un examen
            </div>
          </>
        ) : (
          <div>
            <p style={{ color:"rgba(255,255,255,.5)", fontSize:13, lineHeight:1.7, marginBottom:16 }}>
              Aucun examen planifié.<br/>
              <span style={{ fontSize:11.5 }}>Ajoute ton prochain partiel pour voir le compte à rebours.</span>
            </p>
            <button
              onClick={()=>setAddEventOpen(true)}
              style={{ padding:"8px 16px", borderRadius:100, background:"rgba(201,169,110,.25)", color:"var(--gold)", border:"1px solid rgba(201,169,110,.4)", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:500 }}
            >
              + Ajouter un examen
            </button>
          </div>
        )}
      </Card>

      {/* ── TODAY'S EVENTS ── */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <p className="card-label" style={{ margin:0 }}>Aujourd'hui</p>
          <button
            onClick={()=>setAddEventOpen(true)}
            style={{ fontSize:11, color:"var(--rose)", background:"none", border:"none", cursor:"pointer" }}
          >
            + Ajouter
          </button>
        </div>
        {todayEvents.length === 0 ? (
          <div>
            <p style={{ fontSize:13, color:"var(--muted)", lineHeight:1.7, marginBottom:12 }}>
              Aucun événement aujourd'hui.<br/>
              <span style={{ fontSize:11.5 }}>Ajoute tes cours, examens et rotations.</span>
            </p>
            <div style={{ fontSize:11.5, color:"var(--muted)", lineHeight:1.8 }}>
              <div>📚 <strong>Cours</strong> — tes séances du jour</div>
              <div>🏥 <strong>Rotation</strong> — stages hospitaliers</div>
              <div>📝 <strong>Examen</strong> — partiels et évaluations</div>
            </div>
            <button
              onClick={()=>setActiveView("calendar")}
              style={{ marginTop:12, padding:"7px 14px", borderRadius:100, background:"var(--blush)", color:"var(--soft)", border:"1px solid rgba(61,43,79,.1)", cursor:"pointer", fontSize:11.5, fontFamily:"inherit" }}
            >
              → Aller au Calendrier
            </button>
          </div>
        ) : (
          todayEvents.map(ev=>{
            const spec = SPECIALTIES.find(s=>s.id===ev.specialty);
            const doc  = documents.find(d=>d.id===ev.linkedDocId);
            return (
              <div
                key={ev.id}
                className="topic-row"
                onClick={()=>setActiveView("calendar")}
              >
                <div style={{ width:3, height:36, borderRadius:2, background:DOT_COLORS[ev.type]||"#B0A8BB", flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div className="topic-name">{ev.title}</div>
                  <div className="topic-src">{doc?.name || spec?.label || ev.type}</div>
                </div>
                <div className="topic-time">{ev.time}</div>
              </div>
            );
          })
        )}
      </Card>

      {/* ── PROGRESS ── */}
      <Card style={{ gridRow:"1/3" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <p className="card-label" style={{ margin:0 }}>Progression — Semestre</p>
          <button onClick={openEditSemester} style={{ fontSize:11, color:"var(--rose)", background:"none", border:"none", cursor:"pointer" }}>
            ✏️ Éditer
          </button>
        </div>

        {semesterSpecObjects.length === 0 ? (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <p style={{ fontSize:13, color:"var(--muted)", lineHeight:1.7, marginBottom:12 }}>
              Sélectionne tes matières<br/>du semestre actuel.
            </p>
            <Btn variant="ghost" onClick={openEditSemester} style={{ fontSize:12 }}>Choisir mes spécialités</Btn>
          </div>
        ) : (
          semesterSpecObjects.map(spec=>{
            const p   = progress.find(x=>x.specialtyId===spec.id);
            const tot = p?.topicsTotal || 0;
            const don = p?.topicsDone  || 0;
            const pct = tot > 0 ? Math.round(don/tot*100) : 0;
            return (
              <div key={spec.id} className="prog-item" onClick={()=>setActiveView("progress")} style={{ cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.opacity=".7"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}
              >
                <div className="prog-header">
                  <span className="prog-name">{spec.icon} {spec.label}</span>
                  <span className="prog-pct">{tot > 0 ? `${don}/${tot}` : "—"}</span>
                </div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width:`${pct}%`, background:spec.color }} />
                </div>
              </div>
            );
          })
        )}

        {semesterSpecObjects.length > 0 && (
          <div onClick={()=>setActiveView("progress")} style={{ marginTop:14, fontSize:11.5, color:"var(--rose)", cursor:"pointer", textAlign:"center" }}>
            → Gérer mes thèmes
          </div>
        )}
      </Card>

      {/* ── QUICK ACCESS ── */}
      <Card style={{ gridColumn:"1/3" }}>
        <CardLabel>Accès rapides</CardLabel>
        <div className="quick-grid">
          {[
            { icon:"🔍", label:"Buscador IA",   desc:"Cherche dans tous tes PDFs, apuntes et Collèges", view:"search"   },
            { icon:"📊", label:"Progression",   desc:"Suis tes thèmes ECNi et marque tes avancées",     view:"progress" },
            { icon:"🏥", label:"Mode Hôpital",  desc:"Références rapides pour les gardes et rotations",  view:"hospital" },
          ].map(item=>(
            <div key={item.view} className="quick-item" onClick={()=>setActiveView(item.view)}>
              <div className="quick-icon">{item.icon}</div>
              <div className="quick-label">{item.label}</div>
              <div className="quick-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── UPCOMING EVENTS ── */}
      <Card style={{ gridColumn:"3/4", gridRow:"3/4" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <p className="card-label" style={{ margin:0 }}>Prochains événements</p>
          <button onClick={()=>setActiveView("calendar")} style={{ fontSize:11, color:"var(--rose)", background:"none", border:"none", cursor:"pointer" }}>→ Calendrier</button>
        </div>
        {events.filter(e=>e.date >= today).slice(0,4).length === 0 ? (
          <div>
            <p style={{ fontSize:12.5, color:"var(--muted)", lineHeight:1.7, marginBottom:10 }}>
              Aucun événement planifié.<br/>
              <span style={{ fontSize:11.5 }}>Commence par ajouter ton prochain cours ou examen.</span>
            </p>
            <button
              onClick={()=>setAddEventOpen(true)}
              style={{ padding:"7px 14px", borderRadius:100, background:"var(--blush)", color:"var(--soft)", border:"1px solid rgba(61,43,79,.1)", cursor:"pointer", fontSize:11.5, fontFamily:"inherit" }}
            >
              + Ajouter un événement
            </button>
          </div>
        ) : (
          events
            .filter(e=>e.date >= today)
            .sort((a,b)=>a.date.localeCompare(b.date))
            .slice(0,4)
            .map(ev=>{
              const spec = SPECIALTIES.find(s=>s.id===ev.specialty);
              return (
                <div key={ev.id} className="rot-row" onClick={()=>setActiveView("calendar")} style={{ cursor:"pointer" }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:DOT_COLORS[ev.type]||"#B0A8BB", flexShrink:0 }} />
                  <span className="rot-name">{ev.title}</span>
                  <span className="rot-date">{ev.date}</span>
                </div>
              );
            })
        )}
      </Card>

      {/* ── MODAL: Edit semester ── */}
      <Modal open={editSemester} onClose={()=>setEditSemester(false)} title="✏️ Spécialités du semestre">
        <p style={{ fontSize:12.5, color:"var(--soft)", marginBottom:16, lineHeight:1.6 }}>
          Sélectionne les matières de ton semestre actuel. Seules celles-ci apparaîtront dans le tableau de bord.
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, maxHeight:300, overflowY:"auto" }}>
          {SPECIALTIES.filter(s=>s.id!=="other").map(spec=>{
            const isOn = tempSpecs.includes(spec.id);
            return (
              <div key={spec.id} onClick={()=>toggleSpec(spec.id)} style={{
                padding:"6px 13px", borderRadius:100, fontSize:12.5, cursor:"pointer",
                border:`1.5px solid ${isOn?spec.color:"rgba(61,43,79,.1)"}`,
                background: isOn ? spec.color+"20" : "white",
                color: isOn ? spec.color : "var(--soft)",
                fontWeight: isOn ? 500 : 400,
                transition:"all .15s",
              }}>
                {spec.icon} {spec.label}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:11, color:"var(--muted)", marginTop:10 }}>
          {tempSpecs.length} spécialité{tempSpecs.length!==1?"s":""} sélectionnée{tempSpecs.length!==1?"s":""}
        </div>
        <div className="modal-actions">
          <Btn variant="ghost" onClick={()=>setEditSemester(false)}>Annuler</Btn>
          <Btn variant="primary" onClick={saveSemester}>Sauvegarder</Btn>
        </div>
      </Modal>

    </div>
  );
}