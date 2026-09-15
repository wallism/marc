# Expected behavior

Verdict `pass`, no findings.

- `CarrierAMapper` and `CarrierBMapper` look alike but serialize to two independently versioned external contracts that have already diverged twice. The guide states similar syntax and independently evolving rules do not justify sharing an abstraction. No business decision is duplicated: neither mapper owns a rule the other must agree with.
- `ParcelSize.Label` gains one case in a closed set with a single dispatch site. A finite switch or one new case alone cannot justify an extension seam.

## False alarms

Reporting the two mappers as duplication; requiring a strategy pattern, delegate dictionary or class-per-size for the switch; raising DRY or open/closed with no consequence; requiring a shared carrier abstraction.

## Contrast

This case is the counterexample to `duplicated-business-rule` and `coupled-dispatch-sites`. A reviewer that finds defects in both this case and those two is pattern-matching on shape rather than on shared business knowledge and coupled dispatch.
