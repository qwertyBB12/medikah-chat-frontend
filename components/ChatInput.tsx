import { FormEvent, KeyboardEvent, RefObject } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void | Promise<void>;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isSending: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  textareaRef,
  isSending,
}: ChatInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) return;
    onSubmit(value);
  };

  return (
    <div className="px-4 sm:px-10 py-4 bg-linen/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto w-full flex items-end gap-3 px-5 py-4 rounded-lg bg-inst-blue/95 text-white ring-1 ring-white/10 shadow-lg shadow-inst-blue/20 transition-colors"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message Medikah"
          placeholder="Describe what you are feeling…"
          className="flex-1 resize-none bg-transparent focus:outline-none text-base leading-7 font-normal text-white placeholder:text-white/40 caret-clinical-teal selection:bg-clinical-teal/20"
          rows={1}
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={isSending}
          aria-disabled={isSending}
          className="px-5 py-2 font-semibold tracking-wide text-sm bg-clinical-teal text-white transition hover:bg-clinical-teal-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
        >
          Send
        </button>
      </form>
      <p className="max-w-3xl mx-auto text-xs mt-3 text-center text-body-slate/50 font-body">
        Press Enter to send. Shift+Enter for a new line.
      </p>
    </div>
  );
}
