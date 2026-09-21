'use client';

import RequestsTable from "@/components/jobs-table";
import { fetchRequests } from "@/lib/data";
import { useState, useEffect } from "react";
import { Request } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/maglo-shell";

export default function RequestsPage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRequests = async () => {
            try {
                const data = await fetchRequests();
                setRequests(data);
            } catch (error) {
                console.error('Error loading requests:', error);
            } finally {
                setLoading(false);
            }
        };

        loadRequests();
    }, []);

    if (loading) {
        return (
            <DashboardPageShell title="Jobs">
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                    <p className="text-sm text-slate-500">Loading requests...</p>
                </div>
            </DashboardPageShell>
        );
    }

    return (
        <DashboardPageShell title="Jobs">
            <RequestsTable requests={requests} />
        </DashboardPageShell>
    );
}
