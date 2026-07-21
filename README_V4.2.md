# 財富紀律 V4.2 更新說明

## 主要變更

- 股票查詢明確標示為「最新盤後收盤價」，不再誤認為盤中即時價。
- 顯示市場資料的交易日期與檔案更新時間。
- 新增「參考價格（可修改）」欄位：盤中可輸入自行查到的成交價，再由該價格判斷今日操作。
- 更新持股頁價格標示與資料日期。
- `market-data.json` 每次讀取均停用快取。
- Service Worker 升級至 V4.2，採網路優先，避免舊版程式長期留在瀏覽器快取。
- GitHub Actions 產生 `tradingDate`、每檔股票 `date` 與 `dataType` 欄位。

## 上傳方式

將 ZIP 內所有檔案覆蓋上傳到 GitHub repository 根目錄，包含 `.github/workflows/update-market-data.yml`。
上傳完成後，到 Actions 手動執行一次 **Update Taiwan market data**。

## 使用提醒

官方公開資料是盤後收盤資料，不是盤中即時成交資料。盤中使用時，可在新增／更新股票視窗把「參考價格」改成券商或行情頁看到的最新成交價。
