import "./globals.css";
import ClientProviders from "../components/ClientProviders";

export const metadata = {
  title: "Belbin Fleet Manager",
  description: "Comprehensive fleet management system for Belbin Travel",
};

/**
 * Root layout component that provides theme and context providers
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Root layout with providers
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
