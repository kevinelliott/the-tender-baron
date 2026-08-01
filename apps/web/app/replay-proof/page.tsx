"use client";

import { useMemo } from "react";
import { buildBrowserGoldenFirstService } from "@/lib/browser-golden";

const EXPECTED_REPLAY_DIGEST = "cab1803abb7a67fca5c7a01963f512423412f4a554dd71a6dff12404c8889a6f";

export default function ReplayProof() {
  const proof = useMemo(() => {
    const replay = buildBrowserGoldenFirstService();
    return {
      status: replay.state.serviceStatus,
      synchronized: replay.state.table.synchronized,
      operatingResultCents: replay.state.settlement?.ledger.operatingResultCents,
      replayDigest: replay.replayDigest,
      stateDigest: replay.stateDigest,
      matchesNodeGolden: replay.replayDigest === EXPECTED_REPLAY_DIGEST,
    };
  }, []);

  return (
    <main id="service-workspace" className="replay-proof" data-testid="browser-replay-proof">
      <h1>Browser replay proof</h1>
      <p>This diagnostic runs the authored First Embers action log in the shipped browser bundle. It creates no save and grants no issuer authority.</p>
      <dl>
        <div><dt>Service</dt><dd data-testid="proof-status">{proof.status}</dd></div>
        <div><dt>Whole table</dt><dd>{proof.synchronized ? "Synchronized" : "Not synchronized"}</dd></div>
        <div><dt>Operating result</dt><dd>{proof.operatingResultCents} house cents</dd></div>
        <div><dt>Replay digest</dt><dd data-testid="proof-replay-digest">{proof.replayDigest}</dd></div>
        <div><dt>State digest</dt><dd>{proof.stateDigest}</dd></div>
      </dl>
      <strong data-testid="proof-equivalence">{proof.matchesNodeGolden ? "Browser bytes match the Node golden replay" : "Browser replay diverged"}</strong>
    </main>
  );
}
