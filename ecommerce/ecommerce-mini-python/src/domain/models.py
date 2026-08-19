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
    status: Literal["UNUSED", "USED", "EXPIRED"]

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
