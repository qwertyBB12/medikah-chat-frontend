/** Contact info types for Phase 7 DASH-05 — maps to physicians table contact columns */

export interface ContactInfo {
  phoneNumber: string;
  faxNumber: string;
  mailingAddressLine1: string;
  mailingAddressCity: string;
  mailingAddressState: string;
  mailingAddressPostalCode: string;
  mailingAddressCountry: string;
  practiceAddressLine1: string;
  practiceAddressCity: string;
  practiceAddressState: string;
  practiceAddressPostalCode: string;
  practiceAddressCountry: string;
}

export interface SaveContactPayload {
  field: keyof ContactInfo;
  value: string;
}

export type ContactCompletionStatus = 'empty' | 'in_progress' | 'complete';

/** Determine contact section completion:
 * - complete: phone_number is filled
 * - in_progress: any optional field filled but phone empty
 * - empty: all blank
 */
export function getContactCompletionStatus(contact: Partial<ContactInfo>): ContactCompletionStatus {
  const hasPhone = !!contact.phoneNumber?.trim();
  const hasAnyOptional = !!(
    contact.faxNumber?.trim() ||
    contact.mailingAddressLine1?.trim() ||
    contact.mailingAddressCity?.trim() ||
    contact.practiceAddressLine1?.trim() ||
    contact.practiceAddressCity?.trim()
  );
  if (hasPhone) return 'complete';
  if (hasAnyOptional) return 'in_progress';
  return 'empty';
}
