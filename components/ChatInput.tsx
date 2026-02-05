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
  placeholder = 'Describe what you are feeling…',
  accentColor = 'blue',
}: ChatInputProps) {
  const bgColorClass = accentColor === 'teal'
    ? 'bg-clinical-teal'
    : 'bg-inst-blue';
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) return;
    onSubmit(value);
  };

  return (
    <div className="px-4 sm:px-10 py-6 bg-gradient-to-t from-[#FAFAFB] via-[#FAFAFB]/95 to-[#FAFAFB]/0 backdrop-blur-sm">
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
          className={`font-dm-sans w-full resize-none ${bgColorClass} text-white text-base leading-relaxed font-normal placeholder:text-white/50 caret-clinical-teal selection:bg-clinical-teal/20 rounded-[16px] pl-6 pr-[120px] py-[18px] min-h-[56px] max-h-[200px] shadow-[0_2px_8px_rgba(27,42,65,0.12),0_8px_24px_rgba(27,42,65,0.08)] transition-shadow duration-300 focus:outline-none focus:shadow-[0_3px_12px_rgba(27,42,65,0.16),0_12px_32px_rgba(27,42,65,0.12),0_0_0_3px_rgba(44,122,140,0.3)]`}
          rows={1}
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={isSending}
          aria-disabled={isSending}
          className="font-dm-sans absolute right-3 bottom-3 px-7 py-3 font-semibold tracking-[0.02em] text-[15px] bg-clinical-teal text-white rounded-[10px] shadow-[0_2px_8px_rgba(44,122,140,0.3)] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#2A8DA0] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(44,122,140,0.4)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Send
        </button>
      </form>
      <p className="font-dm-sans max-w-[900px] mx-auto text-[13px] mt-3 text-center text-archival-grey font-normal">
        Press Enter to send. Shift+Enter for a new line.
      </p>
    </div>
  );
}
