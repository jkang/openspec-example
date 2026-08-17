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
    coupon_id: Optional[str] = Field(None, alias="couponId")
    items: List[OrderItem]

class Coupon(BaseModel):
    id: str
    name: str
    type: Literal["FIXED"]
    value_cents: int = Field(..., ge=0, alias="valueCents")
    threshold_cents: int = Field(..., ge=0, alias="thresholdCents")
    status: Literal["UNUSED", "USED"]
