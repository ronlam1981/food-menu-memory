import { useEffect, useMemo, useState } from 'react';

const KEY = 'food-menu-memory-v2';
const STATUSES = ['想食', '已食', '再食', '唔再去'];

const emptyForm = {
  name: '', district: '', address: '', mapUrl: '', phone: '', hours: '',
  website: '', status: '想食', priority: '⭐⭐', tags: '',
  notes: '', review: '', rating: '', menuText: '', photos: []
};

const sample = [{
  id: 'sample-1', name: '澳門金非豬潤麵', district: '澳門半島',
  address: '澳門東方斜巷15號A地下',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=澳門金非豬潤麵',
  phone: '28352974', hours: '早餐 8:00–11:00；午市 11:00–17:30',
  website: '', status: '想食', priority: '⭐⭐⭐', tags: '豬潤麵, 茶餐廳, 澳門',
  notes: '示範資料，朋友大力推介，話豬潤非常新鮮。',
  review: '', rating: '',
  menuText: '招牌新鮮豬潤麵 $45\n特餐A（豬潤＋例湯）$47\n香煎豬扒常餐 $48\n金非滷肉煎蛋飯 $52\n麻辣豬紅 $25\n自家製山楂水 $20\n港式奶茶 $15',
  photos: [], createdAt: new Date().toISOString()
}];

function loadData() {
  try { return JSON.parse(localStorage.getItem(KEY)) || sample; } catch { return sample; }
}
function saveData(items) { localStorage.setItem(KEY, JSON.stringify(items)); }

function parseMenu(text) {
  if (!text) return [];
  return text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const m = line.match(/^(.+?)\s+[\$＄]?(\d+(?:\.\d+)?)(.*)$/);
    if (m) return { name: m[1].trim(), price: m[2], suffix: m[3].trim(), raw: line };
    return { name: line, price: '', suffix: '', raw: line };
  });
}

function highlightText(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function App() {
  const [items, setItems] = useState(loadData);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('全部');
  const [editingId, setEditingId] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [searchMode, setSearchMode] = useState('全部'); // '全部' | '菜式' | '餐廳'

  useEffect(() => saveData(items), [items]);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    return items.filter(item => {
      const statusOk = filter === '全部' || item.status === filter;
      if (!statusOk) return false;
      if (!q) return true;
      if (searchMode === '菜式') return item.menuText?.toLowerCase().includes(q);
      if (searchMode === '餐廳') return item.name?.toLowerCase().includes(q) || item.district?.toLowerCase().includes(q) || item.tags?.toLowerCase().includes(q);
      return Object.values(item).flat().join(' ').toLowerCase().includes(q);
    });
  }, [items, q, filter, searchMode]);

  const stats = useMemo(() => ({
    total: items.length,
    想食: items.filter(x => x.status === '想食').length,
    已食: items.filter(x => x.status === '已食').length,
    再食: items.filter(x => x.status === '再食').length,
  }), [items]);

  function update(field, value) { setForm(prev => ({ ...prev, [field]: value })); }
  function clearForm() { setForm(emptyForm); setEditingId(null); setShowForm(false); }

  function addPhotos(files) {
    [...files].slice(0, 8).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => setForm(prev => ({ ...prev, photos: [...(prev.photos || []), e.target.result] }));
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(idx) {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return alert('請至少輸入餐廳名稱');
    const next = {
      ...form, id: editingId || crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      createdAt: form.createdAt || new Date().toISOString()
    };
    setItems(prev => editingId ? prev.map(x => x.id === editingId ? next : x) : [next, ...prev]);
    clearForm();
  }

  function edit(item) {
    setForm(item); setEditingId(item.id);
    setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function remove(id) { if (confirm('確定刪除此食肆？')) setItems(prev => prev.filter(x => x.id !== id)); }

  function changeStatus(id, status) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, status, updatedAt: new Date().toISOString() } : x));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'food-menu-memory.json'; a.click(); URL.revokeObjectURL(url);
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try { setItems(JSON.parse(e.target.result)); alert('匯入成功！'); }
      catch { alert('JSON格式不正確'); }
    };
    reader.readAsText(file);
  }

  const statusColor = { '想食': '#f97316', '已食': '#22c55e', '再食': '#3b82f6', '唔再去': '#94a3b8' };

  return (
    <main className="app">
      {/* HERO */}
      <header className="hero">
        <div className="heroContent">
          <p className="eyebrow">私人美食記憶庫</p>
          <h1>🍜 想食清單</h1>
          <p className="heroDesc">影低菜牌・記低感受・即搵即到</p>
          <div className="heroStats">
            <div className="stat"><span className="statNum">{stats.total}</span><span className="statLabel">間食肆</span></div>
            <div className="stat"><span className="statNum" style={{ color: '#f97316' }}>{stats.想食}</span><span className="statLabel">想食</span></div>
            <div className="stat"><span className="statNum" style={{ color: '#22c55e' }}>{stats.已食}</span><span className="statLabel">已食</span></div>
            <div className="stat"><span className="statNum" style={{ color: '#3b82f6' }}>{stats.再食}</span><span className="statLabel">再食</span></div>
          </div>
        </div>
        <button className="addBtn" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}>
          ＋ 新增食肆
        </button>
      </header>

      {/* SEARCH & FILTER */}
      <section className="toolbar">
        <div className="searchRow">
          <div className="searchBox">
            <span className="searchIcon">🔍</span>
            <input
              placeholder="搜尋菜式、餐廳、地區、標籤…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <button className="clearSearch" onClick={() => setQuery('')}>✕</button>}
          </div>
          <select value={searchMode} onChange={e => setSearchMode(e.target.value)} className="searchMode">
            <option value="全部">全文搜尋</option>
            <option value="菜式">按菜式搜尋</option>
            <option value="餐廳">按餐廳搜尋</option>
          </select>
        </div>
        <div className="filterTabs">
          {['全部', '想食', '已食', '再食', '唔再去'].map(s => (
            <button
              key={s}
              className={`filterTab ${filter === s ? 'active' : ''}`}
              style={filter === s && s !== '全部' ? { background: statusColor[s] } : {}}
              onClick={() => setFilter(s)}
            >
              {s} {s !== '全部' && <span className="tabCount">{items.filter(x => x.status === s).length}</span>}
            </button>
          ))}
        </div>
        <div className="toolbarRight">
          <span className="resultCount">{results.length} 間</span>
          <button className="iconBtn" onClick={exportJson} title="匯出備份">💾 備份</button>
          <label className="iconBtn" title="匯入">
            📂 匯入<input type="file" accept="application/json" onChange={e => e.target.files[0] && importJson(e.target.files[0])} />
          </label>
        </div>
      </section>

      {/* SEARCH HINT */}
      {q && searchMode === '菜式' && (
        <div className="searchHint">
          🍽 搜尋菜式「{query}」— 以下餐廳菜牌中有此項目
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <div className="modalOverlay" onClick={e => e.target === e.currentTarget && clearForm()}>
          <div className="modal">
            <div className="modalHeader">
              <h2>{editingId ? '修改食肆' : '新增食肆 / 菜牌'}</h2>
              <button className="closeBtn" onClick={clearForm}>✕</button>
            </div>
            <form onSubmit={submit} className="form">
              <div className="formSection">
                <h3>📋 基本資料</h3>
                <div className="formGrid">
                  <input className="span2" placeholder="餐廳名稱 *" value={form.name} onChange={e => update('name', e.target.value)} required />
                  <input placeholder="地區（如：旺角、中環）" value={form.district} onChange={e => update('district', e.target.value)} />
                  <input placeholder="電話 / WhatsApp" value={form.phone} onChange={e => update('phone', e.target.value)} />
                  <input className="span2" placeholder="地址" value={form.address} onChange={e => update('address', e.target.value)} />
                  <input className="span2" placeholder="Google Map 連結" value={form.mapUrl} onChange={e => update('mapUrl', e.target.value)} />
                  <input className="span2" placeholder="營業時間（如：週一至日 11:00–22:00；週三休息）" value={form.hours} onChange={e => update('hours', e.target.value)} />
                  <input className="span2" placeholder="網站 / Facebook / Instagram" value={form.website} onChange={e => update('website', e.target.value)} />
                </div>
              </div>

              <div className="formSection">
                <h3>🏷 分類</h3>
                <div className="formGrid">
                  <div className="formField">
                    <label>狀態</label>
                    <select value={form.status} onChange={e => update('status', e.target.value)}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="formField">
                    <label>優先級</label>
                    <select value={form.priority} onChange={e => update('priority', e.target.value)}>
                      <option>⭐</option><option>⭐⭐</option><option>⭐⭐⭐</option>
                    </select>
                  </div>
                  <input className="span2" placeholder="標籤（用逗號分隔：午餐, 宵夜, 火鍋, 見客）" value={form.tags} onChange={e => update('tags', e.target.value)} />
                </div>
              </div>

              <div className="formSection">
                <h3>🍽 菜牌內容</h3>
                <p className="formHint">每行一項，格式：菜式名稱 價錢（例：叉燒飯 $45）</p>
                <textarea
                  className="menuInput"
                  placeholder={'例：\n叉燒飯 $45\n雞腿飯 $48\n例湯 $15\n凍檸茶 $18'}
                  value={form.menuText}
                  onChange={e => update('menuText', e.target.value)}
                  rows={8}
                />
                <label className="uploadBtn">
                  📷 上載菜牌相片（可多張）
                  <input type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} />
                </label>
                {!!form.photos?.length && (
                  <div className="thumbs">
                    {form.photos.map((p, i) => (
                      <div key={i} className="thumbWrap">
                        <img src={p} onClick={() => setActivePhoto(p)} />
                        <button type="button" className="removePhoto" onClick={() => removePhoto(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="formSection">
                <h3>💬 筆記與感受</h3>
                <textarea
                  placeholder="想食原因、朋友推介、注意事項…"
                  value={form.notes}
                  onChange={e => update('notes', e.target.value)}
                  rows={3}
                />
                {(form.status === '已食' || form.status === '再食') && (
                  <>
                    <div className="formGrid" style={{ marginTop: 8 }}>
                      <div className="formField">
                        <label>食後評分</label>
                        <select value={form.rating} onChange={e => update('rating', e.target.value)}>
                          <option value="">未評分</option>
                          <option value="😍 非常好">😍 非常好</option>
                          <option value="😊 好食">😊 好食</option>
                          <option value="😐 一般">😐 一般</option>
                          <option value="😕 唔係咁好">😕 唔係咁好</option>
                          <option value="😞 唔好食">😞 唔好食</option>
                        </select>
                      </div>
                    </div>
                    <textarea
                      placeholder="食後感受：味道、服務、環境、性價比…"
                      value={form.review}
                      onChange={e => update('review', e.target.value)}
                      rows={3}
                      style={{ marginTop: 8 }}
                    />
                  </>
                )}
              </div>

              <div className="formActions">
                <button type="submit" className="primaryBtn">{editingId ? '儲存修改' : '加入清單'}</button>
                <button type="button" className="secondaryBtn" onClick={clearForm}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CARDS GRID */}
      <section className="grid">
        {results.map(item => {
          const menuItems = parseMenu(item.menuText);
          const matchingItems = q && searchMode === '菜式'
            ? menuItems.filter(m => m.raw.toLowerCase().includes(q))
            : [];
          const isExpanded = expandedId === item.id;

          return (
            <article className="card" key={item.id}>
              {/* Card Header */}
              <div className="cardHeader">
                <div className="cardTitleRow">
                  <h3>{highlightText(item.name, searchMode === '餐廳' ? query : '')}</h3>
                  <span className="statusBadge" style={{ background: statusColor[item.status] }}>
                    {item.status}
                  </span>
                </div>
                <div className="cardMeta">
                  {item.district && <span>📍 {item.district}</span>}
                  {item.priority && <span>{item.priority}</span>}
                  {item.rating && <span>{item.rating}</span>}
                </div>
              </div>

              {/* Info */}
              <div className="cardInfo">
                {item.address && <div className="infoRow"><span className="infoIcon">🏠</span><span>{item.address}</span></div>}
                {item.phone && <div className="infoRow"><span className="infoIcon">📞</span><a href={`tel:${item.phone.replace(/\D/g, '')}`}>{item.phone}</a></div>}
                {item.hours && <div className="infoRow"><span className="infoIcon">🕒</span><span>{item.hours}</span></div>}
                {item.website && <div className="infoRow"><span className="infoIcon">🌐</span><a href={item.website} target="_blank" rel="noreferrer">網站連結</a></div>}
              </div>

              {/* Tags */}
              {item.tags && (
                <div className="tags">
                  {item.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                    <span key={t} className="tag" onClick={() => setQuery(t)}>{t}</span>
                  ))}
                </div>
              )}

              {/* Search match highlight */}
              {matchingItems.length > 0 && (
                <div className="matchBox">
                  <p className="matchTitle">🎯 菜牌中含「{query}」的項目：</p>
                  {matchingItems.map((m, i) => (
                    <div key={i} className="matchItem">
                      <span>{highlightText(m.name, query)}</span>
                      {m.price && <span className="matchPrice">${m.price}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {item.notes && <p className="noteText">💡 {item.notes}</p>}
              {item.review && <p className="reviewText">✍️ {item.review}</p>}

              {/* Menu Preview */}
              {menuItems.length > 0 && (
                <div className="menuSection">
                  <button className="menuToggle" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                    🍽 菜牌 ({menuItems.length} 項) {isExpanded ? '▲' : '▼'}
                  </button>
                  {isExpanded && (
                    <div className="menuList">
                      {menuItems.map((m, i) => (
                        <div key={i} className={`menuRow ${q && m.raw.toLowerCase().includes(q) ? 'menuHighlight' : ''}`}>
                          <span className="menuName">{highlightText(m.name, q)}</span>
                          {m.price && <span className="menuPrice">${m.price}{m.suffix}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Photos */}
              {!!item.photos?.length && (
                <div className="thumbs">
                  {item.photos.map((p, i) => (
                    <button key={i} type="button" onClick={() => setActivePhoto(p)}>
                      <img src={p} alt="" />
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="cardActions">
                <div className="statusBtns">
                  {STATUSES.filter(s => s !== item.status).map(s => (
                    <button key={s} className="statusBtn" style={{ '--c': statusColor[s] }} onClick={() => changeStatus(item.id, s)}>
                      → {s}
                    </button>
                  ))}
                </div>
                <div className="editBtns">
                  {item.mapUrl && <a className="iconLink" href={item.mapUrl} target="_blank" rel="noreferrer">🗺 地圖</a>}
                  <button className="editBtn" onClick={() => edit(item)}>✏️ 修改</button>
                  <button className="deleteBtn" onClick={() => remove(item.id)}>🗑</button>
                </div>
              </div>
            </article>
          );
        })}
        {!results.length && (
          <div className="empty">
            <p>😕 搵唔到結果</p>
            <p>試下改變搜尋條件，或者<button onClick={() => { setQuery(''); setFilter('全部'); }}>重設篩選</button></p>
          </div>
        )}
      </section>

      {/* LIGHTBOX */}
      {activePhoto && (
        <div className="lightbox" onClick={() => setActivePhoto(null)}>
          <img src={activePhoto} alt="" />
          <button className="lightboxClose" onClick={() => setActivePhoto(null)}>✕</button>
        </div>
      )}
    </main>
  );
}
