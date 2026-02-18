import { FormEvent, KeyboardEvent, RefObject } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void | Promise<void>;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isSending: boolean;
  placeholder?: string;
  accentColor?: 'blue' | 'teal';
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  textareaRef,
  isSending,
  placeholder = 'Describe what you are feeling\u2026',
  accentColor = 'teal',
}: ChatInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) return;
    onSubmit(value);
  };

  return (
    <div className="px-4 sm:px-10 py-6 bg-gradient-to-t from-linen-light via-linen-light/95 to-linen-light/0 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="max-w-[900px] mx-auto w-full relative"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message Medikah"
          placeholder={placeholder}
          className="font-body w-full resize-none bg-warm-gray-800 text-white text-base leading-relaxed font-normal placeholder:text-white/50 caret-teal-400 selection:bg-teal-500/20 rounded-sm pl-6 pr-[120px] py-[18px] min-h-[56px] max-h-[200px] shadow-[0_2px_8px_rgba(45,43,41,0.12),0_8px_24px_rgba(45,43,41,0.08)] transition-shadow duration-300 focus:outline-none focus:shadow-[0_3px_12px_rgba(45,43,41,0.16),0_12px_32px_rgba(45,43,41,0.12),0_0_0_3px_rgba(44,122,140,0.3)]"
          rows={1}
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={isSending}
          aria-disabled={isSending}
          className="font-body absolute right-3 bottom-3 px-7 py-3 font-medium tracking-[0.02em] text-[15px] text-white rounded-sm shadow-[0_2px_8px_rgba(44,122,140,0.3)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(44,122,140,0.4)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          style={{
            backgroundColor: accentColor === 'blue' ? '#1B2A41' : '#2C7A8C',
          }}
        >
          Send
        </button>
      </form>
      <p className="font-body max-w-[900px] mx-auto text-[13px] mt-3 text-center text-text-muted font-normal">
        Press Enter to send. Shift+Enter for a new line.
      </p>
    </div>
  );
}
