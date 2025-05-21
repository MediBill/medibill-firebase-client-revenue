
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSelector, type MonthOption } from "@/components/dashboard/MonthSelector";
import { RevenueTable } from "@/components/dashboard/RevenueTable";
import type { CombinedDoctorData } from "@/lib/types";
// Import from the new api.ts file
import { getDoctors, getMedibillInvoices, getTotalReceived, authenticate } from "@/lib/api"; 
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
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchDataAndAuthIfNeeded = async () => {
      setIsLoading(true);
      setError(null); 

      let tokenToUse = authToken;

      try {
        // Step 1: Ensure authentication
        if (!tokenToUse) {
          console.log("No existing token, attempting API authentication...");
          // Use environment variables for credentials
          const apiEmail = process.env.NEXT_PUBLIC_API_EMAIL;
          const apiPassword = process.env.NEXT_PUBLIC_API_PASSWORD || "Onejuly2021"; // Default password

          if (!apiEmail) {
            throw new Error("API email (NEXT_PUBLIC_API_EMAIL) is not configured in environment variables. The password will use a default if NEXT_PUBLIC_API_PASSWORD is not set.");
          }
          if (!process.env.NEXT_PUBLIC_API_PASSWORD) {
            console.warn("Using default API password. For production, please set NEXT_PUBLIC_API_PASSWORD in your environment variables.");
          }


          const newAuthToken = await authenticate(apiEmail, apiPassword);
          setAuthToken(newAuthToken); 
          tokenToUse = newAuthToken;
          console.log("API Authentication successful.");
        } else {
          console.log("Using existing auth token.");
        }

        // Step 2: Fetch data using the token
        if (!tokenToUse) {
            // This should not happen if authenticate throws on failure, but as a safeguard
            throw new Error("Authentication token not available after auth attempt.");
        }
        
        console.log(`Fetching data for month: ${selectedMonthYear}`);
        const doctors = await getDoctors(tokenToUse);
        if (doctors.length === 0) {
          console.log("No doctors found after filtering.");
          setRevenueData([]);
          setIsLoading(false);
          return;
        }
        console.log(`Found ${doctors.length} doctors.`);
        const doctorIds = doctors.map(doc => doc.userId);

        const [yearStr, monthStr] = selectedMonthYear.split('-'); // "YYYY-MM"

        const [invoices, receivedAmounts] = await Promise.all([
          getMedibillInvoices(tokenToUse, doctorIds, monthStr, yearStr),
          getTotalReceived(tokenToUse, doctorIds, monthStr, yearStr)
        ]);
        console.log("Fetched invoices and received amounts.");

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
        console.error("Error during operation:", err);
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(errorMessage);
        
        // If an error occurs (could be auth or data fetching), clear the token to force re-authentication.
        // This helps if the token became invalid.
        setAuthToken(null); 
        setRevenueData([]);
      } finally {
        setIsLoading(false);
        console.log("Data fetching/auth process finished.");
      }
    };

    fetchDataAndAuthIfNeeded();
  }, [selectedMonthYear, authToken, availableMonths]); // availableMonths is stable but included for completeness.
                                                      // authToken dependency handles re-fetching/re-auth cycles.

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
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <RevenueTable data={revenueData} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
