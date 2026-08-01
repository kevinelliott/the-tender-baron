"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useServiceSession } from "@/hooks/use-service-session";
import { projectService } from "@/lib/service-projection";
import type { CoverView, ServiceViewModel, ViewId } from "@/lib/service-types";
import { ArrowIcon, FireIcon, FocusIcon, PassIcon, PauseIcon, RakeIcon, RestIcon, RoomIcon } from "./icons";

const viewLabels: Record<ViewId, string> = {
  room: "Room",
  fire: "Fire",
  rest: "Rest",
  pass: "Pass",
};

type RecoveryChoice = "MOVE_TO_HOLD" | "CARVE_EARLY" | "RETURN_TO_HEAT" | "CLOCHE_HOLD" | "STAFF_MEAL";

function houseCents(cents: number) {
  return `${new Intl.NumberFormat("en-US").format(cents)} house cents`;
}

function serviceStep(status: string): string {
  if (status === "DORMANT") return "Open the house";
  if (status === "BRIEFING") return "Review the promise";
  if (status === "SETUP") return "Select and place the first cut";
  if (status === "OPEN") return "Conduct the service";
  if (status === "CLOSING") return "Close the house ledger";
  if (status === "SETTLED") return "Service settled locally";
  return "Service concluded";
}

export function ServiceShell() {
  const session = useServiceSession();
  const fixture = useMemo(
    () => projectService(session.state, session.content, session.rules),
    [session.content, session.rules, session.state],
  );
  const [view, setView] = useState<ViewId>("room");
  const [selectedCover, setSelectedCover] = useState<CoverView["id"]>("A");
  const [selectedPlacement, setSelectedPlacement] = useState("coal_a");
  const [rakeTargetIndex, setRakeTargetIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const controlsLocked = session.busy
    || session.storageState === "LOADING"
    || session.recovery !== null
    || session.conflict !== null;

  const selected = fixture.covers.find((cover) => cover.id === selectedCover) ?? fixture.covers[0];
  const placement = fixture.placements.find((item) => item.id === selectedPlacement) ?? fixture.placements[0];
  const rakeTargets = placement?.neighbors ?? [];
  const rakeTarget = rakeTargets.length === 0 ? undefined : rakeTargets[rakeTargetIndex % rakeTargets.length];
  const operatingPreview = fixture.ledgerPreview.reduce((total, line) => total + line.cents, 0);
  const canTableRecover = session.state.cuts.every((cut) => cut.status === "PLATED")
    && session.state.sides.filter((side) => side.status === "PLATED").length === session.state.sides.length - 1
    && session.state.table.recoveryChoice === undefined;

  function switchView(next: ViewId) {
    const tick = session.state.currentTick;
    setView(next);
    session.announce(`${viewLabels[next]} view. The shared service remains at canonical tick ${tick}.`);
  }

  function selectPlacement(id: string) {
    setSelectedPlacement(id);
    setRakeTargetIndex(0);
    session.clearRakePreview(`${id.replace("coal_", "Placement ").toUpperCase()} selected. Preview its exact rake path before applying.`);
  }

  function chooseRakeTarget(offset: number) {
    setRakeTargetIndex((index) => {
      const count = Math.max(rakeTargets.length, 1);
      return (index + offset + count) % count;
    });
    session.clearRakePreview("Rake target changed. The previous preview was cleared.");
  }

  async function advanceServiceStep() {
    if (session.state.serviceStatus === "DORMANT") {
      await session.dispatch("OPEN_HOUSE", {});
    } else if (session.state.serviceStatus === "BRIEFING") {
      await session.dispatch("INSPECT_PARTY", {});
    } else if (session.state.serviceStatus === "CLOSING") {
      await session.dispatch("SETTLE_SERVICE", {});
    } else {
      session.announce(serviceStep(session.state.serviceStatus));
    }
  }

  async function actOnSelectedCut() {
    if (selected.cutStatus === "CASE") {
      await session.dispatch("SELECT_CUT", { cutId: selected.cutId });
    } else if (selected.cutStatus === "TEMPERING") {
      await session.dispatch("PLACE_CUT", { cutId: selected.cutId, cellId: selectedPlacement });
    } else if (selected.cutStatus === "ON_GRILL") {
      await session.dispatch("TURN_CUT", { cutId: selected.cutId });
    } else if (selected.cutStatus === "RESTING" || selected.cutStatus === "READY_TO_CARVE") {
      await session.dispatch("CARVE_CUT", { cutId: selected.cutId });
    } else if (selected.cutStatus === "AT_RISK") {
      session.announce("Choose an authored recovery below; no recovery is selected automatically.");
    } else {
      session.announce(`${selected.label} is ${selected.statusLabel}. Choose another active service task.`);
    }
  }

  async function actOnSide(cover: CoverView) {
    if (cover.sideStatus === "PLANNED") {
      await session.dispatch("ADVANCE_SIDE", { sideId: cover.sideId, operation: "START" });
    } else if (cover.sideStatus === "READY" || cover.sideStatus === "HELD") {
      await session.dispatch("ADVANCE_SIDE", { sideId: cover.sideId, operation: "PLATE" });
    } else {
      session.announce(`${cover.side} is ${cover.sideStatus.toLowerCase().replaceAll("_", " ")}.`);
    }
  }

  async function handleRake() {
    if (placement === undefined || rakeTarget === undefined) {
      session.announce("Choose a coal placement with an authored neighbor.");
      return;
    }
    if (session.rakePreview === null) await session.previewRake(placement.id, rakeTarget);
    else await session.applyRake();
  }

  function recoverCut(choiceId: RecoveryChoice) {
    return session.dispatch("CHOOSE_RECOVERY", {
      targetType: "CUT",
      targetId: selected.cutId,
      choiceId,
    });
  }

  async function importSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file !== undefined) await session.importFile(file);
  }

  return (
    <main id="service-workspace" className={reducedMotion ? "service-app reduce-motion" : "service-app"} aria-busy={session.busy || session.storageState === "LOADING"}>
      <header className="house-header">
        <div className="house-mark" aria-label="The Tender Baron">
          <span className="mark-flame" aria-hidden="true"><span /></span>
          <div><p className="house-name">The Tender Baron</p><p className="house-line">A gentle hand on a serious fire.</p></div>
        </div>
        <div className="service-identity" aria-label="Current service"><span>{fixture.serviceTitle}</span><strong data-testid="service-status">{session.state.serviceStatus}</strong></div>
        <div className="header-actions">
          <button className="icon-button" type="button" aria-label={reducedMotion ? "Restore motion" : "Reduce motion"} aria-pressed={reducedMotion} onClick={() => setReducedMotion((value) => !value)}><FocusIcon /><span>{reducedMotion ? "Motion reduced" : "Reduce motion"}</span></button>
          <button className="icon-button" type="button" disabled={controlsLocked || session.state.serviceStatus !== "OPEN"} aria-label={session.state.paused ? "Resume service" : "Pause service"} onClick={() => void (session.state.paused ? session.resumeService() : session.pauseService())}><PauseIcon /><span>{session.state.paused ? "Resume" : "Pause"}</span></button>
          <span className="cadence-mark" aria-label="Canonical clock advances every 250 milliseconds"><i aria-hidden="true" /> Live cadence</span>
        </div>
      </header>

      <section className="truth-rail" aria-label="Prototype status">
        <span className="status-knot"><i aria-hidden="true" /> Device-local service</span>
        <span>Canonical tick <strong data-testid="canonical-tick">{session.state.currentTick}</strong></span>
        <span>Revision <strong data-testid="service-revision">{session.state.revision}</strong></span>
        <span className="truth-rail-wide">{session.storageState === "MEMORY_ONLY" ? "This tab only · closing it ends this service" : "One reducer stream · private prototype authority only"}</span>
        <span className={`status-badge storage-${session.storageState.toLowerCase()}`} data-testid="storage-state">{session.storageState.replaceAll("_", " ")}</span>
      </section>

      {session.recovery !== null ? (
        <section className="recovery-banner" role="alert" aria-labelledby="recovery-title">
          <div><strong id="recovery-title">{session.recovery.title}</strong><p>{session.recovery.detail}</p></div>
          <div className="recovery-actions">
            {session.recovery.canContinue ? <button type="button" onClick={session.dismissRecovery}>Continue verified service</button> : null}
            <button type="button" onClick={() => void session.startFresh("A fresh local service replaced the unreadable save.")}>Start fresh service</button>
          </div>
        </section>
      ) : null}

      {session.conflict !== null ? (
        <section className="recovery-banner conflict-banner" role="alert" aria-labelledby="conflict-title">
          <div><strong id="conflict-title">{session.conflict.title}</strong><p>{session.conflict.detail}{session.conflict.remoteRevision === undefined ? "" : ` The device save is at revision ${session.conflict.remoteRevision}.`}</p></div>
          <div className="recovery-actions"><button type="button" onClick={() => void session.reloadConflict()}>Reload newer history</button><button type="button" onClick={() => void session.forkConflict()}>Fork this tab</button></div>
        </section>
      ) : null}

      <section className="mobile-now-line" aria-label="Current service context">
        <span>Now</span><strong>{selected.label} · {selected.cut}</strong><small>{selected.statusLabel} · {fixture.promise}</small>
        <button className="mobile-service-step" type="button" disabled={controlsLocked} onClick={() => void advanceServiceStep()}>{serviceStep(session.state.serviceStatus)}</button>
      </section>

      <nav className="view-switcher desktop-view-switcher" aria-label="Service views">
        {(["room", "fire", "rest", "pass"] as const).map((item) => {
          const Icon = item === "room" ? RoomIcon : item === "fire" ? FireIcon : item === "rest" ? RestIcon : PassIcon;
          const title = item === "room" ? "Service Theatre" : item === "fire" ? "Coal Table" : item === "rest" ? "Active Rest" : "Whole-table Pass";
          const detail = item === "room" ? "Read the room" : item === "fire" ? "Conduct the fire" : item === "rest" ? "Hold the work" : "Keep the promise";
          return <button key={item} type="button" className={view === item ? "active" : ""} aria-pressed={view === item} onClick={() => switchView(item)}><Icon /><span>{title}</span><small>{detail}</small></button>;
        })}
      </nav>

      <div className="service-grid">
        <section className="promise-folio" aria-labelledby="promise-title">
          <div className="folio-corner" aria-hidden="true" />
          <h1 id="promise-title">One promise.<br />Four plates.</h1>
          <p>{fixture.occasion}</p>
          <div className="promise-copy"><span>Tonight’s promise</span><strong>{fixture.promise}</strong></div>
          <dl className="service-facts"><div><dt>Shared window</dt><dd>{fixture.syncWindowTicks} ticks</dd></div><div><dt>Rest capacity</dt><dd>{session.state.capacities.rest} slots</dd></div><div><dt>Sides ready</dt><dd>{fixture.sidesReady} of 4</dd></div></dl>
          <button className="folio-action" type="button" disabled={controlsLocked} onClick={() => void advanceServiceStep()}>{serviceStep(session.state.serviceStatus)}</button>
          <details className="save-book">
            <summary>Device save book</summary>
            <p><strong>{session.activeSaveId}</strong><br />Revision {session.state.revision} · {session.saves.length || (session.storageState === "MEMORY_ONLY" ? 0 : 1)} local {session.saves.length === 1 ? "history" : "histories"}</p>
            <div className="save-actions">
              <button type="button" onClick={session.exportCurrent}>Export verified save</button>
              <button type="button" disabled={session.storageState === "MEMORY_ONLY"} onClick={() => importRef.current?.click()}>Import verified save</button>
              <button type="button" onClick={() => void session.forkCurrent()}>Fork this history</button>
              <button type="button" className={deleteArmed ? "danger-action armed" : "danger-action"} onClick={() => { if (deleteArmed) { setDeleteArmed(false); void session.deleteCurrent(); } else setDeleteArmed(true); }}>{deleteArmed ? "Confirm delete local save" : "Delete local save"}</button>
            </div>
            <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Choose a Tender Baron save to import" onChange={(event) => void importSelected(event)} />
          </details>
        </section>

        <section className="working-stage" aria-label={`${viewLabels[view]} task plane`}>
          {view === "room" ? <ServiceTheatre fixture={fixture} selectedCover={selectedCover} busy={controlsLocked} onSelectCover={setSelectedCover} onEnterFire={() => switchView("fire")} onCall={() => void session.dispatch("CALL_THE_TABLE", {})} /> : null}
          {view === "fire" ? <CoalTable fixture={fixture} selectedCover={selectedCover} selectedPlacement={selectedPlacement} rakeTarget={rakeTarget} previewReady={session.rakePreview !== null} busy={controlsLocked} onSelectCover={setSelectedCover} onSelectPlacement={selectPlacement} onChooseTarget={chooseRakeTarget} onReadRoom={() => switchView("room")} onRake={() => void handleRake()} onCutAction={() => void actOnSelectedCut()} onMove={() => void session.dispatch("MOVE_CUT", { cutId: selected.cutId, cellId: selectedPlacement })} onBaste={() => void session.dispatch("APPLY_BASTE", { cutId: selected.cutId, profileId: "HOUSE_BASTE" })} onRecover={(choice) => void recoverCut(choice)} /> : null}
          {view === "rest" ? <RestPlane fixture={fixture} selected={selected} busy={controlsLocked} onSelectCover={setSelectedCover} onMoveToRest={() => void session.dispatch("MOVE_TO_REST", { cutId: selected.cutId })} onSetMode={(mode) => void session.dispatch("SET_REST_MODE", { cutId: selected.cutId, mode })} onCarve={() => void actOnSelectedCut()} onRecover={(choice) => void recoverCut(choice)} /> : null}
          {view === "pass" ? <PassPlane fixture={fixture} busy={controlsLocked} serviceStatus={session.state.serviceStatus} canRecover={canTableRecover} onSelectCover={setSelectedCover} onSide={actOnSide} onRecover={(choiceId) => void session.dispatch("CHOOSE_RECOVERY", { targetType: "TABLE", targetId: session.state.table.id, choiceId })} onCall={() => void session.dispatch(session.state.serviceStatus === "CLOSING" ? "SETTLE_SERVICE" : "CALL_THE_TABLE", {})} /> : null}
        </section>

        <aside className="conductor-rail" aria-labelledby="now-title">
          <div className="rail-heading"><div><span id="now-title">Now line</span><strong>{selected.label} · {selected.cut}</strong></div><span className={`shape-mark ${selected.targetShape}`} role="img" aria-label={`${selected.targetShape} target marker`} /></div>
          <ol className="path-score" aria-label={`${selected.label} heat and rest path`}>{selected.path.slice(-5).map((step, index) => <li key={`${step}-${index}`} className={index === selected.path.slice(-5).length - 1 ? "current" : "complete"}><span className="score-node" aria-hidden="true" /><div><strong>{step}</strong><small>{index === selected.path.slice(-5).length - 1 ? "Current canonical state" : "Recorded path"}</small></div></li>)}</ol>
          <div className="attention-note"><span>{fixture.attention.status}</span><strong>{fixture.attention.label}</strong><p>{fixture.attention.detail}</p><div className="attention-actions"><button type="button" disabled={controlsLocked || !["REQUESTED", "DEFERRED"].includes(session.state.attention.status)} onClick={() => void session.dispatch("TEND_TABLE", { response: "ACKNOWLEDGE" })}>Acknowledge</button><button type="button" disabled={controlsLocked || !["REQUESTED", "DEFERRED"].includes(session.state.attention.status)} onClick={() => void session.dispatch("TEND_TABLE", { response: "DEFER" })}>Defer deliberately</button><button type="button" disabled={controlsLocked || session.state.hostAssistRemaining < 1 || !["REQUESTED", "DEFERRED", "MISSED"].includes(session.state.attention.status)} onClick={() => void session.dispatch("CHOOSE_RECOVERY", { targetType: "ATTENTION", targetId: session.state.table.id, choiceId: "HOST_ASSIST" })}>Ask the Baron to assist</button></div></div>
          <div className="ledger-peek"><div><span>{session.state.settlement === undefined ? "Operating preview" : "Settled result"}</span><strong>{houseCents(session.state.settlement?.ledger.operatingResultCents ?? operatingPreview)}</strong></div><p>Device-local house accounting. No transferable value or issuer claim.</p><button type="button" onClick={() => switchView("pass")}>Read the service pass</button></div>
        </aside>
      </div>

      <div className="notice-rail" role="status" aria-live="polite"><span className="notice-pin" aria-hidden="true" /><span data-testid="service-notice">{session.notice}</span></div>
      <nav className="mobile-task-nav" aria-label="Mobile task planes">{(["room", "fire", "rest", "pass"] as const).map((item) => { const Icon = item === "room" ? RoomIcon : item === "fire" ? FireIcon : item === "rest" ? RestIcon : PassIcon; return <button key={item} type="button" className={view === item ? "active" : ""} aria-pressed={view === item} onClick={() => switchView(item)}><Icon /><span>{viewLabels[item]}</span></button>; })}</nav>
    </main>
  );
}

function RecoveryChoices({ selected, busy, onRecover }: { selected: CoverView; busy: boolean; onRecover: (choice: RecoveryChoice) => void }) {
  if (selected.cutStatus !== "AT_RISK") return null;
  const choices: readonly { id: RecoveryChoice; label: string; detail: string }[] = selected.riskLocation === "REST"
    ? [
        { id: "RETURN_TO_HEAT", label: "Return to gentle heat", detail: "Restore surface before carving" },
        { id: "CLOCHE_HOLD", label: "Cloche hold", detail: "Protect the table window" },
        { id: "CARVE_EARLY", label: "Carve honestly", detail: "Serve a recovered result" },
        { id: "STAFF_MEAL", label: "Staff meal", detail: "Protect the guest promise" },
      ]
    : [
        { id: "MOVE_TO_HOLD", label: "Move to holding heat", detail: "Continue on a gentler coal zone" },
        { id: "CLOCHE_HOLD", label: "Move under cloche", detail: "Use a live rest slot" },
        { id: "CARVE_EARLY", label: "Carve honestly", detail: "Serve a recovered result" },
        { id: "STAFF_MEAL", label: "Staff meal", detail: "Protect the guest promise" },
      ];
  return <section className="recovery-score" aria-labelledby="cut-recovery-title"><div><strong id="cut-recovery-title">{selected.label} needs a recovery</strong><p>Choose the tradeoff; the house will not choose for you.</p></div><div>{choices.map((choice) => <button key={choice.id} type="button" disabled={busy} onClick={() => onRecover(choice.id)}><strong>{choice.label}</strong><small>{choice.detail}</small></button>)}</div></section>;
}

function ServiceTheatre({ fixture, selectedCover, busy, onSelectCover, onEnterFire, onCall }: { fixture: ServiceViewModel; selectedCover: CoverView["id"]; busy: boolean; onSelectCover: (id: CoverView["id"]) => void; onEnterFire: () => void; onCall: () => void }) {
  return <div className="theatre-view" data-testid="service-theatre"><header className="stage-heading"><div><h2>Service Theatre</h2><p>The whole room shares one live promise.</p></div><button className="cross-view-action" type="button" onClick={onEnterFire}><span>Enter the fire</span><ArrowIcon /></button></header><div className="room-scene"><div className="window-grid" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div><div className="baron-figure" aria-hidden="true"><span className="baron-hair" /><span className="baron-face" /><span className="baron-coat" /><span className="baron-cloth" /></div><div className="dining-table" aria-label="Four-guest soft reopening table"><div className="table-lamp" aria-hidden="true" />{fixture.covers.map((cover, index) => <button key={cover.id} data-testid={`cover-${cover.id}`} type="button" className={`guest-seat seat-${index + 1} ${selectedCover === cover.id ? "selected" : ""}`} aria-label={`${cover.label}: ${cover.cut}, ${cover.target}, ${cover.statusLabel}`} aria-pressed={selectedCover === cover.id} onClick={() => onSelectCover(cover.id)}><span className="guest-portrait" aria-hidden="true"><i /></span><span>{cover.id}</span><small>{cover.statusLabel}</small></button>)}<div className="table-service" aria-hidden="true"><i /><i /><i /><i /></div></div><div className="pass-window" aria-label="Open grill beyond the pass"><span>Fire beyond the pass</span><div className="pass-embers" aria-hidden="true"><i /><i /><i /><i /><i /></div><small>{fixture.cutsOnGrill} cuts on grill · {fixture.restSlots.filter((slot) => slot.coverId !== undefined).length} resting</small></div></div><div className="table-promise-rail">{fixture.covers.map((cover) => <button key={cover.id} type="button" className={selectedCover === cover.id ? "selected" : ""} aria-pressed={selectedCover === cover.id} onClick={() => onSelectCover(cover.id)}><span className={`shape-mark ${cover.targetShape}`} aria-hidden="true" /><span><strong>{cover.label}</strong><small>{cover.cut} · {cover.target}</small></span><em>{cover.side} · {cover.sideStatus.toLowerCase()}</em></button>)}<button className="promise-action" type="button" disabled={busy} onClick={onCall}><PassIcon /><span><strong>Call the table</strong><small>Commit the shared promise</small></span></button></div></div>;
}

function CoalTable({ fixture, selectedCover, selectedPlacement, rakeTarget, previewReady, busy, onSelectCover, onSelectPlacement, onChooseTarget, onReadRoom, onRake, onCutAction, onMove, onBaste, onRecover }: { fixture: ServiceViewModel; selectedCover: CoverView["id"]; selectedPlacement: string; rakeTarget?: string; previewReady: boolean; busy: boolean; onSelectCover: (id: CoverView["id"]) => void; onSelectPlacement: (id: string) => void; onChooseTarget: (offset: number) => void; onReadRoom: () => void; onRake: () => void; onCutAction: () => void; onMove: () => void; onBaste: () => void; onRecover: (choice: RecoveryChoice) => void }) {
  const selected = fixture.covers.find((cover) => cover.id === selectedCover) ?? fixture.covers[0];
  const cutAction = selected.cutStatus === "CASE" ? "Select cut" : selected.cutStatus === "TEMPERING" ? "Place cut" : selected.cutStatus === "ON_GRILL" ? "Turn cut" : "Review cut";
  return <div className="coal-view" data-testid="coal-table"><header className="stage-heading"><div><h2>Coal Table</h2><p>Deterministic heat paths · abstract game units</p></div><button className="cross-view-action reverse" type="button" onClick={onReadRoom}><ArrowIcon /><span>Read the room</span></button></header><div className="coal-field" aria-label="Authored coal field"><div className="coal-texture" aria-hidden="true">{Array.from({ length: 42 }, (_, index) => <i key={index} className={`coal coal-${(index % 7) + 1}`} />)}</div>{fixture.placements.map((place, index) => <button key={place.id} data-testid={`placement-${place.id}`} type="button" className={`heat-zone zone-position-${index + 1} band-${place.band.toLowerCase()} ${selectedPlacement === place.id ? "selected" : ""}`} aria-pressed={selectedPlacement === place.id} onClick={() => onSelectPlacement(place.id)}><span>{place.label}</span><strong>{place.coalUnits} coal · {place.band}</strong><small>{place.description}</small></button>)}<div className="cut-paths" aria-label="Cut paths">{fixture.covers.filter((cover) => cover.cellId !== undefined).map((cover, index) => <button key={cover.id} type="button" className={`cut-marker cut-${(index % 3) + 1} ${selectedCover === cover.id ? "selected" : ""}`} aria-pressed={selectedCover === cover.id} onClick={() => onSelectCover(cover.id)}><span className="cut-art" aria-hidden="true"><i /><i /><i /></span><strong>{cover.id}</strong><small>{cover.cut}</small></button>)}</div></div><div className="fire-controls" aria-label="Live fire controls"><div className="control-copy"><RakeIcon /><span><strong>{selected.label} · {selected.statusLabel}</strong><small>Rake toward {rakeTarget?.replace("coal_", "placement ").toUpperCase() ?? "an authored neighbor"}</small></span></div><div className="direction-controls" role="group" aria-label="Rake target"><button type="button" aria-label="Previous rake target" onClick={() => onChooseTarget(-1)}><span aria-hidden="true">L</span></button><button type="button" aria-label="Next rake target" onClick={() => onChooseTarget(1)}><span aria-hidden="true">R</span></button></div><button data-testid="cut-action" className="secondary-action" type="button" disabled={busy} onClick={onCutAction}>{cutAction}</button><button data-testid="move-cut" className="secondary-action" type="button" disabled={busy || selected.cutStatus !== "ON_GRILL" || selected.cellId === selectedPlacement} onClick={onMove}>Move cut</button><button data-testid="baste-cut" className="secondary-action" type="button" disabled={busy || selected.cutStatus !== "ON_GRILL"} onClick={onBaste}>House baste</button><button data-testid="rake-action" className="primary-action" type="button" disabled={busy} onClick={onRake}>{previewReady ? "Apply inspected rake" : "Preview rake"}</button></div><RecoveryChoices selected={selected} busy={busy} onRecover={onRecover} /></div>;
}

function RestPlane({ fixture, selected, busy, onSelectCover, onMoveToRest, onSetMode, onCarve, onRecover }: { fixture: ServiceViewModel; selected: CoverView; busy: boolean; onSelectCover: (id: CoverView["id"]) => void; onMoveToRest: () => void; onSetMode: (mode: "OPEN_REST" | "CLOCHE_HOLD") => void; onCarve: () => void; onRecover: (choice: RecoveryChoice) => void }) {
  return <div className="focused-plane" data-testid="rest-plane"><header className="stage-heading"><div><h2>Active Rest</h2><p>Capacity, carryover, and the work between.</p></div></header><div className="rest-bench">{fixture.restSlots.map((slot) => { const cover = fixture.covers.find((item) => item.id === slot.coverId); return <section key={slot.id} className={cover ? "rest-slot occupied" : "rest-slot"} aria-label={slot.label}><span className="slot-number">{slot.id.endsWith("1") ? "I" : "II"}</span>{cover ? <button type="button" aria-pressed={selected.id === cover.id} onClick={() => onSelectCover(cover.id)}><span className="cut-art" aria-hidden="true"><i /><i /><i /></span><strong>{cover.label} · {cover.cut}</strong><small>{slot.detail}</small></button> : <div><strong>Available</strong><small>{slot.detail}</small></div>}</section>; })}</div><div className="rest-choices"><button type="button" disabled={busy || selected.cutStatus !== "ON_GRILL"} onClick={onMoveToRest}><RestIcon /><span><strong>Move to rest</strong><small>Use one live capacity slot</small></span></button><button type="button" disabled={busy || !["RESTING", "READY_TO_CARVE"].includes(selected.cutStatus)} onClick={() => onSetMode("CLOCHE_HOLD")}><PassIcon /><span><strong>Cloche hold</strong><small>Wider range; softer surface</small></span></button><button type="button" disabled={busy || !["RESTING", "READY_TO_CARVE"].includes(selected.cutStatus)} onClick={onCarve}><FocusIcon /><span><strong>Carve</strong><small>Commit the authored result</small></span></button></div><RecoveryChoices selected={selected} busy={busy} onRecover={onRecover} /></div>;
}

function PassPlane({ fixture, busy, serviceStatus, canRecover, onSelectCover, onSide, onRecover, onCall }: { fixture: ServiceViewModel; busy: boolean; serviceStatus: string; canRecover: boolean; onSelectCover: (id: CoverView["id"]) => void; onSide: (cover: CoverView) => void; onRecover: (choice: "SHARED_COURSE" | "SERVE_HONESTLY") => void; onCall: () => void }) {
  return <div className="focused-plane" data-testid="pass-plane"><header className="stage-heading"><div><h2>Whole-table Pass</h2><p>Possible is not the same as promised.</p></div></header><div className="pass-board">{fixture.covers.map((cover) => <div className="pass-row" key={cover.id}><button type="button" className="pass-cover" onClick={() => onSelectCover(cover.id)}><span className={`cover-letter state-${cover.cutStatus.toLowerCase()}`}>{cover.id}</span><span><strong>{cover.cut}</strong><small>{cover.target}</small></span><span><strong>{cover.statusLabel}</strong><small>{cover.side}</small></span></button><button type="button" className="side-action" disabled={busy || !["PLANNED", "READY", "HELD"].includes(cover.sideStatus)} onClick={() => void onSide(cover)}>{cover.sideStatus === "PLANNED" ? "Start side" : cover.sideStatus === "READY" || cover.sideStatus === "HELD" ? "Plate side" : cover.sideStatus.toLowerCase()}</button></div>)}</div>{canRecover ? <section className="table-recovery" aria-labelledby="table-recovery-title"><div><strong id="table-recovery-title">One component is missing</strong><p>Choose how the house keeps faith with the whole table.</p></div><button type="button" disabled={busy} onClick={() => onRecover("SHARED_COURSE")}>Offer a shared course</button><button type="button" disabled={busy} onClick={() => onRecover("SERVE_HONESTLY")}>Serve honestly with a courtesy</button></section> : null}<div className="call-table-panel"><div><span>Shared window</span><strong>{fixture.syncWindowTicks} ticks</strong><p>Every plate and recovery decision is checked by the live reducer.</p></div><button type="button" disabled={busy} onClick={onCall}><PassIcon /><span><strong>{serviceStatus === "CLOSING" ? "Close ledger" : "Call the table"}</strong><small>Commit the current canonical state</small></span></button></div></div>;
}
