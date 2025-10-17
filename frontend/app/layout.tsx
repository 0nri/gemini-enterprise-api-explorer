import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gemini Enterprise API Explorer',
  description: 'Explore and interact with Gemini Enterprise (Agentspace) APIs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
