import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Button } from './ui/button';

interface DashboardCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
}

export default function DashboardCard({ title, description, icon: Icon, href }: DashboardCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
        <Button asChild variant="link" className="px-0 mt-4">
            <Link href={href}>
                Go to {title} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
