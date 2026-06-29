-- ============================================================
-- World Cup 2026 Prediction Game — Database Schema
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE teams (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  short_code  char(3) UNIQUE NOT NULL,
  group_letter char(1) NOT NULL,
  flag_emoji  text
);

CREATE TABLE matches (
  id           serial PRIMARY KEY,
  match_number integer UNIQUE NOT NULL,
  stage        text NOT NULL CHECK (stage IN ('group','r32','r16','qf','sf','third_place','final')),
  group_letter char(1),
  home_team_id integer REFERENCES teams,
  away_team_id integer REFERENCES teams,
  scheduled_at timestamptz,
  home_score   integer,
  away_score   integer,
  winner_team_id integer REFERENCES teams,
  status       text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','finished')),
  external_id  integer,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE group_predictions (
  id                    serial PRIMARY KEY,
  user_id               uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  match_id              integer REFERENCES matches ON DELETE CASCADE NOT NULL,
  predicted_home_score  integer NOT NULL CHECK (predicted_home_score >= 0),
  predicted_away_score  integer NOT NULL CHECK (predicted_away_score >= 0),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (user_id, match_id)
);

CREATE TABLE knockout_predictions (
  id                 serial PRIMARY KEY,
  user_id            uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  bracket_position   integer NOT NULL,
  predicted_team_id  integer REFERENCES teams NOT NULL,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE (user_id, bracket_position)
);

CREATE TABLE award_predictions (
  id                  serial PRIMARY KEY,
  user_id             uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  golden_boot_player  text,
  golden_boot_goals   integer CHECK (golden_boot_goals > 0),
  golden_ball_player  text,
  golden_glove_player text,
  best_young_player   text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE leagues (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_by  uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE league_memberships (
  id         serial PRIMARY KEY,
  league_id  integer REFERENCES leagues ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  joined_at  timestamptz DEFAULT now(),
  UNIQUE (league_id, user_id)
);

CREATE TABLE award_results (
  id                  integer PRIMARY KEY DEFAULT 1,
  golden_boot_player  text,
  golden_boot_goals   integer,
  golden_ball_player  text,
  golden_glove_player text,
  best_young_player   text,
  updated_at          timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_predictions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_predictions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues             ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_results       ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_all"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_self"  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- teams (read-only for everyone)
CREATE POLICY "teams_select_all"      ON teams    FOR SELECT USING (true);

-- matches (read-only for everyone)
CREATE POLICY "matches_select_all"    ON matches  FOR SELECT USING (true);

-- group_predictions
CREATE POLICY "gp_select_own"  ON group_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gp_insert_own"  ON group_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gp_update_own"  ON group_predictions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gp_delete_own"  ON group_predictions FOR DELETE USING (auth.uid() = user_id);

-- knockout_predictions
CREATE POLICY "kp_select_own"  ON knockout_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "kp_insert_own"  ON knockout_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kp_update_own"  ON knockout_predictions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "kp_delete_own"  ON knockout_predictions FOR DELETE USING (auth.uid() = user_id);

-- award_predictions
CREATE POLICY "ap_select_own"  ON award_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ap_insert_own"  ON award_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ap_update_own"  ON award_predictions FOR UPDATE USING (auth.uid() = user_id);

-- leagues
CREATE POLICY "leagues_select_all"    ON leagues FOR SELECT USING (true);
CREATE POLICY "leagues_insert_own"    ON leagues FOR INSERT WITH CHECK (auth.uid() = created_by);

-- league_memberships
CREATE POLICY "lm_select_all"    ON league_memberships FOR SELECT USING (true);
CREATE POLICY "lm_insert_own"    ON league_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lm_delete_own"    ON league_memberships FOR DELETE USING (auth.uid() = user_id);

-- award_results (read-only for everyone)
CREATE POLICY "ar_select_all"    ON award_results FOR SELECT USING (true);

-- ------------------------------------------------------------
-- Trigger: auto-create profile on sign-up
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, split_part(new.email, '@', 1));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
