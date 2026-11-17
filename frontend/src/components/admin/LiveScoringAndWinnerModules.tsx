"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  ExternalLink,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Trophy,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type {
  MatchData,
  PlayerData,
  TeamSummary,
  TournamentData,
} from "@/types/cricket";

interface ScoringModulesProps {
  matches: MatchData[];
  teams: TeamSummary[];
  players: PlayerData[];
  tournaments: TournamentData[];
  onRefreshAll: () => Promise<void>;
  notify: (text: string, type?: "success" | "error") => void;
  onJumpToResult?: () => void;
}

export function LiveMatchControlModule({
  matches,
  players,
  onRefreshAll,
  notify,
  onJumpToResult,
}: ScoringModulesProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<number>(
    matches.find((m) => m.status === "LIVE")?.id || matches[0]?.id || 0
  );
  const [activeMatch, setActiveMatch] = useState<MatchData | null>(null);
  const [inningsNum, setInningsNum] = useState<number>(1);
  const [scoringTab, setScoringTab] = useState<"MANUAL" | "BALL_BY_BALL">(
    "MANUAL"
  );

  // Mode A Manual Form State (Matches Bottom-Right Reference Screenshot + Total Overs Editable!)
  const [runs, setRuns] = useState<number>(0);
  const [wickets, setWickets] = useState<number>(0);
  const [oversInput, setOversInput] = useState<string>("0.0");
  const [totalOversInput, setTotalOversInput] = useState<number>(20);
  const [targetRuns, setTargetRuns] = useState<string>("");

  const [strikerId, setStrikerId] = useState<string>("");
  const [strikerRuns, setStrikerRuns] = useState<string>("0");
  const [strikerBalls, setStrikerBalls] = useState<string>("0");

  const [nonStrikerId, setNonStrikerId] = useState<string>("");
  const [nonStrikerRuns, setNonStrikerRuns] = useState<string>("0");
  const [nonStrikerBalls, setNonStrikerBalls] = useState<string>("0");

  const [bowlerId, setBowlerId] = useState<string>("");
  const [bowlerOvers, setBowlerOvers] = useState<string>("0.0");
  const [bowlerRuns, setBowlerRuns] = useState<string>("0");
  const [bowlerWickets, setBowlerWickets] = useState<string>("0");

  const [matchStatus, setMatchStatus] = useState<string>("LIVE");
  const [inningsStatus, setInningsStatus] = useState<string>("IN_PROGRESS");
  const [matchNotes, setMatchNotes] = useState<string>("");
  const [reconcileBalls, setReconcileBalls] = useState<boolean>(true);

  // Mode B Ball-by-Ball State
  const [wicketType, setWicketType] = useState<string>("BOWLED");
  const [fielderName, setFielderName] = useState<string>("");
  const [nbBatRuns, setNbBatRuns] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);

  const syncMatchState = (m: MatchData, targetInningsNumber?: number) => {
    setActiveMatch(m);
    const innNo = targetInningsNumber || m.current_innings_number || 1;
    setInningsNum(innNo);
    const inn = m.innings.find((i) => i.innings_number === innNo) || m.innings[0];
    if (inn) {
      setRuns(inn.runs);
      setWickets(inn.wickets);
      setOversInput(inn.overs_display);
      setTotalOversInput(inn.max_overs || m.overs_per_innings || 20);
      setTargetRuns(inn.target_runs ? String(inn.target_runs) : "");

      setStrikerId(inn.striker ? String(inn.striker.id) : "");
      setStrikerRuns(inn.striker ? String(inn.striker.runs) : "0");
      setStrikerBalls(inn.striker ? String(inn.striker.balls_faced) : "0");

      setNonStrikerId(inn.non_striker ? String(inn.non_striker.id) : "");
      setNonStrikerRuns(inn.non_striker ? String(inn.non_striker.runs) : "0");
      setNonStrikerBalls(
        inn.non_striker ? String(inn.non_striker.balls_faced) : "0"
      );

      setBowlerId(inn.current_bowler ? String(inn.current_bowler.id) : "");
      setBowlerOvers(inn.current_bowler ? inn.current_bowler.overs : "0.0");
      setBowlerRuns(
        inn.current_bowler ? String(inn.current_bowler.runs_conceded) : "0"
      );
      setBowlerWickets(
        inn.current_bowler ? String(inn.current_bowler.wickets) : "0"
      );

      setInningsStatus(inn.status);
    }
    setMatchStatus(m.status);
    setMatchNotes(m.match_notes || "");
  };

  useEffect(() => {
    if (!selectedMatchId && matches.length > 0) {
      setSelectedMatchId(matches[0].id);
      return;
    }
    if (selectedMatchId) {
      apiFetch<MatchData>(`/matches/${selectedMatchId}/`)
        .then((m) => syncMatchState(m))
        .catch(() => {});
    }
  }, [selectedMatchId, matches]);

  const submitManualUpdate = async (overrides: Record<string, any> = {}) => {
    if (!activeMatch) return;
    setBusy(true);
    try {
      const updated = await apiFetch<MatchData>(
        `/matches/${activeMatch.id}/manual-score/`,
        {
          method: "POST",
          body: JSON.stringify({
            innings_number: overrides.innings_number ?? inningsNum,
            runs: overrides.runs ?? Number(runs),
            wickets: overrides.wickets ?? Number(wickets),
            overs: overrides.overs ?? oversInput,
            max_overs: overrides.max_overs ?? Number(totalOversInput),
            target_runs:
              overrides.target_runs !== undefined
                ? overrides.target_runs
                : targetRuns
                ? Number(targetRuns)
                : null,
            striker_id: strikerId ? Number(strikerId) : null,
            striker_runs: strikerRuns,
            striker_balls: strikerBalls,
            non_striker_id: nonStrikerId ? Number(nonStrikerId) : null,
            non_striker_runs: nonStrikerRuns,
            non_striker_balls: nonStrikerBalls,
            bowler_id: bowlerId ? Number(bowlerId) : null,
            bowler_overs: bowlerOvers,
            bowler_runs: bowlerRuns,
            bowler_wickets: bowlerWickets,
            innings_status: overrides.innings_status ?? inningsStatus,
            match_status: overrides.match_status ?? matchStatus,
            match_notes: matchNotes,
            reconcile_ball_events: reconcileBalls,
          }),
        }
      );
      syncMatchState(updated, overrides.innings_number ?? inningsNum);
      await onRefreshAll();
      notify("Live score updated & broadcasted to spectators!");
    } catch (err: any) {
      notify(err.message || "Failed to update score", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleUndoManualChange = async () => {
    if (!activeMatch) return;
    setBusy(true);
    try {
      const updated = await apiFetch<MatchData>(
        `/matches/${activeMatch.id}/manual-score/`,
        {
          method: "POST",
          body: JSON.stringify({
            action: "undo_last_change",
            innings_number: inningsNum,
          }),
        }
      );
      syncMatchState(updated, inningsNum);
      await onRefreshAll();
      notify("Reverted last manual score change!");
    } catch (err: any) {
      notify(err.message || "Nothing to undo", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleBallDelivery = async (payload: {
    runs_off_bat?: number;
    extra_type?: string;
    extra_runs?: number;
    is_wicket?: boolean;
  }) => {
    if (!activeMatch) return;
    setBusy(true);
    try {
      const updated = await apiFetch<MatchData>(
        `/matches/${activeMatch.id}/ball-event/`,
        {
          method: "POST",
          body: JSON.stringify({
            innings_number: inningsNum,
            runs_off_bat: payload.runs_off_bat ?? 0,
            extra_type: payload.extra_type ?? "NONE",
            extra_runs: payload.extra_runs ?? 0,
            is_wicket: payload.is_wicket ?? false,
            wicket_type: payload.is_wicket ? wicketType : "",
            fielder_name: payload.is_wicket ? fielderName : "",
            striker_id: strikerId ? Number(strikerId) : null,
            non_striker_id: nonStrikerId ? Number(nonStrikerId) : null,
            bowler_id: bowlerId ? Number(bowlerId) : null,
            idempotency_key: `${activeMatch.id}-${inningsNum}-${Date.now()}-${Math.random()}`,
          }),
        }
      );
      syncMatchState(updated, inningsNum);
      await onRefreshAll();
      notify("Ball recorded & live scorecard updated!");
    } catch (err: any) {
      notify(err.message || "Ball scoring failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleUndoLastBall = async () => {
    if (!activeMatch) return;
    setBusy(true);
    try {
      const updated = await apiFetch<MatchData>(
        `/matches/${activeMatch.id}/undo-ball/`,
        {
          method: "POST",
          body: JSON.stringify({
            innings_number: inningsNum,
            reason: "Scorer undo last ball",
          }),
        }
      );
      syncMatchState(updated, inningsNum);
      await onRefreshAll();
      notify("Last ball delivery undone!");
    } catch (err: any) {
      notify(err.message || "Nothing to undo", "error");
    } finally {
      setBusy(false);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-white/10 p-8 text-center space-y-3">
        <p className="text-base font-bold text-slate-900 dark:text-white">
          No Matches Created Yet
        </p>
        <p className="text-xs text-slate-500">
          Create two village teams (with players) and create a match first to open Live Score Control.
        </p>
      </div>
    );
  }

  const currentInningsObj = activeMatch?.innings.find(
    (i) => i.innings_number === inningsNum
  );

  // Pull batting & bowling team players from match payload or global players list
  const battingTeamId = currentInningsObj?.batting_team.id;
  const bowlingTeamId = currentInningsObj?.bowling_team.id;

  const battingPlayers =
    (battingTeamId === activeMatch?.team_a.id
      ? activeMatch?.team_a.players
      : activeMatch?.team_b.players) ||
    players.filter((p) => p.team_id === battingTeamId);

  const bowlingPlayers =
    (bowlingTeamId === activeMatch?.team_a.id
      ? activeMatch?.team_a.players
      : activeMatch?.team_b.players) ||
    players.filter((p) => p.team_id === bowlingTeamId);

  return (
    <div className="space-y-6">
      {/* Top Bar: Match Selector + Live Badge (Matches Bottom-Right Reference Image) */}
      <div className="rounded-2xl bg-[#0B3B24] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-red-400 animate-pulse" />
          <h2 className="text-lg sm:text-xl font-black">
            Live Score Control —{" "}
            {activeMatch ? activeMatch.title : "Select Match"}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl bg-[#062315] border border-emerald-600 text-xs font-bold text-white"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                Match #{m.match_number || m.id}: {m.title} ({m.status})
              </option>
            ))}
          </select>

          {activeMatch && (
            <Link
              href={`/matches/${activeMatch.id}/${activeMatch.slug}`}
              target="_blank"
              className="px-3 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black inline-flex items-center gap-1"
            >
              <span>Public View</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs: Manual Scoring (Quick Update) | Ball-by-Ball Scoring (Advanced) */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScoringTab("MANUAL")}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            scoringTab === "MANUAL"
              ? "bg-[#156534] text-white shadow-md"
              : "bg-white dark:bg-charcoal-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
          }`}
        >
          Manual Scoring (Quick Update)
        </button>
        <button
          type="button"
          onClick={() => setScoringTab("BALL_BY_BALL")}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            scoringTab === "BALL_BY_BALL"
              ? "bg-[#156534] text-white shadow-md"
              : "bg-white dark:bg-charcoal-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
          }`}
        >
          Ball-by-Ball Scoring (Advanced)
        </button>
      </div>

      {/* Main Split Grid: Left Scoring Form (7 Cols) + Right Match Summary & Quick Actions (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-emerald-800/60 shadow-sm p-6 space-y-5">
          {/* Select Innings Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Select Innings
            </label>
            <select
              value={inningsNum}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (activeMatch) syncMatchState(activeMatch, n);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-sm font-bold text-slate-900 dark:text-white"
            >
              {activeMatch?.innings.map((inn) => (
                <option key={inn.id} value={inn.innings_number}>
                  {inn.innings_number === 1 ? "1st Innings" : "2nd Innings"} —{" "}
                  {inn.batting_team.name} (
                  {inn.innings_number === 2 ? "Chasing" : "Batting"})
                </option>
              ))}
            </select>
          </div>

          {scoringTab === "MANUAL" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitManualUpdate();
              }}
              className="space-y-4"
            >
              {/* Runs, Wickets, Overs (e.g. 15.2), Total Overs (Editable!), Target */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Runs *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={runs}
                    onChange={(e) => setRuns(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-base font-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Wickets *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={wickets}
                    onChange={(e) => setWickets(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-base font-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Overs (e.g. 15.2) *
                  </label>
                  <input
                    type="text"
                    value={oversInput}
                    onChange={(e) => setOversInput(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-base font-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-700 dark:text-amber-400 mb-1">
                    Total Overs *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={totalOversInput}
                    onChange={(e) => setTotalOversInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50 dark:bg-charcoal-950 border border-emerald-400 dark:border-amber-400/50 text-base font-black text-emerald-900 dark:text-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Target
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={targetRuns}
                    onChange={(e) => setTargetRuns(e.target.value)}
                    placeholder="Auto"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-base font-black text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Striker & Non-Striker Selection + Runs & Balls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Striker (Batting Team:{" "}
                    {currentInningsObj?.batting_team.short_name})
                  </label>
                  <select
                    value={strikerId}
                    onChange={(e) => setStrikerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Striker --</option>
                    {battingPlayers.map((p: any) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Striker Runs"
                      value={strikerRuns}
                      onChange={(e) => setStrikerRuns(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Balls Faced"
                      value={strikerBalls}
                      onChange={(e) => setStrikerBalls(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Non-Striker (Batting Team:{" "}
                    {currentInningsObj?.batting_team.short_name})
                  </label>
                  <select
                    value={nonStrikerId}
                    onChange={(e) => setNonStrikerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Non-Striker --</option>
                    {battingPlayers.map((p: any) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Non-Striker Runs"
                      value={nonStrikerRuns}
                      onChange={(e) => setNonStrikerRuns(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Balls Faced"
                      value={nonStrikerBalls}
                      onChange={(e) => setNonStrikerBalls(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bowler & Match Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Bowler (Bowling Team:{" "}
                    {currentInningsObj?.bowling_team.short_name})
                  </label>
                  <select
                    value={bowlerId}
                    onChange={(e) => setBowlerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Bowler --</option>
                    {bowlingPlayers.map((p: any) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      placeholder="Overs (2.2)"
                      value={bowlerOvers}
                      onChange={(e) => setBowlerOvers(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Runs"
                      value={bowlerRuns}
                      onChange={(e) => setBowlerRuns(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Wkts"
                      value={bowlerWickets}
                      onChange={(e) => setBowlerWickets(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Match Status
                  </label>
                  <select
                    value={matchStatus}
                    onChange={(e) => setMatchStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="LIVE">🟢 Live</option>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="INNINGS_BREAK">Innings Break</option>
                    <option value="PAUSED">Paused</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Custom status note / commentary..."
                    value={matchNotes}
                    onChange={(e) => setMatchNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-charcoal-950 border border-slate-200 dark:border-white/10 text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons: Update Score & Undo Last Change */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#156534] hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-colors"
                >
                  {busy ? "Updating..." : "Update Score"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleUndoManualChange}
                  className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-300 dark:border-white/15"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Last Change</span>
                </button>
              </div>
            </form>
          ) : (
            /* Ball-by-Ball Advanced Mode */
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={strikerId}
                  onChange={(e) => setStrikerId(e.target.value)}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-xs font-bold"
                >
                  <option value="">-- Striker --</option>
                  {battingPlayers.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={nonStrikerId}
                  onChange={(e) => setNonStrikerId(e.target.value)}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-xs font-bold"
                >
                  <option value="">-- Non-Striker --</option>
                  {battingPlayers.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={bowlerId}
                  onChange={(e) => setBowlerId(e.target.value)}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-xs font-bold"
                >
                  <option value="">-- Bowler --</option>
                  {bowlingPlayers.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={busy}
                    onClick={() => handleBallDelivery({ runs_off_bat: r })}
                    className={`py-3 rounded-xl font-black text-xs border ${
                      r === 4 || r === 6
                        ? "bg-[#156534] text-white border-emerald-700"
                        : "bg-slate-50 dark:bg-charcoal-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/15"
                    }`}
                  >
                    {r === 0 ? "Dot (0)" : r === 4 ? "FOUR" : r === 6 ? "SIX" : `${r} Run`}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    handleBallDelivery({ extra_type: "WIDE", extra_runs: 1 })
                  }
                  className="py-2.5 rounded-xl bg-amber-400/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-xs"
                >
                  Wide (+1)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    handleBallDelivery({
                      extra_type: "NO_BALL",
                      extra_runs: 1,
                      runs_off_bat: nbBatRuns,
                    })
                  }
                  className="py-2.5 rounded-xl bg-amber-400/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-xs"
                >
                  No Ball (+1)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    handleBallDelivery({ extra_type: "BYE", extra_runs: 1 })
                  }
                  className="py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold"
                >
                  1 Bye
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    handleBallDelivery({ extra_type: "LEG_BYE", extra_runs: 1 })
                  }
                  className="py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold"
                >
                  1 Leg Bye
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-xs"
                >
                  <option value="BOWLED">Bowled</option>
                  <option value="CAUGHT">Caught</option>
                  <option value="LBW">LBW</option>
                  <option value="RUN_OUT">Run Out</option>
                  <option value="STUMPED">Stumped</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleBallDelivery({ is_wicket: true })}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-black text-xs"
                >
                  WICKET!
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleUndoLastBall}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Last Ball</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CURRENT MATCH SUMMARY + QUICK ACTIONS (5 Cols — Matches Bottom-Right Screenshot) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Current Match Summary Card */}
          <div className="rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-emerald-800/60 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-2.5">
              Current Match Summary
            </h3>

            {activeMatch && (
              <div className="space-y-2.5 text-xs sm:text-sm">
                {activeMatch.innings.map((inn) => (
                  <div
                    key={inn.id}
                    className="flex items-center justify-between font-bold"
                  >
                    <span className="text-slate-700 dark:text-slate-200">
                      {inn.batting_team.name}
                    </span>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums">
                      {inn.runs}/{inn.wickets}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ({inn.overs_display}/{inn.max_overs} ov)
                      </span>
                    </span>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>
                    Target:{" "}
                    <strong>
                      {currentInningsObj?.target_runs ??
                        activeMatch.target_score ??
                        "-"}
                    </strong>
                  </span>
                  <span>
                    RRR:{" "}
                    <strong>
                      {currentInningsObj?.required_run_rate ?? "-"}
                    </strong>
                  </span>
                  <span>
                    CRR:{" "}
                    <strong>
                      {currentInningsObj?.current_run_rate ?? "0.00"}
                    </strong>
                  </span>
                </div>

                {currentInningsObj?.striker && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 font-semibold">
                    🏏 {currentInningsObj.striker.name}*{" "}
                    {currentInningsObj.striker.runs} (
                    {currentInningsObj.striker.balls_faced})
                    {currentInningsObj.non_striker &&
                      ` | ${currentInningsObj.non_striker.name} ${currentInningsObj.non_striker.runs} (${currentInningsObj.non_striker.balls_faced})`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions Panel (Matches Bottom-Right Reference Screenshot) */}
          <div className="rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-emerald-800/60 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const nextInn = inningsNum === 1 ? 2 : 1;
                  if (activeMatch) syncMatchState(activeMatch, nextInn);
                }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-emerald-50 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                Switch Innings
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextW = Math.min(10, Number(wickets) + 1);
                  setWickets(nextW);
                  submitManualUpdate({ wickets: nextW });
                }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-red-50 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                Add Wicket (+1)
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextR = Number(runs) + 4;
                  setRuns(nextR);
                  submitManualUpdate({ runs: nextR });
                }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-emerald-50 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                Add Runs (+4)
              </button>

              <button
                type="button"
                onClick={() => {
                  submitManualUpdate({
                    innings_status: "COMPLETED",
                    match_status:
                      inningsNum === 1 ? "INNINGS_BREAK" : "COMPLETED",
                  });
                }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-amber-50 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                Finish Innings
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onJumpToResult) onJumpToResult();
                }}
                className="col-span-2 p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black"
              >
                Declare Result / Winner →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WinnerControlModule({
  matches,
  players,
  onRefreshAll,
  notify,
}: ScoringModulesProps) {
  const [matchId, setMatchId] = useState<number>(matches[0]?.id || 0);
  const selectedMatch = matches.find((m) => m.id === matchId) || matches[0];

  const [winningTeamId, setWinningTeamId] = useState<string>(
    selectedMatch ? String(selectedMatch.team_a.id) : ""
  );
  const [victoryType, setVictoryType] = useState<string>("WON_BY_RUNS");
  const [victoryMargin, setVictoryMargin] = useState<string>("25 runs");
  const [potmId, setPotmId] = useState<string>("");
  const [potmName, setPotmName] = useState<string>("");
  const [resultNotes, setResultNotes] = useState<string>("");
  const [confirmChampion, setConfirmChampion] = useState<boolean>(false);
  const [ackContradiction, setAckContradiction] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    if (selectedMatch) {
      setWinningTeamId(
        String(
          selectedMatch.result?.winning_team_id || selectedMatch.team_a.id
        )
      );
      if (selectedMatch.result) {
        setVictoryType(selectedMatch.result.victory_type);
        setVictoryMargin(selectedMatch.result.victory_margin);
        setPotmName(selectedMatch.result.player_of_the_match_name || "");
        setResultNotes(selectedMatch.result.result_notes || "");
      }
    }
  }, [selectedMatch]);

  const handleFinalizeResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setBusy(true);
    try {
      await apiFetch(`/matches/${selectedMatch.id}/finalize-winner/`, {
        method: "POST",
        body: JSON.stringify({
          winning_team_id:
            victoryType in { TIE: 1, NO_RESULT: 1, ABANDONED: 1 }
              ? null
              : Number(winningTeamId),
          victory_type: victoryType,
          victory_margin: victoryMargin,
          player_of_the_match_id: potmId ? Number(potmId) : null,
          player_of_the_match_name: potmName,
          result_notes: resultNotes,
          confirm_tournament_champion: confirmChampion,
          acknowledge_contradiction: ackContradiction,
        }),
      });
      await onRefreshAll();
      notify(
        "Match result finalized! Public scorecards, team stats, and points table updated."
      );
    } catch (err: any) {
      notify(err.message || "Failed to finalize match winner", "error");
    } finally {
      setBusy(false);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-white/10 p-8 text-center text-sm text-slate-500">
        No matches available yet. Create a match first to declare a winner.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleFinalizeResult}
      className="rounded-2xl bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-emerald-800/60 p-6 space-y-5 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          Match Winner & Result Publication
        </h2>
        <p className="text-xs text-slate-500">
          Select the winning team, victory margin, and Player of the Match. Updates public results and tournament Points Table automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Select Match *
          </label>
          <select
            value={matchId}
            onChange={(e) => setMatchId(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-sm font-bold"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.id} {m.title} ({m.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Victory Type *
          </label>
          <select
            value={victoryType}
            onChange={(e) => setVictoryType(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-sm"
          >
            <option value="WON_BY_RUNS">Won by runs</option>
            <option value="WON_BY_WICKETS">Won by wickets</option>
            <option value="TIE">Tie</option>
            <option value="NO_RESULT">No result</option>
            <option value="ABANDONED">Abandoned</option>
            <option value="CUSTOM">Custom result</option>
          </select>
        </div>

        {selectedMatch && (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Winning Team
            </label>
            <select
              value={winningTeamId}
              onChange={(e) => setWinningTeamId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-sm font-bold text-emerald-800 dark:text-amber-400"
            >
              <option value={String(selectedMatch.team_a.id)}>
                {selectedMatch.team_a.name}
              </option>
              <option value={String(selectedMatch.team_b.id)}>
                {selectedMatch.team_b.name}
              </option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Victory Margin (e.g. &quot;25 runs&quot; or &quot;6 wickets&quot;)
          </label>
          <input
            type="text"
            value={victoryMargin}
            onChange={(e) => setVictoryMargin(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Player of the Match (Registered Player)
          </label>
          <select
            value={potmId}
            onChange={(e) => setPotmId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-sm"
          >
            <option value="">-- Or enter custom name on right --</option>
            {players.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name} ({p.team_short_name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Player of the Match Name (Custom)
          </label>
          <input
            type="text"
            value={potmName}
            onChange={(e) => setPotmName(e.target.value)}
            placeholder="e.g. Rohit Kumar (56* off 38)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-charcoal-950 border border-slate-300 dark:border-white/15 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmChampion}
            onChange={(e) => setConfirmChampion(e.target.checked)}
          />
          <span>
            Crown winning team as Tournament Champion & Runner-Up
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={ackContradiction}
            onChange={(e) => setAckContradiction(e.target.checked)}
          />
          <span>Allow publishing even if custom/DLS score differs</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#156534] hover:bg-emerald-700 text-white font-black text-sm shadow-md"
      >
        <Trophy className="w-4 h-4 text-amber-300" />
        <span>{busy ? "Publishing..." : "Finalize Match & Publish Result"}</span>
      </button>
    </form>
  );
}
