'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchRequests } from "@/lib/data";
import { Request } from "@/lib/types";
import { DashboardPageShell } from '@/components/dashboard/maglo-shell';

// Dynamically import ReviewRequestsTable to reduce initial bundle size
const ReviewRequestsTable = dynamic(() => import("@/components/review-jobs-table"), {
    loading: () => <div className="flex items-center justify-center p-8 text-sm text-slate-500">Loading...</div>,
    ssr: false
});

export default function ReviewRequestsPage() {
    const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadRequests() {
            try {
                const requests = await fetchRequests();
                const pending = requests.filter(request => request.status === 'Pending');
                setPendingRequests(pending);
            } catch (error) {
                console.error('Error loading requests:', error);
                setPendingRequests([]);
            } finally {
                setLoading(false);
            }
        }
        loadRequests();
    }, []);

    if (loading) {
        return (
            <DashboardPageShell title="Review Jobs">
                <div className="flex items-center justify-center p-8 text-sm text-slate-500">
                    Loading...
                </div>
            </DashboardPageShell>
        );
    }

    return (
        <DashboardPageShell title="Review Jobs">
            <ReviewRequestsTable requests={pendingRequests} />
        </DashboardPageShell>
    );
}
