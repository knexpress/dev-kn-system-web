'use client';

import { useState, useEffect } from 'react';
import InternalRequestSystem from "@/components/internal-request-system";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from '@/contexts/NotificationContext';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

export default function InternalRequestsPage() {
    const { userProfile } = useAuth();
    const { clearCount } = useNotifications();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchTickets();
        // Clear tickets notification count when page is visited
        clearCount('tickets');
    }, []);

    const fetchTickets = async () => {
        try {
            console.log('Fetching internal requests...');
            const result = await apiClient.getInternalRequests();
            console.log('API Response:', result); // Debug log
            
            if (result.success) {
                const data = result.data || [];
                console.log('Data type:', typeof data, 'Is array:', Array.isArray(data)); // Debug log
                console.log('Data length:', data.length); // Debug log
                setTickets(Array.isArray(data) ? data : []);
            } else {
                console.error('API returned success: false:', result);
                setTickets([]); // Set empty array on error
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to fetch internal requests',
                });
            }
        } catch (error) {
            console.error('Error fetching internal requests:', error);
            setTickets([]); // Set empty array on error
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to fetch internal requests',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTicketUpdate = () => {
        // Refresh tickets when a new one is created or updated
        fetchTickets();
    };

    if (!userProfile) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading tickets...</div>
            </div>
        );
    }
    
    return (
        <div>
            <InternalRequestSystem 
                requests={tickets} 
                currentUser={userProfile} 
                onTicketUpdate={handleTicketUpdate}
            />
        </div>
    );
}
