# 財富紀律 V3 正式版

這不是看盤或技術分析工具，而是「價格到了以後，該買多少、賣多少、轉出多少」的策略執行工具。

## 功能
- 首頁只顯示達到條件的建議操作
- 建議明確顯示單價與股數
- 上市／上櫃股票代號查詢與盤後收盤價
- 股票、可投資現金、已轉出三種資產狀態
- 投入本金與本金回收率
- 回本前／回本後不同轉出比例
- 買進、賣出、手續費與證券交易稅估算
- 實際成交價格與股數修正
- JSON 匯出與匯入
- 手機 PWA 基礎支援

## GitHub 上傳
在 Repository 頁面按「新增文件 / Add file」→「Upload files」，將本資料夾內的下列檔案全部拖入：
- index.html
- styles.css
- app.js
- manifest.json
- sw.js
- README.md

提交到 main 分支。

## GitHub Pages
Repository → 設定 Settings → Pages
- Source：Deploy from a branch
- Branch：main
- Folder：/(root)
- Save

稍候幾分鐘後，網站網址通常為：
https://你的帳號.github.io/你的儲存庫網址名稱/

## 資料來源
- 臺灣證券交易所 OpenAPI：上市個股日成交資訊
- 證券櫃檯買賣中心 OpenAPI：上櫃股票行情

公開資料屬盤後行情，不是券商即時成交報價。

## 重要限制
網站程式可同時在 Windows 與 Android 使用，但資料使用瀏覽器 LocalStorage，因此兩台裝置不會自動同步。
請在換裝置前匯出 JSON，再於另一台裝置匯入。
