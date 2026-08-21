import pytest
from fastapi.testclient import TestClient

from src.api.server import app
from src.domain.models import Coupon, validate_coupon_rule, validate_issue

client = TestClient(app)


# ---------- Domain 单元测试 (@unit) ----------

def test_validate_coupon_rule_percentage_boundary():
    with pytest.raises(ValueError, match="INVALID_DISCOUNT_RATE"):
        validate_coupon_rule("PERCENTAGE", 10, 0)
    with pytest.raises(ValueError, match="INVALID_DISCOUNT_RATE"):
        validate_coupon_rule("PERCENTAGE", 0, 0)
    # 合法边界通过
    validate_coupon_rule("PERCENTAGE", 9.9, 0)


def test_validate_coupon_rule_flat_exceeds_threshold():
    with pytest.raises(ValueError, match="COUPON_VALUE_EXCEEDS_THRESHOLD"):
        validate_coupon_rule("FLAT", 12000, 10000)
    with pytest.raises(ValueError, match="COUPON_VALUE_EXCEEDS_THRESHOLD"):
        validate_coupon_rule("FLAT", 10000, 10000)
    # 减免小于门槛通过；无门槛 (0) 不校验该规则
    validate_coupon_rule("FLAT", 5000, 10000)
    validate_coupon_rule("FLAT", 5000, 0)


def test_validate_issue_rules():
    template = Coupon(id="CPN-900", name="测试券", type="FLAT", value=2000,
                      minSpendCents=10000, status="ACTIVE", userId=None)
    # 非法用户 ID
    with pytest.raises(ValueError, match="INVALID_USER_ID"):
        validate_issue(template, "unknown123", [])
    # 非 ACTIVE 模板
    seed = Coupon(id="SEED1", name="种子券", type="FLAT", value=1000,
                  minSpendCents=5000, status="UNUSED", userId=None)
    with pytest.raises(ValueError, match="COUPON_NOT_ACTIVE"):
        validate_issue(seed, "user_1003", [])
    # 重复发放
    instance = Coupon(id="CPN-900-1", name="测试券", type="FLAT", value=2000,
                      minSpendCents=10000, status="UNUSED", userId="user_1003", templateId="CPN-900")
    with pytest.raises(ValueError, match="COUPON_ALREADY_ISSUED"):
        validate_issue(template, "user_1003", [instance])
    # 首次发放通过
    validate_issue(template, "user_1003", [])


# ---------- Admin API 测试 (@api) ----------

def test_admin_create_coupon_success():
    res = client.post("/api/admin/coupons", json={
        "name": "中秋特惠 8.5 折券", "type": "PERCENTAGE", "value": 8.5,
        "minSpendCents": 30000, "expiryDate": "2026-10-15"
    })
    assert res.status_code == 201
    coupon = res.json()
    assert coupon["status"] == "ACTIVE"
    assert coupon["userId"] is None

    res = client.get("/api/admin/coupons")
    created = [c for c in res.json() if c["id"] == coupon["id"]]
    assert len(created) == 1
    assert created[0]["issuedCount"] == 0


def test_admin_create_coupon_invalid_rate():
    res = client.post("/api/admin/coupons", json={
        "name": "非法券", "type": "PERCENTAGE", "value": 10, "minSpendCents": 0
    })
    assert res.status_code == 400
    assert res.json()["code"] == "INVALID_DISCOUNT_RATE"


def test_admin_create_coupon_value_exceeds_threshold():
    res = client.post("/api/admin/coupons", json={
        "name": "超额满减券", "type": "FLAT", "value": 12000, "minSpendCents": 10000
    })
    assert res.status_code == 400
    assert res.json()["code"] == "COUPON_VALUE_EXCEEDS_THRESHOLD"


def test_admin_issue_flow():
    # 创建 8 折无门槛券
    res = client.post("/api/admin/coupons", json={
        "name": "全员 8 折券", "type": "PERCENTAGE", "value": 8,
        "minSpendCents": 0, "expiryDate": "2026-11-30"
    })
    template = res.json()

    # 发放成功
    res = client.post(f"/api/admin/coupons/{template['id']}/issue", json={"userId": "user_1003"})
    assert res.status_code == 201
    body = res.json()
    instance = body["instance"]
    assert instance["status"] == "UNUSED"
    assert instance["userId"] == "user_1003"
    assert instance["templateId"] == template["id"]

    # issuedCount 聚合 +1
    coupons = client.get("/api/admin/coupons").json()
    assert [c for c in coupons if c["id"] == template["id"]][0]["issuedCount"] == 1

    # 重复发放拒绝 (409)
    res = client.post(f"/api/admin/coupons/{template['id']}/issue", json={"userId": "user_1003"})
    assert res.status_code == 409
    assert res.json()["code"] == "COUPON_ALREADY_ISSUED"

    # 非法 userId (400)
    res = client.post(f"/api/admin/coupons/{template['id']}/issue", json={"userId": "unknown123"})
    assert res.status_code == 400
    assert res.json()["code"] == "INVALID_USER_ID"

    # 发放记录回流 (最新在前)
    logs = client.get("/api/admin/issuances").json()
    assert logs[0]["couponId"] == template["id"]
    assert logs[0]["userId"] == "user_1003"
    assert logs[0]["time"]
    assert logs[0]["operator"]

    # C 端可见性: 实例仅持有人可见，ACTIVE 模板不在 C 端展示
    holder = client.get("/api/coupons", params={"userId": "user_1003"}).json()
    assert any(c["id"] == instance["id"] for c in holder)
    assert not any(c["id"] == template["id"] for c in holder)
    other = client.get("/api/coupons", params={"userId": "user_1004"}).json()
    assert not any(c["id"] == instance["id"] for c in other)

    # 最优推荐: 上架 100 元商品
    product = client.post("/api/products", json={
        "name": "推荐测试商品", "priceCents": 10000, "stock": 10
    }).json()

    # 他人下单: 不命中该实例 (FLAT10 与 PERCENT9 各减 1000, 按 ID 升序取 FLAT10)
    client.post("/api/cart/items", json={"userId": "user_1004", "productId": product["id"], "quantity": 1})
    other_order = client.post("/api/orders", json={"userId": "user_1004"}).json()
    assert other_order["couponId"] == "FLAT10"
    assert other_order["discountCents"] == 1000

    # 持有人下单: 命中 8 折实例 (减 2000)
    client.post("/api/cart/items", json={"userId": "user_1003", "productId": product["id"], "quantity": 1})
    holder_order = client.post("/api/orders", json={"userId": "user_1003"}).json()
    assert holder_order["couponId"] == instance["id"]
    assert holder_order["discountCents"] == 2000
    assert holder_order["actualPaidCents"] == 8000
