import dynamic from 'next/dynamic';

// Dynamically import CargoStatusTable to reduce initial bundle size
const CargoStatusTable = dynamic(() => import('@/components/cargo-status-table'), {
    loading: () => <div className="flex items-center justify-center h-64">Loading cargo status...</div>
});

export default function CargoStatusPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cargo Status</h1>
                <p className="text-muted-foreground">
                    Manage and track cargo delivery status and view invoice information
                </p>
            </div>
            
            <CargoStatusTable />
        </div>
    );
}
