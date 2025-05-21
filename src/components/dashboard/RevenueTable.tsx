"use client";

import type { FC } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { CombinedDoctorData } from "@/lib/types";

interface RevenueTableProps {
  data: CombinedDoctorData[];
  isLoading: boolean;
}

export const RevenueTable: FC<RevenueTableProps> = ({ data, isLoading }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const tableHeaderMonthYear = data.length > 0 && data[0]?.monthYear ? data[0].monthYear : "Selected Month";

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-x-4 gap-y-2 p-2 items-center bg-card/30 rounded-md">
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-8 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return <p className="text-center text-muted-foreground py-10 text-lg">No data available for the selected period.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border shadow-lg bg-card">
      <Table className="min-w-full text-sm">
        <TableHeader className="bg-secondary/70">
          <TableRow>
            <TableHead className="w-[180px] py-3 px-4 text-left font-semibold text-secondary-foreground">Account Number</TableHead>
            <TableHead className="py-3 px-4 text-left font-semibold text-secondary-foreground">Doctor Name</TableHead>
            <TableHead className="w-[200px] py-3 px-4 text-right font-semibold text-secondary-foreground">Total Received</TableHead>
            <TableHead className="w-[220px] py-3 px-4 text-right font-semibold text-secondary-foreground">Medibill Invoice</TableHead>
 </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((doctor) => (
            <TableRow key={doctor.userId} className="hover:bg-accent/10 transition-colors duration-150 border-b border-border last:border-b-0">
              <TableCell className="py-3 px-4 font-medium text-foreground">{doctor.accountNumber}</TableCell>
              <TableCell className="py-3 px-4 text-foreground">{doctor.name}</TableCell>
              <TableCell className="py-3 px-4 text-right text-foreground">{formatCurrency(doctor.totalReceived)}</TableCell>
              <TableCell className="py-3 px-4 text-right text-foreground">{formatCurrency(doctor.totalMedibillInvoice)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
