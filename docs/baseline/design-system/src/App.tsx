import { useState } from 'react'

/* ─────────────────────────────── types ─────────────────────────────── */

type BadgeVariant = 'primary' | 'accent' | 'electric' | 'warning' | 'success' | 'muted' | 'outline'
type BtnVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'muted'
type BtnSize = 'sm' | 'md' | 'lg' | 'xl'

/* ─────────────────────────────── primitives ─────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
      {children}
    </span>
  )
}

function SectionHead({
  index, title, description,
}: {
  index: string; title: string; description?: string
}) {
  return (
    <div className="flex items-start gap-6 mb-12">
      <span
        className="font-display font-black leading-none select-none flex-shrink-0 text-primary"
        style={{ fontSize: 'clamp(4rem, 10vw, 7rem)', opacity: 0.07, lineHeight: 1 }}
        aria-hidden
      >
        {index}
      </span>
      <div className="pt-1">
        <Label>设计规范 / {index}</Label>
        <h2 className="font-display font-black text-4xl uppercase tracking-tight mt-1 mb-2 text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">{description}</p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────── color swatch ─────────────────────────────── */

function Swatch({
  name, token, hex, darkText = false,
}: {
  name: string; token: string; hex: string; darkText?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const isDark = ['#08080E', '#0F0F1C', '#15152A', '#1A1A2E', '#222238'].includes(hex)

  const copy = () => {
    navigator.clipboard.writeText(token).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button onClick={copy} className="text-left group w-full">
      <div
        className="w-full aspect-square mb-2.5 relative transition-transform duration-200 group-hover:scale-[1.04]"
        style={{
          backgroundColor: hex,
          border: isDark ? '1px solid var(--border)' : 'none',
        }}
      >
        <span
          className="absolute bottom-2 left-2 font-mono text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: darkText ? '#08080E' : '#EFEFFA' }}
        >
          {copied ? '✓ 已复制' : '复制变量'}
        </span>
      </div>
      <div className="font-display font-bold text-sm text-foreground leading-tight">{name}</div>
      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{token}</div>
      <div className="font-mono text-[10px] text-muted-foreground opacity-50">{hex}</div>
    </button>
  )
}

/* ─────────────────────────────── badge ─────────────────────────────── */

function Badge({ children, variant = 'muted' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const styles: Record<BadgeVariant, string> = {
    primary:  'bg-primary text-primary-foreground',
    accent:   'bg-accent text-accent-foreground',
    electric: 'bg-electric text-electric-foreground',
    warning:  'bg-warning text-warning-foreground',
    success:  'bg-success text-success-foreground',
    muted:    'bg-muted text-muted-foreground border border-border',
    outline:  'border border-border text-foreground',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest uppercase ${styles[variant]}`}>
      {children}
    </span>
  )
}

/* ─────────────────────────────── button ─────────────────────────────── */

function Btn({
  children, variant = 'primary', size = 'md', disabled, icon, className = '', ...rest
}: {
  children: React.ReactNode
  variant?: BtnVariant
  size?: BtnSize
  disabled?: boolean
  icon?: string
  className?: string
  [k: string]: unknown
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-wide transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  const variants: Record<BtnVariant, string> = {
    primary: 'bg-primary text-primary-foreground hover:opacity-85 active:scale-[0.98]',
    accent:  'bg-accent text-accent-foreground hover:opacity-85 active:scale-[0.98]',
    outline: 'border border-border text-foreground hover:border-primary hover:text-primary active:scale-[0.98]',
    ghost:   'text-foreground hover:bg-muted active:scale-[0.98]',
    muted:   'bg-muted text-muted-foreground hover:text-foreground active:scale-[0.98]',
  }

  const sizes: Record<BtnSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
    xl: 'px-10 py-5 text-lg',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  )
}

/* ─────────────────────────────── input ─────────────────────────────── */

function TextInput({ label, placeholder, type = 'text', hint }: {
  label: string; placeholder?: string; type?: string; hint?: string
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full bg-muted border border-border px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      />
      {hint && (
        <span className="block font-mono text-[10px] text-muted-foreground mt-1.5 opacity-70">{hint}</span>
      )}
    </label>
  )
}

/* ─────────────────────────────── quantity stepper ─────────────────────────────── */

function QuantityStepper() {
  const [qty, setQty] = useState(1)
  return (
    <div className="inline-flex border border-border">
      <button
        onClick={() => setQty(q => Math.max(1, q - 1))}
        className="w-10 h-10 flex items-center justify-center font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-muted border-r border-border transition-colors"
      >
        −
      </button>
      <span className="w-12 flex items-center justify-center font-mono font-bold text-sm text-foreground">
        {qty}
      </span>
      <button
        onClick={() => setQty(q => q + 1)}
        className="w-10 h-10 flex items-center justify-center font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-muted border-l border-border transition-colors"
      >
        +
      </button>
    </div>
  )
}

/* ─────────────────────────────── star rating ─────────────────────────────── */

function Stars({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-px">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="text-xs"
            style={{ color: i < Math.floor(value) ? 'var(--warning)' : 'var(--border)' }}
          >
            ★
          </span>
        ))}
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">{value}分 ({count}条评价)</span>
    </div>
  )
}

/* ─────────────────────────────── product card ─────────────────────────────── */

function ProductCard({
  name, brand, category, price, originalPrice, badge, badgeVariant = 'primary', imgSrc, rating = 4.5, reviews = 99,
}: {
  name: string; brand: string; category: string; price: number; originalPrice?: number
  badge?: string; badgeVariant?: BadgeVariant; imgSrc: string; rating?: number; reviews?: number
}) {
  const [liked, setLiked] = useState(false)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="bg-card border border-border group hover:border-primary transition-colors duration-200">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={imgSrc}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {badge && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant={badgeVariant}>{badge}</Badge>
          </div>
        )}
        <button
          onClick={() => setLiked(!liked)}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-card border border-border text-sm opacity-0 group-hover:opacity-100 transition-all hover:border-accent"
          style={{ color: liked ? 'var(--accent)' : 'var(--muted-foreground)' }}
          aria-label="收藏"
        >
          {liked ? '♥' : '♡'}
        </button>
      </div>

      <div className="p-4">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          {brand} · {category}
        </div>
        <h3 className="font-display font-bold text-sm leading-tight mb-2 line-clamp-2 text-foreground">
          {name}
        </h3>
        <Stars value={rating} count={reviews} />
        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-bold text-primary text-lg">¥{price.toLocaleString()}</span>
            {originalPrice && (
              <span className="font-mono text-xs text-muted-foreground line-through">
                ¥{originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          <button
            onClick={handleAdd}
            className="font-display font-bold text-[10px] uppercase tracking-wide px-3 py-2 transition-all duration-200 whitespace-nowrap"
            style={{
              backgroundColor: added ? 'var(--success)' : 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}
          >
            {added ? '✓ 已加入' : '+ 购物车'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────── nav sample ─────────────────────────────── */

function NavSample() {
  const [activeCategory, setActiveCategory] = useState(0)
  const categories = ['全部', '无线音频', '智能穿戴', '机械键盘', '手机配件', '创意小物']

  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary flex items-center justify-center flex-shrink-0">
            <span className="font-display font-black text-primary-foreground text-xs">Z</span>
          </div>
          <span className="font-display font-black text-lg uppercase tracking-tight text-foreground">ZAPP</span>
        </div>

        <nav className="hidden md:flex items-center gap-5">
          {['新品', '热销', '限定', '系列', '活动'].map((item, i) => (
            <a
              key={item}
              href="#"
              className={`font-display font-bold text-sm uppercase tracking-wide transition-colors ${
                i === 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={e => e.preventDefault()}
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors font-sans text-base">
            ⌕
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            ♡
          </button>
          <button className="relative p-2">
            <span className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">⊕</span>
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground font-mono text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </button>
          <Btn size="sm">登录</Btn>
        </div>
      </div>

      <div className="flex items-center gap-1 px-5 py-2 overflow-x-auto">
        {categories.map((cat, i) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(i)}
            className={`font-mono text-[10px] px-3 py-1.5 uppercase tracking-wider whitespace-nowrap transition-colors flex-shrink-0 ${
              activeCategory === i
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────── hero banner ─────────────────────────────── */

function HeroBanner() {
  return (
    <div className="relative overflow-hidden bg-card border border-border" style={{ minHeight: 220 }}>
      <img
        src="https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1200&h=400&fit=crop&auto=format"
        alt="主视觉"
        className="absolute inset-0 w-full h-full object-cover opacity-20"
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10"
        style={{
          background: 'var(--primary)',
          clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)',
        }}
      />

      <div className="relative z-10 p-10 max-w-lg">
        <Badge variant="primary">限时特价 · 72小时</Badge>
        <h2 className="font-display font-black text-5xl uppercase tracking-tight text-foreground mt-3 mb-2 leading-none">
          声音，<br />
          <span className="text-primary">反击世界。</span>
        </h2>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Void Pro RGB 无线电竞耳机 — 深空黑限定版。沉浸式环绕音效，续航 16 小时。
        </p>
        <div className="flex items-center gap-4">
          <Btn size="lg" icon="⚡">立即抢购</Btn>
          <div>
            <div className="font-mono font-bold text-primary text-2xl">¥999</div>
            <div className="font-mono text-xs text-muted-foreground line-through">¥1,299</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────── main app ─────────────────────────────── */

const NAV = [
  { label: '色彩', href: 'colors' },
  { label: '字体', href: 'type' },
  { label: '按钮', href: 'buttons' },
  { label: '表单', href: 'forms' },
  { label: '标签', href: 'badges' },
  { label: '组件', href: 'cards' },
  { label: '模式', href: 'patterns' },
]

export default function App() {
  return (
    <div className="min-h-full bg-background text-foreground">

      {/* ── 顶部导航 ── */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-7 h-7 bg-primary flex items-center justify-center">
              <span className="font-display font-black text-primary-foreground text-xs">Z</span>
            </div>
            <span className="font-display font-black text-lg uppercase tracking-tight">ZAPP</span>
            <span className="font-mono text-[10px] text-muted-foreground border border-border px-2 py-0.5 hidden sm:inline">
              设计系统 v1.0
            </span>
          </div>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {NAV.map(s => (
              <a
                key={s.href}
                href={`#${s.href}`}
                className="font-mono text-[10px] px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap uppercase tracking-wider"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ── 首屏介绍 ── */}
      <section className="border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-end">
          <div>
            <Label>为个性化而生 — ZAPP 设计系统</Label>
            <h1
              className="font-display font-black uppercase tracking-tight mt-4 mb-6 text-foreground leading-[0.9]"
              style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)' }}
            >
              不一样的数码，<br />
              <span className="text-primary">不一样的你。</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
              专为个性化数码电器打造的完整设计系统。大胆、动感，带点叛逆。
            </p>
            <div className="flex gap-3 mt-8">
              <Btn size="md" icon="⚡">立即使用</Btn>
              <Btn size="md" variant="outline">查看规范</Btn>
            </div>
          </div>

          {/* 孟菲斯色块 */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { hex: '#C8FF00', label: '荧光绿', dark: true },
              { hex: '#FF2D6B', label: '粉红',   dark: false },
              { hex: '#3B6DFF', label: '电蓝',   dark: false },
              { hex: '#FF9A00', label: '琥珀',   dark: true },
              { hex: '#00E5A0', label: '翠绿',   dark: true },
              { hex: '#0F0F1C', label: '卡片',   dark: false },
              { hex: '#15152A', label: '静音',   dark: false },
              { hex: '#08080E', label: '背景',   dark: false },
            ].map(c => (
              <div
                key={c.label}
                className="aspect-square flex items-end p-2 transition-transform hover:scale-105"
                style={{
                  backgroundColor: c.hex,
                  border: ['#0F0F1C','#15152A','#08080E'].includes(c.hex) ? '1px solid var(--border)' : 'none',
                }}
              >
                <span
                  className="font-mono text-[9px] font-bold"
                  style={{ color: c.dark ? '#08080E' : '#EFEFFA', opacity: 0.75 }}
                >
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto px-6 py-20 space-y-32">

        {/* ─── 01 色彩系统 ─── */}
        <section id="colors" className="scroll-mt-16">
          <SectionHead
            index="01"
            title="色彩系统"
            description="深色优先的语义化 Token 体系。两条强调色轨道——荧光绿（主要操作）与热情粉（促销与紧迫感）。点击色块即可复制变量名。"
          />
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-4 gap-y-6">
            {[
              { name: '背景色',   token: '--background',        hex: '#08080E' },
              { name: '卡片色',   token: '--card',              hex: '#0F0F1C' },
              { name: '静音面',   token: '--muted',             hex: '#15152A' },
              { name: '次要面',   token: '--secondary',         hex: '#1A1A2E' },
              { name: '边框色',   token: '--border',            hex: '#222238' },
              { name: '次要文字', token: '--muted-foreground',  hex: '#6E6E9A' },
              { name: '前景色',   token: '--foreground',        hex: '#EFEFFA' },
              { name: '主色',     token: '--primary',           hex: '#C8FF00', dark: true },
              { name: '主色文字', token: '--primary-foreground',hex: '#08080E' },
              { name: '强调色',   token: '--accent',            hex: '#FF2D6B' },
              { name: '强调文字', token: '--accent-foreground', hex: '#FFFFFF' },
              { name: '电光蓝',   token: '--electric',          hex: '#3B6DFF' },
              { name: '警告色',   token: '--warning',           hex: '#FF9A00', dark: true },
              { name: '成功色',   token: '--success',           hex: '#00E5A0', dark: true },
              { name: '焦点环',   token: '--ring',              hex: '#C8FF00', dark: true },
            ].map(c => (
              <Swatch key={c.token} name={c.name} token={c.token} hex={c.hex} darkText={(c as { dark?: boolean }).dark} />
            ))}
          </div>
        </section>

        {/* ─── 02 字体排版 ─── */}
        <section id="type" className="scroll-mt-16">
          <SectionHead
            index="02"
            title="字体排版"
            description="三字体协作系统。Exo 2 掌控标题气场，DM Sans 承载正文易读性，JetBrains Mono 专注价格、编号与技术标签。"
          />

          {/* 字号层级表 */}
          <div className="border border-border divide-y divide-border">
            {[
              { label: '超大标题',   cls: 'font-display font-black text-foreground',  size: 'text-6xl', sample: '极光电子。' },
              { label: '一级标题',   cls: 'font-display font-bold text-foreground',   size: 'text-5xl', sample: '大胆好奇，与众不同。' },
              { label: '二级标题',   cls: 'font-display font-bold text-foreground',   size: 'text-4xl', sample: '让人心动的数码好物。' },
              { label: '三级标题',   cls: 'font-display font-bold text-foreground',   size: 'text-3xl', sample: '本周新品正式上架。' },
              { label: '正文大号',   cls: 'font-sans text-foreground',                size: 'text-xl',  sample: '我们销售实用、美观、有点奇特的数码电器——因为为什么不呢？' },
              { label: '正文常规',   cls: 'font-sans text-foreground',                size: 'text-base',sample: '满 299 元包邮，30 天无理由退货，终身奇特气质保证。' },
              { label: '正文小号',   cls: 'font-sans text-muted-foreground',          size: 'text-sm',  sample: '商品编号：ZP-2024-BK-001 · 有货 · 预计 1–3 个工作日发货' },
              { label: '等宽标签',   cls: 'font-mono font-bold text-primary uppercase tracking-widest', size: 'text-xs', sample: '新品上架 · 限定版 · 限时特价' },
              { label: '等宽价格',   cls: 'font-mono font-bold text-primary',         size: 'text-3xl', sample: '¥1,299' },
              { label: '等宽编码',   cls: 'font-mono text-muted-foreground',          size: 'text-xs',  sample: '商品编号：ZP-KBD-75-MINT · 库存：47 件 · 补货：2024-Q4' },
            ].map(t => (
              <div key={t.label} className="flex gap-6 px-6 py-4 items-baseline hover:bg-muted transition-colors">
                <div className="w-28 flex-shrink-0 pt-0.5">
                  <Label>{t.label}</Label>
                </div>
                <div className={`${t.cls} ${t.size} leading-tight flex-1`}>{t.sample}</div>
              </div>
            ))}
          </div>

          {/* 字体家族展示 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { family: 'Exo 2',          role: '展示字体', cls: 'font-display', weight: '黑体 900 — 粗体 700' },
              { family: 'DM Sans',        role: '正文字体', cls: 'font-sans',    weight: '常规 400 — 粗体 700' },
              { family: 'JetBrains Mono', role: '技术字体', cls: 'font-mono',    weight: '中等 500 — 粗体 700' },
            ].map(f => (
              <div key={f.family} className="bg-card border border-border p-6">
                <Label>{f.role}</Label>
                <div className="font-display font-bold text-base text-foreground mt-1 mb-5">{f.family}</div>
                <div className={`${f.cls} font-bold text-foreground leading-tight mb-4`} style={{ fontSize: '2.25rem' }}>
                  Aa Bb Cc<br />0–9 !@#
                </div>
                <div className={`${f.cls} text-sm text-muted-foreground leading-relaxed mb-4`}>
                  数码科技，个性生活。好玩不贵，质感拉满。
                </div>
                <div className="font-mono text-[10px] text-muted-foreground border-t border-border pt-3 mt-3">
                  {f.weight}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 03 按钮 ─── */}
        <section id="buttons" className="scroll-mt-16">
          <SectionHead
            index="03"
            title="按钮"
            description="五种样式变体，四种尺寸规格。设计上采用零圆角——棱角分明，传达品牌的干脆态度。"
          />

          <div className="space-y-4">
            <div className="bg-card border border-border p-8">
              <Label>样式变体</Label>
              <div className="flex flex-wrap gap-3 mt-4">
                <Btn variant="primary">主要按钮</Btn>
                <Btn variant="accent">强调 / 促销</Btn>
                <Btn variant="outline">描边</Btn>
                <Btn variant="ghost">幽灵</Btn>
                <Btn variant="muted">弱化</Btn>
                <Btn variant="primary" disabled>禁用状态</Btn>
              </div>
            </div>

            <div className="bg-card border border-border p-8">
              <Label>尺寸规格</Label>
              <div className="flex flex-wrap items-end gap-3 mt-4">
                <Btn size="sm">小 — sm</Btn>
                <Btn size="md">中 — md</Btn>
                <Btn size="lg">大 — lg</Btn>
                <Btn size="xl">超大 — xl</Btn>
              </div>
            </div>

            <div className="bg-card border border-border p-8">
              <Label>带图标</Label>
              <div className="flex flex-wrap gap-3 mt-4">
                <Btn icon="⚡" variant="primary">立即购买</Btn>
                <Btn icon="♡" variant="outline">加入收藏</Btn>
                <Btn icon="⊕" variant="ghost">加入购物车</Btn>
                <Btn icon="↗" variant="accent">限时抢购</Btn>
                <Btn icon="↓" variant="muted">下载规格书</Btn>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 04 表单元素 ─── */}
        <section id="forms" className="scroll-mt-16">
          <SectionHead
            index="04"
            title="表单元素"
            description="输入框、下拉选择、数量步进器与筛选控件——全部为深色背景高对比度设计。"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-8 space-y-5">
              <Label>文本输入</Label>
              <TextInput label="搜索商品" placeholder="例如：机械键盘、无线耳机..." type="search" />
              <TextInput label="电子邮箱" placeholder="your@email.com" type="email" hint="我们绝不发送垃圾邮件，承诺。" />
              <TextInput label="优惠码" placeholder="ZAPP2024" hint="区分大小写 · 每单限用一次" />
            </div>

            <div className="bg-card border border-border p-8 space-y-5">
              <Label>选择器与控件</Label>

              <div>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  排序方式
                </span>
                <select className="w-full bg-muted border border-border px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:border-primary cursor-pointer appearance-none">
                  <option>最受欢迎</option>
                  <option>新品上架</option>
                  <option>价格从低到高</option>
                  <option>价格从高到低</option>
                  <option>好评优先</option>
                </select>
              </div>

              <div>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  购买数量
                </span>
                <QuantityStepper />
              </div>

              <div>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  筛选：商品分类
                </span>
                <div className="space-y-2.5">
                  {[
                    ['无线音频', '234', true],
                    ['智能穿戴', '89',  false],
                    ['机械键盘', '156', true],
                    ['手机配件', '312', false],
                  ].map(([cat, count, checked]) => (
                    <label key={cat as string} className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-4 h-4 border border-border bg-muted flex items-center justify-center flex-shrink-0 group-hover:border-primary transition-colors">
                        {checked && <div className="w-2 h-2 bg-primary" />}
                      </div>
                      <span className="font-sans text-sm text-foreground">{cat}</span>
                      <span className="font-mono text-[10px] text-muted-foreground ml-auto">{count}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 05 徽章与标签 ─── */}
        <section id="badges" className="scroll-mt-16">
          <SectionHead
            index="05"
            title="徽章与标签"
            description="等宽字体小标签，用于商品状态、促销信息与分类体系。"
          />

          <div className="bg-card border border-border p-8 space-y-7">
            <div>
              <Label>商品状态</Label>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="primary">新品</Badge>
                <Badge variant="accent">特惠</Badge>
                <Badge variant="electric">热销</Badge>
                <Badge variant="warning">限定</Badge>
                <Badge variant="success">有货</Badge>
                <Badge variant="muted">已售罄</Badge>
                <Badge variant="outline">预售</Badge>
              </div>
            </div>

            <div>
              <Label>分类标签 — 可点击切换</Label>
              <div className="flex flex-wrap gap-2 mt-3">
                {['无线音频', '机械键盘', '智能穿戴', '创意配件', '手机周边', '桌面美化', '限定联名', '二次元'].map(tag => (
                  <CategoryTag key={tag}>{tag}</CategoryTag>
                ))}
              </div>
            </div>

            <div>
              <Label>评分星级</Label>
              <div className="flex gap-8 mt-3 flex-wrap">
                <Stars value={5} count={1024} />
                <Stars value={4} count={312} />
                <Stars value={3} count={89} />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 06 组件 ─── */}
        <section id="cards" className="scroll-mt-16">
          <SectionHead
            index="06"
            title="组件"
            description="导航栏、主视觉横幅与商品网格卡片——电商界面的三个核心视觉层次。"
          />

          <div className="mb-6">
            <Label>导航栏</Label>
            <div className="mt-3">
              <NavSample />
            </div>
          </div>

          <div className="mb-6">
            <Label>主视觉横幅</Label>
            <div className="mt-3">
              <HeroBanner />
            </div>
          </div>

          <div>
            <Label>商品网格卡片</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <ProductCard
                name="Void Pro RGB 无线耳机 — 深空黑"
                brand="CORSAIR"
                category="无线音频"
                price={999}
                originalPrice={1299}
                badge="特惠"
                badgeVariant="accent"
                imgSrc="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&auto=format"
                rating={4.7}
                reviews={312}
              />
              <ProductCard
                name="Q75 配列机械键盘 — 抹茶绿限定"
                brand="KEYCHRON"
                category="机械键盘"
                price={1299}
                badge="新品"
                badgeVariant="primary"
                imgSrc="https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop&auto=format"
                rating={4.9}
                reviews={89}
              />
              <ProductCard
                name="Pixel Watch 3 联名款 — 暗夜电光"
                brand="GOOGLE"
                category="智能穿戴"
                price={2599}
                badge="限定"
                badgeVariant="warning"
                imgSrc="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format"
                rating={4.5}
                reviews={156}
              />
              <ProductCard
                name="Mini Evo 拍立得相机 — 樱花粉"
                brand="FUJIFILM"
                category="创意摄影"
                price={1888}
                badge="热销"
                badgeVariant="electric"
                imgSrc="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop&auto=format"
                rating={4.8}
                reviews={234}
              />
            </div>
          </div>
        </section>

        {/* ─── 07 电商模式 ─── */}
        <section id="patterns" className="scroll-mt-16">
          <SectionHead
            index="07"
            title="电商模式"
            description="价格展示、购物车条目与结算流程组件。"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 价格展示 */}
            <div className="bg-card border border-border p-8 space-y-7">
              <Label>价格展示</Label>

              <div>
                <div className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">原价</div>
                <span className="font-mono font-bold text-primary" style={{ fontSize: '2.5rem' }}>¥1,299</span>
              </div>

              <div>
                <div className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">促销价</div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-mono font-bold text-primary" style={{ fontSize: '2.5rem' }}>¥999</span>
                  <span className="font-mono text-muted-foreground text-xl line-through">¥1,299</span>
                  <Badge variant="accent">省23%</Badge>
                </div>
              </div>

              <div>
                <div className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">预售价</div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono font-bold text-foreground" style={{ fontSize: '2.5rem' }}>¥2,599</span>
                  <Badge variant="outline">预售</Badge>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1.5">预计 2024-12-01 起发货</div>
              </div>

              <div>
                <div className="font-mono text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">会员价</div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono font-bold text-primary" style={{ fontSize: '2.5rem' }}>¥1,099</span>
                  <Badge variant="primary">会员专享</Badge>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1.5">非会员 ¥1,299 · 立省 ¥200</div>
              </div>
            </div>

            {/* 购物车 */}
            <div className="bg-card border border-border p-8 flex flex-col">
              <Label>购物车</Label>
              <div className="mt-4 flex-1 space-y-0">
                {[
                  {
                    name: 'Keychron Q75 — 抹茶绿',
                    price: 1299, qty: 1,
                    img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=80&h=80&fit=crop&auto=format',
                  },
                  {
                    name: 'Void Pro RGB 耳机 — 深空黑',
                    price: 999, qty: 2,
                    img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop&auto=format',
                  },
                  {
                    name: 'Mini Evo 拍立得 — 樱花粉',
                    price: 1888, qty: 1,
                    img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=80&h=80&fit=crop&auto=format',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 py-3.5 border-b border-border">
                    <div className="w-14 h-14 bg-muted flex-shrink-0 overflow-hidden">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-xs text-foreground leading-tight truncate">{item.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">× {item.qty}</div>
                    </div>
                    <span className="font-mono font-bold text-primary text-sm whitespace-nowrap">
                      ¥{(item.price * item.qty).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border mt-4 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">小计</span>
                  <span className="font-mono font-bold text-foreground">¥5,085</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">折扣</span>
                  <span className="font-mono font-bold text-accent">−¥300</span>
                </div>
                <div className="flex justify-between items-center border-t border-border pt-3">
                  <span className="font-mono text-sm uppercase tracking-widest text-foreground font-bold">合计</span>
                  <span className="font-mono font-bold text-primary text-xl">¥4,785</span>
                </div>
              </div>

              <Btn size="lg" icon="⚡" className="w-full mt-5">立即结算</Btn>
              <div className="font-mono text-[10px] text-muted-foreground text-center mt-2">
                支持微信 · 支付宝 · 信用卡 · 花呗分期
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ── 页脚 ── */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-primary flex items-center justify-center">
                  <span className="font-display font-black text-primary-foreground text-xs">Z</span>
                </div>
                <span className="font-display font-black text-lg uppercase">ZAPP</span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">设计系统 v1.0 · 2024</div>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground space-y-1 text-right">
              <div>色彩 — 荧光绿 #C8FF00 · 热情粉 #FF2D6B · 电光蓝 #3B6DFF</div>
              <div>字体 — Exo 2（展示）· DM Sans（正文）· JetBrains Mono（技术）</div>
              <div>风格 — 孟菲斯 × 杂志 × 暗黑高端</div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}

/* ─────────────────────────────── category tag ─────────────────────────────── */

function CategoryTag({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false)
  return (
    <button
      onClick={() => setActive(a => !a)}
      className="font-mono text-[10px] px-3 py-1.5 uppercase tracking-wider border transition-colors"
      style={{
        borderColor: active ? 'var(--primary)' : 'var(--border)',
        color: active ? 'var(--primary)' : 'var(--muted-foreground)',
        backgroundColor: active ? 'rgba(200,255,0,0.05)' : 'transparent',
      }}
    >
      {children}
    </button>
  )
}
