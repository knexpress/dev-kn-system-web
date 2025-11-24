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
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {userProfile?.full_name?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-sm text-muted-foreground">
          {department.name === 'Management' 
            ? 'Company-wide performance overview and strategic insights.'
            : `Performance overview for the ${department.name} department.`
          }
        </p>
      </div>

      {/* Performance Metrics */}
      <PerformanceMetrics department={department.name as any} />

      {/* Department Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover-lift border-border/50 transition-industrial">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              {department.name === 'Management' ? 'Company Insights' : 'Department Insights'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-muted/30 p-3 transition-industrial hover:bg-muted/50">
              <span className="text-sm font-medium text-foreground">
                {department.name === 'Management' ? 'Company Productivity' : 'Team Productivity'}
              </span>
              <span className="text-sm font-bold text-green-600">+12%</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 p-3 transition-industrial hover:bg-muted/50">
              <span className="text-sm font-medium text-foreground">
                {department.name === 'Management' ? 'Strategic Goals Achievement' : 'Goal Achievement'}
              </span>
              <span className="text-sm font-bold text-primary">85%</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 p-3 transition-industrial hover:bg-muted/50">
              <span className="text-sm font-medium text-foreground">
                {department.name === 'Management' ? 'Cross-Department Efficiency' : 'Process Efficiency'}
              </span>
              <span className="text-sm font-bold text-blue-600">92%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift border-border/50 transition-industrial">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              Recent Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-muted/30 p-3 transition-industrial hover:bg-muted/50">
              <span className="text-sm font-medium text-foreground">This Month vs Last Month</span>
              <span className="text-sm font-bold text-green-600">+8.2%</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 p-3 transition-industrial hover:bg-muted/50">
              <span className="text-sm font-medium text-foreground">
                {department.name === 'Management' ? 'Quarterly Company Performance' : 'Quarterly Performance'}
              </span>
              <span className="text-sm font-bold text-primary">+15.4%</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/30 p-3 transition-industrial hover:bg-muted/50">
              <span className="text-sm font-medium text-foreground">
                {department.name === 'Management' ? 'Year-to-Date Company Growth' : 'Year-to-Date Growth'}
              </span>
              <span className="text-sm font-bold text-blue-600">+22.1%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Quick Access</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="block">
              <Card className="hover-lift border-border/50 transition-industrial group cursor-pointer">
                <CardHeader className="flex flex-row items-center space-y-0 pb-3 pt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-industrial">
                    <link.icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold ml-3 group-hover:text-primary transition-colors">
                    {link.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
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
