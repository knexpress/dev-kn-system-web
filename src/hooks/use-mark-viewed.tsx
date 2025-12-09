'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

// Hook to automatically mark items as viewed when a page is visited
export const useMarkAsViewed = (itemType: string, itemId?: string) => {
  const pathname = usePathname();

  useEffect(() => {
    if (itemId) {
      // Mark specific item as viewed
      apiClient.markAsViewed(itemType, itemId).catch(error => {
        console.error('Error marking item as viewed:', error);
      });
    }
  }, [itemType, itemId]);

  useEffect(() => {
    // Mark all items of a type as viewed when visiting the main page
    const routeTypeMap: { [key: string]: string } = {
      '/dashboard/invoices': 'invoice',
      '/dashboard/chat': 'chat_message',
      '/dashboard/tickets': 'ticket',
      '/dashboard/invoice-requests': 'invoice_request',
      '/dashboard/collections': 'collection',
      '/dashboard/requests': 'request',
    };

    const typeToMark = routeTypeMap[pathname];
    if (typeToMark && !itemId) {
      apiClient.markAllAsViewed(typeToMark).catch(error => {
        console.error('Error marking all items as viewed:', error);
      });
    }
  }, [pathname, itemId]);
};

// Hook for marking collections as viewed
export const useMarkCollectionViewed = (collectionId?: string) => {
  useMarkAsViewed('collection', collectionId);
};

// Hook for marking tickets as viewed
export const useMarkTicketViewed = (ticketId?: string) => {
  useMarkAsViewed('ticket', ticketId);
};

// Hook for marking invoice requests as viewed
export const useMarkInvoiceRequestViewed = (requestId?: string) => {
  useMarkAsViewed('invoice_request', requestId);
};

// Hook for marking chat messages as viewed
export const useMarkChatViewed = (messageId?: string) => {
  useMarkAsViewed('chat_message', messageId);
};
