# Village Cricket Live — Administrator User Guide & Acceptance Checklist

## 1. Accessing the Custom Admin Dashboard

- **Admin Route**: `/admin-dashboard`
- **Default Super Admin Account**: `admin` / `Admin@2026`
- **Default Scorer Account**: `scorer` / `Scorer@2026`
- **Default Content Editor Account**: `editor` / `Editor@2026`

---

## 2. Core End-to-End Workflow (Golden Path)

1. **Log In**: Open `/admin-dashboard` and sign in as `admin`.
2. **Create Village Teams**:
   - Click **6. Teams** in the left sidebar.
   - Enter the Team Name, Short Code, Home Village, Captain Name, and click **Register Village Team**.
3. **Create a Cricket Match**:
   - Click **4. Create Match** in the left sidebar.
   - Choose **Normal / Friendly Match** or **Tournament Match**, select **Team A** and **Team B**, enter the Venue, Date/Time, and Overs, and click **Create Match & Initialize Scoreboard**.
4. **Update Live Scores (Mode A or Mode B)**:
   - Click **2. Live Match Control**.
   - Select the match and current innings.
   - **Mode A (Simple Manual Scoring)**: Enter Runs, Wickets, Completed Overs, Balls, and Target directly, then click **Save Score & Broadcast Live**.
   - **Mode B (Advanced Ball-by-Ball Scoring)**: Select Striker, Non-Striker, and Bowler, then tap **0, 1, 2, 3, 4, 6, Wide, No Ball, Bye, Leg Bye, or Wicket**. Use **Undo Last Ball** at any time to revert a delivery with an audit reason.
5. **Select Winning Team & Publish Result**:
   - Click **8. Scores and Results**.
   - Select the match, choose the **Winning Team**, **Victory Type** (Won by runs, Won by wickets, Tie, No result, Abandoned, Custom), enter the **Victory Margin** and **Player of the Match**, and click **Finalize Match & Publish Winner**.
   - The system checks for contradictions against recorded innings runs, updates the public match card, recalculates the tournament Points Table & Net Run Rate, and broadcasts the final result to all connected spectators.

---

## 3. Manual Administrator Acceptance Checklist

- [ ] **Admin Authentication**: Verify logging in at `/admin-dashboard` succeeds with valid credentials and rate-limits repeated invalid attempts.
- [ ] **Role Restrictions**: Verify `editor` (`Editor@2026`) can update CMS settings (`14. Homepage Management`) but is blocked (`403 Forbidden`) from scoring matches.
- [ ] **Team Creation**: Create two village teams in `6. Teams` and confirm they appear on `/teams`.
- [ ] **Match Creation**: Create a match between those two teams in `4. Create Match` and confirm it appears on `/matches`.
- [ ] **Mode A Manual Scoring**: Update the match score in `2. Live Match Control` (Mode A) and verify `/live-scores` updates automatically without page reload.
- [ ] **Mode B Ball-by-Ball & Undo**: Score a `FOUR (4)`, a `Wide (+1)`, and a `WICKET`, then click `Undo Last Ball` and confirm the previous score is restored.
- [ ] **Reconciliation Guard**: Attempt a manual score edit on an innings with ball-by-ball events without checking the reconciliation confirmation box, and verify the system prevents silent inconsistency.
- [ ] **Winner Finalization & Contradiction Check**: Select a winner in `8. Scores and Results`, finalize the match, and verify `/results` and `/points-table` reflect the updated standings and Net Run Rate.
- [ ] **CMS & Navigation Control**: Hide an optional navigation item in `15. Navigation Management` or change the Hero heading in `14. Homepage Management` and verify the public homepage reflects the change immediately.
