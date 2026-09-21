'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  Target, 
  Star, 
  Package, 
  Clock, 
  Timer, 
  AlertTriangle,
  CreditCard,
  TrendingUp,
  FileText,
  PieChart,
  Heart,
  Calendar,
  UserPlus,
  GraduationCap,
  BarChart3,
  Gauge,
  Server,
  CheckCircle,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { secureLog } from '@/lib/secure-logger';
import { getDepartmentPerformanceMetrics, calculateOverallScore, type PerformanceMetric } from '@/lib/performance-metrics';
import { calculateCompanyMetrics } from '@/lib/metrics-calculator';
import type { Department } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PerformanceMetricsProps {
  department: Department;
}

const iconMap = {
  DollarSign,
  Users,
  Target,
  Star,
  Package,
  Clock,
  Timer,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  FileText,
  PieChart,
  Heart,
  Calendar,
  UserPlus,
  GraduationCap,
  BarChart3,
  Gauge,
  Server,
  CheckCircle,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle
};

export default function PerformanceMetrics({ department }: PerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
    
    // Auto-refresh every 30 seconds for Management department
    if (department === 'Management') {
      const interval = setInterval(() => {
        fetchPerformanceData();
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [department]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      // For Management department, calculate metrics from actual data
      if (department === 'Management') {
        const companyMetrics = await calculateCompanyMetrics();
        const performanceMetrics = getDepartmentPerformanceMetrics(department, companyMetrics);
        setMetrics(performanceMetrics);
        setOverallScore(calculateOverallScore(performanceMetrics));
      } else {
        // For other departments (Sales, Operations, Finance, etc.), use API endpoint
        secureLog.debug('[Performance Metrics] Fetching metrics for department', { department });
        const response = await apiClient.getDepartmentPerformance(department);
        secureLog.debug('[Performance Metrics] API response', { department, success: response.success });

        if (response.success && response.data) {
          const performanceMetrics = getDepartmentPerformanceMetrics(department, response.data);
          setMetrics(performanceMetrics);
          setOverallScore(calculateOverallScore(performanceMetrics));
        } else {
          secureLog.warn('[Performance Metrics] API returned error', { department, error: response.error });
          // Set empty metrics if API fails
          setMetrics([]);
          setOverallScore(0);
        }
      }
    } catch (error) {
      secureLog.error('[Performance Metrics] Error fetching performance data', { department, error });
      // Set empty metrics on error
      setMetrics([]);
      setOverallScore(0);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-emerald-600';
      case 'down':
        return 'text-rose-600';
      default:
        return 'text-slate-500';
    }
  };

  /** Subtle Maglo tone accents — no loud filled color borders */
  const getToneAccent = (color: string) => {
    switch (color) {
      case 'success':
        return 'ring-emerald-100/70';
      case 'warning':
        return 'ring-amber-100/70';
      case 'destructive':
        return 'ring-rose-100/70';
      case 'primary':
        return 'ring-sky-100/70';
      default:
        return 'ring-transparent';
    }
  };

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-white/80 bg-gradient-to-br from-white to-slate-50/80 p-3.5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]"
          >
            <div className="h-3 w-3/4 rounded bg-slate-200/80" />
            <div className="mt-3 h-6 w-1/2 rounded bg-slate-200/80" />
            <div className="mt-2 h-2.5 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Overall Performance Score */}
      <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-sky-50/80 via-white to-slate-50/80 p-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] ring-1 ring-sky-100/80 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-slate-400">
              Overall Performance Score
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Based on key performance indicators for {department} department
            </p>
          </div>
          <Badge
            variant="outline"
            className="rounded-xl border-sky-200/80 bg-white px-3 py-1 text-base font-semibold tabular-nums text-slate-900"
          >
            {overallScore}%
          </Badge>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-500"
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* Performance Metrics — Maglo ErpStatStrip language */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, idx) => {
          const IconComponent = iconMap[metric.icon as keyof typeof iconMap] || Target;
          
          return (
            <div
              key={metric.id}
              className={cn(
                'rounded-2xl border border-white/80 bg-gradient-to-br from-white to-slate-50/80 p-3.5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] transition-shadow duration-200 hover:shadow-[0_14px_36px_-18px_rgba(15,23,42,0.4)]',
                idx === 0 && 'from-sky-50 to-white ring-1 ring-sky-100/80',
                idx !== 0 && getToneAccent(metric.color) && `ring-1 ${getToneAccent(metric.color)}`
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium tracking-wide text-slate-400">
                  {metric.title}
                </p>
                <IconComponent className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="font-semibold tabular-nums tracking-tight text-slate-900 text-[15px] sm:text-base">
                  {metric.value.toLocaleString()}
                  {metric.unit && (
                    <span className="ml-1 text-[11px] font-medium text-slate-400">{metric.unit}</span>
                  )}
                </p>
                {metric.trend && metric.trendPercentage != null && (
                  <span className={cn('text-[11px] font-medium tabular-nums', getTrendColor(metric.trend))}>
                    {getTrendIcon(metric.trend)}
                    {Math.abs(metric.trendPercentage).toFixed(1)}%
                  </span>
                )}
              </div>
              {metric.description && (
                <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">{metric.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
