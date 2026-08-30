process.env.NODE_ENV = 'test'
const { createServer } = await import('./ecommerce/ecommerce-mini/src/http/server.js')
const { server } = createServer()
await new Promise(r => server.listen(0, () => r()))
const base = `http://127.0.0.1:${server.address().port}`
const post = (p, b) => fetch(base+p, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(b) })
await post('/api/auth/register', { phone:'13600001004', nickname:'空区间运营', password:'123456' })
console.log('role:', (await (await post('/api/__test/user-role', { phone:'13600001004', role:'运营' })).json()))
const login = await post('/api/auth/login', { phone:'13600001004', password:'123456' })
const body = await login.json()
console.log('login user role:', body.user.role)
const q = `from=${encodeURIComponent('2020-01-01T00:00:00.000Z')}&to=${encodeURIComponent('2020-01-02T00:00:00.000Z')}`
console.log('query:', q)
const res = await fetch(`${base}/api/admin/dashboard/sales?${q}`, { headers: { Authorization: `Bearer ${body.sessionToken}` } })
console.log('status:', res.status)
console.log('body:', await res.text())
server.close()
