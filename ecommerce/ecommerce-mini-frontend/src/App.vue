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
      <div v-else class="flex-1 mx-8 text-sm text-slate-500">
        当前路径: <span class="text-slate-900 font-medium">{{ { product: '交易管理 / 商品管理', category: '交易管理 / 分类管理', coupon: '营销中心 / 优惠券管理' }[adminTab] }}</span>
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
        <button v-if="viewMode === 'store'" @click="isCartOpen = !isCartOpen" class="relative py-1 px-2 border border-slate-200 hover:bg-slate-50">
          购物车
          <span v-if="cartTotalItems > 0" class="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 text-white text-[10px] flex items-center justify-center">
            {{ cartTotalItems }}
          </span>
        </button>
        <span v-else class="text-sm text-slate-500 font-normal">运营专员: 王琳</span>
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

    <!-- 主内容区 (B 端运营后台) -->
    <main v-else class="flex-1 flex overflow-hidden">
      <!-- 左侧导航 -->
      <aside class="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <nav class="flex-1 py-4">
          <div class="px-6 py-2 text-sm font-medium text-slate-500 uppercase tracking-wider">交易管理</div>
          <a class="flex items-center px-6 py-3 border-l-4 border-transparent text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">订单列表</a>
          <a @click="adminTab = 'product'"
             :class="['flex items-center px-6 py-3 border-l-4 cursor-pointer transition-colors', adminTab === 'product' ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50']">商品管理</a>
          <a @click="adminTab = 'category'"
             :class="['flex items-center px-6 py-3 border-l-4 cursor-pointer transition-colors', adminTab === 'category' ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50']">分类管理</a>
          <div class="mt-8 px-6 py-2 text-sm font-medium text-slate-500 uppercase tracking-wider">营销中心</div>
          <a @click="adminTab = 'coupon'"
             :class="['flex items-center px-6 py-3 border-l-4 cursor-pointer transition-colors', adminTab === 'coupon' ? 'border-slate-900 bg-slate-50 text-slate-900 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50']">优惠券管理</a>
        </nav>
      </aside>

      <!-- 右侧内容区 -->
      <div class="flex-1 overflow-y-auto p-8 bg-slate-50">
        <div class="max-w-5xl mx-auto space-y-8">

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
          <div v-else>

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
const API_BASE = '' // 使用相对路径，通过 Vite 代理转发到后端
const searchQuery = ref('')
// C 端分类筛选（null = 全部）
const selectedCategory = ref(null)
const isCartOpen = ref(true)
const isProcessing = ref(false)
const isCheckoutSuccess = ref(false)
const lastOrderId = ref('')

// 视图模式: store (C 端店铺) / admin (B 端运营后台)
const viewMode = ref('store')
// 当前用户 (支持通过 ?user=user_1003 切换身份，用于多用户链路验证)
const currentUserId = ref(new URLSearchParams(window.location.search).get('user') || 'user_dev')

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

// 获取购物车状态
const fetchCart = async () => {
  try {
    // 这里借用 checkout 接口预览或新增一个 GET /api/cart 接口
    // 目前 Node 后端没有显式的 GET /api/cart，但我们可以通过加购数量为 0 来获取
    const response = await fetch(`${API_BASE}/api/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
  isProcessing.value = true
  try {
    // 结算前最后一次同步，确保优惠券计算基于最新状态
    await fetchCart()
    
    const response = await fetch(`${API_BASE}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId.value,
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

// ==================== B 端运营后台 ====================
const adminTab = ref('coupon') // 'coupon' | 'product'
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
  if (mode === 'admin') {
    fetchAdminCoupons()
    fetchIssuances()
    fetchAdminProducts()
    fetchCategories()
  }
}

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
