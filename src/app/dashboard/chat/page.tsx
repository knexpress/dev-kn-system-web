'use client';

import ChatInterface from '@/components/chat-interface';
import { useNotifications } from '@/contexts/NotificationContext';
import { useEffect } from "react";

export default function ChatPage() {
    const { clearCount } = useNotifications();

    useEffect(() => {
        // Clear chat notification count when page is visited
        clearCount('chat');
    }, []);

    return (
        <div className="container mx-auto p-4">
            <ChatInterface />
        </div>
    );
}
