import './globals.css';

export const metadata = {
  title: 'Mysoresearch',
  description: 'US Emerging Trends — Energy, Biosciences, AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
