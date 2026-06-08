import { useEffect, useMemo, useState } from 'react';

const KEY = 'food-menu-memory-v2';
const legacyKey = 'food-menu-memory-v1';
const emptyForm = {
  name: '',
  district: '',
  address: '',
  phone: '',
  hours: '',
  status: '想食',
  menuText: '',
  rawText: '',
  notes: '',
  photos: []
};
const sample = [{
  id: 'sample-1',
  name: '澳門金非豬潤麵',
  district: '澳門半島',
  address: '澳門東方斜巷15號A地下',
  phone: '28352974 / 66473133',
  hours: '早餐 8:00–11:00；午市 11:00–17:30',
  status: '想食',
  menuText: '招牌新鮮豬潤麵 45\n特餐A 47\n香煎豬扒或雞扒常餐 48\n金非滷肉煎蛋飯 52',
  rawText: '',
  notes: '示範資料，可自行修改或刪除。',
  photos: [],
  createdAt: new Date().toISOString()
}];

function loadData(){
  try {
    const saved = localStorage.getItem(KEY) || localStorage.getItem(legacyKey);
    return saved ? JSON.parse(saved) : sample;
  } catch {
    return sample;
  }
}
function saveData(items){ localStorage.setItem(KEY, JSON.stringify(items)); }
function asText(item){ return Object.values(item).flat().join(' ').toLowerCase(); }
function cleanLine(line){ return line.replace(/\s+/g, ' ').trim(); }
function likelyPhone(line){ return line.match(/(?:\+?853\s*)?(?:\d[\s-]?){7,}/)?.[0]?.trim() || ''; }
function likelyHours(line){ return /(?:\d{1,2}[:：]\d{2}|營業|時間|星期|週|am|pm|AM|PM|休息)/.test(line); }
function likelyAddress(line){ return /(澳門|氹仔|路環|街|巷|馬路| Avenida | Rua |號|地下|樓)/i.test(line); }
function likelyMenuItem(line){
  const compact = line.replace(/\s/g, '');
  return /(?:\$|MOP|HKD|澳門幣)?\d{1,4}(?:\.\d{1,2})?$/.test(compact) && /[\p{Script=Han}A-Za-z]/u.test(line);
}
function parseMenuText(text){
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const phone = lines.map(likelyPhone).find(Boolean) || '';
  const hours = lines.find(likelyHours) || '';
  const address = lines.find(likelyAddress) || '';
  const menuLines = lines.filter(likelyMenuItem).slice(0, 20);
  const name = lines.find(line => {
    if (line === phone || line === hours || line === address) return false;
    if (likelyMenuItem(line) || likelyPhone(line) || likelyHours(line) || likelyAddress(line)) return false;
    return line.length >= 2 && line.length <= 28;
  }) || '';

  return {
    name,
    phone,
    hours,
    address,
    menuText: menuLines.join('\n')
  };
}
function mergeExtracted(prev, extracted, rawText, photo){
  return {
    ...prev,
    rawText,
    photos: photo ? [photo] : prev.photos,
    name: prev.name || extracted.name,
    phone: prev.phone || extracted.phone,
    hours: prev.hours || extracted.hours,
    address: prev.address || extracted.address,
    menuText: prev.menuText || extracted.menuText
  };
}

async function readFileAsDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function imageFromDataUrl(dataUrl){
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}
async function detectText(dataUrl){
  if (!('TextDetector' in window)) return '';
  const detector = new window.TextDetector();
  const image = await imageFromDataUrl(dataUrl);
  const results = await detector.detect(image);
  return results.map(result => result.rawValue).join('\n');
}

export default function App(){
  const [items,setItems] = useState(loadData);
  const [form,setForm] = useState(emptyForm);
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('全部');
  const [editingId,setEditingId] = useState(null);
  const [activePhoto,setActivePhoto] = useState(null);
  const [scanState,setScanState] = useState('');

  useEffect(()=>saveData(items),[items]);

  const results = useMemo(()=>{
    const q = query.trim().toLowerCase();
    return items.filter(item => (filter==='全部'||item.status===filter) && (!q || asText(item).includes(q)));
  },[items,query,filter]);

  function update(field,value){ setForm(prev=>({...prev,[field]:value})); }
  function clearForm(){ setForm(emptyForm); setEditingId(null); setScanState(''); }
  function applyRawText(text){
    const extracted = parseMenuText(text);
    setForm(prev => mergeExtracted(prev, extracted, text));
  }
  async function scanMenu(file){
    if(!file || !file.type.startsWith('image/')) return;
    setScanState('正在讀取餐牌相片…');
    try {
      const photo = await readFileAsDataUrl(file);
      setForm(prev=>({...prev, photos:[photo]}));
      setScanState('正在辨識主要資料…');
      const text = await detectText(photo);
      if (!text) {
        setScanState('此瀏覽器未提供內建 OCR，請把相片文字貼到「辨識文字」欄後按「重新整理」。');
        return;
      }
      const extracted = parseMenuText(text);
      setForm(prev => mergeExtracted(prev, extracted, text, photo));
      setScanState('已自動整理，可按需要微調後儲存。');
    } catch {
      setScanState('辨識失敗，請改用手動貼上文字或直接輸入重點資料。');
    }
  }
  function submit(e){
    e.preventDefault();
    if(!form.name.trim()) return alert('請至少保留餐廳名稱');
    const now = new Date().toISOString();
    const next = {...form, id: editingId || crypto.randomUUID(), updatedAt:now, createdAt: form.createdAt || now};
    setItems(prev => editingId ? prev.map(x=>x.id===editingId?next:x) : [next,...prev]);
    clearForm();
  }
  function edit(item){ setForm({...emptyForm, ...item}); setEditingId(item.id); window.scrollTo({top:0,behavior:'smooth'}); }
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
      <p className="eyebrow">私人美食記憶庫</p>
      <h1>上傳餐牌，留下重點</h1>
      <p>版面簡化成三步：上傳餐牌相、確認自動整理的餐廳資料、儲存到想食清單。</p>
    </header>

    <section className="panel scanner">
      <div>
        <h2>{editingId ? '修改餐牌資料' : '1. 上傳餐牌'}</h2>
        <p>系統會嘗試從相片辨識餐廳名、電話、地址、營業時間、菜式及價錢。</p>
      </div>
      <label className="dropzone">
        <span>＋ 選擇餐牌相片</span>
        <small>建議相片清晰、正面、避免反光</small>
        <input type="file" accept="image/*" onChange={e=>scanMenu(e.target.files[0])} />
      </label>
      {scanState && <p className="scanState">{scanState}</p>}
      {!!form.photos?.length && <button className="preview" type="button" onClick={()=>setActivePhoto(form.photos[0])}><img src={form.photos[0]} alt="餐牌預覽" /></button>}
    </section>

    <section className="panel">
      <h2>2. 確認主要資料</h2>
      <form onSubmit={submit} className="form simpleForm">
        <label>餐廳名稱<input placeholder="例如：澳門金非豬潤麵" value={form.name} onChange={e=>update('name',e.target.value)} /></label>
        <label>地區 / 地址<input placeholder="地區或完整地址" value={form.address || form.district} onChange={e=>update('address',e.target.value)} /></label>
        <div className="row">
          <label>電話<input placeholder="電話 / WhatsApp" value={form.phone} onChange={e=>update('phone',e.target.value)} /></label>
          <label>營業時間<input placeholder="例如：08:00–17:30" value={form.hours} onChange={e=>update('hours',e.target.value)} /></label>
        </div>
        <label>菜式及價錢<textarea placeholder="自動擷取主要菜式；也可自行增刪，每行一項" value={form.menuText} onChange={e=>update('menuText',e.target.value)} /></label>
        <label>辨識文字（可貼上後重新整理）<textarea className="rawText" placeholder="如瀏覽器未能自動 OCR，可把相片文字貼到這裡。" value={form.rawText} onChange={e=>update('rawText',e.target.value)} /></label>
        <div className="actions">
          <button type="button" onClick={()=>applyRawText(form.rawText)}>重新整理</button>
          <select value={form.status} onChange={e=>update('status',e.target.value)}><option>想食</option><option>已食</option><option>再食</option></select>
          <button className="primary">{editingId?'儲存修改':'加入清單'}</button>
          <button type="button" onClick={clearForm}>清空</button>
        </div>
      </form>
    </section>

    <section className="toolbar">
      <input placeholder="搜尋餐廳、菜式、價錢、地區…" value={query} onChange={e=>setQuery(e.target.value)} />
      <select value={filter} onChange={e=>setFilter(e.target.value)}><option>全部</option><option>想食</option><option>已食</option><option>再食</option></select>
      <button onClick={exportJson}>匯出</button>
      <label className="smallUpload">匯入<input type="file" accept="application/json" onChange={e=>e.target.files[0]&&importJson(e.target.files[0])}/></label>
    </section>

    <section className="list" aria-label="已儲存餐牌">
      <h2>3. 已儲存（{results.length}）</h2>
      {results.map(item=><article className="card" key={item.id}>
        {!!item.photos?.length && <button className="cardPhoto" onClick={()=>setActivePhoto(item.photos[0])}><img src={item.photos[0]} alt={`${item.name} 餐牌`} /></button>}
        <div className="cardBody">
          <div className="cardTop"><h3>{item.name}</h3><span>{item.status}</span></div>
          <p className="meta">{[item.address || item.district, item.hours, item.phone].filter(Boolean).join(' · ')}</p>
          {item.menuText && <pre>{item.menuText}</pre>}
          <div className="actions wrap">
            {item.phone && <a className="button" href={`tel:${item.phone.split('/')[0].replace(/\D/g,'')}`}>致電</a>}
            <button onClick={()=>edit(item)}>修改</button><button onClick={()=>remove(item.id)}>刪除</button>
          </div>
        </div>
      </article>)}
      {!results.length && <p className="empty">暫時未有結果。</p>}
    </section>
    {activePhoto && <div className="lightbox" onClick={()=>setActivePhoto(null)}><img src={activePhoto} alt="放大餐牌"/></div>}
  </main>
}
