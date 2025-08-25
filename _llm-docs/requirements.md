# ブラウザ版・領収書OCRアプリ（OpenAI API）要件定義

参照: [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)

---

## 1. 目的・背景
- **目的**: 領収書画像からテキストを抽出し、コピー・ダウンロード・軽微な整形ができる、純ブラウザ（HTML/CSS/JavaScript）構成のWebアプリを提供する。
- **背景**: OpenAI Vision API（gpt-4o-miniモデル）を活用し、高精度な文字認識と多言語対応（日本語・英語・韓国語）、および自動翻訳機能を提供する［参考: [OpenAI Vision API Documentation](https://platform.openai.com/docs/guides/vision)］。

## 2. スコープ
- **インスコープ**
  - 画像入力（ファイル選択、ドラッグ&ドロップ）
  - 画像プレビュー（自動縮小処理）
  - 進捗表示（%/ステータスログ）とキャンセル
  - 抽出テキストの表示・コピー・テキスト保存（.txt）
  - 言語選択（日本語・英語・韓国語）と自動翻訳
  - OpenAI API Key入力（ブラウザローカル保持）
  - OpenAI Vision APIを使用したクラウドベースOCR処理
- **将来拡張（今回は任意/後回し）**
  - 簡易な前処理機能（回転、グレースケール/二値化などのON/OFF）
  - レイアウト解析の可視化（バウンディングボックスのオーバーレイ）
  - 簡易構造化（合計金額/日付/店舗名のヒューリスティック抽出）
  - Service Worker によるオフライン対応
  - PDF入力（pdf.js 連携）
- **スコープ外**
  - API Key管理システム（ユーザー自身でキー管理）
  - 高度なテーブル構造復元、会計システム連携API
  - サーバサイド/DB を用いた永続化
  - 完全オフライン処理（OpenAI APIが必要）

## 3. 前提・制約
- **技術スタック**: HTML, JavaScript（ES6 目安）, CSSフレームワークは Tailwind CSS（CDN）
- **ライブラリ取得**: CDN（Tailwind CDN）のみ
- **ビルド/実行環境**: Node.js 不要。静的ホスティング/ローカル`http(s)://`で動作可能。
- **外部API**: OpenAI Vision API（gpt-4o-mini）。ユーザー自身のAPI Keyが必要。
- **ブラウザ互換**: 最新版の Chromium/Firefox/Safari を優先。Fetch API、async/await対応必須。
- **パフォーマンス**: 画像は自動的に最大2000px以下に縮小。OpenAI API通信時間は数秒〜十数秒。
- **セキュリティ**: API KeyはブラウザメモリおよびlocalStorageにのみ保持。HTTPS必須。

## 4. 想定ユーザー/ユースケース
- 出張・経費精算のため領収書をデジタル化してテキスト化したい個人/社員
- 複数の領収書画像を順次OCRしてテキストをメモアプリ等へコピー/保存

## 5. 画面要件（MVP）
1. ヘッダ: タイトル、簡易説明、言語選択（日本語・English・한국어）
2. 入力領域: 
   - ドラッグ&ドロップ、またはファイル選択ボタン
   - 画像プレビュー（自動縮小適用）
3. 実行領域:
   - OpenAI API Key入力フィールド（password形式）
   - 「OCR開始」ボタン、進捗バー/ログ、キャンセルボタン
4. 出力領域:
   - 抽出テキスト（読み取り専用テキストエリア）
   - 「コピー」「.txtとして保存」
5. フッター: プライバシー・セキュリティに関する注意事項

## 6. 機能要件
- **F-01 画像入力**: PNG/JPEG（単一ファイル）。複数はMVPでは逐次処理。
- **F-02 プレビュー**: キャンバスへ描画し自動縮小処理を反映。
- **F-03 前処理**: 
  - 長辺上限ピクセルで縮小（2000px 固定）
  - EXIF回転情報の自動適用
- **F-04 言語選択**: 既定 `ja`（日本語）、`en`（英語）、`ko`（韓国語）対応。
- **F-05 API Key管理**: OpenAI API Keyの入力・検証・ローカル保持。
- **F-06 OCR実行**: OpenAI Vision API を用い、進捗を表示。キャンセル可能。
- **F-07 出力**: テキストエリア表示、クリップボードコピー、`.txt`ダウンロード。
- **F-08 エラー処理**: 画像未選択/API Key未入力/API エラー/ネットワークエラー時のガイダンス。

## 7. 非機能要件
- **N-01 性能**: 2000×2000px 程度の領収書で、OpenAI API応答時間含めて30秒以内目標。
- **N-02 可用性**: OpenAI API障害時のエラーハンドリング。CDN障害時の代替設定（将来課題）。
- **N-03 セキュリティ/プライバシー**: API KeyはHTTPS通信でのみ送信。ローカル保持のみ。
- **N-04 アクセシビリティ**: キーボード操作、適切なコントラスト、ARIA 属性。
- **N-05 レスポンシブ**: スマホ/タブレット/デスクトップで快適に利用可能。
- **N-06 国際化**: UIは日本語（既定）。OCRは `ja`/`en`/`ko` 対応と自動翻訳。

## 8. 依存関係（CDN）
- Tailwind CSS（CDN版）
- OpenAI API（外部Web API、API Key必須）

実装例:

```html
<!-- Tailwind CSS CDN（Play CDN・開発/小規模向け）-->
<script src="https://cdn.tailwindcss.com"></script>
<script>
  // 必要ならテーマ拡張
  tailwind.config = { theme: { extend: {} } };
</script>
```

基本API利用例（実装参考）:

```javascript
// OpenAI Vision API呼び出し例
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    }]
  })
});
```

## 9. データ取扱い
- 入力画像: ブラウザメモリ上で処理後、OpenAI APIへbase64エンコードで送信。
- API Key: ブラウザメモリ（入力フィールド）およびlocalStorage（任意）に保持。
- 出力テキスト: ブラウザ表示のみ。明示操作で`.txt`としてローカル保存可。
- **注意**: 画像はOpenAI APIのサーバーで一時的に処理される。プライバシーポリシーを確認のこと。

## 10. エラー/例外シナリオ
- 画像ファイル不正/破損 → ユーザーへの再選択促し
- API Key未入力/無効 → 入力・確認促し
- OpenAI API エラー（401, 429, 500等） → エラー内容表示・再試行案内
- ネットワーク接続エラー → 接続確認・再試行案内
- 認識精度低下 → 撮影条件ガイド（傾き/照度/ピント）

## 11. 受け入れ基準（抜粋）
- 画像（JPEG/PNG）を選択/ドラッグ&ドロップで取り込み、プレビュー表示できる。
- OpenAI API Keyを入力し、言語選択後にOCRを実行すると、進捗が表示され、完了後にテキストが表示される。
- 「コピー」クリックでクリップボードへ格納、「保存」で`.txt`がダウンロードされる。
- 破損画像/API Key未入力などのエラー時、ユーザーは原因と対処を理解できる。
- API KeyはHTTPS通信でのみ使用され、適切にローカル管理される。

## 12. テスト観点（概要）
- ブラウザ: Chrome/Edge/Firefox/Safari（Desktop/iOS）での基本動作
- 画像条件: 解像度（小/中/大）、縦横向き、暗所/傾き/影あり
- 言語: `ja`/`en`/`ko` それぞれでの認識・翻訳成功
- API: 有効/無効なAPI Key、各種OpenAI APIエラーレスポンス
- 回帰: 主要操作（取り込み→API Key入力→OCR→コピー/保存）

## 13. リスク/留意点
- OpenAI API の利用料金（ユーザー負担）・レート制限
- インターネット接続必須（オフライン利用不可）
- 画像データのOpenAIサーバー送信によるプライバシー懸念
- API Key漏洩リスク（ユーザー自身の管理責任）
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
- 外部APIは OpenAI Vision API のみ使用
- 画像処理は `canvas` を使用し、base64エンコード
- 変数/関数命名は可読性重視、早期リターン、例外の握り潰し禁止
- カスタムCSSは最小限（コンポーネント化が必要な場合のみ）
- API Key管理は`localStorage`を活用、セキュアな実装を心掛ける

## 17. 今後の拡張候補
- 単純な正規表現による構造化（合計金額/税込・税抜/日付/店舗名）
- 結果のCSV出力、複数画像の一括処理
- API Key暗号化保存機能
- PDF入力（pdf.js）とページ毎の画像化→OCR
- バッチ処理API対応（複数画像の一括OCR）

## 18. 参考
- OpenAI Vision API ドキュメント: [OpenAI Platform](https://platform.openai.com/docs/guides/vision)
- OpenAI API リファレンス: [API Reference](https://platform.openai.com/docs/api-reference/chat/create)
- VS Code Live Preview（ローカルサーバー・ライブ更新）: [Live Preview - VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server)
- VS Code Live Server（ローカルサーバー・ライブリロード）: [Live Server - VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)


