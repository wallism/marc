-- In this PR's diff. Reviewing whether this preserves the C# rule needs SQL expertise
-- that the captured selection does not include.
CREATE OR ALTER PROCEDURE dbo.CalculateTierPrice
    @CustomerId INT,
    @NetAmount DECIMAL(18, 4)
AS
BEGIN
    DECLARE @Rate DECIMAL(5, 4);

    SELECT @Rate = CASE
        WHEN c.LifetimeSpend >= 100000 THEN 0.15
        WHEN c.LifetimeSpend >= 25000 THEN 0.10
        WHEN c.LifetimeSpend >= 5000 THEN 0.05
        ELSE 0.00
    END
    FROM dbo.Customers AS c
    WHERE c.Id = @CustomerId;

    SELECT ROUND(@NetAmount * (1 - ISNULL(@Rate, 0)), 2);
END
