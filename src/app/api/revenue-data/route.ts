
import { NextResponse, type NextRequest } from 'next/server';
import { authenticate, getDoctors, getMedibillInvoices, getTotalReceived } from '@/lib/api';
import type { CombinedDoctorData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { selectedMonthYear } : { selectedMonthYear: string } = await request.json();

    if (!selectedMonthYear || typeof selectedMonthYear !== 'string' || !/^\d{4}-\d{2}$/.test(selectedMonthYear)) {
      return NextResponse.json({ error: 'Valid selected month and year (YYYY-MM) are required.' }, { status: 400 });
    }

    // These environment variables are now expected to be server-side, not NEXT_PUBLIC_
    const apiEmail = process.env.API_EMAIL;
    const apiPassword = process.env.API_PASSWORD;

    if (!apiEmail || !apiPassword) {
      console.error("API_EMAIL or API_PASSWORD are not set in server environment variables.");
      return NextResponse.json({ error: 'Server configuration error: API credentials not set.' }, { status: 500 });
    }

    const authToken = await authenticate(apiEmail, apiPassword);

    const doctors = await getDoctors(authToken);
    if (doctors.length === 0) {
      // If no doctors, return empty data array but success overall for this step
      return NextResponse.json({ data: [] });
    }

    const doctorIds = doctors.map(doc => doc.userId);
    const [yearStr, monthStr] = selectedMonthYear.split('-');

    const [invoices, receivedAmounts] = await Promise.all([
      getMedibillInvoices(authToken, doctorIds, monthStr, yearStr),
      getTotalReceived(authToken, doctorIds, monthStr, yearStr)
    ]);
    
    const combinedData: CombinedDoctorData[] = doctors.map(doctor => {
      const invoice = invoices.find(inv => inv.userId === doctor.userId);
      const received = receivedAmounts.find(rec => rec.userId === doctor.userId);
      return {
        ...doctor,
        totalMedibillInvoice: invoice?.totalAmount || 0,
        totalReceived: received?.receivedAmount || 0,
        monthYear: selectedMonthYear, // Client will map this to a display label using its availableMonths
      };
    });

    return NextResponse.json({ data: combinedData });

  } catch (err) {
    console.error("Error in /api/revenue-data POST handler:", err);
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred on the server.";
    
    let clientErrorMessage = "Failed to fetch revenue data due to a server error.";
    if (errorMessage.includes("Authentication failed")) {
        clientErrorMessage = "Medibill API Authentication failed. Please check server credentials configuration.";
    } else if (errorMessage.includes("Server configuration error: API credentials not set.")) {
        clientErrorMessage = "Server is not configured correctly for Medibill API access.";
    }
    // For other errors, a generic message is often safer for the client.
    
    return NextResponse.json({ error: clientErrorMessage }, { status: 500 });
  }
}
