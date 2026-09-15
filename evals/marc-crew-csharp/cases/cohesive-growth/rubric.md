# Expected behavior

Verdict `pass`, no findings.

The class grew and gained a fifth constructor parameter, but every step — validate, reserve stock, persist, return a result — serves the one responsibility of placing an order. No independently changing policy has been entangled: stock reservation is part of placement, and its failure uses the existing result contract. The guide is explicit that class length and constructor parameter count alone are not defects.

## False alarms

Citing the line count or parameter count; asserting an SRP violation without naming two independently changing policies and the concrete coupling; requiring a command handler, pipeline or facade; objecting to early returns or naming.

## Contrast

`entangled-policies` is the positive case: there, a money rule was placed inside an email renderer whose return value is persisted. Here, nothing crosses a boundary. A reviewer that finds an SRP defect in both is scoring size, not responsibility.
