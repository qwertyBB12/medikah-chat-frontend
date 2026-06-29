/**
 * FAITHFUL COUNSEL PORT — DO NOT HAND-EDIT. Regenerate via the legal pipeline.
 *
 * Source of truth: counsel Luis Ignacio's final documents (2026-04-16),
 *   ~/projects/kah-operations/.planning/notes/legal-final-2026-04-16/
 *   Medikah_ToS_{EN,ES}_{US,MX}_Final.docx
 *
 * Generated verbatim from the .docx (textutil HTML -> typed blocks). The
 * rendered plaintext was verified line-for-line identical to the source
 * (SequenceMatcher similarity 1.0000). To change this text, update the counsel
 * .docx and regenerate — never edit here without counsel review.
 * See CLAUDE.md "Copy Language Rules / Do not modify legal documents".
 */
import type { LegalBlock } from './blocks';

export type TermsRegion = 'US' | 'MX';
export type TermsLocale = 'en' | 'es';

export const TERMS_CONTENT: Record<TermsRegion, Record<TermsLocale, LegalBlock[]>> = {
  "US": {
    "en": [
      {
        "k": "title",
        "t": "MEDIKAH CORPORATION"
      },
      {
        "k": "subtitle",
        "t": "Terms of Service — Patient Agreement"
      },
      {
        "k": "meta",
        "t": "Effective Date: February 1, 2026 | Last Updated: February 1, 2026"
      },
      {
        "k": "meta",
        "t": "Primary Jurisdiction: United States (Texas · California) | Governing Law: Delaware"
      },
      {
        "k": "callout",
        "variant": "info",
        "blocks": [
          {
            "k": "callout-title",
            "t": "About This Document"
          },
          {
            "k": "p",
            "t": "These Terms of Service govern the relationship between Medikah Corporation and patients using its platform. They are written primarily for users in the United States."
          },
          {
            "k": "p",
            "t": "Users located in Mexico: A secondary layer of provisions in Section 16 addresses your specific rights under Mexican law. Where Mexican mandatory consumer protection law (LFPC) conflicts with these Terms, Mexican law applies to you — but all other provisions remain fully in force."
          }
        ]
      },
      {
        "k": "h2",
        "t": "Acceptance of Terms"
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Binding Agreement — Read Before Using the Platform"
          },
          {
            "k": "p",
            "t": "BY ACCESSING OR USING MEDIKAH'S PLATFORM, YOU AGREE TO BE LEGALLY BOUND BY THESE TERMS OF SERVICE AND OUR PRIVACY POLICY."
          },
          {
            "k": "p",
            "t": "IF YOU DO NOT AGREE, YOU MAY NOT USE OUR SERVICES."
          }
        ]
      },
      {
        "k": "p",
        "t": "How You Accept These Terms"
      },
      {
        "k": "p",
        "t": "Acceptance requires a deliberate affirmative act during account registration. You will be required to check three separate, unchecked boxes before your account is created:"
      },
      {
        "k": "ul",
        "items": [
          "[ ] I have read and agree to the Terms of Service",
          "[ ] I have read and acknowledge the Privacy Policy",
          "[ ] I expressly consent to the processing of my health information as described in the Privacy Policy"
        ]
      },
      {
        "k": "p",
        "t": "None of these boxes will be pre-checked. Passive use of the platform does not constitute acceptance."
      },
      {
        "k": "p",
        "t": "Consent Record"
      },
      {
        "k": "p",
        "t": "Upon acceptance, Medikah automatically records: exact timestamp (UTC), version and document hash of the Terms accepted, your IP address, your account identifier, and dispatches a confirmation email to your registered address. This record constitutes binding proof of your acceptance."
      },
      {
        "k": "p",
        "t": "Updates to These Terms"
      },
      {
        "k": "p",
        "t": "Medikah may update these Terms at any time. For material changes, you will receive email notice at least 30 days in advance (60 days for changes affecting health data processing or fees). Continued use after the notice period constitutes acceptance of the updated Terms. If you reject an update, you may close your account and export your data."
      },
      {
        "k": "h2",
        "t": "Critical Understanding — What Medikah Is and Is Not"
      },
      {
        "k": "p",
        "t": "Medikah Is a Technology Platform"
      },
      {
        "k": "p",
        "t": "Medikah Corporation provides a HIPAA-compliant health technology platform that facilitates communication, scheduling, billing, and secure health record management between patients and independently licensed healthcare providers. Medikah does not provide medical care of any kind."
      },
      {
        "k": "h3",
        "t": "We Provide"
      },
      {
        "k": "ul",
        "items": [
          "HIPAA-compliant, end-to-end encrypted video conferencing",
          "PCI-DSS compliant billing and payment processing",
          "Appointment scheduling and coordination tools",
          "Secure health record storage and transmission (45 CFR §164; NOM-024-SSA3-2012 for Mexico)"
        ]
      },
      {
        "k": "h3",
        "t": "We Are NOT"
      },
      {
        "k": "ul",
        "items": [
          "Healthcare providers, physicians, or medical practitioners",
          "A telemedicine service that provides medical care or treatment",
          "Employers or supervisors of the healthcare providers on our platform",
          "Responsible for medical care, diagnoses, treatment, or outcomes",
          "A substitute for in-person medical care or emergency services"
        ]
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Healthcare Providers Are Independent Contractors"
          },
          {
            "k": "p",
            "t": "Every doctor and healthcare provider on the Medikah platform is an independently licensed professional. They are solely responsible for all medical care they provide."
          },
          {
            "k": "p",
            "t": "They are NOT employed by, supervised by, or agents of Medikah. Medikah has no authority over their clinical decisions and bears no liability for their medical acts, errors, or omissions."
          },
          {
            "k": "p",
            "t": "Medikah's role: We provide the technology. They provide the medical care."
          }
        ]
      },
      {
        "k": "h2",
        "t": "1. Eligibility and Account Requirements"
      },
      {
        "k": "h3",
        "t": "1.1 Age and Legal Capacity"
      },
      {
        "k": "p",
        "t": "To create an account independently, you must be at least 18 years old (or the age of majority in your jurisdiction) and legally capable of entering binding contracts."
      },
      {
        "k": "h3",
        "t": "Minors"
      },
      {
        "k": "p",
        "t": "Users under 18 may access the platform only with a parent or legal guardian who creates and manages the account and is responsible for all activity. Users under 13 are subject to the Children's Online Privacy Protection Act (COPPA, 15 U.S.C. §6501). A Minor Consent and Authorization Form is required during registration for accounts associated with minors."
      },
      {
        "k": "h3",
        "t": "1.2 Account Responsibilities"
      },
      {
        "k": "p",
        "t": "You are responsible for providing accurate, current, and complete information; maintaining the security of your credentials; all activity under your account; notifying Medikah immediately of unauthorized access at support@medikah.health; and updating your information as it changes."
      },
      {
        "k": "p",
        "t": "Providing false information may result in account termination, compromised medical care quality, insurance claim denials, and legal liability."
      },
      {
        "k": "h3",
        "t": "1.3 Geographic Availability"
      },
      {
        "k": "p",
        "t": "The platform currently operates in the United States (Texas and California) and Mexico. These Terms will be updated to reflect any jurisdictional expansion. Service availability may vary by location."
      },
      {
        "k": "h2",
        "t": "2. Description of Services"
      },
      {
        "k": "h3",
        "t": "2.1 Platform Services"
      },
      {
        "k": "ul",
        "items": [
          "Video Conferencing: HIPAA-compliant, end-to-end encrypted video calls with healthcare providers. Recording requires explicit consent of both parties, documented in the session log.",
          "Billing and Payment: PCI-DSS compliant payment processing, invoice generation, insurance coordination, and cross-border payment facilitation.",
          "Scheduling: Appointment booking, calendar management, automated reminders, and rescheduling tools.",
          "Health Records: Secure storage, encrypted transmission, and authorized sharing of medical documents between you and your providers, consistent with HIPAA (45 CFR §164)."
        ]
      },
      {
        "k": "h3",
        "t": "2.2 What Medikah Does NOT Provide"
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Not Medical Services"
          },
          {
            "k": "p",
            "t": "Medikah does NOT provide medical advice, diagnosis, treatment, or prescriptions. Medikah does NOT guarantee medical outcomes."
          },
          {
            "k": "p",
            "t": "FOR MEDICAL EMERGENCIES: Call 911 immediately. Do NOT contact Medikah for emergencies."
          }
        ]
      },
      {
        "k": "h2",
        "t": "3. Cross-Border Informational Appointments — Critical Terms"
      },
      {
        "k": "h3",
        "t": "3.1 The Medikah Model"
      },
      {
        "k": "p",
        "t": "Medikah's primary service connects patients located in the United States with healthcare providers licensed in Mexico. You must understand and accept the following before using any Cross-Border Informational Appointment service."
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Critical Warning — Provider Licensing"
          },
          {
            "k": "p",
            "t": "Healthcare providers on this platform are licensed to practice medicine in Mexico. They are NOT licensed to practice medicine in any U.S. state."
          },
          {
            "k": "p",
            "t": "A Mexican physician conducting a Informational Appointment with you while you are in the United States CANNOT legally diagnose, treat, or prescribe under the laws of any U.S. state. No U.S. state medical board regulates or oversees Mexican physicians."
          },
          {
            "k": "p",
            "t": "This is not a limitation of our platform — it is a hard legal boundary that cannot be waived by any agreement between you and Medikah or between you and the provider."
          }
        ]
      },
      {
        "k": "h3",
        "t": "3.2 Informational Appointments — Medical Tourism"
      },
      {
        "k": "p",
        "t": "Cross-border Informational Appointments through Medikah are for INFORMATIONAL and MEDICAL TOURISM PLANNING purposes only. They are not telemedicine treatment visits, medical consultations, or treatments under any U.S. federal or state law."
      },
      {
        "k": "h3",
        "t": "During a Informational Appointment, the provider MAY:"
      },
      {
        "k": "ul",
        "items": [
          "Review medical records and health history you provide",
          "Explain procedures available in their licensed jurisdiction (Mexico)",
          "Discuss costs, recovery time, and logistics of in-person care in Mexico",
          "Provide a preliminary assessment of whether you may be a candidate for a procedure",
          "Help you plan a trip to Mexico for in-person medical care"
        ]
      },
      {
        "k": "h3",
        "t": "During a Informational Appointment, the provider MAY NOT:"
      },
      {
        "k": "ul",
        "items": [
          "Diagnose medical conditions under U.S. law",
          "Prescribe medications of any kind for use in the United States",
          "Order medical tests, imaging, or laboratory work in the United States",
          "Provide definitive treatment plans or final medical decisions",
          "Represent themselves as licensed in your state",
          "Bill U.S. insurance companies for the session as telemedicine"
        ]
      },
      {
        "k": "h3",
        "t": "3.3 Mandatory Cross-Border Acknowledgment"
      },
      {
        "k": "p",
        "t": "Before each Informational Appointment, you will be required to read and execute a Informational Appointment Acknowledgment Form (Form MEDIKAH-CB-001). This form confirms your understanding that the provider is not licensed in your location and that the session is informational only. Execution is a condition precedent — the session cannot proceed without it. Medikah retains a timestamped, hash-verified record of each signed form."
      },
      {
        "k": "h3",
        "t": "3.4 No Exceptions"
      },
      {
        "k": "p",
        "t": "There are NO exceptions to these restrictions, regardless of patient request, signed waiver of liability, urgency of the situation, or unavailability of local care. For urgent or emergency medical needs, call 911 or visit a local emergency room."
      },
      {
        "k": "h3",
        "t": "3.5 Controlled Substances — Absolute Prohibition"
      },
      {
        "k": "p",
        "t": "Informational Appointments may NEVER be used to prescribe, request, or facilitate the dispensing of controlled substances (21 U.S.C. §812) in the United States. The Ryan Haight Online Pharmacy Consumer Protection Act (21 U.S.C. §829) prohibits prescribing controlled substances via telemedicine without a prior in-person evaluation, and Informational Appointments do not qualify as telemedicine under U.S. law. Violations will result in immediate account termination and referral to law enforcement."
      },
      {
        "k": "h3",
        "t": "3.6 Medical Tourism Risks"
      },
      {
        "k": "p",
        "t": "By using Informational Appointment services, you acknowledge and accept that:"
      },
      {
        "k": "ul",
        "items": [
          "Medical malpractice laws differ significantly between the U.S. and Mexico; your U.S. legal protections may not apply to care received in Mexico",
          "Dispute resolution across international borders is complex and may be costly",
          "Medical standards of care, training requirements, and licensing standards vary between jurisdictions",
          "U.S. health insurance typically does not cover care received in Mexico — verify with your insurer before proceeding",
          "Exchange rate fluctuations may affect final costs of care",
          "Language barriers and logistical challenges are your responsibility to manage"
        ]
      },
      {
        "k": "h3",
        "t": "3.7 Provider Enforcement"
      },
      {
        "k": "p",
        "t": "All providers sign a Cross-Border Informational Appointment Agreement and receive mandatory training. Violations result in immediate suspension, termination, and reporting to the relevant Mexican medical licensing authority. Medikah does not indemnify providers who violate cross-border restrictions. Violations may constitute unlicensed practice of medicine under applicable criminal law."
      },
      {
        "k": "h2",
        "t": "4. Same-Country Consultations"
      },
      {
        "k": "p",
        "t": "Where both patient and provider are in the same country and the provider holds a valid license in the patient's jurisdiction, standard telemedicine regulations apply. The provider may diagnose and treat via video consultation and may prescribe medications subject to applicable law. The Ryan Haight Act (21 U.S.C. §829) and applicable DEA regulations govern controlled substance prescribing. Providers are solely responsible for compliance with all applicable telemedicine and prescribing laws."
      },
      {
        "k": "h2",
        "t": "5. User Responsibilities"
      },
      {
        "k": "h3",
        "t": "5.1 Accurate Medical Information"
      },
      {
        "k": "p",
        "t": "You must provide accurate and complete medical history, current medications, known allergies, current symptoms, correct contact and insurance information, and truthful identity. Inaccurate medical information may directly compromise the quality and safety of care you receive."
      },
      {
        "k": "h3",
        "t": "5.2 Compliance with Provider Instructions"
      },
      {
        "k": "p",
        "t": "You are responsible for attending scheduled appointments, following treatment plans, taking medications as directed, reporting side effects, and seeking emergency care when appropriate. Medikah bears no responsibility for your compliance with medical advice."
      },
      {
        "k": "h3",
        "t": "5.3 Emergency Situations"
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "DO NOT USE MEDIKAH FOR MEDICAL EMERGENCIES"
          },
          {
            "k": "p",
            "t": "Call 911 immediately for any life-threatening situation. The Medikah platform is not designed for emergency medical response and cannot substitute for emergency services."
          }
        ]
      },
      {
        "k": "h3",
        "t": "5.4 Payment Obligations"
      },
      {
        "k": "p",
        "t": "You agree to pay all applicable provider fees for services rendered and any Medikah platform fees. You will provide accurate insurance information and are responsible for amounts not covered by insurance. Medikah is not responsible for provider charges, insurance coverage decisions, or billing disputes."
      },
      {
        "k": "h3",
        "t": "5.5 Prohibited Uses"
      },
      {
        "k": "p",
        "t": "You may not use the platform to:"
      },
      {
        "k": "ul",
        "items": [
          "Provide false, misleading, or fraudulent information, or impersonate any person",
          "Share account credentials or permit unauthorized account access",
          "Seek or obtain controlled substances in violation of the Ryan Haight Act or applicable law",
          "Obtain multiple prescriptions for the same condition from different providers",
          "Submit fraudulent insurance claims",
          "Harass, threaten, or harm any user or provider",
          "Reverse-engineer, hack, or circumvent any security measure",
          "Scrape or collect platform data through automated means",
          "Post or transmit illegal, defamatory, threatening, or obscene content"
        ]
      },
      {
        "k": "p",
        "t": "Violations result in immediate account termination, reporting to law enforcement, and civil or criminal legal action."
      },
      {
        "k": "h2",
        "t": "6. Provider Requirements"
      },
      {
        "k": "h3",
        "t": "6.1 Provider Eligibility"
      },
      {
        "k": "p",
        "t": "Healthcare providers must hold a valid, unrestricted medical license in their jurisdiction; maintain professional liability insurance; comply with all applicable laws; execute a Business Associate Agreement (BAA) with Medikah as required under HIPAA (45 CFR §164.504(e)); and pass Medikah's credentialing verification."
      },
      {
        "k": "h3",
        "t": "6.2 Provider Independence"
      },
      {
        "k": "p",
        "t": "Healthcare providers are independent contractors, not employees, partners, or agents of Medikah. Medikah exercises no control over providers' clinical judgment or medical decisions. Medikah is not liable for provider acts, omissions, malpractice, negligence, or any unauthorized practice of medicine."
      },
      {
        "k": "h2",
        "t": "7. Fees and Payment"
      },
      {
        "k": "h3",
        "t": "7.1 Platform Fees"
      },
      {
        "k": "p",
        "t": "Medikah's platform coordination services are currently provided to patients at no direct cost. Medikah reserves the right to introduce platform fees with a minimum of 30 days' advance notice."
      },
      {
        "k": "h3",
        "t": "7.2 Provider Fees"
      },
      {
        "k": "p",
        "t": "Provider fees for consultations, procedures, and follow-up visits are set independently by each provider and are separate from any Medikah fees. Medikah is not responsible for provider fee disputes."
      },
      {
        "k": "h3",
        "t": "7.3 Cross-Border Payments"
      },
      {
        "k": "p",
        "t": "For international Informational Appointments, payment may be in a foreign currency. Exchange rates and international transaction fees apply at the time of payment. Medikah will display the applicable rate before you confirm."
      },
      {
        "k": "h3",
        "t": "7.4 Insurance"
      },
      {
        "k": "p",
        "t": "Medikah assists with insurance verification and claim submission where applicable but does not guarantee coverage. Informational Appointments and medical tourism services are frequently excluded from standard U.S. health insurance. Verify coverage with your insurer before proceeding. Insurance is a contract between you and your insurer — Medikah is not a party to it."
      },
      {
        "k": "h2",
        "t": "8. Privacy and Data Security"
      },
      {
        "k": "h3",
        "t": "8.1 Privacy Policy"
      },
      {
        "k": "p",
        "t": "Medikah's Privacy Policy governs the collection, use, and protection of your information, your rights under HIPAA and applicable law, cross-border data transfer protections, and how to exercise your privacy rights. The Privacy Policy is incorporated into these Terms by reference."
      },
      {
        "k": "h3",
        "t": "8.2 HIPAA Rights — Irrevocable"
      },
      {
        "k": "p",
        "t": "Your rights under the HIPAA Privacy Rule are irrevocable and cannot be limited or waived by these Terms. These include your right of access to your health information (45 CFR §164.524), right of amendment (45 CFR §164.526), and right to notification of breaches (45 CFR §164.400 et seq.)."
      },
      {
        "k": "h3",
        "t": "8.3 Data Retention"
      },
      {
        "k": "p",
        "t": "Health records are retained for a minimum of six (6) years from creation or last effective date, consistent with 45 CFR §164.530(j). Account termination ends platform access but does not delete your medical records. You may request records at any time during the retention period at privacy@medikah.health. A convenience download is available for 90 days after account closure."
      },
      {
        "k": "h3",
        "t": "8.4 Your Security Obligations"
      },
      {
        "k": "p",
        "t": "You must protect your credentials, use secure connections, log out on shared devices, and report suspicious activity immediately to support@medikah.health."
      },
      {
        "k": "h2",
        "t": "9. Disclaimers and Limitations of Liability"
      },
      {
        "k": "callout",
        "variant": "info",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Applicability of This Section"
          },
          {
            "k": "p",
            "t": "The disclaimers and limitations in this Section are written to provide Medikah with maximum protection under U.S. law. They are enforceable as written for users in the United States."
          },
          {
            "k": "p",
            "t": "For users in Mexico: Section 16 governs. Certain limitations in this Section are not enforceable under Mexican mandatory consumer protection law (LFPC Art. 90) and will not be applied to Mexican users — but this does not affect their validity for U.S. users."
          }
        ]
      },
      {
        "k": "h3",
        "t": "9.1 Services Provided \"As Is\""
      },
      {
        "k": "p",
        "t": "MEDIKAH SERVICES ARE PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY OR COMPLETENESS OF INFORMATION, UNINTERRUPTED OR ERROR-FREE SERVICE, SECURITY OF TRANSMISSIONS, OR AVAILABILITY OF PROVIDERS."
      },
      {
        "k": "h3",
        "t": "9.2 No Medical Guarantees"
      },
      {
        "k": "p",
        "t": "Medikah makes NO warranties or guarantees regarding: medical outcomes or results; provider qualifications beyond basic license verification; quality of medical care rendered by independent providers; accuracy of diagnoses or treatments; suitability of cross-border healthcare for your situation; or the success of any medical tourism procedure."
      },
      {
        "k": "h3",
        "t": "9.3 No Responsibility for Provider Actions"
      },
      {
        "k": "p",
        "t": "Medikah is NOT responsible for: medical malpractice or negligence by providers; misdiagnosis or incorrect treatment; prescription errors; surgical complications; provider misconduct, cancellations, or billing disputes; provider violations of medical regulations; or any illegal activity by providers. Providers are independent contractors solely responsible for their own acts."
      },
      {
        "k": "h3",
        "t": "9.4 Limitation of Liability"
      },
      {
        "k": "p",
        "t": "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE U.S. LAW:"
      },
      {
        "k": "p",
        "t": "Medikah's total cumulative liability to you for any and all claims arising out of or relating to these Terms or your use of the platform — whether in contract, tort, statute, or otherwise — is limited to the greater of: (a) the total amount you paid to Medikah in the twelve (12) months immediately preceding the claim, or (b) ONE HUNDRED U.S. DOLLARS ($100.00 USD)."
      },
      {
        "k": "p",
        "t": "MEDIKAH IS NOT LIABLE FOR ANY: INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES; LOST PROFITS OR REVENUE; LOSS OF DATA OR RECORDS; MEDICAL COMPLICATIONS, INJURIES, OR ADVERSE OUTCOMES ARISING FROM PROVIDER ACTIONS; EMOTIONAL DISTRESS; OR DAMAGES ARISING FROM YOUR RELIANCE ON INFORMATION PROVIDED THROUGH THE PLATFORM."
      },
      {
        "k": "p",
        "t": "These limitations apply regardless of the legal theory under which the claim is brought, whether Medikah has been advised of the possibility of such damages, and whether any limited remedy fails of its essential purpose."
      },
      {
        "k": "p",
        "t": "Exceptions: These limitations do not apply to the extent prohibited by applicable law, to Medikah's gross negligence or willful misconduct directly causing personal injury, or to claims that U.S. law expressly prohibits limiting."
      },
      {
        "k": "h2",
        "t": "10. Indemnification"
      },
      {
        "k": "h3",
        "t": "10.1 User Indemnification"
      },
      {
        "k": "p",
        "t": "To the fullest extent permitted by applicable law, you agree to indemnify, defend, and hold harmless Medikah Corporation and its officers, directors, employees, contractors, and agents from and against any and all third-party claims, demands, actions, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees and litigation costs) arising out of or relating to:"
      },
      {
        "k": "ul",
        "items": [
          "Your violation of any provision of these Terms",
          "Your violation of any applicable law or regulation",
          "Your provision of false, inaccurate, or fraudulent information",
          "Your own healthcare decisions and their consequences",
          "Any content or information you upload or transmit through the platform",
          "Your use of Cross-Border Informational Appointment services contrary to the restrictions in Section 3"
        ]
      },
      {
        "k": "p",
        "t": "This indemnification obligation survives termination of your account and these Terms."
      },
      {
        "k": "callout",
        "variant": "legal",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Mexico — Mandatory Limitation on Indemnification"
          },
          {
            "k": "p",
            "t": "For users located in Mexico only: The indemnification obligation above is limited to claims arising from your willful misconduct (dolo) or fraud. Indemnification for mere negligence (culpa) by consumers in Mexico is unenforceable under Art. 90 LFPC and is therefore excluded for Mexican users only."
          },
          {
            "k": "p",
            "t": "This limitation does not affect the indemnification obligation for U.S. users."
          }
        ]
      },
      {
        "k": "h3",
        "t": "10.2 Provider Indemnification"
      },
      {
        "k": "p",
        "t": "Healthcare providers separately agree to indemnify and hold Medikah harmless from claims arising from their medical malpractice or negligence, licensing violations, violations of these Terms or the Cross-Border Informational Appointment Agreement, unauthorized practice of medicine, and any illegal activity. Medikah expressly does not indemnify providers for any of the foregoing."
      },
      {
        "k": "h2",
        "t": "11. Dispute Resolution"
      },
      {
        "k": "h3",
        "t": "11.1 Informal Resolution — Required First Step"
      },
      {
        "k": "p",
        "t": "Before initiating any legal proceeding, you must contact Medikah at legal@medikah.health with a written description of your dispute and give Medikah sixty (60) days to resolve it. This requirement does not apply to requests for emergency injunctive relief."
      },
      {
        "k": "h3",
        "t": "11.2 Binding Arbitration — United States Users"
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Please Read Carefully — This Affects Your Legal Rights"
          },
          {
            "k": "p",
            "t": "If you are a user in the United States, any dispute with Medikah that cannot be resolved informally will be resolved through final and binding arbitration — not in court, and not before a jury."
          },
          {
            "k": "p",
            "t": "You are waiving your right to a jury trial and, subject to Section 14.2, your right to participate in any class action or representative proceeding."
          }
        ]
      },
      {
        "k": "p",
        "t": "Arbitration will be conducted under the American Arbitration Association (AAA) Consumer Arbitration Rules, as modified by these Terms. Medikah pays all arbitration filing fees for claims under USD $10,000. The arbitrator's decision will be final and binding and may be entered as a judgment in any court of competent jurisdiction."
      },
      {
        "k": "p",
        "t": "The following claims may be brought in court without prior arbitration: small claims court actions within that court's jurisdiction; intellectual property disputes; claims for emergency injunctive or other equitable relief to prevent irreparable harm; and medical malpractice claims against providers (which are not subject to these Terms)."
      },
      {
        "k": "p",
        "t": "CLASS ACTION WAIVER: YOU AGREE TO RESOLVE DISPUTES WITH MEDIKAH ONLY ON AN INDIVIDUAL BASIS. YOU WAIVE ANY RIGHT TO BRING OR PARTICIPATE IN ANY CLASS ACTION, CLASS ARBITRATION, COLLECTIVE ACTION, OR REPRESENTATIVE PROCEEDING. IF THIS WAIVER IS FOUND UNENFORCEABLE, THE ARBITRATION PROVISION IN THIS SECTION IS VOID AND DISPUTES PROCEED IN COURT (SEE §14.2)."
      },
      {
        "k": "p",
        "t": "OPT-OUT: You may opt out of this arbitration agreement within 30 days of accepting these Terms by emailing legal@medikah.health with the subject line \"Arbitration Opt-Out.\" Opting out does not affect any other provision of these Terms."
      },
      {
        "k": "h3",
        "t": "11.3 Governing Law and Venue"
      },
      {
        "k": "p",
        "t": "These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles, except as otherwise required by applicable consumer protection law in your jurisdiction."
      },
      {
        "k": "p",
        "t": "For commercial and non-consumer disputes: exclusive venue is the courts of New Castle County, Delaware. Both parties consent to personal jurisdiction therein."
      },
      {
        "k": "p",
        "t": "For U.S. consumer claims: venue in the applicable AAA arbitration proceeding, or courts of your state of residence if the arbitration clause does not apply to your claim."
      },
      {
        "k": "h3",
        "t": "11.4 Medical Malpractice Claims Against Providers"
      },
      {
        "k": "p",
        "t": "Medical malpractice claims against healthcare providers are not subject to these Terms. They are governed by applicable medical malpractice law in the provider's licensed jurisdiction. Medikah is not a party to such disputes."
      },
      {
        "k": "h2",
        "t": "12. Termination"
      },
      {
        "k": "h3",
        "t": "12.1 Your Right to Terminate"
      },
      {
        "k": "p",
        "t": "You may close your account at any time through Account Settings or by emailing support@medikah.health. Platform access ends immediately. Outstanding payment obligations for completed services survive. Medical records remain accessible during the HIPAA retention period (see §8.3). A convenience data download is available for 90 days."
      },
      {
        "k": "h3",
        "t": "12.2 Medikah's Right to Suspend or Terminate"
      },
      {
        "k": "p",
        "t": "Medikah may suspend or terminate your account for violations of these Terms, prohibited uses, provision of false information, safety or legal compliance requirements, or discontinuation of service in your jurisdiction. Medikah will provide reasonable advance notice where feasible; immediate termination may occur where necessary for safety or legal compliance."
      },
      {
        "k": "h3",
        "t": "12.3 Effect of Termination — Medical Care"
      },
      {
        "k": "p",
        "t": "Termination of your Medikah account does NOT terminate your relationships with independent healthcare providers. You remain responsible for continuity of care. Download your records before the 90-day window closes. Sections 9, 10, 11, and 8.3 survive termination."
      },
      {
        "k": "h2",
        "t": "13. General Provisions"
      },
      {
        "k": "h3",
        "t": "13.1 Entire Agreement"
      },
      {
        "k": "p",
        "t": "These Terms, together with the Privacy Policy, the Informational Appointment Acknowledgment Form (MEDIKAH-CB-001), and any executed provider agreements, constitute the entire agreement between you and Medikah regarding the platform."
      },
      {
        "k": "h3",
        "t": "13.2 Severability"
      },
      {
        "k": "p",
        "t": "If any provision of these Terms is found invalid or unenforceable, it will be modified to the minimum extent necessary to make it enforceable. All other provisions remain in full force and effect. If the class action waiver is found unenforceable, the arbitration provision is void and disputes proceed in court."
      },
      {
        "k": "h3",
        "t": "13.3 Force Majeure"
      },
      {
        "k": "p",
        "t": "Medikah is not liable for delays or failures caused by events beyond its reasonable control, including natural disasters, pandemics, acts of war, government actions, infrastructure failures, or power outages."
      },
      {
        "k": "h3",
        "t": "13.4 Relationship of Parties"
      },
      {
        "k": "p",
        "t": "These Terms create no partnership, joint venture, employment, agency, or fiduciary relationship. Healthcare providers are independent contractors, not employees or agents of Medikah."
      },
      {
        "k": "h3",
        "t": "13.5 Language"
      },
      {
        "k": "p",
        "t": "These Terms are available in English and Spanish. The English version governs for users in the United States. The Spanish version governs for users in Mexico. Both versions are available at https://medikah.health/terms."
      },
      {
        "k": "h3",
        "t": "13.6 Changes to These Terms"
      },
      {
        "k": "p",
        "t": "Material changes are communicated by email at least 30 days in advance (60 days for health data or fee changes). Continued use after the notice period constitutes acceptance. Re-consent via the platform is required if arbitration provisions change."
      },
      {
        "k": "h3",
        "t": "13.7 Contact"
      },
      {
        "k": "table",
        "rows": [
          [
            [
              "Department"
            ],
            [
              "Contact"
            ]
          ],
          [
            [
              "Legal Notices"
            ],
            [
              "legal@medikah.health"
            ]
          ],
          [
            [
              "General Support"
            ],
            [
              "support@medikah.health — Response within 2 business days"
            ]
          ],
          [
            [
              "Privacy / HIPAA Requests"
            ],
            [
              "privacy@medikah.health"
            ]
          ],
          [
            [
              "Provider Violations"
            ],
            [
              "legal@medikah.health — Subject: \"Provider Violation Report\""
            ]
          ],
          [
            [
              "Arbitration Opt-Out"
            ],
            [
              "legal@medikah.health — Subject: \"Arbitration Opt-Out\""
            ]
          ],
          [
            [
              "Medical Emergencies"
            ],
            [
              "DO NOT CONTACT MEDIKAH — Call 911 immediately"
            ]
          ]
        ]
      },
      {
        "k": "h2",
        "t": "14. United States — Jurisdiction-Specific Provisions"
      },
      {
        "k": "h3",
        "t": "14.1 HIPAA"
      },
      {
        "k": "p",
        "t": "Medikah operates as a Business Associate under HIPAA (45 CFR Parts 160 and 164) with respect to covered healthcare providers using the platform. Patient rights under the HIPAA Privacy Rule are irrevocable and cannot be limited, waived, or modified by these Terms."
      },
      {
        "k": "h3",
        "t": "14.2 Ryan Haight Act and Controlled Substances"
      },
      {
        "k": "p",
        "t": "Medikah's platform may not be used to prescribe, dispense, or facilitate the distribution of controlled substances (Schedule I–V, 21 U.S.C. §812) via telemedicine in violation of the Ryan Haight Online Pharmacy Consumer Protection Act (21 U.S.C. §829) or applicable DEA regulations. Cross-border controlled substance prescribing is prohibited under all circumstances. Same-country providers are solely responsible for Ryan Haight compliance."
      },
      {
        "k": "h3",
        "t": "14.3 Texas"
      },
      {
        "k": "p",
        "t": "Subject to the Texas Medical Practice Act (Tex. Occ. Code Chapter 151), Texas telemedicine statutes (Tex. Occ. Code §111.001 et seq.), Texas data breach notification law (Tex. Bus. & Com. Code §521.053), and applicable Texas consumer protection statutes."
      },
      {
        "k": "h3",
        "t": "14.4 California"
      },
      {
        "k": "p",
        "t": "Subject to California telemedicine law (Cal. Bus. & Prof. Code §2290.5 et seq.), CCPA/CPRA (Cal. Civ. Code §1798.100 et seq.) and all rights thereunder, California data breach notification law (Cal. Civ. Code §1798.29), and the Unruh Civil Rights Act. California consumers retain all CCPA/CPRA rights notwithstanding any contrary provision in these Terms."
      },
      {
        "k": "h3",
        "t": "14.5 FTC"
      },
      {
        "k": "p",
        "t": "These Terms and Medikah's practices are subject to Section 5 of the Federal Trade Commission Act (15 U.S.C. §45) prohibiting unfair or deceptive acts or practices. Medikah's actual practices will conform to the representations made in these Terms and the Privacy Policy."
      },
      {
        "k": "h2",
        "t": "15. Medical Malpractice and Cross-Border Liability Framework"
      },
      {
        "k": "h3",
        "t": "15.1 Medical Malpractice — Provider Responsibility"
      },
      {
        "k": "p",
        "t": "All claims of medical malpractice, professional negligence, misdiagnosis, or improper treatment are claims against the individual healthcare provider, not Medikah. Medikah is a technology platform with no clinical role. Providers carry their own professional liability insurance and are subject to their own licensing and regulatory oversight."
      },
      {
        "k": "h3",
        "t": "15.2 Cross-Border Liability"
      },
      {
        "k": "p",
        "t": "For care received in Mexico following a Informational Appointment: claims against the provider are governed by Mexican law and must be brought in the provider's jurisdiction. Medikah is not a party to such disputes and has no liability for outcomes of in-person medical care in Mexico."
      },
      {
        "k": "h3",
        "t": "15.3 Reporting Provider Violations"
      },
      {
        "k": "p",
        "t": "If a provider violates cross-border restrictions during a Informational Appointment — for example, by attempting to diagnose or prescribe — stop the session immediately, document what occurred, and report to legal@medikah.health with the subject line \"Provider Violation Report.\" Medikah will investigate and take appropriate action. There will be no retaliation for good-faith reports."
      },
      {
        "k": "h2",
        "t": "16. Mexico — Secondary Jurisdiction Provisions"
      },
      {
        "k": "callout",
        "variant": "legal",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Who This Section Applies To"
          },
          {
            "k": "p",
            "t": "This Section applies only to users located in Mexico. If you are in the United States, this Section does not apply to you and does not affect any other provision of these Terms."
          },
          {
            "k": "p",
            "t": "Purpose: Medikah's primary market is U.S. patients. These provisions ensure that if the platform is used by patients in Mexico, their mandatory legal rights under Mexican law are preserved — without affecting the protections provided to U.S. users elsewhere in these Terms."
          }
        ]
      },
      {
        "k": "h3",
        "t": "16.1 Consumer Protection — LFPC"
      },
      {
        "k": "p",
        "t": "These Terms constitute a contract of adhesion (contrato de adhesión) as defined by the Ley Federal de Protección al Consumidor (LFPC). For users in Mexico, the following applies:"
      },
      {
        "k": "ul",
        "items": [
          "Clauses that conflict with mandatory rights under the LFPC are null and void by operation of law (Art. 90 LFPC), regardless of your acceptance. Their invalidity does not affect the remainder of these Terms.",
          "Medikah's liability for damages to your health or physical integrity caused by Medikah's gross negligence or willful misconduct cannot be limited under Art. 90 Fr. I LFPC. The $100 USD liability cap in Section 9.4 does not apply to such claims for Mexican users.",
          "The indemnification obligation in Section 10.1 is limited for Mexican users to claims arising from your willful misconduct or fraud — not mere negligence — consistent with Art. 90 Fr. II LFPC.",
          "Medikah will register this contract with PROFECO as required under Art. 86 LFPC."
        ]
      },
      {
        "k": "h3",
        "t": "16.2 Data Privacy — LFPDPPP"
      },
      {
        "k": "p",
        "t": "The processing of personal data of users in Mexico is governed by the Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). You have full ARCO rights (Acceso, Rectificación, Cancelación, Oposición) exercisable at privacy@medikah.health. Medikah designates a Privacy Officer (Responsable) for Mexico and maintains a representative available to the INAI as required under Arts. 8 and 36 LFPDPPP. Health data constitutes datos sensibles under Art. 3 Fr. VI LFPDPPP and requires your express, specific, and informed consent."
      },
      {
        "k": "h3",
        "t": "16.3 Health Regulation — NOM-024"
      },
      {
        "k": "p",
        "t": "The platform's management of electronic health records for users in Mexico is subject to NOM-024-SSA3-2012 (Expediente Clínico Electrónico). Healthcare providers using the platform in Mexico must be duly licensed by the Secretaría de Salud. Clinical records for Mexican users are retained for a minimum of five (5) years from the date of the last service, consistent with NOM-024-SSA3-2012."
      },
      {
        "k": "h3",
        "t": "16.4 Dispute Resolution — Mexico"
      },
      {
        "k": "p",
        "t": "Users in Mexico retain the right to:"
      },
      {
        "k": "ul",
        "items": [
          "Submit consumer complaints to PROFECO (www.profeco.gob.mx) via the Concilianet system at no cost — regardless of the arbitration or venue provisions in Section 11",
          "Bring consumer claims before Mexican courts in your state of residence — the venue clause in Section 11.3 does not override this right for Mexican consumers",
          "Submit data privacy complaints to the INAI for violations of the LFPDPPP"
        ]
      },
      {
        "k": "h3",
        "t": "16.5 Language"
      },
      {
        "k": "p",
        "t": "The Spanish-language version of these Terms is available at https://medikah.health/es/terms. Pursuant to Art. 16 LFPDPPP and applicable LFPC standards, users in Mexico have the right to access this document in Spanish. The Spanish version governs for users in Mexico in the event of any conflict between the English and Spanish versions."
      },
      {
        "k": "h2",
        "t": "Final Acknowledgment"
      },
      {
        "k": "p",
        "t": "By completing the consent mechanism in the \"Acceptance of Terms\" section and using Medikah's platform, you acknowledge and agree that:"
      },
      {
        "k": "ul",
        "items": [
          "Medikah is a technology platform — not a healthcare provider.",
          "Healthcare providers are independent contractors solely responsible for their medical acts.",
          "Providers on this platform are licensed in Mexico and are NOT licensed to diagnose, treat, or prescribe in the United States.",
          "Informational Appointments are informational only — not medical consultations, telemedicine, or treatment under U.S. law.",
          "Final diagnosis and treatment require in-person care in the provider's licensed jurisdiction.",
          "You have read and understood all sections of these Terms, including the limitations of liability, arbitration agreement, class action waiver, and indemnification obligations.",
          "You understand that certain provisions in Section 9 and 10 may not be enforceable if you are in Mexico, but that they apply in full if you are in the United States.",
          "You agree to the dispute resolution provisions, including binding arbitration and waiver of class actions, if you are a U.S. user."
        ]
      },
      {
        "k": "warn",
        "t": "IF YOU DO NOT UNDERSTAND OR DO NOT AGREE TO ANY PART OF THESE TERMS, DO NOT USE THE PLATFORM."
      },
      {
        "k": "meta",
        "t": "Medikah Corporation | legal@medikah.health | support@medikah.health"
      },
      {
        "k": "meta",
        "t": "© 2026 Medikah Corporation. All rights reserved."
      }
    ],
    "es": [
      {
        "k": "title",
        "t": "MEDIKAH CORPORATION"
      },
      {
        "k": "subtitle",
        "t": "Términos y Condiciones de Uso"
      },
      {
        "k": "subtitle",
        "t": "Acuerdo con el Paciente — Usuarios en Estados Unidos"
      },
      {
        "k": "meta",
        "t": "Fecha de Vigencia: 1 de febrero de 2026 | Ley Aplicable: Delaware, Estados Unidos"
      },
      {
        "k": "callout",
        "variant": "info",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Sobre Este Documento"
          },
          {
            "k": "p",
            "t": "Estos Términos y Condiciones rigen la relación entre Medikah Corporation y los pacientes que utilizan la plataforma. Están escritos principalmente para usuarios en Estados Unidos."
          },
          {
            "k": "p",
            "t": "Usuarios en México: La Sección 16 contiene las disposiciones específicas para su jurisdicción bajo la LFPC y la LFPDPPP. En caso de conflicto, la ley mexicana prevalece para los usuarios en México."
          }
        ]
      },
      {
        "k": "h2",
        "t": "Aceptación de los Términos"
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Acuerdo Vinculante"
          },
          {
            "k": "p",
            "t": "AL ACCEDER O USAR LA PLATAFORMA DE MEDIKAH, USTED ACEPTA QUEDAR LEGALMENTE VINCULADO POR ESTOS TÉRMINOS Y CONDICIONES Y NUESTRA POLÍTICA DE PRIVACIDAD."
          },
          {
            "k": "p",
            "t": "SI NO ESTÁ DE ACUERDO, NO PUEDE USAR NUESTROS SERVICIOS."
          }
        ]
      },
      {
        "k": "h3",
        "t": "Mecanismo de Aceptación"
      },
      {
        "k": "p",
        "t": "La aceptación requiere un acto afirmativo durante el registro. Usted deberá marcar tres casillas separadas, sin pre-marcar:"
      },
      {
        "k": "ul",
        "items": [
          "[ ] He leído y acepto los Términos y Condiciones",
          "[ ] He leído y reconozco la Política de Privacidad",
          "[ ] Consiento expresamente el tratamiento de mis datos de salud"
        ]
      },
      {
        "k": "p",
        "t": "Al aceptar, el sistema registra automáticamente: fecha y hora exacta (UTC), versión y hash del documento, dirección IP, identificador de cuenta, y envía confirmación por correo electrónico."
      },
      {
        "k": "h2",
        "t": "Entendimiento Crítico — Qué es y qué no es Medikah"
      },
      {
        "k": "h3",
        "t": "Medikah es una Plataforma Tecnológica"
      },
      {
        "k": "p",
        "t": "Medikah Corporation opera una plataforma de tecnología en salud que facilita comunicación, agenda, facturación y almacenamiento seguro de expedientes entre pacientes y proveedores de salud independientes con licencia. Medikah no presta servicios médicos de ningún tipo."
      },
      {
        "k": "h3",
        "t": "Proporcionamos:"
      },
      {
        "k": "ul",
        "items": [
          "Videoconferencia cifrada de extremo a extremo cumpliente con HIPAA",
          "Procesamiento de pagos cumpliente con PCI-DSS",
          "Coordinación de Citas y herramientas de agendamiento",
          "Almacenamiento seguro y transmisión de expedientes médicos (45 CFR §164)"
        ]
      },
      {
        "k": "h3",
        "t": "NO Somos:"
      },
      {
        "k": "ul",
        "items": [
          "Prestadores de servicios de salud ni profesionales médicos",
          "Un servicio de telemedicina que brinda atención médica",
          "Empleadores o supervisores de los médicos de la plataforma",
          "Responsables de la atención médica, diagnósticos, tratamientos ni resultados"
        ]
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Los Proveedores de Salud son Contratistas Independientes"
          },
          {
            "k": "p",
            "t": "Los médicos y proveedores en la plataforma Medikah son profesionales independientes con licencia propia. Son los únicos responsables de toda la atención médica que prestan. NO son empleados, agentes ni representantes de Medikah."
          },
          {
            "k": "p",
            "t": "El rol de Medikah: Proporcionamos la tecnología. Ellos proporcionan la atención médica."
          }
        ]
      },
      {
        "k": "h2",
        "t": "1. Elegibilidad y Requisitos de Cuenta"
      },
      {
        "k": "h3",
        "t": "1.1 Edad y Capacidad Legal"
      },
      {
        "k": "p",
        "t": "Para crear una cuenta de forma independiente debe tener al menos 18 años (o la mayoría de edad en su jurisdicción) y capacidad legal para celebrar contratos vinculantes."
      },
      {
        "k": "h3",
        "t": "1.2 Menores de Edad"
      },
      {
        "k": "p",
        "t": "Los menores pueden usar la plataforma solo con un padre o tutor legal que cree y administre la cuenta. Los menores de 13 años están sujetos a la Ley de Protección de la Privacidad Infantil en Línea (COPPA, 15 U.S.C. §6501). Se requiere un Formulario de Consentimiento y Autorización de Menores durante el registro."
      },
      {
        "k": "h3",
        "t": "1.3 Responsabilidades de la Cuenta"
      },
      {
        "k": "p",
        "t": "Usted es responsable de proporcionar información precisa y completa; mantener la seguridad de sus credenciales; toda la actividad en su cuenta; y notificar a Medikah de inmediato sobre cualquier acceso no autorizado en support@medikah.health."
      },
      {
        "k": "h2",
        "t": "2. Descripción de los Servicios"
      },
      {
        "k": "h3",
        "t": "2.1 Servicios de la Plataforma"
      },
      {
        "k": "ul",
        "items": [
          "Videoconferencia: Citas médicas por video cifradas de extremo a extremo cumplientes con HIPAA. La grabación requiere consentimiento expreso de ambas partes.",
          "Facturación y Pagos: Procesamiento de pagos cumpliente con PCI-DSS, coordinación de seguros y facilidades de pago internacional.",
          "Agenda: Programación de Citas, recordatorios automáticos y herramientas de reagendamiento.",
          "Expedientes de Salud: Almacenamiento seguro y transmisión cifrada de documentos médicos conforme a HIPAA (45 CFR §164)."
        ]
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Medikah NO Proporciona Servicios Médicos"
          },
          {
            "k": "p",
            "t": "No proporcionamos consejo médico, diagnósticos, tratamiento ni recetas. No garantizamos resultados médicos."
          },
          {
            "k": "p",
            "t": "PARA EMERGENCIAS MÉDICAS: Llame al 911 de inmediato. NO use la plataforma Medikah para emergencias."
          }
        ]
      },
      {
        "k": "h2",
        "t": "3. Citas Informativas Transfronterizas — Términos Críticos"
      },
      {
        "k": "h3",
        "t": "3.1 El Modelo Medikah"
      },
      {
        "k": "p",
        "t": "El servicio principal de Medikah conecta a pacientes ubicados en Estados Unidos con proveedores de salud con licencia en México. Usted debe comprender y aceptar lo siguiente antes de usar cualquier Cita Informativa transfronteriza."
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Advertencia Crítica — Licencia del Proveedor"
          },
          {
            "k": "p",
            "t": "Los proveedores de salud de esta plataforma tienen licencia para ejercer la medicina en México. NO tienen licencia para ejercer la medicina en ningún estado de EE.UU."
          },
          {
            "k": "p",
            "t": "Un médico mexicano que realice una Cita Informativa con usted mientras se encuentra en EE.UU. LEGALMENTE NO PUEDE diagnosticar, tratar ni recetar bajo las leyes de ningún estado americano."
          },
          {
            "k": "p",
            "t": "Este es un límite legal que no puede ser eximido por ningún acuerdo."
          }
        ]
      },
      {
        "k": "h3",
        "t": "3.2 Citas Informativas — Solo Información y Planificación"
      },
      {
        "k": "p",
        "t": "Las Citas Informativas transfronterizas a través de Medikah son ÚNICAMENTE para fines INFORMATIVOS y de PLANIFICACIÓN DE TURISMO MÉDICO. NO son visitas de tratamiento de telemedicina bajo ninguna ley federal o estatal de EE.UU."
      },
      {
        "k": "h3",
        "t": "Durante una Cita Informativa, el proveedor PUEDE:"
      },
      {
        "k": "ul",
        "items": [
          "Revisar mis registros médicos e historial de salud que proporciono voluntariamente",
          "Explicar procedimientos disponibles en México",
          "Discutir costos, tiempo de recuperación y logística de atención presencial en México",
          "Proporcionar una evaluación preliminar no vinculante de candidatura",
          "Ayudar a planificar un posible viaje a México para atención presencial"
        ]
      },
      {
        "k": "h3",
        "t": "Durante una Cita Informativa, el proveedor NO PUEDE:"
      },
      {
        "k": "ul",
        "items": [
          "Diagnosticar condición médica alguna bajo la ley de EE.UU.",
          "Recetar medicamento alguno — controlado o no",
          "Ordenar pruebas médicas o de laboratorio en EE.UU.",
          "Proporcionar planes de tratamiento definitivos",
          "Representarse como licenciado en EE.UU.",
          "Facturar a aseguradoras de EE.UU. por la Cita como telemedicina"
        ]
      },
      {
        "k": "h3",
        "t": "3.3 Formulario Obligatorio de Reconocimiento"
      },
      {
        "k": "p",
        "t": "Antes de cada Cita Informativa, deberá leer y firmar el Formulario de Reconocimiento de Cita Informativa (Formulario MEDIKAH-CB-001). Su ejecución es condición precedente — la Cita no puede proceder sin él."
      },
      {
        "k": "h3",
        "t": "3.4 Sustancias Controladas — Prohibición Absoluta"
      },
      {
        "k": "p",
        "t": "Las Citas Informativas NUNCA pueden usarse para prescribir, solicitar ni facilitar la dispensación de sustancias controladas (21 U.S.C. §812) en EE.UU. conforme a la Ryan Haight Act (21 U.S.C. §829). Las violaciones resultan en terminación inmediata de cuenta y reporte a autoridades."
      },
      {
        "k": "h2",
        "t": "4. Citas Nacionales"
      },
      {
        "k": "p",
        "t": "Cuando el paciente y el proveedor están en el mismo país y el proveedor tiene licencia válida en la jurisdicción del paciente, aplican las regulaciones estándar de telemedicina. El proveedor puede diagnosticar, tratar y recetar medicamentos sujeto a la ley aplicable. Los proveedores son los únicos responsables del cumplimiento de todas las leyes aplicables de telemedicina y prescripción."
      },
      {
        "k": "h2",
        "t": "5. Responsabilidades del Usuario"
      },
      {
        "k": "h3",
        "t": "5.1 Información Médica Precisa"
      },
      {
        "k": "p",
        "t": "Debe proporcionar historial médico preciso y completo, medicamentos actuales, alergias conocidas, síntomas actuales, información de contacto y de seguro correcta, e información de identidad verdadera."
      },
      {
        "k": "h3",
        "t": "5.2 Usos Prohibidos"
      },
      {
        "k": "p",
        "t": "No puede usar la plataforma para: proporcionar información falsa o fraudulenta; compartir credenciales de cuenta; buscar sustancias controladas en violación de la Ryan Haight Act; obtener múltiples recetas para la misma condición; presentar reclamaciones de seguro fraudulentas; acosar o amenazar a usuarios o proveedores; o realizar ingeniería inversa de ninguna medida de seguridad."
      },
      {
        "k": "h2",
        "t": "9. Exenciones de Responsabilidad y Limitaciones"
      },
      {
        "k": "callout",
        "variant": "info",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Aplicabilidad de Esta Sección"
          },
          {
            "k": "p",
            "t": "Las exenciones y limitaciones en esta Sección están escritas para proporcionar a Medikah la máxima protección bajo la ley de EE.UU. Son ejecutables tal como están escritas para usuarios en Estados Unidos."
          },
          {
            "k": "p",
            "t": "Para usuarios en México: La Sección 16 aplica. Ciertas limitaciones no son ejecutables bajo la LFPC mexicana obligatoria (Art. 90) y no se aplicarán a usuarios mexicanos — pero esto no afecta su validez para usuarios en EE.UU."
          }
        ]
      },
      {
        "k": "h3",
        "t": "9.1 Servicios \"Tal Como Son\""
      },
      {
        "k": "p",
        "t": "LOS SERVICIOS DE MEDIKAH SE PROPORCIONAN \"TAL COMO SON\" Y \"SEGÚN DISPONIBILIDAD\" SIN GARANTÍAS DE NINGÚN TIPO, EXPRESAS O IMPLÍCITAS, INCLUYENDO GARANTÍAS DE COMERCIABILIDAD, IDONEIDAD PARA UN PROPÓSITO PARTICULAR, NO INFRACCIÓN, EXACTITUD, SERVICIO ININTERRUMPIDO O LIBRE DE ERRORES, O SEGURIDAD DE LAS TRANSMISIONES."
      },
      {
        "k": "h3",
        "t": "9.2 Sin Garantías Médicas"
      },
      {
        "k": "p",
        "t": "Medikah NO ofrece garantías sobre resultados médicos; calificaciones del proveedor más allá de la verificación básica de licencia; calidad de la atención médica prestada por proveedores independientes; exactitud de diagnósticos o tratamientos; idoneidad de la atención transfronteriza; o el éxito de cualquier procedimiento de turismo médico."
      },
      {
        "k": "h3",
        "t": "9.3 Limitación de Responsabilidad"
      },
      {
        "k": "p",
        "t": "EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY DE EE.UU. APLICABLE: La responsabilidad total acumulada de Medikah por cualquier reclamación que surja de estos Términos o del uso de la plataforma se limita al mayor entre: (a) el monto total que usted pagó a Medikah en los doce (12) meses anteriores a la reclamación, o (b) CIEN DÓLARES ESTADOUNIDENSES ($100.00 USD)."
      },
      {
        "k": "p",
        "t": "MEDIKAH NO ES RESPONSABLE DE: DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, EJEMPLARES, PUNITIVOS NI CONSECUENTES; PÉRDIDA DE GANANCIAS; PÉRDIDA DE DATOS; COMPLICACIONES MÉDICAS O RESULTADOS ADVERSOS POR ACCIONES DEL PROVEEDOR; NI ANGUSTIA EMOCIONAL."
      },
      {
        "k": "h2",
        "t": "11. Resolución de Disputas"
      },
      {
        "k": "h3",
        "t": "11.1 Resolución Informal — Paso Previo Obligatorio"
      },
      {
        "k": "p",
        "t": "Antes de iniciar cualquier procedimiento legal, debe contactar a Medikah en legal@medikah.health con una descripción escrita de su disputa y dar a Medikah sesenta (60) días para resolverla."
      },
      {
        "k": "h3",
        "t": "11.2 Arbitraje Vinculante — Usuarios en EE.UU."
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Lea Cuidadosamente — Esto Afecta Sus Derechos Legales"
          },
          {
            "k": "p",
            "t": "Si usted es un usuario en Estados Unidos, cualquier disputa con Medikah que no pueda resolverse de manera informal se resolverá mediante arbitraje final y vinculante — no en tribunales ni ante un jurado."
          },
          {
            "k": "p",
            "t": "Está renunciando a su derecho a juicio por jurado y, sujeto a la Sección 14.2, a su derecho a participar en cualquier acción colectiva."
          }
        ]
      },
      {
        "k": "p",
        "t": "El arbitraje se llevará a cabo bajo las Reglas de Arbitraje del Consumidor de la AAA. Medikah paga todas las tarifas de presentación para reclamaciones menores de USD $10,000."
      },
      {
        "k": "p",
        "t": "RENUNCIA A ACCIÓN COLECTIVA: USTED ACEPTA RESOLVER DISPUTAS CON MEDIKAH SOLO DE FORMA INDIVIDUAL. RENUNCIA A CUALQUIER DERECHO A PARTICIPAR EN UNA ACCIÓN COLECTIVA O REPRESENTATIVA. SI ESTA RENUNCIA SE DECLARA INAPLICABLE, LA DISPOSICIÓN DE ARBITRAJE QUEDA NULA."
      },
      {
        "k": "p",
        "t": "EXCLUSIÓN VOLUNTARIA: Puede excluirse del arbitraje dentro de los 30 días de aceptar estos Términos enviando correo a legal@medikah.health con el asunto \"Exclusión del Arbitraje.\""
      },
      {
        "k": "h3",
        "t": "11.3 Ley Aplicable y Jurisdicción"
      },
      {
        "k": "p",
        "t": "Estos Términos se rigen por las leyes del Estado de Delaware, EE.UU. Para disputas comerciales y no de consumidor: la jurisdicción exclusiva es los tribunales del Condado de New Castle, Delaware."
      },
      {
        "k": "h2",
        "t": "16. México — Disposiciones de Jurisdicción Secundaria"
      },
      {
        "k": "callout",
        "variant": "legal",
        "blocks": [
          {
            "k": "callout-title",
            "t": "A Quién Aplica Esta Sección"
          },
          {
            "k": "p",
            "t": "Esta Sección 16 aplica únicamente a usuarios ubicados en México. Si está en Estados Unidos, esta Sección no le aplica y no afecta ninguna otra disposición de estos Términos."
          },
          {
            "k": "p",
            "t": "Propósito: Estas disposiciones garantizan que si la plataforma es usada por pacientes en México, sus derechos obligatorios bajo la ley mexicana sean preservados — sin afectar las protecciones de los usuarios en EE.UU."
          }
        ]
      },
      {
        "k": "h3",
        "t": "16.1 Protección al Consumidor — LFPC"
      },
      {
        "k": "p",
        "t": "Estos Términos constituyen un contrato de adhesión bajo la Ley Federal de Protección al Consumidor (LFPC). Para usuarios en México:"
      },
      {
        "k": "ul",
        "items": [
          "Las cláusulas que contradigan derechos obligatorios bajo la LFPC son nulas de pleno derecho (Art. 90 LFPC), independientemente de su aceptación",
          "La responsabilidad de Medikah por daños a su salud o integridad física causados por negligencia grave o dolo de Medikah no puede limitarse (Art. 90 Fr. I LFPC) — el límite de $100 USD de la Sección 9.3 no aplica a dichas reclamaciones para usuarios mexicanos",
          "La obligación de indemnización de la Sección 10.1 se limita para usuarios mexicanos a reclamaciones derivadas de su dolo o fraude — no de mera negligencia (Art. 90 Fr. II LFPC)",
          "Puede presentar reclamaciones de consumidor ante PROFECO (www.profeco.gob.mx) o tribunales de su domicilio en México"
        ]
      },
      {
        "k": "h3",
        "t": "16.2 Privacidad de Datos — LFPDPPP"
      },
      {
        "k": "p",
        "t": "El tratamiento de datos personales de usuarios en México se rige por la LFPDPPP. Usted tiene plenos derechos ARCO ejercibles en privacy@medikah.health. Medikah designa un Responsable de Datos para México conforme a la LFPDPPP."
      },
      {
        "k": "h3",
        "t": "16.3 Regulación de Salud — NOM-024"
      },
      {
        "k": "p",
        "t": "El manejo de expedientes clínicos electrónicos de usuarios en México está sujeto a NOM-024-SSA3-2012. Los expedientes clínicos de usuarios mexicanos se conservan por un mínimo de 5 años conforme a NOM-024-SSA3-2012."
      },
      {
        "k": "h2",
        "t": "Reconocimiento Final"
      },
      {
        "k": "p",
        "t": "Al completar el mecanismo de aceptación y usar la plataforma de Medikah, usted reconoce y acepta que:"
      },
      {
        "k": "ul",
        "items": [
          "Medikah es una plataforma tecnológica — no un proveedor de salud.",
          "Los proveedores de salud son contratistas independientes.",
          "Los proveedores tienen licencia en México y NO están licenciados para diagnosticar, tratar ni recetar en EE.UU.",
          "Las Citas Informativas transfronterizas son únicamente informativas — no consultas médicas, telemedicina ni tratamiento bajo la ley de EE.UU.",
          "Ha leído y comprendido estos Términos en su totalidad.",
          "Acepta las disposiciones de resolución de disputas, incluyendo arbitraje vinculante y renuncia a acciones colectivas, si es usuario de EE.UU."
        ]
      },
      {
        "k": "warn",
        "t": "SI NO ENTIENDE O NO ESTÁ DE ACUERDO CON CUALQUIER PARTE DE ESTOS TÉRMINOS, NO USE LA PLATAFORMA."
      },
      {
        "k": "footermark",
        "t": "medikah"
      },
      {
        "k": "meta",
        "t": "legal@medikah.health | support@medikah.health | © 2026 Medikah Corporation."
      }
    ]
  },
  "MX": {
    "en": [
      {
        "k": "title",
        "t": "MEDIKAH CORPORATION"
      },
      {
        "k": "subtitle",
        "t": "Terms of Service"
      },
      {
        "k": "subtitle",
        "t": "Patient Agreement — Users in Mexico"
      },
      {
        "k": "meta",
        "t": "Effective Date: February 1, 2026 | Primary Framework: LFPC · LFPDPPP · Ley General de Salud"
      },
      {
        "k": "callout",
        "variant": "info",
        "blocks": [
          {
            "k": "callout-title",
            "t": "About This Document"
          },
          {
            "k": "p",
            "t": "These Terms of Service govern the relationship between Medikah Corporation and patients in Mexico using the platform. They are written in accordance with Mexican mandatory law, including the Ley Federal de Protección al Consumidor (LFPC), the Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), and the Ley General de Salud."
          },
          {
            "k": "p",
            "t": "Spanish version: The Spanish version of these Terms governs for users in Mexico in case of any conflict between the English and Spanish versions. The Spanish version is available at https://medikah.health/es/terms."
          }
        ]
      },
      {
        "k": "h2",
        "t": "Acceptance of Terms"
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Binding Agreement"
          },
          {
            "k": "p",
            "t": "BY ACCESSING OR USING THE MEDIKAH PLATFORM, YOU AGREE TO BE LEGALLY BOUND BY THESE TERMS OF SERVICE AND OUR PRIVACY POLICY / AVISO DE PRIVACIDAD."
          },
          {
            "k": "p",
            "t": "IF YOU DO NOT AGREE, YOU MAY NOT USE OUR SERVICES."
          }
        ]
      },
      {
        "k": "h3",
        "t": "How You Accept"
      },
      {
        "k": "p",
        "t": "Acceptance requires three separate unchecked checkboxes at registration: (1) Terms of Service, (2) Privacy Policy / Aviso de Privacidad, and (3) Express consent to health data processing (datos sensibles — Art. 9 LFPDPPP). The platform records timestamp, document hash, IP address, and user ID upon acceptance, and sends a confirmation email."
      },
      {
        "k": "h3",
        "t": "Updates"
      },
      {
        "k": "p",
        "t": "Material changes will be notified at least 30 days in advance (60 days for changes affecting health data or fees), consistent with Art. 87 Bis LFPC. Re-consent is required upon next login after material changes."
      },
      {
        "k": "h2",
        "t": "Critical Understanding — What Medikah Is and Is Not"
      },
      {
        "k": "p",
        "t": "Medikah Corporation operates a health technology platform enabling patients to connect with independently licensed healthcare providers. Medikah does not provide medical care, employ healthcare providers, or practice medicine. Healthcare providers are independent contractors solely responsible for their clinical acts."
      },
      {
        "k": "h3",
        "t": "We Provide:"
      },
      {
        "k": "ul",
        "items": [
          "HIPAA-compliant, encrypted video Appointments",
          "PCI-DSS compliant payment processing",
          "Appointment scheduling and coordination tools",
          "Secure health record storage consistent with HIPAA (45 CFR §164) and NOM-024-SSA3-2012"
        ]
      },
      {
        "k": "h3",
        "t": "We Are NOT:"
      },
      {
        "k": "ul",
        "items": [
          "Healthcare providers or medical practitioners",
          "A telemedicine service — we provide the technology, providers deliver the care",
          "Employers or supervisors of the doctors on our platform",
          "Responsible for medical care, diagnoses, treatment, or outcomes"
        ]
      },
      {
        "k": "h2",
        "t": "1. Eligibility and Account Requirements"
      },
      {
        "k": "h3",
        "t": "1.1 Age and Legal Capacity"
      },
      {
        "k": "p",
        "t": "To create an account independently, you must be at least 18 years old (or the age of majority under Mexican law) and legally capable of entering binding contracts. Minors may use the platform only with a parent or legal guardian, subject to the Ley General de los Derechos de Niñas, Niños y Adolescentes (LGDNNA) and express parental consent for processing of the minor's health data."
      },
      {
        "k": "h3",
        "t": "1.2 Account Responsibilities"
      },
      {
        "k": "p",
        "t": "You are responsible for: providing accurate and complete information; maintaining credential security; all activity under your account; and immediately notifying Medikah of unauthorized access at support@medikah.health."
      },
      {
        "k": "h2",
        "t": "2. Description of Services"
      },
      {
        "k": "h3",
        "t": "2.1 For Patients in Mexico — Domestic Appointments"
      },
      {
        "k": "p",
        "t": "When both patient and provider are in Mexico and the provider holds a valid Mexican medical license (cédula profesional), standard telemedicine regulations apply under the Ley General de Salud and NOM-035-SSA3-2012. The provider may diagnose and treat via video Appointment and may prescribe medications subject to applicable law. A separate Informed Consent Form (Form MEDIKAH-DOM-001) is required before each domestic Appointment."
      },
      {
        "k": "h3",
        "t": "2.2 For Patients in Mexico — Informational Appointments with U.S. Providers"
      },
      {
        "k": "p",
        "t": "If you use the platform to connect with a U.S.-licensed provider while you are in Mexico, the same cross-border restrictions apply in reverse: the U.S. provider is not licensed in Mexico and cannot diagnose, treat, or prescribe under Mexican law. The Informational Appointment Acknowledgment Form (Form MEDIKAH-CB-001) is required."
      },
      {
        "k": "h2",
        "t": "3. Fees and Payment"
      },
      {
        "k": "p",
        "t": "Provider fees for Appointments are set independently by each provider. Medikah's platform coordination services are currently provided at no direct cost to patients. Medikah reserves the right to introduce platform fees with at least 60 days' advance notice, consistent with Art. 87 Bis LFPC."
      },
      {
        "k": "h2",
        "t": "4. Privacy and Health Data"
      },
      {
        "k": "p",
        "t": "Your health data constitutes datos sensibles under Art. 3 Fr. VI LFPDPPP and Protected Health Information (PHI) under HIPAA. Processing requires your express, specific, and informed consent. Your ARCO rights (Acceso, Rectificación, Cancelación, Oposición) may be exercised at privacy@medikah.health at any time. See Medikah's Privacy Policy / Aviso de Privacidad for full details."
      },
      {
        "k": "p",
        "t": "Electronic health records generated during domestic Appointments are maintained for a minimum of 5 years from the date of last service, consistent with NOM-024-SSA3-2012. You may request your records at privacy@medikah.health at any time during the retention period."
      },
      {
        "k": "h2",
        "t": "5. Disclaimers and Limitations of Liability"
      },
      {
        "k": "callout",
        "variant": "legal",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Mandatory Consumer Rights Reservation — LFPC"
          },
          {
            "k": "p",
            "t": "Notwithstanding any other provision of these Terms, nothing limits, restricts, or waives any right guaranteed to consumers in Mexico under the Ley Federal de Protección al Consumidor (LFPC):"
          },
          {
            "k": "ul",
            "items": [
              "Medikah's liability for damages to your health caused by Medikah's gross negligence or willful misconduct cannot be limited (Art. 90 Fr. I LFPC).",
              "Clauses requiring advance waiver of consumer rights are null and void (Art. 90 Fr. II LFPC)."
            ]
          },
          {
            "k": "p",
            "t": "In the event of conflict between these Terms and the LFPC, the LFPC prevails."
          }
        ]
      },
      {
        "k": "p",
        "t": "Subject to the above reservation, Medikah's liability arising from platform technology failures is limited to the amount paid to Medikah in the 12 months preceding the claim, or USD $100, whichever is greater, to the maximum extent permitted by applicable law."
      },
      {
        "k": "h2",
        "t": "6. Dispute Resolution — Mexico"
      },
      {
        "k": "p",
        "t": "Users in Mexico retain the following rights regardless of any other dispute resolution provision:"
      },
      {
        "k": "ul",
        "items": [
          "Submit consumer complaints to PROFECO (www.profeco.gob.mx) via the Concilianet system at no cost",
          "Bring consumer claims before Mexican courts in their state of residence",
          "Submit data privacy complaints to the INAI (www.inai.org.mx)",
          "File medical care complaints with CONAMED (www.conamed.gob.mx) against the treating provider"
        ]
      },
      {
        "k": "p",
        "t": "Governing law for users in Mexico: The Ley Federal de Protección al Consumidor (LFPC), LFPDPPP, Ley General de Salud, and applicable Mexican consumer protection law govern and prevail. Medikah accepts PROFECO's jurisdiction for consumer matters."
      },
      {
        "k": "h2",
        "t": "7. Health Regulation — Mexico"
      },
      {
        "k": "h3",
        "t": "7.1 NOM-024-SSA3-2012"
      },
      {
        "k": "p",
        "t": "The management of electronic health records for users in Mexico is subject to NOM-024-SSA3-2012. Healthcare providers using the platform in Mexico must hold a valid cédula profesional registered with the Secretaría de Educación Pública (SEP) and comply with all applicable Mexican health regulations."
      },
      {
        "k": "h3",
        "t": "7.2 COFEPRIS"
      },
      {
        "k": "p",
        "t": "Healthcare providers are solely responsible for compliance with COFEPRIS regulations and any applicable authorizations required for telemedicine practice in Mexico. Medikah does not guarantee or warrant any provider's compliance with COFEPRIS requirements."
      },
      {
        "k": "h2",
        "t": "Final Acknowledgment"
      },
      {
        "k": "p",
        "t": "By completing the consent mechanism and using the Medikah platform, you acknowledge and agree that:"
      },
      {
        "k": "ul",
        "items": [
          "Medikah is a technology platform — not a healthcare provider.",
          "Healthcare providers are independent contractors solely responsible for their clinical acts.",
          "You have read and understood these Terms of Service.",
          "For domestic Appointments: the provider holds a valid Mexican medical license and may diagnose, treat, and prescribe under Mexican law — subject to Form MEDIKAH-DOM-001.",
          "For Informational Appointments: the provider is not licensed in your location and cannot provide medical treatment — subject to Form MEDIKAH-CB-001.",
          "Your mandatory consumer rights under the LFPC are preserved regardless of any other provision of these Terms."
        ]
      },
      {
        "k": "warn",
        "t": "IF YOU DO NOT UNDERSTAND OR DO NOT AGREE TO ANY PART OF THESE TERMS, DO NOT USE THE PLATFORM."
      },
      {
        "k": "footermark",
        "t": "medikah"
      },
      {
        "k": "meta",
        "t": "legal@medikah.health | support@medikah.health | © 2026 Medikah Corporation."
      }
    ],
    "es": [
      {
        "k": "title",
        "t": "MEDIKAH CORPORATION"
      },
      {
        "k": "subtitle",
        "t": "Términos y Condiciones de Uso"
      },
      {
        "k": "subtitle",
        "t": "Acuerdo con el Paciente — Usuarios en México"
      },
      {
        "k": "meta",
        "t": "Fecha de Vigencia: 1 de febrero de 2026 | Marco Legal: LFPC · LFPDPPP · Ley General de Salud"
      },
      {
        "k": "callout",
        "variant": "info",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Sobre Este Documento"
          },
          {
            "k": "p",
            "t": "Estos Términos y Condiciones rigen la relación entre Medikah Corporation y los pacientes en México que utilizan la plataforma. Están redactados conforme a la legislación mexicana obligatoria, incluyendo la Ley Federal de Protección al Consumidor (LFPC), la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y la Ley General de Salud."
          },
          {
            "k": "p",
            "t": "En caso de conflicto entre la versión en español y la versión en inglés de estos Términos, la versión en español prevalece para usuarios en México (Art. 16 LFPDPPP)."
          }
        ]
      },
      {
        "k": "h2",
        "t": "Aceptación de los Términos"
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Contrato de Adhesión — Acuerdo Vinculante"
          },
          {
            "k": "p",
            "t": "AL ACCEDER O USAR LA PLATAFORMA DE MEDIKAH, USTED ACEPTA QUEDAR LEGALMENTE VINCULADO POR ESTOS TÉRMINOS Y CONDICIONES Y EL AVISO DE PRIVACIDAD."
          },
          {
            "k": "p",
            "t": "ESTOS TÉRMINOS CONSTITUYEN UN CONTRATO DE ADHESIÓN EN LOS TÉRMINOS DE LA LEY FEDERAL DE PROTECCIÓN AL CONSUMIDOR (LFPC). MEDIKAH LO REGISTRARÁ ANTE PROFECO CONFORME AL ART. 86 LFPC."
          }
        ]
      },
      {
        "k": "h3",
        "t": "Mecanismo de Aceptación"
      },
      {
        "k": "p",
        "t": "La aceptación requiere tres casillas separadas sin pre-marcar durante el registro: (1) Términos y Condiciones, (2) Aviso de Privacidad, y (3) Consentimiento expreso para el tratamiento de datos de salud (datos sensibles — Art. 9 LFPDPPP). La plataforma registra marca de tiempo, hash del documento, dirección IP e identificador de usuario al momento de la aceptación."
      },
      {
        "k": "h3",
        "t": "Actualizaciones"
      },
      {
        "k": "p",
        "t": "Los cambios materiales serán notificados con al menos 30 días de anticipación (60 días para cambios que afecten datos de salud o tarifas), conforme al Art. 87 Bis LFPC. El uso continuado de la plataforma después del período de aviso constituirá aceptación."
      },
      {
        "k": "h2",
        "t": "Entendimiento Crítico — Qué es y qué no es Medikah"
      },
      {
        "k": "p",
        "t": "Medikah Corporation opera una plataforma tecnológica de salud que facilita la comunicación entre pacientes y proveedores de salud independientes con licencia. Medikah no presta servicios médicos, no emplea a los médicos de la plataforma ni ejerce la medicina. Los proveedores de salud son contratistas independientes con responsabilidad exclusiva sobre sus actos médicos."
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "Los Proveedores de Salud son Contratistas Independientes"
          },
          {
            "k": "p",
            "t": "Los médicos y proveedores en la plataforma Medikah son profesionales independientes con licencia propia. Son los únicos responsables de toda la atención médica que prestan. NO son empleados, agentes ni representantes de Medikah. Medikah no ejerce control sobre sus decisiones clínicas."
          },
          {
            "k": "p",
            "t": "El rol de Medikah: Proporcionamos la tecnología. Ellos proporcionan la atención médica."
          }
        ]
      },
      {
        "k": "h2",
        "t": "1. Elegibilidad y Requisitos de Cuenta"
      },
      {
        "k": "h3",
        "t": "1.1 Edad y Capacidad Legal"
      },
      {
        "k": "p",
        "t": "Para crear una cuenta de forma independiente debe ser mayor de 18 años o tener la mayoría de edad conforme a la legislación mexicana, y tener capacidad legal para celebrar contratos. Los menores de edad podrán usar la plataforma únicamente con el consentimiento expreso de padre o tutor legal, sujeto a la Ley General de los Derechos de Niñas, Niños y Adolescentes (LGDNNA) y al consentimiento expreso para el tratamiento de datos sensibles del menor."
      },
      {
        "k": "h3",
        "t": "1.2 Responsabilidades de la Cuenta"
      },
      {
        "k": "p",
        "t": "Usted es responsable de proporcionar información precisa y completa; mantener la seguridad de sus credenciales; toda la actividad en su cuenta; y notificar a Medikah de inmediato sobre cualquier acceso no autorizado en support@medikah.health."
      },
      {
        "k": "h2",
        "t": "2. Descripción de los Servicios"
      },
      {
        "k": "h3",
        "t": "2.1 Citas Médicas Nacionales"
      },
      {
        "k": "p",
        "t": "Cuando el paciente y el proveedor se encuentran en México y el proveedor cuenta con cédula profesional vigente registrada ante la SEP, aplican las regulaciones estándar de telemedicina conforme a la Ley General de Salud y la NOM-035-SSA3-2012. El proveedor puede diagnosticar, tratar y recetar medicamentos sujeto a la legislación aplicable. Se requiere el Formulario de Consentimiento Informado (Forma MEDIKAH-DOM-001) antes de cada Cita."
      },
      {
        "k": "h3",
        "t": "2.2 Citas Informativas Transfronterizas"
      },
      {
        "k": "p",
        "t": "Si usted, encontrándose en México, conecta con un proveedor con licencia en EE.UU., aplican las restricciones transfronterizas: el proveedor no está licenciado en México y no puede diagnosticar, tratar ni recetar bajo la ley mexicana. Se requiere la Forma MEDIKAH-CB-001."
      },
      {
        "k": "h3",
        "t": "2.3 Lo que Medikah NO Proporciona"
      },
      {
        "k": "callout",
        "variant": "warn",
        "blocks": [
          {
            "k": "callout-title",
            "t": "No Somos un Servicio Médico"
          },
          {
            "k": "p",
            "t": "Medikah no proporciona consejo médico, diagnósticos, tratamiento ni recetas. No garantizamos resultados médicos."
          },
          {
            "k": "p",
            "t": "PARA EMERGENCIAS MÉDICAS: Llame al 911 de inmediato. NO use la plataforma Medikah para emergencias."
          }
        ]
      },
      {
        "k": "h2",
        "t": "3. Tarifas y Pago"
      },
      {
        "k": "p",
        "t": "Las tarifas de los proveedores por Citas son fijadas de forma independiente por cada proveedor. Los servicios de coordinación de la plataforma Medikah se proporcionan actualmente sin costo directo para los pacientes. Medikah se reserva el derecho de introducir tarifas de plataforma con al menos 60 días de aviso previo conforme al Art. 87 Bis LFPC."
      },
      {
        "k": "h2",
        "t": "4. Privacidad y Datos de Salud"
      },
      {
        "k": "p",
        "t": "Sus datos de salud constituyen datos sensibles conforme al Art. 3 Fr. VI LFPDPPP. Su tratamiento requiere su consentimiento expreso, específico e informado. Usted puede ejercer sus derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) en privacy@medikah.health en cualquier momento. Consulte el Aviso de Privacidad Integral de Medikah para todos los detalles."
      },
      {
        "k": "p",
        "t": "Los expedientes clínicos electrónicos generados durante Citas nacionales se conservan por un mínimo de 5 años desde la fecha del último servicio conforme a NOM-024-SSA3-2012. Puede solicitar su expediente en privacy@medikah.health durante todo ese período."
      },
      {
        "k": "h2",
        "t": "5. Responsabilidad de Medikah — Derechos Irrenunciables del Consumidor"
      },
      {
        "k": "callout",
        "variant": "legal",
        "blocks": [
          {
            "k": "callout-title",
            "t": "LFPC — Derechos Obligatorios que No Pueden Limitarse"
          },
          {
            "k": "p",
            "t": "Conforme al Art. 90 de la Ley Federal de Protección al Consumidor, ninguna cláusula de estos Términos limita, restringe ni hace renunciar a ningún derecho garantizado al consumidor bajo la LFPC:"
          },
          {
            "k": "ul",
            "items": [
              "La responsabilidad de Medikah por daños a su salud o integridad física causados por negligencia grave o dolo propio de Medikah NO puede limitarse contractualmente (Art. 90 Fr. I LFPC).",
              "Las cláusulas que exijan renuncia anticipada de sus derechos son nulas de pleno derecho (Art. 90 Fr. II LFPC), independientemente de que las haya aceptado.",
              "Las cláusulas que inviertan la carga de la prueba en su perjuicio son nulas (Art. 90 Fr. VIII LFPC)."
            ]
          },
          {
            "k": "p",
            "t": "En caso de conflicto entre estos Términos y la LFPC, la LFPC prevalece en la medida requerida por la ley."
          }
        ]
      },
      {
        "k": "p",
        "t": "La responsabilidad de Medikah por fallas técnicas de la plataforma se limita, en lo permitido por la ley, al monto pagado a Medikah en los 12 meses anteriores a la reclamación o USD $100, lo que sea mayor."
      },
      {
        "k": "h2",
        "t": "6. Resolución de Disputas"
      },
      {
        "k": "p",
        "t": "Independientemente de cualquier otra disposición de estos Términos, usted conserva el derecho a:"
      },
      {
        "k": "ul",
        "items": [
          "Presentar quejas de consumidor ante PROFECO (www.profeco.gob.mx) vía Concilianet, de forma gratuita",
          "Presentar reclamaciones de consumidor ante los tribunales de su domicilio en México",
          "Presentar quejas de privacidad ante el INAI (www.inai.org.mx) por violaciones a la LFPDPPP",
          "Presentar quejas por atención médica ante la CONAMED (www.conamed.gob.mx) contra el médico tratante"
        ]
      },
      {
        "k": "p",
        "t": "Ley aplicable: La LFPC, LFPDPPP, Ley General de Salud y demás legislación mexicana de protección al consumidor rigen y prevalecen para usuarios en México. Medikah acepta la jurisdicción de PROFECO para asuntos de consumidor."
      },
      {
        "k": "h2",
        "t": "7. Regulación Sanitaria — México"
      },
      {
        "k": "h3",
        "t": "7.1 NOM-024-SSA3-2012"
      },
      {
        "k": "p",
        "t": "El manejo de expedientes clínicos electrónicos de usuarios en México está sujeto a NOM-024-SSA3-2012 sobre Sistemas de Información de Registro Electrónico para la Salud. Los proveedores de salud que usen la plataforma en México deben contar con cédula profesional vigente registrada ante la SEP y cumplir con toda la regulación sanitaria mexicana aplicable."
      },
      {
        "k": "h3",
        "t": "7.2 COFEPRIS"
      },
      {
        "k": "p",
        "t": "Los proveedores de salud son los únicos responsables del cumplimiento de las disposiciones de COFEPRIS y de cualquier autorización requerida para la práctica de telemedicina en México. Medikah no garantiza ni certifica el cumplimiento de los proveedores con los requisitos de COFEPRIS."
      },
      {
        "k": "h2",
        "t": "Reconocimiento Final"
      },
      {
        "k": "p",
        "t": "Al completar el mecanismo de aceptación y usar la plataforma de Medikah, usted reconoce y acepta que:"
      },
      {
        "k": "ul",
        "items": [
          "Medikah es una plataforma tecnológica — no un proveedor de salud.",
          "Los proveedores de salud son contratistas independientes.",
          "Ha leído y comprendido estos Términos y Condiciones en su totalidad.",
          "Para Citas nacionales: el proveedor cuenta con cédula profesional vigente en México y puede diagnosticar, tratar y recetar conforme a la ley mexicana — sujeto a la Forma MEDIKAH-DOM-001.",
          "Para Citas Informativas transfronterizas: el proveedor no está licenciado en su ubicación y no puede prestar tratamiento médico — sujeto a la Forma MEDIKAH-CB-001.",
          "Sus derechos obligatorios como consumidor bajo la LFPC quedan preservados independientemente de cualquier otra disposición de estos Términos."
        ]
      },
      {
        "k": "warn",
        "t": "SI NO ENTIENDE O NO ESTÁ DE ACUERDO CON CUALQUIER PARTE DE ESTOS TÉRMINOS, NO USE LA PLATAFORMA."
      },
      {
        "k": "footermark",
        "t": "medikah"
      },
      {
        "k": "meta",
        "t": "legal@medikah.health | support@medikah.health | © 2026 Medikah Corporation. Todos los derechos reservados."
      }
    ]
  }
};
