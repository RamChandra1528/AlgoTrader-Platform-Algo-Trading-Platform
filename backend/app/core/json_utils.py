import math
from collections.abc import Mapping

from starlette.responses import JSONResponse


def sanitize_json_value(value):
    """Recursively replace non-finite floats with None so responses stay JSON-safe."""
    if isinstance(value, float):
        return value if math.isfinite(value) else None

    if isinstance(value, Mapping):
        return {key: sanitize_json_value(item) for key, item in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [sanitize_json_value(item) for item in value]

    item = getattr(value, "item", None)
    if callable(item):
        try:
            return sanitize_json_value(item())
        except Exception:
            return value

    return value


class SafeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return super().render(sanitize_json_value(content))
