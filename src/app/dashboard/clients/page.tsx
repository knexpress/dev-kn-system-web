'use client';

import ClientTable from "@/components/client-table";
import { fetchClients } from "@/lib/data";
import { useState, useEffect } from "react";
import { Client } from "@/lib/types";

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadClients = async () => {
            try {
                const data = await fetchClients();
                setClients(data);
            } catch (error) {
                console.error('Error loading clients:', error);
            } finally {
                setLoading(false);
            }
        };

        loadClients();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading clients...</div>
            </div>
        );
    }

    return (
        <div>
            <ClientTable clients={clients} />
        </div>
    );
}
  