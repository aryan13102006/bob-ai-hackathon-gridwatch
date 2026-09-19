"""Residual-life scoring and compact MongoDB persistence."""
from datetime import datetime, timezone
import logging
import os


CALCULATION_VERSION = "1"


def _clamp(value):
    return max(0.0, min(100.0, value))


def calculate_residual_life(asset):
    sensors = asset["sensors"]
    age = _clamp(100 - (sensors["age_years"] / 45) * 100)
    incidents = _clamp(100 - sensors["incidents_90d"] * 1.1)
    discharge_health = _clamp(100 - sensors["partial_discharge_pc"] * 1.4)
    insulation = _clamp((sensors["oil_quality_pct"] + discharge_health) / 2)
    value = round(age * .45 + incidents * .30 + insulation * .25)
    label = "Healthy reserve" if value >= 70 else "Reduced reserve" if value >= 45 else "Limited reserve"
    return {
        "percentage": value,
        "label": label,
        "factors": {
            "age_profile_pct": round(age),
            "incident_history_pct": round(incidents),
            "insulation_health_pct": round(insulation),
        },
        "calculation_version": CALCULATION_VERSION,
    }


class ResidualLifeStore:
    """Keep one compact residual-life document per transformer."""

    def __init__(self, uri=None, database=None, collection=None):
        self.uri = uri if uri is not None else os.getenv("MONGODB_URI", "").strip()
        self.database_name = database or os.getenv("MONGODB_DATABASE", "gridwatch")
        self.collection_name = collection or os.getenv("MONGODB_COLLECTION", "transformer_residual_life")
        self._collection = None
        self._last_values = {}

    @property
    def configured(self):
        return bool(self.uri)

    def _connect(self):
        if self._collection is not None or not self.configured:
            return self._collection
        from pymongo import MongoClient
        client = MongoClient(self.uri, serverSelectionTimeoutMS=4000, connectTimeoutMS=4000)
        client.admin.command("ping")
        self._collection = client[self.database_name][self.collection_name]
        return self._collection

    def upsert_assets(self, assets):
        if not self.configured:
            return "not-configured"
        try:
            collection = self._connect()
            for asset in assets:
                residual = asset["residual_life"]
                compact = {
                    "transformer_name": asset["name"],
                    "residual_life_pct": residual["percentage"],
                    "label": residual["label"],
                    "factors": residual["factors"],
                    "calculation_version": residual["calculation_version"],
                }
                if self._last_values.get(asset["id"]) == compact:
                    continue
                document = {"_id": asset["id"], **compact, "updated_at": datetime.now(timezone.utc)}
                collection.replace_one({"_id": asset["id"]}, document, upsert=True)
                self._last_values[asset["id"]] = compact
            return "connected"
        except Exception:
            logging.exception("Residual-life MongoDB update failed")
            self._collection = None
            return "unavailable"


def add_residual_life(result, store=None):
    for asset in result["assets"]:
        asset["residual_life"] = calculate_residual_life(asset)
    storage = store.upsert_assets(result["assets"]) if store else "not-configured"
    result["residual_life_storage"] = storage
    return result
