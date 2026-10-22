export type SetupStatus =
  | 'not_started'
  | 'in_progress'
  | 'needs_review'
  | 'complete'
  | 'not_applicable';

export type FinanceSetupStep = {
  key: string;
  letter: string;
  title: string;
  optional?: boolean;
  href?: string | null;
  href_label?: string | null;
  status: SetupStatus;
  missing: string[];
  errors: string[];
  warnings: string[];
  evidence?: Record<string, unknown>;
  responsible_name?: string;
  updated_at?: string | null;
  reviewer_name?: string;
  reviewed_at?: string | null;
  not_applicable?: boolean;
  na_reason?: string;
  blocked_by?: string[];
  dependencies_met?: boolean;
};

export type FinanceSetupDashboard = {
  setup: {
    business_profile: Record<string, string>;
    foundations: Record<string, any>;
    permission_matrix: Record<string, Record<string, boolean>>;
    permission_enforcement_enabled: boolean;
    approval_policies: Record<string, { require_separate_approver?: boolean; roles?: string[] }>;
    account_mappings: Record<string, string>;
    backup_review: { reviewed?: boolean; notes?: string };
    go_live: { approved?: boolean; comments?: string; approver_name?: string; approved_at?: string };
  };
  steps: Record<string, FinanceSetupStep>;
  overall: {
    percent: number;
    required_done: number;
    required_total: number;
    optional_done: number;
    optional_total: number;
  };
  trial_balance: { debit: number; credit: number; balanced: boolean; accounts: number };
  codes: Record<string, string>;
  counts: Record<string, number>;
};

export const STATUS_LABEL: Record<SetupStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  needs_review: 'Needs review',
  complete: 'Complete',
  not_applicable: 'Not applicable',
};
