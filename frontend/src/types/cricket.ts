export interface WebsiteSettings {
  site_name: string;
  site_name_kn: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  accent_color: string;
  hero_visible: boolean;
  hero_title: string;
  hero_title_kn: string;
  hero_subtitle: string;
  hero_subtitle_kn: string;
  hero_background_image: string;
  hero_video_url: string;
  hero_primary_cta_text: string;
  hero_primary_cta_link: string;
  hero_secondary_cta_text: string;
  hero_secondary_cta_link: string;
  upcoming_tournament_banner: string;
  about_title: string;
  about_content: string;
  about_mission: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_address: string;
  footer_description: string;
  copyright_text: string;
  privacy_policy: string;
  terms_conditions: string;
  social_facebook: string;
  social_instagram: string;
  social_youtube: string;
  social_x: string;
  seo_title: string;
  seo_description: string;
  default_theme: "dark" | "light";
  default_language: "en" | "kn";
  updated_at?: string;
}

export interface NavigationItem {
  id: number;
  label: string;
  label_kn: string;
  slug: string;
  path: string;
  group_name: string;
  display_order: number;
  is_visible: boolean;
  is_optional: boolean;
}

export interface HomepageSection {
  id: number;
  section_key: string;
  title: string;
  title_kn: string;
  subtitle: string;
  display_order: number;
  is_visible: boolean;
  max_items: number;
}

export interface Announcement {
  id: number;
  text: string;
  text_kn: string;
  badge_label: string;
  link_url: string;
  link_text: string;
  is_visible?: boolean;
  start_date?: string | null;
  expiration_date?: string | null;
}

export interface TeamPlayerBrief {
  id: number;
  name: string;
  playing_role: string;
  playing_role_display?: string;
  jersey_number?: number | null;
  is_captain?: boolean;
  batting_style?: string;
  bowling_style?: string;
}

export interface TeamSummary {
  id: number;
  name: string;
  short_name: string;
  slug?: string;
  village?: string;
  logo_url: string;
  primary_color?: string;
  captain_name?: string;
  vice_captain_name?: string;
  home_ground?: string;
  description?: string;
  achievements?: string;
  status?: string;
  is_featured?: boolean;
  matches_played?: number;
  wins?: number;
  losses?: number;
  ties?: number;
  no_results?: number;
  players_count?: number;
  players?: TeamPlayerBrief[];
  manager_contact_name?: string;
  manager_contact_phone?: string;
  manager_contact_email?: string;
}

export interface BattingCardRow {
  id: number;
  player_id: number;
  player_name: string;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  dismissal_type: string;
  dismissal_text: string;
  is_out: boolean;
}

export interface BowlingCardRow {
  id: number;
  player_id: number;
  player_name: string;
  overs: string;
  completed_overs?: number;
  balls_in_over?: number;
  maidens: number;
  runs_conceded: number;
  wickets: number;
  wides: number;
  no_balls: number;
  economy: number;
}

export interface ActiveBatterInfo {
  id: number;
  name: string;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  strike_rate: number;
}

export interface ActiveBowlerInfo {
  id: number;
  name: string;
  overs: string;
  maidens: number;
  runs_conceded: number;
  wickets: number;
  economy: number;
}

export interface MatchInningsData {
  id: number;
  innings_number: number;
  batting_team: TeamSummary;
  bowling_team: TeamSummary;
  runs: number;
  wickets: number;
  completed_overs: number;
  balls_in_over: number;
  overs_display: string;
  max_overs: number;
  target_runs: number | null;
  current_run_rate: number;
  required_run_rate: number | null;
  extras: {
    wides: number;
    no_balls: number;
    byes: number;
    leg_byes: number;
    penalty: number;
    total: number;
  };
  striker: ActiveBatterInfo | null;
  non_striker: ActiveBatterInfo | null;
  current_bowler: ActiveBowlerInfo | null;
  partnership_runs: number;
  partnership_balls: number;
  fall_of_wickets: Array<{
    wicket_number: number;
    runs: number;
    overs: string;
    player_name: string;
  }>;
  status: string;
  has_ball_events: boolean;
  is_reconciled_manual_override: boolean;
  batting_card: BattingCardRow[];
  bowling_card: BowlingCardRow[];
}

export interface BallEventData {
  id: number;
  sequence_number: number;
  over_ball: string;
  striker_name: string;
  bowler_name: string;
  runs_off_bat: number;
  extra_type: string;
  extra_runs: number;
  total_runs: number;
  is_wicket: boolean;
  wicket_type: string;
  commentary: string;
  created_at: string;
}

export interface MatchResultData {
  winning_team_id: number | null;
  winning_team_name: string | null;
  runner_up_team_id: number | null;
  runner_up_team_name: string | null;
  victory_type: string;
  victory_margin: string;
  result_summary: string;
  player_of_the_match_id: number | null;
  player_of_the_match_name: string;
  has_score_contradiction: boolean;
  contradiction_warning: string;
  is_finalized: boolean;
  result_notes: string;
}

export interface MatchData {
  id: number;
  match_number?: number;
  slug: string;
  title: string;
  match_type: "FRIENDLY" | "TOURNAMENT";
  tournament: {
    id: number;
    name: string;
    slug: string;
    season_year: number;
  } | null;
  team_a: TeamSummary;
  team_b: TeamSummary;
  venue: string;
  match_date: string;
  start_time: string;
  overs_per_innings: number;
  match_format: string;
  status: string;
  scoring_mode: "MANUAL" | "BALL_BY_BALL";
  current_innings_number: number;
  toss_winner_id: number | null;
  toss_winner_name: string | null;
  toss_decision: string;
  target_score: number | null;
  umpire_details: string;
  match_notes: string;
  is_tournament_final: boolean;
  version: number;
  innings: MatchInningsData[];
  recent_balls: BallEventData[];
  result: MatchResultData | null;
  updated_at: string;
}

export interface TournamentData {
  id: number;
  name: string;
  slug: string;
  season_year: number;
  description: string;
  poster_url: string;
  banner_url: string;
  organizer_name: string;
  organizer_contact: string;
  village: string;
  ground_name: string;
  start_date: string;
  end_date: string;
  match_format: string;
  match_format_display: string;
  overs_per_innings: number;
  registration_status: string;
  status: string;
  status_display: string;
  max_teams: number;
  registered_teams_count: number;
  points_rules: {
    win: number;
    tie: number;
    no_result: number;
    loss: number;
    all_out_uses_full_overs_for_nrr: boolean;
    ranking_rule_summary: string;
  };
  prize_details: string;
  is_featured: boolean;
  teams?: TeamSummary[];
  matches?: MatchData[];
  standings?: StandingRow[];
  winners?: TournamentWinnerData[];
  gallery?: GalleryItem[];
}

export interface PlayerData {
  id: number;
  name: string;
  slug: string;
  photo_url: string;
  village: string;
  team_id: number | null;
  team_name: string;
  team_short_name: string;
  team_logo_url: string;
  playing_role: string;
  playing_role_display: string;
  batting_style: string;
  bowling_style: string;
  jersey_number: number | null;
  is_captain: boolean;
  bio: string;
  calculated_stats: {
    matches: number;
    runs: number;
    balls_faced: number;
    fours: number;
    sixes: number;
    highest_score: number;
    wickets: number;
    runs_conceded: number;
  };
  manual_stats: {
    approved: boolean;
    matches: number;
    runs: number;
    highest_score: number;
    wickets: number;
    best_bowling: string;
    award_title: string;
  };
  total_runs: number;
  total_wickets: number;
  total_matches: number;
  highest_score: number;
  stats_source: string;
  is_featured: boolean;
  is_active: boolean;
}

export interface StandingRow {
  id: number;
  tournament_id: number;
  tournament_name: string;
  group_name: string;
  rank: number;
  team: TeamSummary;
  played: number;
  won: number;
  lost: number;
  tied: number;
  no_result: number;
  net_run_rate: number;
  net_run_rate_display: string;
  points: number;
  calculated: {
    played: number;
    won: number;
    lost: number;
    tied: number;
    no_result: number;
    points: number;
    nrr: number;
  };
  has_manual_adjustment: boolean;
  adjustment_note: string;
}

export interface TournamentWinnerData {
  id: number;
  tournament_id: number | null;
  tournament_name: string;
  tournament_year: number;
  winning_team_id: number | null;
  winning_team_name: string;
  winning_team_logo: string;
  runner_up_team_id: number | null;
  runner_up_team_name: string;
  winner_photograph: string;
  trophy_graphic: string;
  final_match_summary: string;
  player_of_the_tournament: string;
  prize_amount: string;
}

export interface GalleryItem {
  id: number;
  title: string;
  caption: string;
  category: string;
  category_display?: string;
  image_url: string;
  alt_text?: string;
  tournament_id?: number | null;
  match_id?: number | null;
  display_order?: number;
}

export interface SponsorItem {
  id: number;
  name: string;
  logo_url: string;
  website_url: string;
  tier: string;
  tier_display: string;
  tagline: string;
  display_order?: number;
  is_visible?: boolean;
}

export interface NewsItem {
  id: number;
  title: string;
  title_kn: string;
  slug: string;
  category: string;
  category_display: string;
  summary: string;
  content: string;
  image_url: string;
  is_pinned: boolean;
  is_published?: boolean;
  published_at: string;
}

export interface HomepagePayload {
  settings: WebsiteSettings;
  stats_counters?: {
    tournaments: number;
    teams: number;
    players: number;
    matches: number;
  };
  navigation: NavigationItem[];
  sections: HomepageSection[];
  announcements: Announcement[];
  live_matches: MatchData[];
  upcoming_matches: MatchData[];
  recent_results: MatchData[];
  tournaments: TournamentData[];
  featured_teams: TeamSummary[];
  active_tournament_for_standings: TournamentData | null;
  standings_preview: StandingRow[];
  top_players: {
    most_runs: PlayerData[];
    most_wickets: PlayerData[];
    awards: Array<{
      id: number;
      award_type: string;
      award_title: string;
      player_id: number | null;
      player_name: string;
      team_name: string;
      performance_summary: string;
      is_manual_award: boolean;
    }>;
  };
  winners: TournamentWinnerData[];
  gallery: GalleryItem[];
  sponsors: SponsorItem[];
  news: NewsItem[];
  server_time: string;
}
