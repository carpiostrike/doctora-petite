import { useState } from "react";
import { useApp, Card, CardLabel, Btn } from "../App";
import { FR_MONTHS, FR_DAYS, todayStr } from "../constants";

const DOT_COLORS = { exam: "#C9897A", class: "#7B9EC7", rotation: "#8BA888" };

export default function CalendarView() {
  const { events, documents, setAddEventOpen } = useApp();
  const [calDate,  setCalDate]  = useState(new Date());
  const [selected, setSelected] = useState(todayStr());

  const year  = calDate.getFullYear();
  const month = calDate.getMonth();

  const changeMonth = (dir) => {
    const d = new Date(calDate);
    d.setMonth(d.getMonth() + dir);
    setCalDate(d);
  };

  const fmtDate = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const today        = todayStr();
  const firstDay     = new Date(year, month, 1).getDay();
  const offset       = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const prevDays     = new Date(year, month, 0).getDate();

  const getDots = (dateStr) =>
    events.filter((e) => e.date === dateStr).map((e) => e.type);

  const selectedEvents = events
    .filter((e) => e.date === selected)
    .sort((a, b) => a.time?.localeCompare(b.time));

  return (
    <div className="cal-layout view-enter">
      {/* Calendar grid */}
      <Card>
        <div className="cal-nav">
          <button className="cal-btn" onClick={() => changeMonth(-1)}>‹</button>
          <div className="cal-month">{FR_MONTHS[month]} {year}</div>
          <button className="cal-btn" onClick={() => changeMonth(1)}>›</button>
        </div>

        <div className="cal-grid">
          {/* Day headers */}
          {FR_DAYS.map((d) => (
            <div key={d} className="cal-head">{d}</div>
          ))}

          {/* Previous month padding */}
          {Array.from({ length: offset }, (_, i) => (
            <div key={`p${i}`} className="cal-day other">
              <span className="cal-num">{prevDays - offset + 1 + i}</span>
            </div>
          ))}

          {/* Current month */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day     = i + 1;
            const dateStr = fmtDate(year, month, day);
            const dots    = getDots(dateStr);
            const isToday = dateStr === today;
            const isSel   = dateStr === selected;
            const cls     = `cal-day${isToday ? " today" : ""}${isSel && !isToday ? " selected" : ""}`;

            return (
              <div key={day} className={cls} onClick={() => setSelected(dateStr)}>
                <span className="cal-num">{day}</span>
                {dots.length > 0 && (
                  <div className="cal-dots">
                    {dots.slice(0, 3).map((type, ti) => (
                      <div key={ti} className="cal-dot" style={{ background: DOT_COLORS[type] || "#B0A8BB" }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(61,43,79,.06)" }}>
          {Object.entries(DOT_COLORS).map(([type, color]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--soft)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
              {{ exam: "Examen", class: "Cours", rotation: "Rotation" }[type]}
            </div>
          ))}
        </div>
      </Card>

      {/* Day events sidebar */}
      <div className="events-sidebar">
        <Card>
          <CardLabel>
            {selected === today ? "Aujourd'hui" : selected} · {selectedEvents.length} événement{selectedEvents.length !== 1 ? "s" : ""}
          </CardLabel>

          {selectedEvents.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Aucun événement ce jour.</p>
          ) : (
            selectedEvents.map((ev) => {
              const doc = documents.find((d) => d.id === ev.linkedDocId);
              return (
                <div key={ev.id} className="event-item">
                  <div className="event-bar" style={{ background: DOT_COLORS[ev.type] || "#B0A8BB" }} />
                  <div className="event-time">{ev.time || ""}</div>
                  <div>
                    <div className="event-name">{ev.title}</div>
                    {doc && (
                      <div className="event-link">📄 {doc.name} →</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </Card>

        <Btn
          variant="primary"
          onClick={() => setAddEventOpen(true)}
          style={{ width: "100%", justifyContent: "center" }}
        >
          + Ajouter un événement
        </Btn>
      </div>
    </div>
  );
}