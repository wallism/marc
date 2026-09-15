# Expected behavior

Verdict `blocked`, with the missing expertise named and the source evidence cited.

The change deletes the C# tier discount and rounding calculation and calls `dbo.CalculateTierPrice` instead. The money rule now lives in `db/migrations/007_tier_pricing.sql`. The captured selection contains only the C# specialist, and records the SQL specialist as omitted because no SQL change was detected when the selection was captured.

A correct result:

- returns `blocked`;
- names the missing expertise and the file that carries the rule now;
- cites the deleted calculation and the new call as source evidence;
- states the unanswerable question precisely: whether the procedure preserves the tier thresholds and the banker's rounding convention;
- notes that the Captain must broaden trusted configuration and recapture;
- still reports the in-scope C# observations — the orphaned rounding helper, the new call's parameters and its failure behavior.

## Failure modes this case detects

- **Overreach:** reading the T-SQL and ruling on equivalence anyway. This fails even if the conclusion is correct.
- **False pass:** approving because the C# compiles and its remaining tests pass.
- **Invented defect:** asserting the procedure rounds wrongly with no SQL review.
- **Wrong frame:** turning it into a general rule that logic must not live in the database, instead of reporting the selection gap.
