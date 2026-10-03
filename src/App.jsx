import {useEffect,useState,useCallback} from 'react'
import {createClient} from '@supabase/supabase-js'
import {SUPABASE_URL,SUPABASE_KEY} from './config'
const sb=createClient(SUPABASE_URL,SUPABASE_KEY)
const bs=n=>'Bs '+Number(n).toFixed(2)

function Login(){
  const [email,setE]=useState(''),[pass,setP]=useState(''),[err,setErr]=useState('')
  const entrar=async()=>{const {error}=await sb.auth.signInWithPassword({email,password:pass});if(error)setErr('Correo o contraseña incorrectos.')}
  return <div className="login panel"><h2>Punto de venta</h2>
    <input placeholder="Correo" type="email" value={email} onChange={e=>setE(e.target.value)}/>
    <input placeholder="Contraseña" type="password" value={pass} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==='Enter'&&entrar()}/>
    {err&&<div className="err">{err}</div>}<button onClick={entrar}>Entrar</button></div>
}

function Vender(){
  const [prods,setProds]=useState([]),[q,setQ]=useState(''),[cart,setCart]=useState({}),[msg,setMsg]=useState('')
  const cargar=useCallback(()=>sb.from('productos').select('*').eq('activo',true).gt('stock',0).order('nombre').then(({data})=>setProds(data||[])),[])
  useEffect(()=>{cargar()},[cargar])
  const add=p=>setCart(c=>({...c,[p.id]:Math.min((c[p.id]||0)+1,p.stock)}))
  const quitar=id=>setCart(c=>{const n={...c};delete n[id];return n})
  const items=prods.filter(p=>cart[p.id])
  const total=items.reduce((s,p)=>s+p.precio*cart[p.id],0)
  const cobrar=async()=>{
    const {error}=await sb.rpc('registrar_venta',{items:items.map(p=>({producto_id:p.id,cantidad:cart[p.id]}))})
    if(error)return setMsg('No se pudo registrar: '+error.message)
    setCart({});setMsg('Venta registrada.');cargar()}
  return <div className="vender">
    <div className="panel"><input style={{width:'100%'}} placeholder="Buscar producto" value={q} onChange={e=>setQ(e.target.value)}/>
      <div className="prods">{prods.filter(p=>p.nombre.toLowerCase().includes(q.toLowerCase())).map(p=>
        <button key={p.id} className="prod" onClick={()=>add(p)}>{p.nombre}<strong>{bs(p.precio)}</strong><small>Stock: {p.stock}</small></button>)}</div>
      {!prods.length&&<p>No hay productos con stock. Agrégalos en la pestaña Productos.</p>}</div>
    <div className="panel"><h3>Venta actual</h3>
      {!items.length&&<p>Toca un producto para agregarlo.</p>}
      {items.map(p=><div className="fila" key={p.id}><span>{p.nombre}<br/><small>{cart[p.id]} × {bs(p.precio)}</small></span>
        <button className="sec" onClick={()=>quitar(p.id)}>Quitar</button></div>)}
      <div className="total"><span>Total</span><span>{bs(total)}</span></div>
      <button style={{width:'100%'}} disabled={!items.length} onClick={cobrar}>Cobrar</button>
      {msg&&<p className={msg.startsWith('Venta')?'ok':'err'}>{msg}</p>}</div></div>
}

function Ventas(){
  const [v,setV]=useState([])
  useEffect(()=>{sb.from('ventas').select('*,profiles(nombre)').order('creado',{ascending:false}).limit(50).then(({data})=>setV(data||[]))},[])
  return <div className="panel" style={{marginTop:'1rem'}}><h3>Últimas ventas</h3>
    {!v.length&&<p>Aún no hay ventas.</p>}
    {v.map(x=><div className="fila" key={x.id}><span>{new Date(x.creado).toLocaleString()}<br/><small>{x.profiles?.nombre}</small></span><strong>{bs(x.total)}</strong></div>)}</div>
}

function Productos(){
  const [rows,setRows]=useState([]),[n,setN]=useState({nombre:'',precio:'',stock:''})
  const cargar=()=>sb.from('productos').select('*').eq('activo',true).order('nombre').then(({data})=>setRows(data||[]))
  useEffect(()=>{cargar()},[])
  const ed=(id,k,val)=>setRows(r=>r.map(x=>x.id===id?{...x,[k]:val}:x))
  const guardar=async x=>{await sb.from('productos').update({nombre:x.nombre,precio:x.precio,stock:x.stock}).eq('id',x.id);cargar()}
  const quitar=async x=>{await sb.from('productos').update({activo:false}).eq('id',x.id);cargar()}
  const crear=async()=>{if(!n.nombre||n.precio==='')return;await sb.from('productos').insert({nombre:n.nombre,precio:n.precio,stock:n.stock||0});setN({nombre:'',precio:'',stock:''});cargar()}
  return <div className="panel" style={{marginTop:'1rem'}}><h3>Productos</h3>
    <div className="fila"><input placeholder="Nombre" value={n.nombre} onChange={e=>setN({...n,nombre:e.target.value})}/>
      <input placeholder="Precio" type="number" style={{width:100}} value={n.precio} onChange={e=>setN({...n,precio:e.target.value})}/>
      <input placeholder="Stock" type="number" style={{width:90}} value={n.stock} onChange={e=>setN({...n,stock:e.target.value})}/>
      <button onClick={crear}>Agregar producto</button></div><hr/>
    {rows.map(x=><div className="fila" key={x.id}>
      <input value={x.nombre} onChange={e=>ed(x.id,'nombre',e.target.value)}/>
      <input type="number" style={{width:100}} value={x.precio} onChange={e=>ed(x.id,'precio',e.target.value)}/>
      <input type="number" style={{width:90}} value={x.stock} onChange={e=>ed(x.id,'stock',e.target.value)}/>
      <button onClick={()=>guardar(x)}>Guardar cambios</button><button className="mal" onClick={()=>quitar(x)}>Quitar</button></div>)}</div>
}

function Usuarios({yo}){
  const [lista,setL]=useState([]),[f,setF]=useState({nombre:'',email:'',pass:''}),[msg,setMsg]=useState('')
  const cargar=()=>sb.from('profiles').select('*').order('creado').then(({data})=>setL(data||[]))
  useEffect(()=>{cargar()},[])
  const crear=async()=>{
    const tmp=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
    const {error}=await tmp.auth.signUp({email:f.email,password:f.pass,options:{data:{nombre:f.nombre}}})
    if(error)return setMsg(error.message)
    setF({nombre:'',email:'',pass:''});setMsg('Usuario creado.');setTimeout(cargar,800)}
  const rol=async(id,r)=>{await sb.from('profiles').update({rol:r}).eq('id',id);cargar()}
  return <div className="panel" style={{marginTop:'1rem'}}><h3>Usuarios</h3>
    <div className="fila"><input placeholder="Nombre" value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})}/>
      <input placeholder="Correo" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
      <input placeholder="Contraseña (mín. 6)" type="password" value={f.pass} onChange={e=>setF({...f,pass:e.target.value})}/>
      <button onClick={crear}>Crear usuario</button></div>
    {msg&&<p className={msg.startsWith('Usuario')?'ok':'err'}>{msg}</p>}<hr/>
    {lista.map(u=><div className="fila" key={u.id}><span>{u.nombre||'Sin nombre'}</span>
      <select value={u.rol} disabled={u.id===yo} onChange={e=>rol(u.id,e.target.value)}><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></select></div>)}</div>
}

export default function App(){
  const [ses,setSes]=useState(undefined),[perfil,setPerfil]=useState(null),[tab,setTab]=useState('vender')
  useEffect(()=>{sb.auth.getSession().then(({data})=>setSes(data.session))
    const {data:l}=sb.auth.onAuthStateChange((_,s)=>setSes(s));return()=>l.subscription.unsubscribe()},[])
  useEffect(()=>{ses?sb.from('profiles').select('*').eq('id',ses.user.id).single().then(({data})=>setPerfil(data)):setPerfil(null)},[ses])
  if(ses===undefined||(ses&&!perfil))return <p className="c">Cargando…</p>
  if(!ses)return <Login/>
  const admin=perfil.rol==='admin'
  const tabs=[['vender','Vender'],['ventas','Ventas'],...(admin?[['productos','Productos'],['usuarios','Usuarios']]:[])]
  return <div className="app"><header><b>Punto de venta</b><span>{perfil.nombre} <button className="sec" onClick={()=>sb.auth.signOut()}>Salir</button></span></header>
    <nav>{tabs.map(([k,t])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{t}</button>)}</nav>
    {tab==='vender'&&<Vender/>}{tab==='ventas'&&<Ventas/>}{tab==='productos'&&admin&&<Productos/>}{tab==='usuarios'&&admin&&<Usuarios yo={ses.user.id}/>}</div>
}
