"use client";

export default function Page() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
      }}
    >
      <iframe
        src="https://talentscout-36uikzm06-selfcastpros-projects.vercel.app/"
        title="Selfcast — Instagram TalentScout"
        style={{
          border: "0",
          width: "100%",
          height: "100%",
        }}
        // Clipboard virker i iframes med bruger-interaktion; dette giver eksplicit tilladelse.
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
