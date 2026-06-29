export interface Profile {
  id: string
  display_name: string
  password_set: boolean
  is_admin: boolean
  welcome_shown: boolean
  knockout_announce_shown: boolean
  created_at: string
}

export interface Team {
  id: number
  name: string
  short_code: string
  group_letter: string
  flag_emoji: string
}

export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third_place' | 'final'
export type MatchStatus = 'scheduled' | 'live' | 'finished'

export interface Match {
  id: number
  match_number: number
  stage: MatchStage
  group_letter: string | null
  home_team_id: number | null
  away_team_id: number | null
  scheduled_at: string | null
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  status: MatchStatus
  external_id: number | null
}

export interface GroupPrediction {
  id: number
  user_id: string
  match_id: number
  predicted_home_score: number
  predicted_away_score: number
  created_at: string
  updated_at: string
}

export interface KnockoutPrediction {
  id: number
  user_id: string
  bracket_position: number
  predicted_team_id: number
  created_at: string
  updated_at: string
}

export interface AwardPrediction {
  id: number
  user_id: string
  golden_boot_player: string | null
  golden_boot_goals: number | null
  golden_ball_player: string | null
  golden_glove_player: string | null
  best_young_player: string | null
}

export interface League {
  id: number
  name: string
  invite_code: string
  created_by: string
  created_at: string
}

export interface LeagueMembership {
  id: number
  league_id: number
  user_id: string
  joined_at: string
}

export interface MatchWithTeams {
  id: number
  match_number: number
  group_letter: string | null
  home_team_id: number | null
  away_team_id: number | null
  scheduled_at: string | null
  home_team: Team | null
  away_team: Team | null
}

export interface AwardResults {
  id: number
  golden_boot_player: string | null
  golden_boot_goals: number | null
  golden_ball_player: string | null
  golden_glove_player: string | null
  best_young_player: string | null
}

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: {
    foreignKeyName: string
    columns: string[]
    isOneToOne?: boolean
    referencedRelation: string
    referencedColumns: string[]
  }[]
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile, Omit<Profile, 'created_at'>, Partial<Omit<Profile, 'id'>>>
      teams: TableDef<Team, Omit<Team, 'id'>, Partial<Omit<Team, 'id'>>>
      matches: TableDef<Match, Omit<Match, 'id'>, Partial<Omit<Match, 'id'>>>
      group_predictions: TableDef<GroupPrediction, Omit<GroupPrediction, 'id' | 'created_at' | 'updated_at'>, Partial<Omit<GroupPrediction, 'id'>>>
      knockout_predictions: TableDef<KnockoutPrediction, Omit<KnockoutPrediction, 'id' | 'created_at' | 'updated_at'>, Partial<Omit<KnockoutPrediction, 'id'>>>
      award_predictions: TableDef<AwardPrediction, Omit<AwardPrediction, 'id'>, Partial<Omit<AwardPrediction, 'id'>>>
      leagues: TableDef<League, Omit<League, 'id' | 'created_at'>, Partial<Omit<League, 'id'>>>
      league_memberships: TableDef<LeagueMembership, Omit<LeagueMembership, 'id' | 'joined_at'>, Partial<Omit<LeagueMembership, 'id'>>>
      award_results: TableDef<AwardResults, Partial<AwardResults>, Partial<AwardResults>>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
