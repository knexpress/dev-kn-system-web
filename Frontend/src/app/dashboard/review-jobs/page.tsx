import ReviewRequestsTable from "@/components/review-jobs-table";
import { mockRequests } from "@/lib/data";
import { RequestStatus } from "@/lib/types";

export default function ReviewRequestsPage() {
    // In a real app, you would fetch this data from Firestore
    const pendingRequests = mockRequests.filter(request => request.status === 'Pending');

    return (
        <div>
            <ReviewRequestsTable requests={pendingRequests} />
        </div>
    );
}
