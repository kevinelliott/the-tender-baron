import {
  createInitialState,
  makeAction,
  reduce,
  replayActions,
} from "@tender-baron/game-domain";
import type {
  ActionPayloadMap,
  ActionType,
  GameAction,
  ServiceState,
} from "@tender-baron/game-domain";
import { FIRST_SERVICE_CONTENT, RULES_V1 } from "@tender-baron/game-content";

/** Browser-owned reproduction of the checked-in Node golden choreography. */
export function buildBrowserGoldenFirstService() {
  const initialState = createInitialState("fixture-service", "fixture-seed", RULES_V1, FIRST_SERVICE_CONTENT);
  let state: ServiceState = initialState;
  const actions: GameAction[] = [];

  function act<T extends ActionType>(type: T, payload: ActionPayloadMap[T], actionId: string) {
    const action = makeAction(state, type, payload as never, actionId);
    const result = reduce(state, action, RULES_V1, FIRST_SERVICE_CONTENT);
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
    if ("preview" in result) throw new Error("Golden replay cannot contain preview-only actions.");
    state = result.state;
    actions.push(action);
  }

  function tickTo(target: number) {
    while (state.currentTick < target) {
      act("ADVANCE_TICK", { ticks: 1 }, `tick-${state.currentTick + 1}`);
    }
  }

  act("OPEN_HOUSE", {}, "open-house");
  act("INSPECT_PARTY", {}, "inspect-party");
  act("SELECT_CUT", { cutId: "cut_strip_a" }, "select-strip-a");
  act("SELECT_CUT", { cutId: "cut_strip_b" }, "select-strip-b");
  act("SELECT_CUT", { cutId: "cut_ribeye_c" }, "select-ribeye-c");
  act("SELECT_CUT", { cutId: "cut_filet_d" }, "select-filet-d");
  act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place-strip-a");
  act("PLACE_CUT", { cutId: "cut_strip_b", cellId: "coal_e" }, "place-strip-b");
  act("PLACE_CUT", { cutId: "cut_ribeye_c", cellId: "coal_b" }, "place-ribeye-c");
  act("PLACE_CUT", { cutId: "cut_filet_d", cellId: "coal_f" }, "place-filet-d");
  act("ADVANCE_SIDE", { sideId: "side_ember_shallot", operation: "START" }, "start-shallot");
  act("ADVANCE_SIDE", { sideId: "side_creamed_greens", operation: "START" }, "start-greens");
  tickTo(16);
  act("TEND_TABLE", { response: "ACKNOWLEDGE" }, "tend-table");
  tickTo(30);
  act("MOVE_TO_REST", { cutId: "cut_strip_a" }, "rest-strip-a");
  act("MOVE_CUT", { cutId: "cut_ribeye_c", cellId: "coal_a" }, "move-ribeye-sear");
  tickTo(32);
  act("ADVANCE_SIDE", { sideId: "side_ember_shallot", operation: "PLATE" }, "plate-shallot");
  act("ADVANCE_SIDE", { sideId: "side_creamed_greens", operation: "PLATE" }, "plate-greens");
  act("ADVANCE_SIDE", { sideId: "side_smoked_potato", operation: "START" }, "start-potato");
  act("ADVANCE_SIDE", { sideId: "side_brass_pan_mushrooms", operation: "START" }, "start-mushrooms");
  tickTo(34);
  act("MOVE_TO_REST", { cutId: "cut_filet_d" }, "rest-filet-d");
  tickTo(48);
  act("MOVE_CUT", { cutId: "cut_strip_b", cellId: "coal_b" }, "move-strip-b-hold");
  tickTo(56);
  act("ADVANCE_SIDE", { sideId: "side_brass_pan_mushrooms", operation: "PLATE" }, "plate-mushrooms");
  tickTo(68);
  act("CARVE_CUT", { cutId: "cut_strip_a" }, "carve-strip-a");
  act("CARVE_CUT", { cutId: "cut_filet_d" }, "carve-filet-d");
  act("ADVANCE_SIDE", { sideId: "side_smoked_potato", operation: "PLATE" }, "plate-potato");
  act("MOVE_TO_REST", { cutId: "cut_strip_b" }, "rest-strip-b");
  act("MOVE_TO_REST", { cutId: "cut_ribeye_c" }, "rest-ribeye-c");
  tickTo(94);
  act("CARVE_CUT", { cutId: "cut_strip_b" }, "carve-strip-b");
  tickTo(98);
  act("CARVE_CUT", { cutId: "cut_ribeye_c" }, "carve-ribeye-c");
  act("CALL_THE_TABLE", {}, "call-the-table");
  act("SETTLE_SERVICE", {}, "settle-service");
  return replayActions(initialState, actions, RULES_V1, FIRST_SERVICE_CONTENT);
}
