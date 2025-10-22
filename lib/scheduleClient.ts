export interface ScheduleFormPayload {
  patientName: string;
  patientEmail: string;
  appointmentTimeISO: string;
  symptoms?: string;
  localePreference?: string;
}

export interface ScheduleSuccessResponse {
  appointment_id: string;
  doxy_link: string;
  calendar_link: string;
  message: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://medikah-chat-api.onrender.com';

export async function postSchedule(
  payload: ScheduleFormPayload,
): Promise<ScheduleSuccessResponse> {
  if (!API_BASE) {
    throw new Error('API base URL is not configured');
  }

  const endpoint = `${API_BASE.replace(/\/$/, '')}/schedule`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_name: payload.patientName,
      patient_contact: payload.patientEmail,
      appointment_time: payload.appointmentTimeISO,
      symptoms: payload.symptoms,
      locale_preference: payload.localePreference,
    }),
  });

  if (!response.ok) {
    const details = await safeParseError(response);
    throw new Error(details);
  }

  const json = (await response.json()) as ScheduleSuccessResponse;
  return json;
}

async function safeParseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') {
      return body.detail;
    }
  } catch {
    // ignore JSON parsing errors and fall back to status text
  }
  return response.statusText || 'Schedule request failed';
}
