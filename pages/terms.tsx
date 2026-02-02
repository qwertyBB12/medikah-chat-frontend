import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

const LOGO_DARK = '/logo-BLU.png';

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service — Medikah</title>
        <meta name="description" content="Medikah Terms of Service. HIPAA-compliant technology platform for cross-border healthcare coordination." />
        <link rel="canonical" href="https://medikah.org/terms" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medikah.org/terms" />
        <meta property="og:title" content="Terms of Service — Medikah" />
        <meta property="og:description" content="Medikah Terms of Service. HIPAA-compliant technology platform for cross-border healthcare coordination." />
        <meta property="og:image" content="https://medikah.org/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Terms of Service — Medikah" />
        <meta name="twitter:description" content="Medikah Terms of Service. HIPAA-compliant technology platform for cross-border healthcare coordination." />
        <meta name="twitter:image" content="https://medikah.org/og-image.png" />
      </Head>

      <nav className="sticky top-0 bg-white/95 backdrop-blur-[12px] backdrop-saturate-[180%] border-b border-border-line/30 shadow-[0_1px_3px_rgba(27,42,65,0.04)] z-[1000] h-20">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/">
            <Image src={LOGO_DARK} alt="Medikah" width={48} height={48} priority className="h-12 w-auto" />
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
            Terms of Service
          </h1>
          <p className="text-lg text-body-slate leading-relaxed mb-2">
            <strong className="text-deep-charcoal">Medikah Health Coordination Technology Platform</strong>
          </p>
          <p className="text-sm text-archival-grey mb-2">
            <strong>Effective Date:</strong> February 1, 2026
          </p>
          <p className="text-sm text-archival-grey mb-12">
            <strong>Last Updated:</strong> February 1, 2026
          </p>

          <div className="prose-medikah">

            <hr />

            <h2>Agreement to Terms</h2>
            <p>By accessing or using Medikah&rsquo;s platform and services, you agree to be bound by these Terms of Service and our <Link href="/privacy" className="text-clinical-teal hover:underline font-medium">Privacy Policy</Link>.</p>
            <p><strong>IF YOU DO NOT AGREE TO THESE TERMS, YOU MAY NOT USE OUR SERVICES.</strong></p>

            <hr />

            <h2>CRITICAL UNDERSTANDING &mdash; WHAT MEDIKAH IS AND IS NOT</h2>

            <h3>Medikah Is a Technology Platform</h3>
            <p><strong>We Provide:</strong></p>
            <ul>
              <li>HIPAA-compliant video conferencing platform</li>
              <li>Billing and payment processing services</li>
              <li>Appointment scheduling and coordination tools</li>
              <li>Secure health record storage and transmission</li>
            </ul>
            <p><strong>We Are NOT:</strong></p>
            <ul>
              <li>Healthcare providers or medical practitioners</li>
              <li>A telemedicine service that provides medical care</li>
              <li>Employers or supervisors of the doctors using our platform</li>
              <li>Responsible for medical care, diagnosis, or treatment</li>
              <li>A substitute for in-person medical care</li>
              <li>An emergency medical service</li>
            </ul>

            <h3>Healthcare Providers Are Independent</h3>
            <p><strong>The doctors and healthcare providers using our platform:</strong></p>
            <ul>
              <li>Are independently licensed professionals</li>
              <li>Are solely responsible for all medical care they provide</li>
              <li>Are not employed by, supervised by, or agents of Medikah</li>
              <li>Make their own medical decisions and bear full medical responsibility</li>
              <li>Maintain their own malpractice insurance</li>
              <li>Are subject to their own licensing and regulatory oversight</li>
            </ul>
            <p><strong>Medikah&rsquo;s role:</strong> We provide the technology. They provide the medical care.</p>

            <hr />

            <h2>1. Eligibility and Account Requirements</h2>

            <h3>1.1 Age and Capacity</h3>
            <p><strong>You must be:</strong></p>
            <ul>
              <li>At least 18 years old (or age of majority in your jurisdiction) to create an account independently</li>
              <li>Legally capable of entering binding contracts</li>
              <li>Using the service in compliance with all applicable laws</li>
            </ul>
            <p><strong>Minors (under 18):</strong> May use the service with parent/guardian consent. Parent/guardian must create and manage account and is responsible for all activity.</p>

            <h3>1.2 Account Responsibilities</h3>
            <p><strong>You are responsible for:</strong></p>
            <ul>
              <li>Providing accurate, current, and complete information</li>
              <li>Maintaining security of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Immediately notifying us of unauthorized access: <a href="mailto:support@medikah.org">support@medikah.org</a></li>
              <li>Updating your information when it changes</li>
            </ul>
            <p><strong>False information consequences:</strong> Account suspension or termination, compromised medical care quality, insurance claim denials, legal liability.</p>

            <h3>1.3 Geographic Availability</h3>
            <p><strong>Currently Operating In:</strong> United States (Texas, California) and Mexico.</p>
            <p>May expand to additional jurisdictions &mdash; Terms updated to reflect changes. Service availability varies by location.</p>

            <hr />

            <h2>2. Description of Services</h2>

            <h3>2.1 Technology Platform Services</h3>
            <p><strong>Video Conferencing:</strong> HIPAA-compliant video calls between you and healthcare providers. End-to-end encrypted communication. Recording capability only with both parties&rsquo; explicit consent.</p>
            <p><strong>Billing and Payment:</strong> Payment processing for medical consultations. Invoice generation. Insurance coordination assistance. Secure PCI-DSS compliant payment processing. Cross-border payment facilitation.</p>
            <p><strong>Scheduling and Coordination:</strong> Appointment booking, calendar management, reminders, rescheduling tools, provider availability display.</p>
            <p><strong>Health Record Management:</strong> Secure storage of medical documents. Record sharing between you and providers. Encrypted storage and transmission.</p>

            <h3>2.2 What We Do NOT Provide</h3>
            <p><strong>We Do NOT:</strong></p>
            <ul>
              <li>Provide medical advice, diagnosis, or treatment</li>
              <li>Employ or supervise healthcare providers</li>
              <li>Practice medicine or any licensed healthcare profession</li>
              <li>Prescribe medications</li>
              <li>Guarantee medical outcomes</li>
              <li>Provide emergency medical services</li>
              <li>Make medical decisions or interpret symptoms</li>
            </ul>
            <p><strong>For medical emergencies:</strong> United States: Call 911. Mexico: Call 911. Do NOT use Medikah platform for emergencies.</p>

            <hr />

            <h2>3. Cross-Border Medical Consultations &mdash; Critical Disclaimers</h2>

            <h3>3.1 Understanding Cross-Border Healthcare</h3>
            <p>When you use Medikah to connect with a healthcare provider in a different country than where you are located, you must understand and acknowledge the following.</p>

            <h3>3.2 Provider Licensing and Legal Authority</h3>
            <p><strong>CRITICAL WARNING: Providers may NOT be licensed in your location.</strong></p>
            <p><strong>If you are in the United States consulting with a Mexican physician:</strong> The Mexican physician is licensed to practice medicine in Mexico. The Mexican physician is NOT licensed to practice medicine in the United States. US state medical boards do NOT regulate Mexican physicians. The physician cannot legally diagnose, treat, or prescribe under US law during the video call.</p>
            <p><strong>If you are in Mexico consulting with a US physician:</strong> The US physician is licensed to practice medicine in the United States. The US physician is NOT licensed to practice medicine in Mexico. Mexican health authorities do NOT regulate US physicians. The physician cannot legally diagnose, treat, or prescribe under Mexican law during the video call.</p>

            <h3>3.3 Informational Consultations for Medical Tourism</h3>
            <p><strong>EXTREMELY IMPORTANT: Cross-border video consultations are for INFORMATIONAL and PLANNING purposes only. These are NOT telemedicine treatment visits.</strong></p>
            <p><strong>During a cross-border consultation, the healthcare provider MAY:</strong></p>
            <ul>
              <li>Review your existing medical records and health history that you provide</li>
              <li>Explain medical procedures available in the provider&rsquo;s licensed jurisdiction</li>
              <li>Discuss general information about costs, recovery time, and logistics</li>
              <li>Answer general questions about medical procedures</li>
              <li>Provide preliminary assessment of whether you may be a candidate for procedures</li>
              <li>Help you plan a potential trip to the provider&rsquo;s jurisdiction for in-person medical care</li>
            </ul>
            <p><strong>During a cross-border consultation, the healthcare provider MAY NOT:</strong></p>
            <ul>
              <li>Diagnose medical conditions under the laws of your location</li>
              <li>Prescribe medications of any kind</li>
              <li>Order medical tests, imaging, or laboratory work in your location</li>
              <li>Provide definitive treatment plans</li>
              <li>Make final medical decisions without in-person examination</li>
              <li>Represent themselves as licensed in your jurisdiction</li>
              <li>Bill insurance companies for cross-border consultations as telemedicine</li>
            </ul>
            <p><strong>The purpose of these consultations:</strong> To help you make informed decisions about traveling to another country for in-person medical care (medical tourism).</p>
            <p><strong>Final diagnosis and treatment</strong> must occur in-person, in the country where the provider is licensed, in accordance with that country&rsquo;s medical regulations.</p>

            <h3>3.4 Acknowledgment Required</h3>
            <p>Before any cross-border consultation, you will be required to read and sign a Cross-Border Consultation Acknowledgment Form, explicitly acknowledge the provider is not licensed in your location, confirm your understanding this is informational, and accept the limitations. Without this acknowledgment, cross-border consultations cannot proceed.</p>

            <h3>3.5 No Exceptions to Cross-Border Restrictions</h3>
            <p><strong>There are NO exceptions to these cross-border consultation restrictions.</strong> Even if you request diagnosis or prescription, sign a waiver of liability, cannot access care locally, are willing to assume all risk, or the situation seems urgent &mdash; the provider still CANNOT diagnose, treat, or prescribe.</p>
            <p><strong>For urgent or emergency medical situations:</strong> Call local emergency services (911 in US/Mexico). Visit a local emergency room. Do NOT rely on cross-border video consultation.</p>

            <h3>3.6 Enforcement</h3>
            <p>All providers receive training on cross-border restrictions and sign agreements with strict limitations. Violations result in immediate suspension, termination, and reporting to medical licensing boards. Medikah does NOT indemnify providers who violate restrictions.</p>
            <p><strong>If a provider violates restrictions:</strong> Report immediately to <a href="mailto:legal@medikah.org">legal@medikah.org</a>.</p>

            <h3>3.7 Medical Tourism Risks</h3>
            <p><strong>You acknowledge and accept these risks:</strong></p>
            <ul>
              <li>Medical malpractice laws differ by country</li>
              <li>Your home country&rsquo;s legal protections may not apply</li>
              <li>Dispute resolution may be complex across borders</li>
              <li>Medical training requirements and standards of care vary</li>
              <li>Language barriers and cultural differences in healthcare</li>
              <li>Insurance coverage limitations for international care</li>
              <li>Exchange rate fluctuations and additional travel costs</li>
            </ul>

            <h3>3.8 Your Responsibilities for Cross-Border Care</h3>
            <p><strong>You are responsible for:</strong> Researching the healthcare provider&rsquo;s credentials, verifying licensing, understanding legal differences between jurisdictions, obtaining complete medical records, getting second opinions if desired, understanding all costs, and making informed voluntary decisions.</p>

            <hr />

            <h2>4. Same-Country Consultations</h2>
            <p><strong>When provider and patient are in the same country</strong> and the provider is licensed where you are located, standard telemedicine regulations apply. The provider CAN diagnose and treat via video, CAN prescribe medications (subject to regulations), and standard medical practice laws and patient protections apply.</p>

            <hr />

            <h2>5. User Responsibilities</h2>

            <h3>5.1 Accurate Information</h3>
            <p><strong>You MUST provide:</strong> Accurate medical history, complete medication lists, all known allergies, current symptoms truthfully and completely, correct contact information, valid insurance information (if applicable), and truthful identity information.</p>

            <h3>5.2 Following Provider Instructions</h3>
            <p>You are responsible for attending scheduled appointments, following treatment plans, taking medications as directed, reporting side effects, and seeking emergency care when appropriate. Medikah is NOT responsible for your compliance with medical advice.</p>

            <h3>5.3 Emergency Situations</h3>
            <p><strong>DO NOT USE MEDIKAH FOR MEDICAL EMERGENCIES.</strong> In a medical emergency, call 911 (United States or Mexico) or your local emergency number. Life-threatening situations require immediate emergency care.</p>

            <h3>5.4 Payment Obligations</h3>
            <p>You agree to pay for services provided by healthcare professionals, provide accurate insurance information, pay amounts not covered by insurance, and pay Medikah&rsquo;s platform fees (if applicable). Medikah is NOT responsible for healthcare provider charges, insurance coverage decisions, or billing disputes.</p>

            <h3>5.5 Prohibited Uses</h3>
            <p><strong>You MAY NOT:</strong></p>
            <ul>
              <li>Seek controlled substances inappropriately or illegally</li>
              <li>Obtain multiple prescriptions for same condition from different doctors</li>
              <li>Provide false or misleading information or impersonate another person</li>
              <li>Share your account credentials</li>
              <li>Use platform for illegal purposes or harassment</li>
              <li>Submit fraudulent insurance claims</li>
              <li>Reverse engineer, hack, or circumvent security measures</li>
              <li>Scrape or collect data through automated means</li>
              <li>Post illegal, threatening, or harassing content</li>
            </ul>
            <p>Violations result in immediate account termination, reporting to law enforcement, and legal action.</p>

            <hr />

            <h2>6. Provider Requirements and Restrictions</h2>

            <h3>6.1 Provider Eligibility</h3>
            <p>Healthcare providers must hold valid, unrestricted medical license in their jurisdiction, maintain professional liability insurance, comply with all applicable laws, sign Business Associate Agreement with Medikah, and pass credentialing verification.</p>

            <h3>6.2 Provider Responsibilities</h3>
            <p>Providers are responsible for all medical care they provide, complying with licensing requirements, following telemedicine regulations, maintaining insurance, protecting patient privacy, accurate documentation, and obtaining informed consent.</p>

            <h3>6.3 Cross-Border Provider Restrictions</h3>
            <p>Providers conducting cross-border consultations are subject to strict restrictions. They must clearly disclose their licensing jurisdiction, state the consultation is informational only, obtain your signed acknowledgment, and document that no diagnosis or treatment was provided.</p>
            <p><strong>Violations result in:</strong> Immediate suspension, termination, reporting to licensing boards, no indemnification from Medikah, and potential criminal prosecution for unlicensed practice of medicine.</p>

            <h3>6.4 Provider Independence</h3>
            <p>Healthcare providers are <strong>independent contractors</strong>, not employees or agents of Medikah. Medikah has no control over medical care provided and is not liable for provider actions or malpractice.</p>

            <h3>6.5 Reporting Provider Violations</h3>
            <p>If a provider violates cross-border restrictions: stop the consultation, document what happened, and report to <a href="mailto:legal@medikah.org">legal@medikah.org</a> with &ldquo;Provider Violation Report&rdquo; in the subject line. No retaliation for good-faith reports.</p>

            <hr />

            <h2>7. Fees and Payment</h2>

            <h3>7.1 Platform Fees</h3>
            <p>Platform coordination services currently provided at no direct cost to patients. Healthcare provider fees apply for medical consultations. We reserve the right to introduce platform fees with 60 days advance notice.</p>

            <h3>7.2 Healthcare Provider Fees</h3>
            <p>Separate charges apply for medical consultations, procedures, treatments, diagnostic tests, prescriptions, and follow-up visits. Fees set by provider, not Medikah.</p>

            <h3>7.3 Cross-Border Payment Considerations</h3>
            <p>For international consultations, payment may be in foreign currency. Exchange rates apply at time of transaction. International transaction fees may apply.</p>

            <h3>7.4 Insurance</h3>
            <p>We assist with insurance verification and help submit claims when applicable. We do NOT guarantee insurance coverage. Insurance may not cover cross-border consultations or medical tourism. Check with your insurer before proceeding. Insurance is a contract between you and your insurer &mdash; Medikah is not a party to that contract.</p>

            <hr />

            <h2>8. Privacy and Data Security</h2>
            <p>Our <Link href="/privacy" className="text-clinical-teal hover:underline font-medium">Privacy Policy</Link> governs how we collect, use, and protect your information, your privacy rights under HIPAA and international law, cross-border data transfer protections, and how to exercise your privacy rights.</p>
            <p><strong>You must:</strong> Protect your login credentials, use secure internet connections, log out on shared devices, report suspicious activity immediately, and notify us of data breaches you discover.</p>

            <hr />

            <h2>9. Disclaimers and Limitations of Liability</h2>

            <h3>9.1 Service &ldquo;As Is&rdquo;</h3>
            <p><strong>MEDIKAH SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND.</strong> We disclaim all warranties, including merchantability, fitness for a particular purpose, non-infringement, accuracy or completeness of information, uninterrupted or error-free service, security of transmissions, and availability of providers.</p>

            <h3>9.2 No Medical Guarantees</h3>
            <p>We make NO warranties or guarantees about medical outcomes or results, provider qualifications beyond basic license verification, quality of medical care, accuracy of diagnoses or treatments, suitability of cross-border healthcare, or success of medical tourism.</p>

            <h3>9.3 Provider Actions &mdash; Not Our Responsibility</h3>
            <p><strong>Medikah is NOT responsible for:</strong> Medical malpractice or negligence by providers, misdiagnosis or incorrect treatment, prescription errors, surgical complications, provider misconduct, provider cancellations, provider billing disputes, provider violations of medical regulations, or any illegal activity by providers.</p>
            <p>Providers are independent contractors. They are responsible for their own actions.</p>

            <h3>9.4 Limitation of Liability</h3>
            <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong> Medikah&rsquo;s total liability to you for any claims arising from these Terms or the platform is limited to the amount you paid Medikah in the 12 months before the claim (or $100 USD if you paid nothing).</p>
            <p><strong>We are NOT liable for:</strong> Indirect, incidental, or consequential damages; lost profits; loss of data; medical complications, injuries, or adverse outcomes; emotional distress; or punitive damages.</p>
            <p><strong>Exceptions:</strong> Limitations don&rsquo;t apply where prohibited by law. Personal injury claims may not be limited. Gross negligence or willful misconduct not limited.</p>

            <hr />

            <h2>10. Indemnification</h2>
            <p><strong>You agree to indemnify, defend, and hold Medikah harmless</strong> from any claims, damages, losses, liabilities, and expenses arising from your violation of these Terms, your violation of any law, your provision of false information, your healthcare decisions, and information you provide or upload.</p>
            <p><strong>Healthcare providers agree to indemnify Medikah</strong> for medical malpractice claims, licensing violations, and violations of cross-border consultation restrictions. Medikah does not indemnify providers for medical malpractice or regulatory violations.</p>

            <hr />

            <h2>11. Dispute Resolution</h2>

            <h3>11.1 Informal Resolution</h3>
            <p>Before filing any legal claim, you agree to contact us at <a href="mailto:legal@medikah.org">legal@medikah.org</a>, describe your concern in detail, and provide opportunity for us to resolve within 60 days.</p>

            <h3>11.2 Arbitration Agreement (United States Users)</h3>
            <p><strong>PLEASE READ CAREFULLY &mdash; THIS AFFECTS YOUR LEGAL RIGHTS.</strong></p>
            <p>If you are a user in the United States, you agree that disputes will be resolved through binding arbitration under American Arbitration Association (AAA) Consumer Arbitration Rules, not court litigation. We pay arbitration fees for claims under $10,000.</p>
            <p><strong>What Can Still Go to Court:</strong> Small claims court, intellectual property disputes, claims for injunctive relief, emergency medical malpractice claims.</p>
            <p><strong>CLASS ACTION WAIVER:</strong> You agree to arbitrate disputes only on an individual basis, not as a class action, class arbitration, or representative action.</p>
            <p><strong>Right to Opt-Out:</strong> You may opt out of arbitration by emailing <a href="mailto:legal@medikah.org">legal@medikah.org</a> within 30 days of accepting these Terms with &ldquo;Arbitration Opt-Out&rdquo; in the subject line.</p>

            <h3>11.3 International Users (Non-US)</h3>
            <p>Consumer protection laws of your country apply. Courts in your country of residence have jurisdiction for consumer claims. Good-faith negotiation required first; mediation available before litigation.</p>

            <h3>11.4 Medical Malpractice Claims</h3>
            <p>Medical malpractice claims against healthcare providers are NOT subject to these dispute resolution provisions. They are governed by healthcare provider agreements and subject to medical malpractice law in the provider&rsquo;s jurisdiction. Medikah is NOT a party to medical malpractice disputes between you and providers.</p>

            <h3>11.5 Venue</h3>
            <p><strong>Exclusive Venue:</strong> New Castle County, Delaware. <strong>Governing Law:</strong> Delaware law governs interpretation of these Terms (except where consumer protection laws of your jurisdiction apply).</p>

            <hr />

            <h2>12. Termination</h2>

            <h3>12.1 Your Right to Terminate</h3>
            <p>You may terminate your account at any time by closing it in Account Settings or emailing <a href="mailto:support@medikah.org">support@medikah.org</a>. Platform access ends immediately. We retain records per legal requirements. Outstanding payment obligations remain. Data available for download for 90 days.</p>

            <h3>12.2 Our Right to Terminate</h3>
            <p>We may suspend or terminate your account if you violate these Terms, engage in prohibited uses, provide false information, as required by law, or if service is discontinued in your jurisdiction. Reasonable advance notice when possible; immediate termination if necessary for safety or legal compliance.</p>

            <h3>12.3 Effect of Termination</h3>
            <p>Upon termination: access ends, ongoing appointments canceled, payment obligations for completed services remain, data retention per Privacy Policy. Dispute resolution, limitation of liability, and indemnification provisions survive.</p>

            <h3>12.4 Ongoing Medical Care</h3>
            <p>If your account is terminated, you remain responsible for continuing care with providers. Medikah&rsquo;s termination does NOT terminate your provider relationships &mdash; those are separate. Download your records before the 90-day deadline.</p>

            <hr />

            <h2>13. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will post updated Terms with new &ldquo;Last Updated&rdquo; date, provide email notification for material changes, and give 30-day notice before material changes take effect. Continued use after notice period constitutes acceptance.</p>
            <p>If we add or change the arbitration provision, you have 30 days to opt out even if you previously accepted arbitration.</p>

            <hr />

            <h2>14. General Provisions</h2>

            <h3>14.1 Entire Agreement</h3>
            <p>These Terms, together with our Privacy Policy and any signed acknowledgment forms, constitute the entire agreement between you and Medikah regarding platform use.</p>

            <h3>14.2 Severability</h3>
            <p>If any provision is found invalid or unenforceable, remaining provisions stay in full effect. If the class action waiver is found unenforceable, the arbitration provision is void and disputes go to court.</p>

            <h3>14.3 Force Majeure</h3>
            <p>We are not liable for delays or failures caused by events beyond our reasonable control, including natural disasters, pandemics, war, government actions, infrastructure failures, or power outages.</p>

            <h3>14.4 Relationship of Parties</h3>
            <p>You and Medikah are independent parties. No partnership, joint venture, employment, or agency relationship is created. Healthcare providers are independent contractors, not employees or agents of Medikah.</p>

            <h3>14.5 Notices</h3>
            <p><strong>To Medikah:</strong></p>
            <ul>
              <li>Legal notices: <a href="mailto:legal@medikah.org">legal@medikah.org</a></li>
              <li>Support: <a href="mailto:support@medikah.org">support@medikah.org</a></li>
              <li>Privacy: <a href="mailto:privacy@medikah.org">privacy@medikah.org</a></li>
            </ul>
            <p><strong>Controlling Version:</strong> English language version controls in case of conflicts with translations.</p>

            <hr />

            <h2>15. Jurisdiction-Specific Provisions</h2>

            <h3>15.1 United States</h3>
            <p><strong>HIPAA:</strong> Business Associate relationship applies. See Privacy Policy for HIPAA rights.</p>
            <p><strong>Texas:</strong> Subject to Texas Medical Practice Act, Texas telemedicine laws, Texas data breach notification law.</p>
            <p><strong>California:</strong> Subject to California telemedicine laws, CCPA/CPRA, California data breach notification law, Unruh Civil Rights Act.</p>
            <p><strong>Federal:</strong> Ryan Haight Act applies to controlled substance prescribing. FTC consumer protection standards apply.</p>

            <h3>15.2 Mexico</h3>
            <p>Subject to Ley General de Salud (General Health Law), LFPDPPP (Mexican privacy law), PROFECO consumer protection standards. Healthcare providers must be licensed by Mexican authorities.</p>

            <h3>15.3 Cross-Border Specific</h3>
            <p>US-Mexico consultations governed by the cross-border provisions in Section 3. Informational consultation framework applies. International payments subject to currency exchange regulations.</p>

            <hr />

            <h2>16. Contact Information</h2>

            <h3>General Support</h3>
            <p><strong>Email:</strong> <a href="mailto:support@medikah.org">support@medikah.org</a><br /><strong>Response Time:</strong> Within 2 business days</p>

            <h3>Legal Department</h3>
            <p><strong>Email:</strong> <a href="mailto:legal@medikah.org">legal@medikah.org</a></p>

            <h3>Privacy Requests</h3>
            <p><strong>Email:</strong> <a href="mailto:privacy@medikah.org">privacy@medikah.org</a></p>

            <h3>Emergency</h3>
            <p><strong>DO NOT CONTACT MEDIKAH FOR MEDICAL EMERGENCIES.</strong> Call local emergency services: United States: 911. Mexico: 911.</p>

            <hr />

            <h2>Final Acknowledgment</h2>
            <p><strong>By using Medikah&rsquo;s platform, you acknowledge and agree that:</strong></p>
            <ul>
              <li>Medikah is a technology platform, NOT a healthcare provider</li>
              <li>Healthcare providers are independent contractors</li>
              <li>Providers may not be licensed in your location</li>
              <li>Cross-border consultations are informational, not treatment</li>
              <li>Diagnosis and treatment require in-person care in provider&rsquo;s country</li>
              <li>You will provide accurate information and accept risks of cross-border healthcare</li>
              <li>You have read and understood these Terms</li>
              <li>You agree to dispute resolution provisions and limitations of liability</li>
            </ul>
            <p><strong>If you do not understand or agree to any part of these Terms, do not use our platform.</strong></p>

            <hr />

            <p className="text-center">
              <strong className="text-clinical-teal">Healthcare Technology That Crosses Borders.</strong><br />
              <strong className="text-inst-blue">Medical Care That Happens In-Person.</strong>
            </p>

            <p className="text-center text-sm text-archival-grey mt-8">
              Medikah Health Coordination Services<br />
              HIPAA-Compliant Technology Platform<br />
              Incorporated in Delaware, USA<br />
              Operating: Texas, California, Mexico
            </p>

            <p className="text-center text-sm text-archival-grey mt-6">
              <em>These Terms of Service were last updated on February 1, 2026.</em>
            </p>

          </div>
        </div>
      </main>

      <footer className="bg-inst-blue px-6 pt-14 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-semibold text-[15px] text-white leading-relaxed mb-4">
              Independent Pan-American Health Infrastructure
            </p>
            <p className="text-sm">
              <a href="mailto:partnerships@medikah.org" className="text-clinical-teal hover:text-white transition-colors">
                partnerships@medikah.org
              </a>
            </p>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-white/60">&copy; 2026 Medikah | Established 2022</p>
            <div className="text-[13px]">
              <Link href="/privacy" className="text-white/60 hover:text-white transition-colors">Privacy Policy</Link>
              <span className="text-white/30 mx-2">|</span>
              <span className="text-white/80">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
