-- ============================================================
-- World Cup 2026 Prediction Game — Seed Data
-- ============================================================

-- ------------------------------------------------------------
-- Teams (48 rows)
-- ------------------------------------------------------------

INSERT INTO teams (name, short_code, group_letter, flag_emoji) VALUES
  -- Group A
  ('Mexico',                  'MEX', 'A', '🇲🇽'),
  ('South Africa',            'RSA', 'A', '🇿🇦'),
  ('South Korea',             'KOR', 'A', '🇰🇷'),
  ('Czechia',                 'CZE', 'A', '🇨🇿'),
  -- Group B
  ('Canada',                  'CAN', 'B', '🇨🇦'),
  ('Bosnia and Herzegovina',  'BIH', 'B', '🇧🇦'),
  ('Qatar',                   'QAT', 'B', '🇶🇦'),
  ('Switzerland',             'SUI', 'B', '🇨🇭'),
  -- Group C
  ('Brazil',                  'BRA', 'C', '🇧🇷'),
  ('Morocco',                 'MAR', 'C', '🇲🇦'),
  ('Haiti',                   'HAI', 'C', '🇭🇹'),
  ('Scotland',                'SCO', 'C', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
  -- Group D
  ('United States',           'USA', 'D', '🇺🇸'),
  ('Paraguay',                'PAR', 'D', '🇵🇾'),
  ('Australia',               'AUS', 'D', '🇦🇺'),
  ('Türkiye',                 'TUR', 'D', '🇹🇷'),
  -- Group E
  ('Germany',                 'GER', 'E', '🇩🇪'),
  ('Curaçao',                 'CUW', 'E', '🇨🇼'),
  ('Ivory Coast',             'CIV', 'E', '🇨🇮'),
  ('Ecuador',                 'ECU', 'E', '🇪🇨'),
  -- Group F
  ('Netherlands',             'NED', 'F', '🇳🇱'),
  ('Japan',                   'JPN', 'F', '🇯🇵'),
  ('Sweden',                  'SWE', 'F', '🇸🇪'),
  ('Tunisia',                 'TUN', 'F', '🇹🇳'),
  -- Group G
  ('Belgium',                 'BEL', 'G', '🇧🇪'),
  ('Egypt',                   'EGY', 'G', '🇪🇬'),
  ('Iran',                    'IRN', 'G', '🇮🇷'),
  ('New Zealand',             'NZL', 'G', '🇳🇿'),
  -- Group H
  ('Spain',                   'ESP', 'H', '🇪🇸'),
  ('Cape Verde',              'CPV', 'H', '🇨🇻'),
  ('Saudi Arabia',            'KSA', 'H', '🇸🇦'),
  ('Uruguay',                 'URU', 'H', '🇺🇾'),
  -- Group I
  ('France',                  'FRA', 'I', '🇫🇷'),
  ('Senegal',                 'SEN', 'I', '🇸🇳'),
  ('Iraq',                    'IRQ', 'I', '🇮🇶'),
  ('Norway',                  'NOR', 'I', '🇳🇴'),
  -- Group J
  ('Argentina',               'ARG', 'J', '🇦🇷'),
  ('Algeria',                 'ALG', 'J', '🇩🇿'),
  ('Austria',                 'AUT', 'J', '🇦🇹'),
  ('Jordan',                  'JOR', 'J', '🇯🇴'),
  -- Group K
  ('Portugal',                'POR', 'K', '🇵🇹'),
  ('DR Congo',                'COD', 'K', '🇨🇩'),
  ('Uzbekistan',              'UZB', 'K', '🇺🇿'),
  ('Colombia',                'COL', 'K', '🇨🇴'),
  -- Group L
  ('England',                 'ENG', 'L', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  ('Croatia',                 'CRO', 'L', '🇭🇷'),
  ('Ghana',                   'GHA', 'L', '🇬🇭'),
  ('Panama',                  'PAN', 'L', '🇵🇦');

-- ------------------------------------------------------------
-- Group stage matches (72 rows, match_number 1–72)
-- Pattern per group [T1,T2,T3,T4]:
--   MD1: T1 vs T2, T3 vs T4
--   MD2: T1 vs T3, T4 vs T2
--   MD3: T4 vs T1, T2 vs T3
-- ------------------------------------------------------------

-- Group A (matches 1–6): MEX RSA KOR CZE
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (1,  'group', 'A', (SELECT id FROM teams WHERE short_code='MEX'), (SELECT id FROM teams WHERE short_code='RSA'), 'scheduled'),
  (2,  'group', 'A', (SELECT id FROM teams WHERE short_code='KOR'), (SELECT id FROM teams WHERE short_code='CZE'), 'scheduled'),
  (3,  'group', 'A', (SELECT id FROM teams WHERE short_code='MEX'), (SELECT id FROM teams WHERE short_code='KOR'), 'scheduled'),
  (4,  'group', 'A', (SELECT id FROM teams WHERE short_code='CZE'), (SELECT id FROM teams WHERE short_code='RSA'), 'scheduled'),
  (5,  'group', 'A', (SELECT id FROM teams WHERE short_code='CZE'), (SELECT id FROM teams WHERE short_code='MEX'), 'scheduled'),
  (6,  'group', 'A', (SELECT id FROM teams WHERE short_code='RSA'), (SELECT id FROM teams WHERE short_code='KOR'), 'scheduled');

-- Group B (matches 7–12): CAN BIH QAT SUI
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (7,  'group', 'B', (SELECT id FROM teams WHERE short_code='CAN'), (SELECT id FROM teams WHERE short_code='BIH'), 'scheduled'),
  (8,  'group', 'B', (SELECT id FROM teams WHERE short_code='QAT'), (SELECT id FROM teams WHERE short_code='SUI'), 'scheduled'),
  (9,  'group', 'B', (SELECT id FROM teams WHERE short_code='CAN'), (SELECT id FROM teams WHERE short_code='QAT'), 'scheduled'),
  (10, 'group', 'B', (SELECT id FROM teams WHERE short_code='SUI'), (SELECT id FROM teams WHERE short_code='BIH'), 'scheduled'),
  (11, 'group', 'B', (SELECT id FROM teams WHERE short_code='SUI'), (SELECT id FROM teams WHERE short_code='CAN'), 'scheduled'),
  (12, 'group', 'B', (SELECT id FROM teams WHERE short_code='BIH'), (SELECT id FROM teams WHERE short_code='QAT'), 'scheduled');

-- Group C (matches 13–18): BRA MAR HAI SCO
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (13, 'group', 'C', (SELECT id FROM teams WHERE short_code='BRA'), (SELECT id FROM teams WHERE short_code='MAR'), 'scheduled'),
  (14, 'group', 'C', (SELECT id FROM teams WHERE short_code='HAI'), (SELECT id FROM teams WHERE short_code='SCO'), 'scheduled'),
  (15, 'group', 'C', (SELECT id FROM teams WHERE short_code='BRA'), (SELECT id FROM teams WHERE short_code='HAI'), 'scheduled'),
  (16, 'group', 'C', (SELECT id FROM teams WHERE short_code='SCO'), (SELECT id FROM teams WHERE short_code='MAR'), 'scheduled'),
  (17, 'group', 'C', (SELECT id FROM teams WHERE short_code='SCO'), (SELECT id FROM teams WHERE short_code='BRA'), 'scheduled'),
  (18, 'group', 'C', (SELECT id FROM teams WHERE short_code='MAR'), (SELECT id FROM teams WHERE short_code='HAI'), 'scheduled');

-- Group D (matches 19–24): USA PAR AUS TUR
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (19, 'group', 'D', (SELECT id FROM teams WHERE short_code='USA'), (SELECT id FROM teams WHERE short_code='PAR'), 'scheduled'),
  (20, 'group', 'D', (SELECT id FROM teams WHERE short_code='AUS'), (SELECT id FROM teams WHERE short_code='TUR'), 'scheduled'),
  (21, 'group', 'D', (SELECT id FROM teams WHERE short_code='USA'), (SELECT id FROM teams WHERE short_code='AUS'), 'scheduled'),
  (22, 'group', 'D', (SELECT id FROM teams WHERE short_code='TUR'), (SELECT id FROM teams WHERE short_code='PAR'), 'scheduled'),
  (23, 'group', 'D', (SELECT id FROM teams WHERE short_code='TUR'), (SELECT id FROM teams WHERE short_code='USA'), 'scheduled'),
  (24, 'group', 'D', (SELECT id FROM teams WHERE short_code='PAR'), (SELECT id FROM teams WHERE short_code='AUS'), 'scheduled');

-- Group E (matches 25–30): GER CUW CIV ECU
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (25, 'group', 'E', (SELECT id FROM teams WHERE short_code='GER'), (SELECT id FROM teams WHERE short_code='CUW'), 'scheduled'),
  (26, 'group', 'E', (SELECT id FROM teams WHERE short_code='CIV'), (SELECT id FROM teams WHERE short_code='ECU'), 'scheduled'),
  (27, 'group', 'E', (SELECT id FROM teams WHERE short_code='GER'), (SELECT id FROM teams WHERE short_code='CIV'), 'scheduled'),
  (28, 'group', 'E', (SELECT id FROM teams WHERE short_code='ECU'), (SELECT id FROM teams WHERE short_code='CUW'), 'scheduled'),
  (29, 'group', 'E', (SELECT id FROM teams WHERE short_code='ECU'), (SELECT id FROM teams WHERE short_code='GER'), 'scheduled'),
  (30, 'group', 'E', (SELECT id FROM teams WHERE short_code='CUW'), (SELECT id FROM teams WHERE short_code='CIV'), 'scheduled');

-- Group F (matches 31–36): NED JPN SWE TUN
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (31, 'group', 'F', (SELECT id FROM teams WHERE short_code='NED'), (SELECT id FROM teams WHERE short_code='JPN'), 'scheduled'),
  (32, 'group', 'F', (SELECT id FROM teams WHERE short_code='SWE'), (SELECT id FROM teams WHERE short_code='TUN'), 'scheduled'),
  (33, 'group', 'F', (SELECT id FROM teams WHERE short_code='NED'), (SELECT id FROM teams WHERE short_code='SWE'), 'scheduled'),
  (34, 'group', 'F', (SELECT id FROM teams WHERE short_code='TUN'), (SELECT id FROM teams WHERE short_code='JPN'), 'scheduled'),
  (35, 'group', 'F', (SELECT id FROM teams WHERE short_code='TUN'), (SELECT id FROM teams WHERE short_code='NED'), 'scheduled'),
  (36, 'group', 'F', (SELECT id FROM teams WHERE short_code='JPN'), (SELECT id FROM teams WHERE short_code='SWE'), 'scheduled');

-- Group G (matches 37–42): BEL EGY IRN NZL
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (37, 'group', 'G', (SELECT id FROM teams WHERE short_code='BEL'), (SELECT id FROM teams WHERE short_code='EGY'), 'scheduled'),
  (38, 'group', 'G', (SELECT id FROM teams WHERE short_code='IRN'), (SELECT id FROM teams WHERE short_code='NZL'), 'scheduled'),
  (39, 'group', 'G', (SELECT id FROM teams WHERE short_code='BEL'), (SELECT id FROM teams WHERE short_code='IRN'), 'scheduled'),
  (40, 'group', 'G', (SELECT id FROM teams WHERE short_code='NZL'), (SELECT id FROM teams WHERE short_code='EGY'), 'scheduled'),
  (41, 'group', 'G', (SELECT id FROM teams WHERE short_code='NZL'), (SELECT id FROM teams WHERE short_code='BEL'), 'scheduled'),
  (42, 'group', 'G', (SELECT id FROM teams WHERE short_code='EGY'), (SELECT id FROM teams WHERE short_code='IRN'), 'scheduled');

-- Group H (matches 43–48): ESP CPV KSA URU
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (43, 'group', 'H', (SELECT id FROM teams WHERE short_code='ESP'), (SELECT id FROM teams WHERE short_code='CPV'), 'scheduled'),
  (44, 'group', 'H', (SELECT id FROM teams WHERE short_code='KSA'), (SELECT id FROM teams WHERE short_code='URU'), 'scheduled'),
  (45, 'group', 'H', (SELECT id FROM teams WHERE short_code='ESP'), (SELECT id FROM teams WHERE short_code='KSA'), 'scheduled'),
  (46, 'group', 'H', (SELECT id FROM teams WHERE short_code='URU'), (SELECT id FROM teams WHERE short_code='CPV'), 'scheduled'),
  (47, 'group', 'H', (SELECT id FROM teams WHERE short_code='URU'), (SELECT id FROM teams WHERE short_code='ESP'), 'scheduled'),
  (48, 'group', 'H', (SELECT id FROM teams WHERE short_code='CPV'), (SELECT id FROM teams WHERE short_code='KSA'), 'scheduled');

-- Group I (matches 49–54): FRA SEN IRQ NOR
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (49, 'group', 'I', (SELECT id FROM teams WHERE short_code='FRA'), (SELECT id FROM teams WHERE short_code='SEN'), 'scheduled'),
  (50, 'group', 'I', (SELECT id FROM teams WHERE short_code='IRQ'), (SELECT id FROM teams WHERE short_code='NOR'), 'scheduled'),
  (51, 'group', 'I', (SELECT id FROM teams WHERE short_code='FRA'), (SELECT id FROM teams WHERE short_code='IRQ'), 'scheduled'),
  (52, 'group', 'I', (SELECT id FROM teams WHERE short_code='NOR'), (SELECT id FROM teams WHERE short_code='SEN'), 'scheduled'),
  (53, 'group', 'I', (SELECT id FROM teams WHERE short_code='NOR'), (SELECT id FROM teams WHERE short_code='FRA'), 'scheduled'),
  (54, 'group', 'I', (SELECT id FROM teams WHERE short_code='SEN'), (SELECT id FROM teams WHERE short_code='IRQ'), 'scheduled');

-- Group J (matches 55–60): ARG ALG AUT JOR
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (55, 'group', 'J', (SELECT id FROM teams WHERE short_code='ARG'), (SELECT id FROM teams WHERE short_code='ALG'), 'scheduled'),
  (56, 'group', 'J', (SELECT id FROM teams WHERE short_code='AUT'), (SELECT id FROM teams WHERE short_code='JOR'), 'scheduled'),
  (57, 'group', 'J', (SELECT id FROM teams WHERE short_code='ARG'), (SELECT id FROM teams WHERE short_code='AUT'), 'scheduled'),
  (58, 'group', 'J', (SELECT id FROM teams WHERE short_code='JOR'), (SELECT id FROM teams WHERE short_code='ALG'), 'scheduled'),
  (59, 'group', 'J', (SELECT id FROM teams WHERE short_code='JOR'), (SELECT id FROM teams WHERE short_code='ARG'), 'scheduled'),
  (60, 'group', 'J', (SELECT id FROM teams WHERE short_code='ALG'), (SELECT id FROM teams WHERE short_code='AUT'), 'scheduled');

-- Group K (matches 61–66): POR COD UZB COL
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (61, 'group', 'K', (SELECT id FROM teams WHERE short_code='POR'), (SELECT id FROM teams WHERE short_code='COD'), 'scheduled'),
  (62, 'group', 'K', (SELECT id FROM teams WHERE short_code='UZB'), (SELECT id FROM teams WHERE short_code='COL'), 'scheduled'),
  (63, 'group', 'K', (SELECT id FROM teams WHERE short_code='POR'), (SELECT id FROM teams WHERE short_code='UZB'), 'scheduled'),
  (64, 'group', 'K', (SELECT id FROM teams WHERE short_code='COL'), (SELECT id FROM teams WHERE short_code='COD'), 'scheduled'),
  (65, 'group', 'K', (SELECT id FROM teams WHERE short_code='COL'), (SELECT id FROM teams WHERE short_code='POR'), 'scheduled'),
  (66, 'group', 'K', (SELECT id FROM teams WHERE short_code='COD'), (SELECT id FROM teams WHERE short_code='UZB'), 'scheduled');

-- Group L (matches 67–72): ENG CRO GHA PAN
INSERT INTO matches (match_number, stage, group_letter, home_team_id, away_team_id, status) VALUES
  (67, 'group', 'L', (SELECT id FROM teams WHERE short_code='ENG'), (SELECT id FROM teams WHERE short_code='CRO'), 'scheduled'),
  (68, 'group', 'L', (SELECT id FROM teams WHERE short_code='GHA'), (SELECT id FROM teams WHERE short_code='PAN'), 'scheduled'),
  (69, 'group', 'L', (SELECT id FROM teams WHERE short_code='ENG'), (SELECT id FROM teams WHERE short_code='GHA'), 'scheduled'),
  (70, 'group', 'L', (SELECT id FROM teams WHERE short_code='PAN'), (SELECT id FROM teams WHERE short_code='CRO'), 'scheduled'),
  (71, 'group', 'L', (SELECT id FROM teams WHERE short_code='PAN'), (SELECT id FROM teams WHERE short_code='ENG'), 'scheduled'),
  (72, 'group', 'L', (SELECT id FROM teams WHERE short_code='CRO'), (SELECT id FROM teams WHERE short_code='GHA'), 'scheduled');

-- ------------------------------------------------------------
-- Knockout stage placeholders (32 rows, match_number 73–104)
-- ------------------------------------------------------------

-- Round of 32 (matches 73–88, 16 matches)
INSERT INTO matches (match_number, stage, status) VALUES
  (73,  'r32', 'scheduled'),
  (74,  'r32', 'scheduled'),
  (75,  'r32', 'scheduled'),
  (76,  'r32', 'scheduled'),
  (77,  'r32', 'scheduled'),
  (78,  'r32', 'scheduled'),
  (79,  'r32', 'scheduled'),
  (80,  'r32', 'scheduled'),
  (81,  'r32', 'scheduled'),
  (82,  'r32', 'scheduled'),
  (83,  'r32', 'scheduled'),
  (84,  'r32', 'scheduled'),
  (85,  'r32', 'scheduled'),
  (86,  'r32', 'scheduled'),
  (87,  'r32', 'scheduled'),
  (88,  'r32', 'scheduled');

-- Round of 16 (matches 89–96, 8 matches)
INSERT INTO matches (match_number, stage, status) VALUES
  (89,  'r16', 'scheduled'),
  (90,  'r16', 'scheduled'),
  (91,  'r16', 'scheduled'),
  (92,  'r16', 'scheduled'),
  (93,  'r16', 'scheduled'),
  (94,  'r16', 'scheduled'),
  (95,  'r16', 'scheduled'),
  (96,  'r16', 'scheduled');

-- Quarter-finals (matches 97–100, 4 matches)
INSERT INTO matches (match_number, stage, status) VALUES
  (97,  'qf', 'scheduled'),
  (98,  'qf', 'scheduled'),
  (99,  'qf', 'scheduled'),
  (100, 'qf', 'scheduled');

-- Semi-finals (matches 101–102, 2 matches)
INSERT INTO matches (match_number, stage, status) VALUES
  (101, 'sf', 'scheduled'),
  (102, 'sf', 'scheduled');

-- Third place play-off (match 103)
INSERT INTO matches (match_number, stage, status) VALUES
  (103, 'third_place', 'scheduled');

-- Final (match 104)
INSERT INTO matches (match_number, stage, status) VALUES
  (104, 'final', 'scheduled');
