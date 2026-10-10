// Geliştirme: sunucuyu derleyip yalnızca senkron için başlatır (uygulama `npm run dev` ile).
// Varsayılanlar: PORT=8787, FAMILY_CODE=1234, DATA_DIR=server/.data
process.env.PORT ||= '8787'
process.env.FAMILY_CODE ||= '1234'
process.env.DATA_DIR ||= 'server/.data'
console.log(`Geliştirme aile kodu: ${process.env.FAMILY_CODE}`)
await import('../server-dist/index.cjs')
