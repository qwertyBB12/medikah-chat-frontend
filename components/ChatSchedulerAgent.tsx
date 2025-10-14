import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getSchedulerCopy, SupportedLang } from '../lib/i18n';
import {
  postSchedule,
  ScheduleFormPayload,
  ScheduleSuccessResponse,
} from '../lib/scheduleClient';

export interface SchedulerAction {
  label: string;
  url: string;
}

export interface SchedulerBotMessage {
  text: string;
  actions?: SchedulerAction[];
}

export type SchedulerAgentState =
  | 'idle'
  | 'awaiting_user'
  | 'scheduling'
  | 'completed';

export interface ChatSchedulerAgentHandle {
  start: () => void;
  isActive: () => boolean;
  isAwaitingInput: () => boolean;
  handleUserInput: (input: string) => Promise<boolean>;
}

interface ChatSchedulerAgentProps {
  lang: SupportedLang;
  sessionName?: string;
  sessionEmail?: string;
  appendMessage: (message: SchedulerBotMessage) => void;
  onStateChange?: (state: SchedulerAgentState) => void;
}

type QuestionKey = 'name' | 'email' | 'symptoms' | 'time' | 'locale';

interface CollectedData {
  patientName?: string;
  patientEmail?: string;
  symptoms?: string;
  preferredTimeISO?: string;
  localePreference?: string;
}

const SKIP_WORDS: Record<SupportedLang, string[]> = {
  en: ['skip'],
  es: ['saltar', 'omit', 'skip'],
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parsePreferredTime(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Try native parsing first
  let parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Handle common "YYYY-MM-DD HH:MM" format
  const isoLikeMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/,
  );
  if (isoLikeMatch) {
    const [, year, month, day, hour, minute] = isoLikeMatch;
    parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    );
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const lower = trimmed.toLowerCase();
  const now = new Date();
  const base = new Date(now);

  const timeMatch = lower.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|(\d{1,2})h/,
  );

  const setTime = (hours: number, minutes: number) => {
    base.setHours(hours, minutes, 0, 0);
  };

  if (lower.includes('tomorrow')) {
    base.setDate(base.getDate() + 1);
  } else if (lower.includes('today')) {
    // keep same date
  } else if (lower.includes('next week')) {
    base.setDate(base.getDate() + 7);
  } else {
    const weekdayMatch = lower.match(
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
    );
    if (weekdayMatch) {
      const weekdays = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const targetIndex = weekdays.indexOf(weekdayMatch[1]);
      if (targetIndex >= 0) {
        const delta =
          (targetIndex + 7 - base.getDay() + (lower.includes('next') ? 7 : 0)) %
          7 || 7;
        base.setDate(base.getDate() + delta);
      }
    }
  }

  if (timeMatch) {
    let hours = Number(timeMatch[1] ?? timeMatch[4]);
    const minutes = Number(timeMatch[2] ?? 0);
    const meridiem = timeMatch[3];
    if (!Number.isNaN(hours)) {
      if (meridiem) {
        if (meridiem === 'pm' && hours < 12) {
          hours += 12;
        }
        if (meridiem === 'am' && hours === 12) {
          hours = 0;
        }
      }
      setTime(hours, minutes);
      return base.toISOString();
    }
  }

  if (!Number.isNaN(base.getTime()) && timeMatch) {
    return base.toISOString();
  }

  return null;
}

const ChatSchedulerAgent = forwardRef<
  ChatSchedulerAgentHandle,
  ChatSchedulerAgentProps
>((props, ref) => {
  const { lang, sessionName, sessionEmail, appendMessage, onStateChange } = props;
  const copy = useMemo(() => getSchedulerCopy(lang), [lang]);

  const dataRef = useRef<CollectedData>({});
  const [state, setState] = useState<SchedulerAgentState>('idle');
  const [question, setQuestion] = useState<QuestionKey | null>(null);
  const askLocaleRef = useRef(false);
  const schedulingRef = useRef(false);

  const updateState = (next: SchedulerAgentState) => {
    setState(next);
    onStateChange?.(next);
  };

  const reset = () => {
    dataRef.current = {};
    askLocaleRef.current = false;
    setQuestion(null);
    schedulingRef.current = false;
  };

  const askQuestion = (key: QuestionKey, message: string) => {
    setQuestion(key);
    updateState('awaiting_user');
    appendMessage({ text: message });
  };

  const queueNextQuestion = () => {
    const data = dataRef.current;
    if (!data.patientName) {
      askQuestion('name', copy.askName);
      return;
    }
    if (!data.patientEmail) {
      askQuestion('email', copy.askEmail);
      return;
    }
    if (!data.symptoms) {
      askQuestion('symptoms', copy.askSymptoms);
      return;
    }
    if (!data.preferredTimeISO) {
      askQuestion('time', `${copy.askTime}\n${copy.askTimeHelp}`);
      return;
    }
    if (!askLocaleRef.current) {
      askLocaleRef.current = true;
      askQuestion('locale', `${copy.askLocale}\n${copy.optionalSkipHint}`);
      return;
    }
    scheduleAppointment();
  };

  const scheduleAppointment = async () => {
    const { patientName, patientEmail, symptoms, preferredTimeISO, localePreference } =
      dataRef.current;

    if (!patientName || !patientEmail || !preferredTimeISO) {
      reset();
      updateState('idle');
      return;
    }

    setQuestion(null);
    updateState('scheduling');
    appendMessage({ text: `${copy.confirmScheduling}\n${copy.agentSignature}` });
    schedulingRef.current = true;

    const payload: ScheduleFormPayload = {
      patientName,
      patientEmail,
      appointmentTimeISO: preferredTimeISO,
      symptoms,
      localePreference,
    };

    try {
      const response: ScheduleSuccessResponse = await postSchedule(payload);
      appendMessage({
        text: `${copy.successHeadline}\n\n${copy.successDetails}\n${copy.agentSignature}`,
        actions: [
          { label: copy.viewDoxy, url: response.doxy_link },
          { label: copy.addCalendar, url: response.calendar_link },
        ],
      });
      updateState('completed');
    } catch (error) {
      console.error('Medikah scheduler failed:', error);
      appendMessage({
        text: `${copy.failureHeadline}\n${copy.failureDetails}\n${copy.agentSignature}`,
      });
      updateState('completed');
    } finally {
      schedulingRef.current = false;
      setTimeout(() => {
        reset();
        updateState('idle');
      }, 600);
    }
  };

  const handleUserInput = async (rawInput: string): Promise<boolean> => {
    if (state === 'idle') {
      return false;
    }

    if (state === 'scheduling') {
      return true;
    }

    const activeQuestion = question;
    if (!activeQuestion) {
      return false;
    }

    const input = rawInput.trim();
    const data = dataRef.current;

    switch (activeQuestion) {
      case 'name': {
        if (!input) {
          appendMessage({ text: copy.invalidName });
          return true;
        }
        data.patientName = input;
        break;
      }
      case 'email': {
        if (!isValidEmail(input)) {
          appendMessage({ text: copy.invalidEmail });
          return true;
        }
        data.patientEmail = input;
        break;
      }
      case 'symptoms': {
        if (!input) {
          appendMessage({ text: copy.invalidSymptoms });
          return true;
        }
        data.symptoms = input;
        break;
      }
      case 'time': {
        const parsed = parsePreferredTime(input);
        if (!parsed) {
          appendMessage({ text: copy.invalidTime });
          return true;
        }
        data.preferredTimeISO = parsed;
        break;
      }
      case 'locale': {
        const lower = input.toLowerCase();
        const shouldSkip = SKIP_WORDS[lang]?.some((word) => lower === word);
        data.localePreference = shouldSkip ? undefined : input;
        break;
      }
      default:
        break;
    }

    setQuestion(null);
    queueNextQuestion();
    return true;
  };

  const start = () => {
    if (state === 'awaiting_user' || state === 'scheduling') {
      return;
    }
    reset();

    const name = sessionName?.trim();
    const email = sessionEmail?.trim();
    if (name) {
      dataRef.current.patientName = name;
    }
    if (email) {
      dataRef.current.patientEmail = email;
    }

    updateState('awaiting_user');
    appendMessage({ text: `${copy.introGreeting}\n${copy.agentSignature}` });
    if (name || email) {
      appendMessage({ text: copy.acknowledgePrefill });
    }
    queueNextQuestion();
  };

  useImperativeHandle(ref, () => ({
    start,
    isActive: () => state === 'awaiting_user' || state === 'scheduling',
    isAwaitingInput: () => state === 'awaiting_user' && !schedulingRef.current,
    handleUserInput,
  }));

  return null;
});

ChatSchedulerAgent.displayName = 'ChatSchedulerAgent';

export default ChatSchedulerAgent;
