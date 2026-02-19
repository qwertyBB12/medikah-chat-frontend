import { useState, useCallback } from 'react';
import { SupportedLang } from '../../../lib/i18n';
import { batchedFormLabels } from '../../../lib/physicianOnboardingContent';

export interface NarrativeFormData {
  firstConsultExpectation: string;
  communicationStyle: string;
  specialtyMotivation: string;
  careValues: string;
  originSentence: string;
  personalStatement: string;
  personalInterests: string;
}

interface BatchedNarrativeFormProps {
  lang: SupportedLang;
  onSubmit: (data: NarrativeFormData) => void;
  onCancel: () => void;
  initialData?: Partial<NarrativeFormData>;
}

const TEXTAREA_MAX = 500;
const ORIGIN_MAX = 200;

const COMMUNICATION_STYLES = [
  {
    value: 'thorough',
    en: 'Thorough',
    es: 'Minucioso',
    descEn: 'I take time to explain every detail and make sure patients fully understand their condition and options.',
    descEs: 'Me tomo el tiempo de explicar cada detalle y asegurarme de que los pacientes comprendan completamente su condición y opciones.',
  },
  {
    value: 'collaborative',
    en: 'Collaborative',
    es: 'Colaborativo',
    descEn: 'I involve patients as partners in their care decisions, discussing options together.',
    descEs: 'Involucro a los pacientes como socios en las decisiones de su atención, discutiendo opciones juntos.',
  },
  {
    value: 'direct',
    en: 'Direct',
    es: 'Directo',
    descEn: 'I communicate clearly and concisely, giving patients straightforward answers.',
    descEs: 'Me comunico de forma clara y concisa, dando a los pacientes respuestas directas.',
  },
  {
    value: 'reassuring',
    en: 'Reassuring',
    es: 'Tranquilizador',
    descEn: 'I prioritize making patients feel comfortable and supported throughout their care.',
    descEs: 'Priorizo que los pacientes se sientan cómodos y apoyados durante su atención.',
  },
];

export default function BatchedNarrativeForm({
  lang,
  onSubmit,
  onCancel,
  initialData,
}: BatchedNarrativeFormProps) {
  const labels = batchedFormLabels[lang];
  const isEs = lang === 'es';

  const [firstConsult, setFirstConsult] = useState(initialData?.firstConsultExpectation || '');
  const [commStyle, setCommStyle] = useState(initialData?.communicationStyle || '');
  const [specialtyMotivation, setSpecialtyMotivation] = useState(initialData?.specialtyMotivation || '');
  const [careValues, setCareValues] = useState(initialData?.careValues || '');
  const [originSentence, setOriginSentence] = useState(initialData?.originSentence || '');
  const [personalStatement, setPersonalStatement] = useState(initialData?.personalStatement || '');
  const [personalInterests, setPersonalInterests] = useState(initialData?.personalInterests || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!commStyle) {
      newErrors.commStyle = isEs
        ? 'Por favor seleccione un estilo de comunicación.'
        : 'Please select a communication style.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      firstConsultExpectation: firstConsult.trim(),
      communicationStyle: commStyle,
      specialtyMotivation: specialtyMotivation.trim(),
      careValues: careValues.trim(),
      originSentence: originSentence.trim(),
      personalStatement: personalStatement.trim(),
      personalInterests: personalInterests.trim(),
    });
  }, [firstConsult, commStyle, specialtyMotivation, careValues, originSentence, personalStatement, personalInterests, onSubmit, isEs]);

  return (
    <div className="bg-white border-l-4 border-clinical-teal rounded-[12px] shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] p-6 my-4">
      <h3 className="font-mulish font-bold text-lg text-deep-charcoal mb-1">
        {isEs ? 'Su Historia' : 'Your Story'}
      </h3>
      <p className="font-mulish text-sm text-body-slate mb-6">
        {isEs
          ? 'Estas preguntas nos ayudan a contar su historia de manera que los pacientes se conecten con usted como persona, no solo como médico. Responda con la naturalidad de una conversación.'
          : 'These questions help us tell your story in a way that connects patients with you as a person, not just a physician. Answer as naturally as you would in conversation.'}
      </p>

      {/* Q1: First Consultation */}
      <div className="mb-5">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
          {isEs
            ? 'Cuando un paciente llega a su consultorio por primera vez, ¿qué puede esperar?'
            : 'When a patient walks into your office for the first time, what can they expect?'}
        </label>
        <p className="font-mulish text-xs text-body-slate mb-2">
          {isEs ? labels.optional : labels.optional}
        </p>
        <textarea
          value={firstConsult}
          onChange={(e) => setFirstConsult(e.target.value.slice(0, TEXTAREA_MAX))}
          rows={3}
          placeholder={isEs
            ? 'Ej: Empiezo con una conversación para entender no solo los síntomas, sino cómo se siente el paciente...'
            : 'E.g., I start with a conversation to understand not just symptoms, but how the patient is feeling...'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal resize-none"
        />
        <p className="font-mulish text-xs text-body-slate text-right mt-1">
          {firstConsult.length}/{TEXTAREA_MAX}
        </p>
      </div>

      {/* Q2: Communication Style */}
      <div className="mb-5">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
          {isEs
            ? '¿Cómo describiría su estilo de comunicación con los pacientes?'
            : 'How would you describe your communication style with patients?'}
          {' '}<span className="text-alert-garnet">*</span>
        </label>
        <div className="space-y-2 mt-2">
          {COMMUNICATION_STYLES.map((style) => {
            const isSelected = commStyle === style.value;
            return (
              <button
                key={style.value}
                type="button"
                onClick={() => { setCommStyle(style.value); setErrors({}); }}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-clinical-teal bg-clinical-teal/[0.06]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={`font-mulish text-sm font-semibold ${isSelected ? 'text-clinical-teal' : 'text-deep-charcoal'}`}>
                  {isEs ? style.es : style.en}
                </span>
                <p className="font-mulish text-xs text-body-slate mt-0.5">
                  {isEs ? style.descEs : style.descEn}
                </p>
              </button>
            );
          })}
        </div>
        {errors.commStyle && (
          <p className="font-mulish text-xs text-alert-garnet mt-1">{errors.commStyle}</p>
        )}
      </div>

      {/* Q3: Specialty Motivation */}
      <div className="mb-5">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
          {isEs
            ? '¿Qué lo atrajo a su especialidad? Usualmente hay una historia.'
            : 'What drew you to your specialty? There\'s usually a story.'}
        </label>
        <p className="font-mulish text-xs text-body-slate mb-2">{labels.optional}</p>
        <textarea
          value={specialtyMotivation}
          onChange={(e) => setSpecialtyMotivation(e.target.value.slice(0, TEXTAREA_MAX))}
          rows={3}
          placeholder={isEs
            ? 'Ej: Durante mi residencia, un caso particular me hizo ver la diferencia que esta especialidad puede hacer...'
            : 'E.g., During my residency, a particular case showed me the difference this specialty can make...'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal resize-none"
        />
        <p className="font-mulish text-xs text-body-slate text-right mt-1">
          {specialtyMotivation.length}/{TEXTAREA_MAX}
        </p>
      </div>

      {/* Q4: Care Values */}
      <div className="mb-5">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
          {isEs
            ? '¿Qué es lo que más le importa en el cuidado del paciente?'
            : 'What matters most to you in patient care?'}
        </label>
        <p className="font-mulish text-xs text-body-slate mb-2">{labels.optional}</p>
        <textarea
          value={careValues}
          onChange={(e) => setCareValues(e.target.value.slice(0, TEXTAREA_MAX))}
          rows={2}
          placeholder={isEs
            ? 'Ej: Que cada paciente se sienta escuchado y que entienda completamente su plan de tratamiento...'
            : 'E.g., That every patient feels heard and fully understands their treatment plan...'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal resize-none"
        />
        <p className="font-mulish text-xs text-body-slate text-right mt-1">
          {careValues.length}/{TEXTAREA_MAX}
        </p>
      </div>

      {/* Q5: Origin Sentence */}
      <div className="mb-5">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
          {isEs
            ? 'Complete esta frase: "Me hice médico porque..."'
            : 'Complete this sentence: "I became a doctor because..."'}
        </label>
        <p className="font-mulish text-xs text-body-slate mb-2">{labels.optional}</p>
        <div className="flex items-start gap-2">
          <span className="font-mulish text-sm text-body-slate pt-2 flex-shrink-0">
            {isEs ? '"Me hice médico porque' : '"I became a doctor because'}
          </span>
          <input
            type="text"
            value={originSentence}
            onChange={(e) => setOriginSentence(e.target.value.slice(0, ORIGIN_MAX))}
            placeholder={isEs ? '...' : '...'}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
          />
          <span className="font-mulish text-sm text-body-slate pt-2 flex-shrink-0">&quot;</span>
        </div>
        <p className="font-mulish text-xs text-body-slate text-right mt-1">
          {originSentence.length}/{ORIGIN_MAX}
        </p>
      </div>

      {/* Q6: Personal Statement */}
      <div className="mb-5">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
          {isEs
            ? '¿Qué le gustaría que un paciente supiera antes de llegar a su consultorio?'
            : 'What would you want a patient to know before they walk into your office?'}
        </label>
        <p className="font-mulish text-xs text-body-slate mb-2">{labels.optional}</p>
        <textarea
          value={personalStatement}
          onChange={(e) => setPersonalStatement(e.target.value.slice(0, TEXTAREA_MAX))}
          rows={3}
          placeholder={isEs
            ? 'Ej: Que no hay preguntas tontas, que su tiempo y sus preocupaciones importan...'
            : 'E.g., That there are no silly questions, that your time and concerns matter...'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal resize-none"
        />
        <p className="font-mulish text-xs text-body-slate text-right mt-1">
          {personalStatement.length}/{TEXTAREA_MAX}
        </p>
      </div>

      {/* Q7: Personal Interests */}
      <div className="mb-5">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
          {isEs
            ? 'Fuera de la medicina, ¿qué le apasiona?'
            : 'Outside medicine, what are you passionate about?'}
        </label>
        <p className="font-mulish text-xs text-body-slate mb-2">{labels.optional}</p>
        <textarea
          value={personalInterests}
          onChange={(e) => setPersonalInterests(e.target.value.slice(0, TEXTAREA_MAX))}
          rows={2}
          placeholder={isEs
            ? 'Ej: La fotografía, cocinar para mi familia, correr maratones...'
            : 'E.g., Photography, cooking for my family, running marathons...'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal resize-none"
        />
        <p className="font-mulish text-xs text-body-slate text-right mt-1">
          {personalInterests.length}/{TEXTAREA_MAX}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="font-mulish text-sm text-body-slate hover:text-deep-charcoal transition-colors"
        >
          {labels.back}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-clinical-teal text-white font-mulish font-semibold text-sm rounded-lg hover:bg-clinical-teal/90 transition-colors"
        >
          {labels.continue}
        </button>
      </div>
    </div>
  );
}
