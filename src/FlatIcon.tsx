export default function FlatIcon({ kind }: { kind: "back" | "pause" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "back" ? (
        <path d="m14 5-7 7 7 7M7 12h13" />
      ) : (
        <>
          <path d="M8 5v14M16 5v14" />
        </>
      )}
    </svg>
  );
}
