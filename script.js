
    const S = { nodes: {}, rootId: null, selId: null, tf: { x: 0, y: 0, sc: 1 }, modal: null, drag: null, pan: false, po: null, confirmCb: null, lastTouchId: null }
    const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const c = window.crypto || window.msCrypto;
  if (c && c.getRandomValues) {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, ch =>
      (ch ^ c.getRandomValues(new Uint8Array(1))[0] & 15 >> ch / 4).toString(16)
    );
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = Math.random() * 16 | 0, v = ch == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
    const $ = id => document.getElementById(id)

const mdd = $('mdd'), mbtn = $('mbtn')
const tabFamily = $('tabFamily'), tabCircles = $('tabCircles')
const circlesCanvas = $('circlesCanvas')
const addGroupBtn = $('addGroupBtn')
const circlesCC = $('circlesCC')
const cWorld = $('circlesWorld')
const cSvgG = $('csg')
const groupCtxMenu = $('groupCtxMenu')
    const CW = 200, CH = 138, GY = 220, GX = 240

    function ini(n) { if (!n) return '?'; return n.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('') }

    // CONFIRM FIX #2
    function confirm2(title, msg, cb) { $('ctit').textContent = title; $('cmsg').textContent = msg; S.confirmCb = cb; $('co').classList.add('open') }
    $('cno').addEventListener('click', () => { $('co').classList.remove('open'); S.confirmCb = null })
    $('cyes').addEventListener('click', () => { $('co').classList.remove('open'); if (S.confirmCb) { S.confirmCb(); S.confirmCb = null } })

    // STORAGE
    function save() { try { localStorage.setItem('sl_v1', JSON.stringify({ nodes: S.nodes, rootId: S.rootId })) } catch (e) { toast('Storage full! Export your data.') } }
    function load() { try { const r = localStorage.getItem('sl_v1'); if (!r) return false; const d = JSON.parse(r); S.nodes = d.nodes || {}; S.rootId = d.rootId || null; return true } catch (e) { return false } }

    // NODES
    function mkNode(d) { return { id: uid(), fullName: d.fullName || '', nickname: d.nickname || '', label: d.label || '', gender: d.gender || 'unknown', phone: d.phone || '', address: d.address || '', parentIds: [], childrenIds: [], spouseId: null, siblingIds: [], isRoot: d.isRoot || false, x: d.x ?? 0, y: d.y ?? 0 } }
    function ensureSibArr(n) { if (!Array.isArray(n.siblingIds)) n.siblingIds = [] }
    function initRoot() { const r = mkNode({ fullName: 'You', isRoot: true, x: 0, y: 0 }); S.nodes[r.id] = r; S.rootId = r.id; save() }
    function reposChildren(p) { const ids = p.childrenIds; if (!ids.length) return; const tw = (ids.length - 1) * GX; ids.forEach((cid, i) => { if (S.nodes[cid]) S.nodes[cid].x = p.x - tw / 2 + i * GX }) }

    // ADD/EDIT/DELETE
    function addNode(fromId, type, fd) {
      const from = S.nodes[fromId]; if (!from) return
      let x, y
      if (type === 'parent') { x = from.x + (from.parentIds.length === 1 ? GX / 2 : 0); y = from.y - GY; if (from.parentIds.length === 1) { const ex = S.nodes[from.parentIds[0]]; if (ex) ex.x = from.x - GX / 2 } }
      else if (type === 'spouse') { x = from.x + CW + 80; y = from.y }
      else { const idx = from.childrenIds.length, tw = idx * GX; x = from.x - tw / 2 + idx * GX; y = from.y + GY }
      const node = mkNode({ ...fd, x, y }); S.nodes[node.id] = node
      if (type === 'parent') { from.parentIds.push(node.id); node.childrenIds.push(fromId) }
      else if (type === 'spouse') { from.spouseId = node.id; node.spouseId = fromId }
      else {
        from.childrenIds.push(node.id); node.parentIds.push(fromId)
        // FIX #4: link child to spouse as well
        if (from.spouseId && S.nodes[from.spouseId]) { const sp = S.nodes[from.spouseId]; if (!sp.childrenIds.includes(node.id)) { sp.childrenIds.push(node.id); node.parentIds.push(from.spouseId) } }
        reposChildren(from)
      }
      save(); render(); selNode(node.id); toast('Added ' + (node.fullName || 'person'))
    }
    function editNode(id, fd) { if (!S.nodes[id]) return; const n = S.nodes[id]; n.fullName = fd.fullName; n.nickname = fd.nickname; n.label = fd.label; n.gender = fd.gender; n.phone = fd.phone; n.address = fd.address; save(); render(); if (S.selId === id) updPanel(id); toast('Changes saved') }
    function delNode(id) {
      const n = S.nodes[id]; if (!n) return
      n.parentIds.forEach(pid => { if (S.nodes[pid]) S.nodes[pid].childrenIds = S.nodes[pid].childrenIds.filter(x => x !== id) })
      n.childrenIds.forEach(cid => { if (S.nodes[cid]) S.nodes[cid].parentIds = S.nodes[cid].parentIds.filter(x => x !== id) })
      if (n.spouseId && S.nodes[n.spouseId]) S.nodes[n.spouseId].spouseId = null
      if (Array.isArray(n.siblingIds)) n.siblingIds.forEach(sid => { const s = S.nodes[sid]; if (s && Array.isArray(s.siblingIds)) s.siblingIds = s.siblingIds.filter(x => x !== id) })
      if (id === S.rootId) { const rem = Object.keys(S.nodes).filter(k => k !== id); S.rootId = rem[0] || null; if (S.rootId) S.nodes[S.rootId].isRoot = true }
      delete S.nodes[id]
      if (S.selId === id) { S.selId = null; closePanel() }
      save(); render(); toast('Person removed')
    }

    // RENDER
    const sg = $('sg'), nw = $('nw')
    function applyTf() { const { x, y, sc } = S.tf; nw.style.transform = `translate(${x}px,${y}px) scale(${sc})`; nw.style.transformOrigin = '0 0'; sg.setAttribute('transform', `translate(${x},${y}) scale(${sc})`) }
    function render() { renderConns(); renderNodes(); $('eh').style.display = Object.keys(S.nodes).length <= 1 ? 'block' : 'none' }

    function mkPath(d, cls) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('class', cls); sg.appendChild(p); return p }
    function mkLine(x1, y1, x2, y2, cls) { const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); l.setAttribute('class', cls); sg.appendChild(l); return l }

    function renderConns() {
      sg.innerHTML = ''
      const q = $('s').value.trim().toLowerCase()
      const hl = n => !!(q && mn(n, q))

      // ── 1. Spouse links (dashed teal horizontal bar between card edges) ──────
      const drawnSpouse = new Set()
      Object.values(S.nodes).forEach(n => {
        if (!n.spouseId || drawnSpouse.has(n.id) || drawnSpouse.has(n.spouseId)) return
        const sp = S.nodes[n.spouseId]; if (!sp) return
        drawnSpouse.add(n.id); drawnSpouse.add(n.spouseId)
        const left = n.x < sp.x ? n : sp, right = n.x < sp.x ? sp : n
        const y = (left.y + right.y) / 2
        const cls = 'sp' + (hl(n) || hl(sp) ? ' hl' : '')
        mkLine(left.x + CW / 2, y, right.x - CW / 2, y, cls)
      })

      // ── 2. Family-unit connectors (parent(s) → children) ────────────────────
      // Group children by their parent-set key so siblings share one connector.
      // Key = sorted parentIds joined by '|'
      const familyGroups = {} // key → {parentIds, childIds}
      Object.values(S.nodes).forEach(child => {
        if (!child.parentIds.length) return
        const key = [...child.parentIds].sort().join('|')
        if (!familyGroups[key]) familyGroups[key] = { parentIds: child.parentIds, childIds: [] }
        familyGroups[key].childIds.push(child.id)
      })

      Object.values(familyGroups).forEach(({ parentIds, childIds }) => {
        const parents = parentIds.map(id => S.nodes[id]).filter(Boolean)
        const children = childIds.map(id => S.nodes[id]).filter(Boolean)
        if (!parents.length || !children.length) return

        const anyHl = parents.some(hl) || children.some(hl)
        const cpCls = 'cp' + (anyHl ? ' hl' : '')

        // Origin point: midpoint between parents (or single parent centre)
        let ox, oy
        if (parents.length === 1) {
          ox = parents[0].x
          oy = parents[0].y + CH / 2
        } else {
          // midpoint of the couple bar (between their card edges)
          const left = parents[0].x < parents[1].x ? parents[0] : parents[1]
          const right = parents[0].x < parents[1].x ? parents[1] : parents[0]
          ox = (left.x + CW / 2 + right.x - CW / 2) / 2
          oy = (left.y + right.y) / 2          // bar is at card mid-height
        }

        // Drop point: vertical stem drops halfway to children row
        const childY = children.reduce((s, c) => s + c.y, 0) / children.length
        const junctionY = oy + (childY - oy) * 0.45  // ~45% of the way down

        // Vertical stem from origin down to junction
        mkLine(ox, oy, ox, junctionY, cpCls)

        if (children.length === 1) {
          // Single child — straight line from junction to child top
          const c = children[0]
          mkLine(ox, junctionY, c.x, junctionY, cpCls)
          mkLine(c.x, junctionY, c.x, c.y - CH / 2, cpCls)
        } else {
          // Multiple children — horizontal rail at junction, then drop to each
          const xs = children.map(c => c.x)
          const minX = Math.min(...xs), maxX = Math.max(...xs)
          mkLine(minX, junctionY, maxX, junctionY, cpCls)
          children.forEach(c => {
            mkLine(c.x, junctionY, c.x, c.y - CH / 2, cpCls)
          })
        }
      })

      // ── 3. Explicit sibling lines (purple dotted, between sibling cards) ──────
      const drawnSib = new Set()
      Object.values(S.nodes).forEach(n => {
        if (!Array.isArray(n.siblingIds)) return
        n.siblingIds.forEach(sid => {
          const pairKey = [n.id, sid].sort().join('|')
          if (drawnSib.has(pairKey)) return
          drawnSib.add(pairKey)
          const sib = S.nodes[sid]; if (!sib) return
          const left = n.x < sib.x ? n : sib, right = n.x < sib.x ? sib : n
          const midY = (left.y + right.y) / 2
          const x1 = left.x + CW / 2, x2 = right.x - CW / 2
          const cls = 'sb' + (hl(n) || hl(sib) ? ' hl' : '')
          mkLine(x1, midY, x2, midY, cls)
        })
      })
    }

    function mn(node, q) { return node.fullName.toLowerCase().includes(q) || node.nickname.toLowerCase().includes(q) || node.label.toLowerCase().includes(q) }

    function renderNodes() {
      const q = $('s').value.trim().toLowerCase()
      const ex = {}; nw.querySelectorAll('.no').forEach(el => { ex[el.dataset.id] = el })
      Object.keys(ex).forEach(id => { if (!S.nodes[id]) ex[id].remove() })
      Object.values(S.nodes).forEach(node => {
        let el = ex[node.id]
        if (!el) { el = buildEl(node); nw.appendChild(el) } else refreshEl(el, node)
        el.style.left = node.x + 'px'; el.style.top = node.y + 'px'
        el.querySelector('.nc').classList.toggle('dm', !!(q && !mn(node, q)))
        el.classList.toggle('sel', node.id === S.selId)
      })
    }

    function buildEl(node) { const el = document.createElement('div'); el.className = 'no'; el.dataset.id = node.id; el.innerHTML = nhtml(node); bindEl(el, node); return el }

    function refreshEl(el, node) {
      const av = el.querySelector('.av'); av.className = 'av ' + (node.gender === 'male' ? 'm' : node.gender === 'female' ? 'f' : 'u'); av.textContent = ini(node.fullName)
      const bg = el.querySelector('.nb'); bg.textContent = node.label || (node.isRoot ? 'You' : ''); bg.style.display = (node.label || node.isRoot) ? 'inline-block' : 'none'
      el.querySelector('.nn').textContent = node.fullName || '(No name)'
      el.querySelector('.nk').textContent = node.nickname ? `"${node.nickname}"` : ''
      el.querySelector('.nd').textContent = node.phone || node.address || ''
      const nc = el.querySelector('.nc'); nc.className = 'nc' + (node.isRoot ? ' rc' : '') + (node.spouseId ? ' sc' : '')
      const sb = el.querySelector('[data-a="spouse"]'); if (sb) sb.style.display = node.spouseId ? 'none' : ''
      const pb = el.querySelector('[data-a="parent"]'); if (pb) { pb.style.opacity = node.parentIds.length >= 2 ? '.3' : ''; pb.style.pointerEvents = node.parentIds.length >= 2 ? 'none' : '' }
      const sib = el.querySelector('[data-a="sibling"]'); if (sib) sib.style.display = node.parentIds.length > 0 ? '' : ' none'
    }

    function nhtml(node) {
      const bl = node.label || (node.isRoot ? 'You' : '')
      const parentMax = node.parentIds.length >= 2
      const sibAvail = node.parentIds.length > 0
      return `<div class="ar">
    <button class="ab" data-a="parent" title="Add Parent" ${parentMax ? 'style="opacity:.3;pointer-events:none"' : ''}>+</button>
    <button class="asib" data-a="sibling" title="Add Sibling" style="${sibAvail ? '' : 'display:none'}">⇔</button>
    <button class="as" data-a="spouse" title="Add Spouse/Partner" style="${node.spouseId ? 'display:none' : ''}">&#128141;</button>
  </div>
  <div class="nc${node.isRoot ? ' rc' : ''}${node.spouseId ? ' sc' : ''}">
    <div class="dt dtt"></div>
    <div class="av ${node.gender === 'male' ? 'm' : node.gender === 'female' ? 'f' : 'u'}">${ini(node.fullName)}</div>
    <div class="nb" style="${bl ? '' : 'display:none'}">${bl}</div>
    <div class="nn">${node.fullName || '(No name)'}</div>
    <div class="nk">${node.nickname ? `"${node.nickname}"` : ''}  </div>
    <div class="nd">${node.phone || node.address || ''}</div>
    <div class="na">
      <button class="nab ned" title="Edit">&#9998;</button>
      <button class="nab ndl" title="Delete">&#128465;</button>
    </div>
    <div class="dt dtb"></div>
  </div>
  <button class="ab abc" data-a="child" title="Add Child">+</button>`
    }

    function bindEl(el, node) {
      el.querySelector('.nc').addEventListener('mousedown', e => { if (e.target.closest('button')) return; e.stopPropagation(); S.drag = { id: node.id, ox: e.clientX, oy: e.clientY, nx: node.x, ny: node.y, mv: false } })
      el.querySelector('.nc').addEventListener('click', e => {
        if (e.target.closest('button')) return
        if (S.drag && S.drag.mv) return
        if (S.lastTouchId === node.id) return
        selOnly(node.id)
      })
      el.querySelector('.nc').addEventListener('dblclick', e => {
        e.stopPropagation()
        selNode(node.id)
      })
      el.querySelector('.ned').addEventListener('click', e => { e.stopPropagation(); openModal('edit', node.id) })
      el.querySelector('.ndl').addEventListener('click', e => { e.stopPropagation(); confirm2(`Remove "${node.fullName || 'this person'}"?`, 'This will remove them and their connections. Orphaned members remain.', () => delNode(node.id)) })
      el.querySelector('[data-a="parent"]').addEventListener('click', e => { e.stopPropagation(); if (node.parentIds.length >= 2) { toast('Max 2 parents'); return }; openLinkPicker('parent', node.id) })
      el.querySelector('[data-a="child"]').addEventListener('click', e => { e.stopPropagation(); openLinkPicker('child', node.id) })
      const sib = el.querySelector('[data-a="sibling"]')
      if (sib) sib.addEventListener('click', e => { e.stopPropagation(); openLinkPicker('sibling', node.id) })
      const sb = el.querySelector('[data-a="spouse"]')
      if (sb) sb.addEventListener('click', e => { e.stopPropagation(); if (node.spouseId) { toast('Already has a partner'); return }; openLinkPicker('spouse', node.id) })
    }

    // PAN & ZOOM
    const cvs = $('cw')
    cvs.addEventListener('mousedown', e => { if (e.target.closest('.nc') || e.target.closest('.ab') || e.target.closest('.as')) return; S.pan = true; S.po = { x: e.clientX, y: e.clientY, tx: S.tf.x, ty: S.tf.y }; cvs.classList.add('pan') })
    document.addEventListener('mousemove', e => {
      if (S.drag) { const dx = (e.clientX - S.drag.ox) / S.tf.sc, dy = (e.clientY - S.drag.oy) / S.tf.sc; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) S.drag.mv = true; if (S.drag.mv) { const n = S.nodes[S.drag.id]; if (n) { n.x = S.drag.nx + dx; n.y = S.drag.ny + dy }; renderConns(); const el = nw.querySelector(`[data-id="${S.drag.id}"]`); if (el && S.nodes[S.drag.id]) { el.style.left = S.nodes[S.drag.id].x + 'px'; el.style.top = S.nodes[S.drag.id].y + 'px' } }; return }
      if (S.pan && S.po) { S.tf.x = S.po.tx + (e.clientX - S.po.x); S.tf.y = S.po.ty + (e.clientY - S.po.y); applyTf() }
    })
    document.addEventListener('mouseup', () => { if (S.drag && S.drag.mv) { save(); render() }; S.drag = null; S.pan = false; S.po = null; cvs.classList.remove('pan') })
    cvs.addEventListener('wheel', e => { e.preventDefault(); const f = e.deltaY < 0 ? 1.08 : .93, r = cvs.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; S.tf.x = mx + (S.tf.x - mx) * f; S.tf.y = my + (S.tf.y - my) * f; S.tf.sc = Math.max(.15, Math.min(3, S.tf.sc * f)); applyTf() }, { passive: false })

    // TOUCH SUPPORT
    let T = { touches: [], pinchDist: null, panStart: null, tfStart: null, dragNode: null, dragStart: null, lastTap: null }
    function tdist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) }
    function tmid(a, b, r) { return { x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top } }

    cvs.addEventListener('touchstart', e => {
      T.touches = [...e.touches]
      if (e.touches.length === 1) {
        const t = e.touches[0]
        const el = document.elementFromPoint(t.clientX, t.clientY)
        if (el && el.closest('button')) return // Let native click happen
        const nc = el && el.closest('.nc')
        const nodeEl = nc && nc.closest('.no')
        if (nodeEl && !el.closest('button')) {
          const nid = nodeEl.dataset.id; const node = S.nodes[nid]
          if (node) { T.dragNode = { id: nid, ox: t.clientX, oy: t.clientY, nx: node.x, ny: node.y, mv: false }; return }
        }
        T.panStart = { x: t.clientX, y: t.clientY, tx: S.tf.x, ty: S.tf.y }; T.tfStart = null
      } else if (e.touches.length === 2) {
        T.dragNode = null; T.panStart = null
        const r = cvs.getBoundingClientRect()
        T.pinchDist = tdist(e.touches[0], e.touches[1])
        T.tfStart = { ...S.tf }
        T.pinchMid = tmid(e.touches[0], e.touches[1], r)
      }
      e.preventDefault()
    }, { passive: false })

    cvs.addEventListener('touchmove', e => {
      e.preventDefault()
      if (e.touches.length === 1 && T.dragNode) {
        const t = e.touches[0]
        const dx = (t.clientX - T.dragNode.ox) / S.tf.sc, dy = (t.clientY - T.dragNode.oy) / S.tf.sc
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) T.dragNode.mv = true
        if (T.dragNode.mv) { const n = S.nodes[T.dragNode.id]; if (n) { n.x = T.dragNode.nx + dx; n.y = T.dragNode.ny + dy }; renderConns(); const el = nw.querySelector(`[data-id="${T.dragNode.id}"]`); if (el && S.nodes[T.dragNode.id]) { el.style.left = S.nodes[T.dragNode.id].x + 'px'; el.style.top = S.nodes[T.dragNode.id].y + 'px' } }
        return
      }
      if (e.touches.length === 1 && T.panStart) {
        const t = e.touches[0]
        S.tf.x = T.panStart.tx + (t.clientX - T.panStart.x)
        S.tf.y = T.panStart.ty + (t.clientY - T.panStart.y)
        applyTf(); return
      }
      if (e.touches.length === 2 && T.tfStart) {
        const r = cvs.getBoundingClientRect()
        const nd = tdist(e.touches[0], e.touches[1])
        const f = nd / T.pinchDist
        const sc = Math.max(.15, Math.min(3, T.tfStart.sc * f))
        const mx = T.pinchMid.x, my = T.pinchMid.y
        S.tf.x = mx + (T.tfStart.x - mx) * f
        S.tf.y = my + (T.tfStart.y - my) * f
        S.tf.sc = sc; applyTf()
      }
    }, { passive: false })

    cvs.addEventListener('touchend', e => {
      if (T.dragNode) {
        if (!T.dragNode.mv) {
          // It was a tap on a node card — single tap selects, double-tap opens panel
          const nid = T.dragNode.id
          const now = Date.now()
          S.lastTouchId = nid // flag so the synthetic click event is ignored
          if (T.lastTap && T.lastTap.id === nid && now - T.lastTap.time < 350) {
            // Double-tap as shortcut to details
            T.lastTap = null
            selNode(nid)
          } else {
            // Single tap → just select (shows + buttons), close panel if open
            T.lastTap = { id: nid, time: now }
            selOnly(nid)
            closePanel()
          }
        } else {
          save(); render()
        }
        T.dragNode = null
      }
      T.panStart = null; T.tfStart = null; T.pinchDist = null
      // clear lastTouchId after a short delay so mouse click suppression expires
      setTimeout(() => { S.lastTouchId = null }, 400)
    })
    $('zi').addEventListener('click', () => zBy(1.2))
    $('zo').addEventListener('click', () => zBy(.83))
    function zBy(f) { const r = cvs.getBoundingClientRect(), cx = r.width / 2, cy = r.height / 2; S.tf.x = cx + (S.tf.x - cx) * f; S.tf.y = cy + (S.tf.y - cy) * f; S.tf.sc = Math.max(.15, Math.min(3, S.tf.sc * f)); applyTf() }
    $('rv').addEventListener('click', centre)
    function centre() { const r = cvs.getBoundingClientRect(); S.tf.x = r.width / 2; S.tf.y = r.height / 2; S.tf.sc = 1; applyTf() }

    // SELECT & PANEL
    function selOnly(id) { S.selId = id; renderNodes() }
    function selNode(id) { S.selId = id; renderNodes(); updPanel(id); $('pn').classList.add('open') }
    function updPanel(id) {
      const n = S.nodes[id]; if (!n) return
      const av = $('pa'); av.className = n.gender === 'male' ? 'm' : n.gender === 'female' ? 'f' : 'u'; av.textContent = ini(n.fullName)
      $('ptit').textContent = n.fullName || '(No name)'
      $('pnk').textContent = n.nickname ? `"${n.nickname}"` : ''; $('pnk').style.display = n.nickname ? 'block' : 'none'
      const bg = $('pbg'); bg.textContent = n.label || (n.isRoot ? 'You (Root)' : ''); bg.style.display = (n.label || n.isRoot) ? 'inline-block' : 'none'
      const sv = (eid, val) => { const el = $(eid); el.textContent = val || '--'; el.className = 'prv' + (val ? '' : ' pre') }
      sv('pph', n.phone); sv('pad2', n.address)
      sv('psp', n.spouseId ? S.nodes[n.spouseId]?.fullName : null)
      sv('ppar', n.parentIds.map(p => S.nodes[p]?.fullName || '?').join(', ') || null)
      sv('pch', n.childrenIds.map(c => S.nodes[c]?.fullName || '?').join(', ') || null)
    }
    function closePanel() { S.selId = null; $('pn').classList.remove('open'); renderNodes() }
    $('pc').addEventListener('click', closePanel)
    $('ped').addEventListener('click', () => { if (S.selId) openModal('edit', S.selId) })
    $('pdl').addEventListener('click', () => { if (!S.selId) return; const n = S.nodes[S.selId]; confirm2(`Remove "${n?.fullName || 'this person'}"?`, 'This will remove them and their connections.', () => delNode(S.selId)) })

    // MODAL
    function openModal(mode, nodeId = null, parentId = null, type = null) {
      S.modal = { mode, nodeId, parentId, type }
      const t = { edit: 'Edit Person', parent: 'Add Parent', child: 'Add Child / Descendant', spouse: 'Add Spouse / Partner', sibling: 'Add Sibling' }
      $('mt').textContent = t[mode === 'edit' ? 'edit' : type] || 'Add Person'
      $('fn').value = ''; $('fk').value = ''; $('fg').value = 'unknown'; $('fl').value = ''; $('flc').value = ''; $('flc').style.display = 'none'; $('fp').value = ''; $('fa').value = ''
      if (mode === 'edit' && nodeId) {
        const n = S.nodes[nodeId]; if (n) {
          $('fn').value = n.fullName; $('fk').value = n.nickname; $('fg').value = n.gender; $('fp').value = n.phone; $('fa').value = n.address
          const opts = [...$('fl').options].map(o => o.value)
          if (opts.includes(n.label)) $('fl').value = n.label
          else if (n.label) { $('fl').value = '__c'; $('flc').value = n.label; $('flc').style.display = 'block' }
        }
      }
      $('mo').classList.add('open'); $('fn').focus()
    }
    function closeModal() { S.modal = null; $('mo').classList.remove('open') }
    function getForm() { const ls = $('fl').value, label = ls === '__c' ? $('flc').value : ls; return { fullName: $('fn').value.trim(), nickname: $('fk').value.trim(), gender: $('fg').value, label, phone: $('fp').value.trim(), address: $('fa').value.trim() } }
    $('mc').addEventListener('click', closeModal)
    $('mca').addEventListener('click', closeModal)
    $('mo').addEventListener('click', e => { if (e.target === $('mo')) closeModal() })
    $('msv').addEventListener('click', () => {
      const d = getForm()
      if (!d.fullName) { $('fn').style.borderColor = 'var(--red)'; $('fn').focus(); return }
      $('fn').style.borderColor = ''
      const m = S.modal; if (!m) return
      if (m.mode === 'add') {
        if (m.type === 'sibling') addSiblingNode(m.parentId, d)
        else addNode(m.parentId, m.type, d)
      } else editNode(m.nodeId, d)
      closeModal()
    })
    $('fl').addEventListener('change', () => { $('flc').style.display = $('fl').value === '__c' ? 'block' : 'none'; if ($('fl').value === '__c') $('flc').focus() })
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return
      if ($('co').classList.contains('open')) { $('co').classList.remove('open'); S.confirmCb = null }
      else if ($('mo').classList.contains('open')) closeModal()
      else closePanel()
    })

    // SEARCH
    function doSearch(q, inputEl) {
      renderConns(); renderNodes()
      const res = $('sr')
      if (!q) { res.classList.remove('open'); return }
      const matches = Object.values(S.nodes).filter(n => mn(n, q))
      if (!matches.length) { res.innerHTML = '<div class="sri" style="color:var(--ink-faint)">No results</div>'; res.classList.add('open'); return }
      res.innerHTML = matches.slice(0, 8).map(n => `<div class="sri" data-id="${n.id}"><strong>${n.fullName || '(No name)'}</strong>${n.nickname ? ` &middot; "${n.nickname}"` : ''}${n.label ? ` <span style="color:var(--gold-lt);font-size:11px">${n.label}</span>` : ''}</div>`).join('')
      res.classList.add('open')

      const r = inputEl.getBoundingClientRect();
      if (inputEl.id === 's2') {
        // mobile search dropdown positioning
        res.style.top = (inputEl.offsetTop + inputEl.offsetHeight + 6) + 'px';
        res.style.left = inputEl.offsetLeft + 'px';
        res.style.right = (inputEl.parentElement.offsetWidth - (inputEl.offsetLeft + inputEl.offsetWidth)) + 'px';
        res.style.width = inputEl.offsetWidth + 'px';
      } else {
        res.style.top = ''; res.style.left = ''; res.style.right = ''; res.style.width = '';
      }

      res.querySelectorAll('.sri[data-id]').forEach(el => { el.addEventListener('click', () => { const node = S.nodes[el.dataset.id]; if (!node) return; inputEl.value = ''; res.classList.remove('open'); renderConns(); renderNodes(); panTo(node); selNode(node.id); if (inputEl.id === 's2') { $('mdd').classList.remove('open'); $('mbtn').classList.remove('open') } }) })
    }

    $('s').addEventListener('input', function () { doSearch(this.value.trim().toLowerCase(), this) })
    $('s2').addEventListener('input', function () { doSearch(this.value.trim().toLowerCase(), this) })
    document.addEventListener('click', e => { if (!e.target.closest('#sw')) $('sr').classList.remove('open') })
    function panTo(node) { const r = cvs.getBoundingClientRect(); S.tf.x = r.width / 2 - node.x * S.tf.sc; S.tf.y = r.height / 2 - node.y * S.tf.sc; applyTf() }

    // EXPORT/IMPORT — handlers are set by v2.0 code below (see doExport / doImport)

    // LINK EXISTING PICKER
    let LX = { type: null, nodeId: null }
    function openLinkPicker(type, nodeId) {
      LX = { type, nodeId }
      const labels = { parent: 'Add / Link Parent', child: 'Add / Link Child', spouse: 'Add / Link Spouse', sibling: 'Add / Link Sibling' }
      $('lxt').textContent = labels[type] || 'Link Person'
      $('lxsi').value = ''
      renderLxList('')
      $('lx').classList.add('open')
      $('lxsi').focus()
    }
    function closeLinkPicker() { $('lx').classList.remove('open') }
    $('lxc').addEventListener('click', closeLinkPicker)
    $('lx').addEventListener('click', e => { if (e.target === $('lx')) closeLinkPicker() })
    $('lxnew').addEventListener('click', () => { closeLinkPicker(); openModal('add', null, LX.nodeId, LX.type) })
    $('lxsi').addEventListener('input', function () { renderLxList(this.value.trim().toLowerCase()) })
    function renderLxList(q) {
      const from = S.nodes[LX.nodeId]; if (!from) return
      const avClass = g => g === 'male' ? 'm' : g === 'female' ? 'f' : 'u'
      const avBg = g => g === 'male' ? 'linear-gradient(135deg,#4a7fb5,#2c5f8a)' : g === 'female' ? 'linear-gradient(135deg,#c0607a,#8a3050)' : 'linear-gradient(135deg,#7a7060,#554c3a)'
      let candidates = Object.values(S.nodes).filter(n => {
        if (n.id === LX.nodeId) return false
        if (LX.type === 'parent' && from.parentIds.includes(n.id)) return false
        if (LX.type === 'child' && from.childrenIds.includes(n.id)) return false
        if (LX.type === 'spouse' && (from.spouseId || n.spouseId)) return false
        if (LX.type === 'sibling') {
          // must share a parent that from also has
          return from.parentIds.length > 0
        }
        return true
      })
      if (q) candidates = candidates.filter(n => mn(n, q))
      const list = $('lxl')
      if (!candidates.length) { list.innerHTML = '<div style="padding:16px 22px;color:var(--ink-faint);font-size:13px">No eligible people found</div>'; return }
      list.innerHTML = candidates.slice(0, 30).map(n => `
    <div class="lxi" data-id="${n.id}">
      <div class="lxiav" style="background:${avBg(n.gender)}">${ini(n.fullName)}</div>
      <div><div class="lxin">${n.fullName || '(No name)'}</div><div class="lxis">${n.nickname ? `"${n.nickname}" · ` : ''}${n.label || ''}</div></div>
    </div>`).join('')
      list.querySelectorAll('.lxi').forEach(el => { el.addEventListener('click', () => { linkExisting(LX.type, LX.nodeId, el.dataset.id); closeLinkPicker() }) })
    }
    function linkSiblings(a, b) {
      if (!Array.isArray(a.siblingIds)) a.siblingIds = []
      if (!Array.isArray(b.siblingIds)) b.siblingIds = []
      if (!a.siblingIds.includes(b.id)) a.siblingIds.push(b.id)
      if (!b.siblingIds.includes(a.id)) b.siblingIds.push(a.id)
    }

    function linkExisting(type, fromId, targetId) {
      const from = S.nodes[fromId], target = S.nodes[targetId]
      if (!from || !target) return
      if (type === 'parent') {
        if (from.parentIds.length >= 2) { toast('Max 2 parents'); return }
        from.parentIds.push(targetId)
        if (!target.childrenIds.includes(fromId)) target.childrenIds.push(fromId)
        if (from.parentIds.length === 2) { const ex = S.nodes[from.parentIds[0]]; if (ex) ex.x = from.x - GX / 2; target.x = from.x + GX / 2; target.y = from.y - GY }
        else { target.x = from.x; target.y = from.y - GY }
      } else if (type === 'child') {
        if (!from.childrenIds.includes(targetId)) from.childrenIds.push(targetId)
        if (!target.parentIds.includes(fromId)) target.parentIds.push(fromId)
        reposChildren(from)
      } else if (type === 'spouse') {
        if (from.spouseId || target.spouseId) { toast('One or both already have a partner'); return }
        from.spouseId = targetId; target.spouseId = fromId
        target.x = from.x + CW + 80; target.y = from.y
      } else if (type === 'sibling') {
        // Share parents
        from.parentIds.forEach(pid => {
          const par = S.nodes[pid]; if (!par) return
          if (!par.childrenIds.includes(targetId)) par.childrenIds.push(targetId)
          if (!target.parentIds.includes(pid)) target.parentIds.push(pid)
        })
        // Mark explicit sibling link so line is drawn even if no shared parent
        linkSiblings(from, target)
        if (from.parentIds[0]) reposChildren(S.nodes[from.parentIds[0]])
      }
      save(); render(); toast('Linked!')
    }

    // ADD SIBLING (create new)
    function addSiblingNode(fromId, fd) {
      const from = S.nodes[fromId]; if (!from || !from.parentIds.length) { toast('Node needs a parent to add sibling'); return }
      const par = S.nodes[from.parentIds[0]]; if (!par) return
      const x = from.x + (CW + 40), y = from.y
      const node = mkNode({ ...fd, x, y }); S.nodes[node.id] = node
      par.childrenIds.push(node.id); node.parentIds.push(par.id)
      if (from.parentIds.length > 1) { const par2 = S.nodes[from.parentIds[1]]; if (par2 && !par2.childrenIds.includes(node.id)) { par2.childrenIds.push(node.id); node.parentIds.push(par2.id) } }
      // Record sibling links to all existing siblings in this family
      par.childrenIds.forEach(cid => { const sib = S.nodes[cid]; if (sib && sib.id !== node.id) linkSiblings(node, sib) })
      reposChildren(par)
      save(); render(); selNode(node.id); toast('Sibling added!')
    }

    let tt; function toast(m) { const el = $('toast'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2800) }

    // MOBILE MENU
    // MOVED: const mdd = $('mdd'), mbtn = $('mbtn')
    mbtn.addEventListener('click', e => { e.stopPropagation(); const open = mdd.classList.toggle('open'); mbtn.classList.toggle('open', open) })
    document.addEventListener('click', e => { if (!e.target.closest('#mdd') && !e.target.closest('#mbtn')) { mdd.classList.remove('open'); mbtn.classList.remove('open') } })
    $('mhlp').addEventListener('click', () => { mdd.classList.remove('open'); mbtn.classList.remove('open'); openWelcome() })
    // MOBILE EXPORT/IMPORT — handlers are set by v2.0 code below (see doExport / doImport)
    function initWelcome() {
      if (!localStorage.getItem('sl_welcomed')) { $('wm').classList.add('open') }
    }
    function openWelcome() { $('wm').classList.add('open') }
    $('wok').addEventListener('click', () => {
      localStorage.setItem('sl_welcomed', '1')
      $('wm').classList.remove('open')
    })
    $('hlp').addEventListener('click', openWelcome)
    $('wm').addEventListener('click', e => { if (e.target === $('wm')) $('wm').classList.remove('open') })

    // ════════════════════════════════════════════════════════
    //  CIRCLES v2.0 — DATA LAYER
    // ════════════════════════════════════════════════════════

    // Extend state
    S.circles = {}           // { [id]: { id, name, type, emoji, color, yearStart, yearEnd, subgroups: [{id,label,memberIds:[]}] } }
    S.settings = { exportPrivateNotes: false }
    S.mode = 'family'         // 'family' | 'circles'
    S.ctf = { x: 0, y: 0, sc: 1 }  // circles canvas transform

    // Override save / load for v2.0 schema
    function save() {
      try {
        const exp = {}
        Object.entries(S.nodes).forEach(([k, v]) => {
          const n = { ...v }
          exp[k] = n
        })
        localStorage.setItem('circles_v2', JSON.stringify({
          version: '2.0', nodes: exp, rootId: S.rootId,
          circles: S.circles, settings: S.settings
        }))
      } catch (e) { toast('Storage full! Export your data.') }
    }

    function load() {
      try {
        // Try v2 key first
        let raw = localStorage.getItem('circles_v2')
        if (raw) {
          const d = JSON.parse(raw)
          S.nodes = d.nodes || {}; S.rootId = d.rootId || null
          S.circles = d.circles || {}; S.settings = d.settings || { exportPrivateNotes: false }
          return true
        }
        // Fall back to old v1 key
        raw = localStorage.getItem('sl_v1')
        if (!raw) return false
        const d = JSON.parse(raw)
        S.nodes = d.nodes || {}; S.rootId = d.rootId || null
        S.circles = {}; S.settings = { exportPrivateNotes: false }
        return true
      } catch (e) { return false }
    }

    // ════════════════════════════════════════════════════════
    //  MODE SWITCHER
    // ════════════════════════════════════════════════════════
    // MOVED: const tabFamily = $('tabFamily'), tabCircles = $('tabCircles')
    // MOVED: const circlesCanvas = $('circlesCanvas')
    // MOVED: const addGroupBtn = $('addGroupBtn')
    // MOVED: const circlesCC = $('circlesCC')

    function switchMode(mode) {
      S.mode = mode
      const isFam = mode === 'family'
      $('cw').style.display = isFam ? '' : 'none'
      $('cc').style.display = isFam ? '' : 'none'
      $('leg').style.display = isFam ? '' : 'none'
      circlesCanvas.classList.toggle('active', !isFam)
      addGroupBtn.classList.toggle('active', !isFam)
      circlesCC.classList.toggle('active', !isFam)
      tabFamily.classList.toggle('active', isFam)
      tabCircles.classList.toggle('active', !isFam)
      if (!isFam) renderCirclesView()
    }

    tabFamily.addEventListener('click', () => switchMode('family'))
    tabCircles.addEventListener('click', () => switchMode('circles'))

    // ════════════════════════════════════════════════════════
    //  CIRCLES CANVAS — RENDERING
    // ════════════════════════════════════════════════════════
    // MOVED: const cWorld = $('circlesWorld')
    // MOVED: const cSvgG = $('csg')
    let CCtf = { x: 0, y: 0, sc: 1 }
    let expandedGroupId = null

    function applyCTf() {
      const { x, y, sc } = CCtf
      cWorld.style.transform = `translate(${x}px,${y}px) scale(${sc})`
      cWorld.style.transformOrigin = '0 0'
      cSvgG.setAttribute('transform', `translate(${x},${y}) scale(${sc})`)
    }

    function groupTotalMembers(g) {
      return (g.subgroups || []).reduce((s, sg) => s + (sg.memberIds || []).length, 0)
    }

    function getUserName() {
      const root = S.nodes[S.rootId]
      return root ? (root.nickname || root.fullName || 'You') : 'You'
    }

    function renderCirclesView() {
      cWorld.innerHTML = ''
      cSvgG.innerHTML = ''
      const cvs = circlesCanvas
      const r = cvs.getBoundingClientRect()
      const cx = r.width / 2, cy = r.height / 2

      // ── User centre node ──
      const userEl = document.createElement('div')
      userEl.className = 'c-user'
      userEl.style.left = cx + 'px'; userEl.style.top = cy + 'px'
      userEl.innerHTML = `<span class="c-user-emoji">🫂</span><span class="c-user-label">${getUserName()}</span>`
      cWorld.appendChild(userEl)

      // ── Lay out group bubbles in a circle around the user ──
      const groups = Object.values(S.circles)
      const R = Math.min(cx, cy) * 0.55   // orbit radius
      const total = groups.length

      groups.forEach((g, i) => {
        const angle = (2 * Math.PI * i / Math.max(total, 1)) - Math.PI / 2
        const gx = cx + R * Math.cos(angle)
        const gy = cy + R * Math.sin(angle)

        // SVG line: user → group
        drawCLine(cSvgG, cx, cy, gx, gy, 'c-line')

        const el = document.createElement('div')
        el.className = 'c-group' + (expandedGroupId === g.id ? ' expanded' : '')
        el.dataset.gid = g.id
        el.style.left = gx + 'px'; el.style.top = gy + 'px'
        el.style.background = hexAlpha(g.color, 0.15)
        el.style.borderColor = g.color
        el.style.color = g.color
        el.style.boxShadow = `0 0 20px ${hexAlpha(g.color, 0.2)}`
        const totalM = groupTotalMembers(g)
        const yrLabel = g.yearStart ? ` '${String(g.yearStart).slice(-2)}${g.yearEnd ? `–'${String(g.yearEnd).slice(-2)}` : '+'}` : ''
        el.innerHTML = `
          <span class="c-group-emoji">${g.emoji}</span>
          <span class="c-group-name" style="color:${g.color}">${g.name}${yrLabel}</span>
          <span class="c-group-count" style="background:${hexAlpha(g.color, 0.2)};color:${g.color}">${totalM} people</span>`

        // Long-press / right-click → context menu
        let pressTimer
        el.addEventListener('contextmenu', e => { e.preventDefault(); openGroupCtx(g.id, e.clientX, e.clientY) })
        el.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openGroupCtx(g.id, null, null), 600) }, { passive: true })
        el.addEventListener('touchend', () => clearTimeout(pressTimer))
        el.addEventListener('touchmove', () => clearTimeout(pressTimer))

        // Click → toggle expand sub-groups
        el.addEventListener('click', e => {
          if (e.target.closest('.c-subgroup')) return
          expandedGroupId = expandedGroupId === g.id ? null : g.id
          renderCirclesView()
        })

        cWorld.appendChild(el)

        // ── Sub-group bubbles (only if this group is expanded) ──
        if (expandedGroupId === g.id) {
          const subs = g.subgroups || []
          const SR = 120   // sub-group orbit radius from group centre
          subs.forEach((sg, si) => {
            const subAngle = angle + (2 * Math.PI * si / Math.max(subs.length, 1))
            const sx = gx + SR * Math.cos(subAngle)
            const sy = gy + SR * Math.sin(subAngle)

            drawCLine(cSvgG, gx, gy, sx, sy, 'c-line-sub')

            const sel = document.createElement('div')
            sel.className = 'c-subgroup'
            sel.dataset.gid = g.id; sel.dataset.sgid = sg.id
            sel.style.left = sx + 'px'; sel.style.top = sy + 'px'
            sel.innerHTML = `
              <span class="c-subgroup-label">${sg.label}</span>
              <span class="c-subgroup-count">${(sg.memberIds || []).length} 👤</span>`

            // Animate in after a frame
            requestAnimationFrame(() => { requestAnimationFrame(() => sel.classList.add('visible')) })

            sel.addEventListener('click', e => {
              e.stopPropagation()
              openPeopleModal(g.id, sg.id)
            })

            cWorld.appendChild(sel)
          })
        }
      })
    }

    function drawCLine(svgG, x1, y1, x2, y2, cls) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', x1); line.setAttribute('y1', y1)
      line.setAttribute('x2', x2); line.setAttribute('y2', y2)
      line.setAttribute('class', cls)
      svgG.appendChild(line)
    }

    function hexAlpha(hex, a) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r},${g},${b},${a})`
    }

    // Circles canvas pan & zoom
    const cvs2 = circlesCanvas
    let cpan = false, cpo = null
    cvs2.addEventListener('mousedown', e => {
      if (e.target.closest('.c-group') || e.target.closest('.c-subgroup') || e.target.closest('.c-user')) return
      cpan = true; cpo = { x: e.clientX, y: e.clientY, tx: CCtf.x, ty: CCtf.y }
      cvs2.classList.add('pan')
    })
    document.addEventListener('mousemove', e => {
      if (cpan && cpo) { CCtf.x = cpo.tx + (e.clientX - cpo.x); CCtf.y = cpo.ty + (e.clientY - cpo.y); applyCTf() }
    })
    document.addEventListener('mouseup', () => { cpan = false; cpo = null; cvs2.classList.remove('pan') })
    cvs2.addEventListener('wheel', e => {
      e.preventDefault()
      const f = e.deltaY < 0 ? 1.08 : .93
      const r = cvs2.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top
      CCtf.x = mx + (CCtf.x - mx) * f; CCtf.y = my + (CCtf.y - my) * f
      CCtf.sc = Math.max(.2, Math.min(3, CCtf.sc * f)); applyCTf()
    }, { passive: false })
    $('czi').addEventListener('click', () => czBy(1.2))
    $('czo').addEventListener('click', () => czBy(.83))
    function czBy(f) {
      const r = cvs2.getBoundingClientRect(), cx = r.width / 2, cy = r.height / 2
      CCtf.x = cx + (CCtf.x - cx) * f; CCtf.y = cy + (CCtf.y - cy) * f
      CCtf.sc = Math.max(.2, Math.min(3, CCtf.sc * f)); applyCTf()
    }

    // Touch pan for circles canvas
    let CT = { panStart: null }
    cvs2.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        const t = e.touches[0]
        if (document.elementFromPoint(t.clientX, t.clientY)?.closest('.c-group,.c-subgroup,.c-user')) return
        CT.panStart = { x: t.clientX, y: t.clientY, tx: CCtf.x, ty: CCtf.y }
      }
    }, { passive: true })
    cvs2.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && CT.panStart) {
        const t = e.touches[0]
        CCtf.x = CT.panStart.tx + (t.clientX - CT.panStart.x)
        CCtf.y = CT.panStart.ty + (t.clientY - CT.panStart.y)
        applyCTf()
      }
    }, { passive: true })
    cvs2.addEventListener('touchend', () => { CT.panStart = null })

    // ════════════════════════════════════════════════════════
    //  GROUP CONTEXT MENU
    // ════════════════════════════════════════════════════════
    let ctxGroupId = null
    // MOVED: const groupCtxMenu = $('groupCtxMenu')

    function openGroupCtx(gid, mx, my) {
      ctxGroupId = gid
      groupCtxMenu.classList.add('open')
      if (mx !== null) {
        groupCtxMenu.style.left = Math.min(mx, window.innerWidth - 180) + 'px'
        groupCtxMenu.style.top = Math.min(my, window.innerHeight - 140) + 'px'
      } else {
        groupCtxMenu.style.left = '50%'; groupCtxMenu.style.top = '50%'
        groupCtxMenu.style.transform = 'translate(-50%,-50%)'
      }
    }

    document.addEventListener('click', e => {
      if (!e.target.closest('#groupCtxMenu')) { groupCtxMenu.classList.remove('open'); groupCtxMenu.style.transform = '' }
    })

    $('ctxEditGroup').addEventListener('click', () => {
      groupCtxMenu.classList.remove('open')
      if (ctxGroupId) openGroupModal('edit', ctxGroupId)
    })
    $('ctxAddSub').addEventListener('click', () => {
      groupCtxMenu.classList.remove('open')
      if (ctxGroupId) {
        const label = prompt('Sub-group name:')
        if (!label?.trim()) return
        const g = S.circles[ctxGroupId]; if (!g) return
        if (!g.subgroups) g.subgroups = []
        g.subgroups.push({ id: uid(), label: label.trim(), memberIds: [] })
        save(); renderCirclesView(); toast('Sub-group added!')
      }
    })
    $('ctxDelGroup').addEventListener('click', () => {
      groupCtxMenu.classList.remove('open')
      if (!ctxGroupId) return
      const g = S.circles[ctxGroupId]
      confirm2(`Delete "${g?.name}"?`, 'Members are kept. Only this group and its sub-groups are removed.', () => {
        delete S.circles[ctxGroupId]
        if (expandedGroupId === ctxGroupId) expandedGroupId = null
        save(); renderCirclesView(); toast('Group deleted.')
      })
    })

    // ════════════════════════════════════════════════════════
    //  CREATE / EDIT GROUP MODAL
    // ════════════════════════════════════════════════════════
    let GM = { mode: 'create', gid: null, color: '#4a7fb5', subgroups: [] }
    const PALETTE_COLORS = ['#4a7fb5', '#16a085', '#8a60c0', '#c8963e', '#c0392b', '#27ae60']

    addGroupBtn.addEventListener('click', () => openGroupModal('create'))
    $('groupMclose').addEventListener('click', closeGroupModal)
    $('groupMcancel').addEventListener('click', closeGroupModal)
    $('groupMo').addEventListener('click', e => { if (e.target === $('groupMo')) closeGroupModal() })

    function openGroupModal(mode, gid = null) {
      GM.mode = mode; GM.gid = gid
      $('groupMtitle').textContent = mode === 'edit' ? 'Edit Group' : 'New Group'

      // Reset type buttons
      document.querySelectorAll('.gtype-btn').forEach(b => b.classList.remove('sel'))
      document.querySelector('.gtype-btn[data-type="school"]').classList.add('sel')
      GM.color = '#4a7fb5'
      GM.subgroups = ['Friends', 'Teachers', 'Classmates']

      if (mode === 'edit' && gid) {
        const g = S.circles[gid]; if (!g) return
        $('gname').value = g.name; $('gemoji').value = g.emoji
        $('gyearS').value = g.yearStart || ''; $('gyearE').value = g.yearEnd || ''
        GM.color = g.color; GM.subgroups = (g.subgroups || []).map(s => s.label)
        document.querySelectorAll('.gtype-btn').forEach(b => {
          if (b.dataset.type === g.type) b.classList.add('sel')
          else b.classList.remove('sel')
        })
      } else {
        $('gname').value = ''; $('gemoji').value = '🏫'
        $('gyearS').value = ''; $('gyearE').value = ''
      }

      refreshGColorRow(); refreshGSgList()
      $('groupMo').classList.add('open'); $('gname').focus()
    }

    function closeGroupModal() { $('groupMo').classList.remove('open') }

    function refreshGColorRow() {
      document.querySelectorAll('.gcolor-swatch').forEach(s => s.classList.toggle('sel', s.dataset.color === GM.color))
    }

    function refreshGSgList() {
      const list = $('gsgList')
      list.innerHTML = GM.subgroups.map((sg, i) => `
        <div class="gsg-tag">${sg}<button class="gsg-tag-del" data-i="${i}">&times;</button></div>`).join('')
      list.querySelectorAll('.gsg-tag-del').forEach(btn => {
        btn.addEventListener('click', () => { GM.subgroups.splice(+btn.dataset.i, 1); refreshGSgList() })
      })
    }

    // Type button selection
    document.querySelectorAll('.gtype-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.gtype-btn').forEach(b => b.classList.remove('sel'))
        btn.classList.add('sel')
        $('gemoji').value = btn.dataset.emoji
        GM.color = btn.dataset.color; refreshGColorRow()
        GM.subgroups = btn.dataset.subs ? btn.dataset.subs.split(',') : []
        refreshGSgList()
      })
    })

    // Color swatches
    document.querySelectorAll('.gcolor-swatch').forEach(s => {
      s.addEventListener('click', () => { GM.color = s.dataset.color; refreshGColorRow() })
    })

    // Sub-group input
    $('gsgInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && $('gsgInput').value.trim()) {
        GM.subgroups.push($('gsgInput').value.trim()); $('gsgInput').value = ''; refreshGSgList()
      }
    })

    $('groupMsave').addEventListener('click', () => {
      const name = $('gname').value.trim(); if (!name) { $('gname').style.borderColor = 'var(--red)'; $('gname').focus(); return }
      $('gname').style.borderColor = ''
      const selType = document.querySelector('.gtype-btn.sel')

      if (GM.mode === 'create') {
        const gid = uid()
        // Preserve existing subgroups if editing, else create fresh
        const existingSubs = GM.subgroups.map(label => ({ id: uid(), label, memberIds: [] }))
        S.circles[gid] = {
          id: gid, name, type: selType?.dataset.type || 'custom',
          emoji: $('gemoji').value || (selType?.dataset.emoji) || '✏️',
          color: GM.color,
          yearStart: $('gyearS').value ? +$('gyearS').value : null,
          yearEnd: $('gyearE').value ? +$('gyearE').value : null,
          subgroups: existingSubs
        }
        toast('Group created!')
      } else {
        const g = S.circles[GM.gid]; if (!g) return
        // Preserve existing sub-group member lists when editing
        const existingMap = {}; (g.subgroups || []).forEach(s => existingMap[s.label] = s)
        g.name = name; g.type = selType?.dataset.type || 'custom'
        g.emoji = $('gemoji').value || (selType?.dataset.emoji) || '✏️'
        g.color = GM.color
        g.yearStart = $('gyearS').value ? +$('gyearS').value : null
        g.yearEnd = $('gyearE').value ? +$('gyearE').value : null
        g.subgroups = GM.subgroups.map(label =>
          existingMap[label] ? existingMap[label] : { id: uid(), label, memberIds: [] }
        )
        toast('Group updated!')
      }
      closeGroupModal(); save(); renderCirclesView()
    })

    // ════════════════════════════════════════════════════════
    //  PEOPLE LIST MODAL
    // ════════════════════════════════════════════════════════
    let PM = { gid: null, sgid: null, editNodeId: null }

    function avBg(gender) {
      return gender === 'male' ? 'linear-gradient(135deg,#4a7fb5,#2c5f8a)'
        : gender === 'female' ? 'linear-gradient(135deg,#c0607a,#8a3050)'
          : 'linear-gradient(135deg,#7a7060,#554c3a)'
    }

    const STR_LABELS = { close_friend: 'Close Friend', friend: 'Friend', acquaintance: 'Acquaintance', lost_touch: 'Lost Touch' }
    const STR_CLS = { close_friend: 'close', friend: 'friend', acquaintance: 'acquaintance', lost_touch: 'lost' }
    const STR_AV = { close_friend: 'str-close', friend: '', acquaintance: '', lost_touch: 'str-lost' }

    function openPeopleModal(gid, sgid) {
      PM.gid = gid; PM.sgid = sgid; PM.editNodeId = null
      const g = S.circles[gid]; if (!g) return
      const sg = (g.subgroups || []).find(s => s.id === sgid); if (!sg) return
      $('pmGroupLabel').textContent = `${g.emoji} ${g.name}`
      $('pmSubLabel').textContent = sg.label
      closeCpf(); closeLinkFam()
      renderPplList(g, sg)
      $('peopleMo').classList.add('open')
    }

    function closePeopleModal() { $('peopleMo').classList.remove('open'); closeCpf(); closeLinkFam() }
    $('peopleMclose').addEventListener('click', closePeopleModal)
    $('peopleMo').addEventListener('click', e => { if (e.target === $('peopleMo')) closePeopleModal() })

    function renderPplList(g, sg) {
      const list = $('pplList')
      const members = (sg.memberIds || []).map(id => S.nodes[id]).filter(Boolean)
      if (!members.length) {
        list.innerHTML = '<div class="ppl-empty">No one here yet.<br><span style="font-size:12px">Add people using the buttons below.</span></div>'
        return
      }
      list.innerHTML = members.map(n => {
        const str = n.relationshipStrength || 'friend'
        const isFam = n.parentIds?.length || n.childrenIds?.length || n.isRoot
        return `<div class="ppl-row" data-nid="${n.id}">
          <div class="ppl-av ${STR_AV[str]}" style="background:${avBg(n.gender)}">${ini(n.fullName)}</div>
          <div class="ppl-info">
            <div class="ppl-name">${n.fullName || '(No name)'}</div>
            ${n.nickname ? `<div class="ppl-nick">"${n.nickname}"</div>` : ''}
            <span class="ppl-badge ${STR_CLS[str]}">${STR_LABELS[str]}</span>
            ${isFam ? '<span class="ppl-badge family" style="margin-left:4px">🌳 Family</span>' : ''}
          </div>
          <div class="ppl-actions">
            <button class="ppl-act edit" data-nid="${n.id}" title="Edit">✏️</button>
            <button class="ppl-act del" data-nid="${n.id}" title="Remove">🗑</button>
          </div>
        </div>`
      }).join('')

      list.querySelectorAll('.ppl-act.edit').forEach(btn => {
        btn.addEventListener('click', () => openCpf('edit', btn.dataset.nid))
      })
      list.querySelectorAll('.ppl-act.del').forEach(btn => {
        btn.addEventListener('click', () => {
          const g2 = S.circles[PM.gid]; if (!g2) return
          const sg2 = (g2.subgroups || []).find(s => s.id === PM.sgid); if (!sg2) return
          confirm2('Remove person?', 'They will stay in the family tree if they are a family member.', () => {
            sg2.memberIds = (sg2.memberIds || []).filter(id => id !== btn.dataset.nid)
            save(); renderCirclesView(); const g3 = S.circles[PM.gid]; const sg3 = (g3?.subgroups || []).find(s => s.id === PM.sgid)
            if (g3 && sg3) renderPplList(g3, sg3); else closePeopleModal()
            toast('Removed.')
          })
        })
      })
    }

    // ADD / EDIT INLINE FORM
    function openCpf(mode, nodeId = null) {
      PM.editNodeId = mode === 'edit' ? nodeId : null
      closeLinkFam()
      $('cpfTitle').textContent = mode === 'edit' ? 'Edit Person' : 'Add Person'
      $('cpfName').value = ''; $('cpfNick').value = ''; $('cpfGender').value = 'unknown'
      $('cpfPhone').value = ''; $('cpfMet').value = ''; $('cpfMetOn').value = ''; $('cpfNote').value = ''
      // Reset str radio
      document.querySelectorAll('.str-radio').forEach(r => r.classList.remove('sel'))
      document.querySelector('.str-radio[data-val="close_friend"]').classList.add('sel')
      document.querySelector('input[name="str"][value="close_friend"]').checked = true

      if (mode === 'edit' && nodeId) {
        const n = S.nodes[nodeId]; if (!n) return
        $('cpfName').value = n.fullName; $('cpfNick').value = n.nickname || ''
        $('cpfGender').value = n.gender || 'unknown'; $('cpfPhone').value = n.phone || ''
        $('cpfMet').value = n.howWeMet || ''; $('cpfMetOn').value = n.metOn || ''; $('cpfNote').value = n.privateNote || ''
        const str = n.relationshipStrength || 'close_friend'
        document.querySelectorAll('.str-radio').forEach(r => r.classList.toggle('sel', r.dataset.val === str))
        const ri = document.querySelector(`input[name="str"][value="${str}"]`); if (ri) ri.checked = true
      }
      $('circlePersonForm').classList.add('open')
      $('cpfName').focus()
    }
    function closeCpf() { $('circlePersonForm').classList.remove('open'); PM.editNodeId = null }

    // Relationship radio UX
    document.querySelectorAll('.str-radio').forEach(label => {
      label.addEventListener('click', () => {
        document.querySelectorAll('.str-radio').forEach(r => r.classList.remove('sel'))
        label.classList.add('sel')
      })
    })

    $('btnAddPerson').addEventListener('click', () => {
      closeLinkFam(); openCpf('add')
    })
    $('cpfCancel').addEventListener('click', closeCpf)

    $('cpfSave').addEventListener('click', () => {
      const name = $('cpfName').value.trim(); if (!name) { $('cpfName').style.borderColor = 'var(--red)'; $('cpfName').focus(); return }
      $('cpfName').style.borderColor = ''
      const strVal = document.querySelector('input[name="str"]:checked')?.value || 'friend'
      const data = {
        fullName: name, nickname: $('cpfNick').value.trim(), gender: $('cpfGender').value,
        phone: $('cpfPhone').value.trim(), howWeMet: $('cpfMet').value.trim(),
        metOn: $('cpfMetOn').value, privateNote: $('cpfNote').value.trim(),
        relationshipStrength: strVal
      }

      if (PM.editNodeId) {
        // Editing existing node
        const n = S.nodes[PM.editNodeId]; if (!n) return
        Object.assign(n, data)
        toast('Updated!')
      } else {
        // New node — create and add to subgroup
        const nid = uid()
        S.nodes[nid] = { id: nid, parentIds: [], childrenIds: [], spouseId: null, siblingIds: [], isRoot: false, x: 0, y: 0, label: '', ...data }
        const g = S.circles[PM.gid]; if (!g) return
        const sg = (g.subgroups || []).find(s => s.id === PM.sgid); if (!sg) return
        if (!sg.memberIds) sg.memberIds = []
        sg.memberIds.push(nid)
        toast('Person added!')
      }

      save(); renderCirclesView()
      const g2 = S.circles[PM.gid]; const sg2 = (g2?.subgroups || []).find(s => s.id === PM.sgid)
      if (g2 && sg2) renderPplList(g2, sg2)
      closeCpf()
    })

    // LINK FROM FAMILY TREE
    $('btnLinkFam').addEventListener('click', () => {
      closeCpf()
      const lfs = $('linkFamSearch')
      lfs.classList.toggle('open')
      if (lfs.classList.contains('open')) {
        $('linkFamInput').value = ''; renderLinkFamResults(''); $('linkFamInput').focus()
      }
    })
    function closeLinkFam() { $('linkFamSearch').classList.remove('open'); $('linkFamResults').innerHTML = '' }

    $('linkFamInput').addEventListener('input', function () { renderLinkFamResults(this.value.trim().toLowerCase()) })

    function renderLinkFamResults(q) {
      const out = $('linkFamResults')
      const g = S.circles[PM.gid]; const sg = g && (g.subgroups || []).find(s => s.id === PM.sgid)
      const existing = new Set(sg?.memberIds || [])
      let candidates = Object.values(S.nodes).filter(n => !existing.has(n.id) && (n.parentIds?.length || n.childrenIds?.length || n.isRoot))
      if (q) candidates = candidates.filter(n => mn(n, q))
      if (!candidates.length) { out.innerHTML = '<div style="padding:8px 12px;color:var(--ink-faint);font-size:12px">No family members found.</div>'; return }
      out.innerHTML = candidates.slice(0, 20).map(n => `
        <div class="lfr-item" data-nid="${n.id}">
          <div class="lfr-av" style="background:${avBg(n.gender)}">${ini(n.fullName)}</div>
          <div><div class="lfr-name">${n.fullName || '(No name)'}</div>
          <div class="lfr-sub">${n.nickname ? `"${n.nickname}" · ` : ''}${n.label || ''} 🌳</div></div>
        </div>`).join('')
      out.querySelectorAll('.lfr-item').forEach(el => {
        el.addEventListener('click', () => {
          if (!sg) return
          if (!sg.memberIds) sg.memberIds = []
          if (sg.memberIds.includes(el.dataset.nid)) { toast('Already in this sub-group'); return }
          sg.memberIds.push(el.dataset.nid)
          save(); closeLinkFam(); renderCirclesView(); renderPplList(g, sg); toast('Linked from family tree!')
        })
      })
    }

    // ════════════════════════════════════════════════════════
    //  SEARCH UPGRADE (Family + Circles)
    // ════════════════════════════════════════════════════════
    function doSearch(q, inputEl) {
      if (S.mode === 'family') { renderConns(); renderNodes() }
      const res = $('sr')
      if (!q) { res.classList.remove('open'); return }

      const matches = []

      // Family matches
      Object.values(S.nodes).forEach(n => {
        if (!mn(n, q)) return
        // Check if also in circles
        const circleBadges = []
        Object.values(S.circles).forEach(g => {
          (g.subgroups || []).forEach(sg => {
            if ((sg.memberIds || []).includes(n.id)) circleBadges.push(`🔵 ${g.name} › ${sg.label}`)
          })
        })
        const isFamNode = n.parentIds?.length || n.childrenIds?.length || n.isRoot
        matches.push({ n, badges: isFamNode ? ['🌳 Family', ...circleBadges] : circleBadges.length ? circleBadges : ['🌳 Family'] })
      })

      // Circles-only members (not in family at all)
      const famIds = new Set(Object.values(S.nodes).map(n => n.id))
      // already covered above since all nodes share the same S.nodes pool

      if (!matches.length) { res.innerHTML = '<div class="sri" style="color:var(--ink-faint)">No results</div>'; res.classList.add('open'); return }

      res.innerHTML = matches.slice(0, 10).map(({ n, badges }) =>
        `<div class="sri" data-id="${n.id}">
          <strong>${n.fullName || '(No name)'}</strong>${n.nickname ? ` · "${n.nickname}"` : ''}
          <div style="margin-top:3px;display:flex;gap:4px;flex-wrap:wrap">${badges.map(b => `<span style="font-size:10px;color:var(--gold-lt)">${b}</span>`).join('')}</div>
        </div>`).join('')
      res.classList.add('open')

      if (inputEl.id === 's2') {
        res.style.top = (inputEl.offsetTop + inputEl.offsetHeight + 6) + 'px'
        res.style.left = inputEl.offsetLeft + 'px'; res.style.right = (inputEl.parentElement.offsetWidth - (inputEl.offsetLeft + inputEl.offsetWidth)) + 'px'
        res.style.width = inputEl.offsetWidth + 'px'
      } else { res.style.top = ''; res.style.left = ''; res.style.right = ''; res.style.width = '' }

      res.querySelectorAll('.sri[data-id]').forEach(el => {
        el.addEventListener('click', () => {
          const node = S.nodes[el.dataset.id]; if (!node) return
          inputEl.value = ''; res.classList.remove('open')
          if (S.mode === 'circles') switchMode('family')
          renderConns(); renderNodes(); panTo(node); selNode(node.id)
          if (inputEl.id === 's2') { $('mdd').classList.remove('open'); $('mbtn').classList.remove('open') }
        })
      })
    }

    // ════════════════════════════════════════════════════════
    //  EXPORT / IMPORT UPGRADE (v2.0)
    // ════════════════════════════════════════════════════════
    function buildExportData(includePrivate) {
      const exportNodes = {}
      Object.entries(S.nodes).forEach(([k, v]) => {
        const n = { ...v }
        if (!includePrivate) delete n.privateNote
        exportNodes[k] = n
      })
      return JSON.stringify({
        version: '2.0', exportedAt: new Date().toISOString(),
        rootNodeId: S.rootId, nodes: exportNodes,
        circles: S.circles, settings: { exportPrivateNotes: includePrivate }
      }, null, 2)
    }

    function doExport() {
      confirm2('Export Options', 'Include private notes in the export?', () => {
        const blob = new Blob([buildExportData(true)], { type: 'application/json' })
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = `circles-${new Date().toISOString().slice(0, 10)}.json`; a.click()
        URL.revokeObjectURL(a.href); toast('Exported with private notes!')
      })
      // Also trigger the default no-private-notes export immediately via backdrop dismiss
      // Actually: show a toast and immediately export without notes (cancel = no notes)
      const blob = new Blob([buildExportData(false)], { type: 'application/json' })
      const downloadDefault = () => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = `circles-${new Date().toISOString().slice(0, 10)}.json`; a.click()
        URL.revokeObjectURL(a.href); toast('Exported!')
      }
      // Override: use a simple approach — export without notes, and the confirm is "include private?"
      // Re-wire confirm to only export with private if YES pressed
      // We already hooked confirm2 above, so just make "no" export default
      const origCb = S.confirmCb
      const cno = $('cno')
      const origCnoClick = cno.onclick
      cno.onclick = () => {
        $('co').classList.remove('open'); S.confirmCb = null
        downloadDefault(); cno.onclick = origCnoClick
      }
    }

    function doImport(file, onDone) {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const d = JSON.parse(e.target.result)
          if (!d.nodes || !d.rootNodeId) throw new Error('Invalid format')
          const count = Object.keys(d.nodes).length
          const hasCircles = d.circles && Object.keys(d.circles).length > 0
          confirm2(
            `Import ${count} people${hasCircles ? ' + circles' : ''}?`,
            'This will replace your current data. Export first to keep a backup.',
            () => {
              S.nodes = d.nodes; S.rootId = d.rootNodeId
              S.circles = d.circles || {}; S.settings = d.settings || { exportPrivateNotes: false }
              S.selId = null; closePanel(); save(); render()
              if (S.mode === 'circles') renderCirclesView()
              centre(); toast(`Imported ${count} people${hasCircles ? ' + circles' : ''}!`)
            }
          )
        } catch (err) { toast('Invalid file. Use a Circles JSON export.') }
      }
      reader.readAsText(file); if (onDone) onDone()
    }

    // Wire up export/import buttons (override previous handlers)
    $('exp').onclick = doExport
    $('imp').onchange = function () { const f = this.files[0]; if (!f) return; doImport(f, () => { this.value = '' }) }
    $('mexp').onclick = () => { $('mdd').classList.remove('open'); $('mbtn').classList.remove('open'); doExport() }
    $('mimp').onchange = function () {
      const f = this.files[0]; if (!f) return
      $('mdd').classList.remove('open'); $('mbtn').classList.remove('open')
      doImport(f, () => { this.value = '' })
    }

    // ════════════════════════════════════════════════════════
    //  INIT
    // ════════════════════════════════════════════════════════
    function init() {
      const ok = load()
      if (!ok || !Object.keys(S.nodes).length) initRoot()
      centre(); render(); initWelcome()
    }
    init()

    // PWA
    if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('circles-sw.js').catch(() => { }) }) }

  