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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {userProfile?.full_name?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          {department.name === 'Management' 
            ? 'Here\'s your company-wide performance overview and strategic insights.'
            : `Here's your performance overview for the ${department.name} department.`
          }
        </p>
      </div>

      {/* Performance Metrics */}
      <PerformanceMetrics department={department.name as any} />

      {/* Department Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {department.name === 'Management' ? 'Company Insights' : 'Department Insights'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {department.name === 'Management' ? 'Company Productivity' : 'Team Productivity'}
                </span>
                <span className="text-sm text-green-600 font-semibold">+12%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {department.name === 'Management' ? 'Strategic Goals Achievement' : 'Goal Achievement'}
                </span>
                <span className="text-sm text-blue-600 font-semibold">85%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {department.name === 'Management' ? 'Cross-Department Efficiency' : 'Process Efficiency'}
                </span>
                <span className="text-sm text-purple-600 font-semibold">92%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">This Month vs Last Month</span>
                <span className="text-sm text-green-600 font-semibold">+8.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {department.name === 'Management' ? 'Quarterly Company Performance' : 'Quarterly Performance'}
                </span>
                <span className="text-sm text-blue-600 font-semibold">+15.4%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {department.name === 'Management' ? 'Year-to-Date Company Growth' : 'Year-to-Date Growth'}
                </span>
                <span className="text-sm text-purple-600 font-semibold">+22.1%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Quick Access</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="block">
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/50 hover:scale-[1.02] group">
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <link.icon className="h-4 w-4 text-primary group-hover:text-primary/80 transition-colors" />
                  <CardTitle className="text-sm font-medium ml-2 group-hover:text-primary transition-colors">
                    {link.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                    Access {link.label.toLowerCase()} tools and features
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
