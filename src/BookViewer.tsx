import { useState } from "react";
import { asset, books } from "./config";
import { useDialog } from "./useDialog";
import { useDialogExit } from "./useDialogExit";

export default function BookViewer({
  id,
  acquired,
  onSelect,
  onClose,
}: {
  id: number;
  acquired: number[];
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [back, setBack] = useState(false);
  const exit = useDialogExit(onClose);
  useDialog(true, exit.close);
  const book = books[id - 1],
    index = acquired.indexOf(id);
  return (
    <div className="modal-backdrop book-backdrop" ref={exit.root}>
      <div className="modal book-modal book-viewer">
        <h2 className="visually-hidden">{book.title}</h2>
        <button
          className="book-close round"
          onClick={exit.close}
          aria-label="Voltar à biblioteca"
        >
          ×
        </button>
        <div className={`book-turn ${back ? "is-back" : ""}`}>
          <div className="book-turn-inner">
            <div
              className="book-face book-front"
              aria-hidden={back}
              inert={back}
            >
              <img
                src={asset(`book-${id}-cover`)}
                alt={`Capa de ${book.title}`}
              />
            </div>
            <div
              className="book-face book-back"
              aria-hidden={!back}
              inert={!back}
            >
              <span className="book-ornament" aria-hidden="true">
                ❦
              </span>
              <h3>{book.title}</h3>
              <p className="author">{book.author}</p>
              <div
                key={id}
                className="book-synopsis"
                tabIndex={back ? 0 : -1}
                role="region"
                aria-label="Sinopse"
              >
                <p>{book.synopsis}</p>
              </div>
              <span className="book-ornament" aria-hidden="true">
                ❧
              </span>
            </div>
          </div>
        </div>
        <button
          className="book-flip"
          onClick={() => setBack(!back)}
          aria-expanded={back}
        >
          {back ? "Voltar à capa" : "Ler sinopse"}
        </button>
        {acquired.length > 1 && (
          <nav className="book-navigation" aria-label="Seus livros">
            <button
              disabled={index === 0}
              aria-label="Livro anterior"
              onClick={() => {
                setBack(false);
                onSelect(acquired[index - 1]);
              }}
            >
              ‹
            </button>
            <span>
              {index + 1} de {acquired.length}
            </span>
            <button
              disabled={index === acquired.length - 1}
              aria-label="Próximo livro"
              onClick={() => {
                setBack(false);
                onSelect(acquired[index + 1]);
              }}
            >
              ›
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
