import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

import { LOGO_DARK_SRC } from '../lib/assets';
const LOGO_DARK = LOGO_DARK_SRC;

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — Medikah</title>
        <meta name="description" content="Medikah Privacy Policy. HIPAA-compliant healthcare coordination platform." />
        <link rel="canonical" href="https://medikah.health/privacy" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medikah.health/privacy" />
        <meta property="og:title" content="Privacy Policy — Medikah" />
        <meta property="og:description" content="Medikah Privacy Policy. HIPAA-compliant healthcare coordination platform." />
        <meta property="og:image" content="https://medikah.health/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Privacy Policy — Medikah" />
        <meta name="twitter:description" content="Medikah Privacy Policy. HIPAA-compliant healthcare coordination platform." />
        <meta name="twitter:image" content="https://medikah.health/og-image.png" />
      </Head>

      <nav className="sticky top-0 bg-white/95 backdrop-blur-[12px] backdrop-saturate-[180%] border-b border-border-line/30 shadow-[0_1px_3px_rgba(27,42,65,0.04)] z-[1000] h-20">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src={LOGO_DARK} alt="" width={320} height={320} priority className="w-7 h-auto opacity-70" />
            <span className="font-body text-[1.125rem] font-medium tracking-[0.04em] lowercase text-inst-blue">
              medikah
            </span>
          </Link>
          <Link
            href="/"
            className="font-bold text-[15px] tracking-[0.02em] text-deep-charcoal hover:text-clinical-teal transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      <main className="bg-white min-h-screen">
        <div className="max-w-[720px] mx-auto px-6 py-16 sm:py-24">

          <h1 className="font-extrabold text-4xl md:text-[48px] text-inst-blue leading-[1.1] tracking-[-0.02em] mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-body-slate leading-relaxed mb-2">
            <strong className="text-deep-charcoal">Medikah Corporation</strong>
          </p>
          <p className="text-sm text-archival-grey mb-2">
            <strong>Effective Date:</strong> February 1, 2026
          </p>
          <p className="text-sm text-archival-grey mb-12">
            <strong>Last Updated:</strong> February 1, 2026
          </p>

          <div className="prose-medikah">

            <hr />

            <h2>Our Commitment to Your Privacy</h2>

            <p>
              Medikah is a HIPAA-compliant technology platform that provides video conferencing, billing, and coordination services enabling independent healthcare providers to connect with patients across borders.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, protect, and share your personal health information when you use our platform.
            </p>
            <p>
              <strong>What We Are:</strong> Technology platform (video, billing, scheduling)<br />
              <strong>What We Are NOT:</strong> Healthcare provider or medical practice
            </p>
            <p>
              Your privacy is not negotiable. We handle your health information with the care, compliance, and security that healthcare technology demands.
            </p>

            <hr />

            <h2>1. Who We Are and Our Role Under HIPAA</h2>

            <h3>1.1 Medikah&rsquo;s Business Model</h3>
            <p><strong>Medikah operates as a technology platform providing:</strong></p>
            <ul>
              <li>HIPAA-compliant video conferencing for medical consultations</li>
              <li>Billing and payment processing services</li>
              <li>Appointment scheduling and coordination</li>
              <li>Secure health record storage and transmission</li>
            </ul>
            <p><strong>We are NOT:</strong></p>
            <ul>
              <li>Healthcare providers or medical practitioners</li>
              <li>Employers or supervisors of doctors using our platform</li>
              <li>Responsible for medical care, diagnosis, or treatment</li>
              <li>A substitute for in-person medical care</li>
            </ul>

            <h3>1.2 Our Role Under HIPAA</h3>
            <p><strong>Medikah is a Business Associate under HIPAA.</strong></p>
            <p><strong>What this means:</strong></p>
            <ul>
              <li><strong>Healthcare providers using our platform are &ldquo;Covered Entities&rdquo;</strong> &mdash; they provide medical care and are responsible for protecting your health information under HIPAA</li>
              <li><strong>Medikah is their &ldquo;Business Associate&rdquo;</strong> &mdash; we provide technology that handles Protected Health Information (PHI) on behalf of healthcare providers</li>
              <li>We sign Business Associate Agreements (BAAs) with all healthcare provider clients</li>
              <li>We implement HIPAA Security Rule safeguards (encryption, access controls, audit logs)</li>
              <li>We report data breaches to healthcare providers, who are responsible for notifying patients</li>
              <li>Healthcare providers, not Medikah, manage your HIPAA privacy rights (access, amendment, accounting of disclosures)</li>
            </ul>
            <p>
              <strong>Your HIPAA Rights:</strong> Exercised through your healthcare provider, not Medikah. Contact the doctor or practice that treated you.
            </p>
            <p>
              <strong>Medikah&rsquo;s HIPAA Obligations:</strong> Protect PHI, limit use to authorized purposes, implement security safeguards, report breaches.
            </p>

            <h3>1.3 Corporate Information</h3>
            <p>
              <strong>Medikah Corporation</strong><br />
              Incorporated: Delaware, USA<br />
              Operating Locations: Texas, California, Mexico
            </p>
            <p>
              <strong>Contact Information:</strong><br />
              Email: <a href="mailto:privacy@medikah.health">privacy@medikah.health</a><br />
              Privacy Officer: <a href="mailto:privacy@medikah.health">privacy@medikah.health</a><br />
              Data Protection Officer: <a href="mailto:dpo@medikah.health">dpo@medikah.health</a>
            </p>
            <p><strong>Regulatory Compliance:</strong></p>
            <ul>
              <li>HIPAA (United States)</li>
              <li>CCPA/CPRA (California)</li>
              <li>LGPD (Brazil)</li>
              <li>LFPDPPP (Mexico)</li>
              <li>Other applicable data protection laws</li>
            </ul>

            <hr />

            <h2>2. Information We Collect</h2>

            <h3>2.1 Health Information (Protected Health Information &mdash; PHI)</h3>
            <p><strong>During video consultations, we may handle:</strong></p>
            <ul>
              <li>Medical symptoms and conditions discussed</li>
              <li>Medical history and prior treatments</li>
              <li>Medications and allergies mentioned</li>
              <li>Health concerns and questions asked</li>
              <li>Visual information from video consultations</li>
              <li>Audio information from video consultations</li>
              <li>Chat messages exchanged during consultations</li>
            </ul>
            <p><strong>For billing and payment:</strong></p>
            <ul>
              <li>Insurance information (if applicable)</li>
              <li>Diagnosis codes (if provided by healthcare provider)</li>
              <li>Procedure codes</li>
              <li>Payment information associated with medical services</li>
            </ul>
            <p><strong>Documents you or your provider upload:</strong></p>
            <ul>
              <li>Medical records and test results</li>
              <li>Prescriptions and medication lists</li>
              <li>Imaging reports (X-rays, MRIs, etc.)</li>
              <li>Lab results</li>
              <li>Provider consultation notes</li>
            </ul>
            <p>
              <strong>IMPORTANT:</strong> We collect this information to provide technology services. Healthcare providers, not Medikah, are responsible for the medical content and accuracy.
            </p>

            <h3>2.2 Personal Identification Information</h3>
            <p><strong>To operate the platform:</strong></p>
            <ul>
              <li>Full name, date of birth, gender</li>
              <li>Email address, phone number, mailing address</li>
              <li>Country of residence and preferred language</li>
              <li>Emergency contact information (optional)</li>
              <li>Government-issued ID (for identity verification, if required)</li>
            </ul>

            <h3>2.3 Account and Technical Information</h3>
            <p><strong>Platform usage:</strong></p>
            <ul>
              <li>Username and encrypted password</li>
              <li>Login timestamps and IP addresses</li>
              <li>Device information (browser type, operating system)</li>
              <li>Pages visited and features used</li>
              <li>Video call session metadata (duration, participants, timestamps)</li>
              <li>Payment transaction records</li>
              <li>Customer support communications</li>
            </ul>

            <h3>2.4 Information from Healthcare Providers</h3>
            <p><strong>With your authorization, providers may share:</strong></p>
            <ul>
              <li>Medical records and treatment notes</li>
              <li>Diagnostic results and test findings</li>
              <li>Prescription information</li>
              <li>Appointment summaries</li>
              <li>Insurance verification data</li>
              <li>Care coordination communications</li>
            </ul>

            <h3>2.5 Information We Do NOT Collect</h3>
            <p><strong>We do not collect:</strong></p>
            <ul>
              <li>Genetic information (unless you explicitly provide it during a consultation)</li>
              <li>Social Security numbers (except when required for insurance processing in your jurisdiction)</li>
              <li>Financial account numbers (credit cards processed by third-party payment processor)</li>
              <li>Unnecessary personal information unrelated to platform services</li>
            </ul>

            <hr />

            <h2>3. How We Use Your Information</h2>

            <h3>3.1 Primary Uses (Technology Platform Services)</h3>
            <p><strong>Provide Video Conferencing:</strong></p>
            <ul>
              <li>Enable secure, HIPAA-compliant video consultations</li>
              <li>Facilitate communication between you and healthcare providers</li>
              <li>Record sessions (only if you and provider consent, clearly disclosed)</li>
              <li>Store chat messages exchanged during sessions</li>
            </ul>
            <p><strong>Process Payments:</strong></p>
            <ul>
              <li>Coordinate billing between you and healthcare providers</li>
              <li>Process payments securely through third-party processors</li>
              <li>Handle insurance claims (if applicable)</li>
              <li>Maintain payment records</li>
            </ul>
            <p><strong>Coordinate Care:</strong></p>
            <ul>
              <li>Schedule appointments with providers</li>
              <li>Transfer medical records securely</li>
              <li>Manage referrals between providers</li>
              <li>Track follow-up appointments</li>
              <li>Facilitate translation services when needed</li>
            </ul>
            <p><strong>Platform Operations:</strong></p>
            <ul>
              <li>Maintain your account</li>
              <li>Provide customer support</li>
              <li>Improve platform functionality</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h3>3.2 Secondary Uses (With Your Consent)</h3>
            <p><strong>We may use de-identified, aggregated data for:</strong></p>
            <ul>
              <li>Quality improvement analysis</li>
              <li>Platform usage statistics</li>
              <li>Service enhancement research</li>
              <li>Public health studies (anonymized data only)</li>
            </ul>
            <p><strong>We will NEVER:</strong></p>
            <ul>
              <li>Use your identifiable health information for marketing</li>
              <li>Sell your health information</li>
              <li>Use your data for advertising</li>
              <li>Share with third parties for commercial purposes unrelated to your healthcare</li>
            </ul>

            <h3>3.3 Legal and Safety Uses (Without Additional Consent)</h3>
            <p><strong>We may use or disclose information when:</strong></p>
            <ul>
              <li>Required by valid court order or legal subpoena</li>
              <li>Mandated by public health authorities (disease reporting)</li>
              <li>Necessary to prevent serious threats to health or safety</li>
              <li>Requested by law enforcement with proper authorization</li>
              <li>Required for regulatory compliance or audits</li>
              <li>Necessary to defend against legal claims</li>
            </ul>

            <hr />

            <h2>4. Cross-Border Data Transfers and International Consultations</h2>

            <h3>4.1 Understanding Cross-Border Healthcare</h3>
            <p><strong>Critical Information for International Patients:</strong></p>
            <p>
              When you use Medikah to connect with healthcare providers in different countries, your health information crosses international borders. Examples:
            </p>
            <ul>
              <li>US patient consulting with Mexican healthcare provider</li>
              <li>Mexican patient consulting with US healthcare provider</li>
              <li>Video consultation between patient and provider in different countries</li>
            </ul>
            <p><strong>This means:</strong></p>
            <ul>
              <li>Your data is transmitted internationally</li>
              <li>Different privacy laws may apply</li>
              <li>Data may be stored in multiple countries</li>
              <li>Healthcare regulations vary by jurisdiction</li>
            </ul>

            <h3>4.2 Cross-Border Medical Tourism Consultations</h3>
            <p><strong>IMPORTANT NOTICE &mdash; PLEASE READ CAREFULLY:</strong></p>
            <p>
              When you participate in a video consultation with a healthcare provider licensed in a different country than where you are located:
            </p>
            <p><strong>The Provider May NOT Be Licensed in Your Location:</strong></p>
            <ul>
              <li>A Mexican physician may not be licensed to practice medicine in the United States</li>
              <li>A US physician may not be licensed to practice medicine in Mexico</li>
              <li>Consultations may be for informational and planning purposes only (see Terms of Service)</li>
            </ul>
            <p><strong>Different Legal Protections Apply:</strong></p>
            <ul>
              <li>Medical care provided in another country is subject to that country&rsquo;s laws</li>
              <li>Your home country&rsquo;s medical malpractice laws may not apply</li>
              <li>Regulatory oversight differs by jurisdiction</li>
              <li>Privacy protections may vary</li>
            </ul>
            <p><strong>Your Information Crosses Borders:</strong></p>
            <ul>
              <li>Health data transmitted from US to Mexico (or vice versa)</li>
              <li>Subject to privacy laws of both countries</li>
              <li>Stored on servers that may be in different countries</li>
              <li>Accessible to providers in multiple jurisdictions</li>
            </ul>
            <p>
              <strong>You acknowledge and consent to these cross-border data transfers when using our platform for international consultations.</strong>
            </p>

            <h3>4.3 How We Protect Cross-Border Transfers</h3>
            <p><strong>Legal Mechanisms:</strong></p>
            <ol>
              <li><strong>Standard Contractual Clauses (SCCs):</strong> EU-approved contracts for international data transfers</li>
              <li><strong>Business Associate Agreements:</strong> HIPAA-compliant contracts with all providers</li>
              <li><strong>Encryption:</strong> All data encrypted in transit and at rest</li>
              <li><strong>Access Controls:</strong> Limited access based on need and authorization</li>
              <li><strong>Adequacy Assessments:</strong> We evaluate privacy protections in destination countries</li>
              <li><strong>Your Consent:</strong> Explicit authorization for international coordination</li>
            </ol>
            <p>
              <strong>Data Storage Locations:</strong><br />
              Primary servers: United States (HIPAA-compliant data centers)<br />
              Backup servers: Geographically distributed<br />
              Provider access: From their licensed jurisdiction<br />
              Data residency: Complies with applicable laws
            </p>
            <p>
              <strong>Your Right to Object:</strong> You can limit cross-border data sharing, but this will prevent us from facilitating international consultations.
            </p>

            <h3>4.4 Jurisdiction-Specific Protections</h3>
            <p><strong>For US Patients:</strong></p>
            <ul>
              <li>HIPAA protections apply to US-based providers</li>
              <li>State data breach notification laws apply</li>
              <li>California residents: CCPA/CPRA rights apply</li>
              <li>Cross-border transfers use approved mechanisms</li>
            </ul>
            <p><strong>For Mexican Patients:</strong></p>
            <ul>
              <li>LFPDPPP protections apply</li>
              <li>ARCO rights respected (Access, Rectification, Cancellation, Opposition)</li>
              <li>Cross-border transfers require consent</li>
              <li>Mexican data protection standards maintained</li>
            </ul>
            <p><strong>For Brazilian Patients:</strong></p>
            <ul>
              <li>LGPD protections apply</li>
              <li>International transfer safeguards implemented</li>
              <li>Data subject rights respected</li>
              <li>ANPD guidance followed</li>
            </ul>

            <hr />

            <h2>5. How We Share Your Information</h2>

            <h3>5.1 Healthcare Providers</h3>
            <p><strong>We share your information with:</strong></p>
            <ul>
              <li>Healthcare providers you choose to consult</li>
              <li>Providers involved in your care coordination</li>
              <li>Specialists to whom you&rsquo;re referred</li>
              <li>Healthcare facilities where you receive treatment</li>
            </ul>
            <p><strong>Sharing Method:</strong> Secure, encrypted transmission via HIPAA-compliant channels</p>
            <p><strong>Authorization:</strong> You authorize these disclosures when using our platform. You can restrict certain disclosures by contacting your healthcare provider.</p>

            <h3>5.2 Payment and Insurance</h3>
            <p><strong>We share necessary information with:</strong></p>
            <ul>
              <li>Your insurance company (for coverage verification and claims)</li>
              <li>Payment processors (for billing services)</li>
              <li>Medical billing services (for claims preparation)</li>
            </ul>
            <p><strong>What We Share:</strong> Only information necessary for payment purposes. We minimize sharing of clinical details to payment processors.</p>

            <h3>5.3 Service Providers (Business Associates)</h3>
            <p><strong>We work with trusted third parties:</strong></p>
            <p><strong>Video Platform Providers:</strong> Cloud video infrastructure. All have signed Business Associate Agreements.</p>
            <p><strong>Payment Processors:</strong> PCI-DSS compliant payment gateways. Subject to Business Associate Agreements.</p>
            <p><strong>Cloud Storage and Hosting:</strong> HIPAA-compliant cloud providers. Encrypted data storage. Subject to Business Associate Agreements.</p>
            <p><strong>Communication Services:</strong> Secure messaging platforms, email service providers, translation services (HIPAA-compliant).</p>
            <p><strong>IT Security:</strong> Cybersecurity monitoring services, intrusion detection systems, encryption infrastructure.</p>
            <p><strong>All service providers:</strong></p>
            <ul>
              <li>Sign Business Associate Agreements (BAAs)</li>
              <li>Commit to HIPAA compliance and equivalent international standards</li>
              <li>Are contractually prohibited from using your data for their own purposes</li>
              <li>Must report breaches to Medikah</li>
            </ul>

            <h3>5.4 What We Do NOT Share</h3>
            <p><strong>We will NEVER share your information with:</strong></p>
            <ul>
              <li>Marketing companies or advertisers</li>
              <li>Social media platforms (for advertising)</li>
              <li>Data brokers or analytics companies (for commercial purposes)</li>
              <li>Third parties for purposes unrelated to your healthcare</li>
              <li>Anyone without proper authorization</li>
            </ul>

            <hr />

            <h2>6. How We Protect Your Information</h2>

            <h3>6.1 Technical Safeguards</h3>
            <p><strong>Encryption:</strong> All data encrypted in transit using TLS 1.3. All data encrypted at rest using AES-256 encryption. End-to-end encryption for video consultations.</p>
            <p><strong>Access Controls:</strong> Role-based access permissions. Multi-factor authentication for all accounts. Automatic session timeouts. Principle of least privilege.</p>
            <p><strong>Network Security:</strong> Firewalls and intrusion detection systems. 24/7 security monitoring. Regular penetration testing. DDoS protection.</p>
            <p><strong>Video Security:</strong> Unique, non-reusable meeting IDs. Waiting rooms for provider authorization. Recording controls with clear notification. Automatic session termination.</p>
            <p><strong>Audit Logging:</strong> Detailed logs of who accessed what information and when. Tamper-proof audit trails. Regular log reviews. Retention per legal requirements.</p>

            <h3>6.2 Administrative Safeguards</h3>
            <p><strong>Workforce Training:</strong> All employees trained on HIPAA and privacy requirements. Regular security awareness training. Role-specific privacy training. Annual refresher courses.</p>
            <p><strong>Policies and Procedures:</strong> Written privacy and security policies. Incident response procedures. Breach notification protocols. Data retention and deletion schedules.</p>
            <p><strong>Vendor Management:</strong> All vendors undergo security assessments. Business Associate Agreements required. Regular vendor audits. Contract compliance monitoring.</p>

            <h3>6.3 Physical Safeguards</h3>
            <p><strong>Data Center Security:</strong> HIPAA-compliant, SOC 2 certified facilities. 24/7 physical access controls. Video surveillance. Environmental controls.</p>
            <p><strong>Device Security:</strong> Encrypted devices for all staff. Remote wipe capabilities. Secure disposal of hardware.</p>

            <h3>6.4 Data Retention and Deletion</h3>
            <p><strong>Active Platform Use:</strong></p>
            <ul>
              <li>Account information: While you maintain an account</li>
              <li>Medical records: As needed for care coordination and legal requirements</li>
              <li>Video recordings: Only if both parties consent; retained per agreement</li>
              <li>Chat messages: Retained for legal requirements (typically 6 years)</li>
              <li>Audit logs: Minimum 6 years per HIPAA requirements</li>
            </ul>
            <p><strong>After Account Closure:</strong></p>
            <ul>
              <li>Medical records: Minimum legal retention (6&ndash;10 years depending on jurisdiction)</li>
              <li>Payment records: Tax and accounting requirements (typically 7 years)</li>
              <li>Communication logs: Regulatory requirements (typically 6 years)</li>
            </ul>
            <p>After retention periods expire, data is securely deleted or anonymized. You can request early deletion, subject to legal retention obligations.</p>
            <p><strong>How to Request Deletion:</strong> Email <a href="mailto:privacy@medikah.health">privacy@medikah.health</a> with &ldquo;Data Deletion Request&rdquo;</p>

            <hr />

            <h2>7. Your Privacy Rights</h2>

            <h3>7.1 Rights Under HIPAA (US Patients)</h3>
            <p><strong>Important:</strong> Most HIPAA rights are exercised through your healthcare provider, not Medikah, because providers are the Covered Entities responsible for your care.</p>
            <p><strong>Right to Access:</strong> Request copies of your health information stored on our platform. Request provided to your healthcare provider. Or contact Medikah at <a href="mailto:privacy@medikah.health">privacy@medikah.health</a> for technical records.</p>
            <p><strong>Right to Amendment:</strong> Request corrections to inaccurate health information. Request must be made to your healthcare provider. Medikah can correct account information.</p>
            <p><strong>Right to Accounting of Disclosures:</strong> Request list of PHI disclosures made by Medikah (past 6 years). Contact <a href="mailto:privacy@medikah.health">privacy@medikah.health</a>. We provide within 60 days.</p>
            <p><strong>Right to Request Restrictions:</strong> Request limits on how providers use or disclose your information. Must be requested from healthcare provider.</p>
            <p><strong>Right to Confidential Communications:</strong> Request we communicate via alternative email, phone, or address. We accommodate reasonable requests. No explanation required.</p>

            <h3>7.2 Rights Under State Law</h3>
            <p><strong>California Residents (CCPA/CPRA):</strong></p>
            <ul>
              <li><strong>Right to Know:</strong> What personal information we collect and how we use it</li>
              <li><strong>Right to Delete:</strong> Request deletion of your information (subject to legal exceptions)</li>
              <li><strong>Right to Opt-Out:</strong> We don&rsquo;t sell your information, so no opt-out needed</li>
              <li><strong>Right to Non-Discrimination:</strong> We won&rsquo;t discriminate for exercising privacy rights</li>
              <li><strong>Right to Correct:</strong> Request correction of inaccurate information</li>
            </ul>
            <p><strong>Exercise Rights:</strong> Email <a href="mailto:privacy@medikah.health">privacy@medikah.health</a> with &ldquo;California Privacy Request&rdquo;</p>

            <h3>7.3 Rights Under International Law</h3>
            <p><strong>European Union/EEA Residents (GDPR):</strong></p>
            <ul>
              <li>Right to Access, Rectification, Erasure (&ldquo;Right to be Forgotten&rdquo;)</li>
              <li>Right to Restrict Processing, Data Portability, Object</li>
              <li>Right to Withdraw Consent, Lodge Complaint with supervisory authority</li>
            </ul>
            <p><strong>Brazilian Residents (LGPD):</strong> Right to confirmation of processing, access, correction, anonymization, blocking, deletion, portability, information about sharing, withdraw consent, petition ANPD.</p>
            <p><strong>Mexican Residents (LFPDPPP):</strong> ARCO rights: Access, Rectification, Cancellation, Opposition. Right to revoke consent and limit use and disclosure. Request via <a href="mailto:privacy@medikah.health">privacy@medikah.health</a> or <a href="mailto:dpo@medikah.health">dpo@medikah.health</a>.</p>

            <h3>7.4 How to Exercise Your Rights</h3>
            <p>
              <strong>Email:</strong> <a href="mailto:privacy@medikah.health">privacy@medikah.health</a><br />
              <strong>Subject Line:</strong> Include &ldquo;Privacy Rights Request&rdquo; or &ldquo;HIPAA Request&rdquo;<br />
              <strong>Include:</strong> Your name, email, description of request, identity verification
            </p>
            <p><strong>Response Time:</strong> HIPAA requests: 30 days. CCPA requests: 45 days. GDPR requests: 30 days. Other jurisdictions: As required by local law.</p>

            <h3>7.5 Breach Notification Rights</h3>
            <p><strong>If Your Information is Breached, we will notify you:</strong></p>
            <ul>
              <li>Within 60 days of discovering breach (or faster if required by law)</li>
              <li>Via email to address on file</li>
              <li>Including: What happened, what information was affected, what we&rsquo;re doing, what you should do</li>
            </ul>
            <p>We will provide credit monitoring or identity protection services if financial information is affected.</p>

            <hr />

            <h2>8. Cookies and Tracking Technologies</h2>

            <h3>8.1 What We Use</h3>
            <p><strong>Essential Cookies (Required for Platform):</strong> Authentication, security, preferences, video session management.</p>
            <p><strong>Analytics Cookies (Optional, You Can Disable):</strong> Usage patterns, error tracking, performance monitoring, platform improvement data.</p>
            <p><strong>What We DON&rsquo;T Use:</strong> Advertising cookies, social media tracking, third-party marketing trackers, cross-site tracking for advertising.</p>

            <h3>8.2 Your Control</h3>
            <p>You can disable cookies through browser settings. Some platform features may not work without essential cookies. We honor Do Not Track signals where technically feasible.</p>

            <hr />

            <h2>9. Children&rsquo;s Privacy</h2>
            <p><strong>Medikah is not designed for independent use by children under 13.</strong></p>
            <p>Users under 18 require parent/guardian consent. Parents can create and manage accounts for minors. We do not knowingly collect information from children under 13 without verifiable parental consent. If we learn we&rsquo;ve collected such information, we delete it immediately.</p>
            <p>Parents can contact <a href="mailto:privacy@medikah.health">privacy@medikah.health</a> to review or delete a child&rsquo;s information.</p>

            <hr />

            <h2>10. Changes to This Policy</h2>
            <p><strong>When We Update:</strong></p>
            <ul>
              <li>Post new policy with updated &ldquo;Last Updated&rdquo; date</li>
              <li>Email notification for material changes</li>
              <li>Platform notification for significant changes affecting rights</li>
              <li>30-day notice period before material changes take effect</li>
            </ul>
            <p>Continue using platform = acceptance of updated policy. Object to changes by discontinuing use before effective date. Contact us with concerns: <a href="mailto:privacy@medikah.health">privacy@medikah.health</a></p>

            <hr />

            <h2>11. International Users</h2>

            <h3>11.1 Multi-Jurisdictional Compliance</h3>
            <p>Medikah operates across multiple countries with different privacy laws. We comply with the most protective standard applicable to your situation.</p>
            <p><strong>United States:</strong> HIPAA, state privacy laws (CCPA, etc.), state breach notification laws.</p>
            <p><strong>Mexico:</strong> LFPDPPP, ARCO rights, INAI oversight.</p>
            <p><strong>Brazil:</strong> LGPD, ANPD oversight, international transfer safeguards.</p>
            <p><strong>European Union/EEA:</strong> GDPR, supervisory authority oversight, strict cross-border transfer rules.</p>
            <p><strong>Other Countries:</strong> Local healthcare privacy laws apply. Contact <a href="mailto:dpo@medikah.health">dpo@medikah.health</a> for jurisdiction-specific questions.</p>

            <h3>11.2 Legal Basis for Processing (GDPR)</h3>
            <p>For EU/EEA users, we process your information based on: Consent, Contract Performance, Legal Obligation, Vital Interests, and Legitimate Interests (only for non-sensitive data).</p>

            <h3>11.3 Data Protection Officer</h3>
            <p><strong>Email:</strong> <a href="mailto:dpo@medikah.health">dpo@medikah.health</a></p>

            <hr />

            <h2>12. How to Contact Us</h2>

            <h3>Privacy Questions or Requests</h3>
            <p>
              <strong>Email:</strong> <a href="mailto:privacy@medikah.health">privacy@medikah.health</a><br />
              <strong>Response Time:</strong> Within 30&ndash;60 days depending on jurisdiction and request type
            </p>

            <h3>Data Protection Officer</h3>
            <p><strong>Email:</strong> <a href="mailto:dpo@medikah.health">dpo@medikah.health</a></p>

            <h3>File a Complaint</h3>
            <p><strong>With Medikah:</strong> <a href="mailto:privacy@medikah.health">privacy@medikah.health</a> (we will not retaliate for complaints)</p>
            <p><strong>With Regulatory Authorities:</strong></p>
            <ul>
              <li><strong>United States:</strong> U.S. Department of Health and Human Services, Office for Civil Rights &mdash; www.hhs.gov/ocr/privacy/hipaa/complaints</li>
              <li><strong>California:</strong> California Attorney General &mdash; oag.ca.gov/privacy</li>
              <li><strong>Mexico:</strong> Instituto Nacional de Transparencia (INAI) &mdash; www.inai.org.mx</li>
              <li><strong>Brazil:</strong> Autoridade Nacional de Prote&ccedil;&atilde;o de Dados (ANPD) &mdash; www.gov.br/anpd</li>
              <li><strong>European Union:</strong> Your local Data Protection Authority</li>
            </ul>

            <hr />

            <h2>13. Definitions</h2>
            <ul>
              <li><strong>Protected Health Information (PHI):</strong> Individually identifiable health information regulated by HIPAA (US)</li>
              <li><strong>Business Associate:</strong> Technology platform that handles PHI on behalf of healthcare providers (Covered Entities)</li>
              <li><strong>Covered Entity:</strong> Healthcare provider, health plan, or healthcare clearinghouse subject to HIPAA</li>
              <li><strong>De-identified Data:</strong> Information stripped of identifiers so it cannot be linked back to you</li>
              <li><strong>Minimum Necessary:</strong> Only the information needed to accomplish a specific purpose</li>
              <li><strong>Standard Contractual Clauses (SCCs):</strong> EU-approved contracts for international data transfers</li>
              <li><strong>Cross-Border Transfer:</strong> Transmission of data from one country to another</li>
            </ul>

            <hr />

            <h2>Acknowledgment</h2>
            <p>By using Medikah&rsquo;s platform, you acknowledge that you have read and understood this Privacy Policy, and you consent to cross-border data transfers for international consultations, use of your information as described in this policy, and the Business Associate relationship between Medikah and your healthcare providers.</p>

            <hr />

            <p className="text-center">
              <strong className="text-clinical-teal">Healthcare Technology That Crosses Borders.</strong><br />
              <strong className="text-inst-blue">Privacy Protection That Never Does.</strong>
            </p>

            <p className="text-center text-sm text-archival-grey mt-8">
              Medikah Corporation<br />
              HIPAA-Compliant Technology Platform<br />
              Incorporated in Delaware, USA<br />
              Operating: Texas, California, Mexico
            </p>

            <p className="text-center text-sm text-archival-grey mt-6">
              <em>This Privacy Policy was last updated on February 1, 2026.</em>
            </p>

          </div>
        </div>
      </main>

      <footer className="bg-inst-blue px-6 pt-14 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-semibold text-[15px] text-white leading-relaxed mb-4">
              Medikah Corporation · Incorporated in Delaware, USA
            </p>
            <p className="text-sm">
              <a href="mailto:partnerships@medikah.health" className="text-clinical-teal hover:text-white transition-colors">
                partnerships@medikah.health
              </a>
            </p>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-white/60">&copy; 2026 Medikah Corporation. All rights reserved.</p>
            <div className="text-[13px]">
              <span className="text-white/80">Privacy Policy</span>
              <span className="text-white/30 mx-2">|</span>
              <Link href="/terms" className="text-white/60 hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
