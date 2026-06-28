/**
 * US identity (State ID / Driver License) types — Aguirre credentialing change 4.
 * Equivalent of the MX CURP/INE identity item for US physicians.
 */
export interface USIdentity {
  issuingState?: string; // US state name
  idNumber?: string; // State ID / driver license number
  idFrontUploaded: boolean;
  idBackUploaded: boolean;
}

export interface SaveUSIdentityField {
  field: 'issuingState' | 'idNumber';
  value: string;
}
