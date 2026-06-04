import { useEffect, useMemo, useState } from 'react';

const KEY = 'food-menu-memory-v1';
const emptyForm = {
  name: '', district: '', address: '', mapUrl: '', phone: '', hours: '',
  status: '想食', priority: '⭐⭐', tags: '', notes: '', menuText: '', photos: []
};
const sample = [{
  id: 'sample-1', name: '澳門金非豬潤麵', district: '澳門半島', address: '澳門東方斜巷15號A地下',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=澳門金非豬潤麵', phone: '28352974 / 66473133',
  hours: '早餐 8:00–11:00；午市 11:00–17:30', status: '想食', priority: '⭐⭐⭐',
  tags: '豬潤麵, 茶餐廳, 午餐, 澳門', notes: '示範資料，可自行修改或刪除。',
  menuText: '招牌新鮮豬潤麵 45\n特餐A 47\n香煎豬扒或雞扒常餐 48\n金非滷肉煎蛋飯 52\n麻辣豬紅 25\n自家製山楂水 20',
  photos: [], createdAt: new Date().toISOString()
}];

function loadData(){
  try { return JSON.parse(localStorage.getItem(KEY)) || sample; } catch { return sample; }
}
function saveData(items){ localStorage.setItem(KEY, JSON.stringify(items)); }
function asText(item){ return Object.values(item).flat().join(' ').toLowerCase(); }

export default function App(){
  const [items,setItems] = useState(loadData);
  const [form,setForm] = useState(emptyForm);
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('全部');
  const [editingId,setEditingId] = useState(null);
  const [activePhoto,setActivePhoto] = useState(null);

  useEffect(()=>saveData(items),[items]);

  const results = useMemo(()=>{
    const q = query.trim().toLowerCase();
    return items.filter(item => (filter==='全部'||item.status===filter) && (!q || asText(item).includes(q)));
  },[items,query,filter]);

  function update(field,value){ setForm(prev=>({...prev,[field]:value})); }
  function clearForm(){ setForm(emptyForm); setEditingId(null); }
  function addPhotos(files){
    [...files].slice(0,8).forEach(file=>{
      if(!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => setForm(prev=>({...prev, photos:[...(prev.photos||[]), e.target.result]}));
      reader.readAsDataURL(file);
    });
  }
  function submit(e){
    e.preventDefault();
    if(!form.name.trim()) return alert('請至少輸入餐廳名稱');
    const next = {...form, id: editingId || crypto.randomUUID(), updatedAt:new Date().toISOString(), createdAt: form.createdAt || new Date().toISOString()};
    setItems(prev => editingId ? prev.map(x=>x.id===editingId?next:x) : [next,...prev]);
    clearForm();
  }
  function edit(item){ setForm(item); setEditingId(item.id); window.scrollTo({top:0,behavior:'smooth'}); }
  function remove(id){ if(confirm('確定刪除？')) setItems(prev=>prev.filter(x=>x.id!==id)); }
  function exportJson(){
    const blob = new Blob([JSON.stringify(items,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href=url; a.download='food-menu-memory.json'; a.click(); URL.revokeObjectURL(url);
  }
  function importJson(file){
    const reader = new FileReader();
    reader.onload = e => { try{ setItems(JSON.parse(e.target.result)); } catch { alert('JSON格式不正確'); } };
    reader.readAsText(file);
  }

  return <main className="app">
    <header className="hero">
      <div><p className="eyebrow">私人美食記憶庫</p><h1>想食清單</h1><p>影低菜牌、記低價錢、地址、電話同 Google Map；需要時即刻搜尋返。</p></div>
      <div className="heroStats"><b>{items.length}</b><span>間食肆</span></div>
    </header>

    <section className="panel">
      <h2>{editingId?'修改食肆':'新增食肆 / 菜牌'}</h2>
      <form onSubmit={submit} className="form">
        <input placeholder="餐廳名稱 *" value={form.name} onChange={e=>update('name',e.target.value)} />
        <input placeholder="地區，例如 新馬路 / 氹仔 / 黑沙環" value={form.district} onChange={e=>update('district',e.target.value)} />
        <input placeholder="地址" value={form.address} onChange={e=>update('address',e.target.value)} />
        <input placeholder="Google Map 連結" value={form.mapUrl} onChange={e=>update('mapUrl',e.target.value)} />
        <input placeholder="電話 / WhatsApp" value={form.phone} onChange={e=>update('phone',e.target.value)} />
        <input placeholder="營業時間" value={form.hours} onChange={e=>update('hours',e.target.value)} />
        <select value={form.status} onChange={e=>update('status',e.target.value)}><option>想食</option><option>已食</option><option>再食</option><option>唔再去</option></select>
        <select value={form.priority} onChange={e=>update('priority',e.target.value)}><option>⭐</option><option>⭐⭐</option><option>⭐⭐⭐</option></select>
        <input placeholder="標籤：午餐, 宵夜, 平, 家庭, 見客" value={form.tags} onChange={e=>update('tags',e.target.value)} />
        <textarea placeholder="菜式及價錢，每行一項" value={form.menuText} onChange={e=>update('menuText',e.target.value)} />
        <textarea placeholder="備註：朋友推介、想食原因、排隊情況" value={form.notes} onChange={e=>update('notes',e.target.value)} />
        <label className="upload">＋ 加菜牌相（可多張）<input type="file" accept="image/*" multiple onChange={e=>addPhotos(e.target.files)} /></label>
        {!!form.photos?.length && <div className="thumbs">{form.photos.map((p,i)=><button type="button" key={i} onClick={()=>setActivePhoto(p)}><img src={p}/></button>)}</div>}
        <div className="actions"><button className="primary">{editingId?'儲存修改':'加入清單'}</button><button type="button" onClick={clearForm}>清空</button></div>
      </form>
    </section>

    <section className="toolbar">
      <input placeholder="搜尋：餐廳、菜式、價錢、地區、標籤..." value={query} onChange={e=>setQuery(e.target.value)} />
      <select value={filter} onChange={e=>setFilter(e.target.value)}><option>全部</option><option>想食</option><option>已食</option><option>再食</option><option>唔再去</option></select>
      <button onClick={exportJson}>匯出備份</button>
      <label className="smallUpload">匯入<input type="file" accept="application/json" onChange={e=>e.target.files[0]&&importJson(e.target.files[0])}/></label>
    </section>

    <section className="grid">
      {results.map(item=><article className="card" key={item.id}>
        <div className="cardTop"><div><h3>{item.name}</h3><p>{item.district} · {item.status} · {item.priority}</p></div></div>
        <div className="meta">{item.hours && <span>🕒 {item.hours}</span>}{item.address && <span>📍 {item.address}</span>}{item.phone && <span>☎️ {item.phone}</span>}</div>
        {item.menuText && <pre>{item.menuText}</pre>}
        {item.notes && <p className="note">{item.notes}</p>}
        {item.tags && <p className="tags">{item.tags.split(',').map(t=><span key={t}>{t.trim()}</span>)}</p>}
        {!!item.photos?.length && <div className="thumbs">{item.photos.map((p,i)=><button key={i} onClick={()=>setActivePhoto(p)}><img src={p}/></button>)}</div>}
        <div className="actions wrap">
          {item.mapUrl && <a className="button" href={item.mapUrl} target="_blank">地圖</a>}
          {item.phone && <a className="button" href={`tel:${item.phone.split('/')[0].replace(/\D/g,'')}`}>致電</a>}
          <button onClick={()=>edit(item)}>修改</button><button onClick={()=>remove(item.id)}>刪除</button>
        </div>
      </article>)}
      {!results.length && <p className="empty">搵唔到結果。</p>}
    </section>
    {activePhoto && <div className="lightbox" onClick={()=>setActivePhoto(null)}><img src={activePhoto}/></div>}
  </main>
}