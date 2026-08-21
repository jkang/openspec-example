from typing import Dict, List, Optional, TypeVar, Generic

T = TypeVar('T')

class MemoryRepo(Generic[T]):
    def __init__(self):
        self._data: Dict[str, T] = {}

    def save(self, id: str, item: T):
        self._data[id] = item

    def find_by_id(self, id: str) -> Optional[T]:
        return self._data.get(id)

    def find_all(self) -> List[T]:
        return list(self._data.values())

    def count_by(self, field: str, value) -> int:
        return sum(1 for item in self._data.values() if getattr(item, field, None) == value)

    def clear(self):
        self._data.clear()
