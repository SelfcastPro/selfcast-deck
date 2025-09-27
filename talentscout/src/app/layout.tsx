import "./globals.css";

export const metadata = {
  title: "Selfcast – Instagram TalentScout",
  description: "Browse the most recent Instagram profiles collected via the webhook buffer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#f9fafb", fontFamily: "sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
