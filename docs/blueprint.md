# **App Name**: Client Revenue Statistics

## Core Features:

- API Authentication: Authenticates against the Medibill API using a predefined email and password.
- Doctor Data Retrieval: Fetches all doctors' data, filtering out practices with 'TEST' in their names. Extracts relevant fields like doctor name, account number, and user ID.
- Medibill Invoice Report: Retrieves total Medibill invoice amounts for each doctor, displaying them in a tabular format.
- Total Received Report: Fetches total received amounts for each doctor based on the selected month, displaying them alongside other key details.
- Data Visualization: Displays the combined information for each doctor (account number, name, total received amount, and total Medibill invoice) in a clear, responsive table format.

## Style Guidelines:

- Primary color: A deep blue (#3F51B5), reminiscent of trust, stability, and professionalism, as well as healthcare environments.
- Background color: A very light blue (#E8EAF6), providing a clean and calm backdrop.
- Accent color: A muted violet (#795db8) for interactive elements and subtle highlights.
- Clean, sans-serif font to maintain readability across devices.
- A responsive design using a grid system.
- Subtle transitions on data load for a smooth user experience.