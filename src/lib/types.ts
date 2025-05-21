export interface Doctor {
  userId: string;
  accountNumber: string;
  name: string;
}

export interface MedibillInvoice {
  userId: string;
  totalAmount: number;
}

export interface TotalReceived {
  userId: string;
  receivedAmount: number;
}

export interface CombinedDoctorData extends Doctor {
  totalReceived: number;
  totalMedibillInvoice: number;
  monthYear?: string; // To display which month's data is shown, e.g., "January 2024"
}
