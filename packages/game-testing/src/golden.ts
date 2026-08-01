import { replayActions } from "@tender-baron/game-domain";
import type { ReplayResult } from "@tender-baron/game-domain";
import { ServiceHarness } from "./harness.js";

export function buildGoldenFirstService(
  options: {
    readonly missingPotato?: boolean;
    readonly tableRecoveryChoice?: "SHARED_COURSE" | "SERVE_HONESTLY";
  } = {}
): {
  readonly harness: ServiceHarness;
  readonly replay: ReplayResult;
} {
  const service = new ServiceHarness();

  service.act("OPEN_HOUSE", {}, "open-house");
  service.act("INSPECT_PARTY", {}, "inspect-party");

  service.act("SELECT_CUT", { cutId: "cut_strip_a" }, "select-strip-a");
  service.act("SELECT_CUT", { cutId: "cut_strip_b" }, "select-strip-b");
  service.act("SELECT_CUT", { cutId: "cut_ribeye_c" }, "select-ribeye-c");
  service.act("SELECT_CUT", { cutId: "cut_filet_d" }, "select-filet-d");

  service.act("PLACE_CUT", { cutId: "cut_strip_a", cellId: "coal_a" }, "place-strip-a");
  service.act("PLACE_CUT", { cutId: "cut_strip_b", cellId: "coal_e" }, "place-strip-b");
  service.act("PLACE_CUT", { cutId: "cut_ribeye_c", cellId: "coal_b" }, "place-ribeye-c");
  service.act("PLACE_CUT", { cutId: "cut_filet_d", cellId: "coal_f" }, "place-filet-d");

  service.act(
    "ADVANCE_SIDE",
    { sideId: "side_ember_shallot", operation: "START" },
    "start-shallot"
  );
  service.act(
    "ADVANCE_SIDE",
    { sideId: "side_creamed_greens", operation: "START" },
    "start-greens"
  );

  service.tickTo(16);
  service.act("TEND_TABLE", { response: "ACKNOWLEDGE" }, "tend-table");

  service.tickTo(30);
  service.act("MOVE_TO_REST", { cutId: "cut_strip_a" }, "rest-strip-a");
  service.act("MOVE_CUT", { cutId: "cut_ribeye_c", cellId: "coal_a" }, "move-ribeye-sear");

  service.tickTo(32);
  service.act(
    "ADVANCE_SIDE",
    { sideId: "side_ember_shallot", operation: "PLATE" },
    "plate-shallot"
  );
  service.act(
    "ADVANCE_SIDE",
    { sideId: "side_creamed_greens", operation: "PLATE" },
    "plate-greens"
  );
  service.act(
    "ADVANCE_SIDE",
    { sideId: "side_smoked_potato", operation: "START" },
    "start-potato"
  );
  service.act(
    "ADVANCE_SIDE",
    { sideId: "side_brass_pan_mushrooms", operation: "START" },
    "start-mushrooms"
  );

  service.tickTo(34);
  service.act("MOVE_TO_REST", { cutId: "cut_filet_d" }, "rest-filet-d");

  service.tickTo(48);
  service.act("MOVE_CUT", { cutId: "cut_strip_b", cellId: "coal_b" }, "move-strip-b-hold");

  service.tickTo(56);
  service.act(
    "ADVANCE_SIDE",
    { sideId: "side_brass_pan_mushrooms", operation: "PLATE" },
    "plate-mushrooms"
  );

  service.tickTo(68);
  service.act("CARVE_CUT", { cutId: "cut_strip_a" }, "carve-strip-a");
  service.act("CARVE_CUT", { cutId: "cut_filet_d" }, "carve-filet-d");
  if (!options.missingPotato) {
    service.act(
      "ADVANCE_SIDE",
      { sideId: "side_smoked_potato", operation: "PLATE" },
      "plate-potato"
    );
  }
  service.act("MOVE_TO_REST", { cutId: "cut_strip_b" }, "rest-strip-b");
  service.act("MOVE_TO_REST", { cutId: "cut_ribeye_c" }, "rest-ribeye-c");

  service.tickTo(94);
  service.act("CARVE_CUT", { cutId: "cut_strip_b" }, "carve-strip-b");

  service.tickTo(98);
  service.act("CARVE_CUT", { cutId: "cut_ribeye_c" }, "carve-ribeye-c");
  if (options.missingPotato) {
    const recoveryChoice = options.tableRecoveryChoice ?? "SHARED_COURSE";
    service.act(
      "CHOOSE_RECOVERY",
      {
        targetType: "TABLE",
        targetId: "table_soft_reopening",
        choiceId: recoveryChoice
      },
      `${recoveryChoice.toLowerCase()}-recovery`
    );
  }
  service.act("CALL_THE_TABLE", {}, "call-the-table");
  service.act("SETTLE_SERVICE", {}, "settle-service");

  const replay = replayActions(
    service.initialState,
    service.actions,
    service.rules,
    service.content
  );
  service.state = replay.state;
  return { harness: service, replay };
}
