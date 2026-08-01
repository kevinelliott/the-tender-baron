"use client";

import { useMemo, useState } from "react";
import type { FirstServiceFixture, ViewId } from "@/lib/service-types";
import { ArrowIcon, FireIcon, FocusIcon, PassIcon, PauseIcon, RakeIcon, RestIcon, RoomIcon } from "./icons";

type ServiceShellProps = { fixture: FirstServiceFixture };

const viewLabels: Record<ViewId, string> = {
  room: "Room",
  fire: "Fire",
  rest: "Rest",
  pass: "Pass",
};

function houseCents(cents: number) {
  return `${new Intl.NumberFormat("en-US").format(cents)} house cents`;
}

export function ServiceShell({ fixture }: ServiceShellProps) {
  const [view, setView] = useState<ViewId>("room");
  const [selectedCover, setSelectedCover] = useState("C");
  const [selectedZone, setSelectedZone] = useState("cook");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notice, setNotice] = useState("Presentation shell ready. Domain actions are not connected yet.");

  const selected = fixture.covers.find((cover) => cover.id === selectedCover) ?? fixture.covers[0];
  const operatingPreview = useMemo(
    () => fixture.ledgerPreview.reduce((total, line) => total + line.cents, 0),
    [fixture.ledgerPreview],
  );

  function switchView(next: ViewId) {
    setView(next);
    setNotice(`${viewLabels[next]} view. Canonical tick remains ${fixture.canonicalTick}.`);
  }

  function showSpecified(action: string) {
    setNotice(`${action} is specified, but the domain reducer is not connected in this UI branch.`);
  }

  return (
    <main id="service-workspace" className={reducedMotion ? "service-app reduce-motion" : "service-app"}>
      <header className="house-header">
        <div className="house-mark" aria-label="The Tender Baron">
          <span className="mark-flame" aria-hidden="true"><span /></span>
          <div>
            <p className="house-name">The Tender Baron</p>
            <p className="house-line">A gentle hand on a serious fire.</p>
          </div>
        </div>

        <div className="service-identity" aria-label="Current service">
          <span>{fixture.serviceTitle}</span>
          <strong>{fixture.serviceStatus}</strong>
        </div>

        <div className="header-actions">
          <button className="icon-button" type="button" aria-label={reducedMotion ? "Restore motion" : "Reduce motion"} aria-pressed={reducedMotion} onClick={() => setReducedMotion((value) => !value)}>
            <FocusIcon />
            <span>{reducedMotion ? "Motion reduced" : "Reduce motion"}</span>
          </button>
          <button className="icon-button" type="button" aria-label="Pause service, specified only" onClick={() => showSpecified("Pause service")}>
            <PauseIcon />
            <span>Pause</span>
          </button>
        </div>
      </header>

      <section className="truth-rail" aria-label="Prototype status">
        <span className="status-knot"><i aria-hidden="true" /> Local fixture</span>
        <span>Canonical tick <strong data-testid="canonical-tick">{fixture.canonicalTick}</strong></span>
        <span className="truth-rail-wide">Presentation state only · no simulation claims</span>
        <span className="status-badge">Specified · domain not connected</span>
      </section>

      <section className="mobile-now-line" aria-label="Current service context">
        <span>Now</span>
        <strong>{selected.label} · {selected.cut}</strong>
        <small>{fixture.promise} · next safe decision in 18 ticks</small>
      </section>

      <nav className="view-switcher desktop-view-switcher" aria-label="Service views">
        <button type="button" className={view === "room" ? "active" : ""} aria-pressed={view === "room"} onClick={() => switchView("room")}>
          <RoomIcon /><span>Service Theatre</span><small>Read the room</small>
        </button>
        <button type="button" className={view === "fire" ? "active" : ""} aria-pressed={view === "fire"} onClick={() => switchView("fire")}>
          <FireIcon /><span>Coal Table</span><small>Conduct the fire</small>
        </button>
      </nav>

      <div className="service-grid">
        <section className="promise-folio" aria-labelledby="promise-title">
          <div className="folio-corner" aria-hidden="true" />
          <h1 id="promise-title">One promise.<br />Four plates.</h1>
          <p>{fixture.occasion}</p>
          <div className="promise-copy">
            <span>Tonight’s promise</span>
            <strong>{fixture.promise}</strong>
          </div>
          <dl className="service-facts">
            <div><dt>Shared window</dt><dd>{fixture.syncWindowTicks} ticks</dd></div>
            <div><dt>Rest capacity</dt><dd>2 slots</dd></div>
            <div><dt>Sides ready</dt><dd>{fixture.sidesReady} of 4</dd></div>
          </dl>
          <button className="folio-action" type="button" onClick={() => showSpecified("Inspect party")}>Inspect party details</button>
        </section>

        <section className="working-stage" aria-label={`${viewLabels[view]} task plane`}>
          {view === "room" ? <ServiceTheatre fixture={fixture} selectedCover={selectedCover} onSelectCover={setSelectedCover} onEnterFire={() => switchView("fire")} onSpecified={showSpecified} /> : null}
          {view === "fire" ? <CoalTable fixture={fixture} selectedCover={selectedCover} selectedZone={selectedZone} onSelectCover={setSelectedCover} onSelectZone={setSelectedZone} onReadRoom={() => switchView("room")} onSpecified={showSpecified} /> : null}
          {view === "rest" ? <RestPlane fixture={fixture} selectedCover={selectedCover} onSelectCover={setSelectedCover} onSpecified={showSpecified} /> : null}
          {view === "pass" ? <PassPlane fixture={fixture} onSelectCover={setSelectedCover} onSpecified={showSpecified} /> : null}
        </section>

        <aside className="conductor-rail" aria-labelledby="now-title">
          <div className="rail-heading">
            <div>
              <span id="now-title">Now line</span>
              <strong>{selected.label} · {selected.cut}</strong>
            </div>
            <span className={`shape-mark ${selected.targetShape}`} aria-label={`${selected.targetShape} target marker`} />
          </div>

          <ol className="path-score" aria-label={`${selected.label} heat and rest path`}>
            {selected.path.map((step, index) => (
              <li key={step} className={index === 1 ? "current" : index === 0 ? "complete" : "upcoming"}>
                <span className="score-node" aria-hidden="true" />
                <div><strong>{step}</strong><small>{index === 1 ? "Current fixture state" : index === 0 ? "Recorded" : "Ahead"}</small></div>
              </li>
            ))}
          </ol>

          <div className="attention-note">
            <span>Attention requested</span>
            <strong>{fixture.attention.label}</strong>
            <p>{fixture.attention.detail}</p>
            <button type="button" onClick={() => showSpecified("Acknowledge attention")}>Review response</button>
          </div>

          <div className="ledger-peek">
            <div><span>Operating preview</span><strong>{houseCents(operatingPreview)}</strong></div>
            <p>Illustrative fixture line items. Settlement is not implemented.</p>
            <button type="button" onClick={() => showSpecified("Open ledger")}>Read the ledger</button>
          </div>
        </aside>
      </div>

      <div className="notice-rail" role="status" aria-live="polite">
        <span className="notice-pin" aria-hidden="true" />
        {notice}
      </div>

      <nav className="mobile-task-nav" aria-label="Mobile task planes">
        {(["room", "fire", "rest", "pass"] as const).map((item) => {
          const Icon = item === "room" ? RoomIcon : item === "fire" ? FireIcon : item === "rest" ? RestIcon : PassIcon;
          return (
            <button key={item} type="button" className={view === item ? "active" : ""} aria-pressed={view === item} onClick={() => switchView(item)}>
              <Icon /><span>{viewLabels[item]}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}

function ServiceTheatre({ fixture, selectedCover, onSelectCover, onEnterFire, onSpecified }: { fixture: FirstServiceFixture; selectedCover: string; onSelectCover: (id: string) => void; onEnterFire: () => void; onSpecified: (action: string) => void }) {
  return (
    <div className="theatre-view" data-testid="service-theatre">
      <header className="stage-heading">
        <div><h2>Service Theatre</h2><p>The whole room shares one live promise.</p></div>
        <button className="cross-view-action" type="button" onClick={onEnterFire}><span>Enter the fire</span><ArrowIcon /></button>
      </header>

      <div className="room-scene">
        <div className="window-grid" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <div className="baron-figure" aria-hidden="true"><span className="baron-hair" /><span className="baron-face" /><span className="baron-coat" /><span className="baron-cloth" /></div>
        <div className="baron-caption"><span>The Baron observes</span><strong>“The ribeye can rest. Their greens cannot.”</strong></div>
        <div className="dining-table" aria-label="Four-guest soft reopening table">
          <div className="table-lamp" aria-hidden="true" />
          {fixture.covers.map((cover, index) => (
            <button key={cover.id} type="button" className={`guest-seat seat-${index + 1} ${selectedCover === cover.id ? "selected" : ""}`} aria-label={`${cover.label}: ${cover.cut}, ${cover.target}, ${cover.status.replace("-", " ")}`} aria-pressed={selectedCover === cover.id} onClick={() => onSelectCover(cover.id)}>
              <span className="guest-portrait" aria-hidden="true"><i /></span>
              <span>{cover.id}</span>
              <small>{cover.status.replace("-", " ")}</small>
            </button>
          ))}
          <div className="table-service" aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
        <div className="pass-window" aria-label="Open grill beyond the pass">
          <span>Fire beyond the pass</span>
          <div className="pass-embers" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <small>2 cuts on grill · 1 resting</small>
        </div>
      </div>

      <div className="table-promise-rail">
        {fixture.covers.map((cover) => (
          <button key={cover.id} type="button" className={selectedCover === cover.id ? "selected" : ""} aria-pressed={selectedCover === cover.id} onClick={() => onSelectCover(cover.id)}>
            <span className={`shape-mark ${cover.targetShape}`} aria-hidden="true" />
            <span><strong>{cover.label}</strong><small>{cover.cut} · {cover.target}</small></span>
            <em>{cover.side}</em>
          </button>
        ))}
        <button className="promise-action" type="button" onClick={() => onSpecified("Call the table")}>
          <PassIcon /><span><strong>Call the table</strong><small>Review required</small></span>
        </button>
      </div>
    </div>
  );
}

function CoalTable({ fixture, selectedCover, selectedZone, onSelectCover, onSelectZone, onReadRoom, onSpecified }: { fixture: FirstServiceFixture; selectedCover: string; selectedZone: string; onSelectCover: (id: string) => void; onSelectZone: (id: string) => void; onReadRoom: () => void; onSpecified: (action: string) => void }) {
  return (
    <div className="coal-view" data-testid="coal-table">
      <header className="stage-heading">
        <div><h2>Coal Table</h2><p>Abstract heat paths · game units only</p></div>
        <button className="cross-view-action reverse" type="button" onClick={onReadRoom}><ArrowIcon /><span>Read the room</span></button>
      </header>

      <div className="coal-field" aria-label="Three-zone coal field">
        <div className="coal-texture" aria-hidden="true">
          {Array.from({ length: 42 }, (_, index) => <i key={index} className={`coal coal-${(index % 7) + 1}`} />)}
        </div>
        {fixture.zones.map((zone) => (
          <button key={zone.id} type="button" className={`heat-zone zone-${zone.id} pattern-${zone.pattern} ${selectedZone === zone.id ? "selected" : ""}`} aria-pressed={selectedZone === zone.id} onClick={() => onSelectZone(zone.id)}>
            <span>{zone.label}</span><strong>{zone.coalUnits} coal units</strong><small>{zone.description}</small>
          </button>
        ))}
        <div className="cut-paths" aria-label="Cut paths">
          {fixture.covers.filter((cover) => cover.zone !== "case").map((cover, index) => (
            <button key={cover.id} type="button" className={`cut-marker cut-${index + 1} ${selectedCover === cover.id ? "selected" : ""}`} aria-pressed={selectedCover === cover.id} onClick={() => onSelectCover(cover.id)}>
              <span className="cut-art" aria-hidden="true"><i /><i /><i /></span>
              <strong>{cover.id}</strong><small>{cover.cut}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="fire-controls" aria-label="Fixture controls">
        <div className="control-copy"><RakeIcon /><span><strong>Rake preview</strong><small>{fixture.zones.find((zone) => zone.id === selectedZone)?.description}</small></span></div>
        <div className="direction-controls" role="group" aria-label="Rake direction">
          <button type="button" aria-label="Move rake left" onClick={() => onSpecified("Preview rake left")}><span aria-hidden="true">L</span></button>
          <button type="button" aria-label="Move rake up" onClick={() => onSpecified("Preview rake up")}><span aria-hidden="true">U</span></button>
          <button type="button" aria-label="Move rake down" onClick={() => onSpecified("Preview rake down")}><span aria-hidden="true">D</span></button>
          <button type="button" aria-label="Move rake right" onClick={() => onSpecified("Preview rake right")}><span aria-hidden="true">R</span></button>
        </div>
        <button className="primary-action" type="button" onClick={() => onSpecified("Apply rake")}>Preview rake</button>
      </div>
    </div>
  );
}

function RestPlane({ fixture, selectedCover, onSelectCover, onSpecified }: { fixture: FirstServiceFixture; selectedCover: string; onSelectCover: (id: string) => void; onSpecified: (action: string) => void }) {
  return (
    <div className="focused-plane" data-testid="rest-plane">
      <header className="stage-heading"><div><h2>Active Rest</h2><p>Capacity, carryover, and the work between.</p></div></header>
      <div className="rest-bench">
        {fixture.restSlots.map((slot) => {
          const cover = fixture.covers.find((item) => item.id === slot.coverId);
          return (
            <section key={slot.id} className={cover ? "rest-slot occupied" : "rest-slot"} aria-label={slot.label}>
              <span className="slot-number">{slot.id.endsWith("1") ? "I" : "II"}</span>
              {cover ? <button type="button" aria-pressed={selectedCover === cover.id} onClick={() => onSelectCover(cover.id)}><span className="cut-art" aria-hidden="true"><i /><i /><i /></span><strong>{cover.label} · {cover.cut}</strong><small>{slot.detail}</small></button> : <div><strong>Available</strong><small>{slot.detail}</small></div>}
            </section>
          );
        })}
      </div>
      <div className="rest-choices">
        <button type="button" onClick={() => onSpecified("Extend open rest")}><RestIcon /><span><strong>Extend</strong><small>Preserve texture; shorter range</small></span></button>
        <button type="button" onClick={() => onSpecified("Choose cloche hold")}><PassIcon /><span><strong>Cloche hold</strong><small>Wider range; softer surface</small></span></button>
        <button type="button" onClick={() => onSpecified("Carve cut")}><FocusIcon /><span><strong>Carve</strong><small>Commit current cross-section</small></span></button>
      </div>
    </div>
  );
}

function PassPlane({ fixture, onSelectCover, onSpecified }: { fixture: FirstServiceFixture; onSelectCover: (id: string) => void; onSpecified: (action: string) => void }) {
  return (
    <div className="focused-plane" data-testid="pass-plane">
      <header className="stage-heading"><div><h2>Whole-table Pass</h2><p>Possible is not the same as promised.</p></div></header>
      <div className="pass-board">
        {fixture.covers.map((cover) => (
          <button key={cover.id} type="button" onClick={() => onSelectCover(cover.id)}>
            <span className={`cover-letter state-${cover.status}`}>{cover.id}</span>
            <span><strong>{cover.cut}</strong><small>{cover.target}</small></span>
            <span><strong>{cover.status.replace("-", " ")}</strong><small>{cover.side}</small></span>
          </button>
        ))}
      </div>
      <div className="call-table-panel">
        <div><span>Shared window</span><strong>{fixture.syncWindowTicks} ticks</strong><p>Two sides remain outside the ready window in this fixture.</p></div>
        <button type="button" onClick={() => onSpecified("Call the table")}><PassIcon /><span><strong>Review call</strong><small>Domain action not connected</small></span></button>
      </div>
    </div>
  );
}
