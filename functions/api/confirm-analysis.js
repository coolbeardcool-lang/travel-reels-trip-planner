// 先直接測試查詢 Cities 表
fetch('/api/confirm-analysis', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    url: 'https://www.instagram.com/reel/test456/',
    analysis: {
      contentKind: 'spot',
      sourcePlatform: 'Instagram',
      citySlug: 'busan',
      summary: '測試釜山',
      confidence: 0.8,
      items: []
    }
  })
}).then(async r => {
  const text = await r.text();
  console.log('status:', r.status);
  console.log('body:', text);
})
