import { canonicalize } from "./canonical.js";
import { fault } from "./errors.js";
import type {
  FirstServiceContent,
  GameRules,
  ReplayResult,
  SaveEnvelope
} from "./model.js";
import { replayEvents } from "./replay.js";
import { sameVersionRef, stateDigestInput } from "./simulation.js";
import { canonicalHash } from "./canonical.js";

export const MAX_IMPORT_BYTES = 2_000_000;

export function createSaveEnvelope(
  saveId: string,
  replay: ReplayResult,
  forkedFromSaveId?: string
): SaveEnvelope {
  const envelope: SaveEnvelope = {
    schemaVersion: 1,
    saveId,
    ...(forkedFromSaveId === undefined ? {} : { forkedFromSaveId }),
    rulesRef: replay.state.rulesRef,
    contentRef: replay.state.contentRef,
    initialState: replay.initialState,
    events: replay.events,
    state: replay.state,
    replayDigest: replay.replayDigest,
    stateDigest: replay.stateDigest
  };
  canonicalize(envelope);
  return envelope;
}

export function exportSave(envelope: SaveEnvelope): string {
  return canonicalize(envelope);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function utf8ByteLength(value: string): number {
  let byteLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      byteLength += 1;
    } else if (codeUnit <= 0x7ff) {
      byteLength += 2;
    } else if (
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      byteLength += 4;
      index += 1;
    } else {
      byteLength += 3;
    }
  }
  return byteLength;
}

function parseSave(serialized: string): SaveEnvelope {
  if (
    serialized.length > MAX_IMPORT_BYTES ||
    utf8ByteLength(serialized) > MAX_IMPORT_BYTES
  ) {
    fault(
      "TB_IMPORT_REJECTED",
      "The imported save exceeds the supported size bound.",
      "Choose a smaller Tender Baron save export."
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    fault(
      "TB_IMPORT_REJECTED",
      "The imported save is not valid JSON.",
      "Choose an unmodified Tender Baron save export."
    );
  }
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 1 ||
    typeof parsed.saveId !== "string" ||
    !Array.isArray(parsed.events) ||
    !isRecord(parsed.initialState) ||
    !isRecord(parsed.state) ||
    !isRecord(parsed.rulesRef) ||
    !isRecord(parsed.contentRef) ||
    typeof parsed.replayDigest !== "string" ||
    typeof parsed.stateDigest !== "string"
  ) {
    fault(
      "TB_IMPORT_REJECTED",
      "The imported save envelope is incomplete or unsupported.",
      "Choose a version 1 Tender Baron save export."
    );
  }
  canonicalize(parsed);
  return parsed as unknown as SaveEnvelope;
}

export function resumeSave(
  envelope: SaveEnvelope,
  rules: GameRules,
  content: FirstServiceContent
): ReplayResult {
  if (envelope.schemaVersion !== 1) {
    fault(
      "TB_SCHEMA_UNSUPPORTED",
      "The save schema is unsupported.",
      "Import a version 1 save."
    );
  }
  if (!sameVersionRef(envelope.rulesRef, rules.ref)) {
    fault(
      "TB_RULES_MISMATCH",
      "The save pins a different rules version.",
      "Load the save with its exact rules pack."
    );
  }
  if (!sameVersionRef(envelope.contentRef, content.ref)) {
    fault(
      "TB_CONTENT_MISMATCH",
      "The save pins a different content version.",
      "Load the save with its exact content pack."
    );
  }
  const verified = replayEvents(envelope.initialState, envelope.events, rules, content);
  if (verified.replayDigest !== envelope.replayDigest) {
    fault(
      "TB_DIGEST_MISMATCH",
      "The save replay digest does not match its canonical events.",
      "Quarantine the save and return to the last verified snapshot."
    );
  }
  if (
    verified.stateDigest !== envelope.stateDigest ||
    canonicalHash(stateDigestInput(envelope.state)) !== envelope.stateDigest
  ) {
    fault(
      "TB_SAVE_CORRUPT",
      "The saved state differs from canonical replay state.",
      "Quarantine the divergent state and use the verified replay result."
    );
  }
  return verified;
}

export function importSave(
  serialized: string,
  newSaveId: string,
  rules: GameRules,
  content: FirstServiceContent
): SaveEnvelope {
  const imported = parseSave(serialized);
  const verified = resumeSave(imported, rules, content);
  return createSaveEnvelope(newSaveId, verified, imported.saveId);
}

export class MemorySaveStore {
  readonly #saves = new Map<string, SaveEnvelope>();

  write(envelope: SaveEnvelope): void {
    this.#saves.set(envelope.saveId, envelope);
  }

  read(saveId: string): SaveEnvelope | undefined {
    return this.#saves.get(saveId);
  }

  delete(saveId: string): boolean {
    return this.#saves.delete(saveId);
  }

  fork(sourceSaveId: string, newSaveId: string): SaveEnvelope {
    const source = this.#saves.get(sourceSaveId);
    if (source === undefined) {
      fault(
        "TB_SAVE_CORRUPT",
        `Local save ${sourceSaveId} does not exist.`,
        "Choose an existing verified save."
      );
    }
    const fork = { ...source, saveId: newSaveId, forkedFromSaveId: sourceSaveId };
    this.write(fork);
    return fork;
  }

  list(): readonly SaveEnvelope[] {
    return [...this.#saves.values()].sort((left, right) =>
      left.saveId.localeCompare(right.saveId)
    );
  }
}
