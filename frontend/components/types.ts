export type User = { id: string; name: string; email: string; role: string; verified?: number };
export type Customer = {
  id: string;
  name: string;
  industry: string;
  description: string;
  contacts: string;
  goals: string;
};
export type Activity = {
  id: string;
  action: string;
  details: string;
  user_name: string;
  created_at: string;
};
export type Project = {
  id: string;
  customer_id: string;
  name: string;
  customer_name?: string;
  owner_name?: string;
  description: string;
  objectives: string;
  state: string;
  owner_id: string;
  start_date: string;
  due_date: string;
  archived: number;
  created_at: string;
};
export type ProjectDetail = Project & {
  customer: Customer;
  can_manage: boolean;
  states: string[];
  members: User[];
  activity: Activity[];
};
export type ProjectFile = {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  kind: string;
  version: number;
  deleted: number;
  created_at: string;
};
export type Agent = {
  id: string;
  name: string;
  instructions: string;
  tools: string[];
  file_ids: string[];
};
export type Invitation = {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  requester_name: string;
  state: string;
};
export type Company = {
  name: string;
  primary: string;
  accent: string;
  font: string;
  tagline: string;
  folders: string[];
};
export type Settings = {
  company: Company;
  ai_mode: string;
  storage: string;
  microsoft_connected: boolean;
  office_desktop_enabled: boolean;
  ai: { provider: string; chat_model: string; document_model: string; reasoning_effort: string };
  models: string[];
};
export type Source = { id: string; name: string; version: number; truncated?: boolean };
export type ChartData = {
  label_column: number;
  value_column: number;
  file_id: string;
  project_id: string;
  version: number;
  sheet: string;
  range: string;
  title: string;
  labels: string[];
  values: number[];
};
export type Preview = {
  type: string;
  version: number;
  paragraphs?: { index: number; text: string; style: string }[];
  tables?: string[][][];
  slides?: { index: number; shapes: { index: number; text: string }[] }[];
  sheets?: { name: string; rows: (string | number | null)[][]; truncated: boolean }[];
};
export type Proposal = {
  id: string;
  name: string;
  base_version: number | null;
  payload: {
    type: string;
    title: string;
    summary: string;
    sections?: { heading: string; body: string }[];
    slides?: { title: string; body: string; notes: string }[];
    rows?: (string | number | null)[][];
    edits?: Record<string, string | number | null>[];
    sources: Source[];
    chart?: ChartData;
  };
};
export type Run = (task: () => Promise<void>) => Promise<void>;
