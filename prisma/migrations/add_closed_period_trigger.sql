-- Migration: add_closed_period_trigger
-- Prevents posting journal entries to closed periods (JE-06)
-- With no rows in period_closes, this trigger always passes.
-- Phase 4 adds the UI to close periods.

CREATE OR REPLACE FUNCTION check_closed_period()
RETURNS TRIGGER AS $$
DECLARE
  je_year INT;
  je_month INT;
  is_closed BOOLEAN;
BEGIN
  -- Only fire when status is changing TO 'POSTED'
  IF NEW.status = 'POSTED' AND (OLD.status IS NULL OR OLD.status != 'POSTED') THEN
    je_year := EXTRACT(YEAR FROM NEW.date);
    je_month := EXTRACT(MONTH FROM NEW.date);

    SELECT EXISTS(
      SELECT 1 FROM period_closes
      WHERE entity_id = NEW.entity_id
        AND year = je_year
        AND month = je_month
    ) INTO is_closed;

    IF is_closed THEN
      RAISE EXCEPTION 'Cannot post to closed period: %/% for entity %',
        je_year, je_month, NEW.entity_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_check_closed_period
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION check_closed_period();
