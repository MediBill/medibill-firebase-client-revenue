import type { Doctor, MedibillInvoice, TotalReceived } from './types';

const MOCK_DOCTORS_DB: Doctor[] = [
  { userId: 'doc1', accountNumber: 'ACC001', name: 'Dr. Alice Smith' },
  { userId: 'doc2', accountNumber: 'ACC002', name: 'Dr. Bob Johnson' },
  { userId: 'doc3', accountNumber: 'ACC003', name: 'Dr. Carol Williams (TEST Practice)' },
  { userId: 'doc4', accountNumber: 'ACC004', name: 'Dr. David Brown' },
  { userId: 'doc5', accountNumber: 'ACC005', name: 'Dr. Eve Davis' },
  { userId: 'doc6', accountNumber: 'ACC006', name: 'TEST Dr. Frank Miller' },
  { userId: 'doc7', accountNumber: 'ACC007', name: 'Dr. Grace Lee' },
  { userId: 'doc8', accountNumber: 'ACC008', name: 'Dr. Henry Wilson' },
];

const MOCK_INVOICES_DB: Omit<MedibillInvoice, 'totalAmount'>[] = [
  { userId: 'doc1' },
  { userId: 'doc2' },
  { userId: 'doc4' },
  { userId: 'doc5' },
  { userId: 'doc7' },
  { userId: 'doc8' },
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const authenticate = async (email?: string, password?: string): Promise<boolean> => {
  await delay(300);
  // Mock authentication: succeed if email and password are provided (not empty)
  if (email && password) {
    console.log(`Mock authentication successful for ${email}`);
    return true;
  }
  console.log('Mock authentication failed');
  return false;
};

export const getDoctors = async (token: string): Promise<Doctor[]> => {
  await delay(500);
  if (!token) throw new Error("Authentication token required for getDoctors");
  return MOCK_DOCTORS_DB.filter(doc => !doc.name.toUpperCase().includes('TEST'));
};

export const getMedibillInvoices = async (token: string, doctorIds: string[]): Promise<MedibillInvoice[]> => {
  await delay(700);
  if (!token) throw new Error("Authentication token required for getMedibillInvoices");
  
  return MOCK_INVOICES_DB
    .filter(invoiceBase => doctorIds.includes(invoiceBase.userId))
    .map(invoiceBase => ({
      ...invoiceBase,
      totalAmount: parseFloat((Math.random() * 15000 + 5000).toFixed(2)) // Random amount between 5k and 20k
    }));
};

export const getTotalReceived = async (token: string, doctorIds: string[], month: string, year: string): Promise<TotalReceived[]> => {
  await delay(600);
  if (!token) throw new Error("Authentication token required for getTotalReceived");
  
  // Use month and year to seed randomness for more varied data per selection
  const seed = parseInt(year, 10) * 100 + parseInt(month, 10);

  return doctorIds.map(userId => {
    // Simple seeded random generation
    const randomFactor = (parseInt(userId.replace('doc',''),10) + seed) % 100 / 100;
    return {
      userId,
      receivedAmount: parseFloat(((randomFactor * 10000 + 3000) * (parseInt(month,10)/12 + 0.5)).toFixed(2)),
    }
  });
};
