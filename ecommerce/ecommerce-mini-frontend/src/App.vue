<template>
  <div class="h-screen flex flex-col overflow-hidden bg-white text-slate-900 font-sans">
    <!-- 顶部导航 -->
    <header class="h-16 flex-shrink-0 border-b border-slate-200 flex items-center justify-between px-8 bg-white z-10">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-slate-900 flex items-center justify-center text-white text-xs font-bold">M</div>
        <h1 class="text-lg font-semibold tracking-tight uppercase">Minimal Store</h1>
      </div>
      
      <div class="flex-1 max-w-md mx-8 relative">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜索商品..." 
          class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-none focus:outline-none focus:border-slate-400 transition-colors text-sm"
        >
      </div>

      <div class="flex items-center gap-6 text-sm font-medium">
        <button @click="isCartOpen = !isCartOpen" class="relative py-1 px-2 border border-slate-200 hover:bg-slate-50">
          BAG
          <span v-if="cartTotalItems > 0" class="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 text-white text-[10px] flex items-center justify-center">
            {{ cartTotalItems }}
          </span>
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="flex-1 flex overflow-hidden">
      <!-- 左侧商品网格 -->
      <section class="flex-1 overflow-y-auto p-8 bg-slate-50 scrollbar-hide">
        <div v-if="filteredProducts.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
          <p class="text-sm uppercase tracking-widest font-bold">No Results Found</p>
          <p class="text-xs">未找到相关商品</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="product in filteredProducts" 
            :key="product.id"
            class="bg-white border border-slate-200 group transition-colors hover:border-slate-400 flex flex-col"
          >
            <div class="aspect-[4/3] overflow-hidden bg-slate-100 border-b border-slate-200 relative">
              <img 
                :src="product.imageUrl" 
                :alt="product.name"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                @error="handleImageError"
                loading="lazy"
              >
            </div>
            <div class="p-5 flex flex-col gap-4 flex-1">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0 pr-2">
                  <h3 class="font-medium text-slate-900 truncate">{{ product.name }}</h3>
                  <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ product.description }}</p>
                </div>
                <span class="font-semibold text-sm whitespace-nowrap">¥{{ (product.priceCents / 100).toFixed(2) }}</span>
              </div>
              <button 
                @click="addToCart(product)"
                class="mt-auto w-full py-2 bg-slate-900 text-white text-xs font-bold tracking-widest uppercase hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                ADD TO CART
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 右侧购物车侧边栏 -->
      <aside 
        :class="['w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col transition-all duration-300 transform', isCartOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full shadow-2xl z-20 md:relative md:translate-x-0 md:shadow-none']"
      >
        <div class="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 class="font-semibold tracking-tight uppercase text-xs">Cart ({{ cartTotalItems }})</h2>
          <button @click="isCartOpen = false" class="md:hidden text-xs font-bold text-slate-400">CLOSE</button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">
          <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <p class="text-[10px] uppercase tracking-widest">Empty</p>
          </div>
          <div v-for="item in cart" :key="item.id" class="flex gap-4">
            <div class="w-16 h-16 flex-shrink-0 border border-slate-200 bg-slate-50 overflow-hidden">
              <img :src="item.imageUrl" class="w-full h-full object-cover" @error="handleImageError">
            </div>
            <div class="flex-1 flex flex-col justify-between py-1">
              <div class="flex justify-between">
                <h4 class="text-xs font-medium truncate pr-2">{{ item.name }}</h4>
                <button @click="removeFromCart(item.id)" class="text-[10px] text-slate-300 hover:text-red-500 font-bold uppercase">Del</button>
              </div>
              <div class="flex justify-between items-end">
                <span class="text-xs font-semibold">¥{{ (item.priceCents * item.quantity / 100).toFixed(2) }}</span>
                <div class="flex items-center border border-slate-200 bg-white">
                  <button @click="removeFromCart(item.id)" class="w-6 h-6 flex items-center justify-center text-xs hover:bg-slate-50 border-r border-slate-200">-</button>
                  <span class="w-8 text-[10px] text-center font-medium">{{ item.quantity }}</span>
                  <button @click="addToCart(item)" class="w-6 h-6 flex items-center justify-center text-xs hover:bg-slate-50 border-l border-slate-200">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-6 border-t border-slate-200 space-y-6 bg-slate-50/50">
          <!-- 优惠券选择章节 -->
          <div class="space-y-3">
            <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-400">选择优惠券</h3>
            <div class="space-y-2">
              <button 
                v-for="coupon in coupons" 
                :key="coupon.id"
                @click="toggleCoupon(coupon.id)"
                :disabled="isCouponDisabled(coupon)"
                :class="[
                  'w-full text-left p-3 border transition-all duration-200 flex flex-col gap-1',
                  selectedCouponId === coupon.id 
                    ? 'border-slate-900 bg-slate-900 text-white' 
                    : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400',
                  isCouponDisabled(coupon) ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'
                ]"
              >
                <div class="flex justify-between items-center w-full">
                  <span class="text-xs font-bold uppercase tracking-tight">{{ coupon.name }}</span>
                  <span v-if="coupon.status === 'USED'" class="text-[8px] uppercase tracking-tighter opacity-70">已使用</span>
                  <span v-else-if="isCouponDisabled(coupon)" class="text-[8px] uppercase tracking-tighter opacity-70">差 ¥{{ ((coupon.thresholdCents - cartTotalPrice) / 100).toFixed(2) }} 可用</span>
                </div>
                <p :class="['text-[10px]', selectedCouponId === coupon.id ? 'text-slate-300' : 'text-slate-500']">{{ coupon.description }}</p>
              </button>
            </div>
          </div>

          <div class="space-y-2 pt-4 border-t border-slate-200">
            <div class="flex justify-between text-xs text-slate-500">
              <span>商品总额</span>
              <span>¥{{ (cartTotalPrice / 100).toFixed(2) }}</span>
            </div>
            <div v-if="couponDiscount > 0" class="flex justify-between text-xs text-red-500 font-medium">
              <span>优惠减免</span>
              <span>-¥{{ (couponDiscount / 100).toFixed(2) }}</span>
            </div>
            <div class="flex justify-between items-end pt-2 border-t border-slate-200">
              <span class="text-xs text-slate-900 font-bold uppercase tracking-widest">最终总额</span>
              <span class="font-bold text-xl">¥{{ (finalTotalPrice / 100).toFixed(2) }}</span>
            </div>
          </div>
          <button 
            @click="checkout"
            :disabled="isProcessing || cart.length === 0"
            class="w-full py-4 bg-slate-900 text-white text-xs font-bold tracking-[0.3em] uppercase hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
          >
            {{ isProcessing ? 'Processing...' : 'Complete Checkout' }}
          </button>
        </div>
      </aside>
    </main>

    <!-- 成功通知模态框 -->
    <div v-if="isCheckoutSuccess" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
      <div class="w-full max-w-xs bg-white border border-slate-200 p-8 space-y-6 text-center">
        <!-- 成功文字标识 -->
        <div class="flex justify-center">
          <div class="text-2xl font-black tracking-tighter text-slate-900 border-4 border-slate-900 px-2 py-1">SUCCESS</div>
        </div>

        <!-- 文字信息 -->
        <div class="space-y-2">
          <h2 class="text-lg font-bold text-slate-900">订单提交成功</h2>
          <p class="text-sm text-slate-500">感谢您的购买，我们将尽快为您发货。</p>
        </div>

        <!-- 订单号 -->
        <div class="py-2 px-3 bg-slate-50 border border-slate-200 border-dashed space-y-2">
          <div class="flex justify-between items-center">
            <p class="text-[10px] text-slate-400 uppercase tracking-wider">订单编号</p>
            <p class="text-sm font-mono font-bold text-slate-900">#{{ lastOrderId }}</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <button 
          @click="resetCheckoutState"
          class="w-full py-2 px-4 border border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
        >
          继续购物
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 状态管理
const products = ref([])
const cart = ref([])
const searchQuery = ref('')
const isCartOpen = ref(true)
const isProcessing = ref(false)
const isCheckoutSuccess = ref(false)
const lastOrderId = ref('')

// 优惠券数据
const coupons = ref([])
const selectedCouponId = ref(null)

// 图片加载失败处理
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&q=80&w=400'
const handleImageError = (e) => {
  e.target.src = PLACEHOLDER_IMAGE
}

// 获取商品列表
const fetchProducts = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/products')
    if (response.ok) {
      products.value = await response.json()
    }
  } catch (e) {
    console.error('获取商品列表失败:', e)
    // 降级使用初始数据（开发环境）
    products.value = [
      { id: '1', name: '极简机械键盘', description: '84键紧凑布局，红轴', priceCents: 29900, stock: 99, imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=800' },
      { id: '2', name: '无线办公鼠标', description: '静音按键，人体工学设计', priceCents: 8900, stock: 99, imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=800' },
      { id: '3', name: '高清显示器', description: '27英寸 4K分辨率', priceCents: 129900, stock: 99, imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800' },
      { id: '4', name: '桌面收纳架', description: '实木材质，双层结构', priceCents: 4500, stock: 99, imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800' },
      { id: '5', name: '铝合金笔记本支架', description: '折叠便携，多档调节', priceCents: 6800, stock: 99, imageUrl: 'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&q=80&w=800' },
      { id: '6', name: '桌面拾音氛围灯', description: 'RGB色彩，支持音频同步', priceCents: 12800, stock: 99, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252728f?auto=format&fit=crop&q=80&w=800' }
    ]
  }
}

// 获取优惠券列表
const fetchCoupons = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/coupons')
    if (response.ok) {
      coupons.value = await response.json()
    }
  } catch (e) {
    console.error('获取优惠券失败:', e)
    // 降级使用初始数据
    coupons.value = [
      { id: 'FLAT10', name: '满 50 减 10', type: 'FIXED', valueCents: 1000, thresholdCents: 5000, description: '满 ¥50.00 可用' },
      { id: 'FLAT20', name: '满 100 减 20', type: 'FIXED', valueCents: 2000, thresholdCents: 10000, description: '满 ¥100.00 可用' }
    ]
  }
}

// 搜索过滤逻辑
const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) return products.value
  const query = searchQuery.value.toLowerCase().trim()
  return products.value.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.description.toLowerCase().includes(query)
  )
})

// 购物车逻辑
const cartTotalItems = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
const cartTotalPrice = computed(() => cart.value.reduce((total, item) => total + item.priceCents * item.quantity, 0))

// 优惠券计算逻辑
const selectedCoupon = computed(() => coupons.value.find(c => c.id === selectedCouponId.value))

const couponDiscount = computed(() => {
  if (!selectedCoupon.value) return 0
  
  // 校验门槛
  if (cartTotalPrice.value < selectedCoupon.value.thresholdCents) return 0
  
  return selectedCoupon.value.valueCents
})

const finalTotalPrice = computed(() => Math.max(0, cartTotalPrice.value - couponDiscount.value))

// 优惠券可用性检查
const isCouponDisabled = (coupon) => {
  return cartTotalPrice.value < coupon.thresholdCents || coupon.status === 'USED'
}

// 选择优惠券
const toggleCoupon = (couponId) => {
  if (selectedCouponId.value === couponId) {
    selectedCouponId.value = null
  } else {
    const coupon = coupons.value.find(c => c.id === couponId)
    if (!isCouponDisabled(coupon)) {
      selectedCouponId.value = couponId
    }
  }
}

const addToCart = async (product) => {
  try {
    const response = await fetch('http://localhost:8000/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: 'user_dev',
        productId: String(product.id), 
        quantity: 1 
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || err.message || '同步失败')
    }

    const existingItem = cart.value.find(item => item.id === product.id)
    if (existingItem) {
      existingItem.quantity++
    } else {
      cart.value.push({ ...product, quantity: 1 })
    }
    isCartOpen.value = true
  } catch (e) {
    console.error('加入购物车失败:', e)
    // 离线模式处理
    const existingItem = cart.value.find(item => item.id === product.id)
    if (existingItem) {
      existingItem.quantity++
    } else {
      cart.value.push({ ...product, quantity: 1 })
    }
  }
}

const removeFromCart = (productId) => {
  const index = cart.value.findIndex(item => item.id === productId)
  if (index !== -1) {
    if (cart.value[index].quantity > 1) {
      cart.value[index].quantity--
    } else {
      cart.value.splice(index, 1)
    }
  }
}

const checkout = async () => {
  if (cart.value.length === 0) return
  isProcessing.value = true
  try {
    const response = await fetch('http://localhost:8000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: 'user_dev',
        couponId: selectedCouponId.value 
      })
    })

    if (response.ok) {
      const order = await response.json()
      lastOrderId.value = order.id
      isCheckoutSuccess.value = true
      cart.value = []
    } else {
      const error = await response.json()
      alert(`结算失败: ${error.detail || error.message || '未知错误'}`)
    }
  } catch (e) {
    alert(`网络错误: ${e.message}`)
  } finally {
    isProcessing.value = false
  }
}

const resetCheckoutState = () => {
  isCheckoutSuccess.value = false
  lastOrderId.value = ''
}

onMounted(() => {
  fetchProducts()
  fetchCoupons()
})
</script>

<style>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
