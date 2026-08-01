import {
  createInitialState,
  makeAction,
  reduce
} from "@tender-baron/game-domain";
import type {
  ActionPayloadMap,
  ActionType,
  FirstServiceContent,
  GameAction,
  GameEvent,
  GameRules,
  RakePreview,
  ServiceState
} from "@tender-baron/game-domain";
import {
  FIRST_SERVICE_CONTENT,
  RULES_V1
} from "@tender-baron/game-content";

export class ServiceHarness {
  readonly rules: GameRules;
  readonly content: FirstServiceContent;
  readonly initialState: ServiceState;
  state: ServiceState;
  readonly actions: GameAction[] = [];
  readonly events: GameEvent[] = [];

  constructor(
    rules: GameRules = RULES_V1,
    content: FirstServiceContent = FIRST_SERVICE_CONTENT,
    serviceId = "fixture-service",
    serviceSeed = "fixture-seed"
  ) {
    this.rules = rules;
    this.content = content;
    this.initialState = createInitialState(serviceId, serviceSeed, rules, content);
    this.state = this.initialState;
  }

  act<T extends ActionType>(
    type: T,
    payload: ActionPayloadMap[T],
    actionId?: string
  ): GameEvent {
    const action = makeAction(this.state, type, payload as never, actionId);
    const result = reduce(this.state, action, this.rules, this.content);
    if (!result.ok) {
      throw new Error(`${result.error.code}: ${result.error.message}`);
    }
    if ("preview" in result) {
      throw new Error("Preview action submitted through the canonical action path.");
    }
    if (!result.duplicate) {
      this.actions.push(action);
      this.events.push(result.event);
    }
    this.state = result.state;
    return result.event;
  }

  previewRake(
    sourceCellId: string,
    targetCellId: string,
    amount: number,
    actionId = `preview-${this.state.revision}`
  ): RakePreview {
    const action = makeAction(
      this.state,
      "PREVIEW_RAKE",
      { sourceCellId, targetCellId, amount },
      actionId
    );
    const result = reduce(this.state, action, this.rules, this.content);
    if (!result.ok) {
      throw new Error(`${result.error.code}: ${result.error.message}`);
    }
    if (!("preview" in result)) {
      throw new Error("Expected a rake preview result.");
    }
    return result.preview;
  }

  tick(count = 1): void {
    for (let index = 0; index < count; index += 1) {
      this.act(
        "ADVANCE_TICK",
        { ticks: 1 },
        `tick-${this.state.currentTick + 1}`
      );
    }
  }

  tickTo(targetTick: number): void {
    if (targetTick < this.state.currentTick) {
      throw new Error(`Cannot tick backward from ${this.state.currentTick} to ${targetTick}.`);
    }
    this.tick(targetTick - this.state.currentTick);
  }
}
