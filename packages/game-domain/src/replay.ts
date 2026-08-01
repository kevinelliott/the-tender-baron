import { canonicalHash, canonicalize, sha256Hex } from "./canonical.js";
import { fault } from "./errors.js";
import type {
  FirstServiceContent,
  GameAction,
  GameEvent,
  GameRules,
  ReplayResult,
  ServiceState,
  SettlementIntegrity
} from "./model.js";
import { reduce } from "./reducer.js";
import { sameVersionRef, stateDigestInput } from "./simulation.js";

function replayDigest(
  rules: GameRules,
  content: FirstServiceContent,
  initialState: ServiceState,
  events: readonly GameEvent[]
): string {
  return sha256Hex(
    "tender-baron/replay/v1" +
      canonicalize(rules.ref) +
      canonicalize(content.ref) +
      canonicalize(initialState) +
      canonicalize(events)
  );
}

function withIntegrity(
  state: ServiceState,
  integrity: SettlementIntegrity
): ServiceState {
  if (state.settlement === undefined) {
    return state;
  }
  return {
    ...state,
    settlement: {
      ...state.settlement,
      integrity
    }
  };
}

function finalResult(
  initialState: ServiceState,
  state: ServiceState,
  events: readonly GameEvent[],
  rules: GameRules,
  content: FirstServiceContent
): ReplayResult {
  const digest = replayDigest(rules, content, initialState, events);
  const stateDigest = canonicalHash(stateDigestInput(state));
  const finalState = withIntegrity(state, { replayDigest: digest, stateDigest });
  return {
    initialState,
    state: finalState,
    events,
    replayDigest: digest,
    stateDigest
  };
}

function assertReplayRefs(
  initialState: ServiceState,
  rules: GameRules,
  content: FirstServiceContent
): void {
  if (!sameVersionRef(initialState.rulesRef, rules.ref)) {
    fault(
      "TB_RULES_MISMATCH",
      "Replay rules do not match the initial state.",
      "Load the exact pinned rules version."
    );
  }
  if (!sameVersionRef(initialState.contentRef, content.ref)) {
    fault(
      "TB_CONTENT_MISMATCH",
      "Replay content does not match the initial state.",
      "Load the exact pinned content pack."
    );
  }
}

export function replayActions(
  initialState: ServiceState,
  actions: readonly GameAction[],
  rules: GameRules,
  content: FirstServiceContent
): ReplayResult {
  assertReplayRefs(initialState, rules, content);
  let state = initialState;
  const events: GameEvent[] = [];
  for (const action of actions) {
    const result = reduce(state, action, rules, content);
    if (!result.ok) {
      fault(result.error.code, result.error.message, result.error.recovery);
    }
    if ("preview" in result) {
      fault(
        "TB_REPLAY_DIVERGED",
        "A canonical replay cannot include a preview-only action.",
        "Replay only accepted mutation events."
      );
    }
    if (result.duplicate) {
      fault(
        "TB_REPLAY_DIVERGED",
        "A canonical replay log cannot contain a duplicate action record.",
        "Deduplicate the recorded event tail."
      );
    }
    state = result.state;
    events.push(result.event);
  }
  return finalResult(initialState, state, events, rules, content);
}

export function replayEvents(
  initialState: ServiceState,
  events: readonly GameEvent[],
  rules: GameRules,
  content: FirstServiceContent
): ReplayResult {
  assertReplayRefs(initialState, rules, content);
  let state = initialState;
  const verifiedEvents: GameEvent[] = [];
  for (const recordedEvent of events) {
    const result = reduce(state, recordedEvent.action, rules, content);
    if (!result.ok || "preview" in result || result.duplicate) {
      fault(
        "TB_REPLAY_DIVERGED",
        `Replay rejected event ${recordedEvent.eventId}.`,
        "Return to the last verified snapshot and quarantine the divergent tail."
      );
    }
    if (canonicalize(result.event) !== canonicalize(recordedEvent)) {
      fault(
        "TB_REPLAY_DIVERGED",
        `Replay bytes diverged for event ${recordedEvent.eventId}.`,
        "Return to the last verified snapshot and quarantine the divergent tail."
      );
    }
    state = result.state;
    verifiedEvents.push(result.event);
  }
  return finalResult(initialState, state, verifiedEvents, rules, content);
}

export function verifyReplayResult(
  candidate: ReplayResult,
  rules: GameRules,
  content: FirstServiceContent
): ReplayResult {
  const verified = replayEvents(candidate.initialState, candidate.events, rules, content);
  if (candidate.replayDigest !== verified.replayDigest) {
    fault(
      "TB_DIGEST_MISMATCH",
      "The replay digest does not match canonical event bytes.",
      "Use the last verified local save or import a valid fork."
    );
  }
  if (candidate.stateDigest !== verified.stateDigest) {
    fault(
      "TB_REPLAY_DIVERGED",
      "The recorded state differs from canonical replay state.",
      "Use the recomputed verified state."
    );
  }
  return verified;
}
