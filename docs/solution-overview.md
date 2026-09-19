# Solution overview

GridWatch separates evidence according to what the data can support. ETT provides measured oil temperatures and loads, so its model predicts temperature at t+24 hours. A reproducible simulator provides sensor snapshots, forecast-like weather inputs, prior incident counts and a stochastic next-day event label for the outage classifier.

The operator edits wind, rain and crew availability. The engine scores twelve fictional assets, ranks risk multiplied by effective customer exposure plus 5,000 equivalent customers per critical site, and proposes inspection jobs. Backup fractions reduce customer exposure. This impact formula is a configurable design assumption, not an industry standard.

Crews alternate electrical and line specialisms. The planner walks the priority queue and assigns a matching crew with enough hours in an eight-hour shift. It includes one hour of travel per job and explicitly reports unassigned work. Each crew stages in its first job's area.

Feature evidence replaces one value with its training median and measures the change in probability. This sensitivity is not causal attribution and can behave unreliably with correlated inputs. Bob uses the same engine through MCP to explain results, with no separate invented risk values.
