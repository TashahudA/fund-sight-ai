export type AuditStatus = "New" | "In Progress" | "Complete" | "On Hold" | "RFI Sent";
export type Opinion = "Unqualified" | "Qualified" | null;
export type FindingStatus = "Pass" | "Flag" | "Fail";
export type RFIPriority = "High" | "Med" | "Low";
export type RFIStatus = "Open" | "Overdue" | "Resolved";
export type RFICategory = "Missing Document" | "Clarification" | "Discrepancy";

export interface Audit {
  id: string;
  fundName: string;
  firmName: string;
  year: string;
  status: AuditStatus;
  dateCreated: string;
  opinion: Opinion;
  auditor: string;
  dateRequested: string;
  turnaround: string;
}

export interface Finding {
  area: string;
  status: FindingStatus;
  detail: string;
  reference: string;
}

export interface RFI {
  id: string;
  title: string;
  fundName: string;
  priority: RFIPriority;
  status: RFIStatus;
  category: RFICategory;
  dateRaised: string;
  timeAgo: string;
  messages: RFIMessage[];
}

export interface RFIMessage {
  id: string;
  sender: string;
  senderType: "auditor" | "accountant";
  text: string;
  timestamp: string;
  attachments?: string[];
}

export interface AuditDocument {
  name: string;
  type: string;
  date: string;
}

export const audits: Audit[] = [
  { id: "1", fundName: "Smith Family Super Fund", firmName: "BDO Australia", year: "2024-25", status: "In Progress", dateCreated: "2025-02-14", opinion: null, auditor: "James Mitchell", dateRequested: "2025-02-10", turnaround: "4.2 hrs" },
  { id: "2", fundName: "Johnson Retirement Fund", firmName: "PKF Melbourne", year: "2024-25", status: "Complete", dateCreated: "2025-01-28", opinion: "Unqualified", auditor: "James Mitchell", dateRequested: "2025-01-25", turnaround: "3.8 hrs" },
  { id: "3", fundName: "Williams SMSF", firmName: "HLB Mann Judd", year: "2024-25", status: "RFI Sent", dateCreated: "2025-02-05", opinion: null, auditor: "James Mitchell", dateRequested: "2025-02-01", turnaround: "—" },
  { id: "4", fundName: "Chen Investment Super", firmName: "BDO Australia", year: "2023-24", status: "Complete", dateCreated: "2024-11-12", opinion: "Qualified", auditor: "James Mitchell", dateRequested: "2024-11-08", turnaround: "5.1 hrs" },
  { id: "5", fundName: "O'Brien Family Fund", firmName: "Pitcher Partners", year: "2024-25", status: "New", dateCreated: "2025-02-18", opinion: null, auditor: "James Mitchell", dateRequested: "2025-02-18", turnaround: "—" },
  { id: "6", fundName: "Patel Super Fund", firmName: "RSM Australia", year: "2024-25", status: "In Progress", dateCreated: "2025-02-10", opinion: null, auditor: "James Mitchell", dateRequested: "2025-02-08", turnaround: "—" },
  { id: "7", fundName: "Taylor Pension Fund", firmName: "PKF Melbourne", year: "2023-24", status: "Complete", dateCreated: "2024-10-20", opinion: "Unqualified", auditor: "James Mitchell", dateRequested: "2024-10-15", turnaround: "3.2 hrs" },
  { id: "8", fundName: "Garcia SMSF", firmName: "HLB Mann Judd", year: "2024-25", status: "On Hold", dateCreated: "2025-01-15", opinion: null, auditor: "James Mitchell", dateRequested: "2025-01-12", turnaround: "—" },
];

export const findings: Finding[] = [
  { area: "Sole Purpose Test", status: "Pass", detail: "All assets held solely for the purpose of providing retirement benefits to members. No evidence of personal use of fund assets.", reference: "SIS Act s62" },
  { area: "In-House Asset Test", status: "Pass", detail: "In-house assets represent 2.1% of total fund assets, well within the 5% statutory limit.", reference: "SIS Act s71" },
  { area: "Contribution Caps", status: "Pass", detail: "All member contributions are within the concessional ($30,000) and non-concessional ($120,000) caps for the financial year.", reference: "ITAA 1997 Div 291" },
  { area: "Pension Minimums", status: "Flag", detail: "Member 2 pension drawdown is at 3.8% — slightly below the minimum 4% requirement for their age bracket. Requires trustee confirmation.", reference: "SIS Reg 1.06(9A)" },
  { area: "Investment Strategy", status: "Pass", detail: "Investment strategy is documented, reviewed annually, and reflects current asset allocation. Diversification is adequate.", reference: "SIS Reg 4.09" },
  { area: "Arm's Length Dealings", status: "Pass", detail: "All transactions between the fund and related parties conducted at market value with appropriate documentation.", reference: "SIS Act s109" },
  { area: "Separation of Assets", status: "Pass", detail: "Fund assets are clearly separated from personal assets of members and trustees.", reference: "SIS Act s52(2)(d)" },
  { area: "Trustee Declarations", status: "Pass", detail: "All trustee declarations signed and dated within the required timeframe.", reference: "SIS Act s104A" },
  { area: "Minutes of Meetings", status: "Flag", detail: "Investment decision on 15 March 2025 lacks documented minutes. All other meetings properly recorded.", reference: "SIS Reg 4.04" },
  { area: "Lodgement History", status: "Pass", detail: "SMSF annual return lodged on time for the past 3 years. No outstanding lodgements.", reference: "TAA 1953 s388-55" },
];

export const auditDocuments: AuditDocument[] = [
  { name: "Annual Financial Statements.pdf", type: "Financial", date: "2025-02-10" },
  { name: "Member Statements.pdf", type: "Member", date: "2025-02-10" },
  { name: "Bank Statements - CBA.pdf", type: "Banking", date: "2025-02-10" },
  { name: "Investment Portfolio Report.xlsx", type: "Investment", date: "2025-02-10" },
  { name: "Trust Deed.pdf", type: "Trust", date: "2025-02-10" },
  { name: "Minutes of Meeting - July 2024.pdf", type: "Minutes", date: "2025-02-11" },
  { name: "Actuarial Certificate.pdf", type: "Actuarial", date: "2025-02-12" },
];

export const rfis: RFI[] = [
  {
    id: "rfi-1", title: "Missing bank statement for March 2025", fundName: "Smith Family Super Fund",
    priority: "High", status: "Open", category: "Missing Document", dateRaised: "2025-02-16", timeAgo: "2 days ago",
    messages: [
      { id: "m1", sender: "James Mitchell", senderType: "auditor", text: "Hi, we're missing the CBA bank statement for March 2025 for the Smith Family Super Fund. Could you please provide this at your earliest convenience? We need it to complete the cash reconciliation.", timestamp: "2025-02-16 09:30" },
      { id: "m2", sender: "Sarah Chen", senderType: "accountant", text: "Hi James, thanks for letting me know. I'll request it from the bank today. Should have it to you by end of week.", timestamp: "2025-02-16 14:15" },
      { id: "m3", sender: "James Mitchell", senderType: "auditor", text: "Great, thanks Sarah. Please also confirm that the closing balance matches the general ledger.", timestamp: "2025-02-16 15:00" },
    ],
  },
  {
    id: "rfi-2", title: "Clarification on related party loan terms", fundName: "Williams SMSF",
    priority: "High", status: "Overdue", category: "Clarification", dateRaised: "2025-02-08", timeAgo: "10 days ago",
    messages: [
      { id: "m4", sender: "James Mitchell", senderType: "auditor", text: "The related party loan of $150,000 to the Williams Family Trust needs clarification. Can you provide the loan agreement and confirm the interest rate applied is at arm's length?", timestamp: "2025-02-08 10:00" },
    ],
  },
  {
    id: "rfi-3", title: "Pension drawdown calculation discrepancy", fundName: "Smith Family Super Fund",
    priority: "Med", status: "Open", category: "Discrepancy", dateRaised: "2025-02-14", timeAgo: "4 days ago",
    messages: [
      { id: "m5", sender: "James Mitchell", senderType: "auditor", text: "Member 2's pension drawdown appears to be at 3.8%, which is below the minimum 4% requirement. Could you please verify the calculation and confirm the total pension payments made during the year?", timestamp: "2025-02-14 11:00" },
      { id: "m6", sender: "Sarah Chen", senderType: "accountant", text: "Checking now. I think there may be a payment made in June that wasn't captured in the report we sent.", timestamp: "2025-02-15 09:30", attachments: ["Pension_Payments_Summary.pdf"] },
    ],
  },
  {
    id: "rfi-4", title: "Investment strategy review document", fundName: "Patel Super Fund",
    priority: "Low", status: "Open", category: "Missing Document", dateRaised: "2025-02-12", timeAgo: "6 days ago",
    messages: [
      { id: "m7", sender: "James Mitchell", senderType: "auditor", text: "Could you please provide the signed investment strategy review document for FY2024-25?", timestamp: "2025-02-12 14:00" },
    ],
  },
  {
    id: "rfi-5", title: "Property valuation report", fundName: "Chen Investment Super",
    priority: "Med", status: "Resolved", category: "Missing Document", dateRaised: "2024-11-10", timeAgo: "3 months ago",
    messages: [
      { id: "m8", sender: "James Mitchell", senderType: "auditor", text: "We need the independent property valuation report for the commercial property held by the fund.", timestamp: "2024-11-10 09:00" },
      { id: "m9", sender: "David Park", senderType: "accountant", text: "Here's the valuation report from Knight Frank dated October 2024.", timestamp: "2024-11-12 10:30", attachments: ["Knight_Frank_Valuation_Oct2024.pdf"] },
      { id: "m10", sender: "James Mitchell", senderType: "auditor", text: "Perfect, thank you David. This is exactly what we needed.", timestamp: "2024-11-12 11:00" },
    ],
  },
  {
    id: "rfi-6", title: "Trustee declaration forms", fundName: "Garcia SMSF",
    priority: "Low", status: "Resolved", category: "Missing Document", dateRaised: "2025-01-20", timeAgo: "1 month ago",
    messages: [
      { id: "m11", sender: "James Mitchell", senderType: "auditor", text: "The signed trustee declarations for the current year are missing from the document pack.", timestamp: "2025-01-20 10:00" },
      { id: "m12", sender: "Maria Lopez", senderType: "accountant", text: "Apologies, attaching them now.", timestamp: "2025-01-21 08:45", attachments: ["Trustee_Declaration_Garcia_2025.pdf"] },
    ],
  },
];
