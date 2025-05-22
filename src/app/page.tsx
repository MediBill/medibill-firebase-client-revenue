
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSelector, type MonthOption } from "@/components/dashboard/MonthSelector";
import { RevenueTable } from "@/components/dashboard/RevenueTable";
import type { CombinedDoctorData } from "@/lib/types";
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' | null }>({ key: null, direction: 'asc' });

  const [isPageAuthenticated, setIsPageAuthenticated] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      if (!isPageAuthenticated) {
        setRevenueData([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      setRevenueData([]);

      try {
        console.log(`Fetching data via internal API for month: ${selectedMonthYear}`);
        const response = await fetch('/api/revenue-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ selectedMonthYear }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to parse error response." }));
          throw new Error(errorData.error || `Failed to fetch data: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }
        
        // Map monthYear from YYYY-MM to display label
        const processedData = result.data.map((item: CombinedDoctorData) => ({
          ...item,
          monthYear: availableMonths.find(m => m.value === item.monthYear)?.label || item.monthYear,
        }));
        setRevenueData(processedData);

      } catch (err) {
        console.error("Error fetching revenue data:", err);
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(errorMessage);
        setRevenueData([]);
      } finally {
        setIsLoading(false);
        console.log("Internal API data fetching process finished.");
      }
    };

    fetchRevenueData();
  }, [selectedMonthYear, isPageAuthenticated, availableMonths]);
  
  const handleSortChange = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      // Reset sorting if clicked twice in descending order
      setSortConfig({ key: null, direction: null });
      return;
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredRevenueData = useMemo(() => {
    let filteredData = revenueData;

    if (searchQuery) {
    const lowerCaseQuery = searchQuery.toLowerCase();
      filteredData = revenueData.filter(doctor =>
      doctor.accountNumber.toLowerCase().includes(lowerCaseQuery) ||
      doctor.name.toLowerCase().includes(lowerCaseQuery)
    );
    }

    if (sortConfig.key !== null && sortConfig.direction !== null) {
      const sortedData = [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key as keyof CombinedDoctorData];
        const bValue = b[sortConfig.key as keyof CombinedDoctorData];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
      return sortedData;
    }
    return filteredData;
  }, [revenueData, searchQuery, sortConfig]);

  const handlePageLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === DEFAULT_PAGE_PASSWORD) {
      setIsPageAuthenticated(true);
      setLoginError(null);
      setInputPassword(""); // Clear password after successful login
    } else {
      setLoginError("Incorrect password. Please try again.");
      setInputPassword(""); // Clear password after failed attempt
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
          <CardTitle className="text-3xl font-semibold text-center tracking-tight"></CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-8 space-y-8">
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
          <Input
            placeholder="Search by Account Number or Doctor Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
            disabled={isLoading}
          />
          <RevenueTable
            data={sortedAndFilteredRevenueData}
            isLoading={isLoading}
            sortBy={sortConfig.key}
            sortDirection={sortConfig.direction as 'asc' | 'desc'}
            onSortChange={handleSortChange} />
        </CardContent>
      </Card>
    </div>
  );
}
