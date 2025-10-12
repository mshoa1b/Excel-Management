import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Techezm RMA',
  description: 'Multi-tenant SaaS platform for business management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}