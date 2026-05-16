-- Adds two columns to support the animated ballot-drop sequence shown before
-- the results projection.
--
--  show_ballot_animation          → triggers "ballot-animation" projection state
--  ballot_animation_started_at   → used by the admin panel to resume the auto-
--                                   advance timer correctly if the page reloads
--                                   while the animation is running

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS show_ballot_animation       boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ballot_animation_started_at timestamptz;
