
'use server';
import type { Doctor, MedibillInvoice, TotalReceived } from './types';

const API_BASE_URL = 'https://api.medibill.co.za/api/v1';

export const authenticate = async (email?: string, password?: string): Promise<string> => {
  if (!email || !password) {
    throw new Error("Email and password are required for authentication.");
  }
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let errorMessage = `Authentication failed with status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Ignore if response is not JSON
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (data.status === 'success' && data.token) {
    return data.token;
  } else {
    throw new Error(data.message || "Authentication failed: No token received or status not success.");
  }
};

export const getDoctors = async (token: string): Promise<Doctor[]> => {
  const response = await fetch(`${API_BASE_URL}/doctors`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMessage = `Failed to fetch doctors with status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (data.status === 'success' && Array.isArray(data.doctors)) {
    return data.doctors
      .filter((doc: any) => doc.practice_name && !doc.practice_name.toUpperCase().includes('TEST'))
      .map((doc: any) => ({
        userId: doc.user_id,
        accountNumber: doc.account_number,
        name: doc.doctor_name,
      }));
  } else {
    throw new Error(data.message || "Failed to parse doctors data or status not success.");
  }
};

export const getMedibillInvoices = async (token: string, doctorIds: string[], month: string, year: string): Promise<MedibillInvoice[]> => {
  const targetMonthYear = `${year}-${month}`; // month is already "MM" from split

  const invoicePromises = doctorIds.map(async (userId) => {
    const response = await fetch(`${API_BASE_URL}/reports/medibill-invoices/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      let errorMessage = `Failed to fetch Medibill invoice for doctor ${userId} (status: ${response.status})`;
       try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) { /* Ignore */ }
      console.error(errorMessage); // Log individual error
      return { userId, totalAmount: 0, error: errorMessage }; // Return error for this user
    }
    const data = await response.json();
    if (data.status === 'success' && data.medibill_invoices_report && Array.isArray(data.medibill_invoices_report.previous_months)) {
      const monthData = data.medibill_invoices_report.previous_months.find(
        (inv: any) => inv.month_year === targetMonthYear
      );
      return {
        userId: userId,
        totalAmount: monthData ? monthData.total_medibill_invoice : 0,
      };
    } else {
      console.warn(`Unexpected Medibill invoice data structure or status not success for doctor ${userId}:`, data);
      return { userId: userId, totalAmount: 0, error: "Malformed invoice data" };
    }
  });

  const results = await Promise.allSettled(invoicePromises);
  const successfulInvoices: MedibillInvoice[] = [];
  results.forEach(result => {
    if (result.status === 'fulfilled' && !result.value.error) {
      successfulInvoices.push(result.value as MedibillInvoice);
    } else if (result.status === 'fulfilled' && result.value.error) {
      // If an error field was added for a specific user, handle as partial success
      // For now, we'll just return 0 for them by pushing a default structure.
      // Or we could collect these errors and show them.
      // Let's just include them as 0 for now as per original fallback.
      successfulInvoices.push({userId: result.value.userId, totalAmount: 0});
       console.warn(`Partial failure for Medibill Invoices: User ${result.value.userId} - ${result.value.error}`);
    } else if (result.status === 'rejected') {
        console.error(`Failed to fetch Medibill invoice for a doctor: ${result.reason}`);
        // Depending on requirements, you might re-throw or handle.
        // For now, this doctor will be missing from results or have 0.
    }
  });
  // Ensure all doctors are represented, even if their individual fetch failed and resulted in 0.
   return doctorIds.map(id => {
    const found = successfulInvoices.find(inv => inv.userId === id);
    return found || { userId: id, totalAmount: 0 };
  });
};

export const getTotalReceived = async (token: string, doctorIds: string[], month: string, year: string): Promise<TotalReceived[]> => {
  const targetMonthYear = `${year}-${month}`; // month is already "MM"

  const receivedPromises = doctorIds.map(async (userId) => {
    const response = await fetch(`${API_BASE_URL}/reports/total-received/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorMessage = `Failed to fetch total received for doctor ${userId} (status: ${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) { /* Ignore */ }
      console.error(errorMessage);
      return { userId, receivedAmount: 0, error: errorMessage };
    }
    const data = await response.json();
    if (data.status === 'success' && data.total_received_report && Array.isArray(data.total_received_report.previous_months)) {
      const monthData = data.total_received_report.previous_months.find(
        (rec: any) => rec.month_year === targetMonthYear
      );
      return {
        userId: userId,
        receivedAmount: monthData ? monthData.total_received_amount : 0,
      };
    } else {
      console.warn(`Unexpected total received data structure or status not success for doctor ${userId}:`, data);
      return { userId: userId, receivedAmount: 0, error: "Malformed received data" };
    }
  });

  const results = await Promise.allSettled(receivedPromises);
  const successfulReceived: TotalReceived[] = [];
  results.forEach(result => {
    if (result.status === 'fulfilled' && !result.value.error) {
      successfulReceived.push(result.value as TotalReceived);
    } else if (result.status === 'fulfilled' && result.value.error) {
      successfulReceived.push({userId: result.value.userId, receivedAmount: 0});
      console.warn(`Partial failure for Total Received: User ${result.value.userId} - ${result.value.error}`);
    } else if (result.status === 'rejected') {
      console.error(`Failed to fetch total received for a doctor: ${result.reason}`);
    }
  });
   return doctorIds.map(id => {
    const found = successfulReceived.find(rec => rec.userId === id);
    return found || { userId: id, receivedAmount: 0 };
  });
};
