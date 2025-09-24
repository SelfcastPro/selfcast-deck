import "./globals.css";

export const metadata = { title: "Selfcast – TalentScout (IG)" };

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <h1>🎬 Selfcast – Instagram TalentScout</h1>
          {children}
        </div>
      </body>
    </html>
  );
}
