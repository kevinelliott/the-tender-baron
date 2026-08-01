import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Tender Baron — First Embers",
  description: "A walletless first-service interface prototype for The Tender Baron.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#171516",
};

const designContract = `<!--
THESIS: Coal Table and Service Theatre are two scales of one live promise; refuse the restaurant dashboard.
OWN-WORLD: Coal, bone china, oxblood, oak, brass cues, wax-pencil paths, and authored pixel geometry.
COMPOSITION: One four-guest room and one irregular fire share a persistent promise rail; mobile splits Room Fire Rest Pass.
INTERACTION: View switches advance zero ticks; service controls submit canonical actions to one device-local reducer session.
AVOID: Fahrenheit, wallet or chain UI, generic timers, card grids, drag-only controls, and exploratory mock deviations.
SEED: tender-baron-coal-theatre-v1
-->`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-design-contract="tender-baron-coal-theatre-v1">
      <body>
        <template data-design-contract-comment dangerouslySetInnerHTML={{ __html: designContract }} />
        <a className="skip-link" href="#service-workspace">Skip to service workspace</a>
        {children}
      </body>
    </html>
  );
}
