-- Migration: add_posted_immutability_trigger
-- Prevents UPDATE/DELETE on posted journal entries and their line items (DI-04)

-- Prevent UPDATE/DELETE on posted journal entries
CREATE OR REPLACE FUNCTION prevent_posted_je_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'POSTED' THEN
      RAISE EXCEPTION 'Cannot delete posted journal entry (id: %). Posted entries are immutable.', OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Allow status transitions TO posted (that's the posting action itself)
    IF OLD.status = 'POSTED' AND NEW.status = 'POSTED' THEN
      RAISE EXCEPTION 'Cannot modify posted journal entry (id: %). Posted entries are immutable.', OLD.id;
    END IF;
    -- Allow the transition from DRAFT/APPROVED -> POSTED
    IF OLD.status = 'POSTED' AND NEW.status != 'POSTED' THEN
      RAISE EXCEPTION 'Cannot change status of posted journal entry (id: %). Use a reversing entry instead.', OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_posted_je_immutable
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_posted_je_modification();

-- Prevent modification of line items belonging to posted JEs
CREATE OR REPLACE FUNCTION prevent_posted_line_modification()
RETURNS TRIGGER AS $$
DECLARE
  je_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO je_status FROM journal_entries WHERE id = OLD.journal_entry_id;
  ELSE
    SELECT status INTO je_status FROM journal_entries WHERE id = NEW.journal_entry_id;
  END IF;

  IF je_status = 'POSTED' THEN
    RAISE EXCEPTION 'Cannot modify line items of a posted journal entry. Posted entries are immutable.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_posted_line_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_posted_line_modification();
