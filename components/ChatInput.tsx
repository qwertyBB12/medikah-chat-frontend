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
    <div className="px-4 sm:px-10 py-4 bg-cream-400/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto w-full flex items-end gap-3 px-5 py-4 rounded-lg bg-navy-900/95 text-cream-300 ring-1 ring-cream-500/10 shadow-lg shadow-navy-900/20 transition-colors"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message Medikah"
          placeholder="Describe what you are feeling\u2026"
          className="flex-1 resize-none bg-transparent focus:outline-none text-base leading-7 font-body font-normal text-cream-300 placeholder:text-cream-300/40 caret-teal selection:bg-teal/20"
          rows={1}
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={isSending}
          aria-disabled={isSending}
          className="px-5 py-2 font-heading font-normal uppercase tracking-wider text-sm bg-teal text-white transition hover:bg-teal-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
        >
          Send
        </button>
      </form>
      <p className="max-w-3xl mx-auto text-xs mt-3 text-center text-navy-900/40 font-body">
        Press Enter to send. Shift+Enter for a new line.
      </p>
    </div>
  );
}
