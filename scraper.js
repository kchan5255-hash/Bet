const puppeteer = require('puppeteer')
const fs = require('fs')
const paths = require('./paths')

const DATE = '2026-05-13'
const VENUE = 'HV'
const RACE_NO = 1

async function scrapeRaceCard() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 }
  })

  const page = await browser.newPage()

  // 攔截 GraphQL POST 請求的 body 和 response
  const graphqlData = []

  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('graphql') || url.includes('/graph')) {
      const postData = req.postData()
      if (postData) {
        try {
          const body = JSON.parse(postData)
          // 只記錄包含賽馬相關 query 的請求
          const bodyStr = JSON.stringify(body)
          if (bodyStr.includes('race') || bodyStr.includes('Race') || bodyStr.includes('horse') || bodyStr.includes('Horse') || bodyStr.includes('runner') || bodyStr.includes('Runner')) {
            graphqlData.push({ type: 'request', url, query: body })
            console.log('[GraphQL 請求]', url)
            console.log('Query:', bodyStr.substring(0, 300))
          }
        } catch (_) {}
      }
    }
    req.continue()
  })

  page.on('response', async (res) => {
    const url = res.url()
    if (url.includes('graphql') || url.includes('/graph')) {
      try {
        const json = await res.json()
        const jsonStr = JSON.stringify(json)
        if (jsonStr.includes('race') || jsonStr.includes('Race') || jsonStr.includes('horse') || jsonStr.includes('Horse') || jsonStr.includes('runner') || jsonStr.includes('Runner')) {
          graphqlData.push({ type: 'response', url, data: json })
          console.log('[GraphQL 回應含賽馬數據]', url)
        }
      } catch (_) {}
    }
  })

  const targetUrl = `https://bet.hkjc.com/ch/racing/home/${DATE}/${VENUE}/${RACE_NO}`
  console.log('正在開啟:', targetUrl)
  await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 })

  // 額外等待 3 秒確保所有數據載入
  await new Promise(r => setTimeout(r, 3000))

  // 嘗試從 DOM 提取馬匹資料（多種選擇器）
  const raceData = await page.evaluate(() => {
    const result = { horses: [], rawHtml: '' }

    // 嘗試各種可能的選擇器
    const selectors = [
      '[class*="runner"]',
      '[class*="Runner"]',
      '[class*="horse"]',
      '[class*="Horse"]',
      '[class*="race-card"]',
      '[class*="RaceCard"]',
      'tbody tr',
      '.table-row',
    ]

    for (const sel of selectors) {
      const els = document.querySelectorAll(sel)
      if (els.length > 2) {
        els.forEach(el => {
          const text = el.innerText.trim()
          if (text.length > 10) {
            result.horses.push({ selector: sel, text })
          }
        })
        if (result.horses.length > 0) break
      }
    }

    // 如果找不到，截取主要內容區域的 HTML
    const main = document.querySelector('main, #main, .main-content, [class*="content"]')
    if (main) {
      result.rawHtml = main.innerHTML.substring(0, 3000)
    }

    return result
  })

  // 截圖
  await page.screenshot({ path: 'race-card.png', fullPage: false })
  console.log('\n截圖已儲存至 race-card.png')

  // 輸出結果
  console.log('\n===== GraphQL 賽馬數據 =====')
  if (graphqlData.length > 0) {
    graphqlData.forEach((item, i) => {
      console.log(`\n[${i + 1}] ${item.type.toUpperCase()} - ${item.url}`)
      if (item.type === 'request') {
        console.log('Query:', JSON.stringify(item.query).substring(0, 500))
      } else {
        console.log('Data:', JSON.stringify(item.data).substring(0, 1000))
      }
    })
    const graphqlOut = paths.miscPath('graphql-race-data.json');
    fs.writeFileSync(graphqlOut, JSON.stringify(graphqlData, null, 2))
    console.log('\n完整數據已儲存至 ' + graphqlOut)
  } else {
    console.log('未找到 GraphQL 賽馬數據')
  }

  console.log('\n===== DOM 馬匹資料 =====')
  if (raceData.horses.length > 0) {
    raceData.horses.slice(0, 20).forEach((h, i) => {
      console.log(`[${i + 1}] ${h.text.substring(0, 200)}`)
    })
  } else {
    console.log('未從 DOM 找到馬匹資料')
    if (raceData.rawHtml) {
      console.log('頁面 HTML 預覽:', raceData.rawHtml.substring(0, 500))
    }
  }

  await browser.close()
}

scrapeRaceCard().catch(console.error)
