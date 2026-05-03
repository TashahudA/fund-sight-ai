import { Link } from "react-router-dom";

const sections: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "1. Nature of the Service",
    paragraphs: [
      "1.1 Auditron is a software-as-a-service tool that uses artificial intelligence and automated analysis to assist registered SMSF auditors in performing audits of self-managed superannuation funds. The Service generates draft findings, draft request-for-information items (RFIs), draft audit opinions, draft working papers, draft planning documents, and draft audit reports based on documents you upload.",
      "1.2 AUDITRON IS A TOOL. IT IS NOT AN AUDITOR. IT DOES NOT PROVIDE AUDIT SERVICES, AUDIT OPINIONS, PROFESSIONAL JUDGEMENT, OR REGULATED FINANCIAL SERVICES. ALL OUTPUTS PRODUCED BY THE SERVICE ARE DRAFTS INTENDED FOR REVIEW, MODIFICATION, AND APPROVAL BY YOU AS THE REGISTERED AUDITOR.",
      "1.3 You acknowledge and agree that the Service is designed to assist, not replace, the work of a qualified, registered, and independent SMSF auditor. The Service does not perform an audit within the meaning of the Superannuation Industry (Supervision) Act 1993 (Cth) (\"SIS Act\"), the Australian Auditing Standards, or any other applicable legislation, regulation, or professional standard.",
      "1.4 You retain full and sole professional responsibility for every aspect of the audit engagement, including but not limited to scope determination, materiality assessment, evidence sufficiency, professional scepticism, exercise of professional judgement, formation of the audit opinion, and signing of the audit report.",
      "1.5 Auditron does not represent, warrant, or guarantee that any output of the Service is correct, complete, accurate, current, or fit for any particular purpose. Outputs may contain errors, omissions, hallucinations, misclassifications, incorrect references, or analytical inaccuracies that you must independently identify and correct prior to relying on them.",
    ],
  },
  {
    heading: "2. Your Professional Obligations as a Registered Auditor",
    paragraphs: [
      "2.1 If you use the Service as an SMSF auditor, you represent and warrant that you are a registered SMSF auditor under section 128B of the SIS Act and hold all current registrations, licences, qualifications, professional memberships, and indemnity insurance required to perform SMSF audits in Australia.",
      "2.2 You acknowledge that you are bound at all times by the SIS Act, the Australian Auditing Standards (including ASA 200, ASA 240, ASA 315, ASA 330, ASA 500, ASA 700, ASA 705 and all other applicable standards), the Auditing and Assurance Standards Board pronouncements (including GS 009 Auditing Self-Managed Superannuation Funds), the APES 110 Code of Ethics for Professional Accountants (including independence requirements), and all other applicable laws, regulations, and professional standards.",
      "2.3 Your use of the Service does not relieve you of any of your professional obligations. You remain solely responsible for ensuring every audit you sign complies with all applicable standards and laws. You must independently verify every finding, every figure, every reference, every classification, every risk assessment, and every conclusion presented to you by the Service.",
      "2.4 You must form your own independent professional opinion in respect of every audit. You must not sign an audit report unless and until you have satisfied yourself, through your own professional judgement and procedures, that the audit has been performed in accordance with all applicable standards.",
      "2.5 You acknowledge that you are responsible for maintaining adequate audit documentation and audit files in accordance with ASA 230 and applicable professional standards, regardless of whether outputs of the Service form part of those files.",
      "2.6 You must not represent, suggest, or imply to any client, regulator, court, tribunal, or third party that the Service is the auditor, has performed the audit, or has formed any audit opinion. The auditor of record is, and remains at all times, you.",
      "2.7 You acknowledge and agree that Auditron does not provide, and is not a substitute for, professional indemnity insurance. Auditron does not maintain professional indemnity coverage on your behalf and is not liable for any claims, demands, complaints, or proceedings brought against you by any client, member, regulator, or third party in connection with any audit you perform, regardless of whether outputs of the Service were used in that audit. You are solely responsible for maintaining your own professional indemnity insurance at levels appropriate to the audits you undertake, and you warrant that such insurance is current and in force at all times during your use of the Service.",
      "2.8 You expressly acknowledge that no element of the fees paid to Auditron constitutes consideration for any form of professional indemnity, errors and omissions, or liability coverage in your favour or in favour of your clients.",
    ],
  },
  {
    heading: "3. Eligibility, Accounts, and Access",
    paragraphs: [
      "3.1 To use the Service you must be at least 18 years old, have the legal capacity to enter into a binding contract, and not be prohibited from using the Service under any applicable law.",
      "3.2 You must register an account and provide accurate, complete, and current information. You must keep your account information up to date at all times.",
      "3.3 You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account, whether or not authorised by you. You must notify Auditron immediately upon becoming aware of any unauthorised access.",
      "3.4 You must not share account credentials with any other person. Each user of the Service requires their own account. Auditron reserves the right to require additional verification, multi-factor authentication, or other security measures at any time.",
      "3.5 Auditron may refuse to register, suspend, or terminate any account at its sole discretion, including where it suspects misuse, fraud, breach of these Terms, or risk to the integrity of the Service or other users.",
    ],
  },
  {
    heading: "4. Permitted Use and Restrictions",
    paragraphs: [
      "4.1 Subject to your compliance with these Terms and payment of all applicable fees, Auditron grants you a non-exclusive, non-transferable, non-sublicensable, revocable licence to access and use the Service for the sole purpose of preparing draft audit working papers, opinions, RFIs, planning documents, and audit reports for SMSF audits you are professionally engaged to perform.",
      "4.2 You must not, and must not permit any other person to: (a) reverse engineer, decompile, disassemble, or attempt to derive the source code of any part of the Service; (b) modify, adapt, translate, or create derivative works of the Service; (c) circumvent, disable, or interfere with security or access controls; (d) use the Service to develop or train any competing product, service, or AI model; (e) scrape, harvest, or extract data from the Service except as expressly permitted; (f) use the Service to upload, store, or process any content that is unlawful, infringing, defamatory, or that you do not have the right to upload; (g) use the Service in any manner that exceeds the scope of the licence granted; (h) sublicense, resell, rent, lease, or otherwise commercially exploit the Service except as expressly permitted; (i) use the Service to perform any function for which it is not designed; or (j) use the Service in any way that violates applicable law.",
      "4.3 You must not use the Service to upload, transmit, or store any content for which you do not have full legal authority to do so, including any content that infringes intellectual property rights, breaches confidentiality obligations, or violates privacy laws.",
      "4.4 Auditron reserves the right to monitor, audit, and review use of the Service to ensure compliance with these Terms. Auditron may, without notice and at its discretion, suspend or terminate access where it reasonably suspects breach.",
    ],
  },
  {
    heading: "5. Client Data, Confidentiality, and Privacy",
    paragraphs: [
      "5.1 You acknowledge that any documents, information, or data you upload to the Service (\"Client Data\") may include sensitive personal information, financial information, and information subject to professional confidentiality obligations under APES 110 and other applicable standards.",
      "5.2 You represent and warrant that you have all necessary rights, authorisations, and consents to upload Client Data to the Service, including any consents required under the Privacy Act 1988 (Cth), the Australian Privacy Principles, and any contractual confidentiality obligations you owe to your clients.",
      "5.3 You are solely responsible for: (a) ensuring you have a lawful basis to upload and process Client Data through the Service; (b) informing your clients of your use of cloud-based audit tools where required; (c) including appropriate provisions in your client engagement letters to permit your use of the Service; and (d) complying with all applicable privacy, confidentiality, and data protection laws.",
      "5.4 Auditron processes Client Data on your instructions for the sole purpose of providing the Service. Client Data is stored on Australian-based servers and is not transferred outside Australia in the ordinary course of providing the Service. Auditron applies industry-standard administrative, physical, and technical safeguards to protect Client Data, including encryption in transit and at rest using AES-256 or equivalent.",
      "5.5 Despite the safeguards described in clause 5.4, no system is completely secure. Auditron does not guarantee that Client Data will not be subject to unauthorised access, loss, alteration, or disclosure. You acknowledge and accept that risk.",
      "5.6 You may export Client Data at any time through the Service while your account is active. Following termination of your account for any reason, Client Data will remain available for export for a period of ninety (90) days. After expiry of that ninety-day period, Auditron will permanently delete all Client Data within a further thirty (30) days, except where retention is required by law, regulation, or legitimate ongoing legal proceedings. Once deleted, Client Data cannot be recovered.",
      "5.7 Auditron's collection, use, and disclosure of personal information is governed by the Auditron Privacy Policy, which forms part of these Terms by reference.",
      "5.8 Security Incidents and Notifiable Data Breaches. In the event of a confirmed security incident materially affecting Client Data, Auditron will: (a) take commercially reasonable steps to contain and remediate the incident; (b) where the incident constitutes an eligible data breach under the Notifiable Data Breaches scheme of the Privacy Act 1988 (Cth), assess and notify in accordance with that scheme; and (c) provide you with reasonable information about the nature and scope of the incident sufficient to enable you to discharge your own notification obligations to clients, regulators, or affected individuals. You acknowledge that you are an independent controller of personal information contained in Client Data and that you bear primary responsibility for your own notification and response obligations.",
      "5.9 You must notify Auditron without undue delay (and in any event within 24 hours) of becoming aware of any actual or suspected unauthorised access to your account, compromise of your credentials, or other security incident that may affect the Service or other users.",
      "5.10 Auditron's total aggregate liability for any security incident, data breach, or unauthorised disclosure of Client Data is subject to and limited by the limitations of liability set out in clause 10 of these Terms.",
    ],
  },
  {
    heading: "6. Artificial Intelligence and Automated Processing",
    paragraphs: [
      "6.1 The Service uses third-party large language models, machine learning models, and automated processing technology to generate outputs. You acknowledge that AI-generated outputs are inherently probabilistic, may produce inaccurate, incomplete, biased, or misleading results, and may \"hallucinate\" — that is, produce confident-sounding outputs that are factually incorrect.",
      "6.2 You must independently verify every output of the Service before relying on it for any professional, regulatory, or commercial purpose. You must not assume that any output is accurate, complete, or fit for purpose without your own review.",
      "6.3 Auditron may, in providing the Service, transmit Client Data to third-party AI service providers for processing. You consent to such processing as part of receiving the Service. Auditron will use commercially reasonable efforts to ensure such providers maintain appropriate data security and confidentiality.",
      "6.4 AI models and outputs may change without notice as underlying models are updated, retrained, or replaced. Auditron does not warrant consistency of output between sessions, accounts, or model versions.",
      "6.5 Auditron does not use Client Data uploaded by you to train, retrain, or fine-tune any AI model owned or operated by Auditron, except where you expressly opt in to such use.",
      "6.6 Third-Party Service Providers. The Service is built upon and depends on third-party infrastructure, software, and services, including but not limited to cloud hosting providers (such as Amazon Web Services), large language model providers (such as Anthropic, OpenAI, or Google), authentication providers, payment processors, email and notification providers, and other supporting services (collectively, \"Third-Party Providers\"). You acknowledge that: (a) Auditron does not control Third-Party Providers; (b) Third-Party Providers may experience outages, errors, security incidents, or service changes outside Auditron's control; (c) Auditron is not liable for any loss, damage, delay, breach, error, or interruption caused by, or arising in connection with, any Third-Party Provider; and (d) the limitations of liability in clause 10 apply equally to losses arising from Third-Party Provider failures.",
      "6.7 Beta and Experimental Features. From time to time Auditron may make available beta, preview, alpha, or experimental features, models, or capabilities (collectively, \"Beta Features\"). Beta Features are clearly identified as such within the Service. Beta Features are provided strictly on an \"as is\" and \"as available\" basis, with no warranty of any kind, no service level commitment, and no guarantee of accuracy, performance, or continuity. Beta Features may be modified, suspended, or withdrawn at any time without notice. You use Beta Features at your sole risk, and Auditron's liability in connection with Beta Features is excluded to the maximum extent permitted by law.",
    ],
  },
  {
    heading: "7. Service Availability, Maintenance, and Operational Disclaimer",
    paragraphs: [
      "7.1 No Service Level Agreement. The Service is provided on a best-efforts basis. Auditron does not commit to any specific level of availability, uptime, processing time, response time, or operational performance. No service level agreement applies to your use of the Service unless expressly agreed in writing in a separate enterprise agreement signed by an authorised representative of Auditron.",
      "7.2 Outages and Interruptions. The Service may be unavailable from time to time due to scheduled maintenance, unscheduled maintenance, infrastructure failures, third-party provider outages, internet disruptions, security incidents, force majeure events, or other causes. Auditron may perform maintenance with or without notice and is not liable for any loss arising from such unavailability.",
      "7.3 No Processing Time Guarantee. While Auditron uses reasonable efforts to process audits in a timely manner, processing times depend on factors including queue length, document size, model availability, and Third-Party Provider performance. Auditron does not warrant that any audit, RFI, opinion, or output will be generated, delivered, or returned within any particular timeframe.",
      "7.4 Failed Uploads and Failed Generations. The Service may from time to time fail to upload documents, fail to generate outputs, or produce incomplete outputs. You are responsible for verifying the successful upload and successful generation of any output before relying on it. Auditron is not liable for any loss arising from a failed upload, failed generation, or incomplete output.",
      "7.5 Backup Workflows. You acknowledge that audit deadlines are your sole responsibility. You must maintain backup workflows, alternative processes, and contingency arrangements sufficient to meet your professional and regulatory deadlines independently of the availability of the Service. Auditron is not liable for any deadline you miss, opportunity you lose, or penalty you incur as a consequence of any unavailability of the Service for any reason whatsoever.",
      "7.6 No Data Loss Liability. Although Auditron maintains commercially reasonable backup procedures, you remain responsible for maintaining your own copies of any documents you upload and any outputs you require. Auditron is not liable for loss of, corruption to, or inaccessibility of Client Data or outputs except to the extent caused by Auditron's gross negligence or wilful misconduct.",
    ],
  },
  {
    heading: "8. Fair Use and Acceptable Use",
    paragraphs: [
      "8.1 Fair Use Principle. The Service is intended for ordinary, good-faith professional use by registered SMSF auditors performing genuine audit engagements. The Service is not intended for, and you must not use the Service for, automated, bulk, or non-genuine processing that is inconsistent with this purpose.",
      "8.2 Prohibited Patterns of Use. Without limiting clause 4.2, you must not: (a) submit non-genuine, fabricated, synthetic, or test fund packs other than those provided by Auditron for evaluation purposes; (b) use the Service to process the same fund pack or substantially similar content repetitively in a manner inconsistent with ordinary audit practice; (c) submit a volume of audits or document uploads that materially exceeds the volume reasonably expected of a registered auditor or audit firm of comparable size; (d) use automated scripts, bots, or other programmatic means to interact with the Service except via authorised APIs; (e) use the Service to benchmark, test, or analyse the underlying AI models or system behaviour for any commercial purpose; or (f) circumvent or attempt to circumvent any rate limit, processing limit, or usage cap applied to your account.",
      "8.3 Excess Usage. Auditron may monitor account usage and may, at its discretion, apply rate limits, processing limits, or temporary suspensions to accounts exhibiting unusual, excessive, or potentially abusive usage patterns. Auditron may also charge additional fees for excess usage at the then-current per-audit rate.",
      "8.4 Cost Recovery for Abusive Use. If Auditron determines, acting reasonably, that your use of the Service has materially exceeded fair use or breached this clause 8, Auditron may invoice you for the additional costs incurred (including AI inference costs, infrastructure costs, and reasonable administrative costs), suspend your account, or terminate your account in accordance with clause 15.",
      "8.5 No Competing Use. You must not use the Service or any output of the Service to develop, train, benchmark, or improve any product or service that competes with Auditron, or to assist any third party in doing so.",
    ],
  },
  {
    heading: "9. Fees, Payment, Chargebacks, and Recovery",
    paragraphs: [
      "9.1 You agree to pay all fees applicable to your use of the Service as set out on the Auditron pricing page or in any agreement you have entered with Auditron. Fees are payable in Australian dollars unless otherwise specified.",
      "9.2 Pay-as-you-go fees are charged per audit at the time the audit is run. Volume plan fees are charged annually in advance based on the committed volume tier.",
      "9.3 Volume plan commitments are non-refundable. Unused audits within a volume plan do not roll over to the following year and are forfeited at the end of the annual term.",
      "9.4 All fees are exclusive of GST unless otherwise stated. Where GST applies, you must pay the GST amount in addition to the listed fee.",
      "9.5 Auditron may change its fees at any time by giving you at least 30 days' notice. Fee changes will not apply retrospectively to volume plan commitments already paid.",
      "9.6 Failure to pay fees when due may result in suspension or termination of your account. Auditron may charge interest on overdue amounts at the rate prescribed under the Penalty Interest Rates Act 1983 (Vic) or such other rate as is permitted by law.",
      "9.7 Except as required by Australian Consumer Law, all fees are non-refundable. You are not entitled to a refund for unused audits, unused subscription periods, or because you have ceased to use the Service.",
      "9.8 Failed Payments. If a payment fails for any reason (including insufficient funds, expired card, declined transaction, or bank reversal), Auditron may: (a) retry the payment using the same or a different payment method on file; (b) suspend your access to the Service until payment is received; (c) charge a reasonable failed-payment administration fee; and (d) require pre-payment for further use of the Service.",
      "9.9 Chargebacks and Disputed Payments. You agree not to initiate a chargeback, dispute, or reversal in respect of any payment made for the Service except where you have first contacted Auditron in writing and given Auditron a reasonable opportunity (not less than 14 days) to investigate and respond. Initiating a chargeback in breach of this clause is a material breach of these Terms and may result in immediate account termination, retention of fees already paid, and recovery action by Auditron.",
      "9.10 Recovery Costs. Where Auditron is required to recover overdue amounts from you, you must pay all reasonable costs of recovery, including debt collection agency fees, legal fees on a solicitor-and-own-client basis, and court costs, in addition to the overdue amount and interest.",
      "9.11 No Set-Off. You must pay all amounts owing to Auditron in full without any set-off, counterclaim, deduction, or withholding except where required by law.",
    ],
  },
  {
    heading: "10. Intellectual Property Rights",
    paragraphs: [
      "10.1 All intellectual property rights in the Service, including the underlying software, models, prompts, system architecture, design, branding, documentation, and any improvements or enhancements thereto, are and remain the exclusive property of Auditron or its licensors. Nothing in these Terms transfers any such rights to you.",
      "10.2 You retain all rights, title, and interest in Client Data you upload. You grant Auditron a non-exclusive, royalty-free, worldwide licence to host, copy, transmit, display, and process Client Data solely as required to provide the Service to you.",
      "10.3 Outputs generated by the Service from Client Data you upload (\"Outputs\") are owned by you, subject to Auditron's underlying intellectual property in the Service itself. You may use, modify, and distribute Outputs in accordance with these Terms and applicable law.",
      "10.4 Auditron may, on an aggregated and anonymised basis, use metadata, usage analytics, and aggregate insights derived from your use of the Service to improve, develop, and market the Service, provided no Client Data, personal information, or information identifying you or your clients is disclosed.",
      "10.5 If you provide Auditron with feedback, suggestions, ideas, or proposals regarding the Service, you grant Auditron a perpetual, irrevocable, royalty-free, worldwide licence to use such feedback for any purpose without obligation to you.",
    ],
  },
  {
    heading: "11. Confidentiality and Protection of Auditron Information",
    paragraphs: [
      "11.1 Definition. \"Auditron Confidential Information\" means any non-public information disclosed to or accessed by you in connection with the Service, including but not limited to: (a) the design, architecture, source code, prompts, prompt structures, system messages, and workflow logic of the Service; (b) Auditron's proprietary audit methodologies, frameworks, scoring systems, and risk classification logic; (c) any pre-release feature, roadmap, or strategic plan; (d) pricing, commercial terms, and customer lists; (e) any information marked as confidential or which a reasonable person would understand to be confidential; and (f) the existence and terms of any commercial discussions between you and Auditron.",
      "11.2 User Obligations. You must: (a) keep all Auditron Confidential Information strictly confidential; (b) not disclose Auditron Confidential Information to any third party except where required by law; (c) not use Auditron Confidential Information for any purpose other than your authorised use of the Service; (d) not copy, reproduce, screenshot for distribution, publish, post, share on social media, or republish Auditron Confidential Information; (e) not reverse engineer or attempt to extract Auditron Confidential Information from the Service; and (f) take reasonable steps to protect Auditron Confidential Information from unauthorised access or disclosure.",
      "11.3 Permitted Disclosure. You may disclose Auditron Confidential Information only to the minimum extent required by a valid court order, regulatory direction, or legal obligation, and only after promptly notifying Auditron (where lawful to do so) so that Auditron may seek a protective order or other appropriate remedy.",
      "11.4 Survival. The obligations in this clause 11 survive termination of these Terms and continue in force for a period of five (5) years from the date of termination, except that obligations relating to trade secrets continue indefinitely for so long as the relevant information remains a trade secret.",
      "11.5 Equitable Relief. You acknowledge that breach of this clause 11 may cause Auditron irreparable harm for which monetary damages are inadequate, and that Auditron is entitled to seek injunctive and other equitable relief in addition to any other available remedy.",
    ],
  },
  {
    heading: "12. Disclaimers and Exclusions",
    paragraphs: [
      "12.1 TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTY OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.",
      "12.2 Without limiting clause 12.1, Auditron does not warrant that: (a) the Service will be uninterrupted, error-free, secure, or free of viruses or harmful components; (b) the Service or any output will meet your requirements, expectations, or any particular standard of accuracy or quality; (c) any defect or error will be corrected; (d) the Service is suitable for any particular audit, fund, or scenario; (e) outputs comply with any specific professional, regulatory, or legal requirement; or (f) the Service will produce results consistent with prior or subsequent uses.",
      "12.3 Auditron expressly disclaims any warranty that use of the Service will result in compliance with the SIS Act, the Australian Auditing Standards, APES 110, GS 009, or any other applicable law, regulation, or professional standard. Compliance is and remains your sole professional responsibility.",
      "12.4 Nothing in these Terms excludes, restricts, or modifies any right, guarantee, warranty, or remedy that cannot lawfully be excluded under the Australian Consumer Law or other applicable Australian law. Where any such right, guarantee, warranty, or remedy is implied into these Terms and cannot be excluded, Auditron's liability for breach is limited, to the extent permitted by law, to the supplying of the Service again or payment of the cost of having the Service supplied again.",
      "12.5 You acknowledge that you are not entering into these Terms in reliance on any representation, warranty, or statement not expressly set out in these Terms.",
    ],
  },
  {
    heading: "13. Limitation of Liability",
    paragraphs: [
      "13.1 TO THE MAXIMUM EXTENT PERMITTED BY LAW, AUDITRON, ITS DIRECTORS, OFFICERS, EMPLOYEES, CONTRACTORS, AGENTS, LICENSORS, AND SUPPLIERS WILL NOT BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES ARISING FROM OR RELATED TO YOUR USE OF, OR INABILITY TO USE, THE SERVICE.",
      "13.2 Without limiting clause 13.1, Auditron will not be liable for any: (a) loss of profit, revenue, business, contracts, anticipated savings, or business opportunity; (b) loss of goodwill or reputation; (c) loss, corruption, or unauthorised disclosure of data; (d) regulatory fines, penalties, sanctions, or disciplinary action against you or any third party; (e) loss arising from the suspension, withdrawal, or cancellation of your auditor registration; (f) liability you incur to your clients, their members, regulators, or any other third party arising from any audit you sign; (g) liability arising from any error, inaccuracy, omission, or hallucination in any output of the Service; (h) loss arising from any outage, downtime, maintenance, failed upload, failed generation, or unavailability of the Service; (i) loss arising from any act, omission, failure, breach, or interruption of any Third-Party Provider; (j) loss of any audit deadline or professional or regulatory deadline; or (k) any other loss that does not arise as a direct, natural, and reasonably foreseeable consequence of Auditron's breach.",
      "13.3 TO THE MAXIMUM EXTENT PERMITTED BY LAW, AUDITRON'S TOTAL AGGREGATE LIABILITY TO YOU FROM ALL CAUSES OF ACTION, WHETHER IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STATUTE, OR OTHERWISE, ARISING FROM OR RELATED TO THE SERVICE OR THESE TERMS, IS LIMITED TO THE AMOUNTS PAID BY YOU TO AUDITRON IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED AUSTRALIAN DOLLARS (AUD $100), WHICHEVER IS GREATER.",
      "13.4 You expressly acknowledge that Auditron is a tool provided to assist registered auditors and that the limitations of liability in this clause are a fundamental basis on which Auditron makes the Service available to you. Without these limitations the fees charged for the Service would be materially higher or the Service would not be available.",
      "13.5 These limitations apply regardless of whether Auditron has been advised of, or knew of, the possibility of such loss or damage, and regardless of whether the limitation is held to fail of its essential purpose.",
    ],
  },
  {
    heading: "14. Indemnity",
    paragraphs: [
      "14.1 You agree to indemnify, defend, and hold harmless Auditron, its directors, officers, employees, contractors, agents, licensors, and suppliers from and against any and all claims, demands, actions, suits, proceedings, losses, damages, liabilities, judgements, costs, and expenses (including legal fees on a full indemnity basis) arising from or related to: (a) your use of the Service; (b) your breach of these Terms; (c) your breach of any law, regulation, or professional standard; (d) any audit you sign or any audit opinion you issue, regardless of whether based in whole or in part on outputs of the Service; (e) any claim brought by your client, their members, a regulator, or any third party in connection with any audit you perform; (f) any unauthorised access to or use of your account; (g) your infringement of any intellectual property right or privacy right of any third party; or (h) Client Data you upload to the Service.",
      "14.2 Auditron may, at its option, assume the exclusive defence and control of any matter subject to indemnity by you, in which case you agree to cooperate fully in such defence.",
    ],
  },
  {
    heading: "15. No Replacement for Professional Judgement",
    paragraphs: [
      "15.1 You acknowledge and agree that the Service is a tool only and is not, and cannot be, a substitute for: (a) the professional judgement, scepticism, and independence required of a registered SMSF auditor; (b) compliance with the Australian Auditing Standards or any other applicable professional standard; (c) the formation of an independent audit opinion; (d) the conduct of an audit in accordance with the SIS Act and applicable regulations; or (e) the exercise of due care and skill expected of an auditor.",
      "15.2 Reliance on outputs of the Service without independent verification, professional review, and the application of professional judgement constitutes a misuse of the Service for which Auditron accepts no responsibility.",
      "15.3 If you are not a registered SMSF auditor, you must not use the Service to perform any function reserved by law for a registered auditor, and you must not represent or imply to any third party that any output of the Service constitutes a completed audit.",
    ],
  },
  {
    heading: "16. Suspension and Termination",
    paragraphs: [
      "16.1 You may terminate your account at any time by following the cancellation process within the Service or by contacting Auditron. Termination does not entitle you to a refund of pre-paid fees except as required by Australian Consumer Law.",
      "16.2 Auditron may suspend or terminate your access to the Service at any time, with or without notice, where: (a) you breach these Terms; (b) Auditron reasonably suspects misuse, fraud, or unlawful conduct; (c) required by law or regulator; (d) continued provision would expose Auditron to legal, regulatory, or reputational risk; (e) you fail to pay fees when due; (f) your usage breaches the Fair Use clause; or (g) Auditron decides to discontinue the Service.",
      "16.3 Upon termination, your right to use the Service ceases immediately. Auditron will retain Client Data for the export period set out in clause 5.6, after which it will be permanently deleted. You remain responsible for all obligations accrued prior to termination.",
      "16.4 Clauses that by their nature should survive termination, including but not limited to clauses 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, and 21, survive termination of these Terms.",
    ],
  },
  {
    heading: "17. Changes to the Service and these Terms",
    paragraphs: [
      "17.1 Auditron may modify, update, suspend, or discontinue any part of the Service at any time, with or without notice. Auditron is not liable to you or any third party for any modification, suspension, or discontinuance.",
      "17.2 Auditron may amend these Terms at any time by posting an updated version on its website or by providing notice to you. Continued use of the Service after the effective date of any change constitutes acceptance of the updated Terms. If you do not agree with the changes, you must cease using the Service.",
    ],
  },
  {
    heading: "18. Privacy and Data Protection",
    paragraphs: [
      "18.1 Auditron will handle personal information in accordance with the Privacy Act 1988 (Cth), the Australian Privacy Principles, and the Auditron Privacy Policy.",
      "18.2 You acknowledge that you are an independent controller of any personal information of your clients, their members, or other individuals contained in Client Data. Auditron acts as a processor of such personal information on your instructions for the limited purpose of providing the Service.",
      "18.3 You agree to comply with all applicable privacy and data protection laws in connection with your use of the Service, including providing required notices to data subjects and obtaining required consents.",
    ],
  },
  {
    heading: "19. Regulatory Cooperation and Lawful Disclosure",
    paragraphs: [
      "19.1 You acknowledge and consent that Auditron may, where reasonably required to do so, disclose information (including Client Data and your account information) to: (a) the Australian Taxation Office; (b) the Australian Securities and Investments Commission; (c) the Australian Prudential Regulation Authority; (d) the Office of the Australian Information Commissioner; (e) the Australian Federal Police or other law enforcement agencies; (f) any court, tribunal, or arbitral body of competent jurisdiction; (g) any other regulator with lawful authority to require such disclosure; or (h) any party where disclosure is required by Australian law, court order, subpoena, or binding regulatory direction.",
      "19.2 Where lawful and practical to do so, Auditron will use reasonable efforts to notify you in advance of any such disclosure to enable you to seek a protective order or otherwise object to the disclosure. Auditron is not required to notify you where notification is prohibited by law, court order, or where notification would prejudice an investigation.",
      "19.3 You agree to cooperate with Auditron in good faith in respect of any regulatory enquiry, investigation, or proceeding involving the Service or your use of the Service.",
      "19.4 Nothing in these Terms requires Auditron to challenge, oppose, or delay compliance with any apparent lawful regulatory or judicial demand.",
    ],
  },
  {
    heading: "20. Notices and Communications",
    paragraphs: [
      "20.1 Auditron may provide notices to you by email to the address associated with your account, by in-product notification, or by posting on its website. You consent to receive notices by such means.",
      "20.2 You must send notices to Auditron in writing to the address listed in the Auditron Privacy Policy or by email to the support address published on the Auditron website.",
    ],
  },
  {
    heading: "21. Dispute Resolution and Governing Law",
    paragraphs: [
      "21.1 These Terms are governed by the laws of the State of South Australia, Australia. Each party submits to the exclusive jurisdiction of the courts of South Australia and the courts of appeal from them.",
      "21.2 Before commencing any court proceeding (other than for urgent injunctive relief), the parties must attempt in good faith to resolve any dispute by direct negotiation between authorised representatives. If the dispute is not resolved within 30 days of notice, the parties must attempt to resolve it through mediation administered by the Resolution Institute under its Mediation Rules before commencing proceedings.",
      "21.3 Nothing in this clause prevents a party from seeking urgent injunctive or other equitable relief from a court of competent jurisdiction.",
    ],
  },
  {
    heading: "22. General Provisions",
    paragraphs: [
      "22.1 Entire Agreement. These Terms, together with the Privacy Policy and any additional terms agreed in writing, constitute the entire agreement between the parties and supersede all prior agreements, understandings, and representations regarding the subject matter.",
      "22.2 Severability. If any provision of these Terms is held invalid or unenforceable, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will continue in full force and effect.",
      "22.3 No Waiver. Failure by Auditron to enforce any provision of these Terms is not a waiver of that provision or any other provision.",
      "22.4 Assignment. You may not assign or transfer your rights under these Terms without Auditron's prior written consent. Auditron may assign these Terms at any time, including in connection with a merger, acquisition, sale of assets, or operation of law.",
      "22.5 Force Majeure. Auditron is not liable for any failure or delay in performance caused by circumstances beyond its reasonable control, including acts of God, natural disasters, war, terrorism, civil unrest, government action, internet or telecommunications failures, third-party service provider failures, or pandemic-related disruptions.",
      "22.6 Independent Contractors. The parties are independent contractors. Nothing in these Terms creates a partnership, joint venture, agency, fiduciary, or employment relationship.",
      "22.7 No Third-Party Beneficiaries. These Terms are for the benefit of the parties and their permitted successors and assigns, and do not confer any rights on any third party.",
      "22.8 Counterparts and Electronic Signature. These Terms may be accepted electronically. Your acceptance constitutes a binding signature.",
      "22.9 Headings. Headings are for convenience only and do not affect interpretation.",
      "22.10 Currency. All references to dollars or $ are to Australian dollars unless otherwise specified.",
    ],
  },
];

export default function Terms() {
  const headingStyle: React.CSSProperties = {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 700,
    fontSize: "20px",
    color: "#111111",
    margin: "40px 0 16px",
    letterSpacing: "-0.01em",
  };
  const bodyStyle: React.CSSProperties = {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 400,
    fontSize: "15px",
    lineHeight: 1.7,
    color: "#333333",
    margin: "0 0 14px",
  };

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #eeeeee", padding: "20px 32px", background: "#ffffff" }}>
        <div className="mx-auto flex items-center justify-between" style={{ maxWidth: "1100px" }}>
          <Link to="/" style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "18px", color: "#111111", textDecoration: "none" }}>
            Auditron
          </Link>
          <Link to="/" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: "#555555", textDecoration: "none" }}>
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto" style={{ maxWidth: "780px", padding: "64px 32px 96px" }}>
        <h1 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 700, fontSize: "44px", color: "#111111", letterSpacing: "-0.02em", textAlign: "center", margin: "0 0 8px" }}>
          Auditron
        </h1>
        <h2 style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontSize: "26px", color: "#111111", textAlign: "center", margin: "0 0 40px" }}>
          Terms of Service
        </h2>

        <p style={bodyStyle}>
          These Terms of Service ("Terms") form a legally binding agreement between you ("you", "your", or "User") and Orkid Puri Pty Ltd (ABN 48 617 154 819) trading as Auditron ("Auditron", "we", "us", or "our"), an Australian proprietary limited company with its registered office in South Australia, Australia.
        </p>
        <p style={bodyStyle}>
          By creating an account, accessing, or using any part of the Auditron platform (the "Service"), you confirm that you have read, understood, and agreed to be bound by these Terms in their entirety. If you do not agree, you must not access or use the Service.
        </p>
        <p style={bodyStyle}>
          These Terms apply whether you use the Service as an individual registered SMSF auditor, as part of an audit firm, or on behalf of an organisation. Where you use the Service on behalf of an entity, you represent and warrant that you are authorised to bind that entity, and references to "you" include both you personally and that entity.
        </p>
        <p style={{ ...bodyStyle, fontWeight: 700 }}>
          PLEASE READ THESE TERMS CAREFULLY. THEY CONTAIN IMPORTANT PROVISIONS REGARDING THE NATURE OF THE SERVICE, THE LIMITATIONS OF AUDITRON'S LIABILITY, YOUR PROFESSIONAL OBLIGATIONS AS A REGISTERED AUDITOR, AND THE ALLOCATION OF RISK BETWEEN THE PARTIES.
        </p>

        {sections.map((s) => (
          <section key={s.heading}>
            <h3 style={headingStyle}>{s.heading}</h3>
            {s.paragraphs.map((p, i) => (
              <p key={i} style={bodyStyle}>{p}</p>
            ))}
          </section>
        ))}

        <h3 style={headingStyle}>Acknowledgement</h3>
        <p style={bodyStyle}>
          By ticking the box at signup, creating an account, or accessing the Service, you confirm that you have read these Terms in full, understood them, and agree to be bound by them. You further confirm that, if you use the Service in your capacity as a registered SMSF auditor, you accept that the Service is a tool to assist your work and that all professional responsibility for any audit you sign rests solely and exclusively with you.
        </p>
        <p style={{ ...bodyStyle, marginTop: "32px", color: "#555555" }}>
          Orkid Puri Pty Ltd trading as Auditron<br />
          ABN 48 617 154 819 · South Australia, Australia
        </p>
      </main>

      {/* Footer */}
      <footer style={{ background: "#0a0a0a", borderTop: "1px solid #1a1a1a", padding: "32px" }}>
        <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-4" style={{ maxWidth: "1100px" }}>
          <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: "#555555" }}>© 2026 Auditron Australia. All rights reserved.</span>
          <Link to="/" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: "#555555", textDecoration: "none" }}>Home</Link>
        </div>
      </footer>
    </div>
  );
}