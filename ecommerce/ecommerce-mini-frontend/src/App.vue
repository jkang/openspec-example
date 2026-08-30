<template>
  <div class="h-screen flex flex-col overflow-hidden bg-white text-slate-900 font-sans">
    <!-- 顶部导航 -->
    <header class="h-16 flex-shrink-0 border-b border-slate-200 flex items-center justify-between px-8 bg-white z-10">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-slate-900 flex items-center justify-center text-white text-xs font-bold">M</div>
        <h1 class="text-lg font-semibold tracking-tight uppercase">Minimal Store</h1>
      </div>
      
      <div v-if="viewMode === 'store'" class="flex-1 max-w-md mx-8 relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索商品..."
          class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-none focus:outline-none focus:border-slate-400 transition-colors text-sm"
        >
      </div>
      <div v-else-if="viewMode === 'orders'" class="flex-1 mx-8 text-sm text-slate-500">
        当前路径: <span class="text-slate-900 font-medium">我的订单</span>
      </div>
      <div v-else-if="viewMode === 'register' || viewMode === 'login'" class="flex-1 mx-8 text-sm text-slate-500">
        当前路径: <span class="text-slate-900 font-medium">{{ viewMode === 'register' ? '账户 / 注册' : '账户 / 登录' }}</span>
      </div>
      <div v-else class="flex-1 mx-8 text-sm text-slate-500">
        当前路径: <span class="text-slate-900 font-medium">{{ { dashboard: '经营分析 / 销售看板', order: '交易管理 / 订单列表', product: '交易管理 / 商品管理', category: '交易管理 / 分类管理', coupon: '营销中心 / 优惠券管理', user: '账户中心 / 用户管理' }[adminTab] }}</span>
      </div>

      <div class="flex items-center gap-6 text-sm font-medium">
        <!-- 视图模式切换 -->
        <div class="flex items-center border border-slate-200 text-xs font-bold">
          <button
            @click="switchViewMode('store')"
            :class="['px-3 py-1 transition-colors', viewMode === 'store' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50']"
          >店铺</button>
          <button
            @click="switchViewMode('admin')"
            :class="['px-3 py-1 border-l border-slate-200 transition-colors', viewMode === 'admin' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50']"
          >运营后台</button>
        </div>
        <button v-if="viewMode === 'store' || viewMode === 'orders' || (viewMode === 'login' && sessionToken && loginSuccess)" @click="goToOrders"
                :class="['py-1 px-2 border transition-colors', viewMode === 'orders' ? 'border-slate-900 text-slate-900' : 'border-slate-200 hover:bg-slate-50']">
          我的订单
        </button>
        <button v-if="viewMode === 'store' && !sessionToken" @click="switchToRegister" class="py-1 px-2 border border-slate-200 hover:bg-slate-50">
          注册 / 登录
        </button>
        <span v-if="sessionToken && currentUser && viewMode !== 'admin'" class="text-sm text-slate-600">
          {{ currentUser.nickname }}
        </span>
        <button v-if="sessionToken && currentUser && viewMode !== 'admin'" @click="logoutSession" class="py-1 px-2 border border-slate-900 bg-slate-900 text-white hover:bg-slate-700">
          退出登录
        </button>
        <button v-if="viewMode === 'store'" @click="isCartOpen = !isCartOpen" class="relative py-1 px-2 border border-slate-200 hover:bg-slate-50">
          购物车
          <span v-if="cartTotalItems > 0" class="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 text-white text-[10px] flex items-center justify-center">
            {{ cartTotalItems }}
          </span>
        </button>
        <span v-if="viewMode === 'admin'" class="text-sm text-slate-500 font-normal">{{ currentUser?.role === '老板' ? '老板' : '运营专员' }}: {{ currentUser?.nickname || '王琳' }}</span>
      </div>
    </header>

    <!-- 主内容区 (C 端店铺) -->
    <main v-if="viewMode === 'store'" class="flex-1 flex overflow-hidden">
      <!-- 左侧商品网格 -->
      <section class="flex-1 overflow-y-auto p-8 bg-slate-50 scrollbar-hide">
        <!-- 分类筛选条 -->
        <div class="flex items-center gap-2 flex-wrap mb-6">
          <button @click="selectedCategory = null"
                  :class="['px-4 py-2 border text-xs font-medium transition-colors', selectedCategory === null ? 'bg-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50']">全部</button>
          <button v-for="c in activeCategories" :key="c.id" @click="selectedCategory = c.id"
                  :class="['px-4 py-2 border text-xs font-medium transition-colors', selectedCategory === c.id ? 'bg-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50']">{{ c.name }}</button>
        </div>
        <div v-if="filteredProducts.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
          <p class="text-sm">未找到相关商品</p>
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
                加入购物车
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 右侧购物车侧边栏 -->
      <aside 
        :class="['w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col transition-all duration-300 transform', isCartOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full z-20 md:relative md:translate-x-0']"
      >
        <div class="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 class="font-semibold tracking-tight uppercase text-xs">购物车 ({{ cartTotalItems }})</h2>
          <button @click="isCartOpen = false" class="md:hidden text-xs font-bold text-slate-400">关闭</button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">
          <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <p class="text-[10px]">购物车为空</p>
          </div>
          <div v-for="item in cart" :key="item.id" class="flex gap-4">
            <div class="w-16 h-16 flex-shrink-0 border border-slate-200 bg-slate-50 overflow-hidden">
              <img :src="item.imageUrl" class="w-full h-full object-cover" @error="handleImageError">
            </div>
            <div class="flex-1 flex flex-col justify-between py-1">
              <div class="flex justify-between">
                <h4 class="text-xs font-medium truncate pr-2">{{ item.name }}</h4>
                <button @click="removeFromCart(item.productId)" class="text-[10px] text-slate-300 hover:text-red-500 font-bold">删除</button>
              </div>
              <div class="flex justify-between items-end">
                <span class="text-xs font-semibold">¥{{ (item.priceCents * item.quantity / 100).toFixed(2) }}</span>
                <div class="flex items-center border border-slate-200 bg-white">
                  <button @click="decreaseQuantity(item)" class="w-6 h-6 flex items-center justify-center text-xs hover:bg-slate-50 border-r border-slate-200">-</button>
                  <span class="w-8 text-[10px] text-center font-medium">{{ item.quantity }}</span>
                  <button @click="addToCart(item, 1)" class="w-6 h-6 flex items-center justify-center text-xs hover:bg-slate-50 border-l border-slate-200">+</button>
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
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold uppercase tracking-tight">{{ coupon.name }}</span>
                    <span v-if="coupon.id === bestCouponId" class="px-1 py-0.5 bg-slate-100 text-slate-900 text-[8px] font-bold uppercase tracking-tighter border border-slate-900">最优方案</span>
                  </div>
                  <span v-if="coupon.status === 'USED'" class="text-[8px] uppercase tracking-tighter opacity-70">已使用</span>
                  <span v-else-if="isCouponDisabled(coupon)" class="text-[8px] uppercase tracking-tighter opacity-70">差 ¥{{ ((coupon.minSpendCents - cartTotalPrice) / 100).toFixed(2) }} 可用</span>
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
            {{ isProcessing ? '处理中...' : '确认结算' }}
          </button>
        </div>
      </aside>
    </main>

    <!-- 主内容区 (C 端注册) -->
    <main v-else-if="viewMode === 'register'" class="flex-1 overflow-y-auto p-8 bg-slate-50 scrollbar-hide">
      <div class="max-w-2xl mx-auto space-y-6">
        <header class="border border-slate-200 bg-white p-6 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold mb-2">注册新账户</h2>
            <p class="text-sm text-slate-600">手机号 + 密码即可完成注册，注册成功将自动登录</p>
          </div>
          <div class="text-sm text-slate-600">
            已有账户？<span class="text-slate-900 underline underline-offset-4 cursor-pointer" @click="switchToLogin()">直接登录</span>
          </div>
        </header>

        <section class="border border-slate-200 bg-white p-6">
          <div class="max-w-xl mx-auto">
            <div v-if="registerSuccess" class="border border-slate-200 bg-slate-50 p-4 mb-6 text-sm">
              <p class="font-semibold mb-1">注册成功，已自动登录</p>
              <p class="text-slate-600">欢迎回来，{{ currentUser?.nickname }}。你可以继续结算购物车，或前往「我的订单」。</p>
              <div class="mt-4 flex gap-3">
                <button @click="switchViewMode('orders')" class="border border-slate-900 bg-slate-900 text-white px-4 py-2 text-sm">查看我的订单</button>
                <button @click="switchViewMode('store')" class="border border-slate-200 px-4 py-2 text-sm text-slate-600">返回店铺</button>
              </div>
            </div>

            <form v-else @submit.prevent="submitRegister" class="space-y-5">
              <div>
                <label class="block text-sm font-medium mb-2">手机号</label>
                <input v-model.trim="registerForm.phone" type="tel" maxlength="11" placeholder="请输入 11 位手机号，例如 13888217536"
                  class="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-900" />
                <p v-if="registerErrors.phone" class="text-sm text-red-600 mt-1">{{ registerErrors.phone }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">昵称</label>
                <input v-model.trim="registerForm.nickname" type="text" maxlength="20" placeholder="例如：林晓明（不填则使用默认昵称）"
                  class="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-900" />
                <p v-if="registerErrors.nickname" class="text-sm text-red-600 mt-1">{{ registerErrors.nickname }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">密码</label>
                <input v-model="registerForm.password" :type="showPassword ? 'text' : 'password'" maxlength="32" placeholder="设置密码，至少 6 位"
                  class="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-900" />
                <div class="mt-1 flex items-center justify-between">
                  <p v-if="registerErrors.password" class="text-sm text-red-600">{{ registerErrors.password }}</p>
                  <label class="text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" v-model="showPassword" class="mr-1" /> 显示密码
                  </label>
                </div>
              </div>

              <div v-if="registerServerError" class="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {{ registerServerError }}
                <span v-if="registerServerError.includes('已注册')" class="underline underline-offset-4 cursor-pointer ml-1" @click="switchToLogin()">去登录</span>
              </div>

              <button type="submit"
                class="w-full border border-slate-900 bg-slate-900 text-white py-2 text-sm hover:bg-slate-700">
                注册并登录
              </button>

              <p class="text-xs text-slate-500">注册即表示同意平台服务条款与隐私政策。手机号将作为登录凭证，请妥善保管。</p>
            </form>
          </div>
        </section>

        <footer class="border border-slate-200 bg-white p-6">
          <h3 class="text-sm font-semibold mb-3">已注册用户示例</h3>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left text-slate-600">
                <th class="py-2 pr-4 font-medium">手机号</th>
                <th class="py-2 pr-4 font-medium">昵称</th>
                <th class="py-2 pr-4 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-slate-200">
                <td class="py-2 pr-4">13912345678</td>
                <td class="py-2 pr-4">陈晓芸</td>
                <td class="py-2"><span class="text-slate-600">正常</span></td>
              </tr>
            </tbody>
          </table>
        </footer>
      </div>
    </main>

    <!-- 主内容区 (C 端登录) -->
    <main v-else-if="viewMode === 'login'" class="flex-1 overflow-y-auto p-8 bg-slate-50 scrollbar-hide">
      <div class="max-w-2xl mx-auto space-y-6">
        <header class="border border-slate-200 bg-white p-6 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold mb-2">登录</h2>
            <p class="text-sm text-slate-600">登录后可下单、查看「我的订单」，购物车将跟随你的账户</p>
          </div>
          <div class="text-sm text-slate-600">
            还没有账户？<span class="text-slate-900 underline underline-offset-4 cursor-pointer" @click="switchToRegister()">立即注册</span>
          </div>
        </header>

        <section class="border border-slate-200 bg-white p-6">
          <div class="max-w-xl mx-auto">
            <div v-if="loginSuccess" class="border border-slate-200 bg-slate-50 p-4 mb-6 text-sm">
              <p class="font-semibold mb-1">登录成功，{{ currentUser?.nickname }}</p>
              <p class="text-slate-600">会话已创建并保持，刷新页面不会退出登录。购物车将跟随你的账户。</p>
              <div class="mt-4 flex gap-3">
                <button @click="goToOrders" class="border border-slate-900 bg-slate-900 text-white px-4 py-2 text-sm">查看我的订单</button>
                <button @click="switchViewMode('store')" class="border border-slate-200 px-4 py-2 text-sm text-slate-600">返回店铺</button>
              </div>
            </div>

            <form v-else @submit.prevent="submitLogin" class="space-y-5">
              <div>
                <label class="block text-sm font-medium mb-2">手机号</label>
                <input v-model.trim="loginForm.phone" type="tel" maxlength="11" placeholder="请输入注册手机号，例如 13888217536"
                  class="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-900" />
                <p v-if="loginErrors.phone" class="text-sm text-red-600 mt-1">{{ loginErrors.phone }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">密码</label>
                <input v-model="loginForm.password" :type="loginShowPassword ? 'text' : 'password'" maxlength="32" placeholder="请输入密码"
                  class="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-900" />
                <div class="mt-1 flex items-center justify-between">
                  <p class="text-sm text-slate-500">忘记密码请联系平台客服（本阶段暂不提供自助找回）</p>
                  <label class="text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" v-model="loginShowPassword" class="mr-1" /> 显示密码
                  </label>
                </div>
              </div>

              <div v-if="loginServerError" class="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {{ loginServerError }}
              </div>

              <button type="submit"
                class="w-full border border-slate-900 bg-slate-900 text-white py-2 text-sm hover:bg-slate-700">
                登录
              </button>

              <p class="text-xs text-slate-500">登录即创建持久会话，你可以在任意设备查看自己的订单。</p>
            </form>
          </div>
        </section>

        <footer class="border border-slate-200 bg-white p-6">
          <h3 class="text-sm font-semibold mb-3">为什么需要登录？</h3>
          <ul class="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>订单将归属于你的账户，「我的订单」只展示你自己的订单。</li>
            <li>购物车跟随账户，换设备不丢失。</li>
            <li>未登录时无法下单与查看订单，系统会引导你先登录。</li>
          </ul>
        </footer>
      </div>
    </main>

    <!-- 主内容区 (C 端我的订单) -->
    <main v-else-if="viewMode === 'orders'" class="flex-1 overflow-y-auto p-8 bg-slate-50 scrollbar-hide">      <div class="max-w-3xl mx-auto space-y-6">
        <h2 class="text-xl font-bold tracking-tight border-b-2 border-slate-900 pb-4">我的订单</h2>

        <section v-for="o in myOrders" :key="o.id" class="bg-white border border-slate-200">
          <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div class="font-mono text-sm text-slate-500">#{{ o.id }}</div>
              <div class="text-xs text-slate-400 mt-1">{{ formatOrderTime(o.createdAt) }}</div>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-xs font-bold border border-slate-200 px-2 py-1">{{ orderStatusLabel(o.status) }}</span>
              <button @click="toggleMyOrder(o)" class="border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50 transition-colors">{{ expandedMyOrderId === o.id ? '收起' : '查看详情' }}</button>
            </div>
          </div>
          <div class="px-6 py-3 flex items-center justify-between text-sm">
            <span class="text-slate-700">{{ o.items[0].name }}<template v-if="o.items.length > 1"> 等 {{ o.items.reduce((n, i) => n + i.quantity, 0) }} 件</template></span>
            <span class="font-mono font-bold">¥{{ (o.actualPaidCents / 100).toFixed(2) }}</span>
          </div>

          <div v-if="expandedMyOrderId === o.id" class="border-t border-slate-200 px-6 py-4 space-y-3">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-slate-500">商品总额:</span> <span class="font-mono">¥{{ (o.totalCents / 100).toFixed(2) }}</span></div>
              <div><span class="text-slate-500">优惠券:</span> <span class="font-mono">{{ o.couponId || '无' }}</span></div>
              <div><span class="text-slate-500">折扣:</span> <span class="font-mono">-¥{{ (o.discountCents / 100).toFixed(2) }}</span></div>
              <div><span class="text-slate-500">实付:</span> <span class="font-mono font-bold">¥{{ (o.actualPaidCents / 100).toFixed(2) }}</span></div>
            </div>
            <div class="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
              <span v-for="(s, i) in ['待支付', '已支付', '已发货', '已完成']" :key="i"
                    :class="['px-2 py-1 border', orderStep(o.status) >= i ? 'border-slate-900 text-slate-900 font-bold' : 'border-slate-200']">{{ s }}</span>
              <span v-if="o.status === 'CANCELLED'" class="ml-2 px-2 py-1 border border-slate-900 text-slate-900 font-bold">已取消</span>
            </div>
            <div class="flex flex-col gap-1 mt-2 text-sm">
              <div v-for="it in o.items" :key="it.productId" class="flex justify-between text-slate-600">
                <span>{{ it.name }} × {{ it.quantity }}</span>
                <span class="font-mono">¥{{ (it.priceCents * it.quantity / 100).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </section>

        <div v-if="myOrders.length === 0" class="border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">暂无订单</div>
      </div>
    </main>

    <!-- 主内容区 (B 端运营后台) -->
    <main v-else class="flex-1 flex overflow-hidden">
      <!-- 左侧导航 -->
      <aside class="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <nav class="flex-1 py-4">
          <div v-if="isDashboardRole" class="px-6 py-2 text-sm font-medium text-slate-500 uppercase tracking-wider">经营分析</div>
          <a v-if="isDashboardRole" @click="adminTab = 'dashboard'"
             :class="['flex items-center px-6 py-3 border-l-4 cursor-pointer transition-colors', adminTab === 'dashboard' ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50']">销售看板</a>
          <div class="mt-8 px-6 py-2 text-sm font-medium text-slate-500 uppercase tracking-wider">交易管理</div>
          <a @click="adminTab = 'order'"
             :class="['flex items-center px-6 py-3 border-l-4 cursor-pointer transition-colors', adminTab === 'order' ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50']">订单列表</a>
          <a @click="adminTab = 'product'"
             :class="['flex items-center px-6 py-3 border-l-4 cursor-pointer transition-colors', adminTab === 'product' ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50']">商品管理</a>
          <a @click="adminTab = 'category'"
             :class="['flex items-center px-6 py-3 border-l-4 cursor-pointer transition-colors', adminTab === 'category' ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50']">分类管理</a>
          <div class="mt-8 px-6 py-2 text-sm font-medium text-slate-500 uppercase tracking-wider">营销中心</div>
          <a @click="adminTab = 'coupon'"
             :class="['flex items-center px-6 py-3 border-l-4 cursor-pointer transition-colors', adminTab === 'coupon' ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50']">优惠券管理</a>
          <div class="mt-8 px-6 py-2 text-sm font-medium text-slate-500 uppercase tracking-wider">账户中心</div>
          <a v-if="isOperator" @click="adminTab = 'user'"
             :class="['flex items-center px-6 py-3 border-l-4 cursor-pointer transition-colors', adminTab === 'user' ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50']">用户管理</a>
        </nav>
      </aside>

      <!-- 右侧内容区 -->
      <div class="flex-1 overflow-y-auto p-8 bg-slate-50">
        <div class="max-w-5xl mx-auto space-y-8">

          <!-- ===== 销售看板 tab（sales-dashboard / data-insights BC，运营/老板角色，R-DASH-006） ===== -->
          <div v-if="adminTab === 'dashboard'">

            <!-- 无权限兜底：非运营/老板越权进入 -->
            <section v-if="!isDashboardRole" class="bg-white border border-slate-200 p-8">
              <h2 class="text-lg font-bold mb-4 border-b border-slate-200 pb-4">销售看板</h2>
              <p class="text-sm text-slate-700">无权限访问销售看板：本入口仅「运营」与「老板」角色可见。销售数据属经营敏感信息。</p>
            </section>

            <template v-else>
              <!-- 标题 + 时间切换（今日/近7日/近30日，默认近7日 R-DASH-008） -->
              <section class="bg-white border border-slate-200 p-8">
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h2 class="text-lg font-bold">销售看板</h2>
                    <p class="text-sm text-slate-500 mt-1">销售额为实付金额（actualPaidCents），优惠让利单列，不含已取消订单</p>
                  </div>
                  <div class="flex border border-slate-200 text-sm">
                    <button v-for="r in dashboardRanges" :key="r.key" @click="switchDashboardRange(r.key)"
                            :class="['px-4 py-2 transition-colors', dashboardRange === r.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100']">
                      {{ r.label }}
                    </button>
                  </div>
                </div>

                <div v-if="dashboardError" class="border border-slate-900 bg-slate-50 px-4 py-3 text-sm text-slate-900 mb-6">{{ dashboardError }}</div>

                <!-- 4 指标卡（R-DASH-001~004） -->
                <div class="grid grid-cols-4 gap-4">
                  <div class="bg-white border border-slate-200 p-5">
                    <div class="text-sm text-slate-500">销售额</div>
                    <div class="text-2xl font-semibold mt-2">{{ formatMoney(dashboardMetrics.sales) }}</div>
                  </div>
                  <div class="bg-white border border-slate-200 p-5">
                    <div class="text-sm text-slate-500">订单量</div>
                    <div class="text-2xl font-semibold mt-2">{{ dashboardMetrics.orders }} 单</div>
                  </div>
                  <div class="bg-white border border-slate-200 p-5">
                    <div class="text-sm text-slate-500">客单价</div>
                    <div class="text-2xl font-semibold mt-2">{{ formatMoney(dashboardMetrics.avgOrder) }}</div>
                  </div>
                  <div class="bg-white border border-slate-200 p-5">
                    <div class="text-sm text-slate-500">优惠让利</div>
                    <div class="text-2xl font-semibold mt-2">{{ formatMoney(dashboardMetrics.discount) }}</div>
                  </div>
                </div>
              </section>

              <!-- 销售趋势（CSS/SVG 手写折线，零第三方图表库） -->
              <section class="bg-white border border-slate-200 p-8">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-medium">销售趋势（{{ currentRangeLabel }}）</h3>
                  <span class="text-xs text-slate-500">区间合计 {{ formatMoney(trendSum) }}</span>
                </div>
                <svg viewBox="0 0 560 160" class="w-full">
                  <line v-for="i in 4" :key="'g'+i" x1="0" :y1="i*32" x2="560" :y2="i*32" stroke="#e2e8f0" stroke-width="1"/>
                  <polyline :points="trendPointsStr" fill="none" stroke="#0f172a" stroke-width="2"/>
                  <circle v-for="(p, i) in trendPointsArray" :key="'c'+i" :cx="p.x" :cy="p.y" r="3" fill="#0f172a"/>
                </svg>
                <div class="flex justify-between text-xs text-slate-500 mt-2">
                  <span v-for="(d, i) in trendLabels" :key="i">{{ d }}</span>
                </div>
              </section>

              <!-- 优惠券效果（R-DASH-002 / sales-dashboard coupon 口径） -->
              <section class="bg-white border border-slate-200 p-8">
                <h3 class="font-medium mb-4">优惠券效果（{{ currentRangeLabel }}）</h3>
                <div class="grid grid-cols-3 gap-4 text-sm">
                  <div class="border border-slate-200 p-4">
                    <div class="text-slate-500">优惠让利总额</div>
                    <div class="text-xl font-semibold mt-1">{{ formatMoney(dashboardCoupon.discountCents) }}</div>
                  </div>
                  <div class="border border-slate-200 p-4">
                    <div class="text-slate-500">使用优惠券订单数</div>
                    <div class="text-xl font-semibold mt-1">{{ dashboardCoupon.couponOrders }} 单</div>
                  </div>
                  <div class="border border-slate-200 p-4">
                    <div class="text-slate-500">用券订单占比</div>
                    <div class="text-xl font-semibold mt-1">{{ dashboardCoupon.ratio }}%</div>
                  </div>
                </div>
              </section>
            </template>

          </div><!-- /销售看板 tab -->

          <!-- ===== 优惠券管理 tab ===== -->
          <div v-if="adminTab === 'coupon'">

          <!-- 章节一: 新建优惠券规则 -->
          <section class="bg-white border border-slate-200 p-8" id="create-section">
            <h2 class="text-lg font-bold mb-6 border-b border-slate-200 pb-4">新建优惠券规则</h2>
            <form @submit.prevent="createCoupon" class="space-y-6">
              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">优惠券名称</label>
                  <input v-model.trim="couponForm.name" type="text" placeholder="例如: 新客专享满减券"
                         class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">优惠类型</label>
                  <div class="flex border border-slate-200">
                    <button type="button" @click="couponForm.type = 'FLAT'"
                            :class="['flex-1 py-2 text-sm transition-colors', couponForm.type === 'FLAT' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600']">
                      满减券 (FLAT)
                    </button>
                    <button type="button" @click="couponForm.type = 'PERCENTAGE'"
                            :class="['flex-1 py-2 text-sm border-l border-slate-200 transition-colors', couponForm.type === 'PERCENTAGE' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600']">
                      折扣券 (PERCENTAGE)
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">
                    {{ couponForm.type === 'FLAT' ? '减免金额 (元)' : '折扣比例 (折)' }}
                  </label>
                  <input v-model="couponForm.value" type="number" step="0.1" min="0"
                         :placeholder="couponForm.type === 'FLAT' ? '例如: 20' : '例如: 9 (表示 9 折)'"
                         class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">使用门槛 (满多少元可用, 0 为无门槛)</label>
                  <input v-model="couponForm.minSpend" type="number" step="1" min="0" placeholder="例如: 100"
                         class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">有效期至</label>
                  <input v-model="couponForm.expiryDate" type="date"
                         class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                </div>
              </div>

              <div v-if="createError" class="border border-slate-900 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                {{ createError }}
              </div>

              <div class="flex items-center justify-between border-t border-slate-200 pt-6">
                <p class="text-sm text-slate-500">创建后即刻生效 (ACTIVE)，可用于发放并参与结算页最优券推荐。适用范围: 全场通用。</p>
                <button type="submit" class="bg-slate-900 text-white px-6 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">
                  创建并生效
                </button>
              </div>
            </form>
          </section>

          <!-- 章节二: 优惠券列表 -->
          <section class="bg-white border border-slate-200 p-8">
            <div class="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
              <h2 class="text-lg font-bold">优惠券列表</h2>
              <span class="text-sm text-slate-500">共 {{ adminCoupons.length }} 条规则</span>
            </div>
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-slate-500 border-b border-slate-200">
                  <th class="pb-3 font-medium">名称</th>
                  <th class="pb-3 font-medium">类型</th>
                  <th class="pb-3 font-medium">优惠内容</th>
                  <th class="pb-3 font-medium">使用门槛</th>
                  <th class="pb-3 font-medium">有效期至</th>
                  <th class="pb-3 font-medium">状态</th>
                  <th class="pb-3 font-medium">已发放</th>
                  <th class="pb-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="coupon in adminCoupons" :key="coupon.id"
                    :class="['border-b border-slate-200', issueForm.couponId === coupon.id ? 'bg-slate-50' : '']">
                  <td class="py-4 font-medium">{{ coupon.name }}</td>
                  <td class="py-4">
                    <span class="border border-slate-200 px-2 py-1 text-xs text-slate-600">
                      {{ coupon.type === 'FLAT' ? '满减券' : '折扣券' }}
                    </span>
                  </td>
                  <td class="py-4 font-mono">{{ formatAdminValue(coupon) }}</td>
                  <td class="py-4">{{ coupon.minSpendCents === 0 ? '无门槛' : '满 ¥' + (coupon.minSpendCents / 100) }}</td>
                  <td class="py-4 font-mono">{{ coupon.expiryDate || '—' }}</td>
                  <td class="py-4">
                    <span class="text-xs font-bold text-slate-900">{{ statusLabel(coupon.status) }}</span>
                  </td>
                  <td class="py-4 font-mono">{{ coupon.issuedCount }}</td>
                  <td class="py-4 text-right">
                    <button @click="selectForIssue(coupon)"
                            class="border border-slate-900 text-slate-900 px-4 py-1 text-sm hover:bg-slate-900 hover:text-white transition-colors">
                      发券
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- 章节三: 手动单人发券 -->
          <section class="bg-white border border-slate-200 p-8" id="issue-section">
            <h2 class="text-lg font-bold mb-6 border-b border-slate-200 pb-4">手动发券 (单人)</h2>

            <div v-if="!selectedIssueCoupon" class="border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 text-center">
              请先在上方列表中点击「发券」选择一张优惠券
            </div>

            <form v-else @submit.prevent="issueCoupon" class="space-y-6">
              <div class="border border-slate-200 bg-slate-50 p-4 flex justify-between items-center">
                <div>
                  <div class="font-bold">{{ selectedIssueCoupon.name }}</div>
                  <div class="text-sm text-slate-500 mt-1">
                    {{ selectedIssueCoupon.type === 'FLAT' ? '满减券' : '折扣券' }} ·
                    {{ formatAdminValue(selectedIssueCoupon) }} ·
                    {{ selectedIssueCoupon.minSpendCents === 0 ? '无门槛' : '满 ¥' + (selectedIssueCoupon.minSpendCents / 100) + ' 可用' }} ·
                    有效期至 {{ selectedIssueCoupon.expiryDate || '—' }}
                  </div>
                </div>
                <button type="button" @click="issueForm.couponId = null" class="text-sm text-slate-500 underline">重新选择</button>
              </div>

              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">目标用户 ID</label>
                  <input v-model.trim="issueForm.userId" type="text" placeholder="例如: user_1003"
                         class="w-full border border-slate-200 px-3 py-2 text-sm bg-white font-mono focus:outline-none focus:border-slate-900">
                  <p class="text-xs text-slate-500 mt-2">仅支持单人发放。同一用户重复领取同一张券将被拒绝。</p>
                </div>
              </div>

              <div v-if="issueError" class="border border-slate-900 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                {{ issueError }}
              </div>
              <div v-if="issueSuccess" class="border border-slate-900 bg-slate-900 px-4 py-3 text-sm text-white">
                {{ issueSuccess }}
              </div>

              <div class="flex justify-end border-t border-slate-200 pt-6">
                <button type="submit" class="bg-slate-900 text-white px-6 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">
                  确认发放
                </button>
              </div>
            </form>
          </section>

          <!-- 章节四: 发放记录 -->
          <section class="bg-white border border-slate-200 p-8">
            <h2 class="text-lg font-bold mb-6 border-b border-slate-200 pb-4">最近发放记录</h2>
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-slate-500 border-b border-slate-200">
                  <th class="pb-3 font-medium">时间</th>
                  <th class="pb-3 font-medium">优惠券</th>
                  <th class="pb-3 font-medium">用户 ID</th>
                  <th class="pb-3 font-medium">操作人</th>
                  <th class="pb-3 font-medium">券状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="issueLog.length === 0">
                  <td colspan="5" class="py-6 text-center text-slate-400">暂无发放记录</td>
                </tr>
                <tr v-for="record in issueLog" :key="record.id" class="border-b border-slate-200">
                  <td class="py-3 font-mono text-slate-600">{{ record.time }}</td>
                  <td class="py-3 font-medium">{{ record.couponName }}</td>
                  <td class="py-3 font-mono">{{ record.userId }}</td>
                  <td class="py-3 text-slate-600">{{ record.operator }}</td>
                  <td class="py-3"><span class="text-xs font-bold text-slate-900">未使用</span></td>
                </tr>
              </tbody>
            </table>
          </section>

          </div><!-- /优惠券管理 tab -->

          <!-- ===== 商品管理 tab ===== -->
          <div v-else-if="adminTab === 'product'">

            <!-- 章节一: 商品列表 -->
            <section class="bg-white border border-slate-200 p-8">
              <div class="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
                <h2 class="text-lg font-bold">商品列表</h2>
                <button @click="openCreateProduct" class="bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">+ 新增商品</button>
              </div>
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-slate-500 border-b border-slate-200">
                    <th class="pb-3 font-medium">商品</th>
                    <th class="pb-3 font-medium">价格</th>
                    <th class="pb-3 font-medium">库存</th>
                    <th class="pb-3 font-medium">状态</th>
                    <th class="pb-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in adminProducts" :key="p.id" class="border-b border-slate-200">
                    <td class="py-3">
                      <div class="flex items-center space-x-3">
                        <img :src="p.imageUrl" :alt="p.name" class="w-10 h-10 object-cover border border-slate-200 shrink-0">
                        <div>
                          <div class="font-medium text-slate-900">{{ p.name }}</div>
                          <div class="text-xs text-slate-500">{{ p.description }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 font-mono">¥{{ (p.priceCents / 100).toFixed(2) }}</td>
                    <td class="py-3">{{ p.stock }}</td>
                    <td class="py-3"><span class="text-xs font-bold text-slate-900">{{ productStatusLabel(p.status) }}</span></td>
                    <td class="py-3 text-right">
                      <button @click="openEditProduct(p)" class="border border-slate-200 text-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-50 transition-colors">编辑</button>
                      <button @click="pendingDeleteProduct = p" class="border border-slate-200 text-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-50 transition-colors ml-2">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <!-- 章节二: 新增 / 编辑商品 -->
            <section class="bg-white border border-slate-200 p-8">
              <h2 class="text-lg font-bold mb-6 border-b border-slate-200 pb-4">{{ productForm.id ? '编辑商品' : '新增商品' }}</h2>
              <form @submit.prevent="saveProduct" class="space-y-6">
                <div class="grid grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">商品名称</label>
                    <input v-model.trim="productForm.name" type="text" placeholder="例如: 极简机械键盘"
                           class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">价格（元）</label>
                    <input v-model="productForm.priceYuan" type="number" step="0.01" min="0.01" placeholder="例如: 299.00"
                           class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">库存</label>
                    <input v-model.number="productForm.stock" type="number" min="0" placeholder="例如: 99"
                           class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">图片链接</label>
                    <input v-model.trim="productForm.imageUrl" type="text" placeholder="例如: https://images.unsplash.com/..."
                           class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">分类</label>
                    <select v-model="productForm.categoryId" class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                      <option :value="null">未分类</option>
                      <option v-for="c in activeCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">商品描述</label>
                  <input v-model.trim="productForm.description" type="text" placeholder="例如: 84键紧凑布局，红轴"
                         class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                </div>
                <div v-if="productError" class="border border-slate-900 bg-slate-50 px-4 py-3 text-sm text-slate-900">{{ productError }}</div>
                <div class="flex items-center space-x-3 border-t border-slate-200 pt-6">
                  <button type="submit" class="bg-slate-900 text-white px-6 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">{{ productForm.id ? '保存修改' : '新增商品' }}</button>
                  <button type="button" @click="resetProductForm" class="border border-slate-200 text-slate-600 px-6 py-2 text-sm font-medium">清空</button>
                </div>
              </form>
            </section>

            <!-- 章节三: 删除确认 -->
            <section v-if="pendingDeleteProduct" class="bg-white border border-slate-200 p-8">
              <h2 class="text-lg font-bold mb-4 border-b border-slate-200 pb-4">删除确认</h2>
              <p class="text-sm text-slate-700 mb-6">确认下架商品「<span class="font-medium text-slate-900">{{ pendingDeleteProduct.name }}</span>」吗？该商品将从 C 端商店与列表中移除，历史订单不受影响。</p>
              <div class="flex items-center space-x-3">
                <button @click="doDeleteProduct" class="bg-slate-900 text-white px-6 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">确认删除（下架）</button>
                <button @click="pendingDeleteProduct = null" class="border border-slate-200 text-slate-600 px-6 py-2 text-sm font-medium">取消</button>
              </div>
            </section>

          </div><!-- /商品管理 tab -->

          <!-- ===== 分类管理 tab ===== -->
          <div v-else-if="adminTab === 'category'">

            <!-- 章节一: 分类列表 -->
            <section class="bg-white border border-slate-200 p-8">
              <div class="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
                <h2 class="text-lg font-bold">分类列表</h2>
                <button @click="openCreateCategory" class="bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">+ 新增分类</button>
              </div>
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-slate-500 border-b border-slate-200">
                    <th class="pb-3 font-medium">排序</th>
                    <th class="pb-3 font-medium">分类名称</th>
                    <th class="pb-3 font-medium">商品数</th>
                    <th class="pb-3 font-medium">状态</th>
                    <th class="pb-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in adminCategories" :key="c.id" class="border-b border-slate-200">
                    <td class="py-3 text-slate-500">{{ c.sortOrder }}</td>
                    <td class="py-3 font-medium text-slate-900">{{ c.name }}</td>
                    <td class="py-3">{{ countByCategory(c.id) }}</td>
                    <td class="py-3"><span class="text-xs font-bold text-slate-900">{{ c.status === 'deleted' ? '已下架' : '生效中' }}</span></td>
                    <td class="py-3 text-right">
                      <button @click="openEditCategory(c)" class="border border-slate-200 text-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-50 transition-colors">编辑</button>
                      <button @click="pendingDeleteCategory = c" class="border border-slate-200 text-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-50 transition-colors ml-2">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <!-- 章节二: 新增/编辑分类 -->
            <section class="bg-white border border-slate-200 p-8">
              <h2 class="text-lg font-bold mb-6 border-b border-slate-200 pb-4">{{ categoryForm.id ? '编辑分类' : '新增分类' }}</h2>
              <form @submit.prevent="saveCategory" class="space-y-6">
                <div class="grid grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">分类名称</label>
                    <input v-model.trim="categoryForm.name" type="text" placeholder="例如: 键鼠外设"
                           class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">排序号（越小越靠前）</label>
                    <input v-model.number="categoryForm.sortOrder" type="number" min="0" placeholder="例如: 1"
                           class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                  </div>
                </div>
                <div v-if="categoryError" class="border border-slate-900 bg-slate-50 px-4 py-3 text-sm text-slate-900">{{ categoryError }}</div>
                <div class="flex items-center space-x-3 border-t border-slate-200 pt-6">
                  <button type="submit" class="bg-slate-900 text-white px-6 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">{{ categoryForm.id ? '保存修改' : '新增分类' }}</button>
                  <button type="button" @click="resetCategoryForm" class="border border-slate-200 text-slate-600 px-6 py-2 text-sm font-medium">清空</button>
                </div>
              </form>
            </section>

            <!-- 章节三: 删除确认 -->
            <section v-if="pendingDeleteCategory" class="bg-white border border-slate-200 p-8">
              <h2 class="text-lg font-bold mb-4 border-b border-slate-200 pb-4">删除确认</h2>
              <p class="text-sm text-slate-700 mb-6">确认删除分类「<span class="font-medium text-slate-900">{{ pendingDeleteCategory.name }}</span>」吗？该分类将从 C 端筛选条移除，其下 {{ countByCategory(pendingDeleteCategory.id) }} 个商品将变为「未分类」，不影响销售。</p>
              <div class="flex items-center space-x-3">
                <button @click="doDeleteCategory" class="bg-slate-900 text-white px-6 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">确认删除（下架）</button>
                <button @click="pendingDeleteCategory = null" class="border border-slate-200 text-slate-600 px-6 py-2 text-sm font-medium">取消</button>
              </div>
            </section>

          </div><!-- /分类管理 tab -->

          <!-- ===== 用户管理 tab（仅运营角色，R-ADM-001） ===== -->
          <div v-else-if="adminTab === 'user'">

            <!-- 无权限兜底：非运营越权进入（R-ADM-007 不返回敏感信息） -->
            <section v-if="!isOperator" class="bg-white border border-slate-200 p-8">
              <h2 class="text-lg font-bold mb-4 border-b border-slate-200 pb-4">用户管理</h2>
              <p class="text-sm text-slate-700">无权限访问用户管理：本入口仅「运营」角色可见。手机号等用户资料属敏感信息，客服与普通账号无法查看。</p>
            </section>

            <template v-else>
              <!-- 章节一: 检索区（R-ADM-003） -->
              <section class="bg-white border border-slate-200 p-8">
                <div class="flex items-end justify-between mb-6 border-b border-slate-200 pb-4">
                  <div>
                    <h2 class="text-lg font-bold">用户管理</h2>
                    <p class="text-sm text-slate-500 mt-1">查看用户基础信息与订单归属，支持按手机号 / 昵称检索。手机号属敏感信息，仅运营角色可见。</p>
                  </div>
                  <span class="border border-slate-200 px-3 py-1 text-xs text-slate-600">当前角色：运营 · {{ currentUser?.nickname || '—' }}</span>
                </div>
                <div class="flex gap-3 items-end">
                  <div class="flex-1">
                    <label class="block text-sm font-medium text-slate-700 mb-2">关键词</label>
                    <input v-model.trim="adminUserKeyword" type="text" placeholder="按手机号或昵称搜索，例如 138 或 林晓明" @keyup.enter="searchAdminUsers"
                           class="w-full border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
                  </div>
                  <button @click="searchAdminUsers" class="border border-slate-900 bg-slate-900 text-white px-6 py-2 text-sm hover:bg-slate-700">搜索</button>
                  <button @click="resetAdminUsers" class="border border-slate-200 px-6 py-2 text-sm text-slate-600">重置</button>
                </div>
                <p class="text-xs text-slate-500 mt-3">共 {{ adminUsers.length }} 位用户</p>
                <div v-if="adminUserError" class="border border-slate-900 bg-slate-50 px-4 py-3 text-sm text-slate-900 mt-3">{{ adminUserError }}</div>
              </section>

              <!-- 章节二: 用户列表（R-ADM-002） -->
              <section class="bg-white border border-slate-200 p-8">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-slate-500 border-b border-slate-200">
                      <th class="pb-3 pr-4 font-medium">用户 ID</th>
                      <th class="pb-3 pr-4 font-medium">昵称</th>
                      <th class="pb-3 pr-4 font-medium">手机号</th>
                      <th class="pb-3 pr-4 font-medium">订单数</th>
                      <th class="pb-3 pr-4 font-medium">注册日期</th>
                      <th class="pb-3 pr-4 font-medium">状态</th>
                      <th class="pb-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="u in adminUsers" :key="u.id" class="border-b border-slate-200">
                      <td class="py-3 pr-4 font-mono text-xs">{{ u.id }}</td>
                      <td class="py-3 pr-4">{{ u.nickname }}</td>
                      <td class="py-3 pr-4 font-mono text-xs">{{ u.phone }}</td>
                      <td class="py-3 pr-4">{{ u.orderCount }}</td>
                      <td class="py-3 pr-4">{{ u.createdAt }}</td>
                      <td class="py-3 pr-4">
                        <span class="border px-2 py-0.5 text-xs" :class="u.status === '正常' ? 'border-slate-200 text-slate-700' : 'border-slate-900 text-slate-900'">{{ u.status }}</span>
                      </td>
                      <td class="py-3">
                        <button @click="toggleAdminUserStatus(u)" class="text-sm underline underline-offset-4 text-slate-900">{{ u.status === '正常' ? '禁用' : '启用' }}</button>
                        <button @click="openAdminUserDetail(u)" class="text-sm underline underline-offset-4 text-slate-600 ml-4">详情</button>
                      </td>
                    </tr>
                    <tr v-if="adminUsers.length === 0">
                      <td colspan="7" class="py-8 text-center text-slate-400">暂无匹配用户</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <!-- 章节三: 用户详情（R-ADM-004 订单聚合） -->
              <section v-if="selectedAdminUser" class="bg-white border border-slate-200 p-8">
                <div class="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
                  <h2 class="text-lg font-bold">用户详情：{{ selectedAdminUser.nickname }}</h2>
                  <button @click="selectedAdminUser = null" class="text-sm text-slate-600 underline underline-offset-4">关闭</button>
                </div>
                <div class="grid grid-cols-4 gap-4 text-sm mb-6">
                  <div class="border border-slate-200 p-3">
                    <p class="text-slate-500 mb-1">用户 ID</p>
                    <p class="font-mono text-xs">{{ selectedAdminUser.id }}</p>
                  </div>
                  <div class="border border-slate-200 p-3">
                    <p class="text-slate-500 mb-1">手机号</p>
                    <p class="font-mono text-xs">{{ selectedAdminUser.phone }}</p>
                  </div>
                  <div class="border border-slate-200 p-3">
                    <p class="text-slate-500 mb-1">注册日期</p>
                    <p>{{ selectedAdminUser.createdAt }}</p>
                  </div>
                  <div class="border border-slate-200 p-3">
                    <p class="text-slate-500 mb-1">累计订单</p>
                    <p>{{ selectedAdminUser.orders.length }} 笔</p>
                  </div>
                </div>
                <h3 class="text-sm font-semibold mb-3">该用户的订单</h3>
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-slate-500 border-b border-slate-200">
                      <th class="pb-3 pr-4 font-medium">订单号</th>
                      <th class="pb-3 pr-4 font-medium">商品</th>
                      <th class="pb-3 pr-4 font-medium">实付金额</th>
                      <th class="pb-3 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="o in selectedAdminUser.orders" :key="o.id" class="border-b border-slate-200">
                      <td class="py-3 pr-4 font-mono text-xs">{{ o.id }}</td>
                      <td class="py-3 pr-4">{{ (o.items || []).map(i => i.name).join('、') || '—' }}</td>
                      <td class="py-3 pr-4 font-mono">¥{{ (o.actualPaidCents / 100).toFixed(2) }}</td>
                      <td class="py-3">{{ orderStatusLabel(o.status) }}</td>
                    </tr>
                    <tr v-if="selectedAdminUser.orders.length === 0">
                      <td colspan="4" class="py-8 text-center text-slate-400">该用户暂无订单</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            </template>

          </div><!-- /用户管理 tab -->

          <!-- ===== 订单列表 tab ===== -->
          <div v-else>

            <!-- 章节一: 订单列表 -->
            <section class="bg-white border border-slate-200 p-8">
              <div class="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
                <h2 class="text-lg font-bold">订单列表</h2>
                <input v-model.trim="orderKeyword" type="text" placeholder="搜索订单号 / 用户 ID..."
                       class="w-64 border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-900">
              </div>

              <!-- 状态过滤 -->
              <div class="flex items-center gap-2 mb-6 flex-wrap">
                <button v-for="f in orderFilters" :key="f.value" @click="orderFilter = f.value"
                        :class="['px-4 py-2 border text-sm font-medium transition-colors', orderFilter === f.value ? 'bg-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50']">
                  {{ f.label }}<span v-if="f.value !== 'ALL'" class="ml-1 text-xs opacity-60">{{ adminOrdersCount[f.value] || 0 }}</span>
                </button>
              </div>

              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-slate-500 border-b border-slate-200">
                    <th class="pb-3 font-medium">订单号</th>
                    <th class="pb-3 font-medium">用户</th>
                    <th class="pb-3 font-medium">商品数</th>
                    <th class="pb-3 font-medium">实付</th>
                    <th class="pb-3 font-medium">状态</th>
                    <th class="pb-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="o in filteredAdminOrders" :key="o.id" class="border-b border-slate-200">
                    <td class="py-3 font-mono font-medium text-slate-900">{{ o.id }}</td>
                    <td class="py-3 font-mono text-slate-600">{{ o.userId }}</td>
                    <td class="py-3">{{ o.items.reduce((n, i) => n + i.quantity, 0) }} 件</td>
                    <td class="py-3 font-mono">¥{{ (o.actualPaidCents / 100).toFixed(2) }}</td>
                    <td class="py-3"><span class="text-xs font-bold border border-slate-200 px-2 py-1">{{ orderStatusLabel(o.status) }}</span></td>
                    <td class="py-3 text-right">
                      <button @click="toggleOrderDetail(o)" class="border border-slate-200 text-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-50 transition-colors">{{ expandedOrderId === o.id ? '收起' : '详情' }}</button>
                      <button v-if="o.status === 'PENDING_PAYMENT'" @click="pendingCancelOrder = o" class="border border-slate-200 text-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-50 transition-colors ml-2">取消</button>
                      <button v-if="o.status === 'PAID'" @click="shipOrder(o)" class="bg-slate-900 text-white px-3 py-1 text-xs font-medium ml-2">发货</button>
                    </td>
                  </tr>
                  <tr v-if="filteredAdminOrders.length === 0">
                    <td colspan="6" class="py-8 text-center text-slate-400">暂无订单</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <!-- 章节二: 订单详情 -->
            <section v-if="expandedAdminOrder" class="bg-white border border-slate-200 p-8">
              <h2 class="text-lg font-bold mb-6 border-b border-slate-200 pb-4">订单详情 #{{ expandedAdminOrder.id }}</h2>
              <div class="grid grid-cols-2 gap-6 mb-6 text-sm">
                <div><span class="text-slate-500">用户:</span> <span class="font-mono">{{ expandedAdminOrder.userId }}</span></div>
                <div><span class="text-slate-500">状态:</span> <span class="font-bold">{{ orderStatusLabel(expandedAdminOrder.status) }}</span></div>
                <div><span class="text-slate-500">商品总额:</span> <span class="font-mono">¥{{ (expandedAdminOrder.totalCents / 100).toFixed(2) }}</span></div>
                <div><span class="text-slate-500">优惠券:</span> <span class="font-mono">{{ expandedAdminOrder.couponId || '无' }}</span></div>
                <div><span class="text-slate-500">折扣:</span> <span class="font-mono">-¥{{ (expandedAdminOrder.discountCents / 100).toFixed(2) }}</span></div>
                <div><span class="text-slate-500">实付:</span> <span class="font-mono font-bold">¥{{ (expandedAdminOrder.actualPaidCents / 100).toFixed(2) }}</span></div>
              </div>
              <table class="w-full text-sm border border-slate-200">
                <thead>
                  <tr class="bg-slate-50 text-slate-500">
                    <th class="py-2 px-4 text-left font-medium">商品</th>
                    <th class="py-2 px-4 text-left font-medium">单价</th>
                    <th class="py-2 px-4 text-left font-medium">数量</th>
                    <th class="py-2 px-4 text-left font-medium">小计</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="it in expandedAdminOrder.items" :key="it.productId" class="border-t border-slate-200">
                    <td class="py-2 px-4">{{ it.name }}</td>
                    <td class="py-2 px-4 font-mono">¥{{ (it.priceCents / 100).toFixed(2) }}</td>
                    <td class="py-2 px-4">{{ it.quantity }}</td>
                    <td class="py-2 px-4 font-mono">¥{{ (it.priceCents * it.quantity / 100).toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <!-- 章节三: 取消确认 -->
            <section v-if="pendingCancelOrder" class="bg-white border border-slate-200 p-8">
              <h2 class="text-lg font-bold mb-4 border-b border-slate-200 pb-4">取消确认</h2>
              <p class="text-sm text-slate-700 mb-6">确认取消订单「<span class="font-mono font-medium text-slate-900">{{ pendingCancelOrder.id }}</span>」吗？该订单未扣库存/未核销券，取消后进入「已取消」终态。</p>
              <div class="flex items-center space-x-3">
                <button @click="doCancelOrder" class="bg-slate-900 text-white px-6 py-2 text-sm font-medium hover:bg-slate-700 transition-colors">确认取消</button>
                <button @click="pendingCancelOrder = null" class="border border-slate-200 text-slate-600 px-6 py-2 text-sm font-medium">返回</button>
              </div>
            </section>

          </div><!-- /订单列表 tab -->

        </div>
      </div>
    </main>

    <!-- 成功通知模态框 -->
    <div v-if="isCheckoutSuccess" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
      <div class="w-full max-w-xs bg-white border border-slate-200 p-8 space-y-6 text-center">
        <!-- 成功文字标识 -->
        <div class="flex justify-center">
          <div class="text-2xl font-black tracking-tighter text-slate-900 border-4 border-slate-900 px-2 py-1">下单成功</div>
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
          <div class="flex justify-between items-center">
            <p class="text-[10px] text-slate-400 uppercase tracking-wider">订单状态</p>
            <p class="text-sm font-bold text-slate-900">{{ orderStatusLabel(lastOrderStatus) }}</p>
          </div>
          <div class="flex justify-between items-center">
            <p class="text-[10px] text-slate-400 uppercase tracking-wider">实付金额</p>
            <p class="text-sm font-mono font-bold text-slate-900">¥{{ (lastOrderPaidCents / 100).toFixed(2) }}</p>
          </div>
        </div>

        <!-- 模拟支付区域 -->
        <div v-if="lastOrderStatus === 'PENDING_PAYMENT'" class="space-y-2">
          <p class="text-xs text-slate-500">订单已创建，库存将在支付成功后扣减。</p>
          <button @click="payLastOrder" :disabled="payingOrder"
                  class="w-full py-2 px-4 bg-slate-900 text-white text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50">
            {{ payingOrder ? '支付中...' : '模拟支付' }}
          </button>
          <p v-if="payOrderError" class="text-xs text-slate-900 border border-slate-200 bg-slate-50 px-2 py-1">{{ payOrderError }}</p>
        </div>
        <div v-else-if="lastOrderStatus === 'PAID'" class="border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          已支付成功，库存已扣减，等待商家发货。
        </div>

        <button v-if="lastOrderStatus === 'PAID'" @click="goToMyOrders"
                class="w-full py-2 px-4 border border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest">
          查看订单
        </button>

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
const API_BASE = '' // 使用相对路径，通过 Vite 代理转发到后端
const searchQuery = ref('')
// C 端分类筛选（null = 全部）
const selectedCategory = ref(null)
const isCartOpen = ref(true)
const isProcessing = ref(false)
const isCheckoutSuccess = ref(false)
const lastOrderId = ref('')
const lastOrderStatus = ref('')
const lastOrderPaidCents = ref(0)
const payingOrder = ref(false)
const payOrderError = ref('')

// 视图模式: store (C 端店铺) / admin (B 端运营后台) / register (C 端注册) / login (C 端登录)
const viewMode = ref('store')
// 当前用户 (支持通过 ?user=user_1003 切换身份，用于多用户链路验证)
const currentUserId = ref(new URLSearchParams(window.location.search).get('user') || 'user_dev')

// ==================== 登录态与会话（注册自动登录 / 登录恢复身份 / 会话生命周期）====================
const sessionToken = ref(localStorage.getItem('ecommerce_session') || '')
const currentUser = ref(JSON.parse(localStorage.getItem('ecommerce_user') || 'null'))
const persistSession = (token, user) => {
  sessionToken.value = token
  currentUser.value = user
  currentUserId.value = user.id
  localStorage.setItem('ecommerce_session', token)
  localStorage.setItem('ecommerce_user', JSON.stringify(user))
}

// 清除本地登录态（退出登录 / 会话失效 401 时调用，R-SES-005）
const clearSession = () => {
  sessionToken.value = ''
  currentUser.value = null
  localStorage.removeItem('ecommerce_session')
  localStorage.removeItem('ecommerce_user')
}

// 认证请求头：需登录接口携带会话凭证（R-SES-002）
const authHeaders = () => (sessionToken.value
  ? { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken.value}` }
  : { 'Content-Type': 'application/json' })

// 未登录拦截回跳目标（R-SES-004）：记录访问受保护页前的目标，登录成功后回跳
const loginRedirect = ref('')

// 登录表单状态（R-LOG-001~006：手机号+密码，统一失败提示，禁用拦截，成功创建持久会话）
const loginForm = ref({ phone: '', password: '' })
const loginErrors = ref({})
const loginServerError = ref('')
const loginShowPassword = ref(false)
const loginSuccess = ref(false)

const switchToLogin = () => {
  viewMode.value = 'login'
  loginSuccess.value = false
  loginServerError.value = ''
  loginErrors.value = {}
  loginForm.value = { phone: '', password: '' }
}

const submitLogin = async () => {
  // 字段级前端校验（与后端规则一致，R-LOG-001）
  const errors = {}
  if (!/^1\d{10}$/.test(loginForm.value.phone)) errors.phone = '请输入 11 位有效手机号'
  loginErrors.value = errors
  if (Object.keys(errors).length > 0) return

  loginServerError.value = ''
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...loginForm.value })
    })
    const body = await response.json()
    if (response.ok) {
      // 登录成功：持久化会话（localStorage），刷新不掉登录态（R-LOG-004）
      persistSession(body.sessionToken, body.user)
      loginSuccess.value = true
      loginErrors.value = {}
      fetchCart()
      // 未登录拦截回跳（R-SES-004）：登录成功后回到原目标页
      if (loginRedirect.value) {
        const target = loginRedirect.value
        loginRedirect.value = ''
        switchViewMode(target)
      }
    } else {
      // 统一失败提示 / 禁用拦截提示均由后端返回（R-LOG-002/003）
      loginServerError.value = body.message || '登录失败，请稍后重试'
    }
  } catch (e) {
    loginServerError.value = '网络异常，请稍后重试'
  }
}

// 我的订单入口：登录态下进入订单页；未登录拦截并跳登录（R-SES-004，携带回跳目标）
const goToOrders = () => {
  if (!sessionToken.value) {
    loginRedirect.value = 'orders'
    switchToLogin()
    return
  }
  switchViewMode('orders')
}

// 退出登录：服务端销毁会话凭证 + 前端清除登录态（R-SES-005）
const logoutSession = async () => {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: authHeaders()
    })
  } catch (e) {
    // 网络异常不阻断本地退出
  }
  clearSession()
  loginRedirect.value = ''
  switchViewMode('store')
  fetchCart()
}

// 注册表单状态
const registerForm = ref({ phone: '', nickname: '', password: '' })
const registerErrors = ref({})
const registerServerError = ref('')
const showPassword = ref(false)
const registerSuccess = ref(false)

const switchToRegister = () => {
  viewMode.value = 'register'
  registerSuccess.value = false
  registerServerError.value = ''
}

const submitRegister = async () => {
  // 字段级前端校验（与后端规则一致，R-REG-001~004）
  const errors = {}
  if (!/^1\d{10}$/.test(registerForm.value.phone)) errors.phone = '请输入 11 位有效手机号'
  if (registerForm.value.password.length > 0 && registerForm.value.password.length < 6) errors.password = '密码至少 6 位'
  if (registerForm.value.password.length > 32) errors.password = '密码最多 32 位'
  if (registerForm.value.nickname.length > 20) errors.nickname = '昵称最多 20 字'
  registerErrors.value = errors
  if (Object.keys(errors).length > 0) return

  registerServerError.value = ''
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...registerForm.value, nickname: registerForm.value.nickname || undefined })
    })
    const body = await response.json()
    if (response.ok) {
      // 注册成功即自动登录：持久化会话 + 展示成功横幅（停留注册页），可继续结算/查看订单
      persistSession(body.sessionToken, body.user)
      currentUserId.value = body.user.id
      registerSuccess.value = true
      registerErrors.value = {}
      fetchCart()
    } else {
      registerServerError.value = body.message || '注册失败，请稍后重试'
    }
  } catch (e) {
    registerServerError.value = '网络异常，请稍后重试'
  }
}

// 同步购物车状态（服务端驱动）
const syncCart = (serverCart) => {
  if (!serverCart || !serverCart.items) {
    cart.value = []
    return
  }
  
  cart.value = serverCart.items.map(item => {
    const product = products.value.find(p => String(p.id) === String(item.productId))
    return {
      ...product,
      productId: item.productId,
      quantity: item.quantity
    }
  }).filter(item => !!item.id)
}

// 优惠券数据
const coupons = ref([])
const selectedCouponId = ref(null)
const bestCouponId = ref(null)

// 图片加载失败处理
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&q=80&w=400'
const handleImageError = (e) => {
  e.target.src = PLACEHOLDER_IMAGE
}

// 获取商品列表
const fetchProducts = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/products`)
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

// 获取优惠券列表 (仅当前用户可见: 全场通用券 + 本人持有券)
const fetchCoupons = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/coupons?userId=${encodeURIComponent(currentUserId.value)}`)
    if (response.ok) {
      coupons.value = await response.json()
    }
  } catch (e) {
    console.error('获取优惠券失败:', e)
  }
}

// 获取购物车状态（有会话按会话 userId 归属，游客按 user_dev）
const fetchCart = async () => {
  try {
    // 这里借用 checkout 接口预览或新增一个 GET /api/cart 接口
    // 目前 Node 后端没有显式的 GET /api/cart，但我们可以通过加购数量为 0 来获取
    const response = await fetch(`${API_BASE}/api/cart/items`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId: currentUserId.value, productId: '1', quantity: 0 })
    })
    if (response.ok) {
      const serverCart = await response.json()
      syncCart(serverCart)
    }
  } catch (e) {
    console.error('获取购物车失败:', e)
  }
}

// 自动推荐最优券逻辑
const recommendBestCoupon = () => {
  if (cart.value.length === 0 || coupons.value.length === 0) {
    selectedCouponId.value = null
    bestCouponId.value = null
    return
  }

  let recommendedId = null
  let maxDiscount = -1

  coupons.value.forEach(coupon => {
    if (coupon.status === 'USED') return
    if (cartTotalPrice.value < coupon.minSpendCents) return

    let discount = 0
    if (coupon.type === 'FLAT') {
      discount = Math.min(cartTotalPrice.value, coupon.value)
    } else if (coupon.type === 'PERCENTAGE') {
      discount = Math.floor(cartTotalPrice.value * (1 - coupon.value / 10) + 0.00001)
    }

    if (discount > maxDiscount) {
      maxDiscount = discount
      recommendedId = coupon.id
    } else if (discount === maxDiscount && recommendedId) {
      // 保持与后端一致的稳定排序
      if (coupon.id < recommendedId) recommendedId = coupon.id
    }
  })

  bestCouponId.value = recommendedId
  // 如果当前未选择或选择的是不可用的，自动切换到最优
  if (selectedCouponId.value === null) {
    selectedCouponId.value = recommendedId
  }
}

// 监听购物车变化以更新推荐券
import { watch } from 'vue'
watch(() => cart.value, () => {
  recommendBestCoupon()
}, { deep: true })

// 搜索过滤逻辑（分类 + 关键词组合）
const filteredProducts = computed(() => {
  let list = products.value
  if (selectedCategory.value !== null) {
    list = list.filter(p => p.categoryId === selectedCategory.value)
  }
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    list = list.filter(p =>
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query))
    )
  }
  return list
})

// 购物车逻辑
const cartTotalItems = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
const cartTotalPrice = computed(() => cart.value.reduce((total, item) => total + item.priceCents * item.quantity, 0))

// 优惠券计算逻辑
const selectedCoupon = computed(() => coupons.value.find(c => c.id === selectedCouponId.value))

const couponDiscount = computed(() => {
  if (!selectedCoupon.value) return 0
  
  // 校验门槛
  if (cartTotalPrice.value < selectedCoupon.value.minSpendCents) return 0
  
  if (selectedCoupon.value.type === 'FLAT') {
    return Math.min(cartTotalPrice.value, selectedCoupon.value.value)
  } else if (selectedCoupon.value.type === 'PERCENTAGE') {
    return Math.floor(cartTotalPrice.value * (1 - selectedCoupon.value.value / 10) + 0.00001)
  }
  return 0
})

const finalTotalPrice = computed(() => Math.max(0, cartTotalPrice.value - couponDiscount.value))

// 优惠券可用性检查
const isCouponDisabled = (coupon) => {
  return cartTotalPrice.value < coupon.minSpendCents || coupon.status === 'USED'
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

const addToCart = async (product, quantity = 1) => {
  try {
    const response = await fetch(`${API_BASE}/api/cart/items`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        userId: currentUserId.value,
        productId: String(product.id || product.productId),
        quantity: quantity
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || err.message || '同步失败')
    }

    const serverCart = await response.json()
    syncCart(serverCart)
    isCartOpen.value = true
  } catch (e) {
    console.error('加入购物车失败:', e)
    alert(`加入购物车失败: ${e.message}`)
  }
}

const removeFromCart = async (productId) => {
  try {
    const response = await fetch(`${API_BASE}/api/cart/remove`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        userId: currentUserId.value,
        productId: String(productId)
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || err.message || '移除失败')
    }

    const serverCart = await response.json()
    syncCart(serverCart)
  } catch (e) {
    console.error('移除购物车商品失败:', e)
    alert(`移除失败: ${e.message}`)
  }
}

const decreaseQuantity = async (item) => {
  if (item.quantity > 1) {
    await addToCart(item, -1)
  } else {
    await removeFromCart(item.productId)
  }
}

const checkout = async () => {
  if (cart.value.length === 0) return
  // 未登录不可下单（R-SES-002/004）：拦截并引导登录（带回跳）
  if (!sessionToken.value) {
    loginRedirect.value = 'store'
    switchToLogin()
    return
  }
  isProcessing.value = true
  try {
    // 结算前最后一次同步，确保优惠券计算基于最新状态
    await fetchCart()
    
    const response = await fetch(`${API_BASE}/api/checkout`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        couponId: selectedCouponId.value
      })
    })

    if (response.ok) {
      const order = await response.json()
      lastOrderId.value = order.id
      lastOrderStatus.value = order.status || 'PENDING_PAYMENT'
      lastOrderPaidCents.value = order.actualPaidCents || 0
      isCheckoutSuccess.value = true
      cart.value = []
    } else {
      const error = await response.json()
      // 会话失效（401/403）：清除本地登录态并引导重新登录（R-SES-002/006）
      if (response.status === 401 || response.status === 403) {
        clearSession()
        loginRedirect.value = 'store'
        switchToLogin()
        loginServerError.value = error.message || '请先登录'
        return
      }
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
  lastOrderStatus.value = ''
  lastOrderPaidCents.value = 0
  payOrderError.value = ''
}

const goToMyOrders = () => {
  resetCheckoutState()
  switchViewMode('orders')
}

// ==================== 模拟支付 ====================
const orderStatusLabel = (s) => ({
  PENDING_PAYMENT: '待支付',
  PAID: '已支付',
  SHIPPED: '已发货',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
}[s] || s)

const payLastOrder = async () => {
  if (!lastOrderId.value) return
  payingOrder.value = true
  payOrderError.value = ''
  try {
    const response = await fetch(`${API_BASE}/api/payments/${lastOrderId.value}`, { method: 'POST' })
    const data = await response.json()
    if (!response.ok) {
      payOrderError.value = data.message || data.detail || '支付失败'
      return
    }
    lastOrderStatus.value = data.status || 'PAID'
  } catch (e) {
    payOrderError.value = `网络错误: ${e.message}`
  } finally {
    payingOrder.value = false
  }
}

// ==================== B 端运营后台 ====================
const adminTab = ref('coupon') // 'dashboard' | 'coupon' | 'product' | 'category' | 'order' | 'user'

// 销售看板角色判定（R-DASH-006）：运营/老板可见入口；客服/客户不可见
const isDashboardRole = computed(() => currentUser.value && ['运营', '老板'].includes(currentUser.value.role))

// 销售看板状态（sales-dashboard / data-insights BC）
const dashboardRanges = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '近7日' },
  { key: 'month', label: '近30日' }
]
const dashboardRange = ref('week') // 默认近7日（R-DASH-008）
const dashboardData = ref(null)
const dashboardError = ref('')
const dashboardLoading = ref(false)

const currentRangeLabel = computed(() => dashboardRanges.find(r => r.key === dashboardRange.value)?.label || '近7日')
const dashboardMetrics = computed(() => dashboardData.value?.metrics || { sales: 0, orders: 0, avgOrder: 0, discount: 0 })
const dashboardCoupon = computed(() => dashboardData.value?.coupon || { discountCents: 0, couponOrders: 0, ratio: 0 })

// 金额展示：cents 整数 → 元（两位小数 + 千分位）
const formatMoney = (cents) => `¥${((cents || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// 趋势序列（SVG 折线，零第三方图表库；design.md 决策 5）
const dashboardTrend = computed(() => dashboardData.value?.trend || [])
const trendSum = computed(() => dashboardTrend.value.reduce((n, t) => n + (t.salesCents || 0), 0))
const trendPointsArray = computed(() => {
  const trend = dashboardTrend.value
  if (trend.length === 0) return []
  const W = 560
  const H = 160
  const PAD = 8
  const max = Math.max(...trend.map(t => t.salesCents || 0), 1)
  return trend.map((t, i) => {
    const x = trend.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (trend.length - 1)
    const y = H - PAD - ((t.salesCents || 0) / max) * (H - 2 * PAD)
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
  })
})
const trendPointsStr = computed(() => trendPointsArray.value.map(p => `${p.x},${p.y}`).join(' '))
const trendLabels = computed(() => dashboardTrend.value.map(t => String(t.date).slice(5))) // MM-DD

// 拉取销售看板数据（dimension 变化 → 重新请求 → 刷新指标卡/趋势/优惠券区）
const fetchSalesDashboard = async () => {
  if (!sessionToken.value) return
  dashboardError.value = ''
  dashboardLoading.value = true
  try {
    const response = await fetch(`${API_BASE}/api/admin/dashboard/sales?dimension=${dashboardRange.value}`, { headers: authHeaders() })
    if (response.status === 403) {
      dashboardError.value = '无权限访问销售看板'
      dashboardData.value = null
      return
    }
    if (response.ok) {
      dashboardData.value = await response.json()
    } else {
      const err = await response.json()
      dashboardError.value = err.message || '获取销售数据失败'
    }
  } catch (e) {
    console.error('获取销售看板失败:', e)
    dashboardError.value = '网络异常，请稍后重试'
  } finally {
    dashboardLoading.value = false
  }
}

const switchDashboardRange = (key) => {
  if (dashboardRange.value === key) return
  dashboardRange.value = key
  fetchSalesDashboard()
}
const adminCoupons = ref([])
const issueLog = ref([])
const couponForm = ref({ name: '', type: 'FLAT', value: '', minSpend: '', expiryDate: '' })
const createError = ref('')
const issueForm = ref({ couponId: null, userId: '' })
const issueError = ref('')
const issueSuccess = ref('')

const selectedIssueCoupon = computed(() =>
  adminCoupons.value.find(c => c.id === issueForm.value.couponId) || null
)

const switchViewMode = (mode) => {
  viewMode.value = mode
  if (mode === 'store') {
    // 切回 C 端时重新拉取商品与分类，使后台改动即时反映到店铺
    fetchProducts()
    fetchCoupons()
    fetchCategories()
  }
  if (mode === 'orders') {
    fetchMyOrders()
  }
  if (mode === 'admin') {
    fetchSalesDashboard()
    fetchAdminCoupons()
    fetchIssuances()
    fetchAdminProducts()
    fetchCategories()
    fetchAdminOrders()
    fetchAdminUsers()
  }
}

// ==================== C 端我的订单 ====================
const myOrders = ref([])
const expandedMyOrderId = ref(null)

const fetchMyOrders = async () => {
  // 未登录不发起请求（R-SES-004 已在 goToOrders 拦截）
  if (!sessionToken.value) {
    myOrders.value = []
    return
  }
  try {
    const response = await fetch(`${API_BASE}/api/orders`, {
      headers: { Authorization: `Bearer ${sessionToken.value}` }
    })
    if (response.ok) {
      myOrders.value = await response.json()
    } else {
      const error = await response.json()
      // 会话失效（401）/ 禁用（403）：清除本地登录态并引导重新登录（R-SES-002/006）
      if (response.status === 401 || response.status === 403) {
        clearSession()
        loginRedirect.value = 'orders'
        switchToLogin()
        loginServerError.value = error.message || '请先登录'
      }
    }
  } catch (e) {
    console.error('获取我的订单失败:', e)
  }
}

const toggleMyOrder = (o) => { expandedMyOrderId.value = expandedMyOrderId.value === o.id ? null : o.id }
const orderStep = (s) => ({ PENDING_PAYMENT: 0, PAID: 1, SHIPPED: 2, COMPLETED: 3 }[s] ?? -1)
const formatOrderTime = (t) => t ? String(t).replace('T', ' ').slice(0, 16) : ''

const fetchAdminCoupons = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/admin/coupons`)
    if (response.ok) {
      adminCoupons.value = await response.json()
    }
  } catch (e) {
    console.error('获取券规则列表失败:', e)
  }
}

const fetchIssuances = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/admin/issuances`)
    if (response.ok) {
      issueLog.value = await response.json()
    }
  } catch (e) {
    console.error('获取发放记录失败:', e)
  }
}

const formatAdminValue = (coupon) =>
  coupon.type === 'FLAT' ? `减 ¥${coupon.value / 100}` : `${coupon.value} 折`

// 券状态枚举中文映射（展示层本地化，领域契约保持英文枚举）
const statusLabel = (status) => ({
  ACTIVE: '生效中',
  USED: '已使用',
  UNUSED: '未使用',
  EXPIRED: '已过期'
}[status] || status)

const createCoupon = async () => {
  createError.value = ''
  const value = parseFloat(couponForm.value.value)
  const minSpend = parseFloat(couponForm.value.minSpend || '0')

  if (!couponForm.value.name) { createError.value = '请填写优惠券名称。'; return }
  if (isNaN(value) || value <= 0) { createError.value = '请填写有效的优惠值。'; return }
  if (couponForm.value.type === 'PERCENTAGE' && value >= 10) { createError.value = '折扣券比例必须小于 10 折 (例如 9 表示 9 折)。'; return }
  if (couponForm.value.type === 'FLAT' && minSpend > 0 && value >= minSpend) { createError.value = '减免金额不能大于或等于使用门槛。'; return }
  if (isNaN(minSpend) || minSpend < 0) { createError.value = '使用门槛不能为负数。'; return }
  if (!couponForm.value.expiryDate) { createError.value = '请选择有效期。'; return }

  try {
    const response = await fetch(`${API_BASE}/api/admin/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: couponForm.value.name,
        type: couponForm.value.type,
        value: couponForm.value.type === 'FLAT' ? Math.round(value * 100) : value,
        minSpendCents: Math.round(minSpend * 100),
        expiryDate: couponForm.value.expiryDate
      })
    })
    if (!response.ok) {
      const err = await response.json()
      createError.value = err.message || err.detail || '创建失败'
      return
    }
    couponForm.value = { name: '', type: 'FLAT', value: '', minSpend: '', expiryDate: '' }
    await fetchAdminCoupons()
  } catch (e) {
    createError.value = `网络错误: ${e.message}`
  }
}

const selectForIssue = (coupon) => {
  issueForm.value.couponId = coupon.id
  issueError.value = ''
  issueSuccess.value = ''
  document.getElementById('issue-section')?.scrollIntoView({ behavior: 'smooth' })
}

const issueCoupon = async () => {
  issueError.value = ''
  issueSuccess.value = ''
  const userId = issueForm.value.userId
  if (!userId) { issueError.value = '请输入目标用户 ID。'; return }
  if (!/^user_\d+$/.test(userId)) { issueError.value = '用户 ID 格式不正确，应形如 user_1003。'; return }

  try {
    const response = await fetch(`${API_BASE}/api/admin/coupons/${issueForm.value.couponId}/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    if (!response.ok) {
      const err = await response.json()
      issueError.value = err.message || err.detail || '发放失败'
      return
    }
    const couponName = selectedIssueCoupon.value?.name
    // 发放成功后由服务端数据回填列表与记录
    await Promise.all([fetchAdminCoupons(), fetchIssuances()])
    issueSuccess.value = `已将「${couponName}」发放给用户 ${userId}，该券即刻可在结算页参与最优推荐。`
    issueForm.value.userId = ''
  } catch (e) {
    issueError.value = `网络错误: ${e.message}`
  }
}

// ==================== B 端商品管理 ====================
const adminProducts = ref([])
const productForm = ref({ id: null, name: '', priceYuan: '', stock: 0, imageUrl: '', description: '', categoryId: null })
const productError = ref('')
const pendingDeleteProduct = ref(null)

// ==================== B 端分类管理 ====================
const adminCategories = ref([])
const categoryForm = ref({ id: null, name: '', sortOrder: 0 })
const categoryError = ref('')
const pendingDeleteCategory = ref(null)

// active 分类（C 端筛选条 / 商品表单下拉共用）
const activeCategories = computed(() => adminCategories.value.filter(c => c.status !== 'deleted'))

const productStatusLabel = (status) => (status === 'deleted' ? '已下架' : '上架中')

const fetchAdminProducts = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/products`)
    if (response.ok) {
      adminProducts.value = await response.json()
    }
  } catch (e) {
    console.error('获取商品列表失败:', e)
  }
}

const fetchCategories = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/categories`)
    if (response.ok) {
      adminCategories.value = await response.json()
    }
  } catch (e) {
    console.error('获取分类列表失败:', e)
  }
}

const countByCategory = (id) => adminProducts.value.filter(p => p.categoryId === id).length

const openCreateCategory = () => { categoryForm.value = { id: null, name: '', sortOrder: 0 }; categoryError.value = '' }
const openEditCategory = (c) => { categoryForm.value = { id: c.id, name: c.name, sortOrder: c.sortOrder }; categoryError.value = '' }
const resetCategoryForm = () => { openCreateCategory(); pendingDeleteCategory.value = null }

const saveCategory = async () => {
  categoryError.value = ''
  const name = categoryForm.value.name
  if (!name) { categoryError.value = '请填写分类名称。'; return }
  const payload = { name, sortOrder: categoryForm.value.sortOrder || 0 }
  try {
    const url = categoryForm.value.id
      ? `${API_BASE}/api/categories/${categoryForm.value.id}`
      : `${API_BASE}/api/categories`
    const response = await fetch(url, {
      method: categoryForm.value.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const err = await response.json()
      categoryError.value = err.message || err.detail || '保存失败'
      return
    }
    resetCategoryForm()
    await Promise.all([fetchCategories(), fetchAdminProducts()])
  } catch (e) {
    categoryError.value = `网络错误: ${e.message}`
  }
}

const doDeleteCategory = async () => {
  if (!pendingDeleteCategory.value) return
  const id = pendingDeleteCategory.value.id
  try {
    const response = await fetch(`${API_BASE}/api/categories/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const err = await response.json()
      categoryError.value = err.message || err.detail || '删除失败'
      return
    }
    pendingDeleteCategory.value = null
    await Promise.all([fetchCategories(), fetchAdminProducts()])
  } catch (e) {
    categoryError.value = `网络错误: ${e.message}`
  }
}

// ==================== B 端订单管理 ====================
const adminOrders = ref([])
const orderFilter = ref('ALL')
const orderKeyword = ref('')
const expandedOrderId = ref(null)
const pendingCancelOrder = ref(null)
const orderFilters = [
  { label: '全部', value: 'ALL' },
  { label: '待支付', value: 'PENDING_PAYMENT' },
  { label: '已支付', value: 'PAID' },
  { label: '已发货', value: 'SHIPPED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' }
]

const adminOrdersCount = computed(() => {
  const count = {}
  adminOrders.value.forEach(o => { count[o.status] = (count[o.status] || 0) + 1 })
  return count
})

const filteredAdminOrders = computed(() => {
  let list = adminOrders.value
  if (orderFilter.value !== 'ALL') list = list.filter(o => o.status === orderFilter.value)
  if (orderKeyword.value.trim()) {
    const k = orderKeyword.value.trim().toLowerCase()
    list = list.filter(o => o.id.toLowerCase().includes(k) || o.userId.toLowerCase().includes(k))
  }
  return list
})

const expandedAdminOrder = computed(() => adminOrders.value.find(o => o.id === expandedOrderId.value) || null)

const fetchAdminOrders = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/admin/orders`)
    if (response.ok) {
      adminOrders.value = await response.json()
    }
  } catch (e) {
    console.error('获取订单列表失败:', e)
  }
}

const toggleOrderDetail = (o) => { expandedOrderId.value = expandedOrderId.value === o.id ? null : o.id }

const shipOrder = async (o) => {
  try {
    const response = await fetch(`${API_BASE}/api/admin/orders/${o.id}/ship`, { method: 'POST' })
    if (!response.ok) {
      const err = await response.json()
      alert(err.message || err.detail || '发货失败')
      return
    }
    expandedOrderId.value = null
    await fetchAdminOrders()
  } catch (e) {
    alert(`网络错误: ${e.message}`)
  }
}

const doCancelOrder = async () => {
  if (!pendingCancelOrder.value) return
  const id = pendingCancelOrder.value.id
  try {
    const response = await fetch(`${API_BASE}/api/admin/orders/${id}/cancel`, { method: 'POST' })
    if (!response.ok) {
      const err = await response.json()
      alert(err.message || err.detail || '取消失败')
      return
    }
    pendingCancelOrder.value = null
    expandedOrderId.value = null
    await fetchAdminOrders()
  } catch (e) {
    alert(`网络错误: ${e.message}`)
  }
}

// ==================== B 端用户管理（user-admin capability，仅运营角色 R-ADM-001） ====================
const adminUsers = ref([])
const adminUserKeyword = ref('')
const selectedAdminUser = ref(null)
const adminUserError = ref('')

// 运营角色判定：入口可见性（R-ADM-001）+ 无权限兜底
const isOperator = computed(() => currentUser.value?.role === '运营')

const fetchAdminUsers = async (keyword = '') => {
  adminUserError.value = ''
  try {
    const query = keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : ''
    const response = await fetch(`${API_BASE}/api/admin/users${query}`, { headers: authHeaders() })
    if (response.status === 403) {
      adminUserError.value = '无权限，仅运营角色可访问用户管理'
      adminUsers.value = []
      return
    }
    if (response.ok) {
      adminUsers.value = await response.json()
    } else {
      const err = await response.json()
      adminUserError.value = err.message || '获取用户列表失败'
    }
  } catch (e) {
    console.error('获取用户列表失败:', e)
    adminUserError.value = '网络异常，请稍后重试'
  }
}

const searchAdminUsers = () => fetchAdminUsers(adminUserKeyword.value)

const resetAdminUsers = () => {
  adminUserKeyword.value = ''
  fetchAdminUsers()
}

const openAdminUserDetail = async (u) => {
  adminUserError.value = ''
  try {
    const response = await fetch(`${API_BASE}/api/admin/users/${u.id}`, { headers: authHeaders() })
    if (response.status === 403) {
      adminUserError.value = '无权限，仅运营角色可访问用户管理'
      return
    }
    if (response.ok) {
      selectedAdminUser.value = await response.json()
    } else {
      const err = await response.json()
      adminUserError.value = err.message || '获取用户详情失败'
    }
  } catch (e) {
    console.error('获取用户详情失败:', e)
    adminUserError.value = '网络异常，请稍后重试'
  }
}

// 禁用/启用切换（R-ADM-005/006）：状态变更后刷新列表与详情（若打开）
const toggleAdminUserStatus = async (u) => {
  adminUserError.value = ''
  const target = u.status === '正常' ? '禁用' : '正常'
  try {
    const response = await fetch(`${API_BASE}/api/admin/users/${u.id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: target })
    })
    if (response.status === 403) {
      adminUserError.value = '无权限，仅运营角色可访问用户管理'
      return
    }
    if (response.ok) {
      u.status = target
      if (selectedAdminUser.value && selectedAdminUser.value.id === u.id) {
        selectedAdminUser.value.status = target
      }
      // 禁用后该用户会话立即失效（R-ADM-005 联动 R-SES-006），操作提示
      await fetchAdminUsers(adminUserKeyword.value)
    } else {
      const err = await response.json()
      adminUserError.value = err.message || '状态变更失败'
    }
  } catch (e) {
    console.error('状态变更失败:', e)
    adminUserError.value = '网络异常，请稍后重试'
  }
}

const openCreateProduct = () => {
  resetProductForm()
}

const openEditProduct = (p) => {
  productForm.value = {
    id: p.id,
    name: p.name,
    priceYuan: (p.priceCents / 100).toFixed(2),
    stock: p.stock,
    imageUrl: p.imageUrl || '',
    description: p.description || '',
    categoryId: p.categoryId || null
  }
  productError.value = ''
}

const resetProductForm = () => {
  productForm.value = { id: null, name: '', priceYuan: '', stock: 0, imageUrl: '', description: '', categoryId: null }
  productError.value = ''
  pendingDeleteProduct.value = null
}

const saveProduct = async () => {
  productError.value = ''
  const name = productForm.value.name
  const priceYuan = parseFloat(productForm.value.priceYuan)
  const stock = parseInt(productForm.value.stock, 10)
  const imageUrl = productForm.value.imageUrl

  if (!name) { productError.value = '请填写商品名称。'; return }
  if (isNaN(priceYuan) || priceYuan <= 0) { productError.value = '价格必须大于 0 元。'; return }
  if (isNaN(stock) || stock < 0) { productError.value = '库存不能为负数。'; return }
  if (!imageUrl) { productError.value = '请填写商品图片链接。'; return }

  const priceCents = Math.round(priceYuan * 100)
  const payload = { name, priceCents, stock, imageUrl, description: productForm.value.description, categoryId: productForm.value.categoryId ?? null }

  try {
    if (productForm.value.id) {
      const response = await fetch(`${API_BASE}/api/products/${productForm.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const err = await response.json()
        productError.value = err.message || err.detail || '保存失败'
        return
      }
    } else {
      const response = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const err = await response.json()
        productError.value = err.message || err.detail || '新增失败'
        return
      }
    }
    resetProductForm()
    await fetchAdminProducts()
  } catch (e) {
    productError.value = `网络错误: ${e.message}`
  }
}

const doDeleteProduct = async () => {
  if (!pendingDeleteProduct.value) return
  const id = pendingDeleteProduct.value.id
  try {
    const response = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const err = await response.json()
      productError.value = err.message || err.detail || '删除失败'
      return
    }
    pendingDeleteProduct.value = null
    await fetchAdminProducts()
  } catch (e) {
    productError.value = `网络错误: ${e.message}`
  }
}

onMounted(() => {
  fetchProducts()
  fetchCoupons()
  fetchCart()
  fetchCategories()
})</script>

<style>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
