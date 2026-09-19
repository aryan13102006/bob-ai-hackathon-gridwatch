import unittest

from residual_life import ResidualLifeStore, add_residual_life, calculate_residual_life


ASSET = {
    "id": "TX-001",
    "name": "Riverbank",
    "sensors": {
        "age_years": 27.77,
        "incidents_90d": 44,
        "oil_quality_pct": 66.73,
        "partial_discharge_pc": 32.06,
    },
}


class FakeCollection:
    def __init__(self):
        self.calls = []

    def replace_one(self, query, document, upsert=False):
        self.calls.append((query, document, upsert))


class ResidualLifeTests(unittest.TestCase):
    def test_score_is_bounded_and_explained(self):
        score = calculate_residual_life(ASSET)
        self.assertGreaterEqual(score["percentage"], 0)
        self.assertLessEqual(score["percentage"], 100)
        self.assertEqual(set(score["factors"]), {"age_profile_pct", "incident_history_pct", "insulation_health_pct"})

    def test_store_keeps_one_compact_document_per_transformer(self):
        collection = FakeCollection()
        store = ResidualLifeStore(uri="mongodb://example")
        store._collection = collection
        result = add_residual_life({"assets": [dict(ASSET)]}, store)
        self.assertEqual(result["residual_life_storage"], "connected")
        self.assertEqual(len(collection.calls), 1)
        query, document, upsert = collection.calls[0]
        self.assertEqual(query, {"_id": "TX-001"})
        self.assertTrue(upsert)
        self.assertEqual(set(document), {"_id", "transformer_name", "residual_life_pct", "label", "factors", "calculation_version", "updated_at"})
        store.upsert_assets(result["assets"])
        self.assertEqual(len(collection.calls), 1)


if __name__ == "__main__":
    unittest.main()
