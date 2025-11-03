import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle } from "lucide-react";

export default function EmployeesPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Employee Management</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground min-h-[300px]">
                <UserCircle className="w-16 h-16 mb-4" />
                <p>This section is for the HR department.</p>
                <p>Employee management features will be implemented here.</p>
            </CardContent>
        </Card>
    );
}
