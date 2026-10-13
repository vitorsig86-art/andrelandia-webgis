import { useId, useRef, useState } from "react";
import type { SurveyInfo } from "../projects/types";
import "./SurveyAbout.css";

export function SurveyAbout({ survey }: { survey: SurveyInfo }) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function show() {
    dialogRef.current?.showModal();
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    setOpen(true);
  }

  return (
    <>
      <button ref={triggerRef} type="button" className="survey-about-trigger" aria-label="Sobre o levantamento" title="Sobre o levantamento" aria-haspopup="dialog" aria-controls={id} aria-expanded={open} onClick={show}>
        <span aria-hidden="true">ⓘ</span><span className="survey-about-trigger-text">Sobre o levantamento</span>
      </button>
      <dialog ref={dialogRef} id={id} className="survey-about-dialog" aria-labelledby={id + "-title"} onKeyDown={(event) => event.stopPropagation()} onClose={() => { setOpen(false); triggerRef.current?.focus(); }}>
        <header className="survey-about-heading">
          <h2 id={id + "-title"}>{survey.title}</h2>
          <button type="button" autoFocus className="survey-about-close" aria-label="Fechar informações do levantamento" onClick={() => dialogRef.current?.close()}>×</button>
        </header>
        <div ref={bodyRef} className="survey-about-body" tabIndex={0} role="region" aria-label="Informações do levantamento">
          <dl>
            {survey.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
          </dl>
          <details className="survey-about-details">
            <summary>Qualidade e referências</summary>
            {survey.quality.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </details>
        </div>
      </dialog>
    </>
  );
}
