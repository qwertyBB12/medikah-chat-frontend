import { SupportedLang } from './i18n';

export const PHYSICIAN_CONSENT_VERSION = '1.0';

export interface PhysicianConsentSection {
  sectionId: string;
  title: string;
  summary: string;
  body: string;
  hasRecordingConsent?: boolean;
}

export interface PhysicianConsentUICopy {
  modalTitle: string;
  importantNotice: string;
  agreeButton: string;
  recordingYes: string;
  recordingNo: string;
  checkboxLabel: string;
}

export const physicianConsentUICopy: Record<SupportedLang, PhysicianConsentUICopy> = {
  en: {
    modalTitle: 'Physician Network Agreement',
    importantNotice:
      'Please read and acknowledge each section below. This agreement governs your participation in the Medikah Physician Network for cross-border informational consultations.',
    agreeButton: 'I Agree & Complete Registration',
    recordingYes: 'Yes, I consent to consultation recording',
    recordingNo: 'No, I do not consent to recording',
    checkboxLabel:
      'I have read, understood, and agree to all sections of this Physician Network Agreement',
  },
  es: {
    modalTitle: 'Acuerdo de Red de Médicos',
    importantNotice:
      'Por favor lea y reconozca cada sección a continuación. Este acuerdo rige su participación en la Red de Médicos de Medikah para consultas informativas transfronterizas.',
    agreeButton: 'Acepto y Completar Registro',
    recordingYes: 'Sí, consiento la grabación de consultas',
    recordingNo: 'No, no consiento la grabación',
    checkboxLabel:
      'He leído, comprendido y acepto todas las secciones de este Acuerdo de Red de Médicos',
  },
};

export const physicianConsentSections: Record<SupportedLang, PhysicianConsentSection[]> = {
  en: [
    {
      sectionId: 'network_membership',
      title: '1. Network Membership and Purpose',
      summary:
        'You are joining a credentialed physician network for cross-border informational consultations.',
      body: `I UNDERSTAND that by joining the Medikah Physician Network:

• I am becoming part of a credentialed network of physicians across the Americas
• The network facilitates informational consultations with patients considering medical tourism
• Medikah verifies credentials but I remain an independent healthcare professional
• My participation is voluntary and I may withdraw at any time

I UNDERSTAND the purpose of this network is to:

• Help patients make informed decisions about traveling for medical care
• Provide informational consultations, NOT remote medical treatment
• Connect qualified physicians with patients across borders
• Build trust through credential verification and professional standards`,
    },
    {
      sectionId: 'scope_of_consultations',
      title: '2. Scope of Consultations — Informational Only',
      summary:
        'Cross-border consultations are for information and planning only, not diagnosis or treatment.',
      body: `I UNDERSTAND that during cross-border video consultations, I am LIMITED to:

✅ Reviewing patient medical records and history for context
✅ Explaining procedures and treatments available in my country
✅ Discussing costs, logistics, and recovery expectations
✅ Answering general questions about my expertise and practice
✅ Providing preliminary assessments of candidacy for procedures
✅ Helping patients plan potential trips for in-person care

I UNDERSTAND that during cross-border consultations, I MUST NOT:

❌ Diagnose medical conditions under the patient's local laws
❌ Prescribe medications to patients in other countries
❌ Order tests or procedures in the patient's location
❌ Provide definitive treatment plans without in-person examination
❌ Represent that I am licensed in the patient's jurisdiction (unless verified)
❌ Practice medicine under laws of jurisdictions where I am not licensed

I ACKNOWLEDGE that:

• Violating these restrictions may result in removal from the network
• I am responsible for understanding the laws in my licensing jurisdiction
• Patients are informed of these limitations before consulting with me
• Actual medical care must occur in-person in my licensed jurisdiction`,
    },
    {
      sectionId: 'licensing_credentials',
      title: '3. Licensing and Credential Verification',
      summary:
        'Your credentials will be verified; you must maintain valid licenses and report changes.',
      body: `I ACKNOWLEDGE that:

• Medikah will verify my medical credentials as part of network membership
• Verification may include contacting licensing boards and institutions
• I am responsible for providing accurate credential information
• False or misleading credential information will result in removal and may be reported

I AGREE to:

• Maintain active medical licenses in good standing
• Notify Medikah within 7 days of any changes to my license status
• Notify Medikah of any disciplinary actions, investigations, or malpractice claims
• Update my profile if my practice, specialties, or affiliations change
• Cooperate with periodic re-verification of credentials

I UNDERSTAND that:

• My verification status will be displayed to patients
• Medikah may suspend my access pending credential verification
• Network membership does not constitute licensing in any jurisdiction
• I remain subject to oversight by my own licensing jurisdiction`,
    },
    {
      sectionId: 'professional_conduct',
      title: '4. Professional Conduct Standards',
      summary:
        'You agree to maintain professional standards and treat all patients with respect.',
      body: `I AGREE to maintain professional conduct including:

Communication:
• Responding to patient inquiries within reasonable timeframes
• Communicating clearly, especially across language barriers
• Being honest about my qualifications, experience, and limitations
• Providing accurate information about procedures and expected outcomes

Professionalism:
• Treating all patients with dignity and respect regardless of background
• Maintaining appropriate professional boundaries
• Dressing professionally during video consultations
• Ensuring consultations occur in private, clinical settings

Ethics:
• Not accepting patients for procedures they are not candidates for
• Disclosing relevant conflicts of interest
• Not making exaggerated claims about outcomes
• Referring patients to other specialists when appropriate

I UNDERSTAND that unprofessional conduct may result in:
• Warnings or temporary suspension from the network
• Permanent removal from the network
• Reports to licensing authorities if warranted`,
    },
    {
      sectionId: 'liability_malpractice',
      title: '5. Liability and Malpractice Coverage',
      summary:
        'You maintain responsibility for your professional actions and appropriate insurance.',
      body: `I UNDERSTAND that:

• I am an independent contractor, not an employee of Medikah
• Medikah is a technology platform, not a healthcare provider
• I am solely responsible for my professional actions and advice
• Medikah does not provide malpractice insurance for my practice

I ACKNOWLEDGE that:

• My malpractice insurance may not cover cross-border consultations
• I should consult with my insurer about coverage for informational consultations
• Liability for any advice I provide rests with me, not Medikah
• Patients are informed that Medikah is not liable for my professional actions

I AGREE to:

• Maintain appropriate professional liability insurance in my jurisdiction
• Inform Medikah if my malpractice coverage changes or is cancelled
• Indemnify and hold Medikah harmless from claims arising from my actions
• Not misrepresent Medikah's role or liability to patients

I UNDERSTAND that:

• The informational-only nature of consultations limits but does not eliminate liability
• I should document consultations carefully
• Different countries have different malpractice standards and statutes of limitations`,
    },
    {
      sectionId: 'patient_rights',
      title: '6. Patient Rights and Informed Consent',
      summary:
        'Patients must understand the consultation limitations; you support informed decision-making.',
      body: `I UNDERSTAND that patients consulting with me have rights including:

• Being informed that I am not licensed in their jurisdiction
• Understanding that consultations are informational only
• Receiving honest information about procedures and risks
• Declining consultation or treatment at any time
• Having their privacy respected and data protected

I AGREE to:

• Ensure patients understand the limitations of cross-border consultations
• Not pressure patients into procedures they are uncertain about
• Provide balanced information about risks and benefits
• Respect patient decisions even if I disagree
• Report any concerns about patient safety to Medikah

I ACKNOWLEDGE that:

• Patients sign their own acknowledgment form before consulting with me
• I should verify patient understanding at the start of consultations
• Vulnerable patients may need additional safeguards
• Final treatment decisions require in-person examination`,
    },
    {
      sectionId: 'data_privacy',
      title: '7. Data Privacy and Confidentiality',
      summary:
        'You agree to protect patient data and comply with applicable privacy laws.',
      body: `I UNDERSTAND that:

• Patient health information crosses international borders through this platform
• Different privacy laws apply in different countries (HIPAA, GDPR, Mexican law, etc.)
• I am responsible for understanding privacy laws in my jurisdiction
• Data breaches must be reported to Medikah immediately

I AGREE to:

• Treat all patient information as confidential
• Only access patient data for legitimate consultation purposes
• Not share patient information with unauthorized parties
• Use secure communication methods provided by the platform
• Follow my jurisdiction's medical records retention requirements

I ACKNOWLEDGE that:

• Consultation records are stored by Medikah per their Privacy Policy
• I may request access to my consultation records
• Patients may request their consultation records
• Medikah may access consultation records for quality assurance and dispute resolution`,
    },
    {
      sectionId: 'platform_usage',
      title: '8. Platform Usage and Technology',
      summary:
        'You agree to use the platform appropriately and understand technology limitations.',
      body: `I AGREE to:

• Use only Medikah-provided communication tools for consultations
• Not circumvent the platform to contact patients directly
• Keep my account credentials secure
• Report any security concerns or suspicious activity
• Maintain adequate internet connectivity for video consultations

I UNDERSTAND that:

• Technology can fail — calls may drop, video quality may vary
• I should have backup communication plans for patients
• The platform is not monitored 24/7 for emergencies
• I should not use the platform for emergency medical situations

I ACKNOWLEDGE that:

• Medikah may update the platform and its features
• I will receive training on platform features as needed
• My usage of the platform may be monitored for quality assurance
• Misuse of the platform may result in account suspension`,
    },
    {
      sectionId: 'recording_consent',
      title: '9. Consultation Recording',
      summary:
        'Consultations may be recorded with mutual consent for quality and protection.',
      body: `I UNDERSTAND that:

• Video consultations may be recorded with appropriate consent
• Recordings serve quality assurance, training, and dispute resolution purposes
• Patients must consent to recording before it occurs
• I have the right to decline recording of my consultations

Recording purposes include:
• Quality assurance and improvement
• Dispute resolution if complaints arise
• Training and educational purposes (with consent)
• Legal protection for all parties

If I consent to recording:
• Recordings are encrypted and stored securely
• Access is limited to authorized Medikah personnel
• Recordings are subject to the Privacy Policy
• Retention periods comply with applicable laws

I will indicate my recording consent preference below.`,
      hasRecordingConsent: true,
    },
    {
      sectionId: 'compensation_billing',
      title: '10. Compensation and Billing',
      summary:
        'Understand how consultations are compensated and your billing responsibilities.',
      body: `I UNDERSTAND that:

• Consultation fees are set by Medikah with input from network physicians
• Medikah processes payments from patients
• I will receive compensation per the terms agreed upon separately
• Tax obligations for income are my responsibility

I AGREE to:

• Not request direct payment from patients outside the platform
• Provide accurate billing information to Medikah
• Report any payment discrepancies promptly
• Comply with tax laws in my jurisdiction

I ACKNOWLEDGE that:

• Consultation fees may vary by specialty and service type
• Medikah retains a platform fee from each consultation
• Payment terms are detailed in separate compensation agreements
• Disputes about payment should be directed to Medikah`,
    },
    {
      sectionId: 'video_conferencing',
      title: '11. Video Conferencing Standards',
      summary:
        'Maintain professional standards during video consultations with patients.',
      body: `I AGREE to maintain appropriate standards during video consultations:

Environment:
• Conduct consultations in a private, clinical setting
• Ensure adequate lighting and professional background
• Minimize background noise and interruptions
• Have necessary medical records and tools accessible

Technical:
• Test audio and video before consultations
• Have backup internet or phone connection available
• Know how to use platform features (screen share, chat, etc.)
• Start consultations on time

Clinical:
• Review patient materials before the consultation
• Take appropriate notes during the consultation
• Summarize key points at the end of consultations
• Provide clear next steps for patients

I UNDERSTAND that:

• First impressions matter for patient trust
• Technical difficulties should be handled professionally
• Patients may be anxious about consulting across borders
• Clear communication is essential across cultures and languages`,
    },
    {
      sectionId: 'termination',
      title: '12. Termination and Withdrawal',
      summary:
        'Understand how network membership can end and your obligations upon termination.',
      body: `I UNDERSTAND that my network membership may be terminated:

By Me:
• I may withdraw from the network at any time with 30 days notice
• I should complete pending consultations before withdrawal
• I should inform Medikah of my withdrawal in writing

By Medikah:
• For violation of this agreement or professional standards
• For loss or suspension of medical license
• For unprofessional conduct or patient complaints
• For failure to maintain accurate credential information
• For extended inactivity (with prior notice)

Upon Termination:
• I will complete any scheduled consultations or transfer care
• My access to the platform will be deactivated
• Patient records remain with Medikah per their retention policy
• I may not contact patients directly after termination
• Compensation for completed consultations will still be paid

I ACKNOWLEDGE that:
• Termination decisions by Medikah are at their discretion
• I may appeal termination decisions through Medikah's process
• Certain terminations may be reported to licensing authorities`,
    },
    {
      sectionId: 'dispute_resolution',
      title: '13. Dispute Resolution',
      summary:
        'Understand how disputes and complaints will be handled.',
      body: `I UNDERSTAND that:

Patient Complaints:
• Patients may file complaints about consultations
• Medikah will notify me of complaints and seek my response
• I agree to cooperate with complaint investigations
• Unresolved complaints may result in disciplinary action

Disputes with Medikah:
• Disputes should first be raised with Medikah support
• Unresolved disputes may proceed to mediation
• Binding arbitration may apply per separate terms
• Governing law and jurisdiction are specified in Terms of Service

I AGREE to:

• Respond to complaints within 5 business days
• Provide documentation requested during investigations
• Participate in good faith in dispute resolution
• Not retaliate against patients who file complaints

I ACKNOWLEDGE that:
• Some disputes may need to be reported to licensing authorities
• Medikah may share information with authorities if required by law
• I should maintain my own records of consultations for protection`,
    },
    {
      sectionId: 'future_services',
      title: '14. Future Services and Updates',
      summary:
        'The network may expand with new features and services over time.',
      body: `I UNDERSTAND that:

• Medikah may introduce new features and services
• Network terms may be updated with reasonable notice
• I will be notified of material changes to this agreement
• Continued participation after changes indicates acceptance

Future services may include:
• Expanded consultation types and specialties
• In-person care coordination services
• Continuing medical education opportunities
• Enhanced credentialing and verification services
• Patient management and scheduling tools

I AGREE to:

• Review updates to network terms when notified
• Provide feedback on new features and services
• Participate in training for new platform features
• Withdraw if I no longer agree with updated terms

I ACKNOWLEDGE that:
• New services may have additional terms and requirements
• Participation in new services is voluntary
• Feedback helps improve the network for all physicians`,
    },
    {
      sectionId: 'acknowledgment',
      title: '15. Final Acknowledgment',
      summary:
        'Confirm you have read, understood, and agree to this Physician Network Agreement.',
      body: `I CONFIRM that:

• I have read and understood all sections of this agreement
• I have had the opportunity to ask questions
• I am joining the network voluntarily
• I meet the eligibility requirements for network membership
• The information I provided during onboarding is accurate

I UNDERSTAND that:

• This agreement is binding upon acceptance
• Violation may result in termination and other consequences
• I should keep a copy of this agreement for my records
• I can contact Medikah with questions: physicians@medikah.health

I ACKNOWLEDGE that:

• By completing registration, I am agreeing to these terms
• This agreement supplements (does not replace) Medikah's Terms of Service
• I am responsible for staying informed of network updates
• My participation helps build cross-border healthcare infrastructure

Contact Information:
• Physician Support: physicians@medikah.health
• Credentialing: credentials@medikah.health
• Legal Questions: legal@medikah.health`,
    },
  ],
  es: [
    {
      sectionId: 'network_membership',
      title: '1. Membresía en la Red y Propósito',
      summary:
        'Se está uniendo a una red de médicos acreditados para consultas informativas transfronterizas.',
      body: `ENTIENDO que al unirme a la Red de Médicos de Medikah:

• Me estoy convirtiendo en parte de una red acreditada de médicos en las Américas
• La red facilita consultas informativas con pacientes que consideran turismo médico
• Medikah verifica credenciales pero sigo siendo un profesional de salud independiente
• Mi participación es voluntaria y puedo retirarme en cualquier momento

ENTIENDO que el propósito de esta red es:

• Ayudar a los pacientes a tomar decisiones informadas sobre viajar para atención médica
• Proporcionar consultas informativas, NO tratamiento médico remoto
• Conectar médicos calificados con pacientes a través de fronteras
• Generar confianza mediante verificación de credenciales y estándares profesionales`,
    },
    {
      sectionId: 'scope_of_consultations',
      title: '2. Alcance de Consultas — Solo Informativo',
      summary:
        'Las consultas transfronterizas son solo para información y planificación, no diagnóstico ni tratamiento.',
      body: `ENTIENDO que durante las consultas por video transfronterizas, estoy LIMITADO a:

✅ Revisar registros médicos e historial del paciente para contexto
✅ Explicar procedimientos y tratamientos disponibles en mi país
✅ Discutir costos, logística y expectativas de recuperación
✅ Responder preguntas generales sobre mi experiencia y práctica
✅ Proporcionar evaluaciones preliminares de candidatura para procedimientos
✅ Ayudar a pacientes a planificar posibles viajes para atención presencial

ENTIENDO que durante las consultas transfronterizas, NO DEBO:

❌ Diagnosticar condiciones médicas bajo las leyes locales del paciente
❌ Recetar medicamentos a pacientes en otros países
❌ Ordenar pruebas o procedimientos en la ubicación del paciente
❌ Proporcionar planes de tratamiento definitivos sin examen presencial
❌ Representar que tengo licencia en la jurisdicción del paciente (a menos que esté verificado)
❌ Ejercer medicina bajo leyes de jurisdicciones donde no tengo licencia

RECONOZCO que:

• Violar estas restricciones puede resultar en remoción de la red
• Soy responsable de entender las leyes en mi jurisdicción de licencia
• Los pacientes son informados de estas limitaciones antes de consultarme
• La atención médica real debe ocurrir presencialmente en mi jurisdicción con licencia`,
    },
    {
      sectionId: 'licensing_credentials',
      title: '3. Licencias y Verificación de Credenciales',
      summary:
        'Sus credenciales serán verificadas; debe mantener licencias válidas y reportar cambios.',
      body: `RECONOZCO que:

• Medikah verificará mis credenciales médicas como parte de la membresía
• La verificación puede incluir contactar juntas de licencias e instituciones
• Soy responsable de proporcionar información de credenciales precisa
• Información de credenciales falsa o engañosa resultará en remoción y puede ser reportada

ACEPTO:

• Mantener licencias médicas activas en buen estado
• Notificar a Medikah dentro de 7 días de cualquier cambio en el estado de mi licencia
• Notificar a Medikah de cualquier acción disciplinaria, investigación o reclamo de mala praxis
• Actualizar mi perfil si mi práctica, especialidades o afiliaciones cambian
• Cooperar con re-verificación periódica de credenciales

ENTIENDO que:

• Mi estado de verificación se mostrará a los pacientes
• Medikah puede suspender mi acceso pendiente verificación de credenciales
• La membresía en la red no constituye licencia en ninguna jurisdicción
• Permanezco sujeto a supervisión de mi propia jurisdicción de licencia`,
    },
    {
      sectionId: 'professional_conduct',
      title: '4. Estándares de Conducta Profesional',
      summary:
        'Acepta mantener estándares profesionales y tratar a todos los pacientes con respeto.',
      body: `ACEPTO mantener conducta profesional incluyendo:

Comunicación:
• Responder a consultas de pacientes en plazos razonables
• Comunicarme claramente, especialmente a través de barreras de idioma
• Ser honesto sobre mis calificaciones, experiencia y limitaciones
• Proporcionar información precisa sobre procedimientos y resultados esperados

Profesionalismo:
• Tratar a todos los pacientes con dignidad y respeto sin importar su origen
• Mantener límites profesionales apropiados
• Vestir profesionalmente durante consultas por video
• Asegurar que las consultas ocurran en entornos privados y clínicos

Ética:
• No aceptar pacientes para procedimientos para los que no son candidatos
• Revelar conflictos de interés relevantes
• No hacer afirmaciones exageradas sobre resultados
• Referir pacientes a otros especialistas cuando sea apropiado

ENTIENDO que la conducta no profesional puede resultar en:
• Advertencias o suspensión temporal de la red
• Remoción permanente de la red
• Reportes a autoridades de licencias si está justificado`,
    },
    {
      sectionId: 'liability_malpractice',
      title: '5. Responsabilidad y Cobertura de Mala Praxis',
      summary:
        'Mantiene responsabilidad por sus acciones profesionales y seguro apropiado.',
      body: `ENTIENDO que:

• Soy un contratista independiente, no empleado de Medikah
• Medikah es una plataforma tecnológica, no un proveedor de salud
• Soy el único responsable de mis acciones y consejos profesionales
• Medikah no proporciona seguro de mala praxis para mi práctica

RECONOZCO que:

• Mi seguro de mala praxis puede no cubrir consultas transfronterizas
• Debo consultar con mi aseguradora sobre cobertura para consultas informativas
• La responsabilidad por cualquier consejo que proporcione recae en mí, no en Medikah
• Los pacientes son informados de que Medikah no es responsable de mis acciones profesionales

ACEPTO:

• Mantener seguro de responsabilidad profesional apropiado en mi jurisdicción
• Informar a Medikah si mi cobertura de mala praxis cambia o es cancelada
• Indemnizar y eximir de responsabilidad a Medikah de reclamos derivados de mis acciones
• No tergiversar el rol o responsabilidad de Medikah a los pacientes

ENTIENDO que:

• La naturaleza solo informativa de las consultas limita pero no elimina la responsabilidad
• Debo documentar las consultas cuidadosamente
• Diferentes países tienen diferentes estándares de mala praxis y plazos de prescripción`,
    },
    {
      sectionId: 'patient_rights',
      title: '6. Derechos del Paciente y Consentimiento Informado',
      summary:
        'Los pacientes deben entender las limitaciones de la consulta; usted apoya la toma de decisiones informada.',
      body: `ENTIENDO que los pacientes que me consultan tienen derechos que incluyen:

• Ser informados de que no tengo licencia en su jurisdicción
• Entender que las consultas son solo informativas
• Recibir información honesta sobre procedimientos y riesgos
• Rechazar consulta o tratamiento en cualquier momento
• Que se respete su privacidad y se protejan sus datos

ACEPTO:

• Asegurar que los pacientes entiendan las limitaciones de las consultas transfronterizas
• No presionar a los pacientes hacia procedimientos sobre los que tienen incertidumbre
• Proporcionar información balanceada sobre riesgos y beneficios
• Respetar las decisiones de los pacientes aunque no esté de acuerdo
• Reportar cualquier preocupación sobre seguridad del paciente a Medikah

RECONOZCO que:

• Los pacientes firman su propio formulario de reconocimiento antes de consultarme
• Debo verificar la comprensión del paciente al inicio de las consultas
• Los pacientes vulnerables pueden necesitar salvaguardas adicionales
• Las decisiones finales de tratamiento requieren examen presencial`,
    },
    {
      sectionId: 'data_privacy',
      title: '7. Privacidad de Datos y Confidencialidad',
      summary:
        'Acepta proteger los datos del paciente y cumplir con las leyes de privacidad aplicables.',
      body: `ENTIENDO que:

• La información de salud del paciente cruza fronteras internacionales a través de esta plataforma
• Diferentes leyes de privacidad aplican en diferentes países (HIPAA, GDPR, ley mexicana, etc.)
• Soy responsable de entender las leyes de privacidad en mi jurisdicción
• Las brechas de datos deben reportarse a Medikah inmediatamente

ACEPTO:

• Tratar toda la información del paciente como confidencial
• Solo acceder a datos del paciente para propósitos legítimos de consulta
• No compartir información del paciente con partes no autorizadas
• Usar métodos de comunicación seguros proporcionados por la plataforma
• Seguir los requisitos de retención de registros médicos de mi jurisdicción

RECONOZCO que:

• Los registros de consulta son almacenados por Medikah según su Política de Privacidad
• Puedo solicitar acceso a mis registros de consulta
• Los pacientes pueden solicitar sus registros de consulta
• Medikah puede acceder a registros de consulta para aseguramiento de calidad y resolución de disputas`,
    },
    {
      sectionId: 'platform_usage',
      title: '8. Uso de la Plataforma y Tecnología',
      summary:
        'Acepta usar la plataforma apropiadamente y entiende las limitaciones tecnológicas.',
      body: `ACEPTO:

• Usar solo las herramientas de comunicación proporcionadas por Medikah para consultas
• No eludir la plataforma para contactar pacientes directamente
• Mantener mis credenciales de cuenta seguras
• Reportar cualquier preocupación de seguridad o actividad sospechosa
• Mantener conectividad a internet adecuada para consultas por video

ENTIENDO que:

• La tecnología puede fallar — las llamadas pueden cortarse, la calidad de video puede variar
• Debo tener planes de comunicación de respaldo para pacientes
• La plataforma no está monitoreada 24/7 para emergencias
• No debo usar la plataforma para situaciones médicas de emergencia

RECONOZCO que:

• Medikah puede actualizar la plataforma y sus funciones
• Recibiré capacitación sobre funciones de la plataforma según sea necesario
• Mi uso de la plataforma puede ser monitoreado para aseguramiento de calidad
• El mal uso de la plataforma puede resultar en suspensión de cuenta`,
    },
    {
      sectionId: 'recording_consent',
      title: '9. Grabación de Consultas',
      summary:
        'Las consultas pueden grabarse con consentimiento mutuo para calidad y protección.',
      body: `ENTIENDO que:

• Las consultas por video pueden ser grabadas con el consentimiento apropiado
• Las grabaciones sirven para aseguramiento de calidad, capacitación y resolución de disputas
• Los pacientes deben consentir la grabación antes de que ocurra
• Tengo el derecho de rechazar la grabación de mis consultas

Los propósitos de grabación incluyen:
• Aseguramiento y mejora de calidad
• Resolución de disputas si surgen quejas
• Propósitos de capacitación y educación (con consentimiento)
• Protección legal para todas las partes

Si consiento la grabación:
• Las grabaciones son encriptadas y almacenadas de forma segura
• El acceso está limitado a personal autorizado de Medikah
• Las grabaciones están sujetas a la Política de Privacidad
• Los períodos de retención cumplen con las leyes aplicables

Indicaré mi preferencia de consentimiento de grabación a continuación.`,
      hasRecordingConsent: true,
    },
    {
      sectionId: 'compensation_billing',
      title: '10. Compensación y Facturación',
      summary:
        'Entienda cómo se compensan las consultas y sus responsabilidades de facturación.',
      body: `ENTIENDO que:

• Las tarifas de consulta son establecidas por Medikah con aportes de médicos de la red
• Medikah procesa los pagos de los pacientes
• Recibiré compensación según los términos acordados por separado
• Las obligaciones fiscales por ingresos son mi responsabilidad

ACEPTO:

• No solicitar pago directo de pacientes fuera de la plataforma
• Proporcionar información de facturación precisa a Medikah
• Reportar cualquier discrepancia de pago prontamente
• Cumplir con las leyes fiscales en mi jurisdicción

RECONOZCO que:

• Las tarifas de consulta pueden variar por especialidad y tipo de servicio
• Medikah retiene una tarifa de plataforma de cada consulta
• Los términos de pago se detallan en acuerdos de compensación separados
• Las disputas sobre pagos deben dirigirse a Medikah`,
    },
    {
      sectionId: 'video_conferencing',
      title: '11. Estándares de Videoconferencia',
      summary:
        'Mantener estándares profesionales durante consultas por video con pacientes.',
      body: `ACEPTO mantener estándares apropiados durante consultas por video:

Ambiente:
• Realizar consultas en un entorno privado y clínico
• Asegurar iluminación adecuada y fondo profesional
• Minimizar ruido de fondo e interrupciones
• Tener registros médicos y herramientas necesarios accesibles

Técnico:
• Probar audio y video antes de las consultas
• Tener conexión de internet o teléfono de respaldo disponible
• Saber cómo usar las funciones de la plataforma (compartir pantalla, chat, etc.)
• Iniciar las consultas a tiempo

Clínico:
• Revisar materiales del paciente antes de la consulta
• Tomar notas apropiadas durante la consulta
• Resumir puntos clave al final de las consultas
• Proporcionar próximos pasos claros para los pacientes

ENTIENDO que:

• Las primeras impresiones importan para la confianza del paciente
• Las dificultades técnicas deben manejarse profesionalmente
• Los pacientes pueden estar ansiosos por consultar a través de fronteras
• La comunicación clara es esencial a través de culturas e idiomas`,
    },
    {
      sectionId: 'termination',
      title: '12. Terminación y Retiro',
      summary:
        'Entienda cómo puede terminar la membresía en la red y sus obligaciones al terminar.',
      body: `ENTIENDO que mi membresía en la red puede ser terminada:

Por Mí:
• Puedo retirarme de la red en cualquier momento con 30 días de aviso
• Debo completar las consultas pendientes antes de retirarme
• Debo informar a Medikah de mi retiro por escrito

Por Medikah:
• Por violación de este acuerdo o estándares profesionales
• Por pérdida o suspensión de licencia médica
• Por conducta no profesional o quejas de pacientes
• Por fallo en mantener información de credenciales precisa
• Por inactividad extendida (con aviso previo)

Al Terminar:
• Completaré cualquier consulta programada o transferiré la atención
• Mi acceso a la plataforma será desactivado
• Los registros de pacientes permanecen con Medikah según su política de retención
• No puedo contactar pacientes directamente después de la terminación
• La compensación por consultas completadas aún será pagada

RECONOZCO que:
• Las decisiones de terminación por Medikah son a su discreción
• Puedo apelar decisiones de terminación a través del proceso de Medikah
• Ciertas terminaciones pueden ser reportadas a autoridades de licencias`,
    },
    {
      sectionId: 'dispute_resolution',
      title: '13. Resolución de Disputas',
      summary:
        'Entienda cómo se manejarán las disputas y quejas.',
      body: `ENTIENDO que:

Quejas de Pacientes:
• Los pacientes pueden presentar quejas sobre consultas
• Medikah me notificará de quejas y buscará mi respuesta
• Acepto cooperar con investigaciones de quejas
• Las quejas no resueltas pueden resultar en acción disciplinaria

Disputas con Medikah:
• Las disputas deben primero plantearse con el soporte de Medikah
• Las disputas no resueltas pueden proceder a mediación
• El arbitraje vinculante puede aplicar según términos separados
• La ley aplicable y jurisdicción se especifican en los Términos de Servicio

ACEPTO:

• Responder a quejas dentro de 5 días hábiles
• Proporcionar documentación solicitada durante investigaciones
• Participar de buena fe en la resolución de disputas
• No tomar represalias contra pacientes que presenten quejas

RECONOZCO que:
• Algunas disputas pueden necesitar ser reportadas a autoridades de licencias
• Medikah puede compartir información con autoridades si lo requiere la ley
• Debo mantener mis propios registros de consultas para protección`,
    },
    {
      sectionId: 'future_services',
      title: '14. Servicios Futuros y Actualizaciones',
      summary:
        'La red puede expandirse con nuevas funciones y servicios con el tiempo.',
      body: `ENTIENDO que:

• Medikah puede introducir nuevas funciones y servicios
• Los términos de la red pueden actualizarse con aviso razonable
• Seré notificado de cambios materiales a este acuerdo
• La participación continua después de los cambios indica aceptación

Los servicios futuros pueden incluir:
• Tipos de consulta y especialidades expandidos
• Servicios de coordinación de atención presencial
• Oportunidades de educación médica continua
• Servicios mejorados de acreditación y verificación
• Herramientas de gestión de pacientes y programación

ACEPTO:

• Revisar actualizaciones de términos de la red cuando sea notificado
• Proporcionar retroalimentación sobre nuevas funciones y servicios
• Participar en capacitación para nuevas funciones de la plataforma
• Retirarme si ya no estoy de acuerdo con los términos actualizados

RECONOZCO que:
• Los nuevos servicios pueden tener términos y requisitos adicionales
• La participación en nuevos servicios es voluntaria
• La retroalimentación ayuda a mejorar la red para todos los médicos`,
    },
    {
      sectionId: 'acknowledgment',
      title: '15. Reconocimiento Final',
      summary:
        'Confirme que ha leído, entendido y acepta este Acuerdo de Red de Médicos.',
      body: `CONFIRMO que:

• He leído y entendido todas las secciones de este acuerdo
• He tenido la oportunidad de hacer preguntas
• Me estoy uniendo a la red voluntariamente
• Cumplo con los requisitos de elegibilidad para membresía en la red
• La información que proporcioné durante el registro es precisa

ENTIENDO que:

• Este acuerdo es vinculante tras la aceptación
• La violación puede resultar en terminación y otras consecuencias
• Debo guardar una copia de este acuerdo para mis registros
• Puedo contactar a Medikah con preguntas: physicians@medikah.health

RECONOZCO que:

• Al completar el registro, estoy aceptando estos términos
• Este acuerdo complementa (no reemplaza) los Términos de Servicio de Medikah
• Soy responsable de mantenerme informado de actualizaciones de la red
• Mi participación ayuda a construir infraestructura de salud transfronteriza

Información de Contacto:
• Soporte para Médicos: physicians@medikah.health
• Acreditación: credentials@medikah.health
• Preguntas Legales: legal@medikah.health`,
    },
  ],
};
