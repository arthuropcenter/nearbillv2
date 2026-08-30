import { useEffect, useRef } from 'react'
import L from 'leaflet'

const COLORS = { ODC: '#8b5cf6', ODP: '#f59e0b', Pelanggan: '#22c55e', customer: '#06b6d4' }
const customerHref = (id) => `${import.meta.env.BASE_URL}customers/${id}`

function makeIcon(color, size) {
  return L.divIcon({
    className: 'nm-marker',
    html: `<div class="nm-pin" style="background:${color}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4]
  })
}

function coords(coordStr) {
  const parts = String(coordStr || '').split(',')
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (!isFinite(lat) || !isFinite(lng)) return null
  return [lat, lng]
}

export default function MapView({ nodes, customers, picking, picked, onPick, onReady, center = [-6.2, 106.816] }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const cbRef = useRef({ picking, onPick })

  cbRef.current = { picking, onPick }

  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)
    L.control.attribution({ position: 'bottomleft' }).addTo(map)
    map.setView(center, 13)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    onReady?.(map)

    const onClick = (e) => {
      const cb = cbRef.current
      if (cb.picking) cb.onPick(e.latlng)
    }
    map.on('click', onClick)

    const t = setTimeout(() => map.invalidateSize(), 150)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
      map.off('click', onClick)
      map.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()

    ;(nodes || []).forEach((n) => {
      const ll = coords(n.coordinates)
      if (!ll) return
      const size = n.node_type === 'ODC' ? 27 : n.node_type === 'Pelanggan' ? 18 : 22
      const m = L.marker(ll, { icon: makeIcon(COLORS[n.node_type] || COLORS.ODP, size) })
      const addr = n.address ? `<br/><i style="font-size:11px">${n.address}</i>` : ''
      m.bindPopup(
        `<b>${n.name}</b><br/>${n.node_type}${addr}<br/><span style="font-size:10px;color:#64748b">${n.coordinates}</span>`
      )
      m.addTo(layer)
    })

    ;(customers || []).forEach((c) => {
      const ll = coords(c.coordinates)
      if (!ll) return
      const m = L.marker(ll, { icon: makeIcon(COLORS.customer, 17) })
      m.bindPopup(
        `<b>${c.fullname}</b><br/>@${c.username}${c.status ? `<br/><span style="font-size:11px;color:#64748b">${c.status}</span>` : ''}<br/>` +
          `<a href="${customerHref(c.id)}" style="color:#1f5eff;font-weight:700">Lihat Detail &rarr;</a>`
      )
      m.addTo(layer)
    })

    if (picked && picked.length === 2) {
      L.marker(picked, { icon: makeIcon('#22c55e', 30) }).addTo(layer)
    }
  }, [nodes, customers, picked])

  return (
    <div
      ref={containerRef}
      className={'nm-map' + (picking ? ' picking' : '')}
      style={{ height: '55vh', minHeight: 340 }}
    />
  )
}
