// Placeholder for a future ad network (e.g. Google AdSense). Kept as its
// own component so wiring in a real network later only means editing
// this one file. Intentionally non-blocking - it never sits between a
// user and something they're trying to do (like exporting a document).
export function AdSlot({ label = "Advertisement" }: { label?: string }) {
  return (
    <div
      className="card"
      style={{
        padding: "1rem",
        marginBottom: "1rem",
        textAlign: "center",
        color: "var(--ink-soft)",
      }}
    >
      <p className="eyebrow" style={{ margin: 0 }}>{label}</p>
      <p style={{ fontSize: "0.85rem", margin: "0.5rem 0 0" }}>Ad space</p>
    </div>
  );
}
