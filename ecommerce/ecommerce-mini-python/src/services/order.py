import uuid
from ..domain.models import Order, OrderItem
from ..repo.memory import MemoryRepo
from .cart import CartService
from .catalog import CatalogService
from .coupon import CouponService

class OrderService:
    def __init__(self, repo: MemoryRepo[Order], cart_svc: CartService, catalog_svc: CatalogService, coupon_svc: CouponService):
        self.repo = repo
        self.cart_svc = cart_svc
        self.catalog = catalog_svc
        self.coupon_svc = coupon_svc

    def create_order(self, user_id: str, coupon_id: str = None) -> Order:
        # 1. Get Cart
        cart = self.cart_svc.get_cart(user_id)
        if not cart.items:
            raise ValueError("CART_EMPTY")

        order_items = []
        subtotal_cents = 0

        # 2. Validate and Calculate Subtotal
        for item in cart.items:
            product = self.catalog.get_product(item.product_id)
            if not product:
                raise ValueError(f"Product {item.product_id} not found")
            if product.stock < item.quantity:
                raise ValueError("OUT_OF_STOCK")
            
            subtotal_cents += product.price_cents * item.quantity
            order_items.append(OrderItem(
                productId=item.product_id,
                priceCents=product.price_cents,
                quantity=item.quantity
            ))

        # 3. Coupon Validation & Calculation
        discount_cents = 0
        if coupon_id:
            coupon = self.coupon_svc.validate(coupon_id, subtotal_cents)
            discount_cents = coupon.value_cents

        total_cents = max(0, subtotal_cents - discount_cents)

        # 4. Deduct Stock
        for item in cart.items:
            product = self.catalog.get_product(item.product_id)
            product.stock -= item.quantity
            self.catalog.repo.save(product.id, product)

        # 5. Create Order
        order = Order(
            id=f"order_{uuid.uuid4().hex[:8]}",
            status="PENDING_PAYMENT",
            totalCents=total_cents,
            discountCents=discount_cents,
            couponId=coupon_id,
            items=order_items
        )
        self.repo.save(order.id, order)

        # 6. Redeem Coupon
        if coupon_id:
            self.coupon_svc.redeem(coupon_id)

        # 7. Clear Cart
        self.cart_svc.clear_cart(user_id)

        return order

    def checkout(self, user_id: str, coupon_id: str = None) -> Order:
        return self.create_order(user_id, coupon_id)
