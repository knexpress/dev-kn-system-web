'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { useNotifications } from '@/contexts/NotificationContext';
import { useEffect } from "react";

export default function ChatPage() {
    const { clearCount } = useNotifications();

    useEffect(() => {
        // Clear chat notification count when page is visited
        clearCount('chat');
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Company Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground min-h-[500px]">
                <MessageSquare className="w-16 h-16 mb-4" />
                <p>Real-time chat for all employees.</p>
                <p>The chat interface will be implemented here.</p>
            </CardContent>
        </Card>
    );
}
