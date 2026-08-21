from pydantic import BaseModel, Field, EmailStr
from typing import List, Literal, Optional

class Product(BaseModel):
    id: str
    name: str
    price_cents: int = Field(..., ge=0, alias="priceCents")
    stock: int = Field(..., ge=0)
    image_url: Optional[str] = Field(None, alias="imageUrl")

class CartItem(BaseModel):
    id: str
    product_id: str = Field(..., alias="productId")
    quantity: int = Field(..., gt=0, le=99)

class Cart(BaseModel):
    user_id: str = Field(..., alias="userId")
    items: List[CartItem] = []

class OrderItem(BaseModel):
    product_id: str = Field(..., alias="productId")
    price_cents: int = Field(..., alias="priceCents")
    quantity: int

class Order(BaseModel):
    id: str
    status: Literal["PENDING_PAYMENT", "PAID"]
    total_cents: int = Field(..., ge=0, alias="totalCents")
    discount_cents: int = Field(0, ge=0, alias="discountCents")
    actual_paid_cents: int = Field(0, ge=0, alias="actualPaidCents")
    coupon_id: Optional[str] = Field(None, alias="couponId")
    items: List[OrderItem]

class Coupon(BaseModel):
    id: str
    name: str
    type: Literal["FLAT", "PERCENTAGE"]
    value: float = Field(..., ge=0)
    min_spend_cents: int = Field(..., ge=0, alias="minSpendCents")
    status: Literal["UNUSED", "USED", "EXPIRED", "ACTIVE"]
    expiry_date: Optional[str] = Field(None, alias="expiryDate")
    user_id: Optional[str] = Field(None, alias="userId")
    template_id: Optional[str] = Field(None, alias="templateId")

class Issuance(BaseModel):
    id: str
    time: str
    coupon_id: str = Field(..., alias="couponId")
    coupon_name: str = Field(..., alias="couponName")
    user_id: str = Field(..., alias="userId")
    operator: str

def validate_coupon_rule(type_: str, value: float, min_spend_cents: int):
    """创建券规则校验（运营后台）"""
    if type_ == "PERCENTAGE" and (value <= 0 or value >= 10):
        raise ValueError("INVALID_DISCOUNT_RATE")
    if type_ == "FLAT" and min_spend_cents > 0 and value >= min_spend_cents:
        raise ValueError("COUPON_VALUE_EXCEEDS_THRESHOLD")

def validate_issue(template: Coupon, user_id: str, all_coupons: List[Coupon]):
    """单人发放校验（运营后台）"""
    import re
    if not re.fullmatch(r"user_\d+", user_id or ""):
        raise ValueError("INVALID_USER_ID")
    if template.status != "ACTIVE":
        raise ValueError("COUPON_NOT_ACTIVE")
    if any(c.template_id == template.id and c.user_id == user_id and c.status == "UNUSED" for c in all_coupons):
        raise ValueError("COUPON_ALREADY_ISSUED")

def calculate_discount(total_cents: int, coupon: Optional[Coupon]) -> int:
    if not coupon or total_cents < coupon.min_spend_cents:
        return 0
    
    if coupon.type == "FLAT":
        return min(total_cents, int(coupon.value))
    elif coupon.type == "PERCENTAGE":
        # 折扣额 = 总价 * (1 - 折扣率/10)
        discount = total_cents * (1 - coupon.value / 10)
        import math
        # 同样处理浮点误差
        return math.floor(discount + 0.00001)
    
    return 0
