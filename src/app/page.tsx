
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSelector, type MonthOption } from "@/components/dashboard/MonthSelector";
import { RevenueTable } from "@/components/dashboard/RevenueTable";
import type { CombinedDoctorData } from "@/lib/types";
import { getDoctors, getMedibillInvoices, getTotalReceived, authenticate } from "@/lib/api";
import { format, subMonths } from 'date-fns';
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

const DEFAULT_PAGE_PASSWORD = "Onejuly2021";

export default function ClientRevenuePage() {
  const availableMonths = useMemo(() => getAvailableMonths(), []);
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(availableMonths[0].value);
  const [revenueData, setRevenueData] = useState<CombinedDoctorData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Initial loading to false for login page
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Page-level authentication state
  const [isPageAuthenticated, setIsPageAuthenticated] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDataAndAuthIfNeeded = async () => {
      setIsLoading(true);
      setError(null);

      let tokenToUse = authToken;

      try {
        // Step 1: Ensure API authentication
        if (!tokenToUse) {
          console.log("No existing API token, attempting API authentication...");
          const apiEmail = process.env.NEXT_PUBLIC_API_EMAIL;
          const apiPassword = process.env.NEXT_PUBLIC_API_PASSWORD;

          // The authenticate function in api.ts will check if email/password are provided
          const newAuthToken = await authenticate(apiEmail, apiPassword);
          setAuthToken(newAuthToken);
          tokenToUse = newAuthToken;
          console.log("API Authentication successful.");
        } else {
          console.log("Using existing API auth token.");
        }

        if (!tokenToUse) {
          throw new Error("API Authentication token not available after auth attempt.");
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

        const [yearStr, monthStr] = selectedMonthYear.split('-');

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
        console.error("Error during API operation:", err);
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(errorMessage);
        setAuthToken(null); // Clear API token on error to force re-auth
        setRevenueData([]);
      } finally {
        setIsLoading(false);
        console.log("Data fetching/API auth process finished.");
      }
    };

    if (isPageAuthenticated) {
      fetchDataAndAuthIfNeeded();
    } else {
      // Reset states if not page authenticated
      setRevenueData([]);
      setIsLoading(false);
      setError(null);
      setAuthToken(null); // Clear API token if page is not authenticated
    }
  }, [selectedMonthYear, authToken, availableMonths, isPageAuthenticated]);

  const handlePageLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === DEFAULT_PAGE_PASSWORD) {
      setIsPageAuthenticated(true);
      setLoginError(null);
      setInputPassword("");
    } else {
      setLoginError("Incorrect password. Please try again.");
      setInputPassword("");
    }
  };

  if (!isPageAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md shadow-2xl rounded-xl border-primary/20">
          <CardHeader className="bg-primary text-primary-foreground p-6">
            <CardTitle className="text-2xl font-semibold text-center tracking-tight">
              Access Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <form onSubmit={handlePageLogin} className="space-y-4">
              <div>
                <Label htmlFor="pagePasswordInput" className="text-foreground">Password</Label>
                <Input
                  id="pagePasswordInput"
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-1 bg-input border-border focus:ring-primary"
                  required
                />
              </div>
              {loginError && (
                <Alert variant="destructive" className="shadow-sm mt-4">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-6">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
