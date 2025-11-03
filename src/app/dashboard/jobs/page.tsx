'use client';

import RequestsTable from "@/components/jobs-table";
import { fetchRequests } from "@/lib/data";
import { useState, useEffect } from "react";
import { Request } from "@/lib/types";

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
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading requests...</div>
            </div>
        );
    }

    return (
        <div>
            <RequestsTable requests={requests} />
        </div>
    );
}
