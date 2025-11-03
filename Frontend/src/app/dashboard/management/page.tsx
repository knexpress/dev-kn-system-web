import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function ManagementPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Management & Reports</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground min-h-[300px]">
                <BarChart className="w-16 h-16 mb-4" />
                <p>This section is for the Management department.</p>
                <p>Reporting dashboards and company analytics will be available here.</p>
            </CardContent>
        </Card>
    );
}
