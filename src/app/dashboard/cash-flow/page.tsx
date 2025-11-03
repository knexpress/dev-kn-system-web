'use client';

import CashFlowTracker from "@/components/cash-flow-tracker";
import { fetchCashFlowTransactions } from "@/lib/data";
import { useState, useEffect } from "react";
import { CashFlowTransaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function CashFlowPage() {
    const [transactions, setTransactions] = useState<CashFlowTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const data = await fetchCashFlowTransactions();
            setTransactions(data);
            console.log('Loaded cash flow transactions:', data);
        } catch (error) {
            console.error('Error loading cash flow transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTransactions();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading cash flow data...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={loadTransactions} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>
            <CashFlowTracker transactions={transactions} />
        </div>
    );
}
