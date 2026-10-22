'use client';

import { useState, useMemo, useTransition } from 'react';
import { Request, RequestStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { updateRequestStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  ErpGrid,
  ErpToolbar,
  erpPrimaryButtonClass,
  erpTableClasses,
} from '@/components/dashboard/maglo-shell';
import { cn } from '@/lib/utils';

const statusColors: Record<RequestStatus, string> = {
    Pending: 'bg-amber-500',
    'In-Transit': 'bg-sky-500',
    Delivered: 'bg-emerald-500',
    Invoiced: 'bg-teal-500',
    Completed: 'bg-slate-500',
};

export default function RequestsTable({ requests }: { requests: Request[] }) {
    const [filter, setFilter] = useState<RequestStatus | 'All'>('All');
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const t = erpTableClasses();

    const filteredRequests = useMemo(() => {
        if (filter === 'All') return requests;
        return requests.filter(request => request.status === filter);
    }, [requests, filter]);

    const handleMarkAsDelivered = (requestId: string) => {
        startTransition(async () => {
            const result = await updateRequestStatus(requestId, 'COMPLETED');
            if(result.success) {
                toast({ title: 'Request Updated', description: `Request #${requestId} marked as Delivered.`});
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not update request status.'});
            }
        });
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <ErpToolbar
                title="Requests"
                filters={
                    <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-auto">
                        <TabsList className="h-10 rounded-xl bg-slate-100/80 p-1">
                            <TabsTrigger value="All" className="rounded-lg text-xs">All</TabsTrigger>
                            <TabsTrigger value="Pending" className="rounded-lg text-xs">Pending</TabsTrigger>
                            <TabsTrigger value="In-Transit" className="rounded-lg text-xs">In-Transit</TabsTrigger>
                            <TabsTrigger value="Delivered" className="rounded-lg text-xs">Delivered</TabsTrigger>
                            <TabsTrigger value="Invoiced" className="rounded-lg text-xs">Invoiced</TabsTrigger>
                        </TabsList>
                        <TabsContent value={filter} />
                    </Tabs>
                }
            />
            <ErpGrid>
                <Table className={t.table}>
                    <TableHeader>
                        <TableRow>
                            <TableHead className={t.head}>Request ID</TableHead>
                            <TableHead className={t.head}>Client</TableHead>
                            <TableHead className={t.head}>Description</TableHead>
                            <TableHead className={t.head}>Origin</TableHead>
                            <TableHead className={t.head}>Destination</TableHead>
                            <TableHead className={t.head}>Status</TableHead>
                            <TableHead className={t.head}>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRequests.map((request) => (
                            <TableRow key={request.id} className={t.row}>
                                <TableCell className={cn(t.cell, 'font-mono text-xs')}>{request.id}</TableCell>
                                <TableCell className={cn(t.cell, 'font-medium')}>{request.clientName}</TableCell>
                                <TableCell className={t.cell}>{request.description}</TableCell>
                                <TableCell className={t.cell}>{request.origin}</TableCell>
                                <TableCell className={t.cell}>{request.destination}</TableCell>
                                <TableCell className={t.cell}>
                                    <Badge variant="secondary" className={`text-white ${statusColors[request.status]}`}>
                                        {request.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className={t.cell}>
                                    {request.status === 'In-Transit' && (
                                        <Button
                                            size="sm"
                                            className={erpPrimaryButtonClass()}
                                            onClick={() => handleMarkAsDelivered(request.id)}
                                            disabled={isPending}
                                        >
                                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Mark Delivered
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredRequests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className={cn(t.cell, 'py-10 text-center text-slate-400')}>
                                    No requests match this filter.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ErpGrid>
        </div>
    );
}
