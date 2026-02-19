import { useEffect, useState } from 'react';
import { SupportedLang } from '../../../lib/i18n';
import BioEditor from './BioEditor';
import PhotoUploader from './PhotoUploader';
import SpecialtyEditor from './SpecialtyEditor';
import EducationEditor from './EducationEditor';
import PublicationsEditor from './PublicationsEditor';
import PracticeEditor from './PracticeEditor';
import { Residency, Fellowship, BoardCertification, Publication } from '../../../lib/physicianClient';

interface ProfileEditorProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken?: string | null;
}

interface ProfileData {
  fullName: string;
  bio: string;
  photoUrl: string;
  primarySpecialty: string;
  subSpecialties: string[];
  boardCertifications: BoardCertification[];
  medicalSchool: string;
  medicalSchoolCountry: string;
  graduationYear?: number;
  residency: Residency[];
  fellowships: Fellowship[];
  publications: Publication[];
  currentInstitutions: string[];
  languages: string[];
  websiteUrl: string;
  linkedinUrl: string;
}

const content = {
  en: {
    title: 'Edit Profile',
    subtitle: 'Update your professional information visible to patients and colleagues.',
    loading: 'Loading profile...',
    errorLoading: 'Failed to load profile.',
  },
  es: {
    title: 'Editar Perfil',
    subtitle: 'Actualice su información profesional visible para pacientes y colegas.',
    loading: 'Cargando perfil...',
    errorLoading: 'Error al cargar el perfil.',
  },
};

export default function ProfileEditor({ physicianId, lang }: ProfileEditorProps) {
  const t = content[lang];
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!physicianId) return;
    (async () => {
      try {
        const res = await fetch(`/api/physicians/${physicianId}/profile`);
        if (res.ok) {
          const data = await res.json();
          setProfile({
            fullName: data.fullName || '',
            bio: data.bio || '',
            photoUrl: data.photoUrl || '',
            primarySpecialty: data.primarySpecialty || '',
            subSpecialties: data.subSpecialties || [],
            boardCertifications: data.boardCertifications || [],
            medicalSchool: data.medicalSchool || '',
            medicalSchoolCountry: data.medicalSchoolCountry || '',
            graduationYear: data.graduationYear,
            residency: data.residency || [],
            fellowships: data.fellowships || [],
            publications: data.publications || [],
            currentInstitutions: data.currentInstitutions || [],
            languages: data.languages || [],
            websiteUrl: data.websiteUrl || '',
            linkedinUrl: data.linkedinUrl || '',
          });
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [physicianId]);

  if (loading) {
    return (
      <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <span className="font-dm-sans text-sm text-body-slate">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <span className="font-dm-sans text-sm text-alert-garnet">{t.errorLoading}</span>
        </div>
      </div>
    );
  }

  return (
    <div id="profile-editor" className="bg-white rounded-[12px] border border-border-line shadow-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border-line">
        <h2 className="font-dm-sans font-semibold text-lg text-deep-charcoal">{t.title}</h2>
        <p className="font-dm-sans text-sm text-body-slate mt-1">{t.subtitle}</p>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border-line">
        {/* Photo */}
        <div className="px-6 py-5">
          <PhotoUploader
            physicianId={physicianId}
            lang={lang}
            initialPhotoUrl={profile.photoUrl}
            physicianName={profile.fullName}
          />
        </div>

        {/* Bio */}
        <div className="px-6 py-5">
          <BioEditor
            physicianId={physicianId}
            lang={lang}
            initialBio={profile.bio}
          />
        </div>

        {/* Specialties */}
        <div className="px-6 py-5">
          <SpecialtyEditor
            physicianId={physicianId}
            lang={lang}
            initialPrimarySpecialty={profile.primarySpecialty}
            initialSubSpecialties={profile.subSpecialties}
          />
        </div>

        {/* Education & Training */}
        <div className="px-6 py-5">
          <EducationEditor
            physicianId={physicianId}
            lang={lang}
            initialMedicalSchool={profile.medicalSchool}
            initialMedicalSchoolCountry={profile.medicalSchoolCountry}
            initialGraduationYear={profile.graduationYear}
            initialResidency={profile.residency}
            initialFellowships={profile.fellowships}
            initialBoardCertifications={profile.boardCertifications}
          />
        </div>

        {/* Publications */}
        <div className="px-6 py-5">
          <PublicationsEditor
            physicianId={physicianId}
            lang={lang}
            initialPublications={profile.publications}
          />
        </div>

        {/* Practice & Presence */}
        <div className="px-6 py-5">
          <PracticeEditor
            physicianId={physicianId}
            lang={lang}
            initialInstitutions={profile.currentInstitutions}
            initialLanguages={profile.languages}
            initialWebsiteUrl={profile.websiteUrl}
            initialLinkedinUrl={profile.linkedinUrl}
          />
        </div>
      </div>
    </div>
  );
}
