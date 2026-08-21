from typing import List, Optional
from ..domain.models import Coupon, calculate_discount
from ..repo.memory import MemoryRepo

class CouponService:
    def __init__(self, repo: MemoryRepo[Coupon]):
        self.repo = repo

    def validate(self, coupon_id: str, order_total_cents: int) -> Coupon:
        coupon = self.repo.find_by_id(coupon_id)
        if not coupon:
            raise ValueError("COUPON_NOT_FOUND")

        if coupon.status != "UNUSED":
            raise ValueError("COUPON_ALREADY_USED")

        if order_total_cents < coupon.min_spend_cents:
            raise ValueError("COUPON_THRESHOLD_NOT_MET")

        return coupon

    def get_best_coupon(self, user_id: str, order_total_cents: int) -> Optional[Coupon]:
        # 候选集 = 全场通用券 (user_id 为 None) + 该用户持有的券
        all_coupons = self.repo.find_all()
        available_coupons = [
            c for c in all_coupons
            if c.status == "UNUSED"
            and order_total_cents >= c.min_spend_cents
            and (c.user_id is None or c.user_id == user_id)
        ]

        if not available_coupons:
            return None

        # 计算减免额并排序
        rated = []
        for coupon in available_coupons:
            discount = calculate_discount(order_total_cents, coupon)
            rated.append((discount, coupon))
        
        # 按折扣额降序，相同则按 ID 升序
        rated.sort(key=lambda x: (-x[0], x[1].id))
        
        return rated[0][1]

    def redeem(self, coupon_id: str):
        coupon = self.repo.find_by_id(coupon_id)
        if coupon:
            coupon.status = "USED"
            self.repo.save(coupon.id, coupon)

    def list_coupons(self, user_id: Optional[str] = None) -> List[Coupon]:
        # 当前用户可见的券：全场通用券 (ACTIVE 规则模板除外) + 本人持有的券
        result = []
        for c in self.repo.find_all():
            if c.user_id is not None:
                if c.user_id == user_id:
                    result.append(c)
            elif c.status != "ACTIVE":
                result.append(c)
        return result
