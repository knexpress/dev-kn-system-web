'use client';

import { useAuth } from '@/hooks/use-auth';
import { getNavigationLinks } from '@/lib/navigation';
import PerformanceMetrics from '@/components/performance-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { userProfile, department } = useAuth();

  const quickLinks = getNavigationLinks(department).filter(link => link.href !== '/dashboard');


  if (!userProfile || !department) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Section with Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border border-primary/20">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Welcome back, <span className="text-gradient">{userProfile?.full_name?.split(' ')[0] || 'User'}</span>!
          </h1>
          <p className="text-base text-muted-foreground">
            {department.name === 'Management' 
              ? 'Company-wide performance overview and strategic insights.'
              : `Performance overview for the ${department.name} department.`
            }
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* Performance Metrics */}
      <PerformanceMetrics department={department.name as any} />

      {/* Department Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-lift border-border/50 transition-industrial overflow-hidden group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4 relative z-10">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <span>{department.name === 'Management' ? 'Company Insights' : 'Department Insights'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-muted/40 to-muted/20 p-4 transition-all hover:from-muted/60 hover:to-muted/40 border border-border/50">
              <span className="text-sm font-semibold text-foreground">
                {department.name === 'Management' ? 'Company Productivity' : 'Team Productivity'}
              </span>
              <span className="text-base font-bold text-green-600 bg-green-50 px-3 py-1 rounded-md">+12%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-muted/40 to-muted/20 p-4 transition-all hover:from-muted/60 hover:to-muted/40 border border-border/50">
              <span className="text-sm font-semibold text-foreground">
                {department.name === 'Management' ? 'Strategic Goals Achievement' : 'Goal Achievement'}
              </span>
              <span className="text-base font-bold text-primary bg-primary/10 px-3 py-1 rounded-md">85%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-muted/40 to-muted/20 p-4 transition-all hover:from-muted/60 hover:to-muted/40 border border-border/50">
              <span className="text-sm font-semibold text-foreground">
                {department.name === 'Management' ? 'Cross-Department Efficiency' : 'Process Efficiency'}
              </span>
              <span className="text-base font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-md">92%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift border-border/50 transition-industrial overflow-hidden group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4 relative z-10">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <span>Recent Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative z-10">
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-muted/40 to-muted/20 p-4 transition-all hover:from-muted/60 hover:to-muted/40 border border-border/50">
              <span className="text-sm font-semibold text-foreground">This Month vs Last Month</span>
              <span className="text-base font-bold text-green-600 bg-green-50 px-3 py-1 rounded-md">+8.2%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-muted/40 to-muted/20 p-4 transition-all hover:from-muted/60 hover:to-muted/40 border border-border/50">
              <span className="text-sm font-semibold text-foreground">
                {department.name === 'Management' ? 'Quarterly Company Performance' : 'Quarterly Performance'}
              </span>
              <span className="text-base font-bold text-primary bg-primary/10 px-3 py-1 rounded-md">+15.4%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-muted/40 to-muted/20 p-4 transition-all hover:from-muted/60 hover:to-muted/40 border border-border/50">
              <span className="text-sm font-semibold text-foreground">
                {department.name === 'Management' ? 'Year-to-Date Company Growth' : 'Year-to-Date Growth'}
              </span>
              <span className="text-base font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-md">+22.1%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Quick Access</h2>
            <p className="text-sm text-muted-foreground mt-1">Navigate to key features and tools</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="block">
              <Card className="hover-lift border-border/50 transition-industrial group cursor-pointer overflow-hidden relative shine-effect">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center space-y-0 pb-4 pt-5 relative z-10">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all shadow-sm">
                    <link.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-bold ml-3 group-hover:text-primary transition-colors">
                    {link.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-5 relative z-10">
                  <p className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                    Access {link.label.toLowerCase()} tools
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
