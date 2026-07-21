const STORAGE_KEY="wealth-discipline-v3";
const LEGACY_KEYS=["wealth_discipline_v1"];
const defaults={cash:0,principal:0,transferred:0,stocks:{},history:[],settings:{preRate:10,postRate:50,buyFeeRate:.1425,sellFeeRate:.1425,taxRate:.3,lotMode:"mixed"},lastPriceRefresh:null};
let db=loadData(),marketCache=null,currentFilter="all";

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("zh-TW",{style:"currency",currency:"TWD",maximumFractionDigits:0}).format(Number(n||0));
const num=n=>new Intl.NumberFormat("zh-TW",{maximumFractionDigits:2}).format(Number(n||0));
const now=()=>new Date().toISOString();
const fee=(amount,rate)=>amount*(Number(rate||0)/100);

function loadData(){
  try{
    let raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) for(const key of LEGACY_KEYS){if(localStorage.getItem(key)){raw=localStorage.getItem(key);break}}
    const parsed=raw?JSON.parse(raw):{};
    return {...structuredClone(defaults),...parsed,settings:{...defaults.settings,...(parsed.settings||{})},stocks:parsed.stocks||{},history:parsed.history||[]};
  }catch{return structuredClone(defaults)}
}
function saveData(){localStorage.setItem(STORAGE_KEY,JSON.stringify(db));renderAll()}
function stockValue(){return Object.values(db.stocks).reduce((sum,s)=>sum+Number(s.qty||0)*Number(s.currentPrice||0),0)}
function wealthValue(){return stockValue()+db.cash+db.transferred}
function recoveryRate(){return db.principal>0?db.transferred/db.principal*100:0}
function currentTransferRate(){return db.principal>0&&db.transferred>=db.principal?db.settings.postRate:db.settings.preRate}
function cleanPrice(value){const n=Number(String(value??"").replace(/,/g,"").replace(/--|---/g,"").trim());return Number.isFinite(n)?n:0}
function pick(obj,keys){for(const key of keys)if(obj?.[key]!==undefined&&String(obj[key]).trim()!=="")return obj[key];return ""}

function renderAll(){
  $("today").textContent=new Date().toLocaleDateString("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  $("transferredHero").textContent=money(db.transferred);
  const rate=recoveryRate(); $("recoveryRate").textContent=`${num(rate)}%`; $("recoveryBar").style.width=`${Math.min(100,rate)}%`;
  $("stageLabel").textContent=db.principal>0&&db.transferred>=db.principal?"財富累積階段":"本金回收階段";
  $("stockValue").textContent=money(stockValue()); $("cashValue").textContent=money(db.cash);
  $("principalValue").textContent=money(db.principal); $("wealthValue").textContent=money(wealthValue());
  $("cashPageValue").textContent=money(db.cash); $("transferPageValue").textContent=money(db.transferred);
  $("preRateSummary").textContent=`${num(db.settings.preRate)}%`; $("postRateSummary").textContent=`${num(db.settings.postRate)}%`;
  renderTasks();renderHoldings();renderHistory(currentFilter);fillStockSelect();
}
function tasks(){
  const out=[];
  Object.values(db.stocks).forEach(s=>{
    if(s.currentPrice>0&&s.buyTarget>0&&s.currentPrice<=s.buyTarget&&s.buyQty>0)out.push({side:"buy",stock:s,price:s.buyTarget,qty:s.buyQty});
    if(s.currentPrice>0&&s.sellTarget>0&&s.currentPrice>=s.sellTarget&&s.sellQty>0&&s.qty>0)out.push({side:"sell",stock:s,price:s.sellTarget,qty:Math.min(s.sellQty,s.qty)});
  });return out
}
function renderTasks(){
  const list=tasks();$("taskCount").textContent=list.length;$("taskList").innerHTML="";
  if(!list.length){$("taskList").innerHTML='<div class="empty"><div style="font-size:34px">✓</div><b>今天沒有建議操作</b><div class="small">沒有訊號就不交易，耐心也是策略的一部分。</div></div>';return}
  list.forEach(t=>{
    const gross=t.price*t.qty;
    let detail;
    if(t.side==="buy"){
      const total=gross+fee(gross,db.settings.buyFeeRate);
      detail=`預估總支出 ${money(total)}，成交後可投資現金約 ${money(db.cash-total)}。`;
    }else{
      const net=gross-fee(gross,db.settings.sellFeeRate)-fee(gross,db.settings.taxRate);
      const transfer=net*currentTransferRate()/100;
      detail=`預估淨入帳 ${money(net)}，建議轉出 ${money(transfer)}，保留投資現金 ${money(net-transfer)}。`;
    }
    $("taskList").insertAdjacentHTML("beforeend",`<article class="task ${t.side}">
      <div class="task-head"><div><div class="symbol">${t.stock.code}</div><div class="stock-name">${t.stock.name||""}</div></div><div class="badge">${t.side==="buy"?"建議買進":"建議停利"}</div></div>
      <div class="task-numbers"><div class="number-box"><span>${t.side==="buy"?"買進單價":"賣出單價"}</span><strong>${num(t.price)} 元</strong></div><div class="number-box"><span>${t.side==="buy"?"買進數量":"賣出數量"}</span><strong>${num(t.qty)} 股</strong></div></div>
      <div class="explain">${detail}</div>
      <div class="task-actions"><button class="primary" onclick="openComplete('${t.stock.code}','${t.side}',${t.price},${t.qty})">✓ 已完成</button><button class="secondary" onclick="openComplete('${t.stock.code}','${t.side}',${t.price},${t.qty})">修改成交</button></div>
    </article>`);
  })
}
function renderHoldings(){
  const stocks=Object.values(db.stocks).sort((a,b)=>a.code.localeCompare(b.code));$("holdingList").innerHTML="";
  if(!stocks.length){$("holdingList").innerHTML='<div class="empty"><b>尚未建立股票</b><div class="small">按右下角＋，輸入代號並設定買賣價格與數量。</div></div>';return}
  stocks.forEach(s=>{
    const market=Number(s.qty||0)*Number(s.currentPrice||0),pnl=(Number(s.currentPrice||0)-Number(s.avgCost||0))*Number(s.qty||0);
    $("holdingList").insertAdjacentHTML("beforeend",`<article class="holding">
      <div class="holding-head"><div><div class="symbol">${s.code} ${s.name||""}</div><div class="stock-name">${s.market||""} · ${num(s.qty)} 股</div></div><div class="right"><strong>${money(market)}</strong><div class="${pnl>=0?"positive":"negative"}">${pnl>=0?"+":""}${money(pnl)}</div></div></div>
      <div class="holding-stats"><div><span>平均成本</span><strong>${num(s.avgCost)}</strong></div><div><span>最近收盤</span><strong>${num(s.currentPrice)}</strong></div><div><span>下次買進</span><strong>${num(s.buyTarget)}／${num(s.buyQty)}股</strong></div><div><span>下次賣出</span><strong>${num(s.sellTarget)}／${num(s.sellQty)}股</strong></div></div>
    </article>`)
  })
}
function renderHistory(filter="all"){
  currentFilter=filter;const names={buy:"買進",sell:"賣出",capital:"投入本金",transfer:"轉出",stock:"股票設定",price:"更新價格",settings:"策略設定"};
  const rows=db.history.filter(h=>filter==="all"||h.type===filter).slice().reverse();$("historyList").innerHTML="";
  if(!rows.length){$("historyList").innerHTML='<div class="empty">尚無紀錄</div>';return}
  rows.forEach(h=>$("historyList").insertAdjacentHTML("beforeend",`<div class="history-row"><div><strong>${names[h.type]||h.type} ${h.code||""}</strong><div class="small">${new Date(h.time).toLocaleString("zh-TW")}</div></div><div class="right"><strong>${h.qty?`${num(h.qty)}股`:""} ${h.price?`@ ${num(h.price)}`:""}</strong><div class="small">${h.amount!==undefined?money(h.amount):""}</div></div></div>`))
}
function fillStockSelect(){$("stockSelect").innerHTML=Object.values(db.stocks).map(s=>`<option value="${s.code}">${s.code} ${s.name||""}</option>`).join("")}
function showView(name){document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(`${name}View`).classList.remove("hidden");document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.view===name))}
document.querySelectorAll(".nav").forEach(n=>n.addEventListener("click",()=>showView(n.dataset.view)));
document.querySelectorAll(".filter").forEach(f=>f.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));f.classList.add("active");renderHistory(f.dataset.filter)}));

function configureAction(type="stock"){
  $("actionType").value=type;
  const stock=type==="stock",trade=["buy","sell"].includes(type),price=type==="price",moneyAction=["capital","transfer"].includes(type);
  $("stockLookupFields").classList.toggle("hidden",!stock);$("stockSelectField").classList.toggle("hidden",!(trade||price));
  $("tradeFields").classList.toggle("hidden",!trade);$("stockStrategyFields").classList.toggle("hidden",!stock);$("amountField").classList.toggle("hidden",!moneyAction&&!price);
  $("amountField").querySelector("input").previousSibling.textContent=price?"目前價格":"金額";
}
$("actionType").addEventListener("change",e=>configureAction(e.target.value));
$("fab").addEventListener("click",()=>{configureAction("stock");$("actionDialog").showModal()});
document.querySelectorAll("[data-open-action]").forEach(b=>b.addEventListener("click",()=>{configureAction(b.dataset.openAction);$("actionDialog").showModal()}));

async function fetchJson(url){const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
function normalizeRows(rows,market){
  const map={};(Array.isArray(rows)?rows:[]).forEach(r=>{
    const code=String(pick(r,["Code","證券代號","SecuritiesCompanyCode","股票代號","代號"])).trim();
    if(!code)return;map[code]={code,name:String(pick(r,["Name","證券名稱","CompanyName","股票名稱","名稱"])).trim(),currentPrice:cleanPrice(pick(r,["ClosingPrice","收盤價","Close","最後成交價"])),market}
  });return map
}
async function loadMarketData(force=false){
  if(marketCache&&!force)return marketCache;
  const urls=["https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL","https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes"];
  const result=await Promise.allSettled(urls.map(fetchJson));let map={},sources=[];
  if(result[0].status==="fulfilled"){Object.assign(map,normalizeRows(result[0].value,"上市"));sources.push("臺灣證券交易所")}
  if(result[1].status==="fulfilled"){Object.assign(map,normalizeRows(result[1].value,"上櫃"));sources.push("櫃買中心")}
  if(!Object.keys(map).length)throw new Error("公開市場資料目前無法連線");
  marketCache={map,sources,loadedAt:now()};return marketCache
}
async function lookupStock(){
  const code=$("stockCode").value.trim();if(!code)return;
  $("lookupStatus").className="status-text";$("lookupStatus").textContent="查詢中…";
  try{
    const market=await loadMarketData();const item=market.map[code];
    if(!item)throw new Error("找不到這個股票代號");
    $("stockName").value=item.name;$("stockName").dataset.market=item.market;$("stockName").dataset.price=item.currentPrice;
    $("lookupStatus").className="status-text ok";$("lookupStatus").textContent=`${item.market} · ${item.name} · 最近收盤 ${num(item.currentPrice)} 元`;
  }catch(error){$("lookupStatus").className="status-text error";$("lookupStatus").textContent=`查詢失敗：${error.message}。名稱仍可手動輸入。`}
}
$("lookupStock").addEventListener("click",lookupStock);
let lookupTimer;$("stockCode").addEventListener("input",()=>{clearTimeout(lookupTimer);lookupTimer=setTimeout(lookupStock,600)});

async function refreshPrices(show=true){
  const button=$("refreshPrices");button.disabled=true;button.textContent="…";
  try{
    const market=await loadMarketData(true);let updated=0;
    Object.values(db.stocks).forEach(s=>{const item=market.map[s.code];if(item){s.name=s.name||item.name;s.market=item.market;if(item.currentPrice>0){s.currentPrice=item.currentPrice;updated++}}});
    db.lastPriceRefresh=now();saveData();showBanner(`已更新 ${updated} 檔收盤價 · ${market.sources.join("、")}`,"ok");if(show&&updated===0)showBanner("尚無持股可更新。","ok")
  }catch(error){showBanner(`更新失敗：${error.message}。可先手動更新價格。`,"error")}
  finally{button.disabled=false;button.textContent="↻"}
}
$("refreshPrices").addEventListener("click",()=>refreshPrices(true));
function showBanner(text,type){const b=$("networkBanner");b.textContent=text;b.className=`banner ${type}`;setTimeout(()=>b.classList.add("hidden"),7000)}

function recordTrade(code,side,price,qty){
  const s=db.stocks[code];if(!s)return alert("請先建立股票");if(price<=0||qty<=0)return alert("請輸入有效的成交價格與股數");
  const gross=price*qty;
  if(side==="buy"){
    const total=gross+fee(gross,db.settings.buyFeeRate);if(total>db.cash)return alert("可投資現金不足");
    const newQty=s.qty+qty;s.avgCost=(s.avgCost*s.qty+total)/newQty;s.qty=newQty;s.currentPrice=price;db.cash-=total;db.history.push({type:"buy",code,price,qty,amount:total,time:now()});
  }else{
    if(qty>s.qty)return alert("賣出股數超過持股");
    const net=gross-fee(gross,db.settings.sellFeeRate)-fee(gross,db.settings.taxRate);s.qty-=qty;s.currentPrice=price;if(s.qty===0)s.avgCost=0;db.cash+=net;db.history.push({type:"sell",code,price,qty,amount:net,time:now()});
    const suggestion=net*currentTransferRate()/100;
    setTimeout(()=>{if(confirm(`本次預估淨入帳 ${money(net)}。\n依策略建議轉出 ${money(suggestion)}，現在記錄轉出嗎？`)){db.cash-=suggestion;db.transferred+=suggestion;db.history.push({type:"transfer",amount:suggestion,time:now()});saveData()}},100)
  }
}
$("saveAction").addEventListener("click",()=>{
  const type=$("actionType").value,amount=Number($("amount").value||0),code=($("stockSelect").value||$("stockCode").value).trim();
  if(type==="stock"){
    const c=$("stockCode").value.trim();if(!c)return alert("請輸入股票代號");
    const old=db.stocks[c]||{code:c,name:"",qty:0,avgCost:0,currentPrice:0};
    db.stocks[c]={...old,name:$("stockName").value.trim(),market:$("stockName").dataset.market||old.market||"",currentPrice:Number($("stockName").dataset.price||old.currentPrice||0),buyTarget:Number($("buyTarget").value||0),buyQty:Number($("buyQty").value||0),sellTarget:Number($("sellTarget").value||0),sellQty:Number($("sellQty").value||0)};
    db.history.push({type:"stock",code:c,time:now()})
  }else if(type==="capital"){if(amount<=0)return alert("請輸入金額");db.cash+=amount;db.principal+=amount;db.history.push({type:"capital",amount,time:now()})
  }else if(type==="transfer"){if(amount<=0||amount>db.cash)return alert("金額錯誤或現金不足");db.cash-=amount;db.transferred+=amount;db.history.push({type:"transfer",amount,time:now()})
  }else if(type==="price"){if(!db.stocks[code])return alert("請先建立股票");db.stocks[code].currentPrice=amount;db.history.push({type:"price",code,price:amount,time:now()})
  }else recordTrade(code,type,Number($("tradePrice").value),Number($("tradeQty").value));
  $("actionDialog").close();saveData()
});
window.openComplete=(code,side,price,qty)=>{$("completeCode").value=code;$("completeSide").value=side;$("completePrice").value=price;$("completeQty").value=qty;$("completeTitle").textContent=`${code} ${side==="buy"?"買進":"賣出"}成交`;$("completeDialog").showModal()};
$("confirmComplete").addEventListener("click",()=>{recordTrade($("completeCode").value,$("completeSide").value,Number($("completePrice").value),Number($("completeQty").value));$("completeDialog").close();saveData()});

$("openSettings").addEventListener("click",()=>{Object.keys(db.settings).forEach(k=>{if($(k))$(k).value=db.settings[k]});$("settingsDialog").showModal()});
$("saveSettings").addEventListener("click",()=>{db.settings={preRate:Number($("preRate").value),postRate:Number($("postRate").value),buyFeeRate:Number($("buyFeeRate").value),sellFeeRate:Number($("sellFeeRate").value),taxRate:Number($("taxRate").value),lotMode:$("lotMode").value};db.history.push({type:"settings",time:now()});$("settingsDialog").close();saveData()});

$("exportData").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`財富紀律備份_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)});
$("importDataButton").addEventListener("click",()=>$("importData").click());
$("importData").addEventListener("change",e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);db={...structuredClone(defaults),...data,settings:{...defaults.settings,...(data.settings||{})}};saveData();alert("匯入完成")}catch{alert("備份檔格式錯誤")}};reader.readAsText(file)});

renderAll();
if(!db.lastPriceRefresh||new Date(db.lastPriceRefresh).toDateString()!==new Date().toDateString())refreshPrices(false);
if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{});
