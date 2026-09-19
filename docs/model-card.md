# Model card

## Real temperature forecast

Source: Haoyi Zhou et al., ETDataset, ETTh1 hourly data. https://github.com/zhouhaoyi/ETDataset. Citation: Informer: Beyond Efficient Transformer for Long Sequence Time-Series Forecasting, AAAI 2021. The downloader saves the upstream license and hashes in data/provenance.json. ETT contains no failure labels or timestamped weather forecasts.

Target: oil temperature at t+24 hours. Features: current seven sensor/load values, lagged oil temperature at 1/6/12/24/48/168 hours, trailing 24-hour mean and time-of-day sine/cosine. All features are available at prediction origin. Data is split 60/20/20 by time after lag construction, with a 24-hour embargo at both boundaries. Training labels end before the next split begins. No random row split is used.

Four Ridge regularization values are compared by validation MAE. Alpha 1 wins. The scaler is fitted only on training data. The model is not refitted after evaluation. Test contains 3,446 origins. MAE is 1.6345 C versus persistence 1.7144 C (about 4.7% lower), RMSE is 2.1276 C versus 2.2400 C. This modest improvement is not evidence of outage prediction. A nominal 90% absolute-residual interval fitted on validation has radius 3.6648 C and test coverage 93.09%. Time dependence and distribution shift invalidate a general finite-sample coverage guarantee.

## Synthetic outage classifier

36 fictional assets, 360 daily prediction origins, seed 42, 12,960 rows. A persistent latent wear state and weather/load variation produce noisy sensor readings. A stochastic Bernoulli event is generated for the following 24-hour window. incidents_90d counts only prior windows. This is a teaching simulator, not a physical reliability model. Assets may have consecutive events and there is no repair/reset lifecycle. Its high event prevalence is deliberately unlike normal utility operation.

Train days 0–215, validation 217–287, test 289–359. One-day gaps separate windows. Asset identity is excluded from features. Test assets are the same fleet, so this is a later-time test, not a test of generalization to new equipment.

Logistic regression and histogram gradient boosting are compared using validation average precision. Logistic regression wins (0.7448 versus 0.7305). The 0.35 alert threshold maximizes validation F1 over a fixed grid. Synthetic test: average precision 0.7717, ROC AUC 0.8147, Brier 0.1732, precision 0.6399, recall 0.8072, F1 0.7139. Test prevalence is 43.23%, so do not compare these values with rare-event utility results. Threshold baseline flags temperature >85 C OR vibration >3 mm/s OR wind >70 km/h, giving AP 0.5117 and F1 0.4773. Thresholds are demo assumptions, not engineering limits.

No calibration claim is made: Brier is reported, but probabilities require external calibration before operational use. The uncertainty interval from the temperature model does not apply to the failure classifier.

## Operational limitations and next data contract

Neither model establishes real-world outage accuracy. The dashboard uses only synthetic failure scoring, with the real temperature model exposed as a separate evidence benchmark. Location, topology, customers and critical sites are fictional. Forecast weather is manually entered. No power-flow or cascading-failure simulation, live ingestion, fault diagnosis, automatic switching or crew dispatch is implemented.

To train a field model, obtain asset_id, prediction timestamp, sensor readings, weather forecast issued_at and valid_time, incident onset/end, maintenance timing and censoring, topology version, affected customers and crew constraints. Join forecasts as-of prediction time, construct labels only for fully observed future windows, purge overlapping windows, and evaluate by later time and held-out assets. Report PR-AUC, recall at a crew budget, false alerts per asset-month, lead time and reliability calibration. Do not join realized future weather as if it were a forecast.
