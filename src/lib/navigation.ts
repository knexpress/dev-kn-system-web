import {
  LayoutDashboard,
  Users,
  Package,
  UserCircle,
  FileCheck2,
  type LucideIcon,
  FileSearch,
  Truck,
  ClipboardCheck,
  XCircle,
  DollarSign,
  History,
  FileDown,
  BookOpen,
  Receipt,
  SlidersHorizontal,
  Contact,
  PackageSearch,
  Fingerprint,
} from 'lucide-react';
import type { Department, DepartmentData } from './types';

export const CRM_URL = 'https://crm.productionknexpress.com/';
export const CUSTOMER_TRACKING_URL = 'https://knex-ae.vercel.app/';
export const TRUEID_BOOKING_URL = 'https://trueid-seven.vercel.app/';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  departments: Department[];
  hiddenFromRail?: boolean;
  external?: boolean;
}

export function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export function navLinkExtra(link: Pick<NavLink, 'href' | 'external'>) {
  if (link.external || isExternalHref(link.href)) {
    return { target: '_blank' as const, rel: 'noopener noreferrer' };
  }
  return {};
}

const allLinks: NavLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    departments: ['Sales', 'Operations', 'Finance', 'HR', 'Management', 'IT', 'Auditor'],
  },
  {
    href: '/dashboard/clients',
    label: 'Clients',
    icon: Users,
    departments: ['Sales', 'Management', 'IT'],
  },
  {
    href: CRM_URL,
    label: 'CRM',
    icon: Contact,
    departments: ['Sales'],
    external: true,
  },
  {
    href: CUSTOMER_TRACKING_URL,
    label: 'Customer Tracking',
    icon: PackageSearch,
    departments: ['Sales'],
    external: true,
  },
  {
    href: TRUEID_BOOKING_URL,
    label: 'TrueID Booking',
    icon: Fingerprint,
    departments: ['Sales'],
    external: true,
  },
  {
    href: '/dashboard/invoice-requests',
    label: 'Invoice Requests',
    icon: Package,
    departments: ['Sales', 'Operations', 'Finance', 'IT'],
  },
  {
    href: '/dashboard/booking-forms',
    label: 'Booking Forms',
    icon: FileDown,
    departments: ['Sales', 'Operations', 'IT'],
  },
  {
    href: '/dashboard/review-requests',
    label: 'Cargo Status',
    icon: FileCheck2,
    departments: ['Operations', 'Auditor', 'IT'],
  },
  {
    href: '/dashboard/requests',
    label: 'All Requests',
    icon: Package,
    departments: ['Management', 'Auditor', 'IT'],
  },
  {
    href: '/dashboard/quotations',
    label: 'Quotations',
    icon: Receipt,
    departments: ['Operations', 'Finance', 'Management', 'IT'],
  },
  {
    href: '/dashboard/accounting',
    label: 'Accounting',
    icon: BookOpen,
    departments: ['Finance', 'Management', 'Auditor', 'IT'],
  },
  {
    href: '/dashboard/finance-setup',
    label: 'Finance Setup',
    icon: SlidersHorizontal,
    departments: ['Finance', 'Management', 'IT'],
    hiddenFromRail: true,
  },
  {
    href: '/dashboard/price-brackets',
    label: 'Price Brackets',
    icon: DollarSign,
    departments: ['Finance', 'IT'],
  },
  {
    href: '/dashboard/delivery-assignments',
    label: 'Delivery Assignments',
    icon: Truck,
    departments: ['Finance', 'Management', 'IT'],
  },
  {
    href: '/dashboard/reports/audit',
    label: 'Audit Report',
    icon: FileSearch,
    departments: ['Finance', 'Auditor', 'IT'], // Removed 'Management' - managers should not see audit reports
  },
  {
    href: '/dashboard/users',
    label: 'User Management',
    icon: UserCircle,
    departments: ['IT'], // Only IT department (superadmin) can access
  },
  {
    href: '/dashboard/employees',
    label: 'Employee Management',
    icon: Users,
    departments: ['IT', 'Management'], // SuperAdmin and Manager (ADMIN) can access
  },
  {
    href: '/dashboard/booking-requests',
    label: 'Booking Requests',
    icon: ClipboardCheck,
    departments: ['Management', 'IT'],
  },
  {
    href: '/dashboard/logs',
    label: 'Logs',
    icon: History,
    departments: ['Management', 'IT'],
  },
  {
    href: '/dashboard/rejected-requests',
    label: 'Rejected Requests',
    icon: XCircle,
    departments: ['Sales', 'Operations', 'IT'],
  },
];

/** Maps a nav href to the activity key used by useActivityBadges */
const ACTIVITY_KEYS: Record<string, string> = {
  '/dashboard/accounting': 'invoices',
  '/dashboard/invoice-requests': 'invoice_requests',
  '/dashboard/requests': 'requests',
  '/dashboard/delivery-assignments': 'delivery_assignments',
  '/dashboard/collections': 'collections',
  '/dashboard/jobs': 'jobs',
  '/dashboard/reports/audit': 'reports',
  '/dashboard/quotations': 'quotation_requests',
};

export const activityKeyForHref = (href: string): string | undefined => ACTIVITY_KEYS[href];

export const isNavLinkActive = (pathname: string, href: string) => {
  if (isExternalHref(href)) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const getNavigationLinks = (department: DepartmentData | null) => {
  if (!department) return [];
  const departmentName = department.name as Department;
  
  // A bit of a hack to hide the old requests page for ops and show the new one
  if (departmentName === 'Operations') {
    return allLinks.filter((link) => link.href !== '/dashboard/requests' && link.departments.includes(departmentName));
  }
   if (departmentName === 'Sales') {
    return allLinks.filter(
      (link) =>
        link.href !== '/dashboard/requests' &&
        link.href !== '/dashboard/quotations' &&
        link.departments.includes(departmentName)
    );
  }
  return allLinks.filter((link) => link.departments.includes(departmentName));
};

export const getRailLinks = (department: DepartmentData | null) =>
  getNavigationLinks(department).filter((link) => !link.hiddenFromRail);

export const getFooterLinks = (department: DepartmentData | null) =>
  getNavigationLinks(department).filter((link) => link.hiddenFromRail);
