import { SupportedLang } from './i18n';

export const CONSENT_FORM_VERSION = '1.0';

export interface ConsentSection {
  checkboxId: string;
  title: string;
  summary: string;
  body: string;
  /** Section 14 has recording consent with Yes/No radio instead of checkbox */
  hasRecordingConsent?: boolean;
}

export interface ConsentUICopy {
  modalTitle: string;
  progressLabel: (current: number, total: number) => string;
  languageToggleLabel: string;
  agreeButton: string;
  sectionOf: string;
  recordingYes: string;
  recordingNo: string;
  importantNotice: string;
}

export const consentUICopy: Record<SupportedLang, ConsentUICopy> = {
  en: {
    modalTitle: 'Cross-Border Consultation Acknowledgment',
    progressLabel: (current, total) => `Section ${current} of ${total}`,
    languageToggleLabel: 'Idioma / Language',
    agreeButton: 'I Agree & Continue',
    sectionOf: 'of',
    recordingYes: 'Yes, I consent to recording',
    recordingNo: 'No, I do not consent to recording',
    importantNotice:
      'This form must be read, understood, and acknowledged before participating in any video consultation with a healthcare provider licensed in a different country than where you are located.',
  },
  es: {
    modalTitle: 'Reconocimiento de Consulta Transfronteriza',
    progressLabel: (current, total) => `Sección ${current} de ${total}`,
    languageToggleLabel: 'Idioma / Language',
    agreeButton: 'Acepto y Continuar',
    sectionOf: 'de',
    recordingYes: 'Sí, consiento la grabación',
    recordingNo: 'No, no consiento la grabación',
    importantNotice:
      'Este formulario debe ser leído, comprendido y reconocido antes de participar en cualquier consulta por video con un proveedor de salud con licencia en un país diferente al de su ubicación.',
  },
};

export const consentSections: Record<SupportedLang, ConsentSection[]> = {
  en: [
    {
      checkboxId: 'provider_licensing',
      title: '1. Provider Licensing and Authority',
      summary:
        'The provider is licensed in their country, not yours, and cannot practice medicine under your local laws.',
      body: `I UNDERSTAND that the healthcare provider I am consulting with is:

• Licensed to practice medicine in their jurisdiction
• NOT licensed to practice medicine in my current location (unless specifically verified otherwise)
• Subject to medical regulations and oversight in their licensing jurisdiction, not mine
• Not subject to medical board oversight in my location

I UNDERSTAND that:

• This provider cannot legally diagnose, treat, or prescribe medications under the laws of my location
• The provider is not authorized to practice medicine where I am located
• State/national medical boards in my location do not regulate this provider
• Malpractice insurance held by the provider may not cover care provided to me`,
    },
    {
      checkboxId: 'informational_only',
      title: '2. Purpose of Consultation — Informational Only',
      summary:
        'This consultation is for informational and planning purposes only, not medical treatment.',
      body: `I UNDERSTAND this consultation is for INFORMATIONAL and PLANNING purposes only, NOT for medical treatment.

During this consultation, the provider MAY:
✅ Review my existing medical records and health history
✅ Explain medical procedures available in their country
✅ Discuss costs, recovery time, and logistics of potential treatment
✅ Answer general questions about procedures and treatments
✅ Provide preliminary assessment of whether I may be a candidate
✅ Help me plan a potential trip for in-person medical care

During this consultation, the provider MAY NOT:
❌ Diagnose new medical conditions
❌ Prescribe medications (including controlled substances)
❌ Order medical tests or procedures in my location
❌ Provide definitive treatment plans
❌ Make final medical decisions without in-person examination
❌ Practice medicine under the laws of my location

I UNDERSTAND that:
• This is NOT a telemedicine treatment visit
• This is NOT a substitute for care from a locally-licensed provider
• Any actual medical diagnosis and treatment must occur in-person
• Final medical decisions require in-person examination in the provider's country`,
    },
    {
      checkboxId: 'medical_tourism',
      title: '3. Medical Tourism Context',
      summary:
        'This consultation relates to potential travel abroad for medical care, with inherent risks.',
      body: `I UNDERSTAND that this consultation is in the context of medical tourism, which means:

• I am considering traveling to another country for medical care
• The purpose of this consultation is to help me make an informed decision about traveling for care
• Actual medical treatment would occur in the provider's country, not mine
• I would need to travel to receive any recommended medical procedures or treatments

I UNDERSTAND that medical tourism involves risks including:

• Different medical standards and practices in different countries
• Different regulatory oversight and patient protections
• Language and cultural differences in healthcare delivery
• Challenges in obtaining follow-up care after returning home
• Legal and practical difficulties if complications occur
• Potential lack of legal recourse if things go wrong`,
    },
    {
      checkboxId: 'legal_systems',
      title: '4. Different Legal Systems and Protections',
      summary:
        'Medical care abroad is governed by different laws; your home country protections may not apply.',
      body: `I UNDERSTAND that medical care in another country is subject to different legal systems:

Legal Differences:
• Medical malpractice laws differ by country
• Patient rights and protections vary by jurisdiction
• Medical board oversight and complaint procedures differ
• Standards of care are not uniform internationally
• Dispute resolution may be complex across borders

Limited Legal Protections:
• My home country's medical malpractice laws may not apply
• Legal remedies may be limited or unavailable
• Enforcement of judgments across borders may be difficult or impossible
• I may have limited recourse if I experience harm or dissatisfaction

I UNDERSTAND that:
• Medikah is not responsible for enforcing medical standards in other countries
• Medikah cannot guarantee the quality or safety of care in other countries
• Medikah is not liable for medical outcomes resulting from care received abroad`,
    },
    {
      checkboxId: 'my_responsibilities',
      title: '5. My Responsibilities',
      summary:
        'I am responsible for due diligence, medical preparation, legal compliance, and financial planning.',
      body: `I ACKNOWLEDGE that I am responsible for:

Due Diligence:
• Researching the healthcare provider's credentials and qualifications
• Verifying the provider's license status in their jurisdiction
• Checking the accreditation of healthcare facilities
• Reading reviews and seeking references
• Asking questions about the provider's experience and outcomes

Medical Preparation:
• Obtaining complete copies of my medical records
• Consulting with my local doctor about my plans
• Getting second opinions if I have concerns
• Understanding the risks and benefits of proposed treatments
• Ensuring I am medically fit to travel

Legal and Regulatory:
• Understanding the laws and regulations in the destination country
• Complying with all applicable laws in both countries
• Obtaining necessary travel documents and authorizations

Financial:
• Understanding all costs involved (medical, travel, accommodation)
• Arranging payment in the appropriate currency
• Confirming whether my insurance covers international care (often it doesn't)
• Budgeting for potential complications and follow-up care

Informed Decision-Making:
• Making my own informed, voluntary decision about traveling for care
• Not relying solely on this consultation for medical decision-making
• Seeking additional information and opinions as needed
• Understanding that I am ultimately responsible for my healthcare decisions`,
    },
    {
      checkboxId: 'data_privacy',
      title: '6. Data and Privacy',
      summary:
        'My health information will cross borders and is subject to different privacy laws.',
      body: `I UNDERSTAND that:
• My health information will be transmitted across international borders
• Different privacy laws apply in different countries
• The provider will have access to my medical records
• Data may be stored in multiple countries
• I should review Medikah's Privacy Policy regarding cross-border data transfers

I CONSENT to:
• Cross-border transmission of my health information for this consultation
• The provider accessing my medical records for informational purposes
• Storage of consultation records in accordance with Medikah's Privacy Policy`,
    },
    {
      checkboxId: 'provider_restrictions',
      title: '7. Provider Restrictions',
      summary:
        'The provider has agreed not to diagnose, prescribe, or treat during this call.',
      body: `I UNDERSTAND that the healthcare provider has agreed to restrictions during this consultation:

• The provider will NOT diagnose medical conditions under my local laws
• The provider will NOT prescribe medications to me
• The provider will NOT order tests or procedures in my location
• The provider will NOT provide definitive treatment plans during this video call
• The provider will limit the consultation to informational and planning purposes

I UNDERSTAND that if the provider violates these restrictions:
• The provider, not Medikah, is responsible for any consequences
• I should report violations to Medikah immediately
• Medikah may terminate the provider's access to the platform`,
    },
    {
      checkboxId: 'emergency',
      title: '8. Emergency Situations',
      summary:
        'This consultation cannot address emergencies — call local emergency services if needed.',
      body: `I UNDERSTAND that:
• This consultation cannot address medical emergencies
• I should NOT use this consultation for urgent medical needs
• In a medical emergency, I will call local emergency services (911 in US/Mexico)
• Medikah's platform is not monitored 24/7 for emergencies

I AGREE that:
• I will seek appropriate local emergency care if needed
• I will not delay emergency care to wait for this consultation
• I will inform the provider if I have an urgent medical situation`,
    },
    {
      checkboxId: 'platform_technology',
      title: '9. Platform and Technology',
      summary:
        'Medikah is a technology platform, not a healthcare provider; technology can fail.',
      body: `I UNDERSTAND that:
• Medikah is a technology platform, not a healthcare provider
• Medikah provides the video conferencing software but not the medical care
• The healthcare provider is an independent contractor, not employed by Medikah
• Medikah is not responsible for the medical content of the consultation

I UNDERSTAND that technology can fail:
• Video quality may vary based on internet connection
• Calls may disconnect unexpectedly
• Platform features may not work perfectly
• I should have a backup plan for communication with the provider`,
    },
    {
      checkboxId: 'no_guarantees',
      title: '10. No Guarantees or Warranties',
      summary:
        'No medical outcome is guaranteed; results vary and complications can occur.',
      body: `I UNDERSTAND that:
• Neither Medikah nor the provider guarantees any medical outcome
• Results of medical treatment vary and cannot be predicted with certainty
• Complications can occur even with the best medical care
• I accept the inherent uncertainties of medical treatment

I UNDERSTAND that Medikah makes no warranties about:
• The qualifications or competence of healthcare providers beyond basic license verification
• The quality or safety of medical care in other countries
• The suitability of cross-border healthcare for my specific situation
• The success or outcome of any medical treatment`,
    },
    {
      checkboxId: 'liability',
      title: '11. Liability and Indemnification',
      summary:
        'Medikah is not liable for provider actions; I participate voluntarily and accept associated risks.',
      body: `I UNDERSTAND that:
• Medikah is not liable for medical malpractice by healthcare providers
• The healthcare provider is responsible for their own professional actions
• I am choosing to participate in this consultation voluntarily
• I accept the risks associated with cross-border healthcare consultations

I AGREE to indemnify and hold Medikah harmless from:
• Claims arising from my decision to consult with this provider
• Claims arising from medical care I receive in another country
• Claims arising from my travel for medical care
• Any consequences of my voluntary participation in cross-border healthcare`,
    },
    {
      checkboxId: 'additional_warnings',
      title: '12. Additional Warnings and Advisories',
      summary:
        'Specific risks regarding medications, follow-up care, insurance coverage, and communication.',
      body: `I ACKNOWLEDGE the following specific risks:

Prescription Medications:
• Medications approved in one country may not be approved in another
• Medication names and formulations may differ internationally
• I may not be able to obtain prescribed medications in my home country
• Medication interactions and side effects may not be well-documented across countries

Follow-Up Care:
• I may have difficulty obtaining follow-up care in my home country
• Local doctors may be unfamiliar with treatments received abroad
• Medical records from abroad may not be easily accessible
• I may need to return to the original country for complications

Insurance Coverage:
• My health insurance likely does NOT cover medical tourism
• I will probably pay out-of-pocket for all costs
• Insurance claims for complications may be denied
• I should verify coverage with my insurer before proceeding

Language and Communication:
• Despite translation services, miscommunication can occur
• Medical terminology may not translate perfectly
• Cultural differences in healthcare communication exist
• I should ask for clarification if I don't fully understand`,
    },
    {
      checkboxId: 'right_to_decline',
      title: '13. Right to Decline or Terminate',
      summary:
        'I can decline or end this consultation at any time without penalty.',
      body: `I UNDERSTAND that:
• I have the right to decline this consultation at any time
• I can terminate the consultation if I become uncomfortable
• I can choose not to travel for medical care after the consultation
• Declining or terminating does not affect my rights to use Medikah's platform

I UNDERSTAND that I should terminate the consultation immediately if:
• The provider attempts to diagnose or prescribe during the call
• The provider makes claims about being licensed in my location (when they're not)
• I feel the provider is misrepresenting their qualifications
• I become uncomfortable for any reason`,
    },
    {
      checkboxId: 'recording',
      title: '14. Consultation Recording and Documentation',
      summary:
        'The consultation may be recorded with my explicit consent; records are stored securely.',
      body: `I UNDERSTAND that:
• This consultation may be recorded (with my explicit consent)
• Chat messages and documents shared are stored securely
• Records are maintained per Medikah's Privacy Policy
• I can request copies of my consultation records

If consenting to recording, I understand:
• The recording will be encrypted and stored securely
• The recording may be accessed by the provider and Medikah (for platform operations only)
• The recording is subject to the Privacy Policy
• I can request deletion of the recording (subject to legal retention requirements)`,
      hasRecordingConsent: true,
    },
    {
      checkboxId: 'questions_assistance',
      title: '15. Questions and Assistance',
      summary:
        'I have had the opportunity to ask questions and know how to contact Medikah for support.',
      body: `I CONFIRM that:
• I have had the opportunity to ask questions about this consultation
• I have received satisfactory answers to my questions
• I know how to contact Medikah if I have concerns: support@medikahhealth.com
• I know how to report problems or violations: legal@medikahhealth.com

I UNDERSTAND that I can contact:
• Medikah Support: support@medikahhealth.com (platform and account questions)
• Medikah Legal: legal@medikahhealth.com (violations or legal concerns)
• Medikah Privacy: privacy@medikahhealth.com (privacy and data questions)`,
    },
  ],
  es: [
    {
      checkboxId: 'provider_licensing',
      title: '1. Licencia y Autoridad del Proveedor',
      summary:
        'El proveedor tiene licencia en su país, no en el suyo, y no puede ejercer la medicina bajo sus leyes locales.',
      body: `ENTIENDO que el proveedor de salud con quien estoy consultando:

• Tiene licencia para ejercer la medicina en su jurisdicción
• NO tiene licencia para ejercer la medicina en mi ubicación actual (a menos que se verifique específicamente lo contrario)
• Está sujeto a regulaciones y supervisión médica en su jurisdicción de licencia, no en la mía
• No está sujeto a la supervisión de la junta médica de mi ubicación

ENTIENDO que:
• Este proveedor no puede legalmente diagnosticar, tratar ni recetar medicamentos bajo las leyes de mi ubicación
• El proveedor no está autorizado para ejercer la medicina donde me encuentro
• Las juntas médicas estatales/nacionales de mi ubicación no regulan a este proveedor
• El seguro de mala praxis del proveedor puede no cubrir la atención proporcionada a mí`,
    },
    {
      checkboxId: 'informational_only',
      title: '2. Propósito de la Consulta — Solo Informativo',
      summary:
        'Esta consulta es solo con fines informativos y de planificación, no un tratamiento médico.',
      body: `ENTIENDO que esta consulta es SOLO con fines INFORMATIVOS y de PLANIFICACIÓN, NO para tratamiento médico.

Durante esta consulta, el proveedor PUEDE:
✅ Revisar mis registros médicos e historial de salud existentes
✅ Explicar procedimientos médicos disponibles en su país
✅ Discutir costos, tiempo de recuperación y logística del tratamiento potencial
✅ Responder preguntas generales sobre procedimientos y tratamientos
✅ Proporcionar una evaluación preliminar de si puedo ser candidato
✅ Ayudarme a planificar un posible viaje para atención médica presencial

Durante esta consulta, el proveedor NO PUEDE:
❌ Diagnosticar nuevas condiciones médicas
❌ Recetar medicamentos (incluidas sustancias controladas)
❌ Ordenar pruebas o procedimientos médicos en mi ubicación
❌ Proporcionar planes de tratamiento definitivos
❌ Tomar decisiones médicas finales sin examen presencial
❌ Ejercer la medicina bajo las leyes de mi ubicación

ENTIENDO que:
• Esto NO es una visita de tratamiento de telemedicina
• Esto NO es un sustituto de la atención de un proveedor con licencia local
• Cualquier diagnóstico y tratamiento médico real debe ocurrir en persona
• Las decisiones médicas finales requieren examen presencial en el país del proveedor`,
    },
    {
      checkboxId: 'medical_tourism',
      title: '3. Contexto de Turismo Médico',
      summary:
        'Esta consulta se relaciona con un posible viaje al extranjero para atención médica, con riesgos inherentes.',
      body: `ENTIENDO que esta consulta es en el contexto de turismo médico, lo que significa:

• Estoy considerando viajar a otro país para recibir atención médica
• El propósito de esta consulta es ayudarme a tomar una decisión informada sobre viajar para recibir atención
• El tratamiento médico real ocurriría en el país del proveedor, no en el mío
• Necesitaría viajar para recibir cualquier procedimiento o tratamiento médico recomendado

ENTIENDO que el turismo médico involucra riesgos que incluyen:
• Diferentes estándares y prácticas médicas en diferentes países
• Diferente supervisión regulatoria y protecciones al paciente
• Diferencias de idioma y cultura en la prestación de atención médica
• Dificultades para obtener atención de seguimiento al regresar a casa
• Dificultades legales y prácticas si ocurren complicaciones
• Posible falta de recurso legal si las cosas salen mal`,
    },
    {
      checkboxId: 'legal_systems',
      title: '4. Diferentes Sistemas Legales y Protecciones',
      summary:
        'La atención médica en el extranjero se rige por leyes diferentes; las protecciones de su país pueden no aplicar.',
      body: `ENTIENDO que la atención médica en otro país está sujeta a diferentes sistemas legales:

Diferencias Legales:
• Las leyes de mala praxis médica difieren según el país
• Los derechos y protecciones del paciente varían según la jurisdicción
• La supervisión de la junta médica y los procedimientos de queja difieren
• Los estándares de atención no son uniformes internacionalmente
• La resolución de disputas puede ser compleja entre fronteras

Protecciones Legales Limitadas:
• Las leyes de mala praxis médica de mi país pueden no aplicar
• Los recursos legales pueden ser limitados o no estar disponibles
• La ejecución de sentencias entre fronteras puede ser difícil o imposible
• Puedo tener recurso limitado si experimento daño o insatisfacción

ENTIENDO que:
• Medikah no es responsable de hacer cumplir los estándares médicos en otros países
• Medikah no puede garantizar la calidad o seguridad de la atención en otros países
• Medikah no es responsable de los resultados médicos derivados de la atención recibida en el extranjero`,
    },
    {
      checkboxId: 'my_responsibilities',
      title: '5. Mis Responsabilidades',
      summary:
        'Soy responsable de la debida diligencia, preparación médica, cumplimiento legal y planificación financiera.',
      body: `RECONOZCO que soy responsable de:

Debida Diligencia:
• Investigar las credenciales y calificaciones del proveedor de salud
• Verificar el estado de licencia del proveedor en su jurisdicción
• Verificar la acreditación de las instalaciones de salud
• Leer reseñas y buscar referencias
• Hacer preguntas sobre la experiencia y resultados del proveedor

Preparación Médica:
• Obtener copias completas de mis registros médicos
• Consultar con mi médico local sobre mis planes
• Obtener segundas opiniones si tengo dudas
• Comprender los riesgos y beneficios de los tratamientos propuestos
• Asegurarme de estar médicamente apto para viajar

Legal y Regulatorio:
• Comprender las leyes y regulaciones del país de destino
• Cumplir con todas las leyes aplicables en ambos países
• Obtener los documentos de viaje y autorizaciones necesarios

Financiero:
• Comprender todos los costos involucrados (médicos, viaje, alojamiento)
• Organizar el pago en la moneda apropiada
• Confirmar si mi seguro cubre atención internacional (frecuentemente no lo hace)
• Presupuestar para posibles complicaciones y atención de seguimiento

Toma de Decisiones Informada:
• Tomar mi propia decisión informada y voluntaria sobre viajar para recibir atención
• No depender únicamente de esta consulta para la toma de decisiones médicas
• Buscar información y opiniones adicionales según sea necesario
• Comprender que soy responsable en última instancia de mis decisiones de salud`,
    },
    {
      checkboxId: 'data_privacy',
      title: '6. Datos y Privacidad',
      summary:
        'Mi información de salud cruzará fronteras y está sujeta a diferentes leyes de privacidad.',
      body: `ENTIENDO que:
• Mi información de salud será transmitida a través de fronteras internacionales
• Diferentes leyes de privacidad aplican en diferentes países
• El proveedor tendrá acceso a mis registros médicos
• Los datos pueden almacenarse en múltiples países
• Debo revisar la Política de Privacidad de Medikah respecto a transferencias de datos transfronterizas

CONSIENTO a:
• La transmisión transfronteriza de mi información de salud para esta consulta
• Que el proveedor acceda a mis registros médicos con fines informativos
• El almacenamiento de registros de consulta de acuerdo con la Política de Privacidad de Medikah`,
    },
    {
      checkboxId: 'provider_restrictions',
      title: '7. Restricciones del Proveedor',
      summary:
        'El proveedor ha acordado no diagnosticar, recetar ni tratar durante esta llamada.',
      body: `ENTIENDO que el proveedor de salud ha acordado restricciones durante esta consulta:

• El proveedor NO diagnosticará condiciones médicas bajo mis leyes locales
• El proveedor NO me recetará medicamentos
• El proveedor NO ordenará pruebas o procedimientos en mi ubicación
• El proveedor NO proporcionará planes de tratamiento definitivos durante esta videollamada
• El proveedor limitará la consulta a fines informativos y de planificación

ENTIENDO que si el proveedor viola estas restricciones:
• El proveedor, no Medikah, es responsable de las consecuencias
• Debo reportar las violaciones a Medikah inmediatamente
• Medikah puede terminar el acceso del proveedor a la plataforma`,
    },
    {
      checkboxId: 'emergency',
      title: '8. Situaciones de Emergencia',
      summary:
        'Esta consulta no puede atender emergencias — llame a servicios de emergencia locales si es necesario.',
      body: `ENTIENDO que:
• Esta consulta no puede atender emergencias médicas
• NO debo usar esta consulta para necesidades médicas urgentes
• En una emergencia médica, llamaré a los servicios de emergencia locales (911 en EE.UU./México)
• La plataforma de Medikah no está monitoreada 24/7 para emergencias

ACEPTO que:
• Buscaré atención de emergencia local apropiada si es necesario
• No retrasaré la atención de emergencia para esperar esta consulta
• Informaré al proveedor si tengo una situación médica urgente`,
    },
    {
      checkboxId: 'platform_technology',
      title: '9. Plataforma y Tecnología',
      summary:
        'Medikah es una plataforma tecnológica, no un proveedor de salud; la tecnología puede fallar.',
      body: `ENTIENDO que:
• Medikah es una plataforma tecnológica, no un proveedor de salud
• Medikah proporciona el software de videoconferencia pero no la atención médica
• El proveedor de salud es un contratista independiente, no empleado de Medikah
• Medikah no es responsable del contenido médico de la consulta

ENTIENDO que la tecnología puede fallar:
• La calidad del video puede variar según la conexión a internet
• Las llamadas pueden desconectarse inesperadamente
• Las funciones de la plataforma pueden no funcionar perfectamente
• Debo tener un plan alternativo para comunicarme con el proveedor`,
    },
    {
      checkboxId: 'no_guarantees',
      title: '10. Sin Garantías',
      summary:
        'No se garantiza ningún resultado médico; los resultados varían y pueden ocurrir complicaciones.',
      body: `ENTIENDO que:
• Ni Medikah ni el proveedor garantizan ningún resultado médico
• Los resultados del tratamiento médico varían y no pueden predecirse con certeza
• Las complicaciones pueden ocurrir incluso con la mejor atención médica
• Acepto las incertidumbres inherentes del tratamiento médico

ENTIENDO que Medikah no garantiza:
• Las calificaciones o competencia de los proveedores de salud más allá de la verificación básica de licencia
• La calidad o seguridad de la atención médica en otros países
• La idoneidad de la atención médica transfronteriza para mi situación específica
• El éxito o resultado de cualquier tratamiento médico`,
    },
    {
      checkboxId: 'liability',
      title: '11. Responsabilidad e Indemnización',
      summary:
        'Medikah no es responsable de las acciones del proveedor; participo voluntariamente y acepto los riesgos asociados.',
      body: `ENTIENDO que:
• Medikah no es responsable de la mala praxis médica por parte de los proveedores de salud
• El proveedor de salud es responsable de sus propias acciones profesionales
• Elijo participar en esta consulta voluntariamente
• Acepto los riesgos asociados con las consultas de salud transfronterizas

ACEPTO indemnizar y eximir de responsabilidad a Medikah de:
• Reclamaciones derivadas de mi decisión de consultar con este proveedor
• Reclamaciones derivadas de la atención médica que reciba en otro país
• Reclamaciones derivadas de mi viaje para atención médica
• Cualquier consecuencia de mi participación voluntaria en atención médica transfronteriza`,
    },
    {
      checkboxId: 'additional_warnings',
      title: '12. Advertencias y Avisos Adicionales',
      summary:
        'Riesgos específicos sobre medicamentos, atención de seguimiento, cobertura de seguro y comunicación.',
      body: `RECONOZCO los siguientes riesgos específicos:

Medicamentos Recetados:
• Los medicamentos aprobados en un país pueden no estar aprobados en otro
• Los nombres y formulaciones de medicamentos pueden diferir internacionalmente
• Puede que no pueda obtener medicamentos recetados en mi país
• Las interacciones y efectos secundarios pueden no estar bien documentados entre países

Atención de Seguimiento:
• Puedo tener dificultad para obtener atención de seguimiento en mi país
• Los médicos locales pueden no estar familiarizados con los tratamientos recibidos en el extranjero
• Los registros médicos del extranjero pueden no ser fácilmente accesibles
• Puede que necesite regresar al país original por complicaciones

Cobertura de Seguro:
• Mi seguro de salud probablemente NO cubre turismo médico
• Probablemente pagaré de mi bolsillo todos los costos
• Las reclamaciones de seguro por complicaciones pueden ser denegadas
• Debo verificar la cobertura con mi aseguradora antes de proceder

Idioma y Comunicación:
• A pesar de los servicios de traducción, pueden ocurrir malentendidos
• La terminología médica puede no traducirse perfectamente
• Existen diferencias culturales en la comunicación de salud
• Debo pedir aclaración si no entiendo completamente`,
    },
    {
      checkboxId: 'right_to_decline',
      title: '13. Derecho a Rechazar o Terminar',
      summary:
        'Puedo rechazar o terminar esta consulta en cualquier momento sin penalización.',
      body: `ENTIENDO que:
• Tengo el derecho de rechazar esta consulta en cualquier momento
• Puedo terminar la consulta si me siento incómodo
• Puedo elegir no viajar para atención médica después de la consulta
• Rechazar o terminar no afecta mis derechos de usar la plataforma de Medikah

ENTIENDO que debo terminar la consulta inmediatamente si:
• El proveedor intenta diagnosticar o recetar durante la llamada
• El proveedor hace afirmaciones sobre tener licencia en mi ubicación (cuando no la tiene)
• Siento que el proveedor está tergiversando sus calificaciones
• Me siento incómodo por cualquier razón`,
    },
    {
      checkboxId: 'recording',
      title: '14. Grabación y Documentación de la Consulta',
      summary:
        'La consulta puede ser grabada con mi consentimiento explícito; los registros se almacenan de forma segura.',
      body: `ENTIENDO que:
• Esta consulta puede ser grabada (con mi consentimiento explícito)
• Los mensajes de chat y documentos compartidos se almacenan de forma segura
• Los registros se mantienen según la Política de Privacidad de Medikah
• Puedo solicitar copias de mis registros de consulta

Si consiento la grabación, entiendo que:
• La grabación será encriptada y almacenada de forma segura
• La grabación puede ser accedida por el proveedor y Medikah (solo para operaciones de la plataforma)
• La grabación está sujeta a la Política de Privacidad
• Puedo solicitar la eliminación de la grabación (sujeto a requisitos legales de retención)`,
      hasRecordingConsent: true,
    },
    {
      checkboxId: 'questions_assistance',
      title: '15. Preguntas y Asistencia',
      summary:
        'He tenido la oportunidad de hacer preguntas y sé cómo contactar a Medikah para obtener soporte.',
      body: `CONFIRMO que:
• He tenido la oportunidad de hacer preguntas sobre esta consulta
• He recibido respuestas satisfactorias a mis preguntas
• Sé cómo contactar a Medikah si tengo inquietudes: support@medikahhealth.com
• Sé cómo reportar problemas o violaciones: legal@medikahhealth.com

ENTIENDO que puedo contactar:
• Soporte de Medikah: support@medikahhealth.com (preguntas sobre la plataforma y cuenta)
• Legal de Medikah: legal@medikahhealth.com (violaciones o inquietudes legales)
• Privacidad de Medikah: privacy@medikahhealth.com (preguntas sobre privacidad y datos)`,
    },
  ],
};
