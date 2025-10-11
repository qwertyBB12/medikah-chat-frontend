import { FormEvent, KeyboardEvent, RefObject } from 'react';
import { ThemeSettings } from '../lib/theme';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void | Promise<void>;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  themeSettings: ThemeSettings;
  isSending: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  textareaRef,
  themeSettings,
  isSending
}: ChatInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) return;
    onSubmit(value);
  };

  return (
    <div className={`px-4 sm:px-10 py-4 ${themeSettings.chatInputBackground}`}>
      <form
        onSubmit={handleSubmit}
        className={`max-w-3xl mx-auto w-full flex items-end gap-3 px-4 py-3 rounded-none shadow ${themeSettings.chatInputSurface}`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message Medikah"
          placeholder="Type your message…"
          className="flex-1 resize-none bg-transparent focus:outline-none text-base leading-6 placeholder:text-muted/70"
          rows={1}
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={isSending}
          aria-disabled={isSending}
          className={`px-4 py-2 font-heading font-semibold transition rounded-none lowercase disabled:opacity-60 disabled:cursor-not-allowed ${themeSettings.primaryButton}`}
        >
          Send
        </button>
      </form>
      <p className={`max-w-3xl mx-auto text-xs mt-3 text-center ${themeSettings.guidanceText}`}>
        Take your time describing your symptoms. Press Enter to send, or Shift+Enter for a new line.
      </p>
    </div>
  );
}
