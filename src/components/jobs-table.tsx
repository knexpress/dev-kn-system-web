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

const statusColors: Record<RequestStatus, string> = {
    Pending: 'bg-yellow-500',
    'In-Transit': 'bg-blue-500',
    Delivered: 'bg-green-500',
    Invoiced: 'bg-purple-500',
    Completed: 'bg-gray-500',
};

export default function RequestsTable({ requests }: { requests: Request[] }) {
    const [filter, setFilter] = useState<RequestStatus | 'All'>('All');
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

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
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Request Management</h2>
                <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="All">All</TabsTrigger>
                        <TabsTrigger value="Pending">Pending</TabsTrigger>
                        <TabsTrigger value="In-Transit">In-Transit</TabsTrigger>
                        <TabsTrigger value="Delivered">Delivered</TabsTrigger>
                        <TabsTrigger value="Invoiced">Invoiced</TabsTrigger>
                    </TabsList>
                    <TabsContent value={filter}>
                        {/* Content is shown in the table below */}
                    </TabsContent>
                </Tabs>
            </div>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">{request.id}</TableCell>
                    <TableCell className="font-medium">{request.clientName}</TableCell>
                    <TableCell>{request.description}</TableCell>
                    <TableCell>{request.origin}</TableCell>
                    <TableCell>{request.destination}</TableCell>
                    <TableCell>
                        <Badge variant="secondary" className={`text-white ${statusColors[request.status]}`}>{request.status}</Badge>
                    </TableCell>
                    <TableCell>
                        {request.status === 'In-Transit' && (
                             <Button size="sm" onClick={() => handleMarkAsDelivered(request.id)} disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Mark Delivered
                             </Button>
                        )}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
    );
}
