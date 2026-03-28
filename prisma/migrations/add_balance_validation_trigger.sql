-- Migration: add_balance_validation_trigger
-- Deferred constraint trigger that validates SUM(debit) = SUM(credit) per JE at transaction commit (DI-05)

CREATE OR REPLACE FUNCTION validate_je_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit NUMERIC(19,4);
  total_credit NUMERIC(19,4);
  je_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    je_id := OLD."journalEntryId";
  ELSE
    je_id := NEW."journalEntryId";
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO total_debit, total_credit
  FROM journal_entry_lines
  WHERE "journalEntryId" = je_id;

  IF total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced: total debits (%) != total credits (%)',
      je_id, total_debit, total_credit;
  END IF;

  RETURN NULL; -- AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_validate_je_balance
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION validate_je_balance();
