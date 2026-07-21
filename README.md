# 財富紀律 V4

## V4 的關鍵改進
瀏覽器不再直接連證交所與櫃買中心，而是由 GitHub Actions 每個交易日抓取官方資料，寫入同一個網站的 `market-data.json`。前端讀取同網域檔案，可避免瀏覽器跨網域限制。

## 上傳方式
請把壓縮檔內的所有內容上傳到 Repository 根目錄，包含：
- `.github/workflows/update-market-data.yml`
- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `sw.js`
- `market-data.json`
- `README.md`

注意：`.github` 是資料夾，請連同資料夾結構一起上傳。

## 上傳後第一次取得市場資料
1. Repository 上方點 `Actions`
2. 左側點 `Update Taiwan market data`
3. 點右側 `Run workflow`
4. 再按綠色 `Run workflow`
5. 等約 1–2 分鐘
6. 回到網站重新整理

之後每週一至週五會自動更新一次。

## 目前限制
- 市場資料是盤後收盤資料，不是券商即時報價。
- Windows 與 Android 的交易資料保存在各自瀏覽器，仍需透過 JSON 備份搬移。
