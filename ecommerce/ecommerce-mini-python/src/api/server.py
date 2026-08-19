from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from ..domain.models import Product, Order, Cart, Coupon
from ..repo.memory import MemoryRepo
from ..services.catalog import CatalogService
from ..services.cart import CartService
from ..services.order import OrderService
from ..services.coupon import CouponService

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DI Setup
product_repo = MemoryRepo[Product]()
cart_repo = MemoryRepo[Cart]()
order_repo = MemoryRepo[Order]()
coupon_repo = MemoryRepo[Coupon]()

catalog_svc = CatalogService(product_repo)
cart_svc = CartService(cart_repo, catalog_svc)
coupon_svc = CouponService(coupon_repo)
order_svc = OrderService(order_repo, cart_svc, catalog_svc, coupon_svc)

# 注入初始商品数据
initial_products = [
    { "id": "1", "name": "极简机械键盘", "priceCents": 29900, "stock": 99, "imageUrl": "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=800" },
    { "id": "2", "name": "无线办公鼠标", "priceCents": 8900, "stock": 99, "imageUrl": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=800" },
    { "id": "3", "name": "高清显示器", "priceCents": 129900, "stock": 99, "imageUrl": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800" },
    { "id": "4", "name": "桌面收纳架", "priceCents": 4500, "stock": 99, "imageUrl": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800" },
    { "id": "5", "name": "铝合金笔记本支架", "priceCents": 6800, "stock": 99, "imageUrl": "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&q=80&w=800" },
    { "id": "6", "name": "桌面拾音氛围灯", "priceCents": 12800, "stock": 99, "imageUrl": "https://images.unsplash.com/photo-1550745165-9bc0b252728f?auto=format&fit=crop&q=80&w=800" }
]
for p in initial_products:
    product_repo.save(p["id"], Product(**p))

# 注入初始优惠券数据
initial_coupons = [
    { "id": "FLAT10", "name": "满 50 减 10", "type": "FLAT", "value": 1000, "minSpendCents": 5000, "status": "UNUSED" },
    { "id": "PERCENT9", "name": "9 折数码券", "type": "PERCENTAGE", "value": 9, "minSpendCents": 10000, "status": "UNUSED" }
]
for c in initial_coupons:
    coupon_repo.save(c["id"], Coupon(**c))

# DTOs
class AddProductRequest(BaseModel):
    name: str
    priceCents: int
    stock: int

class AddToCartRequest(BaseModel):
    userId: str
    productId: str
    quantity: int

class CreateOrderRequest(BaseModel):
    userId: str
    couponId: Optional[str] = None

@app.get("/api/products", response_model=List[Product])
def list_products(name: Optional[str] = None, sort: Optional[str] = None):
    return catalog_svc.list_products(name, sort)

@app.get("/api/products/{id}", response_model=Product)
def get_product(id: str):
    product = catalog_svc.get_product(id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/api/products", status_code=201, response_model=Product)
def add_product(req: AddProductRequest):
    return catalog_svc.add_product(req.name, req.priceCents, req.stock)

@app.post("/api/cart/items", response_model=Cart)
def add_to_cart(req: AddToCartRequest):
    try:
        return cart_svc.add_to_cart(req.userId, req.productId, req.quantity)
    except ValueError as e:
        if str(e) == "PRODUCT_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Product not found")
        if str(e) == "MAX_QUANTITY_EXCEEDED":
            raise HTTPException(status_code=400, detail="Max quantity exceeded")
        raise e

@app.post("/api/orders", status_code=201, response_model=Order)
def create_order(req: CreateOrderRequest):
    try:
        return order_svc.create_order(req.userId, req.couponId)
    except ValueError as e:
        if str(e) == "CART_EMPTY":
            raise HTTPException(status_code=400, detail="Cart is empty")
        if str(e) == "OUT_OF_STOCK":
            raise HTTPException(status_code=409, detail="Out of stock")
        if str(e) == "COUPON_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Coupon not found")
        if str(e) == "COUPON_ALREADY_USED":
            raise HTTPException(status_code=400, detail="Coupon already used")
        if str(e) == "COUPON_THRESHOLD_NOT_MET":
            raise HTTPException(status_code=400, detail="Coupon threshold not met")
        raise e

@app.post("/api/checkout", status_code=200, response_model=Order)
def checkout(req: CreateOrderRequest):
    try:
        return order_svc.checkout(req.userId, req.couponId)
    except ValueError as e:
        if str(e) == "CART_EMPTY":
            raise HTTPException(status_code=400, detail="Cart is empty")
        if str(e) == "OUT_OF_STOCK":
            raise HTTPException(status_code=409, detail="Out of stock")
        if str(e) == "COUPON_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Coupon not found")
        if str(e) == "COUPON_ALREADY_USED":
            raise HTTPException(status_code=400, detail="Coupon already used")
        if str(e) == "COUPON_THRESHOLD_NOT_MET":
            raise HTTPException(status_code=400, detail="Coupon threshold not met")
        raise e

@app.get("/api/coupons", response_model=List[Coupon])
def list_coupons():
    return coupon_svc.list_coupons()
