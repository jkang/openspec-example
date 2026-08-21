import time
from datetime import datetime
from typing import List, Optional, Tuple

from ..domain.models import Coupon, Issuance, validate_coupon_rule, validate_issue
from ..repo.memory import MemoryRepo


class AdminCouponService:
    def __init__(self, coupon_repo: MemoryRepo[Coupon], issuance_repo: MemoryRepo[Issuance]):
        self.coupon_repo = coupon_repo
        self.issuance_repo = issuance_repo

    def _next_template_id(self) -> str:
        rule_count = sum(1 for c in self.coupon_repo.find_all() if c.user_id is None)
        n = rule_count + 1
        while self.coupon_repo.find_by_id(f"CPN-{n:03d}") is not None:
            n += 1
        return f"CPN-{n:03d}"

    def create(self, name: str, type_: str, value: float, min_spend_cents: int = 0,
               expiry_date: Optional[str] = None) -> Coupon:
        """创建券规则，创建即 ACTIVE"""
        validate_coupon_rule(type_, value, min_spend_cents)
        coupon = Coupon(
            id=self._next_template_id(),
            name=name,
            type=type_,
            value=value,
            minSpendCents=min_spend_cents,
            expiryDate=expiry_date,
            status="ACTIVE",
            userId=None,
        )
        self.coupon_repo.save(coupon.id, coupon)
        return coupon

    def list(self) -> List[dict]:
        """券规则列表（全场通用券，非发放实例），含 issuedCount 聚合"""
        result = []
        for c in self.coupon_repo.find_all():
            if c.user_id is not None:
                continue
            item = c.model_dump(by_alias=True)
            item["issuedCount"] = self.coupon_repo.count_by("template_id", c.id)
            result.append(item)
        return result

    def issue(self, template_id: str, user_id: str, operator: str = "王琳") -> Tuple[Coupon, Issuance]:
        """单人发放：以模板为蓝本生成用户归属实例 + 沉淀发放记录"""
        template = self.coupon_repo.find_by_id(template_id)
        if template is None:
            raise ValueError("COUPON_NOT_FOUND")
        validate_issue(template, user_id, self.coupon_repo.find_all())

        seq = self.coupon_repo.count_by("template_id", template_id) + 1
        instance = Coupon(
            id=f"{template_id}-{seq}",
            name=template.name,
            type=template.type,
            value=template.value,
            minSpendCents=template.min_spend_cents,
            expiryDate=template.expiry_date,
            status="UNUSED",
            userId=user_id,
            templateId=template_id,
        )
        self.coupon_repo.save(instance.id, instance)

        issuance = Issuance(
            id=f"ISS-{int(time.time() * 1000)}",
            time=datetime.now().strftime("%Y-%m-%d %H:%M"),
            couponId=template_id,
            couponName=template.name,
            userId=user_id,
            operator=operator,
        )
        self.issuance_repo.save(issuance.id, issuance)

        return instance, issuance

    def list_issuances(self) -> List[Issuance]:
        """最近发放记录（最新在前）"""
        return list(reversed(self.issuance_repo.find_all()))
