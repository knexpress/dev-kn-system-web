'use client';

import dynamic from 'next/dynamic';
import { apiClient } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { Client } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { secureLog } from "@/lib/secure-logger";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardPageShell,
  erpOutlineControlClass,
} from "@/components/dashboard/maglo-shell";

const ClientTable = dynamic(() => import("@/components/client-table"), {
    loading: () => (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Loading clients...
      </div>
    ),
    ssr: false
});

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const loadClients = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const result = await apiClient.getClients();
                
                if (result.success && result.data) {
                    const mappedClients: Client[] = Array.isArray(result.data) 
                        ? result.data.map((client: any) => ({
                            id: client._id || client.id || '',
                            name: client.company_name || client.name || client.companyName || 'N/A',
                            contactPerson: client.contact_name || client.contactPerson || client.contactName || 'N/A',
                            email: client.email || client.emailAddress || client.email_address || 'N/A',
                            phone: client.phone || client.phoneNumber || client.phone_number || client.contact_phone || 'N/A',
                            address: client.address || client.completeAddress || client.complete_address || client.address_line1 || 'N/A',
                        }))
                        : [];
                    
                    setClients(mappedClients);
                    
                    if (mappedClients.length === 0) {
                        toast({
                            title: "No Clients Found",
                            description: "No clients found in the database.",
                        });
                    }
                } else {
                    setError(result.error || 'Failed to fetch clients');
                    toast({
                        variant: 'destructive',
                        title: "Error",
                        description: result.error || 'Failed to load clients from database',
                    });
                }
            } catch (error: any) {
                secureLog.error('Error loading clients', error);
                const errorMessage = error.message || error.toString() || 'An error occurred while loading clients';
                setError(errorMessage);
                
                toast({
                    variant: 'destructive',
                    title: "Error Loading Clients",
                    description: errorMessage,
                });
            } finally {
                setLoading(false);
            }
        };

    useEffect(() => {
        loadClients();
    }, []);

    if (loading) {
        return (
            <DashboardPageShell title="Clients">
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                    <p className="text-sm text-slate-500">Loading clients from database...</p>
                </div>
            </DashboardPageShell>
        );
    }

    if (error) {
        return (
            <DashboardPageShell title="Clients">
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/80 p-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />
                        <div>
                            <p className="text-sm font-medium text-rose-700">Failed to fetch clients</p>
                            <p className="mt-1 text-xs text-slate-500">{error}</p>
                        </div>
                    </div>
                    <Button
                        onClick={loadClients}
                        variant="outline"
                        className={erpOutlineControlClass()}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </div>
            </DashboardPageShell>
        );
    }

    return (
        <DashboardPageShell title="Clients">
            <ClientTable clients={clients} onRefresh={loadClients} />
        </DashboardPageShell>
    );
}
