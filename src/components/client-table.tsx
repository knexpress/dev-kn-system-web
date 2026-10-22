'use client';

import { useState } from 'react';
import { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { addClient } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Users } from 'lucide-react';
import {
  ErpGrid,
  ErpToolbar,
  erpPrimaryButtonClass,
  erpTableClasses,
} from '@/components/dashboard/maglo-shell';

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  contactPerson: z.string().min(2, 'Contact person must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  phone: z.string().min(10, 'Phone number seems too short.'),
  address: z.string().min(5, 'Address seems too short.'),
});

interface ClientTableProps {
  clients: Client[];
  onRefresh?: () => void;
}

export default function ClientTable({ clients, onRefresh }: ClientTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const t = erpTableClasses();
  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  async function onSubmit(values: z.infer<typeof clientSchema>) {
    const clientData = {
      company_name: values.name,
      contact_name: values.contactPerson,
      email: values.email,
      phone: values.phone,
      address: values.address,
    };

    const result = await addClient(clientData);
    if (result.success) {
      toast({
        title: 'Client Added',
        description: `Successfully added ${values.name} to Finance database.`,
      });
      setIsDialogOpen(false);
      form.reset();
      if (onRefresh) {
        onRefresh();
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Could not add client to database.',
      });
    }
  }

  const addClientDialog = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className={erpPrimaryButtonClass()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>Enter the details of the new client.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Global Imports Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="contact@global.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="123-456-7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Import Lane, Trade City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className={erpPrimaryButtonClass()} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Adding...' : 'Add Client'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ErpToolbar
        title="Directory"
        onRefresh={onRefresh}
        actions={addClientDialog}
      />

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 sm:px-6">
          <Users className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No clients found</p>
          <p className="text-xs text-slate-400">Get started by adding a new client.</p>
        </div>
      ) : (
        <ErpGrid>
          <Table className={t.table}>
            <TableHeader>
              <TableRow>
                <TableHead className={t.head}>Contact Person</TableHead>
                <TableHead className={t.head}>Email</TableHead>
                <TableHead className={t.head}>Phone</TableHead>
                <TableHead className={t.head}>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className={t.row}>
                  <TableCell className={t.cell}>{client.contactPerson}</TableCell>
                  <TableCell className={`${t.cell} text-slate-500`}>{client.email}</TableCell>
                  <TableCell className={`${t.cell} text-slate-500`}>{client.phone}</TableCell>
                  <TableCell className={`${t.cell} max-w-xs truncate text-slate-500`}>
                    {client.address}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ErpGrid>
      )}
    </div>
  );
}
