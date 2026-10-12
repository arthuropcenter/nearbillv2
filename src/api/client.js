const FUNNEL_URL = 'https://desktop-hslfvn2.tail54c606.ts.net/nearbillv2/api'
const isVercel = typeof location !== 'undefined' && /(?:^|\.)vercel\.app$/.test(location.hostname)
const BASE = import.meta.env.VITE_API_URL || (isVercel ? FUNNEL_URL : '/nearbillv2/api')

/**
 * Helper panggil API.
 * Otomatis menambahkan cookie sesi dan mengubah response JSON.
 */
export async function api(path, { method = 'GET', body, params } = {}) {
  let url = BASE + path
  if (params) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    })
    const s = qs.toString()
    if (s) url += '?' + s
  }

  const opts = { method, headers: {}, credentials: 'include' }
  if (body instanceof FormData) {
    opts.body = body
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(url, opts)
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (e) {
    /* respon non-JSON */
  }

  if (!res.ok) {
    const err = new Error(data?.error || 'Terjadi kesalahan pada server')
    err.status = res.status
    throw err
  }
  if (data === null) {
    const err = new Error('Respons server kosong/bukan JSON. Coba lagi, atau cek koneksi ke router.')
    err.status = res.status
    throw err
  }
  return data
}
