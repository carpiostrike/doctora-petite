export default function Notification({ icon, title, msg }) {
    return (
      <div className="notif">
        <span className="notif-icon">{icon}</span>
        <div className="notif-body">
          <strong className="notif-title">{title}</strong>
          <span className="notif-msg">{msg}</span>
        </div>
      </div>
    );
  }