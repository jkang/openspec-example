from ..domain.models import Coupon
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

        if order_total_cents < coupon.threshold_cents:
            raise ValueError("COUPON_THRESHOLD_NOT_MET")

        return coupon

    def redeem(self, coupon_id: str):
        coupon = self.repo.find_by_id(coupon_id)
        if coupon:
            coupon.status = "USED"
            self.repo.save(coupon.id, coupon)

    def list_coupons(self):
        return self.repo.find_all()
