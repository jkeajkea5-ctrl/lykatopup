export function StatusLine({ icon, text, tone = '' }) {
  return (
    <div className={`statusLine ${tone}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

