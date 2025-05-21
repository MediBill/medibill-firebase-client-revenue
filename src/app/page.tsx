"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSelector, type MonthOption } from "@/components/dashboard/MonthSelector";
import { RevenueTable } from "@/components/dashboard/RevenueTable";
import type { CombinedDoctorData } from "@/lib/types";
import { getDoctors, getMedibillInvoices, getTotalReceived, authenticate } from "@/lib/mockApi";
import { format, subMonths } from 'date-fns';
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Generate last 12 months for selector
const getAvailableMonths = (): MonthOption[] => {
  const months: MonthOption[] = [];
  const currentDate = new Date();
  for (let i = 0; i < 12; i++) {
    const date = subMonths(currentDate, i);
    months.push({
      value: format(date, 'yyyy-MM'), // Value format: "2023-01"
      label: format(date, 'MMMM yyyy'), // Label format: "January 2023"
    });
  }
  return months;
};

export default function ClientRevenuePage() {
  const availableMonths = useMemo(() => getAvailableMonths(), []);
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(availableMonths[0].value);
  const [revenueData, setRevenueData] = useState<CombinedDoctorData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const authSuccess = await authenticate("user@medibill.com", "securePassword123");
        if (!authSuccess) {
          throw new Error("API Authentication failed. Please check credentials.");
        }
        const apiToken = "mockAuthToken"; // Token from successful auth

        const doctors = await getDoctors(apiToken);
        if (doctors.length === 0) {
          setRevenueData([]);
          return; // No doctors to process
        }
        const doctorIds = doctors.map(doc => doc.userId);

        const [year, month] = selectedMonthYear.split('-'); // "YYYY-MM"

        const [invoices, receivedAmounts] = await Promise.all([
          getMedibillInvoices(apiToken, doctorIds),
          getTotalReceived(apiToken, doctorIds, month, year)
        ]);

        const currentMonthLabel = availableMonths.find(m => m.value === selectedMonthYear)?.label || selectedMonthYear;

        const combinedData = doctors.map(doctor => {
          const invoice = invoices.find(inv => inv.userId === doctor.userId);
          const received = receivedAmounts.find(rec => rec.userId === doctor.userId);
          return {
            ...doctor,
            totalMedibillInvoice: invoice?.totalAmount || 0,
            totalReceived: received?.receivedAmount || 0,
            monthYear: currentMonthLabel,
          };
        });
        setRevenueData(combinedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred while fetching data.");
        setRevenueData([]); // Clear data on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedMonthYear, availableMonths]);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-background">
      <Card className="w-full max-w-6xl mx-auto shadow-2xl rounded-xl overflow-hidden border-primary/20">
        <CardHeader className="bg-primary text-primary-foreground p-6">
          <CardTitle className="text-3xl font-semibold text-center tracking-tight">
            Client Revenue Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <MonthSelector
            selectedMonthYear={selectedMonthYear}
            onMonthChange={setSelectedMonthYear}
            availableMonths={availableMonths}
            disabled={isLoading}
          />
          {error && (
            <Alert variant="destructive" className="shadow-md">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Error Fetching Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <RevenueTable data={revenueData} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
