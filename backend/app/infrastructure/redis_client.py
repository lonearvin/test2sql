import redis
from typing import Optional, Any
import json
from app.config.settings import settings

class RedisClient:
    def __init__(self):
        self.client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password,
            decode_responses=True
        )

    def get(self, key: str) -> Optional[str]:
        return self.client.get(key)

    def set(self, key: str, value: str, ex: int = None) -> bool:
        return self.client.set(key, value, ex=ex)

    def setex(self, key: str, time: int, value: str) -> bool:
        return self.client.setex(key, time, value)

    def delete(self, key: str) -> int:
        return self.client.delete(key)

    def exists(self, key: str) -> bool:
        return self.client.exists(key) > 0

    def get_json(self, key: str) -> Optional[Any]:
        value = self.get(key)
        if value:
            return json.loads(value)
        return None

    def set_json(self, key: str, value: Any, ex: int = None) -> bool:
        return self.set(key, json.dumps(value), ex=ex)

redis_client = RedisClient()