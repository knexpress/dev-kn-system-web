import type { Department } from './types';

export interface PerformanceMetric {
  id: string;
  title: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendPercentage?: number;
  description: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  icon: string;
}

export interface DepartmentPerformance {
  department: Department;
  metrics: PerformanceMetric[];
  overallScore: number;
  lastUpdated: string;
}

// Sales Department Performance Metrics
export const getSalesPerformanceMetrics = (data: any): PerformanceMetric[] => [
  {
    id: 'revenue',
    title: 'Monthly Revenue',
    value: data?.revenue || 0,
    unit: 'AED',
    trend: data?.revenueTrend || 'neutral',
    trendPercentage: data?.revenueTrendPercentage || 0,
    description: 'Total revenue generated this month',
    color: 'success',
    icon: 'DollarSign'
  },
  {
    id: 'leads',
    title: 'New Leads',
    value: data?.newLeads || 0,
    trend: data?.leadsTrend || 'neutral',
    trendPercentage: data?.leadsTrendPercentage || 0,
    description: 'New leads generated this month',
    color: 'primary',
    icon: 'Users'
  },
  {
    id: 'conversion',
    title: 'Conversion Rate',
    value: data?.conversionRate || 0,
    unit: '%',
    trend: data?.conversionTrend || 'neutral',
    trendPercentage: data?.conversionTrendPercentage || 0,
    description: 'Lead to customer conversion rate',
    color: 'warning',
    icon: 'Target'
  },
  {
    id: 'clientSatisfaction',
    title: 'Client Satisfaction',
    value: data?.clientSatisfaction || 0,
    unit: '%',
    trend: data?.satisfactionTrend || 'neutral',
    trendPercentage: data?.satisfactionTrendPercentage || 0,
    description: 'Average client satisfaction score',
    color: 'secondary',
    icon: 'Star'
  }
];

// Operations Department Performance Metrics
export const getOperationsPerformanceMetrics = (data: any): PerformanceMetric[] => [
  {
    id: 'shipments',
    title: 'Shipments Processed',
    value: data?.shipmentsProcessed || 0,
    trend: data?.shipmentsTrend || 'neutral',
    trendPercentage: data?.shipmentsTrendPercentage || 0,
    description: 'Total shipments processed this month',
    color: 'primary',
    icon: 'Package'
  },
  {
    id: 'onTimeDelivery',
    title: 'On-Time Delivery',
    value: data?.onTimeDeliveryRate || 0,
    unit: '%',
    trend: data?.deliveryTrend || 'neutral',
    trendPercentage: data?.deliveryTrendPercentage || 0,
    description: 'Percentage of deliveries made on time',
    color: 'success',
    icon: 'Clock'
  },
  {
    id: 'averageProcessingTime',
    title: 'Avg Processing Time',
    value: data?.avgProcessingTime || 0,
    unit: 'hrs',
    trend: data?.processingTrend || 'neutral',
    trendPercentage: data?.processingTrendPercentage || 0,
    description: 'Average time to process shipments',
    color: 'warning',
    icon: 'Timer'
  },
  {
    id: 'errorRate',
    title: 'Error Rate',
    value: data?.errorRate || 0,
    unit: '%',
    trend: data?.errorTrend || 'neutral',
    trendPercentage: data?.errorTrendPercentage || 0,
    description: 'Percentage of shipments with errors',
    color: 'destructive',
    icon: 'AlertTriangle'
  }
];

// Finance Department Performance Metrics
export const getFinancePerformanceMetrics = (data: any): PerformanceMetric[] => [
  {
    id: 'collections',
    title: 'Collections Rate',
    value: data?.collectionsRate || 0,
    unit: '%',
    trend: data?.collectionsTrend || 'neutral',
    trendPercentage: data?.collectionsTrendPercentage || 0,
    description: 'Percentage of invoices collected on time',
    color: 'success',
    icon: 'CreditCard'
  },
  {
    id: 'cashFlow',
    title: 'Cash Flow',
    value: data?.cashFlow || 0,
    unit: 'AED',
    trend: data?.cashFlowTrend || 'neutral',
    trendPercentage: data?.cashFlowTrendPercentage || 0,
    description: 'Net cash flow this month',
    color: data?.cashFlow >= 0 ? 'success' : 'destructive',
    icon: 'TrendingUp'
  },
  {
    id: 'invoiceProcessing',
    title: 'Invoice Processing',
    value: data?.invoiceProcessingTime || 0,
    unit: 'days',
    trend: data?.invoiceTrend || 'neutral',
    trendPercentage: data?.invoiceTrendPercentage || 0,
    description: 'Average time to process invoices',
    color: 'warning',
    icon: 'FileText'
  },
  {
    id: 'budgetUtilization',
    title: 'Budget Utilization',
    value: data?.budgetUtilization || 0,
    unit: '%',
    trend: data?.budgetTrend || 'neutral',
    trendPercentage: data?.budgetTrendPercentage || 0,
    description: 'Percentage of allocated budget used',
    color: data?.budgetUtilization > 90 ? 'destructive' : 'primary',
    icon: 'PieChart'
  }
];

// HR Department Performance Metrics
export const getHRPerformanceMetrics = (data: any): PerformanceMetric[] => [
  {
    id: 'employeeSatisfaction',
    title: 'Employee Satisfaction',
    value: data?.employeeSatisfaction || 0,
    unit: '%',
    trend: data?.satisfactionTrend || 'neutral',
    trendPercentage: data?.satisfactionTrendPercentage || 0,
    description: 'Average employee satisfaction score',
    color: 'success',
    icon: 'Heart'
  },
  {
    id: 'attendance',
    title: 'Attendance Rate',
    value: data?.attendanceRate || 0,
    unit: '%',
    trend: data?.attendanceTrend || 'neutral',
    trendPercentage: data?.attendanceTrendPercentage || 0,
    description: 'Average employee attendance rate',
    color: 'primary',
    icon: 'Calendar'
  },
  {
    id: 'newHires',
    title: 'New Hires',
    value: data?.newHires || 0,
    trend: data?.hiresTrend || 'neutral',
    trendPercentage: data?.hiresTrendPercentage || 0,
    description: 'New employees hired this month',
    color: 'secondary',
    icon: 'UserPlus'
  },
  {
    id: 'trainingCompletion',
    title: 'Training Completion',
    value: data?.trainingCompletion || 0,
    unit: '%',
    trend: data?.trainingTrend || 'neutral',
    trendPercentage: data?.trainingTrendPercentage || 0,
    description: 'Percentage of employees who completed training',
    color: 'warning',
    icon: 'GraduationCap'
  }
];

// Management Department Performance Metrics (Company-wide KPIs)
export const getManagementPerformanceMetrics = (data: any): PerformanceMetric[] => [
  {
    id: 'totalRevenue',
    title: 'Total Company Revenue',
    value: data?.totalRevenue || 0,
    unit: 'AED',
    trend: data?.revenueTrend || 'neutral',
    trendPercentage: data?.revenueTrendPercentage || 0,
    description: 'Total revenue across all departments',
    color: 'success',
    icon: 'DollarSign'
  },
  {
    id: 'totalShipments',
    title: 'Total Shipments',
    value: data?.totalShipments || 0,
    trend: data?.shipmentsTrend || 'neutral',
    trendPercentage: data?.shipmentsTrendPercentage || 0,
    description: 'Total shipments processed company-wide',
    color: 'primary',
    icon: 'Package'
  },
  {
    id: 'customerSatisfaction',
    title: 'Overall Customer Satisfaction',
    value: data?.customerSatisfaction || 0,
    unit: '%',
    trend: data?.satisfactionTrend || 'neutral',
    trendPercentage: data?.satisfactionTrendPercentage || 0,
    description: 'Company-wide customer satisfaction score',
    color: 'secondary',
    icon: 'Star'
  },
  {
    id: 'operationalEfficiency',
    title: 'Operational Efficiency',
    value: data?.operationalEfficiency || 0,
    unit: '%',
    trend: data?.efficiencyTrend || 'neutral',
    trendPercentage: data?.efficiencyTrendPercentage || 0,
    description: 'Overall company operational efficiency',
    color: 'warning',
    icon: 'Gauge'
  },
  {
    id: 'employeeProductivity',
    title: 'Employee Productivity',
    value: data?.employeeProductivity || 0,
    unit: '%',
    trend: data?.productivityTrend || 'neutral',
    trendPercentage: data?.productivityTrendPercentage || 0,
    description: 'Overall employee productivity score',
    color: 'primary',
    icon: 'Users'
  },
  {
    id: 'profitMargin',
    title: 'Profit Margin',
    value: data?.profitMargin || 0,
    unit: '%',
    trend: data?.marginTrend || 'neutral',
    trendPercentage: data?.marginTrendPercentage || 0,
    description: 'Company profit margin percentage',
    color: 'success',
    icon: 'TrendingUp'
  },
  {
    id: 'marketShare',
    title: 'Market Share Growth',
    value: data?.marketShare || 0,
    unit: '%',
    trend: data?.marketTrend || 'neutral',
    trendPercentage: data?.marketTrendPercentage || 0,
    description: 'Market share growth percentage',
    color: 'secondary',
    icon: 'BarChart3'
  },
  {
    id: 'riskAssessment',
    title: 'Risk Assessment Score',
    value: data?.riskAssessment || 0,
    unit: '%',
    trend: data?.riskTrend || 'neutral',
    trendPercentage: data?.riskTrendPercentage || 0,
    description: 'Overall company risk assessment',
    color: data?.riskAssessment > 70 ? 'destructive' : 'success',
    icon: 'AlertCircle'
  }
];

// IT Department Performance Metrics
export const getITPerformanceMetrics = (data: any): PerformanceMetric[] => [
  {
    id: 'systemUptime',
    title: 'System Uptime',
    value: data?.systemUptime || 0,
    unit: '%',
    trend: data?.uptimeTrend || 'neutral',
    trendPercentage: data?.uptimeTrendPercentage || 0,
    description: 'System availability percentage',
    color: 'success',
    icon: 'Server'
  },
  {
    id: 'ticketsResolved',
    title: 'Tickets Resolved',
    value: data?.ticketsResolved || 0,
    trend: data?.ticketsTrend || 'neutral',
    trendPercentage: data?.ticketsTrendPercentage || 0,
    description: 'IT tickets resolved this month',
    color: 'primary',
    icon: 'CheckCircle'
  },
  {
    id: 'averageResolutionTime',
    title: 'Avg Resolution Time',
    value: data?.avgResolutionTime || 0,
    unit: 'hrs',
    trend: data?.resolutionTrend || 'neutral',
    trendPercentage: data?.resolutionTrendPercentage || 0,
    description: 'Average time to resolve IT issues',
    color: 'warning',
    icon: 'Clock'
  },
  {
    id: 'securityScore',
    title: 'Security Score',
    value: data?.securityScore || 0,
    unit: '%',
    trend: data?.securityTrend || 'neutral',
    trendPercentage: data?.securityTrendPercentage || 0,
    description: 'Overall system security score',
    color: 'destructive',
    icon: 'Shield'
  }
];

// Auditor Department Performance Metrics
export const getAuditorPerformanceMetrics = (data: any): PerformanceMetric[] => [
  {
    id: 'auditsCompleted',
    title: 'Audits Completed',
    value: data?.auditsCompleted || 0,
    trend: data?.auditsTrend || 'neutral',
    trendPercentage: data?.auditsTrendPercentage || 0,
    description: 'Audits completed this month',
    color: 'primary',
    icon: 'Search'
  },
  {
    id: 'complianceRate',
    title: 'Compliance Rate',
    value: data?.complianceRate || 0,
    unit: '%',
    trend: data?.complianceTrend || 'neutral',
    trendPercentage: data?.complianceTrendPercentage || 0,
    description: 'Overall compliance rate',
    color: 'success',
    icon: 'CheckCircle2'
  },
  {
    id: 'findingsResolved',
    title: 'Findings Resolved',
    value: data?.findingsResolved || 0,
    unit: '%',
    trend: data?.findingsTrend || 'neutral',
    trendPercentage: data?.findingsTrendPercentage || 0,
    description: 'Percentage of audit findings resolved',
    color: 'warning',
    icon: 'AlertTriangle'
  },
  {
    id: 'riskScore',
    title: 'Risk Score',
    value: data?.riskScore || 0,
    unit: '%',
    trend: data?.riskTrend || 'neutral',
    trendPercentage: data?.riskTrendPercentage || 0,
    description: 'Overall risk assessment score',
    color: data?.riskScore > 70 ? 'destructive' : 'secondary',
    icon: 'AlertCircle'
  }
];

// Get performance metrics based on department
export const getDepartmentPerformanceMetrics = (department: Department, data: any): PerformanceMetric[] => {
  switch (department) {
    case 'Sales':
      return getSalesPerformanceMetrics(data);
    case 'Operations':
      return getOperationsPerformanceMetrics(data);
    case 'Finance':
      return getFinancePerformanceMetrics(data);
    case 'HR':
      return getHRPerformanceMetrics(data);
    case 'Management':
      return getManagementPerformanceMetrics(data);
    case 'IT':
      return getITPerformanceMetrics(data);
    case 'Auditor':
      return getAuditorPerformanceMetrics(data);
    default:
      return [];
  }
};

// Calculate overall performance score
export const calculateOverallScore = (metrics: PerformanceMetric[]): number => {
  if (metrics.length === 0) return 0;
  
  const totalScore = metrics.reduce((sum, metric) => {
    let score = metric.value;
    
    // Normalize different metrics to 0-100 scale
    if (metric.id === 'revenue' || metric.id === 'cashFlow') {
      // For monetary values, use a percentage of target
      score = Math.min((metric.value / 100000) * 100, 100);
    } else if (metric.id === 'leads' || metric.id === 'shipments' || metric.id === 'ticketsResolved') {
      // For counts, use a percentage of target
      score = Math.min((metric.value / 100) * 100, 100);
    } else if (metric.id === 'errorRate' || metric.id === 'riskScore') {
      // For rates that should be low, invert the score
      score = Math.max(100 - metric.value, 0);
    }
    
    return sum + score;
  }, 0);
  
  return Math.round(totalScore / metrics.length);
};
