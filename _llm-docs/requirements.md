# ブラウザ版・領収書OCRアプリ（Tesseract.js）要件定義

参照: [Tesseract.js 公式サイト](https://tesseract.projectnaptha.com/)

---

## 1. 目的・背景
- **目的**: 領収書画像からテキストを抽出し、コピー・ダウンロード・軽微な整形ができる、純ブラウザ（HTML/CSS/JavaScript）構成の軽量Webアプリを提供する。
- **背景**: Tesseract.js はブラウザ/Nodeの双方で動作し、100+言語、向き/スクリプト検出、段落/単語/文字のバウンディングボックスをサポートする純JavaScriptのOCRライブラリである［参考: [tesseract.projectnaptha.com](https://tesseract.projectnaptha.com/)］。

## 2. スコープ
- **インスコープ**
  - 画像入力（ファイル選択、ドラッグ&ドロップ）
  - 画像プレビュー
  - Tesseract.js を用いたOCR（主に日本語/英語）
  - 進捗表示（%/ステータスログ）とキャンセル
  - 抽出テキストの表示・コピー・テキスト保存（.txt）
  - 簡易な前処理（回転、グレースケール/二値化などのON/OFF）
  - 言語選択（初期: jpn/eng）
  - 処理は端末内で完結（画像のサーバ送信なし）
- **将来拡張（今回は任意/後回し）**
  - レイアウト解析の可視化（バウンディングボックスのオーバーレイ）
  - 簡易構造化（合計金額/日付/店舗名のヒューリスティック抽出）
  - Service Worker によるオフライン対応/言語データキャッシュ
  - PDF入力（pdf.js 連携）
- **スコープ外**
  - 手書き文字の高精度認識
  - 高度なテーブル構造復元、会計システム連携API
  - サーバサイド/DB を用いた永続化

## 3. 前提・制約
- **技術スタック**: HTML, JavaScript（ES6 目安）, CSSフレームワークは Tailwind CSS（CDN）
- **ライブラリ取得**: CDN（例: jsDelivr / UNPKG / Tailwind CDN）
- **ビルド/実行環境**: Node.js 不要。静的ホスティング/ローカル`file://` or `http(s)://`で動作可能。
- **言語データ**: Tesseract.js の学習データ（`jpn.traineddata` など）はCDNから取得。初回取得は数MB単位のダウンロードが想定される。
- **ブラウザ互換**: 最新版の Chromium/Firefox/Safari を優先。iOS Safari でのWASMメモリ制限に留意。
- **パフォーマンス**: 大きな画像は処理時間が延びるため、クライアント側で縮小前処理を推奨。

## 4. 想定ユーザー/ユースケース
- 出張・経費精算のため領収書をデジタル化してテキスト化したい個人/社員
- 複数の領収書画像を順次OCRしてテキストをメモアプリ等へコピー/保存

## 5. 画面要件（MVP）
1. ヘッダ: タイトル、簡易説明、言語選択（jpn/eng）
2. 入力領域: 
   - ドラッグ&ドロップ、またはファイル選択ボタン
   - 画像プレビュー（EXIF自動回転適用）
3. 設定パネル（折りたたみ）:
   - 画像前処理: 縮小解像度の上限、グレースケール/二値化、回転（90°刻み）
   - OCR詳細（任意）: ページセグメンテーションモード、縦書き最適化（注: 日本語縦書きは制約あり）
4. 実行領域:
   - 「OCR開始」ボタン、進捗バー/ログ、キャンセルボタン
5. 出力領域:
   - 抽出テキスト（読み取り専用テキストエリア）
   - 「コピー」「.txtとして保存」

## 6. 機能要件
- **F-01 画像入力**: PNG/JPEG（単一ファイル）。複数はMVPでは逐次処理。
- **F-02 プレビュー**: キャンバスへ描画し前処理を反映。
- **F-03 前処理**: 
  - 長辺上限ピクセルで縮小（例: 2000px 既定）
  - グレースケール/二値化（簡易しきい値）
  - 回転（0/90/180/270）
- **F-04 言語選択**: 既定 `jpn`、選択に応じてモデルをダウンロード。
- **F-05 OCR実行**: Tesseract.js Worker を用い、`logger`で進捗を表示。キャンセル可。
- **F-06 出力**: テキストエリア表示、クリップボードコピー、`.txt`ダウンロード。
- **F-07 エラー処理**: 画像未選択/破損/メモリ不足/モデル取得失敗時のガイダンス。

## 7. 非機能要件
- **N-01 性能**: 2000×2000px 程度の領収書で、モダンPCにて10秒以内目標（端末差あり）。
- **N-02 可用性**: CDN障害時のリトライ/代替CDNの切替設定（将来課題）。
- **N-03 セキュリティ/プライバシー**: 画像は端末内処理のみで外部送信しない。モデル取得先はHTTPS。
- **N-04 アクセシビリティ**: キーボード操作、適切なコントラスト、ARIA 属性。
- **N-05 レスポンシブ**: スマホ/タブレット/デスクトップで快適に利用可能。
- **N-06 国際化**: UIは日本語（既定）/英語（将来）。OCRは `jpn`/`eng` を提供。

## 8. 依存関係（CDN）
- Tesseract.js 本体（`tesseract.min.js`）
- WASM/ワーカーおよび学習データ（`*.traineddata`）
- Tailwind CSS（CDN版）
- 例（バージョンは実装時に固定）:

```html
<!-- Tailwind CSS CDN（Play CDN・開発/小規模向け）-->
<script src="https://cdn.tailwindcss.com"></script>
<script>
  // 必要ならテーマ拡張
  tailwind.config = { theme: { extend: {} } };
  // 本番では必要なユーティリティに限定する構成を検討
  // （Play CDNは開発規模に適した手軽な選択肢）
  
</script>

<!-- 例: jsDelivr。実装時に安定版へ固定 -->
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@x.y.z/dist/tesseract.min.js"></script>
```

基本API利用例（実装参考）:

```javascript
// 例: 単発の認識（実装時はエラーハンドリング/キャンセル対応を追加）
Tesseract.recognize(fileOrCanvas, 'jpn', { logger: m => updateProgress(m) })
  .then(({ data }) => {
    outputText(data.text);
  });
```

## 9. データ取扱い
- 入力画像: ブラウザメモリ上のみで処理。アップロードなし。
- 出力テキスト: 表示のみ。明示操作で`.txt`としてローカル保存可。
- ローカル保存（任意）: 設定/直近結果を `localStorage` に保存（ユーザー同意前提）。

## 10. エラー/例外シナリオ
- 画像ファイル不正/破損 → ユーザーへの再選択促し
- 言語モデル取得失敗 → 再試行/代替CDN案内
- メモリ不足/WASM失敗 → 画像縮小の推奨、別ブラウザ利用の案内
- 認識精度低下 → 前処理の案内、撮影条件ガイド（傾き/照度/ピント）

## 11. 受け入れ基準（抜粋）
- 画像（JPEG/PNG）を選択/ドラッグ&ドロップで取り込み、プレビュー表示できる。
- 言語 `jpn` を選びOCRを実行すると、進捗が表示され、完了後にテキストが表示される。
- 「コピー」クリックでクリップボードへ格納、「保存」で`.txt`がダウンロードされる。
- 破損画像/未選択などのエラー時、ユーザーは原因と対処を理解できる。
- 外部への画像送信が行われない（ネットワークはモデル取得のみ）。

## 12. テスト観点（概要）
- ブラウザ: Chrome/Edge/Firefox/ Safari（Desktop/iOS）での基本動作
- 画像条件: 解像度（小/中/大）、縦横向き、暗所/傾き/影あり
- 言語: `jpn`/`eng` それぞれでの認識成功
- 前処理: ON/OFFでの精度/時間差
- 回帰: 主要操作（取り込み→OCR→コピー/保存）

## 13. リスク/留意点
- Tesseract.js のWASM/学習データサイズが大きく初回読み込みコストが高い
- モバイル端末でのメモリ/時間制約
- 日本語縦書きやレシート特有のレイアウトで認識率に限界
- PDF/複数ページ対応は別途実装コスト（pdf.js 連携）

## 14. 画面遷移/情報構造
- 単一ページ（SPAではなく、シンプルな1ページ構成）
  - ヘッダ → 入力/設定 → 実行 → 出力

## 15. ディレクトリ/ファイル構成（案）
```
/ (静的ホスティング直下)
  index.html
  app.js
  /assets/
    sample-receipts/...
  /icons/
  /.vscode/
    extensions.json
    settings.json
```
※ Tailwind は CDN で読み込むため、専用のCSSビルドは不要。必要に応じて軽微な上書き用の `styles.css` を追加可（任意）。

## 16. 実装ポリシー
- DOM操作/イベントは素のJavaScriptで実装
- スタイリングは Tailwind CSS のユーティリティクラスを中心に実装（CDN）
- ライブラリは Tesseract.js（CDN）
- 画像処理は `canvas` を使用し、副作用は明示
- 変数/関数命名は可読性重視、早期リターン、例外の握り潰し禁止
- カスタムCSSは最小限（コンポーネント化が必要な場合のみ）

## 17. 今後の拡張候補
- 単純な正規表現による構造化（合計金額/税込・税抜/日付/店舗名）
- 結果のCSV出力、複数画像の一括処理
- オフラインキャッシュ（Service Worker）
- PDF入力（pdf.js）とページ毎の画像化→OCR

## 18. 参考
- Tesseract.js 公式デモ/説明: [tesseract.projectnaptha.com](https://tesseract.projectnaptha.com/)
- VS Code Live Preview（ローカルサーバー・ライブ更新）: [Live Preview - VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server)
 - VS Code Live Server（ローカルサーバー・ライブリロード）: [Live Server - VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)


