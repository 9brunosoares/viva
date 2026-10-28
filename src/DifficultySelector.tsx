import { difficulties, type Difficulty } from "./difficulty";
export default function DifficultySelector({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
}) {
  return (
    <fieldset className="settings-difficulty">
      <legend>Dificuldade</legend>
      <div>
        {difficulties.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={value === d.id}
            onClick={() => onChange(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
